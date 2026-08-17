import { corsHeaders } from "../_shared/cors.ts";
import { requireCgeOrAdmin } from "../_shared/require-cge-or-admin.ts";

type DraftRequest = {
  customer_id?: string;
  channel: "call" | "whatsapp" | "sms" | "email";
  intent?: string;
  tone?: string;
  mode?: "customer" | "template";
  subject?: string;
  html_body?: string;
};

function fingerprint(parts: unknown): string {
  const raw = JSON.stringify(parts);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `fp_${Math.abs(h).toString(16)}`;
}

function friendlyXaiError(status: number, errText: string): string {
  let parsed: { error?: string; code?: string } = {};
  try {
    parsed = JSON.parse(errText) as { error?: string; code?: string };
  } catch {
    /* raw text */
  }
  const combined = `${parsed.code || ""} ${parsed.error || errText}`.toLowerCase();
  if (status === 403 || /credits or licenses|doesn't have any credits|prepaid/.test(combined)) {
    return "Grok has no API credits yet. Add prepaid credits at console.x.ai, then try again.";
  }
  if (status === 401 || /invalid api key|incorrect api key|unauthorized/.test(combined)) {
    return "The Grok API key is invalid. Ask an admin to update it.";
  }
  if (/model not found/.test(combined)) {
    return "The Grok model is unavailable. Ask an admin to update the AI model.";
  }
  if (status === 429 || /rate limit/.test(combined)) {
    return "Too many AI requests right now. Wait a few minutes and try again.";
  }
  if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
  return "Couldn't generate an AI draft. Try again in a moment.";
}

