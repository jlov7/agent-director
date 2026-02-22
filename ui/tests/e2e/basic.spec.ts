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
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    window.localStorage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(true));
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
  await expect(page.locator('.workspace-route-transition')).toContainText('Opened Review route');

  await page.getByRole('button', { name: 'Diagnose workspace route' }).click();
  await expect(page.getByLabel('Current location')).toContainText('Diagnose');
  await expect(page.locator('.workspace-route-transition')).toContainText('Switched from Review to Diagnose');
  await expect(page.locator('.analysis-tools-mode-switcher')).toBeVisible();

  await page.getByRole('button', { name: 'Configure workspace route' }).click();
  await expect(page.getByRole('heading', { name: 'Configure workspace' })).toBeVisible();
});

test('route shell keeps workspace secondary menu under four visible actions by default', async ({ page }) => {
  await initStorage(page);
  await page.goto('/?routes=1&route=overview');

  await page.getByRole('button', { name: 'Workspace tools' }).click();
  const menuItemCount = await page.locator('#workspace-actions-menu [role="menuitem"]').count();
  expect(menuItemCount).toBeLessThanOrEqual(4);
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

test('route shell surfaces explicit route purpose with one dominant viewport CTA across all routes', async ({ page }) => {
  await initStorage(page);
  const routes = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

  for (const route of routes) {
    await page.goto(`/?routes=1&route=${route}`);
    await expect(page.getByText('Route outcome')).toBeVisible();
    await expect(page.locator('.route-outcome-subcopy')).toBeVisible();

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
  }
});

test('route shell keeps heading hierarchy consistent across route cards', async ({ page }) => {
  await initStorage(page);
  const routes = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

  for (const route of routes) {
    await page.goto(`/?routes=1&route=${route}`);
    await expect(page.getByText('Route outcome')).toBeVisible();
    const headingSummary = await page.evaluate(() => ({
      h3: document.querySelectorAll('.workspace-route-shell h3').length,
      h4: document.querySelectorAll('.workspace-route-shell h4').length,
    }));
    expect(headingSummary.h3).toBeGreaterThan(0);
    expect(headingSummary.h4).toBe(0);
  }
});

test('route shell keeps route outcome copy within readability length guardrail', async ({ page }) => {
  await initStorage(page);
  const routes = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

  for (const route of routes) {
    await page.goto(`/?routes=1&route=${route}`);
    const outcomeText = (await page.locator('.route-outcome-card p').first().textContent()) ?? '';
    expect(outcomeText.trim().length).toBeLessThanOrEqual(95);
  }
});

test('route shell keeps key route copy blocks within readability guardrails', async ({ page }) => {
  await initStorage(page);
  const routes = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

  for (const route of routes) {
    await page.goto(`/?routes=1&route=${route}`);
    const readability = await page.evaluate(() => {
      const stateCopy = Array.from(document.querySelectorAll<HTMLElement>('.route-state-card p')).map((node) =>
        (node.textContent ?? '').trim()
      );
      const journeyOutcomeCopy = Array.from(document.querySelectorAll<HTMLElement>('.journey-action-outcome')).map((node) =>
        (node.textContent ?? '').trim()
      );
      const journeyWhyCopy = Array.from(document.querySelectorAll<HTMLElement>('.journey-action-why')).map((node) =>
        (node.textContent ?? '').trim()
      );
      return {
        maxStateLength: Math.max(0, ...stateCopy.map((value) => value.length)),
        maxOutcomeLength: Math.max(0, ...journeyOutcomeCopy.map((value) => value.length)),
        maxWhyLength: Math.max(0, ...journeyWhyCopy.map((value) => value.length)),
      };
    });
    expect(readability.maxStateLength).toBeLessThanOrEqual(140);
    expect(readability.maxOutcomeLength).toBeLessThanOrEqual(120);
    expect(readability.maxWhyLength).toBeLessThanOrEqual(120);
  }
});

test('support diagnostics entry stays hidden outside failure or friction moments', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
  });
  await page.goto('/?routes=1&route=settings');

  await expect(page.getByRole('button', { name: 'Open support diagnostics' })).toHaveCount(0);
});
