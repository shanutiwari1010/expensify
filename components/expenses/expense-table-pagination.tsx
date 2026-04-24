"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_PAGE_SIZE_OPTIONS,
  type ExpensePageSize,
} from "@/lib/expense-view";

function rangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 of 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `${from}–${to} of ${total}`;
}

export type ExpenseTablePaginationProps = {
  page: number;
  pageSize: ExpensePageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: ExpensePageSize) => void;
};

export function ExpenseTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: ExpenseTablePaginationProps) {
  const totalPages = totalItems <= 0 ? 1 : Math.ceil(totalItems / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      role="navigation"
      aria-label="Expense table pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{rangeLabel(page, pageSize, totalItems)}</span>{" "}
        transactions
      </p>

      <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="expense-page-size" className="whitespace-nowrap text-sm text-muted-foreground">
            Rows
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (!v) return;
              onPageSizeChange(Number(v) as ExpensePageSize);
            }}
          >
            <SelectTrigger id="expense-page-size" className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[5.5rem] px-2 text-center text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
