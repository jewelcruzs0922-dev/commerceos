import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  subDays,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type OrderMetricRow = {
  id: string;
  total_cents: number;
  status: string;
  placed_at: string;
  customer_id: string | null;
};

export type RefundMetricRow = {
  amount_cents: number;
  status: string;
  created_at: string;
};

export type AnalyticsTotals = {
  grossCents: number;
  refundsCents: number;
  netCents: number;
  orders: number;
  customers: number;
  averageOrderCents: number;
};

export type DailyPoint = {
  date: string;
  label: string;
  grossCents: number;
  refundsCents: number;
  netCents: number;
  orders: number;
};

export type AnalyticsRange = {
  from: string;
  to: string;
  days: string[];
  label: string;
  startUtc: string;
  endUtc: string;
  priorFrom: string;
  priorTo: string;
  priorStartUtc: string;
  priorEndUtc: string;
};

export function computeTotals(
  orders: OrderMetricRow[],
  refunds: RefundMetricRow[]
): AnalyticsTotals {
  const active = orders.filter((order) => order.status !== "cancelled");
  const grossCents = active.reduce(
    (sum, order) => sum + order.total_cents,
    0
  );
  const refundsCents = refunds
    .filter((refund) => refund.status === "completed")
    .reduce((sum, refund) => sum + refund.amount_cents, 0);
  const netCents = grossCents - refundsCents;
  const customers = new Set(
    active
      .map((order) => order.customer_id)
      .filter((id): id is string => Boolean(id))
  ).size;

  return {
    grossCents,
    refundsCents,
    netCents,
    orders: active.length,
    customers,
    averageOrderCents:
      active.length > 0 ? Math.round(netCents / active.length) : 0,
  };
}

export function percentDelta(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function groupDaily(
  orders: OrderMetricRow[],
  refunds: RefundMetricRow[],
  days: string[],
  timeZone: string
): DailyPoint[] {
  const buckets = new Map<
    string,
    { grossCents: number; refundsCents: number; orders: number }
  >();

  for (const day of days) {
    buckets.set(day, { grossCents: 0, refundsCents: 0, orders: 0 });
  }

  for (const order of orders) {
    if (order.status === "cancelled") {
      continue;
    }
    const key = formatInTimeZone(
      new Date(order.placed_at),
      timeZone,
      "yyyy-MM-dd"
    );
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.grossCents += order.total_cents;
      bucket.orders += 1;
    }
  }

  for (const refund of refunds) {
    if (refund.status !== "completed") {
      continue;
    }
    const key = formatInTimeZone(
      new Date(refund.created_at),
      timeZone,
      "yyyy-MM-dd"
    );
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.refundsCents += refund.amount_cents;
    }
  }

  return days.map((day) => {
    const bucket = buckets.get(day) ?? {
      grossCents: 0,
      refundsCents: 0,
      orders: 0,
    };
    return {
      date: day,
      label: format(parseISO(day), "MMM d"),
      grossCents: bucket.grossCents,
      refundsCents: bucket.refundsCents,
      netCents: bucket.grossCents - bucket.refundsCents,
      orders: bucket.orders,
    };
  });
}

function isDateOnly(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(parseISO(value))
  );
}

function toUtc(date: string, timeZone: string): string {
  return fromZonedTime(`${date}T00:00:00`, timeZone).toISOString();
}

export function resolveRange(
  input: { from?: string; to?: string },
  timeZone: string,
  now = new Date()
): AnalyticsRange {
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");

  let to = isDateOnly(input.to) ? input.to : today;
  let from = isDateOnly(input.from)
    ? input.from
    : format(subDays(parseISO(to), 29), "yyyy-MM-dd");

  if (parseISO(from) > parseISO(to)) {
    [from, to] = [to, from];
  }

  const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  if (span > 366) {
    from = format(subDays(parseISO(to), 365), "yyyy-MM-dd");
  }

  const days = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  }).map((date) => format(date, "yyyy-MM-dd"));

  const dayCount = days.length;
  const priorTo = format(subDays(parseISO(from), 1), "yyyy-MM-dd");
  const priorFrom = format(subDays(parseISO(priorTo), dayCount - 1), "yyyy-MM-dd");

  return {
    from,
    to,
    days,
    label:
      from === to
        ? format(parseISO(from), "MMM d, yyyy")
        : `${format(parseISO(from), "MMM d, yyyy")} – ${format(
            parseISO(to),
            "MMM d, yyyy"
          )}`,
    startUtc: toUtc(from, timeZone),
    endUtc: toUtc(
      format(addDays(parseISO(to), 1), "yyyy-MM-dd"),
      timeZone
    ),
    priorFrom,
    priorTo,
    priorStartUtc: toUtc(priorFrom, timeZone),
    priorEndUtc: toUtc(from, timeZone),
  };
}
