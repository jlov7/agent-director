import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');

async function initExperienced(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
  });
}

async function initFirstRun(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.introDismissed', 'false');
    window.localStorage.setItem('agentDirector.heroDismissed', 'false');
    window.localStorage.setItem('agentDirector.tourCompleted', 'false');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
  });
}

test.describe('Deep UX audit probes', () => {
  test('first-run intro requires explicit action and does not auto-dismiss', async ({ page }) => {
    await initFirstRun(page);
    await page.goto('/');
    await expect(page.locator('.intro-overlay')).toBeVisible();
    await page.waitForTimeout(4000);
    await expect(page.locator('.intro-overlay')).toBeVisible();
  });

  test('guided tour traps focus and escape closes it', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    await page.keyboard.press('t');
    await expect(page.locator('.tour-overlay')).toBeVisible();

    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
    }

    const inTour = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(active?.closest('.tour-card'));
    });
    expect(inTour).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.tour-overlay')).not.toBeVisible();
  });

  test('help page docs link availability', async ({ page }) => {
    await page.goto('/help.html');
    const href = await page.getByRole('link', { name: 'Full docs index' }).getAttribute('href');
    const response = await page.request.get(href || '/docs/index.md');
    expect(href).toBe('/docs/index.md');
    expect(response.status()).toBe(200);
  });

  test('mobile quick-actions visibility on first viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await initExperienced(page);
    await page.goto('/');

    const toggle = page.locator('.quick-actions-toggle');
    const visible = await toggle.isVisible();
    const box = await toggle.boundingBox();
    const inViewport = !!box && box.y >= 0 && box.y + box.height <= 844;
    expect(visible).toBe(true);
    expect(inViewport).toBe(true);
  });

  test('mobile quick rail supports fast orientation between timeline, flow, and validate', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await initExperienced(page);
    await page.goto('/');

    const rail = page.locator('.mobile-quick-rail');
    await expect(rail).toBeVisible();

    await rail.getByRole('button', { name: 'Open flow graph mode' }).click();
    await expect(page.locator('.flow-canvas')).toBeVisible();

    await rail.getByRole('button', { name: 'Open validation mode' }).click();
    await expect(page.getByRole('heading', { name: 'Counterfactual Replay Matrix' })).toBeVisible();

    await rail.getByRole('button', { name: 'Open timeline mode' }).click();
    await expect(page.locator('.timeline')).toBeVisible();
  });

  test('a11y scan for intro and guided tour surfaces', async ({ page }) => {
    await initFirstRun(page);
    await page.goto('/');
    await expect(page.locator('.intro-overlay')).toBeVisible();

    await page.addScriptTag({ path: axeSourcePath });
    const introResults = await page.evaluate(async () => {
      const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: Array<{ id: string }> }> } }).axe;
      if (!axe) return { violations: [{ id: 'axe-unavailable' }] };
      return axe.run('.intro-overlay');
    });
    expect(introResults.violations).toEqual([]);

    await page.locator('.intro-overlay').getByRole('button', { name: 'Start guided tour' }).click();
    await expect(page.locator('.tour-overlay')).toBeVisible();

    const tourResults = await page.evaluate(async () => {
      const axe = (window as Window & { axe?: { run: (context?: string) => Promise<{ violations: Array<{ id: string }> }> } }).axe;
      if (!axe) return { violations: [{ id: 'axe-unavailable' }] };
      return axe.run('.tour-overlay');
    });
    expect(tourResults.violations).toEqual([]);
  });

  test('semantic landmark structure is present on app shell', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    const landmarks = await page.evaluate(() => ({
      hasHeader: Boolean(document.querySelector('header')),
      hasMain: Boolean(document.querySelector('main')),
      navCount: document.querySelectorAll('nav').length,
      h1Count: document.querySelectorAll('h1').length,
    }));

    expect(landmarks.hasHeader).toBe(true);
    expect(landmarks.hasMain).toBe(true);
    expect(landmarks.navCount).toBeGreaterThan(0);
    expect(landmarks.h1Count).toBeGreaterThan(0);
  });

  test('visible interactive controls expose accessible names', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    const unnamedControls = await page.evaluate(() => {
      const selector = [
        'button',
        'a[href]',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="switch"]',
        '[role="combobox"]',
      ].join(',');

      const isVisible = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const getLabelledByText = (element: HTMLElement) => {
        const ids = (element.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean);
        return ids
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' ')
          .trim();
      };

      const getNativeLabelText = (element: HTMLElement) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          return Array.from(element.labels ?? [])
            .map((label) => label.textContent?.trim() ?? '')
            .join(' ')
            .trim();
        }
        return '';
      };

      const controls = Array.from(document.querySelectorAll(selector)).filter((node) => node instanceof HTMLElement) as HTMLElement[];
      const unnamed = controls
        .filter((node) => node.closest('.app'))
        .filter((node) => isVisible(node))
        .map((node) => {
          const text = (node.textContent ?? '').trim();
          const ariaLabel = (node.getAttribute('aria-label') ?? '').trim();
          const nativeLabel = getNativeLabelText(node);
          const title = (node.getAttribute('title') ?? '').trim();
          const placeholder = (node.getAttribute('placeholder') ?? '').trim();
          const labelledByText = getLabelledByText(node);
          const name = [ariaLabel, labelledByText, nativeLabel, text, title, placeholder].find((value) => value.length > 0) ?? '';
          return {
            tag: node.tagName.toLowerCase(),
            className: node.className,
            name,
          };
        })
        .filter((control) => !control.name)
        .slice(0, 20);

      return unnamed;
    });

    expect(unnamedControls).toEqual([]);
  });

  test('orientation breadcrumb reflects active intent and mode', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    const breadcrumb = page.getByLabel('Current location');
    await expect(breadcrumb).toContainText('Workspace /');
    await expect(breadcrumb).toContainText('Timeline playback');

    await page.getByRole('button', { name: 'Validate' }).click();
    await expect(breadcrumb).toContainText(/Compare runs|Scenario matrix/);
  });

  test('next best action guidance is visible and actionable in diagnose intent', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Diagnose' }).click();
    const guidance = page.locator('.workspace-next-action');
    await expect(guidance).toContainText('Next best action');
    await guidance.getByRole('button', { name: 'Open flow graph' }).click();
    await expect(page.locator('.flow-canvas')).toBeVisible();
  });

  test('workspace secondary actions are collapsed behind More actions menu', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Show workspace tools|Hide workspace tools/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menu', { name: 'Workspace secondary actions' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Show workspace tools|Hide workspace tools/ })).toBeVisible();
  });

  test('tablet viewport keeps split stage layout for faster side-by-side triage', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1200 });
    await initExperienced(page);
    await page.goto('/');

    const gridTemplateColumns = await page.locator('.stage').evaluate((node) =>
      window.getComputedStyle(node).gridTemplateColumns
    );
    expect(gridTemplateColumns.split(' ').filter(Boolean).length).toBeGreaterThan(1);
  });

  test('tablet header secondary controls are collapsed behind More actions toggle', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await initExperienced(page);
    await page.goto('/');

    const toggle = page.locator('.header-actions-toggle');
    await expect(toggle).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh traces' })).toHaveCount(0);

    await toggle.click();
    await expect(page.getByRole('button', { name: 'Refresh traces' })).toBeVisible();
  });

  test('density mode auto compacts on mobile and can be overridden to comfortable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem('agentDirector.densityMode.v1', JSON.stringify('auto'));
    });
    await initExperienced(page);
    await page.goto('/');
    await expect(page.locator('.app')).toHaveClass(/density-compact/);

    await page.locator('.header-actions-toggle').click();
    await page.getByLabel('Select density profile').selectOption('comfortable');
    await expect(page.locator('.app')).toHaveClass(/density-comfortable/);
  });

  test('live region announces saved view completion', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'More actions' }).click();
    const panelToggle = page.getByRole('menuitem', { name: /Show workspace tools|Hide workspace tools/ });
    if ((await panelToggle.textContent())?.includes('Show workspace tools')) {
      await panelToggle.click();
    }

    await page.getByLabel('Saved view name').fill('screen-reader-view');
    await page.locator('.workspace-section-actions .primary-button').click();
    await expect(page.locator('.live-region')).toContainText('Saved view: screen-reader-view');
  });

  test('global C key switches from flow back to cinema', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    await page.getByTitle('Graph view').click();
    await expect(page.locator('.flow-canvas')).toBeVisible();
    await page.keyboard.press('c');
    await expect(page.locator('.timeline')).toBeVisible();
    await expect(page.locator('.flow-canvas')).not.toBeVisible();
  });

  test('mini timeline density map is keyboard-operable', async ({ page }) => {
    await initExperienced(page);
    await page.goto('/');
    const densityMap = page.getByRole('slider', { name: 'Timeline density map' });
    await expect(densityMap).toBeVisible();

    const playhead = page.locator('.mini-playhead');
    const before = await playhead.evaluate((node) => (node as HTMLElement).style.left);
    await densityMap.focus();
    await page.keyboard.press('ArrowRight');
    const after = await playhead.evaluate((node) => (node as HTMLElement).style.left);

    expect(after).not.toBe(before);
  });
});
