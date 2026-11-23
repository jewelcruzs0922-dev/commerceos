import { afterEach, describe, expect, it, vi } from "vitest";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

describe("authCookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses secure HttpOnly Lax cookies for https deployments", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://commerceos.example.com");
    vi.stubEnv("NODE_ENV", "development");

    expect(authCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("keeps localhost cookies usable over http", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    expect(authCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("falls back to production mode when no site URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(authCookieOptions().secure).toBe(true);
  });
});
