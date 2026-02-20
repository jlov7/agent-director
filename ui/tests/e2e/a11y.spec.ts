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

async function initRouteShellStorage(page: import('@playwright/test').Page) {
  await initStorage(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', 'true');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
  });
}

async function runAxe(page: import('@playwright/test').Page, context = '.app') {
  await page.addScriptTag({ path: axeSourcePath });
  return page.evaluate(async (target) => {
    const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: unknown[] }> } }).axe;
    if (!axe) {
      return { violations: [{ id: 'axe-unavailable' }] };
    }
    return axe.run(target);
  }, context);
}

test('homepage has no detectable a11y violations', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();
  const results = await runAxe(page);
  expect(results.violations).toEqual([]);
});

test('flow mode has no detectable a11y violations', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByTitle('Graph view').click();
  await expect(page.locator('.flow-canvas')).toBeVisible();
  const results = await runAxe(page);
  expect(results.violations).toEqual([]);
});

test('compare mode has no detectable a11y violations', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.locator('.step-card').first().click();
  await page.getByRole('button', { name: 'Replay from this step' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('.compare-grid')).toBeVisible();
  const results = await runAxe(page);
  expect(results.violations).toEqual([]);
});

test('mobile viewport has no detectable a11y violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.app')).toBeVisible();
  const results = await runAxe(page);
  expect(results.violations).toEqual([]);
});

test('route-shell overview landmarks and a11y remain clean', async ({ page }) => {
  await initRouteShellStorage(page);
  await page.goto('/?routes=1&route=overview');
  await expect(page.locator('[data-route-panel="overview"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  const results = await runAxe(page);
  expect(results.violations).toEqual([]);
});
