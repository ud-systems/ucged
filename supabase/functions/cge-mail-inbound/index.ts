import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Resend Inbound webhook → attach reply to cge_email_threads via cge+{threadId}@inbound.domain
 * Also matches by customer From email when plus-tag missing.
 */
function extractThreadId(addresses: string[]): string | null {
  for (const addr of addresses) {
    const m = String(addr || "").match(/cge\+([0-9a-f-]{36})@/i);
    if (m) return m[1];
  }
  return null;
}

function asAddressList(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object" && "email" in x) return String((x as { email: string }).email);
      return String(x);
    });
  }
  if (typeof v === "string") return [v];
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "cge_mail_inbound_secret")
      .maybeSingle();
    const secret = (secretRow?.value || Deno.env.get("CGE_MAIL_INBOUND_SECRET") || "").trim();
    if (secret) {
      const provided = (req.headers.get("x-cge-webhook-secret") || "").trim();
      if (provided !== secret) {
        return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = await req.json();
    const data = event?.data || event;
    const toList = [
      ...asAddressList(data?.to),
      ...asAddressList(data?.envelope?.to),
      ...asAddressList(event?.to),
    ];
    const fromList = asAddressList(data?.from).concat(asAddressList(event?.from));
    const fromEmail = (fromList[0] || data?.from || "").toString().toLowerCase().replace(/^.*<([^>]+)>.*$/, "$1").trim();
    const subject = String(data?.subject || event?.subject || "(no subject)");
    const bodyText = String(data?.text || data?.body_text || event?.text || "");
    const bodyHtml = String(data?.html || data?.body_html || event?.html || "");
    const messageId = String(data?.message_id || data?.headers?.["message-id"] || "") || null;
    const inReplyTo = String(data?.in_reply_to || data?.headers?.["in-reply-to"] || "") || null;
    const resendId = data?.email_id || data?.id || null;

    let threadId = extractThreadId(toList);

    // Fallback: match by In-Reply-To / customer email
    if (!threadId && inReplyTo) {
      const { data: prev } = await supabase
        .from("cge_email_messages")
        .select("thread_id")
        .eq("message_id_header", inReplyTo)
        .maybeSingle();
      if (prev?.thread_id) threadId = prev.thread_id;
    }

    let customerId: string | null = null;
    if (threadId) {
      const { data: thread } = await supabase
        .from("cge_email_threads")
        .select("id, customer_id")
        .eq("id", threadId)
        .maybeSingle();
      if (thread) {
        customerId = thread.customer_id;
      } else {
        threadId = null;
      }
    }

    if (!customerId && fromEmail) {
      const { data: cust } = await supabase
        .from("shopify_customers")
        .select("id")
        .ilike("email", fromEmail)
        .limit(1)
        .maybeSingle();
      if (cust) {
        customerId = cust.id;
        if (!threadId) {
          const { data: openThread } = await supabase
            .from("cge_email_threads")
            .select("id")
            .eq("customer_id", customerId)
            .eq("status", "open")
            .order("last_message_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (openThread) {
            threadId = openThread.id;
          } else {
            const { data: created } = await supabase
              .from("cge_email_threads")
              .insert({
                customer_id: customerId,
                subject,
                status: "open",
                last_message_at: new Date().toISOString(),
                unread_inbound: true,
              })
              .select("id")
              .single();
            threadId = created?.id ?? null;
          }
        }
      }
    }

    if (!threadId || !customerId) {
      return new Response(JSON.stringify({ ok: false, error: "Could not match thread/customer", fromEmail, toList }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe by resend_id or message_id
    if (resendId) {
      const { data: existing } = await supabase
        .from("cge_email_messages")
        .select("id")
        .eq("resend_id", String(resendId))
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase.from("cge_email_messages").insert({
      thread_id: threadId,
      customer_id: customerId,
      direction: "inbound",
      from_email: fromEmail || "unknown",
      to_email: toList[0] || "",
      subject,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      resend_id: resendId ? String(resendId) : null,
      message_id_header: messageId,
      in_reply_to: inReplyTo,
      created_by: null,
    });

    await supabase
      .from("cge_email_threads")
      .update({
        last_message_at: new Date().toISOString(),
        unread_inbound: true,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    return new Response(JSON.stringify({ ok: true, thread_id: threadId, customer_id: customerId }), {
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
