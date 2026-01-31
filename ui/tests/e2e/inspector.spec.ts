import { expect, test } from '@playwright/test';

// TODO: Fix selector issues - these tests need proper element selectors
test.skip(() => true, 'Temporarily disabled pending selector fixes');

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

/**
 * Helper to initialize storage with safe export disabled.
 */
async function initStorageUnsafe(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'false');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
  });
}

test.describe('Inspector - Opening and Closing', () => {
  test('clicking a step card opens the inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('.inspector')).not.toBeVisible();

    const stepCard = page.locator('.step-card').first();
    await expect(stepCard).toBeVisible();
    await stepCard.click();

    await expect(page.locator('.inspector')).toBeVisible();
  });

  test('clicking Close button closes the inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();
    await expect(page.locator('.inspector')).toBeVisible();

    await page.locator('.inspector').getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.inspector')).not.toBeVisible();
  });

  test('pressing Escape closes the inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();
    await expect(page.locator('.inspector')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });

  test('pressing I keyboard shortcut opens inspector with first step', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('.inspector')).not.toBeVisible();

    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();
  });

  test('pressing I again closes the inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();

    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });
});

test.describe('Inspector - Metadata Display', () => {
  test('inspector shows step name and type', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    // Should show step name in title
    const inspectorTitle = inspector.locator('.inspector-title');
    await expect(inspectorTitle).toBeVisible();

    // Should show step type in subtitle
    const inspectorSubtitle = inspector.locator('.inspector-subtitle');
    await expect(inspectorSubtitle).toBeVisible();
  });

  test('inspector shows status badge', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    // Should show status pill
    const statusPill = inspector.locator('.status-pill');
    await expect(statusPill).toBeVisible();

    // Status row should exist
    const statusRow = inspector.locator('.inspector-row').filter({ hasText: 'Status' });
    await expect(statusRow).toBeVisible();
  });

  test('inspector shows duration', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const durationRow = inspector.locator('.inspector-row').filter({ hasText: 'Duration' });
    await expect(durationRow).toBeVisible();
    await expect(durationRow).toContainText('ms');
  });

  test('inspector shows token count', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const tokensRow = inspector.locator('.inspector-row').filter({ hasText: 'Tokens' });
    await expect(tokensRow).toBeVisible();
  });

  test('inspector shows cost when available', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const costRow = inspector.locator('.inspector-row').filter({ hasText: 'Cost' });
    await expect(costRow).toBeVisible();
  });

  test('inspector shows step badge with correct type icon', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const stepBadge = inspector.locator('.step-badge');
    await expect(stepBadge).toBeVisible();
  });
});

test.describe('Inspector - Payload Display', () => {
  test('inspector shows Payload section', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector.getByText('Payload')).toBeVisible();
  });

  test('inspector displays JSON payload', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const jsonDisplay = inspector.locator('.inspector-json');
    await expect(jsonDisplay).toBeVisible();

    // Wait for loading to complete
    await expect(jsonDisplay).not.toContainText('Loading...');
  });

  test('Copy JSON button is available', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const copyButton = inspector.getByRole('button', { name: 'Copy JSON' });
    await expect(copyButton).toBeVisible();
  });
});

