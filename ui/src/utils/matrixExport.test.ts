import { describe, it, expect } from 'vitest';
import type { ReplayJob, ReplayMatrix } from '../types';
import { buildMatrixExport, buildMatrixMarkdown } from './matrixExport';

const job: ReplayJob = {
  id: 'job-1',
  traceId: 'trace-1',
  stepId: 's1',
  status: 'completed',
  createdAt: '2026-02-15T08:00:00Z',
  scenarioCount: 1,
  completedCount: 1,
  failedCount: 0,
  canceledCount: 0,
  scenarios: [],
};

const matrix: ReplayMatrix = {
  jobId: 'job-1',
  traceId: 'trace-1',
  stepId: 's1',
  rows: [
    {
      scenarioId: 'scn-1',
      name: 'Sensitive run',
      strategy: 'hybrid',
      status: 'completed',
      replayTraceId: 'replay-1',
      modifications: { apiKey: 'secret', note: 'ok' },
      changedStepIds: ['s1'],
      addedStepIds: [],
      removedStepIds: [],
      metrics: {
        costDeltaUsd: 0.1,
        wallTimeDeltaMs: 200,
        errorDelta: 0,
        retryDelta: 0,
        changedSteps: 1,
        addedSteps: 0,
        removedSteps: 0,
        invalidatedStepCount: 0,
      },
    },
  ],
  causalRanking: [],
};

describe('matrix export', () => {
  it('redacts sensitive modifications when safe export is enabled', () => {
    const result = buildMatrixExport({
      job,
      matrix,
      safeExport: true,
      sensitiveKeys: ['apiKey'],
      anchorStepName: 'Plan',
    });

    expect(result.redaction.safeExport).toBe(true);
    expect(result.rows[0].modifications).toEqual({ apiKey: '[REDACTED]', note: 'ok' });
  });

  it('builds a markdown summary with totals', () => {
    const markdown = buildMatrixMarkdown({
      job,
      matrix,
      safeExport: false,
      anchorStepName: 'Plan',
    });

    expect(markdown).toContain('# Counterfactual Replay Matrix');
    expect(markdown).toContain('Scenarios: 1');
    expect(markdown).toContain('Sensitive run');
  });
});
