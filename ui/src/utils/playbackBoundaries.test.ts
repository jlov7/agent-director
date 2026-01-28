import { collectStepBoundaries, findNextBoundary } from './playbackBoundaries';
import type { StepSummary } from '../types';

const traceStart = '2026-01-27T10:00:00.000Z';
const traceEnd = '2026-01-27T10:00:10.000Z';
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

test('collects sorted boundaries', () => {
  const boundaries = collectStepBoundaries(traceStart, traceEnd, steps);
  expect(boundaries[0]).toBe(0);
  expect(boundaries[boundaries.length - 1]).toBe(5000);
});

test('finds next and previous boundaries', () => {
  const boundaries = collectStepBoundaries(traceStart, traceEnd, steps);
  expect(findNextBoundary(boundaries, 0, 1)).toBe(2000);
  expect(findNextBoundary(boundaries, 4000, -1)).toBe(3000);
});
