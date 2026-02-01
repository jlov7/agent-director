import { expect, test } from '@playwright/test';

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
  let AxeBuilder: typeof import('@axe-core/playwright').default;
  try {
    ({ default: AxeBuilder } = await import('@axe-core/playwright'));
  } catch (error) {
    test.skip(true, `@axe-core/playwright unavailable: ${(error as Error)?.message ?? 'unknown error'}`);
    return;
  }

  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('.app').analyze();
  expect(results.violations).toEqual([]);
});
