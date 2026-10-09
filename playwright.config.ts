import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ui",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173/circuito-2---nacional/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER
    ? undefined
    : {
        command: "node node_modules/vite/bin/vite.js --mode test",
        url: "http://127.0.0.1:5173/circuito-2---nacional/",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
