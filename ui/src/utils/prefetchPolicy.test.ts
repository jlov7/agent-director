import type { StepSummary } from '../types';
import { buildLikelyStepPrefetchList, deriveLikelyMode } from './prefetchPolicy';

const steps: StepSummary[] = [
  {
    id: 's-1',
    index: 0,
    type: 'llm_call',
    name: 'step-1',
    startedAt: '2026-01-27T10:00:00.000Z',
    endedAt: '2026-01-27T10:00:01.000Z',
    durationMs: 1000,
    status: 'completed',
    childStepIds: [],
  },
  {
    id: 's-2',
    index: 1,
    type: 'tool_call',
    name: 'step-2',
    startedAt: '2026-01-27T10:00:01.000Z',
    endedAt: '2026-01-27T10:00:04.000Z',
    durationMs: 3000,
    status: 'failed',
    childStepIds: [],
  },
  {
    id: 's-3',
    index: 2,
    type: 'decision',
    name: 'step-3',
    startedAt: '2026-01-27T10:00:04.000Z',
    endedAt: '2026-01-27T10:00:05.000Z',
    durationMs: 1000,
    status: 'completed',
    childStepIds: [],
  },
];

test('deriveLikelyMode prioritizes analysis and collaboration intents', () => {
  expect(deriveLikelyMode('analysis', 'cinema', false)).toBe('matrix');
  expect(deriveLikelyMode('analysis', 'cinema', true)).toBe('compare');
  expect(deriveLikelyMode('collaboration', 'flow', false)).toBe('gameplay');
});

test('buildLikelyStepPrefetchList prioritizes selected, nearby, failed, and slowest steps', () => {
  const ids = buildLikelyStepPrefetchList(steps, 's-2', 6);
  expect(ids[0]).toBe('s-1');
  expect(ids).toContain('s-2');
  expect(ids).toContain('s-3');
  expect(ids.length).toBeLessThanOrEqual(6);
});
