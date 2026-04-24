import { Prisma } from "@prisma/client";

import type { CategoryDto } from "@/lib/api-client";
import { sumDecimals, toDecimal } from "@/lib/money";
import type { ExpenseDto } from "@/lib/schemas/expense";

export type CategorySpendingRow = {
  name: string;
  color: string;
  /** Present when the row is not from the current category list (orphan / legacy). */
  unlisted: boolean;
  total: string;
  count: number;
  /** Share of all expenses, 0–100, one decimal. */
  sharePercent: number;
};

type Decimal = ReturnType<typeof toDecimal>;

const ZERO = new Prisma.Decimal(0);

function percentOf(partial: Decimal, grand: Decimal): number {
  if (grand.comparedTo(ZERO) === 0) return 0;
  return Number(partial.mul(100).div(grand).toFixed(1));
}

/**
 * All categories from the catalog plus any category names that appear in
 * expenses but are missing from the catalog (e.g. legacy or deleted).
 */
export function buildCategorySpendingSummary(
  categories: CategoryDto[],
  expenses: ExpenseDto[]
): { grandTotal: string; rows: CategorySpendingRow[] } {
  const grand = sumDecimals(
    expenses.length ? expenses.map((e) => toDecimal(e.amount)) : [toDecimal("0.00")]
  );

  const byCategory = new Map<string, { total: Decimal; count: number }>();
  for (const e of expenses) {
    const prev = byCategory.get(e.category);
    const amt = toDecimal(e.amount);
    byCategory.set(e.category, {
      total: prev ? prev.total.plus(amt) : amt,
      count: (prev?.count ?? 0) + 1,
    });
  }

  const seen = new Set<string>();
  const rows: CategorySpendingRow[] = [];

  for (const c of categories) {
    seen.add(c.name);
    const agg = byCategory.get(c.name);
    const totalDec = agg?.total ?? toDecimal("0.00");
    const count = agg?.count ?? 0;
    rows.push({
      name: c.name,
      color: c.color,
      unlisted: false,
      total: totalDec.toFixed(2),
      count,
      sharePercent: percentOf(totalDec, grand),
    });
  }

  for (const name of [...byCategory.keys()].sort((a, b) => a.localeCompare(b))) {
    if (seen.has(name)) continue;
    const agg = byCategory.get(name)!;
    rows.push({
      name,
      color: "#6B7280",
      unlisted: true,
      total: agg.total.toFixed(2),
      count: agg.count,
      sharePercent: percentOf(agg.total, grand),
    });
  }

  rows.sort((a, b) => toDecimal(b.total).comparedTo(toDecimal(a.total)));

  return { grandTotal: grand.toFixed(2), rows };
}
