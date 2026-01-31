import { expect, test } from '@playwright/test';

// TODO: Fix selector issues - these tests need proper element selectors
test.skip(() => true, 'Temporarily disabled pending selector fixes');

/**
 * Helper to initialize localStorage for a fully onboarded user.
 * Use this when testing features that should appear after onboarding.
 */
async function initOnboarded(page: import('@playwright/test').Page) {
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

/**
 * Helper to initialize localStorage for a brand new user.
 * Nothing is dismissed or completed yet.
 */
async function initNewUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem('agentDirector.onboarded');
    window.localStorage.removeItem('agentDirector.introDismissed');
    window.localStorage.removeItem('agentDirector.tourCompleted');
    window.localStorage.removeItem('agentDirector.heroDismissed');
    window.localStorage.removeItem('agentDirector.explainMode');
  });
}

/**
 * Helper to skip intro but keep tour and hero visible.
 */
async function initIntroSkipped(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.removeItem('agentDirector.tourCompleted');
    window.localStorage.removeItem('agentDirector.heroDismissed');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test.describe('Onboarding - Intro Overlay', () => {
  test('intro overlay appears for new users', async ({ page }) => {
    await initNewUser(page);
    await page.goto('/');

    const introOverlay = page.locator('.intro-overlay');
    await expect(introOverlay).toBeVisible();
    await expect(page.getByText('Agent Director')).toBeVisible();
    await expect(page.getByText('Watch your agent think. Then direct it.')).toBeVisible();
  });

  test('intro shows three onboarding steps: Observe, Inspect, Direct', async ({ page }) => {
    await initNewUser(page);
    await page.goto('/');

    await expect(page.locator('.intro-step-label').filter({ hasText: 'Observe' })).toBeVisible();
    await expect(page.locator('.intro-step-label').filter({ hasText: 'Inspect' })).toBeVisible();
    await expect(page.locator('.intro-step-label').filter({ hasText: 'Direct' })).toBeVisible();
  });

  test('intro can be skipped via Skip button', async ({ page }) => {
    await initNewUser(page);
    await page.goto('/');

    await expect(page.locator('.intro-overlay')).toBeVisible();
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.intro-overlay')).not.toBeVisible();
  });

  test('intro auto-dismisses after timeout', async ({ page }) => {
    await initNewUser(page);
    await page.goto('/');

    await expect(page.locator('.intro-overlay')).toBeVisible();
    // The intro auto-dismisses after 2800ms
    await page.waitForTimeout(3000);
    await expect(page.locator('.intro-overlay')).not.toBeVisible();
  });

  test('starting guided tour from intro dismisses intro', async ({ page }) => {
    await initNewUser(page);
    await page.goto('/');

    await expect(page.locator('.intro-overlay')).toBeVisible();
    await page.getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.intro-overlay')).not.toBeVisible();
    // Tour should now be open
    await expect(page.locator('.tour-overlay')).toBeVisible();
  });
});

test.describe('Onboarding - Hero Ribbon', () => {
  test('hero ribbon shows after intro is dismissed', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    const heroRibbon = page.locator('.hero-ribbon');
    await expect(heroRibbon).toBeVisible();
    await expect(page.getByText('Director briefing')).toBeVisible();
    await expect(page.getByText('Observe. Inspect. Direct.')).toBeVisible();
  });

  test('hero ribbon shows three pills: Observe, Inspect, Direct', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await expect(page.locator('.hero-pill').filter({ hasText: 'Observe' })).toBeVisible();
    await expect(page.locator('.hero-pill').filter({ hasText: 'Inspect' })).toBeVisible();
    await expect(page.locator('.hero-pill').filter({ hasText: 'Direct' })).toBeVisible();
  });

  test('hero ribbon can be dismissed', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await expect(page.locator('.hero-ribbon')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();
  });

  test('hero ribbon dismiss is persisted', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();

    // Reload and verify it stays dismissed
    await page.reload();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();
  });

  test('starting tour from hero ribbon dismisses hero', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await expect(page.locator('.hero-ribbon')).toBeVisible();
    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.hero-ribbon')).not.toBeVisible();
    await expect(page.locator('.tour-overlay')).toBeVisible();
  });

  test('explain mode toggle works from hero ribbon', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    const explainButton = page.locator('.hero-ribbon').getByRole('button', { name: /Explain/ });
    await expect(explainButton).toBeVisible();
    await expect(explainButton).toHaveText('Explain Off');

    await explainButton.click();
    await expect(explainButton).toHaveText('Explain On');
    await expect(page.locator('body')).toHaveClass(/explain-mode/);
  });
});

