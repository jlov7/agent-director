import { expect, test } from '@playwright/test';
import { maybePercySnapshot } from './utils/percy';

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

async function openMatrix(page: import('@playwright/test').Page) {
  await initStorage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Matrix', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Counterfactual Replay Matrix' })).toBeVisible();
}

test('cinema visual snapshot', async ({ page }, testInfo) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.timeline')).toBeVisible();
  await maybePercySnapshot(page, 'cinema');
  await page.locator('.main').screenshot({ path: testInfo.outputPath('cinema.png') });
});

test('flow visual snapshot', async ({ page }, testInfo) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByTitle('Graph view').click();
  await expect(page.locator('.flow-canvas')).toBeVisible();
  await expect(page.locator('.react-flow__node').first()).toBeAttached();
  await maybePercySnapshot(page, 'flow');
  await page.locator('.main').screenshot({ path: testInfo.outputPath('flow.png') });
});

test('compare visual snapshot', async ({ page }, testInfo) => {
  await initStorage(page);
  await page.goto('/');
  await page.locator('.step-card').first().click();
  await page.getByRole('button', { name: 'Replay from this step' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('.compare-grid')).toBeVisible();
  await maybePercySnapshot(page, 'compare');
  await page.locator('.main').screenshot({ path: testInfo.outputPath('compare.png') });
});

test('matrix empty snapshot', async ({ page }, testInfo) => {
  await openMatrix(page);
  await maybePercySnapshot(page, 'matrix-empty');
  await page.locator('.main').screenshot({ path: testInfo.outputPath('matrix-empty.png') });
});

test('matrix loading snapshot', async ({ page }, testInfo) => {
  await openMatrix(page);
  await page.getByRole('button', { name: 'Run matrix' }).click();
  await expect(page.getByRole('button', { name: 'Running...' })).toBeVisible();
  await maybePercySnapshot(page, 'matrix-loading');
  await page.locator('.matrix-actions').screenshot({ path: testInfo.outputPath('matrix-loading.png') });
});

test('matrix loaded snapshot', async ({ page }, testInfo) => {
  await openMatrix(page);
  await page.getByRole('button', { name: 'Run matrix' }).click();
  const openButton = page.locator('.matrix-table').getByRole('button', { name: 'Open' }).first();
  await expect(openButton).toBeEnabled();
  await maybePercySnapshot(page, 'matrix-loaded');
  await page.locator('.matrix-table-wrap').screenshot({ path: testInfo.outputPath('matrix-loaded.png') });
});

test('matrix error snapshot', async ({ page }, testInfo) => {
  await openMatrix(page);
  const textarea = page.locator('.matrix-scenario textarea').first();
  await textarea.fill('{');
  await expect(page.getByText('Fix scenario errors before running.')).toBeVisible();
  await maybePercySnapshot(page, 'matrix-error');
  await page.locator('.main').screenshot({ path: testInfo.outputPath('matrix-error.png') });
});

const ROUTE_SNAPSHOT_ORDER = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

for (const route of ROUTE_SNAPSHOT_ORDER) {
  test(`route shell ${route} desktop snapshot`, async ({ page }, testInfo) => {
    await initRouteShellStorage(page);
    await page.goto(`/?routes=1&route=${route}`);
    await expect(page.locator(`[data-route-panel="${route}"]`)).toBeVisible();
    await maybePercySnapshot(page, `route-${route}-desktop`);
    await page.locator('.workspace-route-shell').screenshot({
      path: testInfo.outputPath(`route-${route}-desktop.png`),
    });
  });
}
