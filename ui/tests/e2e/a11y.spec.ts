import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
  });
}

test('homepage has no detectable a11y violations', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('.app').analyze();
  expect(results.violations).toEqual([]);
});
