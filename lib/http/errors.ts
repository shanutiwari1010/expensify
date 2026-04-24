export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

// A small, typed error we can throw from anywhere in the service layer and
// translate into an HTTP response at the route boundary (`lib/http/responses`).
// Keeps route handlers thin and lets services remain transport-agnostic.
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError("BAD_REQUEST", 400, message, details);
  }

  static validation(details: unknown) {
    return new ApiError("VALIDATION_FAILED", 400, "Validation failed", details);
  }

  static notFound(message: string) {
    return new ApiError("NOT_FOUND", 404, message);
  }

  static conflict(message: string) {
    return new ApiError("CONFLICT", 409, message);
  }

  static internal(cause?: unknown) {
    const details =
      process.env.NODE_ENV === "development" && cause
        ? { cause: String(cause) }
        : undefined;
    return new ApiError("INTERNAL", 500, "Internal server error", details);
  }
}
