import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /try the read-only demo/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("demo surfaces have no serious or critical axe violations", async ({
  page,
}) => {
  await enterDemo(page);

  for (const path of ["/dashboard", "/products", "/orders", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  }
});
