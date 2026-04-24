import { ZodError } from "zod";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/http/errors";
import { jsonError, jsonFromUnknown, jsonNoContent, jsonOk } from "@/lib/http/responses";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { deleteExpense, updateExpense } from "@/lib/services/expenses";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError(ApiError.badRequest("Invalid JSON body"));
    }
    const input = createExpenseSchema.parse(raw);
    const updated = await updateExpense(id, input);
    return jsonOk(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(ApiError.validation(err.flatten()));
    }
    return jsonFromUnknown(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteExpense(id);
    return jsonNoContent();
  } catch (err) {
    return jsonFromUnknown(err);
  }
}
