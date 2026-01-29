import { expect, test } from '@playwright/test';
import { maybePercySnapshot } from './utils/percy';

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
  });
}

test('cinema visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.timeline')).toBeVisible();
  await maybePercySnapshot(page, 'cinema');
  await expect(page.locator('.app')).toHaveScreenshot('cinema.png');
});

test('flow visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByTitle('Graph view').click();
  await expect(page.locator('.flow-node').first()).toBeVisible();
  await maybePercySnapshot(page, 'flow');
  await expect(page.locator('.app')).toHaveScreenshot('flow.png');
});

test('compare visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.locator('.step-card').first().click();
  await page.getByRole('button', { name: 'Replay from this step' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('.compare-grid')).toBeVisible();
  await maybePercySnapshot(page, 'compare');
  await expect(page.locator('.app')).toHaveScreenshot('compare.png');
});
