import type { StepSummary, TraceSummary } from '../types';

export function diffTraces(left: TraceSummary, right: TraceSummary) {
  const alignedPairs = alignSteps(left, right);
  const alignedLeft = new Set(alignedPairs.map((pair) => pair.leftId));
  const alignedRight = new Set(alignedPairs.map((pair) => pair.rightId));

  const addedSteps = right.steps.filter((step) => !alignedRight.has(step.id)).map((step) => step.id);
  const removedSteps = left.steps.filter((step) => !alignedLeft.has(step.id)).map((step) => step.id);

  const changedPairs = alignedPairs.filter((pair) => {
    const leftStep = left.steps.find((step) => step.id === pair.leftId);
    const rightStep = right.steps.find((step) => step.id === pair.rightId);
    if (!leftStep || !rightStep) return false;
    return summarySignature(leftStep) !== summarySignature(rightStep);
  });
  const changedSteps = changedPairs.map((pair) => pair.leftId);

  const costDeltaUsd = (right.metadata.totalCostUsd ?? 0) - (left.metadata.totalCostUsd ?? 0);
  const wallTimeDeltaMs = right.metadata.wallTimeMs - left.metadata.wallTimeMs;

  return { addedSteps, removedSteps, changedSteps, changedPairs, alignedSteps: alignedPairs, costDeltaUsd, wallTimeDeltaMs };
}

function alignSteps(left: TraceSummary, right: TraceSummary) {
  const aligned: Array<{ leftId: string; rightId: string }> = [];
  const leftUnmatched = new Set(left.steps.map((step) => step.id));
  const rightUnmatched = new Set(right.steps.map((step) => step.id));

  Array.from(leftUnmatched).forEach((stepId) => {
    if (rightUnmatched.has(stepId)) {
      aligned.push({ leftId: stepId, rightId: stepId });
      leftUnmatched.delete(stepId);
      rightUnmatched.delete(stepId);
    }
  });

  const rightByToolCall = new Map<string, string>();
  right.steps.forEach((step) => {
    if (step.toolCallId) rightByToolCall.set(step.toolCallId, step.id);
  });

  left.steps.forEach((step) => {
    if (!step.toolCallId) return;
    const rightId = rightByToolCall.get(step.toolCallId);
    if (rightId && rightUnmatched.has(rightId)) {
      aligned.push({ leftId: step.id, rightId });
      leftUnmatched.delete(step.id);
      rightUnmatched.delete(rightId);
    }
  });

  const leftRelative = buildRelativeStart(left);
  const rightRelative = buildRelativeStart(right);
  const threshold = alignmentThreshold(left, right);

  const candidates: Record<string, string[]> = {};
  rightUnmatched.forEach((stepId) => {
    const info = rightRelative.get(stepId);
    if (!info) return;
    const signature = stepSignature(info.step);
    if (!signature) return;
    if (!candidates[signature]) candidates[signature] = [];
    candidates[signature].push(stepId);
  });

  Object.values(candidates).forEach((ids) => {
    ids.sort((a, b) => (rightRelative.get(a)?.startMs ?? 0) - (rightRelative.get(b)?.startMs ?? 0));
  });

  Array.from(leftUnmatched).forEach((stepId) => {
    const info = leftRelative.get(stepId);
    if (!info) return;
    const signature = stepSignature(info.step);
    if (!signature || !candidates[signature]?.length) return;
    const bestId = findBestMatch(info, candidates[signature], rightRelative, threshold);
    if (bestId) {
      aligned.push({ leftId: stepId, rightId: bestId });
      leftUnmatched.delete(stepId);
      rightUnmatched.delete(bestId);
      candidates[signature] = candidates[signature].filter((id) => id !== bestId);
    }
  });

  return aligned;
}

function summarySignature(step: StepSummary) {
  const preview = step.preview?.outputPreview ?? null;
  const metrics = step.metrics?.costUsd ?? null;
  return `${step.status}|${preview ?? ''}|${metrics ?? ''}`;
}

function stepSignature(step: StepSummary) {
  if (!step.type) return null;
  return `${step.type}:${step.name ?? ''}`;
}

function parseIso(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildRelativeStart(trace: TraceSummary) {
  const traceStart = parseIso(trace.startedAt);
  const map = new Map<string, { step: StepSummary; startMs: number | null }>();
  trace.steps.forEach((step) => {
    const start = parseIso(step.startedAt);
    const startMs = traceStart != null && start != null ? start - traceStart : null;
    map.set(step.id, { step, startMs });
  });
  return map;
}

function alignmentThreshold(left: TraceSummary, right: TraceSummary) {
  const base = Math.max(left.metadata.wallTimeMs, right.metadata.wallTimeMs, 1);
  return Math.max(1000, Math.min(5000, Math.round(base * 0.1)));
}

function findBestMatch(
  leftStep: { step: StepSummary; startMs: number | null },
  candidates: string[],
  rightRelative: Map<string, { step: StepSummary; startMs: number | null }>,
  threshold: number
) {
  const leftStart = leftStep.startMs;
  if (leftStart == null) return null;
  let bestId: string | null = null;
  let bestDelta = threshold + 1;
  candidates.forEach((candidateId) => {
    const candidate = rightRelative.get(candidateId);
    if (!candidate || candidate.startMs == null) return;
    const delta = Math.abs(candidate.startMs - leftStart);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = candidateId;
    }
  });
  return bestDelta <= threshold ? bestId : null;
}
