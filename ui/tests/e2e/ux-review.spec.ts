import { expect, test } from '@playwright/test';
import { maybePercySnapshot } from './utils/percy';

const viewports = [
  { name: 'tablet', size: { width: 900, height: 1100 } },
  { name: 'mobile', size: { width: 414, height: 896 } },
];

async function preparePage(page: import('@playwright/test').Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

async function openCompare(page: import('@playwright/test').Page) {
  await page.locator('.step-card').first().click();
  await page.getByRole('button', { name: 'Replay from this step' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('.compare-grid')).toBeVisible();
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} viewport`, () => {
    test.use({ viewport: viewport.size });
    const screenshotOptions =
      viewport.name === 'mobile' ? { maxDiffPixelRatio: 0.025, maxDiffPixels: 15000 } : {};

    test('cinema layout snapshot', async ({ page }) => {
      await preparePage(page);
      await page.goto('/');
      await expect(page.locator('.timeline')).toBeVisible();
      await page.locator('.step-card').first().click();
      await expect(page.locator('.inspector')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-cinema`, { widths: [viewport.size.width] });
      await expect(page).toHaveScreenshot(`ux-${viewport.name}-cinema.png`, {
        fullPage: true,
        ...screenshotOptions,
      });
    });

    test('flow layout snapshot', async ({ page }) => {
      await preparePage(page);
      await page.goto('/');
      await page.getByTitle('Graph view').click();
      await expect(page.locator('.flow-node').first()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-flow`, { widths: [viewport.size.width] });
      await expect(page).toHaveScreenshot(`ux-${viewport.name}-flow.png`, {
        fullPage: true,
        ...screenshotOptions,
      });
    });

    test('compare layout snapshot', async ({ page }) => {
      await preparePage(page);
      await page.goto('/');
      await openCompare(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-compare`, { widths: [viewport.size.width] });
      await expect(page).toHaveScreenshot(`ux-${viewport.name}-compare.png`, {
        fullPage: true,
        ...screenshotOptions,
      });
    });
  });
}
