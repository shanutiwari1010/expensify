import type { ExpenseDto, ExpenseSortOption } from "@/lib/schemas/expense";
import { toDecimal } from "@/lib/money";

/**
 * Client-side filter + sort for the expense list. The full list is held in
 * state; we derive the filtered/sorted set here, then paginate a slice for the
 * table (no network round-trip when page, category, or sort changes).
 *
 * Ordering matches `listExpenses` in `lib/services/expenses.ts` (Prisma
 * `orderBy`) so behavior stays aligned with `GET /api/expenses`.
 */

/** Allowed rows per page in the expense table UI. */
export const EXPENSE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type ExpensePageSize = (typeof EXPENSE_PAGE_SIZE_OPTIONS)[number];

export function totalPageCount(itemCount: number, pageSize: number): number {
  if (itemCount <= 0) return 1;
  return Math.ceil(itemCount / pageSize);
}

/** Human-readable range for the expense table footer, e.g. `1-10 of 42` (1-based `page`). */
export function expensePaginationRangeLabel(
  page: number,
  pageSize: number,
  totalItems: number,
): string {
  if (totalItems === 0) return "0 of 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return `${from}-${to} of ${totalItems}`;
}

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function filterExpensesByCategory(
  expenses: ExpenseDto[],
  category: string,
): ExpenseDto[] {
  if (category === "all") return expenses;
  return expenses.filter((e) => e.category === category);
}

function byDateThenCreated(asc: boolean) {
  return (a: ExpenseDto, b: ExpenseDto): number => {
    const byDay = asc
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date);
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
  sort: ExpenseSortOption,
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
  sort: ExpenseSortOption,
): ExpenseDto[] {
  return sortExpenses(filterExpensesByCategory(all, category), sort);
}
