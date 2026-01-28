import { expect, test } from '@playwright/test';

test('loads cinema mode and inspector', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Agent Director')).toBeVisible();

  const stepCard = page.locator('.step-card').first();
  await expect(stepCard).toBeVisible();
  await stepCard.click();

  await expect(page.locator('.inspector')).toBeVisible();
});

test('switches to flow mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Flow' }).click();
  await expect(page.locator('.flow-canvas')).toBeVisible();
});
