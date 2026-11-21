"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { requireMemberContext } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { dollarsToCents } from "@/lib/money";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  discountFormSchema,
  discountIdSchema,
} from "@/features/discounts/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage discounts.",
  };
}

function toUtc(value: string | undefined, timeZone: string): string | null {
  if (!value) {
    return null;
  }
  const date = fromZonedTime(value, timeZone);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildValues(
  data: z.infer<typeof discountFormSchema>,
  timeZone: string
) {
  return {
    code: data.code,
    description: data.description ?? "",
    type: data.type,
    value:
      data.type === "percentage"
        ? Number(data.value)
        : dollarsToCents(data.value) ?? 0,
    starts_at: toUtc(data.startsAt, timeZone),
    ends_at: toUtc(data.endsAt, timeZone),
    minimum_subtotal_cents: data.minimumSubtotal
      ? dollarsToCents(data.minimumSubtotal) ?? 0
      : 0,
    usage_limit: data.usageLimit ? Number(data.usageLimit) : null,
    is_active: data.isActive,
  };
}

function parseForm(formData: FormData) {
  return discountFormSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    value: formData.get("value"),
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    minimumSubtotal: formData.get("minimumSubtotal") ?? "",
    usageLimit: formData.get("usageLimit") ?? "",
    isActive: formData.get("isActive"),
  });
}

export async function createDiscount(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "discounts:manage")) {
    return forbidden();
  }

  const parsed = parseForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const storeId = context.membership.storeId;
  const { data: created, error } = await supabase
    .from("discounts")
    .insert({
      store_id: storeId,
      ...buildValues(parsed.data, context.membership.storeTimezone),
    })
    .select("id")
    .single();

  if (error || !created) {
    return toActionError(error, "Could not create the discount.");
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "discount.created",
    entityType: "discount",
    entityId: created.id,
    metadata: { code: parsed.data.code },
  });

  revalidatePath("/discounts");
  redirect(`/discounts/${created.id}`);
}

export async function updateDiscount(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "discounts:manage")) {
    return forbidden();
  }

  const id = discountIdSchema.safeParse(formData.get("discountId"));
  const parsed = parseForm(formData);

  if (!id.success) {
    return { status: "error", message: "Invalid discount." };
  }

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const storeId = context.membership.storeId;
  const { error } = await supabase
    .from("discounts")
    .update(buildValues(parsed.data, context.membership.storeTimezone))
    .eq("store_id", storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not update the discount.");
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "discount.updated",
    entityType: "discount",
    entityId: id.data,
    metadata: { code: parsed.data.code },
  });

  revalidatePath("/discounts");
  revalidatePath(`/discounts/${id.data}`);
  redirect(`/discounts/${id.data}`);
}

export async function setDiscountActive(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "discounts:manage")) {
    return forbidden();
  }

  const id = discountIdSchema.safeParse(formData.get("discountId"));
  const active = formData.get("isActive") === "true";

  if (!id.success) {
    return { status: "error", message: "Invalid discount." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("discounts")
    .update({ is_active: active })
    .eq("store_id", context.membership.storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not change the discount state.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: active ? "discount.activated" : "discount.disabled",
    entityType: "discount",
    entityId: id.data,
  });

  revalidatePath("/discounts");
  revalidatePath(`/discounts/${id.data}`);

  return {
    status: "success",
    message: active ? "Discount activated." : "Discount disabled.",
  };
}
