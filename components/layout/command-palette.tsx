"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PlusIcon,
  ReceiptTextIcon,
  LayoutDashboardIcon,
  PieChartIcon,
  SettingsIcon,
  TagIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  SearchIcon,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { fetchCategories, type CategoryDto } from "@/lib/api-client";
import type { ExpenseSortOption } from "@/lib/schemas/expense";

const sortItems: Array<{
  value: ExpenseSortOption;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "date_desc", label: "Sort: Date (Newest)", icon: <ArrowDownIcon /> },
  { value: "date_asc", label: "Sort: Date (Oldest)", icon: <ArrowUpIcon /> },
  {
    value: "amount_desc",
    label: "Sort: Amount (High)",
    icon: <ArrowDownIcon />,
  },
  { value: "amount_asc", label: "Sort: Amount (Low)", icon: <ArrowUpIcon /> },
];

function dispatch(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return navigator.platform.toLowerCase().includes("mac");
  }, []);

  // Keyboard shortcuts:
  // - Cmd/Ctrl+Shift+P: reliable fallback (avoids browser address-bar conflicts)
  // - Cmd/Ctrl+K: attempt to open (may be intercepted by the browser)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === "k") {
        // Best effort; some browsers hijack Cmd+K.
        e.preventDefault();
        setOpen(true);
      }
      if (key === "p" && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load categories when palette opens.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const nav = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboardIcon /> },
    { label: "Expenses", href: "/expenses", icon: <ReceiptTextIcon /> },
    { label: "Analytics", href: "/analytics", icon: <PieChartIcon /> },
    { label: "Settings", href: "/settings", icon: <SettingsIcon /> },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette">
      <Command>
        <CommandInput placeholder="Search commands…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                dispatch("expensify:add-expense");
              }}
            >
              <PlusIcon />
              Add expense
              <CommandShortcut>
                {isMac ? "⌘⇧P" : "Ctrl+Shift+P"}
              </CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                setOpen(false);
                dispatch("expensify:manage-categories");
              }}
            >
              <TagIcon />
              Manage categories
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            {nav.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => go(item.href)}
                data-checked={pathname === item.href ? "true" : undefined}
              >
                {item.icon}
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Filter by category">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                dispatch("expensify:set-category", { category: "all" });
              }}
            >
              <SearchIcon />
              All categories
            </CommandItem>
            {categories.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => {
                  setOpen(false);
                  dispatch("expensify:set-category", { category: c.name });
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Sort">
            {sortItems.map((s) => (
              <CommandItem
                key={s.value}
                onSelect={() => {
                  setOpen(false);
                  dispatch("expensify:set-sort", { sort: s.value });
                }}
              >
                {s.icon}
                {s.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
