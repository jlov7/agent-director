import type { StepSummary } from '../types';

export type PrefetchMode = 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
export type PrefetchSection = 'journey' | 'analysis' | 'collaboration' | 'operations';

function durationMs(step: StepSummary) {
  if (typeof step.durationMs === 'number' && Number.isFinite(step.durationMs)) {
    return Math.max(0, step.durationMs);
  }
  const start = Date.parse(step.startedAt);
  const end = Date.parse(step.endedAt ?? step.startedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function deriveLikelyMode(
  section: PrefetchSection,
  currentMode: PrefetchMode,
  hasCompareTrace: boolean
): PrefetchMode {
  if (section === 'analysis') {
    return hasCompareTrace ? 'compare' : 'matrix';
  }
  if (section === 'collaboration') return 'gameplay';
  if (section === 'operations') return currentMode === 'compare' ? 'matrix' : currentMode;
  return currentMode === 'gameplay' ? 'cinema' : currentMode;
}

export function buildLikelyStepPrefetchList(steps: StepSummary[], selectedStepId: string | null, limit = 6): string[] {
  if (steps.length === 0) return [];
  const ordered = [...steps].sort((left, right) => left.index - right.index);
  const selectedIndex = selectedStepId ? ordered.findIndex((step) => step.id === selectedStepId) : -1;
  const failed = ordered.find((step) => step.status === 'failed');
  const slowest = ordered.reduce((slowestStep, step) =>
    durationMs(step) > durationMs(slowestStep) ? step : slowestStep
  );

  const candidateIds = [
    ordered[0]?.id,
    selectedIndex >= 0 ? ordered[selectedIndex]?.id : null,
    selectedIndex > 0 ? ordered[selectedIndex - 1]?.id : null,
    selectedIndex >= 0 && selectedIndex < ordered.length - 1 ? ordered[selectedIndex + 1]?.id : null,
    failed?.id ?? null,
    slowest.id,
    ordered[ordered.length - 1]?.id,
  ];

  const deduped = Array.from(new Set(candidateIds.filter((value): value is string => Boolean(value))));
  return deduped.slice(0, limit);
}
