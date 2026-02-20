import { expect, test } from '@playwright/test';
import { maybePercySnapshot } from './utils/percy';

const viewports = [
  { name: 'tablet', size: { width: 900, height: 1100 } },
  // Mobile viewport skipped due to height differences between macOS/Linux rendering
  // { name: 'mobile', size: { width: 414, height: 896 } },
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

async function prepareRouteShellPage(page: import('@playwright/test').Page) {
  await preparePage(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', 'true');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
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

    test('cinema layout snapshot', async ({ page }, testInfo) => {
      await preparePage(page);
      await page.goto('/');
      await expect(page.locator('.timeline')).toBeVisible();
      await page.locator('.step-card').first().click();
      await expect(page.locator('.inspector')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-cinema`, { widths: [viewport.size.width] });
      await page.locator('.app').screenshot({ path: testInfo.outputPath(`ux-${viewport.name}-cinema.png`) });
    });

    test('flow layout snapshot', async ({ page }, testInfo) => {
      await preparePage(page);
      await page.goto('/');
      await page.getByTitle('Graph view').click();
      // CI can resolve offscreen/hidden virtualized nodes first; use the canvas visibility as the stable readiness signal.
      await expect(page.locator('.flow-canvas')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-flow`, { widths: [viewport.size.width] });
      await page.locator('.app').screenshot({ path: testInfo.outputPath(`ux-${viewport.name}-flow.png`) });
    });

    test('compare layout snapshot', async ({ page }, testInfo) => {
      await preparePage(page);
      await page.goto('/');
      await openCompare(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await maybePercySnapshot(page, `ux-${viewport.name}-compare`, { widths: [viewport.size.width] });
      await page.locator('.app').screenshot({ path: testInfo.outputPath(`ux-${viewport.name}-compare.png`) });
    });

    test('route-shell layout snapshots', async ({ page }, testInfo) => {
      await prepareRouteShellPage(page);
      const routes = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

      for (const route of routes) {
        await page.goto(`/?routes=1&route=${route}`);
        await expect(page.locator(`[data-route-panel="${route}"]`)).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await maybePercySnapshot(page, `ux-${viewport.name}-route-${route}`, { widths: [viewport.size.width] });
        await page.locator('.workspace-route-shell').screenshot({
          path: testInfo.outputPath(`ux-${viewport.name}-route-${route}.png`),
        });
      }
    });
  });
}
