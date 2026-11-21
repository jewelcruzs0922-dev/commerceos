import { describe, expect, it } from "vitest";
import {
  computeTotals,
  groupDaily,
  percentDelta,
  resolveRange,
  type OrderMetricRow,
  type RefundMetricRow,
} from "@/features/analytics/lib";

const orders: OrderMetricRow[] = [
  {
    id: "1",
    total_cents: 10000,
    status: "fulfilled",
    placed_at: "2026-01-01T04:30:00.000Z",
    customer_id: "c1",
  },
  {
    id: "2",
    total_cents: 5000,
    status: "processing",
    placed_at: "2026-01-01T18:00:00.000Z",
    customer_id: "c2",
  },
  {
    id: "3",
    total_cents: 9999,
    status: "cancelled",
    placed_at: "2026-01-02T18:00:00.000Z",
    customer_id: "c3",
  },
];

const refunds: RefundMetricRow[] = [
  {
    amount_cents: 2000,
    status: "completed",
    created_at: "2026-01-01T20:00:00.000Z",
  },
  {
    amount_cents: 1000,
    status: "pending",
    created_at: "2026-01-01T21:00:00.000Z",
  },
];

describe("analytics totals", () => {
  it("excludes cancelled orders and only counts completed refunds", () => {
    const totals = computeTotals(orders, refunds);

    expect(totals.grossCents).toBe(15000);
    expect(totals.refundsCents).toBe(2000);
    expect(totals.netCents).toBe(13000);
    expect(totals.orders).toBe(2);
    expect(totals.customers).toBe(2);
    expect(totals.averageOrderCents).toBe(6500);
  });

  it("handles an empty period", () => {
    expect(computeTotals([], [])).toEqual({
      grossCents: 0,
      refundsCents: 0,
      netCents: 0,
      orders: 0,
      customers: 0,
      averageOrderCents: 0,
    });
  });

  it("computes percent deltas without dividing by zero", () => {
    expect(percentDelta(120, 100)).toBe(20);
    expect(percentDelta(80, 100)).toBe(-20);
    expect(percentDelta(0, 0)).toBe(0);
    expect(percentDelta(10, 0)).toBeNull();
  });
});

describe("daily grouping", () => {
  it("uses store-local day boundaries", () => {
    const days = ["2025-12-31", "2026-01-01", "2026-01-02"];
    const points = groupDaily(orders, refunds, days, "America/New_York");

    const dec31 = points.find((point) => point.date === "2025-12-31");
    const jan1 = points.find((point) => point.date === "2026-01-01");

    expect(dec31?.grossCents).toBe(10000);
    expect(dec31?.orders).toBe(1);
    expect(jan1?.grossCents).toBe(5000);
    expect(jan1?.refundsCents).toBe(2000);
    expect(jan1?.netCents).toBe(3000);
  });

  it("fills missing days with zeroes", () => {
    const points = groupDaily([], [], ["2026-02-01", "2026-02-02"], "UTC");
    expect(points).toHaveLength(2);
    expect(points.every((point) => point.netCents === 0)).toBe(true);
  });
});

describe("date ranges", () => {
  const now = new Date("2026-02-15T12:00:00.000Z");

  it("defaults to 30 days in the store timezone", () => {
    const range = resolveRange({}, "America/New_York", now);
    expect(range.to).toBe("2026-02-15");
    expect(range.from).toBe("2026-01-17");
    expect(range.days).toHaveLength(30);
  });

  it("swaps reversed dates", () => {
    const range = resolveRange(
      { from: "2026-02-10", to: "2026-02-01" },
      "UTC",
      now
    );
    expect(range.from).toBe("2026-02-01");
    expect(range.to).toBe("2026-02-10");
  });

  it("caps very long ranges", () => {
    const range = resolveRange(
      { from: "2020-01-01", to: "2026-02-15" },
      "UTC",
      now
    );
    expect(range.days).toHaveLength(366);
  });

  it("builds prior period boundaries", () => {
    const range = resolveRange(
      { from: "2026-02-01", to: "2026-02-10" },
      "UTC",
      now
    );
    expect(range.priorTo).toBe("2026-01-31");
    expect(range.priorFrom).toBe("2026-01-22");
    expect(range.priorEndUtc).toBe(range.startUtc);
  });
});
