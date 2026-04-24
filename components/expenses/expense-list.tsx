"use client";

import { ReceiptTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { ExpenseDto } from "@/lib/schemas/expense";
import type { CategoryDto } from "@/lib/api-client";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return formatDate(iso);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type ExpenseListProps = {
  expenses: ExpenseDto[];
  isLoading: boolean;
  categories: CategoryDto[];
};

export function ExpenseList({ expenses, isLoading, categories }: ExpenseListProps) {
  const categoryMap = new Map(categories.map((c) => [c.name, c]));

  if (isLoading && expenses.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-12">
        <EmptyHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <ReceiptTextIcon className="size-6 text-muted-foreground" />
          </div>
          <EmptyTitle>No expenses yet</EmptyTitle>
          <EmptyDescription>
            Add your first expense to start tracking your spending.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[140px]">Category</TableHead>
            <TableHead className="w-[140px] text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => {
            const cat = categoryMap.get(e.category);
            const bgColor = cat?.color ? hexToRgba(cat.color, 0.15) : undefined;
            const textColor = cat?.color ?? "#6B7280";

            return (
              <TableRow key={e.id} className="group">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{formatRelativeDate(e.date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(e.date)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{e.description}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="border-0 font-medium"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                    }}
                  >
                    <span
                      className="mr-1.5 size-2 rounded-full"
                      style={{ backgroundColor: textColor }}
                    />
                    {e.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-base font-semibold tabular-nums">
                    {formatMoney(e.amount)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
