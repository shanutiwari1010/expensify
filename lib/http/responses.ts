import { ApiError } from "./errors";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export function jsonOk<T extends Json>(data: T, init?: ResponseInit) {
  return Response.json(data, { status: 200, ...init });
}

export function jsonCreated<T extends Json>(data: T, init?: ResponseInit) {
  return Response.json(data, { status: 201, ...init });
}

export function jsonNoContent(init?: ResponseInit) {
  return new Response(null, { status: 204, ...init });
}

export function jsonError(err: ApiError) {
  return Response.json(
    { error: { code: err.code, message: err.message, details: err.details } },
    { status: err.status }
  );
}

// Last-resort catch that logs non-ApiError failures and hides internals.
export function jsonFromUnknown(err: unknown) {
  if (err instanceof ApiError) return jsonError(err);
  console.error("[api] unhandled", err);
  return jsonError(ApiError.internal(err));
}
