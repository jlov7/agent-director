import { expect, test } from '@playwright/test';
import {
  evaluateVisualContract,
  isVisualContractPass,
  type VisualDebugContract,
} from './utils/visualContract';

declare global {
  interface Window {
    __READY?: boolean;
    __constellationDebug?: () => VisualDebugContract;
  }
}

const TARGET_URL = '/constellation?mode=flow&seed=42&static=1&ticks=600&debug=1';
const EXPECTED_NODE_COUNT = 5;

test.use({
  viewport: { width: 1366, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  reducedMotion: 'reduce',
});

test('deterministic flow geometry contract passes', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'false');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'false');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
  });

  await page.goto(TARGET_URL);
  await page.waitForFunction(() => window.__READY === true, { timeout: 15_000 });

  const debug = await page.evaluate(() => {
    if (typeof window.__constellationDebug !== 'function') return null;
    return window.__constellationDebug();
  });
  expect(debug).not.toBeNull();

  const results = evaluateVisualContract(debug as VisualDebugContract, EXPECTED_NODE_COUNT);
  expect(isVisualContractPass(results)).toBe(true);
});
