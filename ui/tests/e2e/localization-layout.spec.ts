import { expect, test } from '@playwright/test';

async function initLocalized(page: import('@playwright/test').Page, locale: 'en' | 'es') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.locale.v1', JSON.stringify(value));
  }, locale);
}

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const selectors = ['.header', '.toolbar', '.workspace-section-header', '.main'];
    return selectors
      .map((selector) => {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) return null;
        return {
          selector,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          overflow: node.scrollWidth - node.clientWidth,
        };
      })
      .filter((entry): entry is { selector: string; scrollWidth: number; clientWidth: number; overflow: number } => Boolean(entry))
      .filter((entry) => entry.overflow > 1);
  });

  expect(overflow).toEqual([]);
}

test('spanish locale layout does not overflow on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initLocalized(page, 'es');
  await page.goto('/');

  await expect(page.locator('.app')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test('spanish locale layout does not overflow on tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await initLocalized(page, 'es');
  await page.goto('/');

  await expect(page.locator('.app')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
