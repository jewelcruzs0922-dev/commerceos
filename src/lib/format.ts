const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

export function formatMoney(cents: number | null | undefined): string {
  return currencyFormatter.format((cents ?? 0) / 100);
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return dateTimeFormatter.format(new Date(value));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