function xaiFailureResponse(status: number, errText: string) {
  return new Response(JSON.stringify({ error: friendlyXaiError(status, errText) }), {
    status: 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireCgeOrAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as DraftRequest;
    if (!body.channel) {
      return new Response(JSON.stringify({ error: "channel required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channel = body.channel;
    if (!["call", "whatsapp", "sms", "email"].includes(channel)) {
      return new Response(JSON.stringify({ error: "Invalid channel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isTemplateMode = body.mode === "template";
    if (!isTemplateMode && !body.customer_id) {
      return new Response(JSON.stringify({ error: "customer_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isTemplateMode && !auth.isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only for template rewrite" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple per-user rate limit: 20 drafts / 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await auth.adminClient
      .from("cge_ai_drafts")
      .select("id", { count: "exact", head: true })
      .eq("created_by", auth.user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Rate limit: try again in a few minutes" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isTemplateMode) {
      const xaiKey = (Deno.env.get("XAI_API_KEY") || "").trim();
      const model = (Deno.env.get("XAI_MODEL") || "grok-4.6").trim();
      const subjectIn = body.subject || "";
      const htmlIn = body.html_body || "";
      if (!xaiKey) {
        return new Response(
          JSON.stringify({
            subject: subjectIn,
            body: htmlIn.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
            bullets: [],
            warnings: ["XAI_API_KEY not configured — returned original content."],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${xaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                'Rewrite marketing email copy. Keep {{name}}, {{salesperson}}, {{last_order}}, {{email}} placeholders. Return ONLY JSON: {"subject":string,"body":string,"bullets":string[],"warnings":string[]}. body may be plain text or simple HTML paragraphs.',
            },
            {
              role: "user",
              content: `Subject:\n${subjectIn}\n\nHTML:\n${htmlIn.slice(0, 8000)}\nTone: ${body.tone || "warm professional"}`,
            },
          ],
        }),
      });
      if (!aiRes.ok) {
        return xaiFailureResponse(aiRes.status, await aiRes.text());
      }
      const aiJson = await aiRes.json();
      const content = aiJson?.choices?.[0]?.message?.content || "";
      let parsed: { subject?: string; body?: string; bullets?: string[]; warnings?: string[] };
      try {
        parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      } catch {
        parsed = { subject: subjectIn, body: content, bullets: [], warnings: ["Non-JSON model output"] };
      }
      return new Response(
        JSON.stringify({
          subject: parsed.subject ?? subjectIn,
          body: parsed.body || "",
          bullets: parsed.bullets || [],
          warnings: parsed.warnings || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!auth.isTeamViewer) {
      const { data: visible } = await auth.adminClient.rpc("cge_visible_customer_ids", {
        _cge_user_id: auth.user.id,
      });
      const ids = new Set((visible || []).map((r: { customer_id: string }) => r.customer_id));
      if (!ids.has(body.customer_id!)) {
        return new Response(JSON.stringify({ error: "Customer not in your scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: customer, error: custErr } = await auth.adminClient
      .from("shopify_customers")
      .select(
        "id, name, email, phone, sp_assigned, referred_by, total_orders, total_revenue, rfm_group, rfm_recency_days, email_unsubscribed, tags",
      )
      .eq("id", body.customer_id!)
      .maybeSingle();
    if (custErr) throw custErr;
    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const warnings: string[] = [];
    if (customer.email_unsubscribed) {
      warnings.push("Customer is email_unsubscribed — do not send marketing email.");
    }

    const { data: orders } = await auth.adminClient
      .from("shopify_orders")
      .select("order_number, current_total, total, financial_status, shopify_created_at")
      .eq("customer_id", body.customer_id!)
      .order("shopify_created_at", { ascending: false })
      .limit(5);

    const { data: outreach } = await auth.adminClient
      .from("cge_outreach_events")
      .select("channel, outcome, notes, created_at")
      .eq("customer_id", body.customer_id!)
      .order("created_at", { ascending: false })
      .limit(8);

    const { data: softSends } = await auth.adminClient
      .from("cge_email_sends")
      .select("template_key, day_offset, status, sent_at")
      .eq("customer_id", body.customer_id!)
      .order("created_at", { ascending: false })
      .limit(6);

    const { data: openTask } = await auth.adminClient
      .from("cge_followup_tasks")
      .select("segment, status, priority, recency_days")
      .eq("customer_id", body.customer_id!)
      .in("status", ["open", "in_progress", "snoozed"])
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    const contextPack = {
      identity: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        salesperson: customer.sp_assigned,
        referred_by: customer.referred_by,
      },
      lifecycle: {
        rfm_group: customer.rfm_group,
        recency_days: customer.rfm_recency_days,
        queue_segment: openTask?.segment ?? null,
        task_status: openTask?.status ?? null,
        priority: openTask?.priority ?? null,
      },
      commerce: {
        lifetime_orders: customer.total_orders,
        lifetime_revenue: customer.total_revenue,
        recent_orders: (orders || []).slice(0, 5),
      },
      history: {
        outreach: outreach || [],
        soft_emails: softSends || [],
      },
      constraints: {
        channel,
        tone: body.tone || "warm professional",
        intent: body.intent || "re-engage after quiet period",
        no_discount_unless_asked: true,
        stop_if_unsubscribed: true,
        email_unsubscribed: Boolean(customer.email_unsubscribed),
      },
    };

    const xaiKey = (Deno.env.get("XAI_API_KEY") || "").trim();
    const model = (Deno.env.get("XAI_MODEL") || "grok-4.6").trim();

    if (!xaiKey) {
      // Deterministic fallback draft so UI works before key is set
      const name = customer.name || "there";
      const days = customer.rfm_recency_days ?? "a while";
      const subject = channel === "email" ? `Checking in, ${name}` : undefined;
      const bodyText =
        channel === "call"
          ? `Hi ${name}, this is Unique Distribution. I noticed it's been about ${days} days since we last connected. Wanted to see if you need anything restocked or have questions on products.`
          : `Hi ${name} — hope you're well. It's been about ${days} days since your last order with us. Happy to help with restocks or recommendations if useful.`;
      warnings.push("XAI_API_KEY not configured — returned template draft.");
      const draft = { subject, body: bodyText, bullets: ["Check in", "Offer help", "No hard sell"], warnings };
      await auth.adminClient.from("cge_ai_drafts").insert({
        customer_id: body.customer_id!,
        channel,
        intent: body.intent || null,
        tone: body.tone || null,
        prompt_fingerprint: fingerprint(contextPack),
        subject: subject || null,
        body: bodyText,
        bullets: draft.bullets,
        warnings,
        model: "fallback",
        created_by: auth.user.id,
      });
      return new Response(JSON.stringify(draft), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You write short outreach drafts for a wholesale/distribution sales team (Unique Distribution).
Return ONLY valid JSON: {"subject": string|null, "body": string, "bullets": string[], "warnings": string[]}
Rules:
- Never invent discounts or promotions unless context says the customer asked.
- Respect email_unsubscribed: if true and channel is email, put a strong warning and keep body empty or a note not to send.
- Match channel length: call = talk track bullets + short opener; whatsapp/sms short; email subject + 2-4 short paragraphs.
- Ground copy in the context pack. Do not invent order numbers or products not listed.
- Human will send — you only draft.`;

    const userMsg = `Channel: ${channel}\nIntent: ${body.intent || "re-engage"}\nTone: ${body.tone || "warm professional"}\nContext:\n${JSON.stringify(contextPack).slice(0, 12000)}`;

    const aiRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiRes.ok) {
      return xaiFailureResponse(aiRes.status, await aiRes.text());
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "";
    let parsed: { subject?: string | null; body?: string; bullets?: string[]; warnings?: string[] };
    try {
      const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { subject: null, body: content, bullets: [], warnings: ["Model returned non-JSON; used raw text."] };
    }

    const outWarnings = [...warnings, ...(parsed.warnings || [])];
    const draft = {
      subject: parsed.subject ?? null,
      body: parsed.body || "",
      bullets: parsed.bullets || [],
      warnings: outWarnings,
    };

    await auth.adminClient.from("cge_ai_drafts").insert({
      customer_id: body.customer_id!,
      channel,
      intent: body.intent || null,
      tone: body.tone || null,
      prompt_fingerprint: fingerprint(contextPack),
      subject: draft.subject,
      body: draft.body,
      bullets: draft.bullets,
      warnings: outWarnings,
      model,
      created_by: auth.user.id,
    });

    return new Response(JSON.stringify(draft), {
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
