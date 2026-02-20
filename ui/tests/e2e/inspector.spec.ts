import { expect, test } from '@playwright/test';

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
  });
}

test.describe('Inspector', () => {
  test('opens from a step card and closes from Close button', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('.step-card').first().click();
    await expect(page.getByRole('button', { name: 'Close inspector' })).toBeVisible();

    await page.getByRole('button', { name: 'Close inspector' }).click();
    await expect(page.getByRole('button', { name: 'Close inspector' })).not.toBeVisible();
  });

  test('shows step metadata and payload section', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('.step-card').first().click();

    await expect(page.locator('.inspector-subtitle')).toBeVisible();
    await expect(page.locator('.inspector-row').filter({ hasText: 'Duration' })).toBeVisible();
    await expect(page.locator('.inspector').getByText('Payload', { exact: true })).toBeVisible();
  });

  test('safe export disables raw payload toggle', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('.step-card').first().click();
    const rawToggle = page.getByLabel('Reveal raw (dangerous)');
    await expect(rawToggle).toBeDisabled();

    await page.locator('.toolbar').getByLabel('Safe export').click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(rawToggle).toBeEnabled();
  });

  test('replay from inspector enables compare mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('.step-card').first().click();
    await page.getByRole('button', { name: 'Replay from this step' }).click();

    await expect(page.locator('.flow-canvas')).toBeVisible();
    await expect(page.locator('.toolbar').getByRole('button', { name: 'Compare', exact: true })).toBeEnabled();
  });

  test('escape closes inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('.step-card').first().click();
    await expect(page.getByRole('button', { name: 'Close inspector' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Close inspector' })).not.toBeVisible();
  });
});
