import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MemberRole = Database["public"]["Enums"]["member_role"];
type MemberRow = Database["public"]["Tables"]["store_members"]["Row"];
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  status: Database["public"]["Enums"]["member_status"];
  joinedAt: string;
};

export type TeamInvitation = InvitationRow & {
  displayStatus:
    | "pending"
    | "accepted"
    | "revoked"
    | "expired";
};

export type TeamActivity = Pick<
  ActivityRow,
  "id" | "action" | "entity_type" | "created_at"
> & { actorName: string };

export async function getTeam(storeId: string): Promise<{
  members: TeamMember[];
  invitations: TeamInvitation[];
  activity: TeamActivity[];
}> {
  const supabase = await createClient();

  const [{ data: memberRows }, { data: invitations }, { data: activity }] =
    await Promise.all([
      supabase
        .from("store_members")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true }),
      supabase
        .from("invitations")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("activity_logs")
        .select("id, action, entity_type, created_at, actor_id")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const userIds = [
    ...new Set([
      ...(memberRows ?? []).map((member) => member.user_id),
      ...(activity ?? [])
        .map((entry) => entry.actor_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; full_name: string; email: string }> };

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const now = new Date();

  return {
    members: (memberRows ?? []).map((member) => ({
      id: member.id,
      userId: member.user_id,
      name:
        profileMap.get(member.user_id)?.full_name ||
        profileMap.get(member.user_id)?.email ||
        "Member",
      email: profileMap.get(member.user_id)?.email ?? "",
      role: member.role,
      status: member.status,
      joinedAt: member.created_at,
    })),
    invitations: (invitations ?? []).map((invitation) => ({
      ...invitation,
      displayStatus:
        invitation.status === "pending" &&
        new Date(invitation.expires_at) <= now
          ? "expired"
          : invitation.status,
    })),
    activity: (activity ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      entity_type: entry.entity_type,
      created_at: entry.created_at,
      actorName: entry.actor_id
        ? profileMap.get(entry.actor_id)?.full_name ||
          profileMap.get(entry.actor_id)?.email ||
          "Member"
        : "System",
    })),
  };
}

export function memberRoleLabel(role: MemberRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export type { MemberRow, InvitationRow };
