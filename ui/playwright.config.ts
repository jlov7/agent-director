import { defineConfig } from '@playwright/test';

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
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      VITE_HIDE_BUILD_DATE: '1',
      VITE_FORCE_DEMO: '1',
    },
  },
});
