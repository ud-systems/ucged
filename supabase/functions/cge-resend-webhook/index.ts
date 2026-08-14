import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Resend webhook receiver for campaign delivery/bounce/complaint.
 * Configure RESEND_WEBHOOK_SECRET optionally; if unset, accepts POSTs (lock down via gateway later).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = (Deno.env.get("RESEND_WEBHOOK_SECRET") || "").trim();
    if (secret) {
      const provided = (req.headers.get("x-resend-signature") || req.headers.get("svix-signature") || "").trim();
      // Lightweight check: allow custom shared secret header when Svix not wired
      const alt = (req.headers.get("x-cge-webhook-secret") || "").trim();
      if (alt !== secret && !provided) {
        return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const event = await req.json();
    const type = String(event?.type || event?.event || "unknown");
    const data = event?.data || event;
    const resendId = data?.email_id || data?.id || null;
    const email = (data?.to?.[0] || data?.email || "").toLowerCase();

    let recipientId: string | null = null;
    let campaignId: string | null = null;

    if (resendId) {
      const { data: rec } = await supabase
        .from("cge_campaign_recipients")
        .select("id, campaign_id, email, customer_id")
        .eq("resend_id", resendId)
        .maybeSingle();
      if (rec) {
        recipientId = rec.id;
        campaignId = rec.campaign_id;
      }
    }

    await supabase.from("cge_campaign_events").insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      resend_id: resendId,
      event_type: type,
      payload: event,
    });

    const lower = type.toLowerCase();
    if (recipientId) {
      if (lower.includes("delivered")) {
        await supabase.from("cge_campaign_recipients").update({ status: "delivered" }).eq("id", recipientId);
      } else if (lower.includes("bounce") || lower.includes("failed")) {
        await supabase.from("cge_campaign_recipients").update({ status: "bounced" }).eq("id", recipientId);
        if (email) {
          await supabase.from("cge_email_suppressions").upsert(
            { email, reason: "hard_bounce", source: "resend_webhook" },
            { onConflict: "email" },
          );
        }
      } else if (lower.includes("complained") || lower.includes("complaint")) {
        await supabase.from("cge_campaign_recipients").update({ status: "complained" }).eq("id", recipientId);
        if (email) {
          await supabase.from("cge_email_suppressions").upsert(
            { email, reason: "complaint", source: "resend_webhook" },
            { onConflict: "email" },
          );
        }
      }
    } else if (email && (lower.includes("bounce") || lower.includes("complaint"))) {
      await supabase.from("cge_email_suppressions").upsert(
        {
          email,
          reason: lower.includes("complaint") ? "complaint" : "hard_bounce",
          source: "resend_webhook",
        },
        { onConflict: "email" },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
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
