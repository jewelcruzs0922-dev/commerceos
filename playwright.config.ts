import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const httpUser = process.env.PLAYWRIGHT_HTTP_USER;
const httpPassword = process.env.PLAYWRIGHT_HTTP_PASSWORD;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    httpCredentials:
      httpUser && httpPassword
        ? { username: httpUser, password: httpPassword }
        : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
