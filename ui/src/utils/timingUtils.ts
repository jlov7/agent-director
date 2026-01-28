export type StepInterval = {
  stepId: string;
  startMs: number;
  endMs: number;
  lane: number;
  xPct: number;
  wPct: number;
};

export function buildIntervals(
  traceStartIso: string,
  traceEndIso: string | null,
  steps: Array<{ id: string; startedAt: string; endedAt: string | null }>
): { wallTimeMs: number; intervals: StepInterval[]; laneCount: number } {
  const traceStart = Date.parse(traceStartIso);

  const endCandidates = steps
    .map((step) => Date.parse(step.endedAt ?? step.startedAt))
    .filter((value) => Number.isFinite(value));

  const traceEnd = traceEndIso
    ? Date.parse(traceEndIso)
    : endCandidates.length
      ? Math.max(...endCandidates)
      : traceStart;
  const wallTimeMs = Math.max(1, traceEnd - traceStart);

  const raw = steps
    .map((step) => {
      const startMs = Math.max(0, Date.parse(step.startedAt) - traceStart);
      const endMs = Math.max(startMs, Date.parse(step.endedAt ?? step.startedAt) - traceStart);
      return { stepId: step.id, startMs, endMs };
    })
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const laneEnd: number[] = [];
  const intervals: StepInterval[] = [];

  for (const interval of raw) {
    let lane = laneEnd.findIndex((end) => end <= interval.startMs);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(interval.endMs);
    } else {
      laneEnd[lane] = interval.endMs;
    }

    intervals.push({
      stepId: interval.stepId,
      startMs: interval.startMs,
      endMs: interval.endMs,
      lane,
      xPct: (interval.startMs / wallTimeMs) * 100,
      wPct: Math.max(0.75, ((interval.endMs - interval.startMs) / wallTimeMs) * 100),
    });
  }

  return { wallTimeMs, intervals, laneCount: laneEnd.length };
}
