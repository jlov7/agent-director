import { buildIntervals } from './timingUtils';
import { buildFlowLayout } from './flowLayout';
import type { StepSummary } from '../types';

function buildSteps(count: number): StepSummary[] {
  const start = Date.now();
  return Array.from({ length: count }).map((_, index) => {
    const startMs = start + index * 20;
    const endMs = startMs + 10;
    return {
      id: `s-${index}`,
      index,
      type: 'llm_call',
      name: 'step',
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(endMs).toISOString(),
      durationMs: 10,
      status: 'completed',
      childStepIds: [],
    } as StepSummary;
  });
}

test('buildIntervals scales to 1k steps', () => {
  const steps = buildSteps(1000);
  const start = Date.now();
  const result = buildIntervals(steps[0].startedAt, steps[steps.length - 1].endedAt, steps);
  const duration = Date.now() - start;
  expect(result.intervals.length).toBe(1000);
  expect(duration).toBeLessThan(1500);
});

test('buildFlowLayout scales to 5k steps', () => {
  const steps = buildSteps(5000);
  const edges = steps.slice(1).map((step, index) => ({ source: steps[index].id, target: step.id }));
  const start = Date.now();
  const layout = buildFlowLayout(steps, edges, 'perf-5k');
  const duration = Date.now() - start;
  expect(layout.length).toBe(5000);
  expect(duration).toBeLessThan(4000);
});
