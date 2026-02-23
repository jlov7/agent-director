import { expect, test } from '@playwright/test';
import path from 'node:path';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FREEZE_STYLE_PATH = path.join(TEST_DIR, 'styles', 'test.css');

async function primeRouteShell(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'false');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    window.localStorage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(true));
  });
}

async function runAxe(page: import('@playwright/test').Page, context = '.app') {
  await page.addScriptTag({ path: axeSourcePath });
  return page.evaluate(async (target) => {
    const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: unknown[] }> } }).axe;
    if (!axe) return { violations: [{ id: 'axe-unavailable' }] };
    return axe.run(target);
  }, context);
}

test.describe('component visual contracts', () => {
  test.use({
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });

  test('workspace next action card contract', async ({ page }) => {
    await primeRouteShell(page);
    await page.goto('/?routes=1&route=overview');
    const card = page.locator('.workspace-next-action');
    await expect(card).toBeVisible();
    await card.evaluate((node) => {
      const el = node as HTMLElement;
      el.style.width = '517px';
      el.style.maxWidth = '517px';
      el.style.minWidth = '517px';
    });
    await expect(card).toHaveScreenshot('component-workspace-next-action.png', {
      stylePath: FREEZE_STYLE_PATH,
      maxDiffPixelRatio: 0.07,
    });
  });

  test('workspace action-state contract (default/hover/focus)', async ({ page }) => {
    await primeRouteShell(page);
    await page.goto('/?routes=1&route=triage');

    const primary = page.locator('.workspace-primary-button');
    await expect(primary).toBeVisible();
    await primary.hover();
    await primary.focus();

    const actionRegion = page.locator('.workspace-section-actions');
    await expect(actionRegion).toHaveScreenshot('component-workspace-actions-states.png', {
      stylePath: FREEZE_STYLE_PATH,
    });
  });

  test('visual + a11y combined contract for workspace header', async ({ page }) => {
    await primeRouteShell(page);
    await page.goto('/?routes=1&route=diagnose');

    const primary = page.locator('.workspace-primary-button');
    await primary.focus();
    await expect(primary).toBeFocused();

    const headerRegion = page.locator('.workspace-section-header');
    await expect(headerRegion).toHaveScreenshot('component-workspace-header-focus.png', {
      stylePath: FREEZE_STYLE_PATH,
    });

    const axe = await runAxe(page, '.workspace-section-header');
    expect(axe.violations).toEqual([]);
  });
});
