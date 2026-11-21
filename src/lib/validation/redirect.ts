const FALLBACK = "/dashboard";

export function safeInternalPath(value: unknown, fallback = FALLBACK): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://commerceos.invalid");
    if (url.origin !== "https://commerceos.invalid") {
      return fallback;
    }
    if (url.protocol !== "https:") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
