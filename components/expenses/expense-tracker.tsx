"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
  fetchExpenses,
  FetchError,
  type CategoryDto,
} from "@/lib/api-client";
import { sumDecimals, toDecimal } from "@/lib/money";
import type { ExpenseDto, ListExpensesResponse } from "@/lib/schemas/expense";

export type ExpenseTrackerProps = {
  initialData: ListExpensesResponse;
  initialCategories: CategoryDto[];
  showStats?: boolean;
};

export function ExpenseTracker({
  initialData,
  initialCategories,
  showStats = true,
}: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<ExpenseDto[]>(initialData.data);
  const [serverTotal, setServerTotal] = useState<string>(initialData.total);
  const [categories, setCategories] = useState<CategoryDto[]>(initialCategories);
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | undefined>(
    undefined
  );

  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (nextCategory: string, nextSort: SortOption) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const result = await fetchExpenses(
          {
            sort: nextSort,
            category: nextCategory === "all" ? undefined : nextCategory,
          },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setExpenses(result.data);
        setServerTotal(result.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof FetchError
            ? err.body?.error?.message ?? err.message
            : "Could not load expenses.";
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    []
  );

  const onCategoryChange = useCallback(
    (next: string) => {
      setCategory(next);
      void refresh(next, sort);
    },
    [refresh, sort]
  );

  const onSortChange = useCallback(
    (next: SortOption) => {
      setSort(next);
      void refresh(category, next);
    },
    [refresh, category]
  );

  const onCreated = useCallback((created: ExpenseDto) => {
    setExpenses((prev) => {
      if (prev.some((e) => e.id === created.id)) return prev;
      const next = [created, ...prev];
      // Re-sort locally (will be corrected on next fetch)
      next.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
      return next;
    });
    setDialogOpen(false);
  }, []);

  const onRequestCreateCategory = useCallback((name?: string) => {
    setSuggestedCategoryName(name?.trim() ? name.trim() : undefined);
    setCategoryManagerOpen(true);
  }, []);

  const visibleExpenses = useMemo(() => {
    if (category === "all") return expenses;
    return expenses.filter((e) => e.category === category);
  }, [expenses, category]);

  const total = useMemo(() => {
    return sumDecimals(visibleExpenses.map((e) => toDecimal(e.amount))).toFixed(2);
  }, [visibleExpenses]);

  useEffect(() => {
    const onAddExpense = () => setDialogOpen(true);
    const onManageCategories = () => setCategoryManagerOpen(true);
    const onSetCategory = (e: Event) => {
      const ce = e as CustomEvent<{ category?: string }>;
      const next = ce.detail?.category ?? "all";
      setCategory(next);
      void refresh(next, sort);
    };
    const onSetSort = (e: Event) => {
      const ce = e as CustomEvent<{ sort?: SortOption }>;
      const next = ce.detail?.sort ?? "date_desc";
      setSort(next);
      void refresh(category, next);
    };

    window.addEventListener("expensify:add-expense", onAddExpense);
    window.addEventListener("expensify:manage-categories", onManageCategories);
    window.addEventListener("expensify:set-category", onSetCategory);
    window.addEventListener("expensify:set-sort", onSetSort);

    return () => {
      abortRef.current?.abort();
      window.removeEventListener("expensify:add-expense", onAddExpense);
      window.removeEventListener("expensify:manage-categories", onManageCategories);
      window.removeEventListener("expensify:set-category", onSetCategory);
      window.removeEventListener("expensify:set-sort", onSetSort);
    };
  }, [refresh, sort, category]);

  // Refresh categories when manager closes
  const handleCategoriesChange = useCallback(async (newCategories: CategoryDto[]) => {
    setCategories(newCategories);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {showStats && <StatsCards expenses={expenses} total={serverTotal} />}

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
            isLoading={isLoading}
            categories={categories}
          />
          <ExpenseTotal
            total={total}
            count={visibleExpenses.length}
            filteredCount={category !== "all" ? expenses.length : undefined}
          />
        </CardContent>
      </Card>

      {/* Footer with keyboard shortcut hint */}
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
