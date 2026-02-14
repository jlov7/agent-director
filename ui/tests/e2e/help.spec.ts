import { expect, test } from '@playwright/test';

test.describe('Help page', () => {
  test('loads help page content', async ({ page }) => {
    await page.goto('/help.html');

    await expect(page.getByRole('heading', { name: 'Agent Director Help' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Core workflow (Observe -> Inspect -> Direct)' })).toBeVisible();
  });

  test('is reachable from header help link', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('agentDirector.introDismissed', 'true');
      window.localStorage.setItem('agentDirector.tourCompleted', 'true');
      window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    });

    await page.goto('/');
    const helpLink = page.locator('.header').getByRole('link', { name: 'Help' });
    await expect(helpLink).toHaveAttribute('href', '/help.html');
  });
});
