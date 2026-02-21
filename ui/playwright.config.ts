import { defineConfig } from '@playwright/test';

const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4273);
const E2E_HOST = '127.0.0.1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Keep visual checks strict while tolerating minor macOS/Linux raster differences in CI.
      maxDiffPixelRatio: 0.03,
      maxDiffPixels: 35000,
    },
  },
  use: {
    baseURL: `http://${E2E_HOST}:${E2E_PORT}`,
  },
  webServer: {
    command: `pnpm dev --host ${E2E_HOST} --port ${E2E_PORT} --strictPort`,
    url: `http://${E2E_HOST}:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_HIDE_BUILD_DATE: '1',
      VITE_FORCE_DEMO: '1',
      VITE_UX_REBOOT_ROUTES: '0',
    },
  },
});
