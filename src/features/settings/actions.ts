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
import {
  notificationSettingsSchema,
  passwordChangeSchema,
  profileSettingsSchema,
  storeSettingsSchema,
} from "@/features/settings/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

export async function updateStoreSettings(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "settings:manage")) {
    return {
      status: "error",
      message: "You do not have permission to change store settings.",
    };
  }

  const parsed = storeSettingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    logoUrl: formData.get("logoUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the store settings.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      logo_url: parsed.data.logoUrl || null,
    })
    .eq("id", context.membership.storeId);

  if (error) {
    return toActionError(error, "Could not update the store.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "settings.store_updated",
    entityType: "store",
    entityId: context.membership.storeId,
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { status: "success", message: "Store settings updated." };
}

export async function updateProfileSettings(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();
  const parsed = profileSettingsSchema.safeParse({
    fullName: formData.get("fullName"),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check your profile.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", context.userId);

  if (error) {
    return toActionError(error, "Could not update your profile.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/team");
  return { status: "success", message: "Profile updated." };
}

export async function updateNotificationSettings(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();
  const parsed = notificationSettingsSchema.safeParse({
    lowStock: formData.get("lowStock"),
    newReturns: formData.get("newReturns"),
    weeklySummary: formData.get("weeklySummary"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid notification settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notification_preferences: {
        low_stock: parsed.data.lowStock,
        new_returns: parsed.data.newReturns,
        weekly_summary: parsed.data.weeklySummary,
      },
    })
    .eq("id", context.userId);

  if (error) {
    return toActionError(error, "Could not update notifications.");
  }

  revalidatePath("/settings");
  return { status: "success", message: "Notification preferences saved." };
}

export async function changePassword(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  await requireMemberContext();
  const parsed = passwordChangeSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the new password.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Could not update the password. Try again.",
    };
  }

  return { status: "success", message: "Password updated." };
}

export async function resetDemoData(): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  if (process.env.DEMO_MODE !== "true") {
    return {
      status: "error",
      message: "Demo reset is disabled for this deployment.",
    };
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "settings:manage")) {
    return {
      status: "error",
      message: "You do not have permission to reset the demo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_demo_store");

  if (error) {
    return toActionError(error, "Could not reset the demo data.");
  }

  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Demo data regenerated. Viewer sessions were cleared.",
  };
}