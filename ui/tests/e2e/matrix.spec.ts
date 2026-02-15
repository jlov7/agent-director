import { test, expect } from '@playwright/test';

test('matrix mode runs scenarios and opens compare', async ({ page }) => {
  await page.goto('/');

  const skipTour = page.getByRole('button', { name: 'Skip' });
  if (await skipTour.isVisible()) {
    await skipTour.click();
  }

  await page.getByRole('button', { name: 'Matrix' }).click();
  await expect(page.getByRole('heading', { name: 'Counterfactual Replay Matrix' })).toBeVisible();

  await page.getByRole('button', { name: 'Run matrix' }).click();

  const detailsButton = page.locator('.matrix-table').getByRole('button', { name: 'Details' }).first();
  await expect(detailsButton).toBeVisible();
  await detailsButton.click();
  await expect(page.getByRole('dialog', { name: 'Scenario details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  const openButton = page.locator('.matrix-table').getByRole('button', { name: 'Open' }).first();
  await expect(openButton).toBeEnabled();
  await openButton.click();

  await expect(page.locator('.compare-title', { hasText: 'Compare Runs' })).toBeVisible();
});
