"use client";

import { useState } from "react";
import { Loader2Icon, MoreHorizontalIcon, PencilIcon, ReceiptTextIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDisplayCurrency } from "@/components/providers/currency-preference-provider";
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
  onEdit: (e: ExpenseDto) => void;
  onDelete: (e: ExpenseDto) => Promise<void>;
};

export function ExpenseList({
  expenses,
  isLoading,
  categories,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const { formatMoney: fmt } = useDisplayCurrency();
  const categoryMap = new Map(categories.map((c) => [c.name, c]));
  const [pendingDelete, setPendingDelete] = useState<ExpenseDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  };

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
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[130px] min-w-[7rem]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px] min-w-[7rem]">Category</TableHead>
              <TableHead className="w-[120px] min-w-[5rem] text-right">Amount</TableHead>
              <TableHead className="w-[56px] p-2 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
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
                      {fmt(e.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="p-1 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-offset-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Actions for ${e.description}`}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            onEdit(e);
                          }}
                        >
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPendingDelete(e)}
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(o) => {
          if (!o && !deleteBusy) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  This will permanently remove &quot;{pendingDelete.description}&quot; (
                  {fmt(pendingDelete.amount)}). This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteBusy ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
