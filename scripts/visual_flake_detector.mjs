#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const runs = Number(runsArg ? runsArg.split('=')[1] : '3');
const commandArg = process.argv.find((arg) => arg.startsWith('--command='));
const command =
  commandArg?.split('=').slice(1).join('=') ??
  'pnpm -C ui exec playwright test tests/e2e/visual-verification.spec.ts --config playwright.review.config.ts';

const artifactsDir = path.join(root, 'artifacts', 'visual-verification');
const reportPath = path.join(artifactsDir, 'flake-report.json');
fs.mkdirSync(artifactsDir, { recursive: true });

const executions = [];
for (let i = 0; i < runs; i += 1) {
  const startedAt = new Date().toISOString();
  const proc = spawnSync(command, {
    shell: true,
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  const status = proc.status === 0 ? 'pass' : 'fail';
  executions.push({
    run: i + 1,
    status,
    started_at: startedAt,
    return_code: proc.status,
    stdout_tail: (proc.stdout || '').split('\n').slice(-40).join('\n'),
    stderr_tail: (proc.stderr || '').split('\n').slice(-40).join('\n'),
  });
}

const passCount = executions.filter((item) => item.status === 'pass').length;
const failCount = executions.length - passCount;
const flakeDetected = passCount > 0 && failCount > 0;
const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  command,
  runs: executions.length,
  pass_count: passCount,
  fail_count: failCount,
  flake_detected: flakeDetected,
  stable_status: failCount === 0 ? 'stable-pass' : passCount === 0 ? 'stable-fail' : 'flaky',
  executions,
};

fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`VISUAL_FLAKE_REPORT=${reportPath}`);
console.log(`VISUAL_FLAKE_STATUS=${payload.stable_status}`);
console.log(`VISUAL_FLAKE_PASS_COUNT=${passCount}`);
console.log(`VISUAL_FLAKE_FAIL_COUNT=${failCount}`);

if (failCount > 0) process.exit(1);
