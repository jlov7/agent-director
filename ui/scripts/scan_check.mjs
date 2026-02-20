#!/usr/bin/env node
/* global console, process */
import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['test:e2e', 'tests/e2e/scan.spec.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

console.error('Scan check failed to execute.');
process.exit(1);
