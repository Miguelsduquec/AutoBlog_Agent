import { defineConfig, devices } from "@playwright/test";

const backendPort = 3014;
const frontendPort = 4174;
const tempRoot = "/tmp/autoblog-playwright";
const mockProjectPorts = [
  { project: "desktop-chromium", basePort: 4010 },
  { project: "tablet-chromium", basePort: 4020 },
  { project: "mobile-chromium", basePort: 4030 }
] as const;
const mockSiteTypes = [
  { type: "simple", offset: 0 },
  { type: "content-heavy", offset: 1 },
  { type: "weak", offset: 2 }
] as const;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  outputDir: "test-results/playwright",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1024 }
      }
    },
    {
      name: "tablet-chromium",
      use: {
        ...devices["iPad (gen 7)"],
        browserName: "chromium"
      }
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ],
  webServer: [
    {
      command: `/bin/zsh -lc "rm -rf ${tempRoot} && mkdir -p ${tempRoot}/exports && PORT=${backendPort} DB_PATH=${tempRoot}/e2e.db EXPORTS_DIR=${tempRoot}/exports SEED_ON_BOOT=false GOOGLE_AUTH_MODE=mock node backend/dist/server.js"`,
      url: `http://127.0.0.1:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: `/bin/zsh -lc "VITE_API_BASE_URL=http://127.0.0.1:${backendPort}/api VITE_GOOGLE_AUTH_MODE=mock npm run dev --workspace frontend -- --host 127.0.0.1 --port ${frontendPort}"`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    ...mockProjectPorts.flatMap(({ basePort }) =>
      mockSiteTypes.map(({ type, offset }) => ({
        command: `node validation/mock-site-server.mjs ${type} ${basePort + offset}`,
        url: `http://127.0.0.1:${basePort + offset}/`,
        reuseExistingServer: false,
        timeout: 30_000
      }))
    )
  ]
});
