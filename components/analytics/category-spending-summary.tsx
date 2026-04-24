"use client";

import * as React from "react";
import type { TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3Icon, PieChartIcon, ReceiptIcon } from "lucide-react";

import { useDisplayCurrency } from "@/providers/currency-preference-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildCategorySpendingSummary,
  type CategorySpendingRow,
} from "@/lib/analytics/category-spending";
import type { CategoryDto } from "@/lib/api-client";
import type { ExpenseDto } from "@/lib/schemas/expense";
type CategorySpendingSummaryProps = {
  categories: CategoryDto[];
  expenses: ExpenseDto[];
};

function shareBar(percent: number, color: string): React.ReactNode {
  const w = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 w-full min-w-24 max-w-40 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${w}%`, backgroundColor: color }}
      />
    </div>
  );
}

type ChartPoint = { name: string; value: number; color: string };

const CategorySpendingBarTooltip = (
  props: TooltipContentProps,
): React.ReactNode => {
  const { formatMoney: fmt } = useDisplayCurrency();
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as ChartPoint | undefined;
  if (p == null) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1.5 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      <p className="font-mono text-muted-foreground tabular-nums">
        {fmt(String(p.value))}
      </p>
    </div>
  );
};

export function CategorySpendingSummary({
  categories,
  expenses,
}: Readonly<CategorySpendingSummaryProps>) {
  const { formatMoney: fmt, currency } = useDisplayCurrency();
  const { grandTotal, rows } = React.useMemo(
    () => buildCategorySpendingSummary(categories, expenses),
    [categories, expenses],
  );

  const withSpend = rows.filter((r) => r.count > 0);
  const chartData: ChartPoint[] = React.useMemo(() => {
    return [...rows]
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: r.name,
        value: Number(r.total),
        color: r.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const chartKey = React.useMemo(
    () => [currency, chartData.length, grandTotal].join(),
    [chartData.length, currency, grandTotal],
  );
  const chartHeight = Math.max(200, Math.min(480, withSpend.length * 44 + 32));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              All transactions
            </CardTitle>
            <ReceiptIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{fmt(grandTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {expenses.length} total · {rows.filter((r) => r.count > 0).length}{" "}
              categories with spend
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categories in app
            </CardTitle>
            <PieChartIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {categories.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Created in the category list
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biggest share</CardTitle>
            <BarChart3Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {withSpend[0] ? (
              <>
                <p className="text-lg font-semibold leading-tight">
                  {withSpend[0].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt(withSpend[0].total)} · {withSpend[0].sharePercent}% of
                  total
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No spending yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Add categories from the app to see a structured breakdown. You can
            create categories when logging expenses.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>
              Every category you have, with totals and what fraction of your
              spending it represents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[32%]">Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="w-[12%] text-right">#</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: CategorySpendingRow) => (
                      <TableRow
                        key={r.name}
                        className={r.count === 0 ? "opacity-60" : undefined}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="font-medium">{r.name}</span>
                            {r.unlisted ? (
                              <Badge variant="outline" className="text-[10px]">
                                not in list
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {fmt(r.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                              {r.count > 0 ? `${r.sharePercent}%` : "—"}
                            </span>
                            {shareBar(r.sharePercent, r.color)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {r.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Visual breakdown</CardTitle>
            <CardDescription>
              Horizontal bars sized by amount ({currency}). Categories with no
              spend are omitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                Add expenses to see a chart.
              </div>
            ) : (
              <div
                className="w-full text-xs [&_.recharts-text]:fill-muted-foreground"
                key={chartKey}
              >
                <ResponsiveContainer
                  width="100%"
                  height={chartHeight}
                  debounce={50}
                >
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="hsl(var(--border) / 0.5)"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => fmt(String(v))}
                      className="tabular-nums"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        String(v).length > 20
                          ? `${String(v).slice(0, 19)}…`
                          : String(v)
                      }
                    />
                    <Tooltip content={CategorySpendingBarTooltip} />
                    <Bar
                      dataKey="value"
                      maxBarSize={32}
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={false}
                    >
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i + entry.name}
                          fill={entry.color}
                          fillOpacity={0.88}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
