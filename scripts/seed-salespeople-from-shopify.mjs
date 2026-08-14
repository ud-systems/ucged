/**
 * Create salesperson Auth users + user_roles from distinct Shopify
 * sp_assigned / referred_by labels, then backfill assignments.
 *
 * Usage (from cge-webapp/, with .env loaded):
 *   node scripts/seed-salespeople-from-shopify.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  try {
    const text = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}
loadEnv();

const url = process.env.CGE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.CGE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need CGE_SUPABASE_URL and CGE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

function slugEmail(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  return `sp.${slug || "user"}@cge.local`;
}

async function listAllCustomers() {
  const labels = new Map();
  let from = 0;
  const page = 1000;
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/shopify_customers?select=sp_assigned,referred_by&limit=${page}&offset=${from}`,
      { headers },
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    for (const r of rows) {
      for (const f of [r.sp_assigned, r.referred_by]) {
        if (!f || !String(f).trim()) continue;
        const t = String(f).trim();
        if (t.toLowerCase() === "unassigned") continue;
        labels.set(t, (labels.get(t) || 0) + 1);
      }
    }
    if (rows.length < page) break;
    from += page;
  }
  return [...labels.entries()].sort((a, b) => b[1] - a[1]);
}

async function existingSalespeople() {
  const res = await fetch(
    `${url}/rest/v1/user_roles?role=eq.salesperson&select=user_id,salesperson_name`,
    { headers },
  );
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  const byNorm = new Map();
  for (const r of rows) {
    const n = String(r.salesperson_name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (n) byNorm.set(n, r);
  }
  return byNorm;
}

async function createSalesperson(name) {
  const email = slugEmail(name);
  const password = `CgeSp!${Math.random().toString(36).slice(2, 10)}A1`;
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    if (/already|exists/i.test(text)) {
      console.log("skip exists", name, email);
      return null;
    }
    throw new Error(`create ${name}: ${text}`);
  }
  const user = await createRes.json();
  const roleRes = await fetch(`${url}/rest/v1/user_roles`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: user.id,
      role: "salesperson",
      salesperson_name: name,
    }),
  });
  if (!roleRes.ok) throw new Error(`role ${name}: ${await roleRes.text()}`);
  console.log("created", name, email);
  return user.id;
}

const labels = await listAllCustomers();
console.log("Distinct ownership labels:", labels.length);
const existing = await existingSalespeople();
let created = 0;
for (const [name] of labels) {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!norm || existing.has(norm)) {
    console.log("have", name);
    continue;
  }
  await createSalesperson(name);
  created++;
}

const backfill = await fetch(`${url}/rest/v1/rpc/backfill_salesperson_assignments_cgeapp`, {
  method: "POST",
  headers,
  body: "{}",
});
if (!backfill.ok) {
  console.error("backfill failed (push migration first):", await backfill.text());
} else {
  console.log("backfill rows (sp_assigned inserts):", await backfill.text());
}
console.log("Done. Created", created, "salesperson users.");
