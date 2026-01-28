import { buildDensity } from './density';
import type { StepSummary } from '../types';

const steps: StepSummary[] = [
  {
    id: 'a',
    index: 0,
    type: 'llm_call',
    name: 'a',
    startedAt: '2026-01-27T10:00:00.000Z',
    endedAt: '2026-01-27T10:00:02.000Z',
    status: 'completed',
    childStepIds: [],
  },
  {
    id: 'b',
    index: 1,
    type: 'tool_call',
    name: 'b',
    startedAt: '2026-01-27T10:00:03.000Z',
    endedAt: '2026-01-27T10:00:05.000Z',
    status: 'completed',
    childStepIds: [],
  },
];

test('builds density buckets', () => {
  const { buckets, wallTimeMs } = buildDensity(
    '2026-01-27T10:00:00.000Z',
    '2026-01-27T10:00:06.000Z',
    steps,
    6
  );
  expect(wallTimeMs).toBe(6000);
  expect(buckets.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
});
