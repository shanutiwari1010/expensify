"use client";

import {
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
  CalendarIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { ExpenseDto } from "@/lib/schemas/expense";

export type StatsCardsProps = {
  expenses: ExpenseDto[];
  total: string;
};

export function StatsCards({ expenses, total }: StatsCardsProps) {
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date + "T00:00:00Z");
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const thisMonthTotal = thisMonthExpenses
    .reduce((sum, e) => sum + Number(e.amount), 0)
    .toFixed(2);

  const categories = new Set(expenses.map((e) => e.category));

  const topCategory = expenses.length > 0
    ? Object.entries(
        expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <WalletIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMoney(total)}</div>
          <p className="text-xs text-muted-foreground">
            {expenses.length} transaction{expenses.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMoney(thisMonthTotal)}</div>
          <p className="text-xs text-muted-foreground">
            {thisMonthExpenses.length} transaction{thisMonthExpenses.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Categories Used</CardTitle>
          <TrendingUpIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categories.size}</div>
          <p className="text-xs text-muted-foreground">
            out of 7 available
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <TrendingDownIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {topCategory ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-bold">
                  {topCategory[0]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatMoney(topCategory[1].toFixed(2))} spent
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">No expenses yet</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
