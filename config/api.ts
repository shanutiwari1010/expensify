/** Defaults for the API client’s transient retry loop (4xx is never retried). */
export const API_REQUEST_RETRY_DEFAULTS = {
  retries: 2,
  baseDelayMs: 300,
} as const;

export type ApiRequestRetryInput = Partial<{
  retries: number;
  baseDelayMs: number;
}>;
