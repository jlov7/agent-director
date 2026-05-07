import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const API_PORT = 8899;
const UI_PORT = 4283;
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const UI_BASE = `http://127.0.0.1:${UI_PORT}`;
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

let apiProcess: ChildProcessWithoutNullStreams;
let uiProcess: ChildProcessWithoutNullStreams;
let dataDir: string;

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

test.beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'agent-director-import-e2e-'));
  apiProcess = spawn('python3', ['-m', 'server.main'], {
    cwd: ROOT,
    env: {
      ...process.env,
      AGENT_DIRECTOR_PORT: String(API_PORT),
      AGENT_DIRECTOR_DATA_DIR: dataDir,
      AGENT_DIRECTOR_ENABLE_GAMEPLAY: '0',
    },
  });
  await waitForUrl(`${API_BASE}/api/health`);

  uiProcess = spawn('pnpm', ['-C', 'ui', 'dev', '--host', '127.0.0.1', '--port', String(UI_PORT), '--strictPort'], {
    cwd: ROOT,
    env: {
      ...process.env,
      VITE_API_BASE: API_BASE,
      VITE_FORCE_DEMO: '0',
      VITE_HIDE_BUILD_DATE: '1',
      VITE_SKIP_INTRO: '1',
    },
  });
  await waitForUrl(UI_BASE);
});

test.afterAll(() => {
  apiProcess?.kill();
  uiProcess?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

test('imports a real OTel trace, creates eval evidence, and labels replay truthfully', async ({ page }) => {
  await seedRouteShell(page);
  const imported = await importOtelFixture();
  expect(imported.trace.id).toBe('import-otel-regression-1');

  await page.goto(`${UI_BASE}/?routes=1&route=diagnose`);

  await expect(page.getByRole('heading', { name: 'Diagnose state' })).toBeVisible();
  await expect(page.getByText('Trace-to-eval evidence')).toBeVisible();
  await expect(page.getByText('otel_genai')).toBeVisible();
  await expect(page.getByText('openai')).toBeVisible();
  await expect(page.getByText('75 tokens')).toBeVisible();
  await expect(page.getByText('$0.0042')).toBeVisible();

  await page.getByRole('button', { name: 'Create eval case' }).click();
  await expect(page.getByText(/Created eval case/)).toBeVisible();
  await page.getByRole('button', { name: 'Run eval suite' }).click();
  await expect(page.getByText(/Last run: passed, 1\/1 cases passed/)).toBeVisible();

  const replayResponse = await fetch(`${API_BASE}/api/traces/${imported.trace.id}/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step_id: imported.trace.steps[0].id,
      strategy: 'hybrid',
      modifications: { note: 'E2E truth check' },
    }),
  });
  expect(replayResponse.status).toBe(200);
  const replay = (await replayResponse.json()) as { trace: { replay?: { executionMode?: string; truthLabel?: string } } };
  expect(replay.trace.replay?.executionMode).toBe('counterfactual_simulation');
  expect(replay.trace.replay?.truthLabel).toContain('not executed against a live agent runtime');
});

async function seedRouteShell(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('agentDirector.onboarded', 'true');
    window.localStorage.setItem('agentDirector.safeExport', 'true');
    window.localStorage.setItem('agentDirector.windowed', 'true');
    window.localStorage.setItem('agentDirector.overlayEnabled', 'true');
    window.localStorage.setItem('agentDirector.speed', '1');
    window.localStorage.setItem('agentDirector.introDismissed', 'true');
    window.localStorage.setItem('agentDirector.tourCompleted', 'true');
    window.localStorage.setItem('agentDirector.explainMode', 'false');
    window.localStorage.setItem('agentDirector.workspacePanelOpen.v1', 'true');
    window.localStorage.setItem('agentDirector.onboarding.path.v1', JSON.stringify('evaluate'));
    window.localStorage.setItem('agentDirector.onboarding.stage.v1', JSON.stringify('completed'));
    window.localStorage.setItem('agentDirector.routeShell.fullWorkspaceOptIn.v1', JSON.stringify(true));
    window.localStorage.setItem('agentDirector.routeShell.canvasOpen.v1', JSON.stringify(true));
  });
}

async function importOtelFixture() {
  const response = await fetch(`${API_BASE}/api/traces/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'otel_genai',
      payload: {
        traceId: 'otel-regression-1',
        name: 'Imported OTel Regression',
        serviceName: 'checkout-agent',
        spans: [
          {
            spanId: 'span-plan',
            name: 'agent.plan',
            startTime: '2026-05-07T10:00:00.000Z',
            endTime: '2026-05-07T10:00:01.000Z',
            attributes: {
              'gen_ai.operation.name': 'chat',
              'gen_ai.system': 'openai',
              'gen_ai.request.model': 'gpt-4.1',
              'gen_ai.usage.input_tokens': 30,
              'gen_ai.usage.output_tokens': 20,
              'gen_ai.usage.cost_usd': 0.0032,
            },
          },
          {
            spanId: 'span-tool',
            parentSpanId: 'span-plan',
            name: 'tool.search',
            startTime: '2026-05-07T10:00:01.000Z',
            endTime: '2026-05-07T10:00:02.000Z',
            status: { code: 'error', message: 'timeout' },
            attributes: {
              'gen_ai.operation.name': 'execute_tool',
              'gen_ai.system': 'openai',
              'tool.name': 'search',
              'gen_ai.usage.input_tokens': 10,
              'gen_ai.usage.output_tokens': 15,
              'usage.total_tokens': 25,
              'gen_ai.usage.cost_usd': 0.001,
            },
            events: [{ name: 'analysis', attributes: { value: 'search timeout caused retry collapse' } }],
          },
        ],
      },
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as {
    trace: {
      id: string;
      steps: Array<{ id: string }>;
    };
  };
}

async function waitForUrl(url: string) {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}
