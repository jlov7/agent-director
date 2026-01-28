import type { StepSummary } from '../types';
import { buildIntervals } from './timingUtils';

export function buildDensity(
  traceStartIso: string,
  traceEndIso: string | null,
  steps: StepSummary[],
  bucketCount = 60
) {
  const { wallTimeMs, intervals } = buildIntervals(traceStartIso, traceEndIso, steps);
  const buckets = new Array(bucketCount).fill(0);
  if (!wallTimeMs) {
    return { buckets, wallTimeMs: 0 };
  }
  const bucketSize = wallTimeMs / bucketCount;
  if (!Number.isFinite(bucketSize) || bucketSize <= 0) {
    return { buckets, wallTimeMs };
  }
  intervals.forEach((interval) => {
    const startBucket = Math.max(0, Math.floor(interval.startMs / bucketSize));
    const endBucket = Math.min(bucketCount - 1, Math.floor(interval.endMs / bucketSize));
    for (let i = startBucket; i <= endBucket; i += 1) {
      buckets[i] += 1;
    }
  });
  return { buckets, wallTimeMs };
}
