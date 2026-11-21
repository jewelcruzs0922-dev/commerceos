import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isAuthPath, isProtectedPath } from "@/config/routes";
import {
  createContentSecurityPolicy,
  createNonce,
} from "@/lib/security/csp";
import {
  isStagingAuthorized,
  isStagingProtected,
} from "@/lib/security/staging-auth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function withCsp(
  response: NextResponse,
  contentSecurityPolicy: string
): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function requestHeaders(
  request: NextRequest,
  nonce: string,
  contentSecurityPolicy: string
): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  return headers;
}

function copySession(
  target: NextResponse,
  source: NextResponse
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  }

  return target;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();
  const contentSecurityPolicy = createContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development"
  );
  const supabaseConfig = getSupabasePublicConfig();

  const stagingUser = process.env.STAGING_BASIC_USER;
  const stagingPassword = process.env.STAGING_BASIC_PASSWORD;

  if (
    isStagingProtected(stagingUser, stagingPassword) &&
    !isStagingAuthorized(
      request.headers.get("authorization"),
      stagingUser ?? "",
      stagingPassword ?? ""
    )
  ) {
    return withCsp(
      new NextResponse("Staging authentication required.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="CommerceOS staging", charset="UTF-8"',
          "Cache-Control": "no-store",
        },
      }),
      contentSecurityPolicy
    );
  }

  if (!supabaseConfig) {
    if (process.env.NODE_ENV === "production" && isProtectedPath(pathname)) {
      return withCsp(
        NextResponse.redirect(new URL("/setup", request.url)),
        contentSecurityPolicy
      );
    }
    return withCsp(
      NextResponse.next({
        request: {
          headers: requestHeaders(request, nonce, contentSecurityPolicy),
        },
      }),
      contentSecurityPolicy
    );
  }

  let response = withCsp(
    NextResponse.next({
      request: {
        headers: requestHeaders(request, nonce, contentSecurityPolicy),
      },
    }),
    contentSecurityPolicy
  );

  const supabase = createServerClient<Database>(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = withCsp(
          NextResponse.next({
            request: {
              headers: requestHeaders(request, nonce, contentSecurityPolicy),
            },
          }),
          contentSecurityPolicy
        );
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  let signedIn = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && Boolean(data?.claims?.sub);
  } catch {
    signedIn = false;
  }

  if (!signedIn && isProtectedPath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return withCsp(
      copySession(NextResponse.redirect(redirectUrl), response),
      contentSecurityPolicy
    );
  }

  if (signedIn && isAuthPath(pathname)) {
    return withCsp(
      copySession(NextResponse.redirect(new URL("/dashboard", request.url)), response),
      contentSecurityPolicy
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
