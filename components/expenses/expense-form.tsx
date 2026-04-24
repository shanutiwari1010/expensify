"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { useDisplayCurrency } from "@/providers/currency-preference-provider";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createExpenseRequest,
  FetchError,
  updateExpenseRequest,
  type CategoryDto,
} from "@/lib/api-client";
import {
  createExpenseSchema,
  type CreateExpenseInput,
  type ExpenseDto,
} from "@/lib/schemas/expense";
import { getCurrencyDisplaySymbol } from "@/lib/money";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toFormValues(e: ExpenseDto): CreateExpenseInput {
  return {
    amount: e.amount,
    category: e.category,
    description: e.description,
    date: e.date,
  };
}

const emptyDefaults: CreateExpenseInput = {
  amount: "",
  category: "" as CreateExpenseInput["category"],
  description: "",
  date: todayIso(),
};

function useIdempotencyKey() {
  const ref = useRef<string | null>(null);
  const getKey = useCallback(() => {
    ref.current ??= crypto.randomUUID();
    return ref.current;
  }, []);
  const reset = useCallback(() => {
    ref.current = null;
  }, []);
  return { getKey, reset };
}

export type ExpenseFormProps = {
  mode?: "create" | "edit";
  /** Required when `mode` is `edit` */
  expense?: Readonly<ExpenseDto>;
  categories: Readonly<CategoryDto>[];
  onRequestCreateCategory: (suggestedName?: string) => void;
  onSuccess: (expense: ExpenseDto) => void;
  onCancel?: () => void;
};

export function ExpenseForm({
  mode = "create",
  expense,
  categories,
  onRequestCreateCategory,
  onSuccess,
  onCancel,
}: Readonly<ExpenseFormProps>) {
  const { currency } = useDisplayCurrency();
  const amountSymbol = getCurrencyDisplaySymbol(currency);
  const formId = useId();
  const { getKey, reset: rollIdempotencyKey } = useIdempotencyKey();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues:
      mode === "edit" && expense ? toFormValues(expense) : emptyDefaults,
    mode: "onBlur",
  });

  useEffect(() => {
    if (mode === "edit" && expense) {
      reset(toFormValues(expense));
    }
  }, [mode, expense, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (mode === "edit" && expense) {
      try {
        const updated = await updateExpenseRequest(expense.id, values);
        onSuccess(updated);
        toast.success("Transaction updated.");
      } catch (err) {
        const serverMessage =
          err instanceof FetchError
            ? (err.body?.error?.message ?? err.message)
            : undefined;
        const message =
          serverMessage ?? "Could not update the expense. Please try again.";
        toast.error(message);
        if (serverMessage?.includes("doesn't exist")) {
          onRequestCreateCategory(values.category);
        }
      }
      return;
    }

    const idempotencyKey = getKey();
    try {
      const created = await createExpenseRequest(values, idempotencyKey);
      onSuccess(created);
      toast.success("Expense added successfully!");
      reset({ ...emptyDefaults, date: todayIso() });
      rollIdempotencyKey();
    } catch (err) {
      const serverMessage =
        err instanceof FetchError
          ? (err.body?.error?.message ?? err.message)
          : undefined;
      const message =
        serverMessage ?? "Could not save the expense. Please try again.";
      toast.error(message);
      if (serverMessage?.includes("doesn't exist")) {
        onRequestCreateCategory(values.category);
      }
    }
  });

  const isEdit = mode === "edit";

  const submitButtonContent = useMemo(() => {
    if (isSubmitting) {
      return (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          Saving...
        </>
      );
    }
    if (isEdit) {
      return (
        <>
          <CheckIcon className="size-4" />
          Save changes
        </>
      );
    }
    return (
      <>
        <PlusIcon className="size-4" />
        Add Expense
      </>
    );
  }, [isSubmitting, isEdit]);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FieldGroup className="gap-4">
        {isEdit ? (
          <p className="text-sm text-muted-foreground">
            Re-categorize or fix amount and description. Changes apply after you
            save.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${formId}-amount`}>Amount</FieldLabel>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <AmountInput
                  id={`${formId}-amount`}
                  placeholder="0.00"
                  currency={amountSymbol}
                  aria-invalid={Boolean(errors.amount) || undefined}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FieldError errors={errors.amount ? [errors.amount] : undefined} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`${formId}-category`}>Category</FieldLabel>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger
                      id={`${formId}-category`}
                      aria-invalid={Boolean(errors.category) || undefined}
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={
                          categories.length === 0
                            ? "No categories yet"
                            : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">
                          Create a category to continue.
                        </div>
                      ) : (
                        categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: c.color }}
                              />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {categories.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => onRequestCreateCategory()}
                    >
                      Create category
                    </Button>
                  )}
                </>
              )}
            />
            <FieldError
              errors={errors.category ? [errors.category] : undefined}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`${formId}-description`}>Description</FieldLabel>
          <Textarea
            id={`${formId}-description`}
            placeholder="What was this expense for?"
            rows={2}
            aria-invalid={Boolean(errors.description) || undefined}
            {...register("description")}
          />
          <FieldError
            errors={errors.description ? [errors.description] : undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${formId}-date`}>Date</FieldLabel>
          <Input
            id={`${formId}-date`}
            type="date"
            max={todayIso()}
            aria-invalid={Boolean(errors.date) || undefined}
            {...register("date")}
          />
          <FieldError errors={errors.date ? [errors.date] : undefined} />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {isEdit && onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="sm:mr-auto"
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gap-2 sm:w-auto"
            size="lg"
          >
            {submitButtonContent}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
