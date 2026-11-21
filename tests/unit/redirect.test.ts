import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/validation/redirect";

describe("safeInternalPath", () => {
  it("keeps internal paths", () => {
    expect(safeInternalPath("/products")).toBe("/products");
    expect(safeInternalPath("/orders?status=open")).toBe("/orders?status=open");
  });

  it("falls back for missing or invalid input", () => {
    expect(safeInternalPath(undefined)).toBe("/dashboard");
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath(42)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
    expect(safeInternalPath("products")).toBe("/dashboard");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeInternalPath("//evil.example")).toBe("/dashboard");
    expect(safeInternalPath("https://evil.example")).toBe("/dashboard");
    expect(safeInternalPath("http://evil.example")).toBe("/dashboard");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(safeInternalPath("/\\evil.example")).toBe("/dashboard");
    expect(safeInternalPath("\\\\evil.example")).toBe("/dashboard");
  });
});
