import { buildIntervals } from './timingUtils';

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

test('lane assignment avoids overlap (property)', () => {
  const rng = seeded(42);
  const traceStart = '2026-01-27T10:00:00.000Z';
  const traceEnd = '2026-01-27T10:05:00.000Z';
  for (let run = 0; run < 25; run += 1) {
    const steps = Array.from({ length: 80 }).map((_, index) => {
      const startOffset = Math.floor(rng() * 240_000);
      const duration = Math.floor(rng() * 4000) + 250;
      const startedAt = new Date(Date.parse(traceStart) + startOffset).toISOString();
      const endedAt = new Date(Date.parse(traceStart) + startOffset + duration).toISOString();
      return { id: `s-${run}-${index}`, startedAt, endedAt };
    });

    const { intervals } = buildIntervals(traceStart, traceEnd, steps);
    const lanes = new Map<number, Array<{ startMs: number; endMs: number }>>();
    intervals.forEach((interval) => {
      const list = lanes.get(interval.lane) ?? [];
      list.push({ startMs: interval.startMs, endMs: interval.endMs });
      lanes.set(interval.lane, list);
    });

    lanes.forEach((list) => {
      list.sort((a, b) => a.startMs - b.startMs);
      for (let i = 1; i < list.length; i += 1) {
        expect(list[i].startMs).toBeGreaterThanOrEqual(list[i - 1].endMs);
      }
    });
  }
});
