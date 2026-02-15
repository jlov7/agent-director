import type { StepSummary } from '../types';

export type LaneStrategy = 'type' | 'status' | 'parent';

export type LaneConfig = {
  order: string[];
  hidden: string[];
};

export type TimelineStudioConfig = Record<LaneStrategy, LaneConfig>;

export const DEFAULT_TIMELINE_STUDIO_CONFIG: TimelineStudioConfig = {
  type: { order: [], hidden: [] },
  status: { order: [], hidden: [] },
  parent: { order: [], hidden: [] },
};

export function laneGroupKeyForStep(step: StepSummary, strategy: LaneStrategy): string {
  if (strategy === 'type') return step.type;
  if (strategy === 'status') return step.status;
  return step.parentStepId ?? 'root';
}

export function deriveLaneGroups(steps: StepSummary[], strategy: LaneStrategy): string[] {
  const unique = new Set<string>();
  steps.forEach((step) => unique.add(laneGroupKeyForStep(step, strategy)));
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

export function normalizeLaneOrder(
  knownGroups: string[],
  order: string[],
  hidden: string[]
): { order: string[]; hidden: string[] } {
  const known = new Set(knownGroups);
  const normalizedOrder = [...order.filter((key) => known.has(key))];
  knownGroups.forEach((key) => {
    if (!normalizedOrder.includes(key)) normalizedOrder.push(key);
  });
  const normalizedHidden = Array.from(new Set(hidden.filter((key) => known.has(key))));
  return { order: normalizedOrder, hidden: normalizedHidden };
}
