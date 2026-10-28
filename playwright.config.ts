import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const includeSoak = process.env.PLAYWRIGHT_SOAK === "1";
const includeCrossBrowser = process.env.PLAYWRIGHT_CROSS_BROWSER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["line"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chromium",
      grepInvert: /@mobile|@soak/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    ...(includeSoak ? [{
      // Long-running release checks are opt-in through `npm run test:soak`.
      name: "soak",
      grep: /@soak/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    }] : []),
    {
      name: "mobile-chromium",
      grep: /@mobile/,
      grepInvert: /@soak/,
      use: { ...devices["Pixel 5"] },
    },
    ...(includeCrossBrowser ? (["firefox", "webkit"] as const).map(name => ({
      name,
      grep: /@cross-browser/,
      use: { ...devices[name === "firefox" ? "Desktop Firefox" : "Desktop Safari"], viewport: { width: 1280, height: 900 } },
    })) : []),
  ],
});
