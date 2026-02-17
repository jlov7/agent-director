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

test.describe('Flow mode', () => {
  test('switches between cinema and flow via controls', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await expect(page.locator('.timeline')).toBeVisible();
    await page.getByTitle('Graph view').click();
    await expect(page.locator('.flow-canvas')).toBeVisible();

    await page.keyboard.press('f');
    await expect(page.locator('.timeline')).toBeVisible();
  });

  test('renders nodes and edge toggles', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');

    await page.getByTitle('Graph view').click();
    await expect(page.locator('.flow-canvas')).toBeVisible();
    await expect(page.locator('.react-flow__node:visible').first()).toBeVisible();

    await expect(page.getByLabel('Structure')).toBeVisible();
    await expect(page.getByLabel('Sequence')).toBeVisible();
    await expect(page.getByLabel('I/O Binding')).toBeVisible();
  });

  test('edge layer toggles are interactive', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await page.getByTitle('Graph view').click();

    const structure = page.getByLabel('Structure');
    const sequence = page.getByLabel('Sequence');

    await expect(structure).toBeChecked();
    await expect(sequence).not.toBeChecked();

    await structure.uncheck();
    await expect(structure).not.toBeChecked();

    await sequence.check();
    await expect(sequence).toBeChecked();
  });

  test('clicking a flow node opens inspector', async ({ page }) => {
    await initStorage(page);
    await page.goto('/');
    await page.getByTitle('Graph view').click();

    const firstNode = page.locator('.react-flow__node').first();
    await expect(firstNode).toBeAttached();
    await firstNode.click({ force: true });
    await expect(page.getByRole('button', { name: 'Close inspector' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Close inspector' })).not.toBeVisible();
  });
});
