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

async function initRouteShellStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', 'true');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    window.localStorage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(true));
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

  test('route-shell journeys are keyboard-completable across five routes', async ({ page }) => {
    await initRouteShellStorage(page);
    await page.goto('/?routes=1&route=overview');

    await page.getByRole('button', { name: 'Review run health', exact: true }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Resume here: Review run health')).toBeVisible();

    await page.getByRole('button', { name: 'Triage workspace route' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('4');
    await expect(page.getByText('Resume here: Share the handoff')).toBeVisible();

    await page.getByRole('button', { name: 'Diagnose workspace route' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('4');
    await expect(page.getByText('Resume here: Share findings')).toBeVisible();

    await page.getByRole('button', { name: 'Coordinate workspace route' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect(page.locator('.workspace-card').filter({ hasText: 'Handoff snapshots' })).toContainText(/snapshot/i);

    await page.getByRole('button', { name: 'Configure workspace route' }).focus();
    await page.keyboard.press('Enter');
    const safeExportToggle = page.locator('[data-route-panel="settings"]').getByRole('checkbox', { name: 'Safe export' });
    await safeExportToggle.focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Confirm' }).focus();
    await page.keyboard.press('Enter');
    await expect(safeExportToggle).not.toBeChecked();
  });

  test('skip link moves focus to main content', async ({ page }) => {
    await initRouteShellStorage(page);
    await page.goto('/?routes=1&route=overview');
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      const focusedSkip = await page.evaluate(() => document.activeElement?.classList.contains('skip-link') === true);
      if (focusedSkip) break;
    }
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');

    const activeIsMain = await page.evaluate(() => document.activeElement?.id === 'main-content');
    expect(activeIsMain).toBe(true);
  });
});
