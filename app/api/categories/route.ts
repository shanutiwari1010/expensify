import { z } from "zod";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/http/errors";
import {
  jsonCreated,
  jsonError,
  jsonFromUnknown,
  jsonOk,
} from "@/lib/http/responses";
import { createCategory, listCategories } from "@/lib/services/categories";

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(64, "Name is too long"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g., #FF5733)"),
  icon: z.string().max(32).optional(),
});

export async function GET() {
  try {
    const categories = await listCategories();
    return jsonOk({ data: categories });
  } catch (err) {
    return jsonFromUnknown(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError(ApiError.badRequest("Invalid JSON body"));
    }

    const result = createCategorySchema.safeParse(raw);
    if (!result.success) {
      return jsonError(ApiError.validation(result.error.flatten()));
    }

    const category = await createCategory(result.data);
    return jsonCreated(category);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return jsonError(ApiError.conflict(err.message));
    }
    return jsonFromUnknown(err);
  }
}
