import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/validation/id";

describe("isUuid", () => {
  it("accepts RFC-shaped UUIDs used by Postgres and the demo seed", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("ed0f4fac-4a6b-8e32-5224-bf99b35cb831")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("UG-SEED-0350")).toBe(false);
    expect(isUuid("11111111-1111-4111-8111")).toBe(false);
    expect(isUuid("11111111-1111-4111-8111-11111111111z")).toBe(false);
  });
});
