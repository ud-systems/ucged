/** Sentinel used historically when RFM found no linked orders. Never show this. */
export const DAYS_QUIET_UNKNOWN = 9999;

/** Normalize stored recency: treat null / ≥9999 as unknown. */
export function normalizeDaysQuiet(
  ...values: Array<number | string | null | undefined>
): number | null {
  for (const raw of values) {
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n >= DAYS_QUIET_UNKNOWN) continue;
    return Math.max(0, Math.floor(n));
  }
  return null;
}

/** Display helper for tables / KPIs. */
export function formatDaysQuiet(
  ...values: Array<number | string | null | undefined>
): string | number {
  return normalizeDaysQuiet(...values) ?? "—";
}

/** Days since an ISO timestamp (order date). */
export function daysSince(iso: string | null | undefined, nowMs = Date.now()): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((nowMs - ms) / 86400000));
}

/** Prefer latest order timestamps, else fall back to stored RFM/task recency. */
export function daysQuietFromOrders(
  orders: Array<{ processed_at?: string | null; shopify_created_at?: string | null }>,
  ...stored: Array<number | string | null | undefined>
): number | null {
  let latest = 0;
  for (const o of orders) {
    const raw = o.processed_at || o.shopify_created_at;
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (Number.isFinite(ms) && ms > latest) latest = ms;
  }
  if (latest > 0) return daysSince(new Date(latest).toISOString());
  return normalizeDaysQuiet(...stored);
}

/** Email local-part used to match related Shopify duplicate profiles. */
export function emailLocalPart(email: string | null | undefined): string | null {
  const raw = (email || "").trim().toLowerCase();
  if (!raw.includes("@")) return null;
  const local = raw.split("@")[0] || "";
  return local.length >= 4 ? local : null;
}
