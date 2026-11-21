import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  createNonce,
} from "@/lib/security/csp";

describe("content security policy", () => {
  it("creates a unique nonce", () => {
    expect(createNonce()).not.toBe(createNonce());
  });

  it("uses a nonce and strict-dynamic without unsafe-inline scripts", () => {
    const policy = createContentSecurityPolicy("test-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).toContain("https://*.supabase.co");
  });

  it("allows development eval and local connections only in development", () => {
    const policy = createContentSecurityPolicy("test-nonce", true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("http://localhost:*");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
