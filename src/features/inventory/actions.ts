"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { adjustStockSchema } from "@/features/inventory/schemas";

export async function adjustStock(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "The data layer is not configured for this deployment.",
    };
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "inventory:adjust")) {
    return {
      status: "error",
      message: "You do not have permission to adjust inventory.",
    };
  }

  const parsed = adjustStockSchema.safeParse({
    variantId: formData.get("variantId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the adjustment.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: nextOnHand, error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: parsed.data.variantId,
    p_delta: parsed.data.delta,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note ?? "",
  });

  if (error) {
    return toActionError(error, "Could not adjust inventory.");
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.variantId}`);
  revalidatePath("/products");

  return {
    status: "success",
    message: `Inventory updated to ${nextOnHand} on hand.`,
  };
}
