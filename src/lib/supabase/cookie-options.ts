export function authCookieOptions() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return {
    httpOnly: true,
    secure: siteUrl
      ? siteUrl.startsWith("https://")
      : process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
