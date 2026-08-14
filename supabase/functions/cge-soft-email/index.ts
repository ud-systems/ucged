import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cge-cron-secret",
};

type Candidate = {
  customer_id: string;
  email: string;
  name: string;
  day_offset: number;
  segment: string;
  template_key: string;
  idempotency_key: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = (Deno.env.get("CGE_CRON_SECRET") || "").trim();
    const provided = (req.headers.get("x-cge-cron-secret") || "").trim();
    const authHeader = req.headers.get("Authorization") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const isCron = cronSecret && provided && provided === cronSecret;
    if (!isCron) {
      // Allow admin JWT invoke for manual runs
      const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await anon.auth.getUser();
      if (!userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
      const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin or cron secret required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["resend_from_email", "brand_logo_url"]);
    const settingsMap = Object.fromEntries((settingsRows || []).map((r: { key: string; value: string }) => [r.key, r.value || ""]));
    const fromEmail = (settingsMap.resend_from_email || Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
    if (!fromEmail) {
      return new Response(JSON.stringify({ error: "resend_from_email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const logoUrl = (settingsMap.brand_logo_url || Deno.env.get("BRAND_LOGO_URL") || "").trim();

    const { data: candidates, error: candErr } = await supabase.rpc("enqueue_soft_prevention_emails_cgeapp");
    if (candErr) throw candErr;

    const list = (candidates || []) as Candidate[];
    const { data: templates } = await supabase
      .from("cge_email_templates")
      .select("*")
      .eq("active", true)
      .eq("template_kind", "soft");
    const templateMap = new Map((templates || []).map((t: { template_key: string; subject: string; html_body: string; text_body: string | null }) => [t.template_key, t]));

    const results: { idempotency_key: string; ok: boolean; error?: string; resend_id?: string }[] = [];

    for (const c of list) {
      const tmpl = templateMap.get(c.template_key);
      if (!tmpl) {
        await supabase.from("cge_email_sends").upsert({
          customer_id: c.customer_id,
          template_key: c.template_key,
          day_offset: c.day_offset,
          segment: c.segment,
          idempotency_key: c.idempotency_key,
          status: "skipped",
          error_message: "Template missing",
        }, { onConflict: "idempotency_key" });
        results.push({ idempotency_key: c.idempotency_key, ok: false, error: "Template missing" });
        continue;
      }

      const merge = (s: string) =>
        s
          .replaceAll("{{name}}", c.name || "there")
          .replaceAll("{{logo_url}}", logoUrl)
          .replaceAll("{{email}}", c.email || "")
          .replaceAll("{{salesperson}}", "your account manager")
          .replaceAll("{{last_order}}", "your last order");
      const html = merge(tmpl.html_body);
      const text = merge(tmpl.text_body || "");
      const subject = merge(tmpl.subject);

      await supabase.from("cge_email_sends").upsert({
        customer_id: c.customer_id,
        template_key: c.template_key,
        day_offset: c.day_offset,
        segment: c.segment,
        idempotency_key: c.idempotency_key,
        status: "queued",
      }, { onConflict: "idempotency_key" });

      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": c.idempotency_key,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [c.email],
          subject,
          html,
          text: text || undefined,
        }),
      });

      const payload = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        const msg = payload?.message || `Resend HTTP ${sendRes.status}`;
        await supabase.from("cge_email_sends").update({
          status: "failed",
          error_message: msg,
        }).eq("idempotency_key", c.idempotency_key);
        results.push({ idempotency_key: c.idempotency_key, ok: false, error: msg });
        continue;
      }

      await supabase.from("cge_email_sends").update({
        status: "sent",
        resend_id: payload?.id || null,
        sent_at: new Date().toISOString(),
        error_message: null,
      }).eq("idempotency_key", c.idempotency_key);

      results.push({ idempotency_key: c.idempotency_key, ok: true, resend_id: payload?.id });
    }

    // Also refresh human queues so day-90 customers open for CGEs
    await supabase.rpc("refresh_cge_followup_tasks_cgeapp");

    return new Response(JSON.stringify({
      success: true,
      attempted: list.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