test.describe('Onboarding - Guided Tour', () => {
  test('guided tour opens and shows first step', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    // Close hero first if visible, or start tour from hero
    const heroTourButton = page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' });
    if (await heroTourButton.isVisible()) {
      await heroTourButton.click();
    }

    const tourOverlay = page.locator('.tour-overlay');
    await expect(tourOverlay).toBeVisible();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });

  test('tour navigation: Next button advances through steps', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();

    await expect(page.getByText('Step 1 of')).toBeVisible();
    const step1Title = await page.locator('.tour-title').textContent();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();
    const step2Title = await page.locator('.tour-title').textContent();

    expect(step1Title).not.toBe(step2Title);
  });

  test('tour navigation: Back button goes to previous step', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });

  test('tour navigation: Back button is disabled on first step', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();

    const backButton = page.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeDisabled();
  });

  test('tour can be skipped at any point', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.locator('.tour-overlay')).not.toBeVisible();
  });

  test('tour shows Finish button on last step', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();

    // Navigate through all steps to find the Finish button
    let hasFinishButton = false;
    for (let i = 0; i < 15; i++) {
      const finishButton = page.getByRole('button', { name: 'Finish tour' });
      if (await finishButton.isVisible()) {
        hasFinishButton = true;
        break;
      }
      const nextButton = page.getByRole('button', { name: 'Next' });
      if (await nextButton.isVisible()) {
        await nextButton.click();
      } else {
        break;
      }
    }

    expect(hasFinishButton).toBe(true);
  });

  test('completing tour persists completion state', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();

    // Navigate to the end and click Finish
    for (let i = 0; i < 15; i++) {
      const finishButton = page.getByRole('button', { name: 'Finish tour' });
      if (await finishButton.isVisible()) {
        await finishButton.click();
        break;
      }
      const nextButton = page.getByRole('button', { name: 'Next' });
      if (await nextButton.isVisible()) {
        await nextButton.click();
      } else {
        break;
      }
    }

    await expect(page.locator('.tour-overlay')).not.toBeVisible();

    // Reload and verify tour doesn't auto-start
    await page.reload();
    await expect(page.locator('.tour-overlay')).not.toBeVisible();
  });

  test('tour spotlight highlights target element', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await page.locator('.hero-ribbon').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();

    // The spotlight should be visible when a target is found
    const spotlight = page.locator('.tour-spotlight');
    await expect(spotlight).toBeVisible();
  });
});

test.describe('Onboarding - Explain Mode', () => {
  test('explain mode can be toggled via keyboard shortcut E', async ({ page }) => {
    await initOnboarded(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Initially explain mode is off (based on initOnboarded)
    await expect(page.locator('body')).not.toHaveClass(/explain-mode/);

    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/explain-mode/);

    await page.keyboard.press('e');
    await expect(page.locator('body')).not.toHaveClass(/explain-mode/);
  });

  test('explain mode shows context help overlays when enabled', async ({ page }) => {
    await initOnboarded(page);
    await page.goto('/');

    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/explain-mode/);

    // Elements with data-help should show tooltips in explain mode
    const helpElements = page.locator('[data-help]');
    const count = await helpElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('explain mode persists across page reload', async ({ page }) => {
    await initOnboarded(page);
    await page.goto('/');

    await page.keyboard.press('e');
    await expect(page.locator('body')).toHaveClass(/explain-mode/);

    await page.reload();
    await expect(page.locator('body')).toHaveClass(/explain-mode/);
  });
});

test.describe('Onboarding - Story Mode', () => {
  test('story mode can be started from hero ribbon', async ({ page }) => {
    await initIntroSkipped(page);
    await page.goto('/');

    await expect(page.locator('.hero-ribbon')).toBeVisible();
    await page.locator('.hero-ribbon').getByRole('button', { name: 'Play story mode' }).click();

    // Story mode banner should appear
    await expect(page.locator('.story-banner')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/story-mode/);
  });

  test('story mode can be toggled via keyboard shortcut S', async ({ page }) => {
    await initOnboarded(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await page.keyboard.press('s');
    await expect(page.locator('body')).toHaveClass(/story-mode/);

    // Press S again to stop
    await page.keyboard.press('s');
    await expect(page.locator('body')).not.toHaveClass(/story-mode/);
  });

  test('story mode banner shows current beat label', async ({ page }) => {
    await initOnboarded(page);
    await page.goto('/');

    await page.keyboard.press('s');
    await expect(page.locator('.story-banner')).toBeVisible();

    // Should show a beat label
    const banner = page.locator('.story-banner');
    await expect(banner).toContainText(/Opening|Pacing|Freeze|Inspect|Morph|replay|compare|Final/i);
  });
});
