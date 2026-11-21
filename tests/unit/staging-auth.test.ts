import { describe, expect, it } from "vitest";
import {
  isStagingAuthorized,
  isStagingProtected,
  parseBasicAuthorization,
} from "@/lib/security/staging-auth";

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

describe("staging basic auth", () => {
  it("is disabled unless both values are configured", () => {
    expect(isStagingProtected(undefined, undefined)).toBe(false);
    expect(isStagingProtected("user", undefined)).toBe(false);
    expect(isStagingProtected("user", "pass")).toBe(true);
  });

  it("parses a basic authorization header with a colon in the password", () => {
    expect(parseBasicAuthorization(basic("viewer", "a:b:c"))).toEqual({
      username: "viewer",
      password: "a:b:c",
    });
  });

  it("accepts only the configured credentials", () => {
    expect(isStagingAuthorized(basic("viewer", "secret"), "viewer", "secret")).toBe(
      true
    );
    expect(isStagingAuthorized(basic("viewer", "wrong"), "viewer", "secret")).toBe(
      false
    );
    expect(isStagingAuthorized(null, "viewer", "secret")).toBe(false);
  });
});
