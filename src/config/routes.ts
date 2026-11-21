export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/products",
  "/collections",
  "/inventory",
  "/orders",
  "/returns",
  "/discounts",
  "/customers",
  "/analytics",
  "/reports",
  "/team",
  "/settings",
  "/onboarding",
] as const;

export const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthPath(pathname: string): boolean {
  return (AUTH_PATHS as readonly string[]).includes(pathname);
}
