/**
 * Money helpers. Prices are ALWAYS stored and reasoned about as integer minor
 * units (cents) — never floats — so there is no binary drift. The dollar
 * string parser reads the whole and fractional parts as integers and combines
 * them, so "45.00" is exactly 4500, not 4499.9999.
 */

const CURRENCY_SYMBOL: Record<string, string> = {
  usd: "$",
  cad: "$",
  eur: "€",
  gbp: "£",
};

/**
 * Parse a dollar amount (string like "$45.00", "1,299.9", or a number) into
 * integer cents. Anything unparseable — empty, letters only — is 0. Fractional
 * input beyond two places is truncated toward zero.
 */
export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : 0;
  }
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return 0;
  const [whole, frac = ""] = cleaned.split(".");
  const dollars = whole === "" ? 0 : parseInt(whole, 10);
  const cents = parseInt((frac + "00").slice(0, 2), 10);
  if (Number.isNaN(dollars) || Number.isNaN(cents)) return 0;
  return dollars * 100 + cents;
}

/** Render integer cents as a plain two-decimal dollar string (no symbol). */
export function centsToDollars(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Format integer cents with the currency symbol, e.g. "$45.00" / "€0.99". */
export function formatCents(cents: number, currency = "usd"): string {
  const symbol = CURRENCY_SYMBOL[currency.toLowerCase()] ?? "$";
  return `${symbol}${centsToDollars(cents)}`;
}
