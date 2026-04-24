"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { ExpenseFilters, type SortOption } from "./expense-filters";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { ExpenseTotal } from "./expense-total";
import { StatsCards } from "./stats-cards";
import { CategoryManager } from "./category-manager";
import { deleteExpenseRequest, FetchError, type CategoryDto } from "@/lib/api-client";
import {
  getVisibleExpenses,
  paginateList,
  totalPageCount,
  type ExpensePageSize,
} from "@/lib/expense-view";
import { ExpenseTablePagination } from "./expense-table-pagination";
import {
  formatAddExpenseShortcut,
  formatCommandPaletteFallbackShortcut,
  formatCommandPaletteShortcut,
} from "@/lib/keyboard-shortcuts";
import { sumDecimals, toDecimal } from "@/lib/money";
import type { ExpenseDto, ListExpensesResponse } from "@/lib/schemas/expense";

export type ExpenseTrackerProps = {
  initialData: ListExpensesResponse;
  initialCategories: CategoryDto[];
  showStats?: boolean;
};

/**
 * The tracker holds the full expense list in client state (seeded from the
 * server on first paint). Category + sort are view state only — we derive
 * the visible rows with `getVisibleExpenses` (no GET /api/expenses on every
 * dropdown change). POST still creates the canonical row on the server; we
 * merge the returned DTO into state.
 */
export function ExpenseTracker({
  initialData,
  initialCategories,
  showStats = true,
}: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<ExpenseDto[]>(initialData.data);
  const [categories, setCategories] = useState<CategoryDto[]>(initialCategories);
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseDto | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ExpensePageSize>(10);

  const grandTotal = useMemo(
    () => sumDecimals(expenses.map((e) => toDecimal(e.amount))).toFixed(2),
    [expenses]
  );

  const onCategoryChange = useCallback((next: string) => {
    setCategory(next);
  }, []);

  const onSortChange = useCallback((next: SortOption) => {
    setSort(next);
  }, []);

  const onAddSuccess = useCallback((created: ExpenseDto) => {
    setDialogOpen(false);
    setExpenses((prev) => {
      if (prev.some((e) => e.id === created.id)) return prev;
      return [...prev, created];
    });
  }, []);

  const onUpdateSuccess = useCallback((updated: ExpenseDto) => {
    setEditExpense(null);
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const onDelete = useCallback(async (e: ExpenseDto) => {
    try {
      await deleteExpenseRequest(e.id);
      setExpenses((prev) => prev.filter((x) => x.id !== e.id));
      if (editExpense?.id === e.id) setEditExpense(null);
      toast.success("Transaction deleted.");
    } catch (err) {
      const message =
        err instanceof FetchError
          ? err.body?.error?.message ?? err.message
          : "Could not delete the expense.";
      toast.error(message);
    }
  }, [editExpense?.id]);

  const onRequestCreateCategory = useCallback((name?: string) => {
    setSuggestedCategoryName(name?.trim() ? name.trim() : undefined);
    setCategoryManagerOpen(true);
  }, []);

  const visibleExpenses = useMemo(
    () => getVisibleExpenses(expenses, category, sort),
    [expenses, category, sort]
  );

  const totalPages = useMemo(
    () => totalPageCount(visibleExpenses.length, pageSize),
    [visibleExpenses.length, pageSize]
  );

  const pagedExpenses = useMemo(
    () => paginateList(visibleExpenses, page, pageSize),
    [visibleExpenses, page, pageSize]
  );

  const total = useMemo(() => {
    return sumDecimals(visibleExpenses.map((e) => toDecimal(e.amount))).toFixed(2);
  }, [visibleExpenses]);

  // New filter/sort or page size: start from first page
  useEffect(() => {
    setPage(1);
  }, [category, sort, pageSize]);

  // If the list shrinks (delete, filter), stay on a valid page
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    const onAddExpense = () => {
      if (editExpense) return;
      setDialogOpen(true);
    };
    const onManageCategories = () => setCategoryManagerOpen(true);
    const onSetCategory = (e: Event) => {
      const ce = e as CustomEvent<{ category?: string }>;
      setCategory(ce.detail?.category ?? "all");
    };
    const onSetSort = (e: Event) => {
      const ce = e as CustomEvent<{ sort?: SortOption }>;
      setSort(ce.detail?.sort ?? "date_desc");
    };

    globalThis.addEventListener("expensify:add-expense", onAddExpense);
    globalThis.addEventListener("expensify:manage-categories", onManageCategories);
    globalThis.addEventListener("expensify:set-category", onSetCategory);
    globalThis.addEventListener("expensify:set-sort", onSetSort);

    return () => {
      globalThis.removeEventListener("expensify:add-expense", onAddExpense);
      globalThis.removeEventListener("expensify:manage-categories", onManageCategories);
      globalThis.removeEventListener("expensify:set-category", onSetCategory);
      globalThis.removeEventListener("expensify:set-sort", onSetSort);
    };
  }, [editExpense]);

  const handleCategoriesChange = useCallback(async (newCategories: CategoryDto[]) => {
    setCategories(newCategories);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {showStats && <StatsCards expenses={expenses} total={grandTotal} />}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent Expenses</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage your daily expenses
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ExpenseFilters
              category={category}
              onCategoryChange={onCategoryChange}
              sort={sort}
              onSortChange={onSortChange}
              categories={categories}
              onManageCategories={() => setCategoryManagerOpen(true)}
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4" />
                Add Expense
                <Kbd className="ml-1 hidden sm:inline-flex">
                  {formatAddExpenseShortcut()}
                </Kbd>
              </Button>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new expense with amount, category, and description.
                  </DialogDescription>
                </DialogHeader>
                {dialogOpen ? (
                  <ExpenseForm
                    key="add-expense"
                    mode="create"
                    onSuccess={onAddSuccess}
                    categories={categories}
                    onRequestCreateCategory={onRequestCreateCategory}
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            <Dialog
              open={editExpense != null}
              onOpenChange={(o) => {
                if (!o) setEditExpense(null);
              }}
            >
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit transaction</DialogTitle>
                  <DialogDescription>
                    Update amount, re-categorize, or change the description and date.
                  </DialogDescription>
                </DialogHeader>
                {editExpense ? (
                  <ExpenseForm
                    key={editExpense.id}
                    mode="edit"
                    expense={editExpense}
                    onSuccess={onUpdateSuccess}
                    onCancel={() => setEditExpense(null)}
                    categories={categories}
                    onRequestCreateCategory={onRequestCreateCategory}
                  />
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ExpenseList
            expenses={pagedExpenses}
            isLoading={false}
            categories={categories}
            onEdit={setEditExpense}
            onDelete={onDelete}
          />
          <ExpenseTablePagination
            page={page}
            pageSize={pageSize}
            totalItems={visibleExpenses.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <ExpenseTotal
            total={total}
            count={visibleExpenses.length}
            filteredCount={category !== "all" ? expenses.length : undefined}
          />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Kbd className="mx-0.5">{formatAddExpenseShortcut()}</Kbd> add ·{" "}
        <Kbd className="mx-0.5">{formatCommandPaletteShortcut()}</Kbd> /{" "}
        <Kbd className="mx-0.5">{formatCommandPaletteFallbackShortcut()}</Kbd> command
        palette
      </p>

      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={(open) => {
          setCategoryManagerOpen(open);
          if (!open) setSuggestedCategoryName(undefined);
        }}
        categories={categories}
        onCategoriesChange={handleCategoriesChange}
        suggestedName={suggestedCategoryName}
      />
    </div>
  );
}
