import { ReceiptTextIcon } from "lucide-react";
import { formatMoney } from "@/lib/money";

export type ExpenseTotalProps = {
  total: string;
  count: number;
  filteredCount?: number;
};

export function ExpenseTotal({ total, count, filteredCount }: ExpenseTotalProps) {
  const showingFiltered = filteredCount !== undefined && filteredCount !== count;

  return (
    <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <ReceiptTextIcon className="size-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">
            {showingFiltered
              ? `Showing ${count} of ${filteredCount} expenses`
              : `${count} expense${count !== 1 ? "s" : ""}`}
          </span>
          <span className="text-sm font-medium text-foreground">
            Current Total
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="font-mono text-2xl font-bold tracking-tight">
          {formatMoney(total)}
        </span>
      </div>
    </div>
  );
}
