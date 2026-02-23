import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateVisualContract,
  isVisualContractPass,
  type VisualAssertionResult,
  type VisualDebugContract,
} from './utils/visualContract';

type VisualDebug = VisualDebugContract;

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FREEZE_STYLE_PATH = path.join(TEST_DIR, 'styles', 'visual-verification.css');
const TARGET_URL = '/constellation?mode=flow&seed=42&static=1&ticks=600&debug=1';
const EXPECTED_NODE_COUNT = 5;
const VISUAL_ARTIFACT_DIR = path.resolve(TEST_DIR, '../../../artifacts/visual-verification');
const VIEW_PROFILES = [
  {
    name: 'retina-desktop',
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 2,
  },
  {
    name: 'standard-desktop',
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 1,
  },
  {
    name: 'tablet-retina',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
  },
  {
    name: 'mobile-retina',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  },
] as const;

declare global {
  interface Window {
    __READY?: boolean;
    __constellationDebug?: () => VisualDebug;
  }
}

async function primeStableState(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'false');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'false');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.heroDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.motionMode', JSON.stringify('minimal'));
    window.localStorage.setItem('agentDirector.themeMode', JSON.stringify('studio'));
    window.localStorage.setItem('agentDirector.densityMode.v1', JSON.stringify('comfortable'));
  });
}

async function waitForFonts(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    if (!('fonts' in document)) return true;
    const fontSet = document.fonts;
    return fontSet.status === 'loaded';
  });
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  });
}

async function captureDebug(page: import('@playwright/test').Page): Promise<VisualDebug> {
  const debug = await page.evaluate(() => {
    if (typeof window.__constellationDebug !== 'function') return null;
    return window.__constellationDebug();
  });
  expect(debug).not.toBeNull();
  return debug as VisualDebug;
}

function testSlug(testInfo: import('@playwright/test').TestInfo): string {
  return testInfo.titlePath.slice(1).join('__').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
}

async function writeAssertionPayload(
  profile: string,
  results: VisualAssertionResult[],
  debug: VisualDebug
): Promise<void> {
  const payload = {
    schema_version: 1,
    profile,
    status: isVisualContractPass(results) ? 'pass' : 'fail',
    assertions: results,
    watermark: debug.watermark,
    generated_at: new Date().toISOString(),
  };
  const payloadPath = path.join(VISUAL_ARTIFACT_DIR, `${profile}-assertions.json`);
  await fs.mkdir(path.dirname(payloadPath), { recursive: true });
  await fs.writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

test.afterEach(async ({ page }, testInfo) => {
  const debug = await page.evaluate(() => {
    if (typeof window.__constellationDebug !== 'function') return null;
    return window.__constellationDebug();
  });
  if (!debug) return;
  const debugPath = testInfo.outputPath('visual-debug.json');
  await fs.mkdir(path.dirname(debugPath), { recursive: true });
  await fs.writeFile(debugPath, `${JSON.stringify(debug, null, 2)}\n`, 'utf8');
  await testInfo.attach('visual-debug', { path: debugPath, contentType: 'application/json' });

  const artifactPath = path.join(VISUAL_ARTIFACT_DIR, `${testSlug(testInfo)}-debug.json`);
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(debug, null, 2)}\n`, 'utf8');
});

for (const profile of VIEW_PROFILES) {
  test.describe(profile.name, () => {
    test.use({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });

    test('deterministic visual verification', async ({ page, browserName }) => {
      await primeStableState(page);
      await page.goto(TARGET_URL);

      await waitForFonts(page);
      await expect(page.locator('#constellation')).toBeVisible();

      await page.waitForFunction(() => window.__READY === true, { timeout: 15_000 });

      const debug = await captureDebug(page);
      const assertionResults = evaluateVisualContract(debug, EXPECTED_NODE_COUNT);
      await writeAssertionPayload(profile.name, assertionResults, debug);
      expect(isVisualContractPass(assertionResults)).toBe(true);

      const maxDiffPixelRatio =
        browserName === 'chromium' ? 0.03 : browserName === 'firefox' ? 0.12 : 0.12;

      await expect(page.locator('#constellation')).toHaveScreenshot(`flow-${profile.name}-seed42.png`, {
        stylePath: FREEZE_STYLE_PATH,
        maxDiffPixelRatio,
      });

      const watermark = page.locator('#visual-watermark');
      await expect(watermark).toBeVisible();
      const watermarkText = (await watermark.textContent()) ?? '';
      expect(watermarkText).toContain(`dpr=${profile.deviceScaleFactor}`);
      expect(watermarkText).toContain('seed=42');

      if (process.env.VITE_GIT_SHA) {
        expect(watermarkText).toContain(process.env.VITE_GIT_SHA);
      }

      const proof = {
        profile: profile.name,
        watermark: debug.watermark,
      };
      const proofPath = path.join(VISUAL_ARTIFACT_DIR, `${profile.name}-watermark-proof.json`);
      await fs.mkdir(path.dirname(proofPath), { recursive: true });
      await fs.writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');

      console.log(
        JSON.stringify({
          type: 'VISUAL_WATERMARK_PROOF',
          profile: profile.name,
          watermark: debug.watermark,
        })
      );
    });
  });
}
