import { defineConfig, devices } from "@playwright/test";

const baseURL = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "pnpm e2e:prepare && pnpm --filter @upk/web exec vite dev --host 127.0.0.1 --port 5173 --strictPort",
        url: `${baseURL}/fr`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
