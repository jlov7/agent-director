import { expect, test } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test('homepage has no detectable a11y violations', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();

  await page.addScriptTag({ path: axeSourcePath });
  const results = await page.evaluate(async () => {
    const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: unknown[] }> } }).axe;
    if (!axe) {
      return { violations: [{ id: 'axe-unavailable' }] };
    }
    return axe.run('.app');
  });
  expect(results.violations).toEqual([]);
});
