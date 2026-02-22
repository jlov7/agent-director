import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: /visual-verification\.spec\.ts/,
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{projectName}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: {
        ...baseConfig.use,
        browserName: 'chromium',
      },
    },
    {
      name: 'firefox',
      use: {
        ...baseConfig.use,
        browserName: 'firefox',
      },
    },
    {
      name: 'webkit',
      use: {
        ...baseConfig.use,
        browserName: 'webkit',
      },
    },
  ],
});
