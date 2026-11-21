"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, key } = requireSupabasePublicConfig();
  return createBrowserClient<Database>(url, key);
}
