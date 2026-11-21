"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { customerUpdateSchema } from "@/features/customers/schemas";

export async function updateCustomer(
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

  if (!can(context.membership.role, "customers:manage")) {
    return {
      status: "error",
      message: "You do not have permission to edit customers.",
    };
  }

  const parsed = customerUpdateSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
    tags: formData.get("tags") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name ?? "",
      phone: parsed.data.phone || null,
      notes: parsed.data.notes ?? "",
      tags: parsed.data.tags,
    })
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.customerId);

  if (error) {
    return toActionError(error, "Could not update the customer.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "customer.updated",
    entityType: "customer",
    entityId: parsed.data.customerId,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${parsed.data.customerId}`);

  return { status: "success", message: "Customer updated." };
}
