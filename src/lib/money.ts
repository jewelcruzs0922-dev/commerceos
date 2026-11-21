export function dollarsToCents(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToDollars(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}
