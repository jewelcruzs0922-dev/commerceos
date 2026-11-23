import { expect, test } from "@playwright/test";

test("responses carry baseline security headers", async ({ request }) => {
  for (const path of ["/login", "/forgot-password", "/setup", "/dashboard"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([200, 307]).toContain(response.status());
    expect(response.headers()["x-content-type-options"], path).toBe("nosniff");
    expect(response.headers()["x-frame-options"], path).toBe("DENY");
    expect(response.headers()["referrer-policy"], path).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(response.headers()["cross-origin-opener-policy"], path).toBe(
      "same-origin"
    );
    expect(response.headers()["strict-transport-security"], path).toContain(
      "max-age=63072000"
    );
    expect(response.headers()["permissions-policy"], path).toContain(
      "camera=()"
    );
  }
});

test("private exports reject unauthenticated requests", async ({ request }) => {
  const orders = await request.get("/orders/export", { maxRedirects: 0 });
  expect([307, 401]).toContain(orders.status());

  const analytics = await request.get("/analytics/export", { maxRedirects: 0 });
  expect([307, 401]).toContain(analytics.status());
});

test("CSP uses a nonce and produces no browser violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|refused to/i.test(message.text())
    ) {
      violations.push(message.text());
    }
  });

  const response = await page.goto("/login", { waitUntil: "networkidle" });
  const policy = response?.headers()["content-security-policy"] ?? "";

  expect(policy).toContain("nonce-");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("script-src 'self' 'nonce-");
  await expect(
    page.getByRole("heading", { name: /sign in/i })
  ).toBeVisible();
  expect(violations).toEqual([]);
});

test("public pages are marked noindex", async ({ request }) => {
  const response = await request.get("/login");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
});