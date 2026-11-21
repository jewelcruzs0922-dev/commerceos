export const PAGE_SIZE = 25;

export function parsePage(value: unknown): number {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parsePageSize(value: unknown): number {
  return typeof value === "string" && value === "50" ? 50 : PAGE_SIZE;
}

export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function sanitizeSearch(value: unknown, max = 80): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .slice(0, max)
    .replace(/[%,()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}