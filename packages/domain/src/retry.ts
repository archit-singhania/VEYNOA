export class AIRequestError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public retryAfterMs = 0,
    public cancelled = false,
    public requestId?: string,
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Number.isFinite(ms) ? Math.max(0, Math.min(900_000, ms)) : 0;
}
export function retryPlan(
  error: unknown,
  attempts: number,
  now: number,
  random = 0.5,
) {
  if (error instanceof AIRequestError && error.cancelled)
    return { state: "pending", attempts, nextAt: now + 2000 };
  const count = attempts + 1;
  const permanent = error instanceof AIRequestError && !error.retryable;
  return {
    state: permanent || count >= 5 ? "failed" : "pending",
    attempts: count,
    nextAt:
      now +
      Math.max(
        error instanceof AIRequestError ? error.retryAfterMs : 0,
        Math.min(300_000, 2000 * 2 ** count) * (0.8 + random * 0.4),
      ),
  };
}
