import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    trace: 'on',
    video: 'on',
  },
  reporter: [['html', { open: 'never' }]],
});
