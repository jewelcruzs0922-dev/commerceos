import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  MEMBER_ROLES,
  assertCapability,
  can,
  isMemberRole,
} from "@/lib/permissions";

describe("permissions", () => {
  it.each([
    ["owner", "team:manage", true],
    ["admin", "team:manage", true],
    ["manager", "team:manage", false],
    ["staff", "team:manage", false],
    ["owner", "ownership:transfer", true],
    ["admin", "ownership:transfer", false],
    ["manager", "products:manage", true],
    ["staff", "products:manage", false],
    ["staff", "orders:read", true],
    ["staff", "orders:manage", false],
    ["staff", "orders:fulfill", true],
    ["staff", "inventory:adjust", true],
    ["manager", "analytics:read", true],
    ["staff", "analytics:read", false],
  ] as const)("%s %s => %s", (role, capability, expected) => {
    expect(can(role, capability)).toBe(expected);
  });

  it("recognizes only known roles", () => {
    for (const role of MEMBER_ROLES) {
      expect(isMemberRole(role)).toBe(true);
    }
    expect(isMemberRole("support")).toBe(false);
    expect(isMemberRole("")).toBe(false);
    expect(isMemberRole(null)).toBe(false);
  });

  it("throws when a capability is missing", () => {
    expect(() => assertCapability("staff", "team:manage")).toThrow(
      AuthorizationError
    );
    expect(() => assertCapability("owner", "team:manage")).not.toThrow();
  });
});
