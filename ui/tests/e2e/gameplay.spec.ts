import { expect, test } from '@playwright/test';

async function initStorage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test('creates a gameplay multiplayer session', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Gameplay' }).click();
  await expect(page.getByText('Gameplay Command Center')).toBeVisible();

  await page.getByLabel('Session name').fill('E2E Night Ops');
  await page.getByRole('button', { name: 'Create multiplayer session' }).click();

  const localSession = page.getByText('Session: local-only');
  const remoteSession = page.getByText(/^Session: session-/);

  await Promise.race([
    localSession.waitFor({ state: 'visible', timeout: 7000 }).catch(() => undefined),
    remoteSession.waitFor({ state: 'visible', timeout: 7000 }).catch(() => undefined),
  ]);

  const localVisible = await localSession.isVisible().catch(() => false);
  if (localVisible) {
    await expect(page.getByText('Session: local-only')).toBeVisible();
  } else {
    await expect(page.getByText(/^Session: session-/)).toBeVisible();
    await expect(page.getByText(/Version/)).toBeVisible();
  }
});

test('applies backend-authoritative gameplay actions', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Gameplay' }).click();
  await page.getByRole('button', { name: 'Create multiplayer session' }).click();

  await expect(page.getByText(/Depth 1 .*Lives 3/)).toBeVisible();
  await page.getByRole('button', { name: 'Mission success' }).click();
  await expect(page.getByText(/Depth 2 .*Lives 3/)).toBeVisible();

  await expect(page.getByText('0 queued events')).toBeVisible();
  await page.getByRole('button', { name: 'Critical beat' }).click();
  await expect(page.getByText('1 queued events')).toBeVisible();
});
