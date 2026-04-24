/** ISO 4217 display currencies supported in Settings ( amounts stay numeric; this controls UI only). */
export const SUPPORTED_CURRENCIES: ReadonlyArray<{
  code: string;
  name: string;
}> = [
  { code: "INR", name: "Indian rupee" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "JPY", name: "Japanese yen" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "AED", name: "UAE dirham" },
  { code: "SAR", name: "Saudi riyal" },
] as const;

const CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));

export const DEFAULT_DISPLAY_CURRENCY = "INR";

export const STORAGE_KEY_DISPLAY_CURRENCY = "expensify:display-currency";

export function isSupportedCurrency(code: string): boolean {
  return CODES.has(code);
}
