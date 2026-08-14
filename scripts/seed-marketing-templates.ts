/**
 * Seed Unique Distribution wholesale marketing templates into cge_email_templates.
 * Usage (from cge-webapp): npx tsx scripts/seed-marketing-templates.ts
 */
import { createClient } from "@supabase/supabase-js";
import { MARKETING_CAMPAIGN_TEMPLATES } from "../src/lib/marketing-campaign-templates";

const url = process.env.CGE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CGE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing CGE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let upserted = 0;
for (const t of MARKETING_CAMPAIGN_TEMPLATES) {
  const row = {
    template_key: t.template_key,
    name: t.name,
    template_kind: t.template_kind,
    segment: t.segment,
    day_offset: t.day_offset,
    subject: t.subject,
    html_body: t.html_body,
    text_body: t.text_body,
    active: t.active,
    variables: t.variables,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("cge_email_templates").upsert(row, { onConflict: "template_key" });
  if (error) {
    console.error(t.template_key, error.message);
    process.exit(1);
  }
  upserted++;
  process.stdout.write(`ok ${t.template_key}\n`);
}

console.log(`Upserted ${upserted} marketing/outreach templates`);
