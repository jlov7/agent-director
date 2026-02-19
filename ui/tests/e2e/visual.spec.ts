import { expect, test } from '@playwright/test';
import { maybePercySnapshot } from './utils/percy';

const screenshotOptions = { maxDiffPixelRatio: 0.10, maxDiffPixels: 300000 };

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

async function openMatrix(page: import('@playwright/test').Page) {
  await initStorage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Matrix', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Counterfactual Replay Matrix' })).toBeVisible();
}

test('cinema visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.locator('.timeline')).toBeVisible();
  await maybePercySnapshot(page, 'cinema');
  await expect(page.locator('.main')).toHaveScreenshot('cinema.png', screenshotOptions);
});

test('flow visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByTitle('Graph view').click();
  await expect(page.locator('.flow-canvas')).toBeVisible();
  await expect(page.locator('.react-flow__node').first()).toBeAttached();
  await maybePercySnapshot(page, 'flow');
  await expect(page.locator('.main')).toHaveScreenshot('flow.png', screenshotOptions);
});

test('compare visual snapshot', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.locator('.step-card').first().click();
  await page.getByRole('button', { name: 'Replay from this step' }).click();
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('.compare-grid')).toBeVisible();
  await maybePercySnapshot(page, 'compare');
  await expect(page.locator('.main')).toHaveScreenshot('compare.png', screenshotOptions);
});

test('matrix empty snapshot', async ({ page }) => {
  await openMatrix(page);
  await maybePercySnapshot(page, 'matrix-empty');
  await expect(page.locator('.main')).toHaveScreenshot('matrix-empty.png', screenshotOptions);
});

test('matrix loading snapshot', async ({ page }) => {
  await openMatrix(page);
  await page.getByRole('button', { name: 'Run matrix' }).click();
  await expect(page.getByRole('button', { name: 'Running...' })).toBeVisible();
  await maybePercySnapshot(page, 'matrix-loading');
  await expect(page.locator('.matrix-actions')).toHaveScreenshot('matrix-loading.png', screenshotOptions);
});

test('matrix loaded snapshot', async ({ page }) => {
  await openMatrix(page);
  await page.getByRole('button', { name: 'Run matrix' }).click();
  const openButton = page.locator('.matrix-table').getByRole('button', { name: 'Open' }).first();
  await expect(openButton).toBeEnabled();
  await maybePercySnapshot(page, 'matrix-loaded');
  await expect(page.locator('.main')).toHaveScreenshot('matrix-loaded.png', screenshotOptions);
});

test('matrix error snapshot', async ({ page }) => {
  await openMatrix(page);
  const textarea = page.locator('.matrix-scenario textarea').first();
  await textarea.fill('{');
  await expect(page.getByText('Fix scenario errors before running.')).toBeVisible();
  await maybePercySnapshot(page, 'matrix-error');
  await expect(page.locator('.main')).toHaveScreenshot('matrix-error.png', screenshotOptions);
});
