import { Prisma } from "@prisma/client";

// Convert a validated amount string into a Prisma Decimal for safe arithmetic
// and storage. Input must already be validated by `createExpenseSchema`.
export function toDecimal(input: string): Prisma.Decimal {
  return new Prisma.Decimal(input);
}

export function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(v),
    new Prisma.Decimal(0)
  );
}

/** Symbol for `AmountInput` (e.g. ₹, $). */
export function getCurrencyDisplaySymbol(
  currencyCode: string,
  locale?: Intl.LocalesArgument
): string {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currencyCode
    );
  } catch {
    return currencyCode;
  }
}

/**
 * Formats a numeric amount for display. Pass `currency` from the display-currency
 * preference; amounts in the API/DB are plain decimal strings.
 */
export function formatMoney(
  amount: string | number,
  currency: string = "INR",
  locale?: Intl.LocalesArgument
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return typeof amount === "string" ? amount : String(amount);
  }
}
