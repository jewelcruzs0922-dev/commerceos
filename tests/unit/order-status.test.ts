import { describe, expect, it } from "vitest";
import {
  canCancelOrder,
  canFulfillOrder,
  canTransitionFulfillment,
  canTransitionOrder,
  canTransitionPayment,
} from "@/features/orders/lib/status";

describe("order status machine", () => {
  it("allows pending and processing orders to progress", () => {
    expect(canTransitionOrder("pending", "processing")).toBe(true);
    expect(canTransitionOrder("pending", "cancelled")).toBe(true);
    expect(canTransitionOrder("processing", "fulfilled")).toBe(true);
    expect(canTransitionOrder("processing", "cancelled")).toBe(true);
  });

  it("rejects reopening or cancelling a fulfilled order", () => {
    expect(canTransitionOrder("fulfilled", "cancelled")).toBe(false);
    expect(canTransitionOrder("cancelled", "processing")).toBe(false);
    expect(canTransitionOrder("pending", "pending")).toBe(false);
  });

  it("limits fulfillment transitions", () => {
    expect(canTransitionFulfillment("unfulfilled", "partially_fulfilled")).toBe(
      true
    );
    expect(canTransitionFulfillment("partially_fulfilled", "fulfilled")).toBe(
      true
    );
    expect(canTransitionFulfillment("fulfilled", "partially_fulfilled")).toBe(
      false
    );
    expect(canTransitionFulfillment("cancelled", "fulfilled")).toBe(false);
  });

  it("limits payment transitions", () => {
    expect(canTransitionPayment("pending", "paid")).toBe(true);
    expect(canTransitionPayment("paid", "partially_refunded")).toBe(true);
    expect(canTransitionPayment("paid", "voided")).toBe(true);
    expect(canTransitionPayment("refunded", "paid")).toBe(false);
    expect(canTransitionPayment("voided", "paid")).toBe(false);
  });

  it("exposes UI guards for fulfillment and cancellation", () => {
    expect(
      canFulfillOrder({
        status: "processing",
        fulfillmentStatus: "partially_fulfilled",
        remainingQuantity: 2,
      })
    ).toBe(true);
    expect(
      canFulfillOrder({
        status: "processing",
        fulfillmentStatus: "partially_fulfilled",
        remainingQuantity: 0,
      })
    ).toBe(false);
    expect(
      canCancelOrder({ status: "processing", fulfilledQuantity: 0 })
    ).toBe(true);
    expect(
      canCancelOrder({ status: "processing", fulfilledQuantity: 1 })
    ).toBe(false);
    expect(canCancelOrder({ status: "cancelled", fulfilledQuantity: 0 })).toBe(
      false
    );
  });
});
