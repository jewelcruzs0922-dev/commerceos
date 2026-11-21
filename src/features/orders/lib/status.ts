import type { Database } from "@/types/database";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type FulfillmentStatus =
  Database["public"]["Enums"]["fulfillment_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["processing", "fulfilled", "cancelled"],
  processing: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export const FULFILLMENT_TRANSITIONS: Record<
  FulfillmentStatus,
  readonly FulfillmentStatus[]
> = {
  unfulfilled: ["partially_fulfilled", "fulfilled", "cancelled"],
  partially_fulfilled: ["partially_fulfilled", "fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export const PAYMENT_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  pending: ["authorized", "paid", "voided"],
  authorized: ["paid", "voided"],
  paid: ["partially_refunded", "refunded", "voided"],
  partially_refunded: ["partially_refunded", "refunded"],
  refunded: [],
  voided: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function isOrderOpen(status: OrderStatus): boolean {
  return status === "pending" || status === "processing";
}

export function canFulfillOrder(input: {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  remainingQuantity: number;
}): boolean {
  return (
    isOrderOpen(input.status) &&
    input.fulfillmentStatus !== "fulfilled" &&
    input.fulfillmentStatus !== "cancelled" &&
    input.remainingQuantity > 0
  );
}

export function canCancelOrder(input: {
  status: OrderStatus;
  fulfilledQuantity: number;
}): boolean {
  return isOrderOpen(input.status) && input.fulfilledQuantity === 0;
}
