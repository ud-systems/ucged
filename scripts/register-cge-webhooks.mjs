/**
 * Register ADDITIONAL Shopify webhooks for the CGE Supabase project.
 * Does not delete existing uddash webhooks.
 *
 * Requires env:
 *   SUPABASE_PROJECT_REF
 *   SHOPIFY_STORE_DOMAIN
 *   SHOPIFY_ACCESS_TOKEN
 */
import { spawnSync } from "node:child_process";

const ref = process.env.SUPABASE_PROJECT_REF;
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-01";

if (!ref || !domain || !token) {
  console.error("Set SUPABASE_PROJECT_REF, SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN");
  process.exit(1);
}

const callbackUrl = `https://${ref}.supabase.co/functions/v1/shopify-webhook`;
const topics = [
  "CUSTOMERS_CREATE",
  "CUSTOMERS_UPDATE",
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
];

const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(JSON.stringify(json.errors || json));
  }
  return json.data;
}

const mutation = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: { format: JSON, callbackUrl: $callbackUrl }
    ) {
      userErrors { field message }
      webhookSubscription { id callbackUrl topic }
    }
  }
`;

for (const topic of topics) {
  try {
    const data = await gql(mutation, { topic, callbackUrl });
    const errs = data?.webhookSubscriptionCreate?.userErrors || [];
    if (errs.length) {
      console.warn(topic, errs.map((e) => e.message).join("; "));
    } else {
      console.log("OK", topic, data?.webhookSubscriptionCreate?.webhookSubscription?.id);
    }
  } catch (e) {
    console.error("FAIL", topic, e.message || e);
  }
}

console.log("\nCallback URL:", callbackUrl);
console.log("If a topic already points elsewhere, Shopify still allows an additional subscription for a new URL.");
// silence unused
void spawnSync;
