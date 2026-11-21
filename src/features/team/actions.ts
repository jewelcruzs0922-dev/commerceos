"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext, requireMemberContext } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import {
  createInvitationToken,
  hashInvitationToken,
} from "@/lib/invitations";
import { can } from "@/lib/permissions";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type InviteActionState = FormActionState & { inviteUrl?: string };

const roleEnum = z.enum(["owner", "admin", "manager", "staff"]);

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Enter an email address.")
    .max(254, "Email is too long.")
    .email("Enter a valid email address."),
  role: z.enum(["admin", "manager", "staff"]),
});

const changeRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: roleEnum,
});

const memberIdSchema = z.object({ memberId: z.string().uuid() });
const invitationIdSchema = z.object({ invitationId: z.string().uuid() });

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage the team.",
  };
}

export async function inviteMember(
  _previous: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "team:manage")) {
    return forbidden();
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the invitation.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const storeId = context.membership.storeId;
  const token = createInvitationToken();

  await supabase
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("status", "pending")
    .eq("email", parsed.data.email);

  const { error } = await supabase.from("invitations").insert({
    store_id: storeId,
    email: parsed.data.email,
    role: parsed.data.role,
    token_hash: hashInvitationToken(token),
    invited_by: context.userId,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });

  if (error) {
    return toActionError(error, "Could not create the invitation.");
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "invitation.created",
    entityType: "invitation",
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/team");

  return {
    status: "success",
    message:
      "Invitation created. No email is sent; copy the link and share it directly.",
    inviteUrl: `${getSiteUrl()}/invite/${token}`,
  };
}

export async function revokeInvitation(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "team:manage")) {
    return forbidden();
  }

  const parsed = invitationIdSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid invitation." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.invitationId)
    .eq("status", "pending");

  if (error) {
    return toActionError(error, "Could not revoke the invitation.");
  }

  revalidatePath("/team");
  return { status: "success", message: "Invitation revoked." };
}

export async function changeMemberRole(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "team:manage")) {
    return forbidden();
  }

  const parsed = changeRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid role change." };
  }

  const supabase = await createClient();
  const { data: target, error: readError } = await supabase
    .from("store_members")
    .select("id, user_id, role")
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.memberId)
    .maybeSingle();

  if (readError || !target) {
    return { status: "error", message: "Member not found." };
  }

  if (target.user_id === context.userId) {
    return {
      status: "error",
      message: "You cannot change your own role.",
    };
  }

  const actorIsOwner = context.membership.role === "owner";
  if (
    !actorIsOwner &&
    (target.role === "owner" || parsed.data.role === "owner")
  ) {
    return {
      status: "error",
      message: "Only an owner can change ownership.",
    };
  }

  const { error } = await supabase
    .from("store_members")
    .update({ role: parsed.data.role })
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.memberId);

  if (error) {
    return toActionError(error, "Could not change the role.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "member.role_changed",
    entityType: "membership",
    entityId: parsed.data.memberId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/team");
  return { status: "success", message: "Role updated." };
}

export async function removeMember(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "team:manage")) {
    return forbidden();
  }

  const parsed = memberIdSchema.safeParse({
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid member." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("store_members")
    .select("id, user_id")
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.memberId)
    .maybeSingle();

  if (!target) {
    return { status: "error", message: "Member not found." };
  }

  if (target.user_id === context.userId) {
    return {
      status: "error",
      message: "You cannot remove your own membership.",
    };
  }

  const { error } = await supabase
    .from("store_members")
    .delete()
    .eq("store_id", context.membership.storeId)
    .eq("id", parsed.data.memberId);

  if (error) {
    return toActionError(error, "Could not remove the member.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "member.removed",
    entityType: "membership",
    entityId: parsed.data.memberId,
  });

  revalidatePath("/team");
  return { status: "success", message: "Member removed." };
}

export async function acceptInvitation(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const token = formData.get("token");

  if (typeof token !== "string" || token.length < 20) {
    return { status: "error", message: "Invalid invitation." };
  }

  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(token),
  });

  if (error) {
    return toActionError(
      error,
      "Could not accept the invitation. It may be expired or for another email."
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

