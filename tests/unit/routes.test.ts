import { describe, expect, it } from "vitest";
import { isAuthPath, isProtectedPath } from "@/config/routes";

describe("route classification", () => {
  it("marks dashboard modules as protected", () => {
    for (const path of [
      "/dashboard",
      "/products",
      "/orders",
      "/settings",
      "/onboarding",
    ]) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });

  it("protects nested module paths", () => {
    expect(isProtectedPath("/orders/ORD-1")).toBe(true);
  });

  it("does not protect public routes", () => {
    for (const path of [
      "/",
      "/login",
      "/register",
      "/setup",
      "/design",
      "/auth/callback",
    ]) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });

  it("does not redirect signed-in users away from password reset", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/register")).toBe(true);
    expect(isAuthPath("/reset-password")).toBe(false);
  });
});
