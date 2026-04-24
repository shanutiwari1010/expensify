import type {
  CreateExpenseInput,
  ExpenseDto,
  ListExpensesQuery,
  ListExpensesResponse,
} from "@/lib/schemas/expense";

// Client-side wrapper around the `/api/expenses` endpoints.
//
// Two things worth noting:
//  1. POST accepts an `idempotencyKey` and re-uses it on retries, so a
//     double-clicked submit or a flaky-network retry never creates duplicates.
//  2. We retry transient failures (network errors, 5xx) with exponential
//     backoff. 4xx errors are surfaced immediately — they're the user's fault,
//     not the network's.

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export class FetchError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | undefined;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | undefined> {
  try {
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  { retries = 2, baseDelayMs = 300 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return (await res.json()) as T;

      const body = await parseJsonSafe<ApiErrorBody>(res);
      if (res.status >= 400 && res.status < 500) {
        throw new FetchError(res.status, body?.error?.message ?? res.statusText, body);
      }
      lastErr = new FetchError(res.status, body?.error?.message ?? res.statusText, body);
    } catch (err) {
      lastErr = err;
      // Non-retryable user error — bubble immediately.
      if (err instanceof FetchError && err.status >= 400 && err.status < 500) {
        throw err;
      }
    }

    if (attempt < retries) {
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
      await sleep(delay);
    }
  }
  throw lastErr;
}

type FetchExpensesQuery = {
  category?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
};

export async function fetchExpenses(
  query: FetchExpensesQuery = { sort: "date_desc" },
  signal?: AbortSignal
): Promise<ListExpensesResponse> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.sort) params.set("sort", query.sort);
  const url = `/api/expenses${params.toString() ? `?${params.toString()}` : ""}`;
  return requestWithRetry<ListExpensesResponse>(url, { method: "GET", signal });
}

export async function createExpenseRequest(
  input: CreateExpenseInput,
  idempotencyKey: string
): Promise<ExpenseDto> {
  return requestWithRetry<ExpenseDto>("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}

// Categories API
export type CategoryDto = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
};

export async function fetchCategories(
  signal?: AbortSignal
): Promise<{ data: CategoryDto[] }> {
  return requestWithRetry<{ data: CategoryDto[] }>("/api/categories", {
    method: "GET",
    signal,
  });
}

export async function createCategoryRequest(input: {
  name: string;
  color: string;
  icon?: string;
}): Promise<CategoryDto> {
  return requestWithRetry<CategoryDto>("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteCategoryRequest(id: string): Promise<void> {
  await requestWithRetry<{ success: boolean }>(`/api/categories/${id}`, {
    method: "DELETE",
  });
}
