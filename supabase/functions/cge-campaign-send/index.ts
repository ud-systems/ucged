import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAnyRole } from "../_shared/require-admin.ts";

type Recipient = {
  id: string;
  campaign_id: string;
  customer_id: string;
  email: string;
  idempotency_key: string;
};

function render(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = (Deno.env.get("CGE_CRON_SECRET") || "").trim();
    const provided = (req.headers.get("x-cge-cron-secret") || "").trim();
    const isCron = Boolean(cronSecret && provided && provided === cronSecret);

    if (!isCron) {
      const denied = await requireAnyRole(req, corsHeaders, ["admin", "supervisor", "salesperson"]);
      if (denied) return denied;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const campaignId = (payload as { campaign_id?: string }).campaign_id;
    const batchSize = Math.min(Number((payload as { batch_size?: number }).batch_size) || 50, 100);

    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Due scheduled campaigns + optional explicit campaign
    let campaignQuery = supabase
      .from("cge_campaigns")
      .select("id, name, status, template_id, subject_override, from_email, scheduled_at")
      .in("status", ["scheduled", "sending"]);

    if (campaignId) {
      campaignQuery = supabase
        .from("cge_campaigns")
        .select("id, name, status, template_id, subject_override, from_email, scheduled_at")
        .eq("id", campaignId)
        .in("status", ["draft", "scheduled", "sending", "paused"]);
    } else {
      campaignQuery = campaignQuery.or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`);
    }

    const { data: campaigns, error: campErr } = await campaignQuery.limit(5);
    if (campErr) throw campErr;
    if (!campaigns?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No campaigns to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["resend_from_email", "brand_logo_url"]);
    const settingsMap = Object.fromEntries(
      (settingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value || ""]),
    );
    const defaultFrom = (settingsMap.resend_from_email || Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
    const logoUrl = (settingsMap.brand_logo_url || Deno.env.get("BRAND_LOGO_URL") || "").trim();

    const summary: Record<string, unknown>[] = [];

    for (const campaign of campaigns) {
      if (campaign.status === "draft" && !campaignId) continue;

      await supabase
        .from("cge_campaigns")
        .update({ status: "sending", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", campaign.id);

      // Ensure recipients exist
      const { count: existing } = await supabase
        .from("cge_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      if ((existing ?? 0) === 0) {
        // expand via service role bypass — call SQL with elevated client
        await supabase.rpc("expand_cge_campaign_audience", { _campaign_id: campaign.id }).catch(() => null);
        // Fallback expand if RPC requires auth.uid(): do inline for service
        // Service role may still hit has_role(auth.uid()) null — expand manually below if needed
      }

      let { data: recipients } = await supabase
        .from("cge_campaign_recipients")
        .select("id, campaign_id, customer_id, email, idempotency_key")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .limit(batchSize);

      if (!recipients?.length) {
        // Manual audience expand for service/cron
        const { data: campFull } = await supabase.from("cge_campaigns").select("audience").eq("id", campaign.id).maybeSingle();
        const audience = (campFull?.audience || {}) as {
          preset?: string;
          segment?: string;
          quiet_days?: number;
          customer_ids?: string[];
        };
        const preset = audience.preset || "manual";
        let custQuery = supabase
          .from("shopify_customers")
          .select("id, email, name, total_orders, rfm_recency_days, email_unsubscribed")
          .not("email", "is", null)
          .eq("email_unsubscribed", false)
          .limit(5000);

        if (preset === "never_purchased") custQuery = custQuery.eq("total_orders", 0);
        if (preset === "quiet_days") custQuery = custQuery.gte("rfm_recency_days", audience.quiet_days || 90);
        if (preset === "manual" && audience.customer_ids?.length) {
          custQuery = custQuery.in("id", audience.customer_ids);
        }

        const { data: customers } = await custQuery;
        let list = customers || [];
        if (preset === "queue_segment") {
          const { data: tasks } = await supabase
            .from("cge_followup_tasks")
            .select("customer_id")
            .in("status", ["open", "in_progress", "snoozed"])
            .eq("segment", audience.segment || "vip_inactive");
          const set = new Set((tasks || []).map((t) => t.customer_id));
          list = list.filter((c) => set.has(c.id));
        }

        const { data: suppressions } = await supabase.from("cge_email_suppressions").select("email");
        const blocked = new Set((suppressions || []).map((s) => s.email.toLowerCase()));

        const rows = list
          .filter((c) => c.email && !blocked.has(c.email.toLowerCase()))
          .map((c) => ({
            campaign_id: campaign.id,
            customer_id: c.id,
            email: c.email!.trim().toLowerCase(),
            status: "pending",
            idempotency_key: `campaign/${campaign.id}/${c.id}`,
          }));

        if (rows.length) {
          await supabase.from("cge_campaign_recipients").upsert(rows, { onConflict: "campaign_id,customer_id" });
        }

        const again = await supabase
          .from("cge_campaign_recipients")
          .select("id, campaign_id, customer_id, email, idempotency_key")
          .eq("campaign_id", campaign.id)
          .eq("status", "pending")
          .limit(batchSize);
        recipients = again.data;
      }

      if (!campaign.template_id) {
        await supabase
          .from("cge_campaigns")
          .update({ status: "failed", error_message: "No template", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);
        summary.push({ campaign_id: campaign.id, error: "No template" });
        continue;
      }

      const { data: template } = await supabase
        .from("cge_email_templates")
        .select("*")
        .eq("id", campaign.template_id)
        .maybeSingle();

      if (!template) {
        await supabase
          .from("cge_campaigns")
          .update({ status: "failed", error_message: "Template missing", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);
        summary.push({ campaign_id: campaign.id, error: "Template missing" });
        continue;
      }

      const fromEmail = (campaign.from_email || defaultFrom || "").trim();
      if (!fromEmail) {
        await supabase
          .from("cge_campaigns")
          .update({ status: "failed", error_message: "from_email missing", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);
        summary.push({ campaign_id: campaign.id, error: "from_email missing" });
        continue;
      }

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const r of (recipients || []) as Recipient[]) {
        const { data: cust } = await supabase
          .from("shopify_customers")
          .select("name, email, sp_assigned, email_unsubscribed, rfm_recency_days, total_orders")
          .eq("id", r.customer_id)
          .maybeSingle();

        if (!cust?.email || cust.email_unsubscribed) {
          await supabase
            .from("cge_campaign_recipients")
            .update({ status: "skipped", error_message: "Unsubscribed or no email" })
            .eq("id", r.id);
          skipped++;
          continue;
        }

        const { data: lastOrder } = await supabase
          .from("shopify_orders")
          .select("order_number, shopify_created_at")
          .eq("customer_id", r.customer_id)
          .order("shopify_created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const vars: Record<string, string> = {
          name: cust.name || "there",
          salesperson: cust.sp_assigned || "your account manager",
          last_order: lastOrder?.order_number || "your last order",
          email: cust.email,
          logo_url: logoUrl,
        };

        const subject = render(campaign.subject_override || template.subject, vars);
        const html = render(template.html_body, vars);
        const text = render(template.text_body || "", vars);

        await supabase.from("cge_campaign_recipients").update({ status: "queued" }).eq("id", r.id);

        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": r.idempotency_key,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [r.email],
            subject,
            html,
            text: text || undefined,
            tags: [
              { name: "campaign_id", value: campaign.id },
              { name: "recipient_id", value: r.id },
            ],
          }),
        });

        const sendJson = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) {
          failed++;
          await supabase
            .from("cge_campaign_recipients")
            .update({
              status: "failed",
              error_message: JSON.stringify(sendJson).slice(0, 500),
            })
            .eq("id", r.id);
          continue;
        }

        sent++;
        await supabase
          .from("cge_campaign_recipients")
          .update({
            status: "sent",
            resend_id: sendJson.id || null,
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", r.id);
      }

      const { count: pendingLeft } = await supabase
        .from("cge_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "pending");

      const done = (pendingLeft ?? 0) === 0;
      await supabase
        .from("cge_campaigns")
        .update({
          status: done ? "done" : "sending",
          completed_at: done ? new Date().toISOString() : null,
          stats: {
            sent,
            failed,
            skipped,
            batch_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      summary.push({ campaign_id: campaign.id, sent, failed, skipped, done });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
