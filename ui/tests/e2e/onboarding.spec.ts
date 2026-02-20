import { expect, test } from '@playwright/test';

async function initRouteShellOnboarding(
  page: import('@playwright/test').Page,
  path: 'evaluate' | 'operate' | 'investigate' = 'evaluate'
) {
  await page.addInitScript((selectedPath) => {
    window.localStorage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('select'));
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify(selectedPath));
    window.localStorage.setItem('agentDirector.explainMode', JSON.stringify(false));
    window.localStorage.setItem('agentDirector.introDismissed', JSON.stringify(false));
    window.localStorage.setItem('agentDirector.heroDismissed', JSON.stringify(false));
  }, path);
}

test.describe('Onboarding (Route Shell)', () => {
  test('shows one first-run decision with three role paths', async ({ page }) => {
    await initRouteShellOnboarding(page, 'evaluate');
    await page.goto('/?routes=1&route=overview');

    await expect(page.getByText('What are you here to do?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Evaluate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Operate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Investigate' })).toBeVisible();
    await expect(page.locator('.intro-overlay')).toHaveCount(0);
  });

  test('evaluate path supports safe skip and recommends one first action', async ({ page }) => {
    await initRouteShellOnboarding(page, 'evaluate');
    await page.goto('/?routes=1&route=overview');

    await page.getByRole('button', { name: 'Skip for now' }).click();

    await expect(page.getByText('Skipped for now')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open top risk' })).toBeVisible();
  });

  test('operate path progresses checklist after recommended action', async ({ page }) => {
    await initRouteShellOnboarding(page, 'operate');
    await page.goto('/?routes=1&route=triage');

    await page.getByRole('button', { name: 'Start first win' }).click();
    await expect(page.getByText('First win checklist')).toBeVisible();

    await page.getByRole('button', { name: 'Open incident triage' }).click();
    await expect(page.getByText('1 of 3 complete')).toBeVisible();
  });

  test('investigate path progresses checklist after opening flow mode', async ({ page }) => {
    await initRouteShellOnboarding(page, 'investigate');
    await page.goto('/?routes=1&route=diagnose');

    await page.getByRole('button', { name: 'Start first win' }).click();
    await page.getByRole('button', { name: 'Open flow mode' }).click();

    await expect(page.getByText('1 of 3 complete')).toBeVisible();
  });

  test('help me around opens guided tour as optional assist', async ({ page }) => {
    await initRouteShellOnboarding(page, 'evaluate');
    await page.goto('/?routes=1&route=overview');

    await page.getByRole('button', { name: 'Help me around' }).first().click();

    await expect(page.locator('.tour-overlay')).toBeVisible();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });
});
