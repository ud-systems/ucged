/**
 * Upsert Shopify + DataPulse credentials (from uddash) into the CGE Supabase app_settings.
 *
 * Usage:
 *   set CGE_SUPABASE_URL=https://YOUR_CGE_REF.supabase.co
 *   set CGE_SERVICE_ROLE_KEY=...
 *   node scripts/seed-app-settings-to-cge.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const creds = JSON.parse(readFileSync(resolve(root, ".credentials.local.json"), "utf8"));
const url = process.env.CGE_SUPABASE_URL;
const key = process.env.CGE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set CGE_SUPABASE_URL and CGE_SERVICE_ROLE_KEY");
  process.exit(1);
}

for (const [k, value] of Object.entries(creds)) {
  const res = await fetch(`${url}/rest/v1/app_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key: k, value: value ?? "" }),
  });
  if (!res.ok) {
    console.error("Failed", k, await res.text());
    process.exit(1);
  }
  console.log("OK", k);
}
console.log("Seeded", Object.keys(creds).length, "settings into CGE project");
