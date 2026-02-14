import { expect, test } from '@playwright/test';

async function initFreshUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'false');
    window.localStorage.setItem('agentDirector.tourCompleted', 'false');
    window.localStorage.setItem('agentDirector.heroDismissed', 'false');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

async function initPostIntroUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'false');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test.describe('Onboarding', () => {
  test('shows intro overlay for first-run users', async ({ page }) => {
    await initFreshUser(page);
    await page.goto('/');

    await expect(page.locator('.intro-overlay')).toBeVisible();
    await expect(page.getByText('Watch your agent think. Then direct it.')).toBeVisible();
  });

  test('skip intro moves user to hero briefing', async ({ page }) => {
    await initFreshUser(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.intro-overlay')).not.toBeVisible();
    await expect(page.locator('.hero-ribbon')).toBeVisible();
  });

  test('starting guided tour from intro opens tour', async ({ page }) => {
    await initFreshUser(page);
    await page.goto('/');

    await page.locator('.intro-overlay').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });

  test('guided tour can be navigated from header guide button', async ({ page }) => {
    await initPostIntroUser(page);
    await page.goto('/');

    await page.locator('.header').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();
    await expect(page.getByText('Step 1 of')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });

  test('hero briefing can be dismissed and stays dismissed after reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('agentDirector.introDismissed', 'true');
      window.localStorage.setItem('agentDirector.tourCompleted', 'true');
      window.localStorage.setItem('agentDirector.heroDismissed', 'false');
      window.localStorage.setItem('agentDirector.explainMode', 'false');
    });
    await page.reload();

    await expect(page.locator('.hero-ribbon')).toBeVisible();
    await page.locator('.hero-ribbon').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();

    await page.reload();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();
  });

  test('tour completion is persisted after skip', async ({ page }) => {
    await initPostIntroUser(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Start guided tour' }).first().click();
    await expect(page.locator('.tour-overlay')).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.locator('.tour-overlay')).not.toBeVisible();

    await page.reload();
    await expect(page.locator('.tour-overlay')).not.toBeVisible();
  });
});