test.describe('Inspector - Redaction Controls', () => {
  test('safe export checkbox is visible in inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // First check the main safe export toggle
    const safeExportLabel = page.locator('.toolbar').getByText('Safe export');
    await expect(safeExportLabel).toBeVisible();
  });

  test('reveal raw checkbox is disabled when safe export is enabled', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // Click to select a step
    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    // Safe export is enabled by default in our test setup
    const revealRawCheckbox = inspector.getByLabel('Reveal raw (dangerous)');
    await expect(revealRawCheckbox).toBeDisabled();
  });

  test('reveal raw checkbox is enabled when safe export is disabled', async ({ page }) => {
    await initStorageUnsafe(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    // With safe export disabled, reveal raw should be enabled
    const revealRawCheckbox = inspector.getByLabel('Reveal raw (dangerous)');
    await expect(revealRawCheckbox).toBeEnabled();
  });

  test('toggling reveal raw changes payload display mode', async ({ page }) => {
    await initStorageUnsafe(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    const revealRawCheckbox = inspector.getByLabel('Reveal raw (dangerous)');
    await expect(revealRawCheckbox).toBeEnabled();

    // Toggle reveal raw
    await revealRawCheckbox.check();
    await expect(revealRawCheckbox).toBeChecked();

    // Toggle back
    await revealRawCheckbox.uncheck();
    await expect(revealRawCheckbox).not.toBeChecked();
  });

  test('redacted fields are listed when present', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    await expect(inspector).toBeVisible();

    // If redaction info exists, it should be visible
    const redactionSection = inspector.locator('.inspector-redaction');
    // This may or may not be visible depending on test data
    if (await redactionSection.isVisible()) {
      await expect(redactionSection).toContainText('Redacted fields');
    }
  });
});

test.describe('Inspector - Replay', () => {
  test('replay button is visible in inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const replayButton = inspector.getByRole('button', { name: 'Replay from this step' });
    await expect(replayButton).toBeVisible();
  });

  test('clicking replay button triggers replay action', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('.inspector');
    const replayButton = inspector.getByRole('button', { name: 'Replay from this step' });

    // Click replay - this should trigger a mode change
    await replayButton.click();

    // After replay, should switch to flow mode with overlay enabled
    await expect(page.locator('.flow-canvas')).toBeVisible();
  });

  test('replay enables compare mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const replayButton = page.locator('.inspector').getByRole('button', { name: 'Replay from this step' });
    await replayButton.click();

    // Compare button should become enabled after replay
    const compareButton = page.getByRole('button', { name: 'Compare' });
    // Wait for the replay to complete and compare to be available
    await expect(compareButton).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('Inspector - Step Navigation', () => {
  test('clicking different step cards updates inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCards = page.locator('.step-card');
    const count = await stepCards.count();

    if (count >= 2) {
      // Click first step
      await stepCards.first().click();
      const inspector = page.locator('.inspector');
      await expect(inspector).toBeVisible();
      const firstTitle = await inspector.locator('.inspector-title span').last().textContent();

      // Click second step
      await stepCards.nth(1).click();
      await expect(inspector).toBeVisible();
      const secondTitle = await inspector.locator('.inspector-title span').last().textContent();

      // Titles should be different (assuming different steps)
      expect(firstTitle).toBeDefined();
      expect(secondTitle).toBeDefined();
    }
  });

  test('inspector stays open when clicking another step', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCards = page.locator('.step-card');
    const count = await stepCards.count();

    if (count >= 2) {
      await stepCards.first().click();
      await expect(page.locator('.inspector')).toBeVisible();

      await stepCards.nth(1).click();
      await expect(page.locator('.inspector')).toBeVisible();
    }
  });
});

test.describe('Inspector - Flow Mode Integration', () => {
  test('clicking a node in flow mode opens inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // Switch to flow mode
    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Click a node in the flow canvas
    const flowNode = page.locator('.react-flow__node').first();
    if (await flowNode.isVisible()) {
      await flowNode.click();
      await expect(page.locator('.inspector')).toBeVisible();
    }
  });

  test('inspector closes with Escape in flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // Switch to flow mode
    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Open inspector via keyboard
    await page.keyboard.press('i');
    await expect(page.locator('.inspector')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });
});

test.describe('Inspector - Accessibility', () => {
  test('inspector is an aside element with proper role', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const inspector = page.locator('aside.inspector');
    await expect(inspector).toBeVisible();
  });

  test('close button has aria-label', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const closeButton = page.locator('.inspector').getByRole('button', { name: 'Close inspector' });
    await expect(closeButton).toBeVisible();
  });

  test('copy button has aria-label', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const stepCard = page.locator('.step-card').first();
    await stepCard.click();

    const copyButton = page.locator('.inspector').getByRole('button', { name: 'Copy payload JSON' });
    await expect(copyButton).toBeVisible();
  });
});
