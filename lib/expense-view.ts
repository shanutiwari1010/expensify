import type { ExpenseDto, ExpenseSortOption } from "@/lib/schemas/expense";
import { toDecimal } from "@/lib/money";

/**
 * Client-side filter + sort for the expense list. The UI keeps the full list in
 * memory (no pagination yet) and derives the visible rows here — no network
 * round-trip when the user changes category or sort.
 *
 * Ordering matches `listExpenses` in `lib/services/expenses.ts` (Prisma
 * `orderBy`) so behavior stays aligned with `GET /api/expenses`.
 */

export function filterExpensesByCategory(
  expenses: ExpenseDto[],
  category: string
): ExpenseDto[] {
  if (category === "all") return expenses;
  return expenses.filter((e) => e.category === category);
}

function byDateThenCreated(asc: boolean) {
  return (a: ExpenseDto, b: ExpenseDto): number => {
    const byDay = asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    if (byDay !== 0) return byDay;
    return asc
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt);
  };
}

function byAmountThenCreated(asc: boolean) {
  return (a: ExpenseDto, b: ExpenseDto): number => {
    const c = toDecimal(a.amount).comparedTo(toDecimal(b.amount));
    if (c !== 0) return asc ? c : -c;
    return asc
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt);
  };
}

export function sortExpenses(
  expenses: ExpenseDto[],
  sort: ExpenseSortOption
): ExpenseDto[] {
  const copy = expenses.slice();
  if (sort === "date_asc") copy.sort(byDateThenCreated(true));
  else if (sort === "date_desc") copy.sort(byDateThenCreated(false));
  else if (sort === "amount_asc") copy.sort(byAmountThenCreated(true));
  else if (sort === "amount_desc") copy.sort(byAmountThenCreated(false));
  return copy;
}

export function getVisibleExpenses(
  all: ExpenseDto[],
  category: string,
  sort: ExpenseSortOption
): ExpenseDto[] {
  return sortExpenses(filterExpensesByCategory(all, category), sort);
}
