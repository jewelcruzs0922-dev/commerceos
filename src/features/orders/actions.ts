"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  cancelOrderSchema,
  createOrderSchema,
  fulfillOrderSchema,
  refundOrderSchema,
} from "@/features/orders/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage orders.",
  };
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseAddress(formData: FormData): Record<string, string> {
  const fields = [
    "name",
    "line1",
    "line2",
    "city",
    "region",
    "postal_code",
    "country",
  ] as const;
  const address: Record<string, string> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === "string" && value.trim()) {
      address[field] = value.trim();
    }
  }
  return address;
}

export async function createOrder(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "orders:manage")) {
    return forbidden();
  }

  const customerId = formData.get("customerId");
  const parsed = createOrderSchema.safeParse({
    customerId:
      typeof customerId === "string" && customerId.trim()
        ? customerId
        : null,
    email: formData.get("email"),
    items: parseJsonArray(formData.get("itemsJson")),
    discountCode: formData.get("discountCode") ?? "",
    shipping: formData.get("shipping") ?? "",
    tax: formData.get("tax") ?? "",
    markPaid: formData.get("markPaid"),
    address: parseAddress(formData),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the order details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_store_id: context.membership.storeId,
    p_customer_id: parsed.data.customerId,
    p_email: parsed.data.email,
    p_items: parsed.data.items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    p_discount_code: parsed.data.discountCode || null,
    p_shipping_cents: parsed.data.shipping,
    p_tax_cents: parsed.data.tax,
    p_mark_paid: parsed.data.markPaid,
    p_shipping_address: parsed.data.address,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return toActionError(error, "Could not create the order.");
  }

  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  redirect(`/orders/${orderId}`);
}

export async function fulfillOrder(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "orders:fulfill")) {
    return {
      status: "error",
      message: "You do not have permission to fulfill orders.",
    };
  }

  const parsed = fulfillOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    items: parseJsonArray(formData.get("itemsJson")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose at least one item and a valid quantity.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("fulfill_order", {
    p_order_id: parsed.data.orderId,
    p_items: parsed.data.items.map((item) => ({
      order_item_id: item.orderItemId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    return toActionError(error, "Could not fulfill the order.");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { status: "success", message: "Fulfillment recorded." };
}

export async function cancelOrder(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "orders:manage")) {
    return forbidden();
  }

  const parsed = cancelOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    restock: formData.get("restock"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid cancellation request." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: parsed.data.orderId,
    p_restock: parsed.data.restock,
  });

  if (error) {
    return toActionError(error, "Could not cancel the order.");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Order cancelled and reserved stock released.",
  };
}

export async function refundOrder(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "orders:manage")) {
    return forbidden();
  }

  const parsed = refundOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    idempotencyKey: formData.get("idempotencyKey"),
    amount: formData.get("amount"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the refund details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_refund_once", {
    p_order_id: parsed.data.orderId,
    p_amount_cents: parsed.data.amount,
    p_reason: parsed.data.reason ?? "",
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    return toActionError(error, "Could not record the refund.");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/dashboard");

  return { status: "success", message: "Refund recorded." };
}
