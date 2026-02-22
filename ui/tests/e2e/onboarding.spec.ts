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

async function initRouteShellCompletedFocus(
  page: import('@playwright/test').Page,
  path: 'evaluate' | 'operate' | 'investigate' = 'evaluate'
) {
  await page.addInitScript((selectedPath) => {
    window.localStorage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify(selectedPath));
    window.localStorage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(false));
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.explainMode', JSON.stringify(false));
    window.localStorage.setItem('agentDirector.introDismissed', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.heroDismissed', JSON.stringify(true));
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

  test('guided mode hides advanced workspace until explicit full-workspace opt-in', async ({ page }) => {
    await initRouteShellOnboarding(page, 'evaluate');
    await page.goto('/?routes=1&route=overview');

    await expect(page.getByText('What are you here to do?')).toBeVisible();
    await expect(page.locator('.toolbar')).toHaveCount(0);
    await expect(page.locator('.playback-stack')).toHaveCount(0);

    await page.getByRole('button', { name: 'Start first win' }).click();
    await expect(page.getByText('Guided mode keeps this screen focused')).toBeVisible();
    await page.getByRole('button', { name: 'Open full workspace now' }).click();

    await expect(page.locator('.toolbar')).toBeVisible();
  });

  test('completed onboarding defaults to focused mode until analysis canvas is explicitly opened', async ({ page }) => {
    await initRouteShellCompletedFocus(page, 'operate');
    await page.goto('/?routes=1&route=triage');

    await expect(page.getByText('Focused route workspace')).toBeVisible();
    await expect(page.locator('.toolbar')).toHaveCount(0);

    await page.getByRole('button', { name: 'Open analysis canvas' }).first().click();
    await expect(page.locator('.toolbar')).toBeVisible();

    await page.getByRole('button', { name: 'Return to focused view' }).first().click();
    await expect(page.locator('.toolbar')).toHaveCount(0);
  });

  test('focus order stays predictable in guided mode and after advanced workspace opt-in', async ({ page }) => {
    await initRouteShellOnboarding(page, 'evaluate');
    await page.goto('/?routes=1&route=overview');

    const start = page.getByRole('button', { name: 'Start first win' });
    const skip = page.getByRole('button', { name: 'Skip for now' });
    const helpAround = page.getByRole('button', { name: 'Help me around' }).first();

    await start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(helpAround).toBeFocused();

    await page.getByRole('button', { name: 'Start first win' }).click();
    await page.getByRole('button', { name: 'Open full workspace now' }).click();
    await expect(page.locator('.toolbar')).toBeVisible();
    await page.getByLabel('Search steps').focus();
    await expect(page.getByLabel('Search steps')).toBeFocused();

    const workspaceTools = page.getByRole('button', { name: 'Workspace tools' });
    await workspaceTools.focus();
    await expect(workspaceTools).toBeFocused();
    await workspaceTools.press('Enter');

    const firstMenuItem = page.locator('#workspace-actions-menu [role="menuitem"]').first();
    await page.keyboard.press('Tab');
    await expect(firstMenuItem).toBeFocused();
  });
});
