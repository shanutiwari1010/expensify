"use client";

import {
  FilterIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  XIcon,
  SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { CategoryDto } from "@/lib/api-client";
import type { ExpenseSortOption } from "@/lib/schemas/expense";

export type SortOption = ExpenseSortOption;

export type ExpenseFiltersProps = {
  category: string;
  onCategoryChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  categories: CategoryDto[];
  onManageCategories: () => void;
};

const sortOptions: { value: ExpenseSortOption; label: string; icon: React.ReactNode }[] = [
  {
    value: "date_desc",
    label: "Date (Newest)",
    icon: <ArrowDownIcon className="size-3.5" />,
  },
  {
    value: "date_asc",
    label: "Date (Oldest)",
    icon: <ArrowUpIcon className="size-3.5" />,
  },
  {
    value: "amount_desc",
    label: "Amount (High)",
    icon: <ArrowDownIcon className="size-3.5" />,
  },
  {
    value: "amount_asc",
    label: "Amount (Low)",
    icon: <ArrowUpIcon className="size-3.5" />,
  },
];

export function ExpenseFilters({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
  onManageCategories,
}: ExpenseFiltersProps) {
  const hasFilter = category !== "all";
  const currentSort = sortOptions.find((s) => s.value === sort) ?? sortOptions[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Category filter */}
      <div className="flex items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground" />
        <Select
          value={category}
          onValueChange={(v) => {
            if (!v) return;
            onCategoryChange(v);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort dropdown */}
      <Select
        value={sort}
        onValueChange={(v) => {
          if (!v) return;
          onSortChange(v as SortOption);
        }}
      >
        <SelectTrigger className="w-[150px]">
          <div className="flex items-center gap-1.5">
            {currentSort.icon}
            <span>{currentSort.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Manage categories button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onManageCategories}
        className="gap-1.5 text-muted-foreground"
      >
        <SettingsIcon className="size-3.5" />
        Categories
      </Button>

      {/* Clear filter */}
      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCategoryChange("all")}
          className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" />
          Clear
          <Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-xs">
            {category}
          </Badge>
        </Button>
      )}
    </div>
  );
}
