import { z } from "zod";

// Amounts travel over the wire as strings to avoid JS float drift. We accept
// up to 12 integer digits + 2 decimals, matching the DB column Decimal(14, 2).
const amountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals")
  .refine((v) => Number(v) > 0, "Amount must be greater than 0")
  .refine((v) => v.replace(".", "").length <= 14, "Amount is too large");

// ISO calendar date (no time, no timezone). Matches `Expense.date @db.Date`.
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(new Date(v + "T00:00:00Z").getTime()), "Invalid date");

// Category is now dynamic (from DB), so we accept any non-empty string
// and validate against the actual categories on the server
const categorySchema = z
  .string()
  .trim()
  .min(1, "Please select a category")
  .max(64, "Category name is too long");

export const createExpenseSchema = z.object({
  amount: amountSchema,
  category: categorySchema,
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  date: dateSchema,
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  category: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional().default("date_desc"),
});

export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

// DTO that the API returns. `amount` and dates are strings — NEVER numbers —
// so the client never has to reason about float precision.
export const expenseDtoSchema = z.object({
  id: z.string(),
  amount: z.string(),
  category: z.string(),
  description: z.string(),
  date: z.string(),
  createdAt: z.string(),
});

export type ExpenseDto = z.infer<typeof expenseDtoSchema>;

export const listExpensesResponseSchema = z.object({
  data: z.array(expenseDtoSchema),
  total: z.string(),
});

export type ListExpensesResponse = z.infer<typeof listExpensesResponseSchema>;
