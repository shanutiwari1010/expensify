import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/http/errors";
import { jsonError, jsonFromUnknown, jsonOk } from "@/lib/http/responses";
import { deleteCategory } from "@/lib/services/categories";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deleteCategory(id);
    return jsonOk({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("not found")) {
        return jsonError(ApiError.notFound(err.message));
      }
      if (
        err.message.includes("Cannot delete") ||
        err.message.includes("expense(s) use it")
      ) {
        return jsonError(ApiError.badRequest(err.message));
      }
    }
    return jsonFromUnknown(err);
  }
}
