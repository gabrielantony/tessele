import { defineConfig, devices } from "@playwright/test";

// The layout suite runs against the static export, because that is what ships.
// WebKit is not optional: the defect this suite was written for -- a horizontal
// scroll that appears and disappears on its own -- was reported on Safari/iPhone.
export const PREVIEW_PORT = 4610;
export const BASE_PATH = "/tessele/";

export default defineConfig({
  testDir: "./tests/layout",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Deliberately zero. Every assertion here is a measurement, and a retry would
  // turn a real regression that only shows under load into a green run.
  retries: 0,
  workers: 4,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? "github" : [["list"]],
  webServer: {
    command: `npm run build && node scripts/serve-export.mjs ${PREVIEW_PORT}`,
    url: `http://localhost:${PREVIEW_PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: `http://localhost:${PREVIEW_PORT}${BASE_PATH}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 15"] } },
  ],
});
