"use server";

import { requireMemberContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type MarkNotificationsResult =
  | { ok: true; count: number }
  | { ok: false; message: string };

export async function markNotificationsRead(): Promise<MarkNotificationsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "The data layer is not configured." };
  }

  const context = await requireMemberContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notifications_read", {
    p_store_id: context.membership.storeId,
  });

  if (error) {
    return { ok: false, message: "Could not mark notifications as read." };
  }

  return { ok: true, count: data ?? 0 };
}
