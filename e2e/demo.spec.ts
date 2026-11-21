import { expect, test, type Page } from "@playwright/test";

async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /try the read-only demo/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("protected dashboard redirects unauthenticated visitors", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("guest demo opens the seeded read-only workspace", async ({ page }) => {
  await enterDemo(page);

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Seeded dataset")).toBeVisible();
  await expect(page.getByText("Fictional Urban Goods data")).toBeVisible();
  await expect(page.getByText("Net sales").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent orders" })).toBeVisible();

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByText("Everyday Canvas Tote").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "New product" })).toHaveCount(0);

  await page.goto("/inventory?low=1");
  await expect(
    page.getByRole("heading", { name: "Inventory" })
  ).toBeVisible();
  await expect(page.getByText("Low stock").first()).toBeVisible();

  await page.goto("/settings");
  await expect(
    page.getByText(/read-only demo session/i)
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset demo data" })
  ).toHaveCount(0);
});

test("guest session exposes no write actions on the order detail", async ({
  page,
}) => {
  await enterDemo(page);
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New order" })).toHaveCount(0);

  await page.getByRole("link", { name: /UG-SEED-/ }).first().click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /UG-SEED-/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fulfill order" })).toHaveCount(
    0
  );
  await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(
    0
  );
  await expect(page.getByRole("button", { name: "Record refund" })).toHaveCount(
    0
  );
});

test("primary pages stay within mobile, tablet, and desktop widths", async ({
  page,
}) => {
  await enterDemo(page);
  const paths = [
    "/dashboard",
    "/products",
    "/orders",
    "/customers",
    "/inventory",
    "/analytics",
    "/reports",
    "/discounts",
    "/returns",
    "/team",
    "/settings",
  ];
  const viewports = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of paths) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(
        dimensions.scrollWidth,
        `${path} overflows at ${viewport.width}px`
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  }
});

test("dashboard keyboard entry starts at the skip link", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");

  const focused = await page.evaluate(() => ({
    text: document.activeElement?.textContent?.trim() ?? "",
    tag: document.activeElement?.tagName ?? "",
  }));
  expect(focused.tag).toBe("A");
  expect(focused.text).toContain("Skip to content");
});

test("guest session survives refresh and sign-out blocks the dashboard", async ({
  page,
}) => {
  await enterDemo(page);

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Demo workspace", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
