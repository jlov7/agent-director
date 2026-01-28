import type { Page } from '@playwright/test';

type PercySnapshotFn = (page: Page, name: string, options?: Record<string, unknown>) => Promise<void>;

let snapshotFn: PercySnapshotFn | null = null;

export async function maybePercySnapshot(page: Page, name: string, options?: Record<string, unknown>) {
  if (!process.env.PERCY_TOKEN) return;
  if (!snapshotFn) {
    const mod = await import('@percy/playwright');
    snapshotFn = (mod as { default: PercySnapshotFn }).default;
  }
  await snapshotFn(page, name, options);
}
