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

test('loads cinema mode and inspector', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await expect(page.getByText('Agent Director')).toBeVisible();

  const stepCard = page.locator('.step-card').first();
  await expect(stepCard).toBeVisible();
  await stepCard.click();

  await expect(page.locator('.inspector')).toBeVisible();
});

test('switches to flow mode', async ({ page }) => {
  await initStorage(page);
  await page.goto('/');
  await page.getByTitle('Graph view').click();
  await expect(page.locator('.flow-canvas')).toBeVisible();
});

test('enables route-ready shell when reboot route flag is present', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=triage');

  const shell = page.locator('[data-route-shell="enabled"]');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-active-route', 'triage');
  await expect(page.getByText('Agent Director')).toBeVisible();
});

test('route shell moves mode switching out of global toolbar', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=diagnose');

  await expect(page.locator('.toolbar-mode-switcher')).toHaveCount(0);
  await expect(page.locator('.analysis-tools-mode-switcher')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
});

test('route shell keeps one dominant primary CTA per viewport', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=triage');

  const primaryCount = await page.evaluate(() => {
    const root = document.querySelector('.workspace-section-actions');
    if (!root) return 0;
    const controls = Array.from(root.querySelectorAll<HTMLElement>('.primary-button'));
    return controls.filter((control) => {
      const style = window.getComputedStyle(control);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length;
  });

  expect(primaryCount).toBe(1);
});

test('route shell collapses header secondary actions behind overflow', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=overview');

  const toggle = page.locator('.header-actions-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh traces' })).toHaveCount(0);

  await toggle.click();
  await expect(page.getByRole('button', { name: 'Refresh traces' })).toBeVisible();
});

test('route shell navigation uses clear route intents and updates transitions', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=overview');

  await expect(page.getByRole('button', { name: 'Validate outcome intent' })).toHaveCount(0);
  await expect(page.getByLabel('Current location')).toContainText('Review');

  await page.getByRole('button', { name: 'Diagnose workspace route' }).click();
  await expect(page.getByLabel('Current location')).toContainText('Diagnose');
  await expect(page.locator('.analysis-tools-mode-switcher')).toBeVisible();

  await page.getByRole('button', { name: 'Configure workspace route' }).click();
  await expect(page.getByRole('heading', { name: 'Configure workspace' })).toBeVisible();
});

test('route shell mobile nav supports quick route switching', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initStorage(page);
  await page.goto('/?routes=1&route=overview');

  const navMetrics = await page.locator('.workspace-nav.route-shell').evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(navMetrics.scrollWidth).toBeGreaterThanOrEqual(navMetrics.clientWidth);

  await page.getByRole('button', { name: 'Triage workspace route' }).click();
  await expect(page.getByLabel('Current location')).toContainText('Triage');
});
