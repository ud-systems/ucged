/** Format an amount with the currency symbol (e.g. £214.24) instead of a code (GBP). */
export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode?: string | null,
): string {
  const value = Number(amount ?? 0);
  const code = (currencyCode || "GBP").trim().toUpperCase() || "GBP";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    // Unknown / invalid currency code — fall back to symbol map + amount
    const symbols: Record<string, string> = {
      GBP: "£",
      USD: "$",
      EUR: "€",
      AED: "د.إ",
      SAR: "﷼",
    };
    const symbol = symbols[code] || `${code} `;
    return `${symbol}${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
  }
}
