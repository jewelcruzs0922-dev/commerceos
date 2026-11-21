import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  NotificationItem,
  NotificationSummary,
} from "@/features/notifications/types";

export type { NotificationItem, NotificationSummary };

export async function getNotificationSummary(
  storeId: string
): Promise<NotificationSummary> {
  const supabase = await createClient();

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, href, read_at, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .is("read_at", null),
  ]);

  if (error || countError) {
    return { items: [], unreadCount: 0 };
  }

  return {
    items: (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.href,
      readAt: item.read_at,
      createdAt: item.created_at,
    })),
    unreadCount: count ?? 0,
  };
}
