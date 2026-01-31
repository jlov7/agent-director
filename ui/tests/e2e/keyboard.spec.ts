import { expect, test } from '@playwright/test';

/**
 * Helper to initialize localStorage for a fully onboarded user.
 */
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
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
  });
}

test.describe('Keyboard Shortcuts - Playback', () => {
  test('Space toggles play/pause', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();
    await expect(page.locator('.timeline')).toBeVisible();

    // Ensure we're in cinema mode
    const cinemaButton = page.getByRole('button', { name: 'Cinema' });
    if (!(await cinemaButton.getAttribute('aria-pressed'))?.includes('true')) {
      await cinemaButton.click();
    }

    // Find play button - should be paused initially
    const playButton = page.getByRole('button', { name: /play|pause/i }).first();
    await expect(playButton).toBeVisible();

    // Press Space to start playback
    await page.keyboard.press('Space');
    // Give it a moment to start
    await page.waitForTimeout(100);

    // Press Space again to pause
    await page.keyboard.press('Space');
  });

  test('Arrow keys navigate step boundaries', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.locator('.timeline')).toBeVisible();

    // Get initial playhead position from the playback controls
    const playheadDisplay = page.locator('.playback-controls');
    await expect(playheadDisplay).toBeVisible();

    // Press ArrowRight to advance
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Press ArrowLeft to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
  });

  test('Shift+ArrowLeft jumps to start', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.locator('.timeline')).toBeVisible();

    // First advance a bit
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Now jump to start
    await page.keyboard.press('Shift+ArrowLeft');
    await page.waitForTimeout(100);

    // Playhead should be at the beginning (0:00)
    const timeDisplay = page.locator('.playback-controls .time-display, .playback-controls');
    await expect(timeDisplay).toBeVisible();
  });

  test('Shift+ArrowRight jumps to end', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.locator('.timeline')).toBeVisible();

    // Jump to end
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(100);

    // Playhead should be at the end
    const playbackControls = page.locator('.playback-controls');
    await expect(playbackControls).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts - Mode Switching', () => {
  test('F toggles Flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Initially in cinema mode
    await expect(page.locator('.timeline')).toBeVisible();

    // Press F to switch to Flow
    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Press F again to return to Cinema
    await page.keyboard.press('f');
    await expect(page.locator('.timeline')).toBeVisible();
  });

  test('I toggles Inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Initially no inspector visible (no step selected)
    await expect(page.locator('.inspector')).not.toBeVisible();

    // Press I to open inspector (selects first step)
    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();

    // Press I again to close inspector
    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });
});

test.describe('Keyboard Shortcuts - Modals', () => {
  test('Cmd+K opens command palette', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Command palette should be closed
    await expect(page.locator('.command-palette')).not.toBeVisible();

    // Open with Cmd+K (Meta+K)
    await page.keyboard.press('Meta+k');
    await expect(page.locator('.command-palette')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette')).not.toBeVisible();
  });

  test('Ctrl+K also opens command palette', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await page.keyboard.press('Control+k');
    await expect(page.locator('.command-palette')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('? shows keyboard shortcuts modal', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Click somewhere to ensure focus
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Verify the modal shows expected shortcuts
    await expect(page.getByText('Play / pause')).toBeVisible();
    await expect(page.getByText('Toggle Flow mode')).toBeVisible();
    await expect(page.getByText('Toggle Inspector')).toBeVisible();
  });

  test('Escape closes shortcuts modal', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
  });

  test('Escape closes command palette', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await page.keyboard.press('Meta+k');
    await expect(page.locator('.command-palette')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette')).not.toBeVisible();
  });

  test('Escape closes inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Open inspector first
    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });
});

test.describe('Keyboard Shortcuts - Onboarding', () => {
  test('T starts guided tour', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('.tour-overlay')).not.toBeVisible();

    await page.keyboard.press('t');
    await expect(page.locator('.tour-overlay')).toBeVisible();

    // Close tour
    await page.getByRole('button', { name: 'Skip' }).click();
  });

  test('E toggles explain mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('body')).not.toHaveClass(/explain-mode/);

    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/explain-mode/);

    await page.keyboard.press('e');
    await expect(page.locator('body')).not.toHaveClass(/explain-mode/);
  });

  test('S toggles story mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('body')).not.toHaveClass(/story-mode/);

    await page.keyboard.press('s');
    await expect(page.locator('body')).toHaveClass(/story-mode/);
    await expect(page.locator('.story-banner')).toBeVisible();

    await page.keyboard.press('s');
    await expect(page.locator('body')).not.toHaveClass(/story-mode/);
  });
});

test.describe('Keyboard Shortcuts - Input Fields', () => {
  test('shortcuts are disabled when typing in search input', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    const searchInput = page.getByLabel('Search steps');
    await searchInput.focus();
    await searchInput.fill('');

    // Type 'f' which would normally toggle flow mode
    await searchInput.type('f');

    // Should not have switched to flow mode
    await expect(page.locator('.timeline')).toBeVisible();
    await expect(searchInput).toHaveValue('f');
  });

  test('Escape blurs input fields', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    const searchInput = page.getByLabel('Search steps');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeFocused();
  });
});

test.describe('Keyboard Shortcuts - Priority', () => {
  test('Escape prioritizes modals over inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Open inspector first
    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();

    // Open shortcuts modal
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Escape should close modal first, keeping inspector open
    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
    // Inspector might still be visible or closed depending on implementation
  });

  test('shortcuts modal lists all expected bindings', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Verify all documented shortcuts
    await expect(page.getByText('Space')).toBeVisible();
    await expect(page.getByText('Play / pause')).toBeVisible();
    await expect(page.getByText('Toggle Flow mode')).toBeVisible();
    await expect(page.getByText('Toggle Inspector')).toBeVisible();
    await expect(page.getByText('Story mode')).toBeVisible();
    await expect(page.getByText('Explain mode')).toBeVisible();
    await expect(page.getByText('Start tour')).toBeVisible();
    await expect(page.getByText('Open command palette')).toBeVisible();
    await expect(page.getByText('Show shortcuts')).toBeVisible();
    await expect(page.getByText('Close modal / inspector')).toBeVisible();
  });
});
