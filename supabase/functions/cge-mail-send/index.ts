import { corsHeaders } from "../_shared/cors.ts";
import { requireCgeOrAdmin } from "../_shared/require-cge-or-admin.ts";

type SendBody = {
  customer_id: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  thread_id?: string | null;
  task_id?: string | null;
};

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div>${escaped}</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireCgeOrAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as SendBody;
    if (!body.customer_id || !body.subject?.trim()) {
      return new Response(JSON.stringify({ error: "customer_id and subject required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const text = (body.body_text || "").trim();
    const html = (body.body_html || (text ? textToHtml(text) : "")).trim();
    if (!text && !html) {
      return new Response(JSON.stringify({ error: "body_text or body_html required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: identity } = await auth.adminClient
      .from("cge_mail_identities")
      .select("id, email, display_name, active")
      .eq("user_id", auth.user.id)
      .eq("active", true)
      .maybeSingle();

    if (!identity) {
      return new Response(
        JSON.stringify({ error: "No active send-as email. Ask an admin to assign your mail identity." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!auth.isTeamViewer) {
      const { data: visible } = await auth.adminClient.rpc("cge_visible_customer_ids", {
        _cge_user_id: auth.user.id,
      });
      const ids = new Set((visible || []).map((r: { customer_id: string }) => r.customer_id));
      if (!ids.has(body.customer_id)) {
        return new Response(JSON.stringify({ error: "Customer not in your scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: customer, error: custErr } = await auth.adminClient
      .from("shopify_customers")
      .select("id, name, email, email_unsubscribed")
      .eq("id", body.customer_id)
      .maybeSingle();
    if (custErr) throw custErr;
    if (!customer?.email) {
      return new Response(JSON.stringify({ error: "Customer has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (customer.email_unsubscribed) {
      return new Response(JSON.stringify({ error: "Customer is unsubscribed from email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: suppressed } = await auth.adminClient
      .from("cge_email_suppressions")
      .select("id")
      .eq("email", customer.email.trim().toLowerCase())
      .maybeSingle();
    if (suppressed) {
      return new Response(JSON.stringify({ error: "Recipient email is suppressed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inboundSetting } = await auth.adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "cge_mail_inbound_domain")
      .maybeSingle();
    const inboundDomain = (inboundSetting?.value || Deno.env.get("CGE_MAIL_INBOUND_DOMAIN") || "").trim();

    let threadId = body.thread_id || null;
    if (threadId) {
      const { data: existing } = await auth.adminClient
        .from("cge_email_threads")
        .select("id, customer_id")
        .eq("id", threadId)
        .maybeSingle();
      if (!existing || existing.customer_id !== body.customer_id) {
        return new Response(JSON.stringify({ error: "Invalid thread_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: created, error: tErr } = await auth.adminClient
        .from("cge_email_threads")
        .insert({
          customer_id: body.customer_id,
          subject: body.subject.trim(),
          assigned_user_id: auth.user.id,
          status: "open",
          last_message_at: new Date().toISOString(),
          unread_inbound: false,
        })
        .select("id")
        .single();
      if (tErr) throw tErr;
      threadId = created.id;
    }

    const replyTo = inboundDomain
      ? `cge+${threadId}@${inboundDomain.replace(/^@/, "")}`
      : undefined;

    const fromHeader = identity.display_name
      ? `${identity.display_name} <${identity.email}>`
      : identity.email;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cge-mail/${threadId}/${auth.user.id}/${Date.now()}`,
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [customer.email],
        subject: body.subject.trim(),
        html,
        text: text || undefined,
        reply_to: replyTo || undefined,
        tags: [
          { name: "thread_id", value: threadId! },
          { name: "customer_id", value: body.customer_id },
        ],
      }),
    });

    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      return new Response(JSON.stringify({ error: `Resend error: ${JSON.stringify(sendJson).slice(0, 400)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const taskId = body.task_id?.trim() || null;

    const { data: outreach, error: oErr } = await auth.adminClient
      .from("cge_outreach_events")
      .insert({
        task_id: taskId,
        customer_id: body.customer_id,
        cge_user_id: auth.user.id,
        channel: "email",
        outcome: "other",
        notes: `Sent: ${body.subject.trim()}`,
      })
      .select("id")
      .maybeSingle();
    if (oErr) throw oErr;

    const { data: message, error: mErr } = await auth.adminClient
      .from("cge_email_messages")
      .insert({
        thread_id: threadId,
        customer_id: body.customer_id,
        direction: "outbound",
        from_email: identity.email,
        to_email: customer.email.trim().toLowerCase(),
        subject: body.subject.trim(),
        body_text: text || null,
        body_html: html || null,
        resend_id: sendJson.id || null,
        created_by: auth.user.id,
        outreach_event_id: outreach?.id ?? null,
      })
      .select("*")
      .single();
    if (mErr) throw mErr;

    await auth.adminClient
      .from("cge_email_threads")
      .update({
        subject: body.subject.trim(),
        assigned_user_id: auth.user.id,
        last_message_at: new Date().toISOString(),
        unread_inbound: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    // Touch linked task, or any open task for this customer
    const taskTouch = {
      last_outreach_at: new Date().toISOString(),
      status: "in_progress",
      updated_at: new Date().toISOString(),
    };
    if (taskId) {
      await auth.adminClient.from("cge_followup_tasks").update(taskTouch).eq("id", taskId);
    } else {
      await auth.adminClient
        .from("cge_followup_tasks")
        .update(taskTouch)
        .eq("customer_id", body.customer_id)
        .in("status", ["open", "in_progress", "snoozed"]);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        thread_id: threadId,
        message,
        reply_to: replyTo || null,
        from: fromHeader,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
