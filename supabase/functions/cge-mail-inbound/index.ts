import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Resend Inbound webhook (email.received) → cge_email_threads.
 * Webhook payload is metadata only; body/headers come from Receiving API.
 * Match via Reply-To plus-address cge+{threadId}@inbound.domain
 * or fallback by customer From / In-Reply-To.
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

function bareEmail(raw: unknown): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/^.*<([^>]+)>.*$/, "$1")
    .trim();
}

type ReceivedEmail = {
  id?: string;
  to?: unknown;
  from?: unknown;
  subject?: string;
  html?: string | null;
  text?: string | null;
  message_id?: string | null;
  received_for?: unknown;
  headers?: Record<string, string> | null;
};

async function fetchReceivedEmail(emailId: string, resendKey: string): Promise<ReceivedEmail | null> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!res.ok) {
    console.error("Resend receiving fetch failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  return (await res.json()) as ReceivedEmail;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional custom header auth (not sent by Resend by default).
    // Prefer leaving cge_mail_inbound_secret empty for Resend webhooks.
    const { data: secretRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "cge_mail_inbound_secret")
      .maybeSingle();
    const secret = (secretRow?.value || Deno.env.get("CGE_MAIL_INBOUND_SECRET") || "").trim();
    const provided = (req.headers.get("x-cge-webhook-secret") || "").trim();
    if (secret && provided && provided !== secret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // If a secret is configured but Resend didn't send the header, allow through
    // (Resend uses Svix signing; custom headers aren't available on their webhooks).

    const event = await req.json();
    const data = event?.data || event;
    const emailId = String(data?.email_id || data?.id || "").trim();

    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
    let received: ReceivedEmail | null = null;
    if (emailId && resendKey) {
      received = await fetchReceivedEmail(emailId, resendKey);
    }

    const toList = [
      ...asAddressList(data?.to),
      ...asAddressList(data?.received_for),
      ...asAddressList(data?.envelope?.to),
      ...asAddressList(event?.to),
      ...asAddressList(received?.to),
      ...asAddressList(received?.received_for),
    ];

    const fromList = asAddressList(data?.from)
      .concat(asAddressList(event?.from))
      .concat(asAddressList(received?.from));
    const fromEmail = bareEmail(fromList[0] || data?.from || received?.from);

    const subject = String(data?.subject || received?.subject || event?.subject || "(no subject)");
    const bodyText = String(received?.text || data?.text || data?.body_text || event?.text || "");
    const bodyHtml = String(received?.html || data?.html || data?.body_html || event?.html || "");
    const headers = received?.headers || data?.headers || {};
    const messageId =
      String(received?.message_id || data?.message_id || headers["message-id"] || headers["Message-ID"] || "") ||
      null;
    const inReplyTo =
      String(headers["in-reply-to"] || headers["In-Reply-To"] || data?.in_reply_to || "") || null;
    const resendId = emailId || null;

    let threadId = extractThreadId(toList);

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
      console.warn("inbound unmatched", { fromEmail, toList, emailId, subject });
      return new Response(JSON.stringify({ ok: false, error: "Could not match thread/customer", fromEmail, toList }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      to_email: bareEmail(toList[0]) || "",
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
    console.error("cge-mail-inbound error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
