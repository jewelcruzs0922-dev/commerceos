export const SUPABASE_REQUEST_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;

  return fetch(input, { ...init, signal });
}
