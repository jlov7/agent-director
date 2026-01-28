import { expect, test } from '@playwright/test';

test('ux review checklist walkthrough', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
  });

  await page.goto('/');
  await expect(page.getByText('Agent Director')).toBeVisible();
  await expect(page.locator('.timeline')).toBeVisible();

  await test.step('Search and filter steps', async () => {
    await page.getByLabel('Search steps').fill('plan');
    await expect(page.locator('.step-card').first()).toBeVisible();
    await page.getByLabel('Filter by step type').selectOption('decision');
    await page.getByLabel('Filter by step type').selectOption('all');
    await page.getByLabel('Search steps').fill('');
  });

  await test.step('Inspect a step and verify redaction controls', async () => {
    await page.locator('.step-card').first().click();
    await expect(page.locator('.inspector')).toBeVisible();
    await expect(page.getByText('Payload')).toBeVisible();
    await page.getByLabel('Safe export').check();
    await expect(page.getByLabel('Reveal raw (dangerous)')).toBeDisabled();
  });

  await test.step('Replay from a step and review Flow overlay', async () => {
    await page.getByRole('button', { name: 'Replay from this step' }).click();
    await expect(page.locator('.flow-canvas')).toBeVisible();
    const overlayButton = page.getByRole('button', { name: /overlay/i });
    await expect(overlayButton).toBeVisible();
    await overlayButton.click();
  });

  await test.step('Compare run side-by-side', async () => {
    await page.getByRole('button', { name: 'Compare' }).click();
    await expect(page.locator('.compare-grid')).toBeVisible();
  });

  await test.step('Open keyboard shortcuts', async () => {
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
  });
});
