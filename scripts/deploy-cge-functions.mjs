import { spawnSync } from "node:child_process";

const ref = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_PROJECT_REF;
if (!ref || ref.includes("YOUR_")) {
  console.error("Set SUPABASE_PROJECT_REF to your CGE Supabase project ref.");
  process.exit(1);
}

console.log("Deploying cge-soft-email…");
const r = spawnSync(
  "npx",
  ["supabase", "functions", "deploy", "cge-soft-email", "--project-ref", ref, "--no-verify-jwt"],
  { stdio: "inherit", shell: true },
);
if (r.status !== 0) process.exit(r.status ?? 1);
console.log("Set edge secrets: RESEND_API_KEY, RESEND_FROM_EMAIL (optional), CGE_CRON_SECRET");
