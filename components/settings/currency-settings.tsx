"use client";

import { useId } from "react";
import { CoinsIcon } from "lucide-react";

import { useDisplayCurrency } from "@/providers/currency-preference-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CurrencySettings(): React.ReactNode {
  const { currency, setCurrency } = useDisplayCurrency();
  const id = useId();

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CoinsIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Field>
            <FieldLabel htmlFor={id}>Display currency</FieldLabel>
            <FieldDescription>
              Choose how amounts appear across the app and next to the amount field when you
              add or edit an expense. Stored amounts are still plain numbers; this is your
              display standard.
            </FieldDescription>
            <Select
              value={currency}
              onValueChange={(v) => {
                if (v) setCurrency(v);
              }}
            >
              <SelectTrigger id={id} className="mt-2 w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
