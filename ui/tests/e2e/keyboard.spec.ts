import { expect, test } from '@playwright/test';

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.speed', '1');
  });
}

test.describe('Keyboard shortcuts', () => {
  test('question mark opens shortcuts modal and escape closes it', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.locator('body').click({ position: { x: 8, y: 8 } });
    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
  });

  test('ctrl/cmd+k toggles command palette', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('Control+k');
    await expect(page.locator('.palette')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.palette')).not.toBeVisible();
  });

  test('f toggles flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.locator('.timeline')).toBeVisible();

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    await page.keyboard.press('f');
    await expect(page.locator('.timeline')).toBeVisible();
  });

  test('i toggles inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Close inspector' })).not.toBeVisible();

    await page.keyboard.press('i');
    await expect(page.getByRole('button', { name: 'Close inspector' })).toBeVisible();

    await page.keyboard.press('i');
    await expect(page.getByRole('button', { name: 'Close inspector' })).not.toBeVisible();
  });
});
