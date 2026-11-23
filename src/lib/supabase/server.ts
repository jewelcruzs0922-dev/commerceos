import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { authCookieOptions } from "@/lib/supabase/cookie-options";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/supabase/fetch";

export async function createClient() {
  const { url, key } = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    global: {
      // Reusing a socket the Supabase gateway closed after idle can stall every
      // parallel read until the OS timeout.
      headers: { connection: "close" },
      fetch: fetchWithTimeout,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              ...authCookieOptions(),
            });
          }
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes the session.
        }
      },
    },
  });
}
