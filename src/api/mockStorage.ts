export type ApiErrorCode = "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(message: string, options: { code?: ApiErrorCode; status?: number } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code ?? "UNKNOWN";
    this.status = options.status ?? 500;
  }
}

export type MockApiOptions = {
  minDelayMs?: number;
  maxDelayMs?: number;
  failureRate?: number; // 0..1
};

const DEFAULT_OPTIONS: Required<MockApiOptions> = {
  minDelayMs: 120,
  maxDelayMs: 450,
  failureRate: 0,
};

function resolveOptions(options?: MockApiOptions): Required<MockApiOptions> {
  return { ...DEFAULT_OPTIONS, ...(options ?? {}) };
}

export async function mockNetworkDelay(options?: MockApiOptions) {
  const { minDelayMs, maxDelayMs } = resolveOptions(options);
  const ms =
    minDelayMs >= maxDelayMs
      ? minDelayMs
      : Math.floor(minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
  await new Promise((r) => setTimeout(r, ms));
}

export function maybeThrowRandomFailure(options?: MockApiOptions) {
  const { failureRate } = resolveOptions(options);
  if (failureRate <= 0) return;
  if (Math.random() < failureRate) {
    throw new ApiError("Simulated network failure", { status: 503, code: "UNKNOWN" });
  }
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

