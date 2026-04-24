"use client";

import { useCallback, useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, Loader2Icon } from "lucide-react";

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
import { createExpenseRequest, FetchError, type CategoryDto } from "@/lib/api-client";
import {
  createExpenseSchema,
  type CreateExpenseInput,
  type ExpenseDto,
} from "@/lib/schemas/expense";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function useIdempotencyKey() {
  const ref = useRef<string | null>(null);
  const getKey = useCallback(() => {
    if (ref.current === null) ref.current = crypto.randomUUID();
    return ref.current;
  }, []);
  const reset = useCallback(() => {
    ref.current = null;
  }, []);
  return { getKey, reset };
}

const emptyDefaults: CreateExpenseInput = {
  amount: "",
  category: "" as CreateExpenseInput["category"],
  description: "",
  date: todayIso(),
};

export type ExpenseFormProps = {
  onCreated: (expense: ExpenseDto) => void;
  categories: CategoryDto[];
  onRequestCreateCategory: (suggestedName?: string) => void;
};

export function ExpenseForm({
  onCreated,
  categories,
  onRequestCreateCategory,
}: ExpenseFormProps) {
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
    defaultValues: emptyDefaults,
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    const idempotencyKey = getKey();
    try {
      const created = await createExpenseRequest(values, idempotencyKey);
      onCreated(created);
      toast.success("Expense added successfully!");
      reset({ ...emptyDefaults, date: todayIso() });
      rollIdempotencyKey();
    } catch (err) {
      const serverMessage =
        err instanceof FetchError ? err.body?.error?.message ?? err.message : undefined;
      const message = serverMessage ?? "Could not save the expense. Please try again.";
      toast.error(message);

      // If the category doesn't exist, guide the user into creating it.
      if (serverMessage?.includes("doesn't exist")) {
        onRequestCreateCategory(values.category);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FieldGroup className="gap-4">
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
            <FieldError errors={errors.category ? [errors.category] : undefined} />
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <PlusIcon className="size-4" />
              Add Expense
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
