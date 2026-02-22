import { expect, test } from '@playwright/test';

async function primeRouteShell(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'false');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
  });
}

async function noHorizontalOverflow(page: import('@playwright/test').Page) {
  const probe = await page.evaluate(() => {
    const htmlOverflow = document.documentElement.scrollWidth - window.innerWidth > 1;
    const bodyOverflow = document.body.scrollWidth - window.innerWidth > 1;
    return {
      htmlOverflow,
      bodyOverflow,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(probe.htmlOverflow, 'overflow on documentElement').toBe(false);
  expect(probe.bodyOverflow, 'overflow on body').toBe(false);
}

test.describe('viewport hardening', () => {
  test('layout is stable across 100/125/150 zoom levels', async ({ page }) => {
    await primeRouteShell(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeAttached();

    for (const zoom of [1, 1.25, 1.5]) {
      await page.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoom);
      await noHorizontalOverflow(page);
    }
  });

  test('mobile orientation swaps keep primary controls in bounds', async ({ page }) => {
    await primeRouteShell(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 844, height: 390 });
    await noHorizontalOverflow(page);
  });

  test('tablet orientation swaps keep route-shell readable', async ({ page }) => {
    await primeRouteShell(page);
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/');
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 1366, height: 1024 });
    await noHorizontalOverflow(page);
  });

  test('notch-safe profile keeps controls inside visual viewport', async ({ page }) => {
    await primeRouteShell(page);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/');

    const clippedControls = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const controls = Array.from(document.querySelectorAll<HTMLElement>('button, a, input, select')).slice(0, 80);
      return controls
        .map((el) => {
          const r = el.getBoundingClientRect();
          const id = el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName;
          if (id === 'Skip to main content') return { id, clipped: false };
          if (r.bottom < 0 || r.top > vh) return { id, clipped: false };
          const clipped = r.left < -1 || r.right > vw + 1;
          return { id, clipped };
        })
        .filter((item) => item.clipped);
    });

    expect(clippedControls).toEqual([]);
  });
});
