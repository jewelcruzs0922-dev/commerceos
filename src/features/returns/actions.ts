"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  createReturnSchema,
  decideReturnSchema,
  refundReturnSchema,
} from "@/features/returns/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage returns.",
  };
}

function parseItems(value: unknown) {
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

export async function requestReturn(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "returns:manage")) {
    return forbidden();
  }

  const parsed = createReturnSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason") ?? "",
    items: parseItems(formData.get("itemsJson")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose at least one item and a valid quantity.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: returnId, error } = await supabase.rpc("create_return", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason ?? "",
    p_items: parsed.data.items.map((item) => ({
      order_item_id: item.orderItemId,
      quantity: item.quantity,
      restock: item.restock,
    })),
  });

  if (error) {
    return toActionError(error, "Could not create the return.");
  }

  revalidatePath("/returns");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  redirect(`/returns/${returnId}`);
}

export async function decideReturn(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "returns:manage")) {
    return forbidden();
  }

  const parsed = decideReturnSchema.safeParse({
    returnId: formData.get("returnId"),
    approve: formData.get("approve"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid return decision." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_return", {
    p_return_id: parsed.data.returnId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note ?? "",
  });

  if (error) {
    return toActionError(error, "Could not record the decision.");
  }

  revalidatePath("/returns");
  revalidatePath(`/returns/${parsed.data.returnId}`);

  return {
    status: "success",
    message: parsed.data.approve ? "Return approved." : "Return rejected.",
  };
}

export async function refundReturn(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "returns:manage")) {
    return forbidden();
  }

  const parsed = refundReturnSchema.safeParse({
    returnId: formData.get("returnId"),
    restock: formData.get("restock"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid refund request." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("refund_return", {
    p_return_id: parsed.data.returnId,
    p_restock: parsed.data.restock,
  });

  if (error) {
    return toActionError(error, "Could not refund the return.");
  }

  revalidatePath("/returns");
  revalidatePath(`/returns/${parsed.data.returnId}`);
  revalidatePath("/orders");
  revalidatePath("/inventory");

  return {
    status: "success",
    message: parsed.data.restock
      ? "Return refunded and stock restored."
      : "Return refunded.",
  };
}
