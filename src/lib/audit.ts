import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  input: {
    storeId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Json;
  }
): Promise<void> {
  await supabase.from("activity_logs").insert({
    store_id: input.storeId,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
