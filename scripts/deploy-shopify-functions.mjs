/**
 * Deploy DataPulseFlow Shopify edge functions to the CGE Supabase project.
 * Usage: set SUPABASE_PROJECT_REF then `npm run deploy:functions:shopify`
 */
import { spawnSync } from "node:child_process";

const ref = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_PROJECT_REF;
if (!ref || ref.includes("YOUR_")) {
  console.error("Set SUPABASE_PROJECT_REF to your CGE Supabase project ref.");
  process.exit(1);
}

const names = ["shopify-test", "shopify-sync", "shopify-webhook"];
for (const name of names) {
  console.log(`Deploying ${name}…`);
  const r = spawnSync(
    "npx",
    ["supabase", "functions", "deploy", name, "--project-ref", ref, "--no-verify-jwt"],
    { stdio: "inherit", shell: true },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log("Shopify functions deployed for CGE project", ref);
