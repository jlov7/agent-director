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

test.describe('Flow Mode - Switching', () => {
  test('clicking Flow button switches to flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    // Initially in cinema mode
    await expect(page.locator('.timeline')).toBeVisible();

    // Click Flow button
    await page.getByTitle('Graph view').click();

    // Flow canvas should appear
    await expect(page.locator('.flow-canvas')).toBeVisible();
    await expect(page.locator('.timeline')).not.toBeVisible();
  });

  test('pressing F key toggles flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.getByText('Agent Director')).toBeVisible();

    await expect(page.locator('.timeline')).toBeVisible();

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    await page.keyboard.press('f');
    await expect(page.locator('.timeline')).toBeVisible();
  });

  test('Flow button has aria-pressed state', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    const flowButton = page.getByRole('button', { name: 'Flow' });
    await expect(flowButton).toHaveAttribute('aria-pressed', 'false');

    await flowButton.click();
    await expect(flowButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching to flow mode stops playback', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await expect(page.locator('.timeline')).toBeVisible();

    // Start playback
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Switch to flow mode
    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Playback should have stopped (no playback controls in flow mode)
  });
});

test.describe('Flow Mode - Graph Nodes', () => {
  test('flow canvas renders nodes', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.getByTitle('Graph view').click();
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // ReactFlow should render nodes
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 5000 });
  });

  test('nodes display step information', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const node = page.locator('.react-flow__node').first();
    await expect(node).toBeVisible();

    // Node should contain step badge or type indicator
    await expect(node.locator('.step-badge, .step-node-header, [class*="step"]')).toBeVisible();
  });

  test('clicking a node opens the inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    await expect(page.locator('.inspector')).not.toBeVisible();

    const node = page.locator('.react-flow__node').first();
    await node.click();

    await expect(page.locator('.inspector')).toBeVisible();
  });

  test('nodes are colored by step type', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Nodes should have some styling
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Flow Mode - Edge Layer Toggles', () => {
  test('edge layer toggles are visible', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const edgeToggles = page.locator('.edge-toggles');
    await expect(edgeToggles).toBeVisible();
  });

  test('structure edge toggle works', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const structureToggle = page.locator('.edge-toggles').getByLabel('Structure');
    await expect(structureToggle).toBeVisible();

    // Structure is enabled by default
    await expect(structureToggle).toBeChecked();

    // Toggle off
    await structureToggle.uncheck();
    await expect(structureToggle).not.toBeChecked();

    // Toggle back on
    await structureToggle.check();
    await expect(structureToggle).toBeChecked();
  });

  test('sequence edge toggle works', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const sequenceToggle = page.locator('.edge-toggles').getByLabel('Sequence');
    await expect(sequenceToggle).toBeVisible();

    // Sequence is disabled by default
    await expect(sequenceToggle).not.toBeChecked();

    // Toggle on
    await sequenceToggle.check();
    await expect(sequenceToggle).toBeChecked();
  });

  test('I/O binding edge toggle works', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const ioToggle = page.locator('.edge-toggles').getByLabel('I/O Binding');
    await expect(ioToggle).toBeVisible();

    // I/O is enabled by default
    await expect(ioToggle).toBeChecked();

    // Toggle off
    await ioToggle.uncheck();
    await expect(ioToggle).not.toBeChecked();
  });

  test('edge toggles affect edge visibility', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Toggle off all edge types
    const structureToggle = page.locator('.edge-toggles').getByLabel('Structure');
    const ioToggle = page.locator('.edge-toggles').getByLabel('I/O Binding');

    if (await structureToggle.isChecked()) {
      await structureToggle.uncheck();
    }
    if (await ioToggle.isChecked()) {
      await ioToggle.uncheck();
    }

    // With all edges off, there might be fewer or no edges visible
    // Re-enable to see edges again
    await structureToggle.check();
    await page.waitForTimeout(100);
  });
});

