import fs from "fs";
import { MARKETING_CAMPAIGN_TEMPLATES } from "../src/lib/marketing-campaign-templates";

function esc(s: string) {
  return s.replace(/'/g, "''");
}

const parts = MARKETING_CAMPAIGN_TEMPLATES.map((t) => {
  const vars = JSON.stringify(t.variables).replace(/'/g, "''");
  return `INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  '${esc(t.template_key)}',
  '${esc(t.name)}',
  '${esc(t.template_kind)}',
  NULL,
  NULL,
  '${esc(t.subject)}',
  $html$${t.html_body}$html$,
  $text$${t.text_body}$text$,
  true,
  '${vars}'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();`;
});

const sql = `-- Unique Distribution wholesale marketing / outreach campaign templates
-- Source of truth: src/lib/marketing-campaign-templates.ts
-- Re-seed anytime: npx tsx scripts/seed-marketing-templates.ts

${parts.join("\n\n")}
`;

const out = "supabase/migrations/20260810150000_marketing_campaign_templates_cgeapp.sql";
fs.writeFileSync(out, sql);
console.log("wrote", parts.length, "templates to", out, `(${sql.length} chars)`);
