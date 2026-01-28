import { buildIntervals } from './timingUtils';

function windowed(intervals: Array<{ stepId: string; startMs: number; endMs: number }>, startMs: number, endMs: number) {
  return intervals.filter((interval) => interval.endMs >= startMs && interval.startMs <= endMs).map((i) => i.stepId);
}

test('windowing includes intervals intersecting range', () => {
  const traceStart = '2026-01-27T10:00:00.000Z';
  const traceEnd = '2026-01-27T10:00:10.000Z';
  const steps = [
    { id: 'a', startedAt: '2026-01-27T10:00:00.000Z', endedAt: '2026-01-27T10:00:02.000Z' },
    { id: 'b', startedAt: '2026-01-27T10:00:03.000Z', endedAt: '2026-01-27T10:00:05.000Z' },
    { id: 'c', startedAt: '2026-01-27T10:00:06.000Z', endedAt: '2026-01-27T10:00:08.000Z' },
  ];

  const { intervals } = buildIntervals(traceStart, traceEnd, steps);
  expect(windowed(intervals, 2500, 5200)).toEqual(['b']);
  expect(windowed(intervals, 1500, 6500)).toEqual(['a', 'b', 'c']);
});