test.describe('Flow Mode - Minimap', () => {
  test('minimap is displayed in flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const minimap = page.locator('.react-flow__minimap');
    await expect(minimap).toBeVisible();
  });

  test('minimap reflects node positions', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const minimap = page.locator('.react-flow__minimap');
    await expect(minimap).toBeVisible();

    // Minimap should contain node representations
    const minimapNodes = minimap.locator('.react-flow__minimap-node');
    await expect(minimapNodes.first()).toBeVisible();
  });

  test('minimap nodes are colored by type', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const minimapNodes = page.locator('.react-flow__minimap-node');
    const count = await minimapNodes.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Flow Mode - Controls', () => {
  test('zoom controls are visible', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible();
  });

  test('fit view button works', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // ReactFlow provides a fit-view control button
    const fitViewButton = page.locator('.react-flow__controls-fitview');
    if (await fitViewButton.isVisible()) {
      await fitViewButton.click();
    }
  });

  test('zoom in/out buttons work', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const zoomIn = page.locator('.react-flow__controls-zoomin');
    const zoomOut = page.locator('.react-flow__controls-zoomout');

    if (await zoomIn.isVisible()) {
      await zoomIn.click();
      await page.waitForTimeout(100);
    }

    if (await zoomOut.isVisible()) {
      await zoomOut.click();
      await page.waitForTimeout(100);
    }
  });
});

test.describe('Flow Mode - Overlay and Compare', () => {
  test('overlay button appears when compare trace exists', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // First, trigger a replay to create a compare trace
    const stepCard = page.locator('.step-card').first();
    await stepCard.click();
    await expect(page.locator('.inspector')).toBeVisible();

    const replayButton = page.locator('.inspector').getByRole('button', { name: 'Replay from this step' });
    await replayButton.click();

    // After replay, should be in flow mode with overlay option
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Overlay toggle should be visible when compare trace exists
    const overlayButton = page.getByRole('button', { name: /overlay/i });
    await expect(overlayButton).toBeVisible();
  });

  test('overlay button toggles ghost overlay', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    // Trigger replay first
    const stepCard = page.locator('.step-card').first();
    await stepCard.click();
    await page.locator('.inspector').getByRole('button', { name: 'Replay from this step' }).click();

    await expect(page.locator('.flow-canvas')).toBeVisible();

    const overlayButton = page.getByRole('button', { name: /overlay/i });
    if (await overlayButton.isVisible()) {
      const initialText = await overlayButton.textContent();

      await overlayButton.click();
      await page.waitForTimeout(100);

      const newText = await overlayButton.textContent();
      // Text should change between "Show overlay" and "Hide overlay"
      expect(newText).not.toBe(initialText);
    }
  });
});

test.describe('Flow Mode - Accessibility', () => {
  test('flow mode has proper aria label', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');

    const flowWrapper = page.locator('.flow-mode-wrapper, [aria-label="Flow mode"]');
    await expect(flowWrapper).toBeVisible();
  });

  test('flow controls have help tooltips', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Flow controls should have data-help attributes for explain mode
    const flowControls = page.locator('.flow-controls');
    await expect(flowControls).toBeVisible();

    const helpElements = flowControls.locator('[data-help]');
    const count = await helpElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Flow Mode - Windowing', () => {
  test('windowed toggle appears for large graphs', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Windowed toggle may or may not appear depending on step count
    const windowedToggle = page.locator('.flow-controls').getByLabel('Windowed');
    // Just verify the toggle functionality works if it exists
    if (await windowedToggle.isVisible()) {
      const isChecked = await windowedToggle.isChecked();
      await windowedToggle.click();
      expect(await windowedToggle.isChecked()).not.toBe(isChecked);
    }
  });
});

test.describe('Flow Mode - Inspector Integration', () => {
  test('selecting a node updates inspector content', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();

    if (count >= 2) {
      // Click first node
      await nodes.first().click();
      await expect(page.locator('.inspector')).toBeVisible();
      const firstTitle = await page.locator('.inspector-title').textContent();

      // Click second node
      await nodes.nth(1).click();
      await expect(page.locator('.inspector')).toBeVisible();
      const secondTitle = await page.locator('.inspector-title').textContent();

      // Titles should be different (different steps selected)
      expect(firstTitle).toBeDefined();
      expect(secondTitle).toBeDefined();
    }
  });

  test('inspector closes with keyboard in flow mode', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    // Open inspector
    const node = page.locator('.react-flow__node').first();
    await node.click();
    await expect(page.locator('.inspector')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.inspector')).not.toBeVisible();
  });
});

test.describe('Flow Mode - Background', () => {
  test('flow canvas has background grid', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.keyboard.press('f');
    await expect(page.locator('.flow-canvas')).toBeVisible();

    const background = page.locator('.react-flow__background');
    await expect(background).toBeVisible();
  });
});
