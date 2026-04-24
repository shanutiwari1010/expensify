import { ZodError } from "zod";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/http/errors";
import {
  jsonCreated,
  jsonError,
  jsonFromUnknown,
  jsonOk,
} from "@/lib/http/responses";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
} from "@/lib/schemas/expense";
import { createExpense, listExpenses } from "@/lib/services/expenses";

// Route handlers stay thin on purpose:
//   parse/validate -> call service -> map outcome to HTTP.
// All business logic lives in `lib/services/expenses.ts`.

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listExpensesQuerySchema.parse(raw);
    const result = await listExpenses(query);
    return jsonOk(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(ApiError.validation(err.flatten()));
    }
    return jsonFromUnknown(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError(ApiError.badRequest("Invalid JSON body"));
    }

    const input = createExpenseSchema.parse(raw);
    const created = await createExpense(input, idempotencyKey);
    return jsonCreated(created);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(ApiError.validation(err.flatten()));
    }
    return jsonFromUnknown(err);
  }
}
