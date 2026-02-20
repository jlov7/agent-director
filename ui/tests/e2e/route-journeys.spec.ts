import { expect, test } from '@playwright/test';

async function initRouteShell(page: import('@playwright/test').Page) {
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
  });
}

async function openRoute(page: import('@playwright/test').Page, route: 'overview' | 'triage' | 'diagnose' | 'coordinate' | 'settings') {
  await initRouteShell(page);
  await page.goto(`/?routes=1&route=${route}`);
}

test('overview journey: review and handoff context', async ({ page }) => {
  await openRoute(page, 'overview');

  await expect(page.getByText('Route outcome')).toBeVisible();
  await expect(page.getByText('Understand run health, risk, and the next decision in under a minute.')).toBeVisible();

  await page.getByRole('button', { name: 'Review run health' }).first().click();
  await expect(page.getByText('Recent route actions')).toBeVisible();
  await expect(page.getByText('Resume here: Review run health')).toBeVisible();
});

test('triage journey: deterministic observe->isolate->validate->share flow', async ({ page }) => {
  await openRoute(page, 'triage');

  await page.getByRole('button', { name: 'Observe incident', exact: true }).click();
  await page.getByRole('button', { name: 'Isolate cause', exact: true }).click();
  await page.getByRole('button', { name: 'Validate fix', exact: true }).click();
  await page.getByRole('button', { name: 'Share handoff', exact: true }).first().click();

  await expect(page.getByText('Resume here: Share the handoff')).toBeVisible();
});

test('diagnose journey: keyboard sequence and evidence timeline', async ({ page }) => {
  await openRoute(page, 'diagnose');

  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.keyboard.press('3');
  await page.keyboard.press('4');

  await expect(page.getByText('Execution timeline')).toBeVisible();
  await expect(page.getByText('Resume here: Share findings')).toBeVisible();
});

test('coordinate journey: ownership and handoff snapshot continuity', async ({ page }) => {
  await openRoute(page, 'coordinate');

  await page.getByLabel('Run owner').fill('incident-owner');
  await page.getByLabel('Handoff owner').fill('next-shift-owner');
  await page.getByRole('button', { name: 'Capture snapshot' }).click();

  const snapshotCard = page.locator('.workspace-card').filter({
    has: page.getByRole('heading', { name: 'Handoff snapshots' }),
  });
  await expect(snapshotCard.getByText(/COORDINATE snapshot/i)).toBeVisible();
});

test('settings journey: preference and safety controls', async ({ page }) => {
  await openRoute(page, 'settings');

  const settingsPanel = page.locator('[data-route-panel="settings"]');
  const theme = settingsPanel.getByLabel('Theme');
  const motion = settingsPanel.getByLabel('Motion');
  const density = settingsPanel.locator('label:has-text("Density") select');
  const safeExport = settingsPanel.getByRole('checkbox', { name: 'Safe export' });

  await theme.selectOption('focus');
  await motion.selectOption('minimal');
  await density.selectOption('compact');
  await safeExport.click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(theme).toHaveValue('focus');
  await expect(motion).toHaveValue('minimal');
  await expect(density).toHaveValue('compact');
  await expect(safeExport).not.toBeChecked();
});
