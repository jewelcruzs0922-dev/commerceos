import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { authCookieOptions } from "@/lib/supabase/cookie-options";
import { fetchWithTimeout } from "@/lib/supabase/fetch";
import { safeInternalPath } from "@/lib/validation/redirect";

const emailOtpType = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const config = getSupabasePublicConfig();

  if (!config) {
    return NextResponse.redirect(new URL("/setup", origin));
  }

  const tokenHash = searchParams.get("token_hash");
  const type = emailOtpType.safeParse(searchParams.get("type"));
  const next = safeInternalPath(searchParams.get("next"), "/dashboard");

  if (!tokenHash || !type.success) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const redirectResponse = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient<Database>(config.url, config.key, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          redirectResponse.cookies.set(name, value, {
            ...options,
            ...authCookieOptions(),
          });
        }
        for (const [key, value] of Object.entries(headers)) {
          redirectResponse.headers.set(key, value);
        }
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type.data,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  return redirectResponse;
}
