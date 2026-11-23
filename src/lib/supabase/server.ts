import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export async function createClient() {
  const { url, key } = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    global: {
      // Reusing a socket the Supabase gateway closed after idle can stall every
      // parallel read until the OS timeout.
      headers: { connection: "close" },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes the session.
        }
      },
    },
  });
}
