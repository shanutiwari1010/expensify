"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";

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
import type { CategoryDto } from "@/lib/api-client";
import { getVisibleExpenses } from "@/lib/expense-view";
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
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | undefined>(
    undefined
  );

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

  const onCreated = useCallback((created: ExpenseDto) => {
    setDialogOpen(false);
    setExpenses((prev) => {
      if (prev.some((e) => e.id === created.id)) return prev;
      return [...prev, created];
    });
  }, []);

  const onRequestCreateCategory = useCallback((name?: string) => {
    setSuggestedCategoryName(name?.trim() ? name.trim() : undefined);
    setCategoryManagerOpen(true);
  }, []);

  const visibleExpenses = useMemo(
    () => getVisibleExpenses(expenses, category, sort),
    [expenses, category, sort]
  );

  const total = useMemo(() => {
    return sumDecimals(visibleExpenses.map((e) => toDecimal(e.amount))).toFixed(2);
  }, [visibleExpenses]);

  useEffect(() => {
    const onAddExpense = () => setDialogOpen(true);
    const onManageCategories = () => setCategoryManagerOpen(true);
    const onSetCategory = (e: Event) => {
      const ce = e as CustomEvent<{ category?: string }>;
      setCategory(ce.detail?.category ?? "all");
    };
    const onSetSort = (e: Event) => {
      const ce = e as CustomEvent<{ sort?: SortOption }>;
      setSort(ce.detail?.sort ?? "date_desc");
    };

    window.addEventListener("expensify:add-expense", onAddExpense);
    window.addEventListener("expensify:manage-categories", onManageCategories);
    window.addEventListener("expensify:set-category", onSetCategory);
    window.addEventListener("expensify:set-sort", onSetSort);

    return () => {
      window.removeEventListener("expensify:add-expense", onAddExpense);
      window.removeEventListener("expensify:manage-categories", onManageCategories);
      window.removeEventListener("expensify:set-category", onSetCategory);
      window.removeEventListener("expensify:set-sort", onSetSort);
    };
  }, []);

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
                <Kbd className="ml-1 hidden sm:inline-flex">⌘N</Kbd>
              </Button>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new expense with amount, category, and description.
                  </DialogDescription>
                </DialogHeader>
                <ExpenseForm
                  onCreated={onCreated}
                  categories={categories}
                  onRequestCreateCategory={onRequestCreateCategory}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ExpenseList
            expenses={visibleExpenses}
            isLoading={false}
            categories={categories}
          />
          <ExpenseTotal
            total={total}
            count={visibleExpenses.length}
            filteredCount={category !== "all" ? expenses.length : undefined}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Tip:</span>
        <span>Press</span>
        <Kbd>⌘K</Kbd>
        <span className="hidden sm:inline">or</span>
        <Kbd className="hidden sm:inline">⌘⇧P</Kbd>
        <span>to open the command palette</span>
      </div>

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
