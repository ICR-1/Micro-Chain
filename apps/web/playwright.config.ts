import { defineConfig, devices } from "@playwright/test";

const localWeb = "http://127.0.0.1:3000";
const localApi = "http://127.0.0.1:8000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  use: {
    baseURL: baseURL ?? localWeb,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } } },
  ],
  webServer: baseURL ? undefined : [
    {
      command: "uv run --locked uvicorn app.main:app --host 127.0.0.1",
      cwd: "../api",
      url: `${localApi}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1",
      url: localWeb,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
