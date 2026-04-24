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

// Display formatter. The UI is currency-agnostic by default — we show rupees
// because the spec uses ₹, but swap the `currency` once we add a setting.
export function formatMoney(
  amount: string | number,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}
