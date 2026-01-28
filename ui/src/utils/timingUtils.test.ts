import { buildIntervals } from './timingUtils';

const traceStart = '2026-01-27T10:00:00.000Z';
const traceEnd = '2026-01-27T10:00:30.000Z';

test('assigns overlap lanes without stacking durations', () => {
  const steps = [
    { id: 'a', startedAt: '2026-01-27T10:00:00.000Z', endedAt: '2026-01-27T10:00:10.000Z' },
    { id: 'b', startedAt: '2026-01-27T10:00:05.000Z', endedAt: '2026-01-27T10:00:15.000Z' },
    { id: 'c', startedAt: '2026-01-27T10:00:16.000Z', endedAt: '2026-01-27T10:00:20.000Z' },
  ];

  const { intervals, laneCount } = buildIntervals(traceStart, traceEnd, steps);
  const laneById = Object.fromEntries(intervals.map((interval) => [interval.stepId, interval.lane]));

  expect(laneCount).toBe(2);
  expect(laneById).toEqual({ a: 0, b: 1, c: 0 });
});
