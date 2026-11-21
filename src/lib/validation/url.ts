export function isSafeImageUrl(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && /^https:\/\/\S+$/i.test(value);
}
