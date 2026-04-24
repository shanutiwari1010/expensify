"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AmountInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "inputMode"
> & {
  currency?: string;
};

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ className, currency = "₹", onChange, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, decimal point
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        ".",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];

      // Allow Ctrl/Cmd + A, C, V, X
      if (
        (e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].includes(e.key.toLowerCase())
      ) {
        return;
      }

      if (allowedKeys.includes(e.key)) {
        // Prevent multiple decimal points
        if (e.key === "." && e.currentTarget.value.includes(".")) {
          e.preventDefault();
        }
        return;
      }

      // Only allow digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData("text");
      // Only allow pasting valid numeric values
      if (!/^\d*\.?\d*$/.test(pastedText)) {
        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Filter out any non-numeric characters except decimal point
      let value = e.target.value.replace(/[^\d.]/g, "");

      // Ensure only one decimal point
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }

      // Limit to 2 decimal places
      if (parts.length === 2 && parts[1].length > 2) {
        value = parts[0] + "." + parts[1].slice(0, 2);
      }

      // Update the input value
      e.target.value = value;
      onChange?.(e);
    };

    return (
      <div className="relative">
        <span
          className="pointer-events-none absolute left-2.5 top-1/2 max-w-16 truncate -translate-y-1/2 text-left text-sm text-muted-foreground"
          title={String(currency)}
        >
          {currency}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          className={cn("pl-10 text-lg font-medium tabular-nums", className)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
