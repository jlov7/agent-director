import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

async function initExperienced(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
  });
}

async function initFirstRun(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'false');
    window.localStorage.setItem('agentDirector.heroDismissed', 'false');
    window.localStorage.setItem('agentDirector.tourCompleted', 'false');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test.describe('Deep UX audit probes', () => {
  test('first-run intro requires explicit action and does not auto-dismiss', async ({ page }) => {
    await initFirstRun(page);
    await page.goto('/');
    await expect(page.locator('.intro-overlay')).toBeVisible();
    await page.waitForTimeout(4000);
    await expect(page.locator('.intro-overlay')).toBeVisible();
  });

  test('guided tour traps focus and escape closes it', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    await page.keyboard.press('t');
    await expect(page.locator('.tour-overlay')).toBeVisible();

    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
    }

    const inTour = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(active?.closest('.tour-card'));
    });
    expect(inTour).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.tour-overlay')).not.toBeVisible();
  });

  test('help page docs link availability', async ({ page }) => {
    await page.goto('/help.html');
    const href = await page.getByRole('link', { name: 'Full docs index' }).getAttribute('href');
    const response = await page.request.get(href || '/docs/index.md');
    expect(href).toBe('/docs/index.md');
    expect(response.status()).toBe(200);
  });

  test('mobile quick-actions visibility on first viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await initExperienced(page);
    await page.goto('/');

    const toggle = page.locator('.quick-actions-toggle');
    const visible = await toggle.isVisible();
    const box = await toggle.boundingBox();
    const inViewport = !!box && box.y >= 0 && box.y + box.height <= 844;
    expect(visible).toBe(true);
    expect(inViewport).toBe(true);
  });

  test('a11y scan for intro and guided tour surfaces', async ({ page }) => {
    await initFirstRun(page);
    await page.goto('/');
    await expect(page.locator('.intro-overlay')).toBeVisible();

    await page.addScriptTag({ path: axeSourcePath });
    const introResults = await page.evaluate(async () => {
      const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: Array<{ id: string }> }> } }).axe;
      if (!axe) return { violations: [{ id: 'axe-unavailable' }] };
      return axe.run('.intro-overlay');
    });
    expect(introResults.violations).toEqual([]);

    await page.locator('.intro-overlay').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();

    const tourResults = await page.evaluate(async () => {
      const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: Array<{ id: string }> }> } }).axe;
      if (!axe) return { violations: [{ id: 'axe-unavailable' }] };
      return axe.run('.tour-overlay');
    });
    expect(tourResults.violations).toEqual([]);
  });

  test('global C key switches from flow back to cinema', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    await page.getByTitle('Graph view').click();
    await expect(page.locator('.flow-canvas')).toBeVisible();
    await page.keyboard.press('c');
    await expect(page.locator('.timeline')).toBeVisible();
    await expect(page.locator('.flow-canvas')).not.toBeVisible();
  });

  test('mini timeline density map is keyboard-operable', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    const densityMap = page.getByRole('slider', { name: 'Timeline density map' });
    await expect(densityMap).toBeVisible();

    const playhead = page.locator('.mini-playhead');
    const before = await playhead.evaluate((node) => (node as HTMLElement).style.left);
    await densityMap.focus();
    await page.keyboard.press('ArrowRight');
    const after = await playhead.evaluate((node) => (node as HTMLElement).style.left);

    expect(after).not.toBe(before);
  });
});
