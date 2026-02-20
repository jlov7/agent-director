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

const ROUTE_SCAN_EXPECTATIONS = [
  { route: 'overview', keyLabel: 'Review run health' },
  { route: 'triage', keyLabel: 'Observe incident' },
  { route: 'diagnose', keyLabel: 'Observe baseline' },
  { route: 'coordinate', keyLabel: 'Share live context' },
  { route: 'settings', keyLabel: 'Interface defaults' },
] as const;

test('3-second scan: each route exposes intent and key action quickly', async ({ page }) => {
  await initRouteShell(page);

  for (const expectation of ROUTE_SCAN_EXPECTATIONS) {
    const startedAt = Date.now();
    await page.goto(`/?routes=1&route=${expectation.route}`);
    await expect(page.locator(`[data-route-panel="${expectation.route}"]`)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Route outcome')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(expectation.keyLabel).first()).toBeVisible({ timeout: 3000 });
    expect(Date.now() - startedAt).toBeLessThan(3000);
  }
});
