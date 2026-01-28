import type { StepSummary } from '../types';
import { buildIntervals } from './timingUtils';

export function collectStepBoundaries(
  traceStartIso: string,
  traceEndIso: string | null,
  steps: StepSummary[]
) {
  const { intervals } = buildIntervals(traceStartIso, traceEndIso, steps);
  const boundarySet = new Set<number>();
  intervals.forEach((interval) => {
    boundarySet.add(interval.startMs);
    boundarySet.add(interval.endMs);
  });
  return Array.from(boundarySet).sort((a, b) => a - b);
}

export function findNextBoundary(boundaries: number[], currentMs: number, direction: 1 | -1) {
  if (!boundaries.length) return null;
  if (direction === 1) {
    for (const boundary of boundaries) {
      if (boundary > currentMs + 1) return boundary;
    }
    return boundaries[boundaries.length - 1];
  }
  for (let i = boundaries.length - 1; i >= 0; i -= 1) {
    const boundary = boundaries[i];
    if (boundary < currentMs - 1) return boundary;
  }
  return boundaries[0];
}
