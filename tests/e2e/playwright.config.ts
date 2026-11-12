import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, consentStorageState } from "./support/env";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalTeardown: "./global-teardown.ts",
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    storageState: consentStorageState,
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Phone-width coverage for the responsive shell. Only the layout spec
      // runs here to keep the suite's runtime close to the desktop run.
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
      testMatch: /layout\.spec\.ts$/,
    },
  ],
  webServer: {
    command: "node ./start-server.mjs",
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
