/* global process, console */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:4276';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(SCRIPT_DIR, '../../docs/screenshots');

async function captureCoreModeShots(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.setItem('agentDirector.introDismissed', JSON.stringify(true));
    storage.setItem('agentDirector.heroDismissed', JSON.stringify(true));
    storage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));
    storage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(false));
  });

  await page.goto(`${BASE_URL}/?routes=0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'cinema.png'), fullPage: true });

  await page.getByTitle('Graph view').click();
  await page.waitForSelector('.flow-canvas');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'flow.png'), fullPage: true });

  await page.getByRole('button', { name: 'Run replay' }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Compare' }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'compare.png'), fullPage: true });

  await context.close();
}

async function captureOnboardingShots(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.setItem('agentDirector.uxReboot.routes.v1', JSON.stringify(true));
    storage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('select'));
    storage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    storage.setItem('agentDirector.workspacePanelOpen.v1', JSON.stringify(true));
    storage.setItem('agentDirector.introDismissed', JSON.stringify(true));
    storage.setItem('agentDirector.heroDismissed', JSON.stringify(true));
  });

  await page.goto(`${BASE_URL}/?routes=1&route=overview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'onboarding-v2-select.png'), fullPage: true });

  await page.getByRole('button', { name: 'Start first win' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'onboarding-v2-active.png'), fullPage: true });

  await page.addInitScript(() => {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    storage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    storage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(false));
  });
  await page.goto(`${BASE_URL}/?routes=1&route=triage`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'onboarding-v2-focused.png'), fullPage: true });

  await page.getByRole('button', { name: 'Open analysis canvas' }).first().click();
  await page.waitForSelector('.toolbar');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'onboarding-v2-full-workspace.png'), fullPage: true });

  await context.close();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await captureCoreModeShots(browser);
    await captureOnboardingShots(browser);
  } finally {
    await browser.close();
  }
  console.log(`Captured screenshots in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
