import type { StepSummary, TraceInsights, TraceSummary } from '../types';

export function computeInsights(trace: TraceSummary): TraceInsights {
  const durations = trace.steps.map((step) => ({
    stepId: step.id,
    name: step.name,
    durationMs: step.durationMs ?? 0,
  }));

  const topLatencySteps = durations.sort((a, b) => b.durationMs - a.durationMs).slice(0, 3);

  const costByType: Record<string, number> = {};
  const costByTool: Record<string, number> = {};
  for (const step of trace.steps) {
    if (step.metrics?.costUsd != null) {
      costByType[step.type] = (costByType[step.type] ?? 0) + step.metrics.costUsd;
      if (step.type === 'tool_call') {
        costByTool[step.name] = (costByTool[step.name] ?? 0) + step.metrics.costUsd;
      }
    }
  }

  const errors = trace.steps.filter((step) => step.status === 'failed').length;
  const retries = trace.steps.filter((step) => Boolean(step.retryOfStepId)).length;

  const wallTimeMs = trace.metadata.wallTimeMs;
  const workTimeMs = trace.metadata.workTimeMs ?? trace.steps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0);

  const timing = computeTimingHealth(trace);
  const ioWarnings = computeIoWarnings(trace.steps);
  const criticalPathMs = computeCriticalPath(trace.steps);
  const concurrency = computeConcurrency(trace);
  const retryPatterns = computeRetryPatterns(trace.steps);

  return {
    topLatencySteps,
    costByType,
    costByTool,
    costByModel: { [trace.metadata.modelId]: trace.metadata.totalCostUsd ?? 0 },
    errors,
    retries,
    wallTimeMs,
    workTimeMs,
    timing,
    ioWarnings,
    criticalPathMs,
    concurrency,
    retryPatterns,
  };
}

export function stepCostLabel(step: StepSummary) {
  const cost = step.metrics?.costUsd;
  if (cost == null) return null;
  return `$${cost.toFixed(3)}`;
}

function parseIso(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeTimingHealth(trace: TraceSummary) {
  const traceStart = parseIso(trace.startedAt);
  const traceEnd = parseIso(trace.endedAt ?? undefined);
  const missingStepIds: string[] = [];
  const skewedStepIds: string[] = [];
  const issues: string[] = [];

  if (traceStart == null) {
    issues.push('Trace start time missing or invalid.');
  }

  trace.steps.forEach((step) => {
    const start = parseIso(step.startedAt);
    const end = parseIso(step.endedAt ?? step.startedAt);
    if (start == null || end == null) {
      missingStepIds.push(step.id);
      return;
    }
    if (end < start) {
      skewedStepIds.push(step.id);
      return;
    }
    if (traceStart != null && start < traceStart) {
      skewedStepIds.push(step.id);
    }
    if (traceEnd != null && end > traceEnd) {
      skewedStepIds.push(step.id);
    }
  });

  if (missingStepIds.length) issues.push(`Missing timestamps on ${missingStepIds.length} steps.`);
  if (skewedStepIds.length) issues.push(`Timestamp skew detected on ${skewedStepIds.length} steps.`);

  return {
    degraded: Boolean(missingStepIds.length || skewedStepIds.length || traceStart == null),
    issues,
    missingStepIds,
    skewedStepIds,
  };
}

function computeIoWarnings(steps: StepSummary[]) {
  const toolSteps = new Map<string, StepSummary>();
  steps.forEach((step) => {
    if (step.type === 'tool_call' && step.toolCallId) {
      toolSteps.set(step.toolCallId, step);
    }
  });

  const emitted = new Set<string>();
  const consumed = new Set<string>();
  const warnings: Array<{ kind: string; message: string; stepId?: string; toolCallId?: string }> = [];

  steps.forEach((step) => {
    if (step.type !== 'llm_call' || !step.io) return;
    (step.io.emittedToolCallIds ?? []).forEach((callId) => {
      emitted.add(callId);
      if (!toolSteps.has(callId)) {
        warnings.push({
          kind: 'missing_tool_step',
          message: `Emitted toolCallId ${callId} has no tool step.`,
          stepId: step.id,
          toolCallId: callId,
        });
      }
    });
    (step.io.consumedToolCallIds ?? []).forEach((callId) => {
      consumed.add(callId);
      if (!toolSteps.has(callId)) {
        warnings.push({
          kind: 'missing_tool_step',
          message: `Consumed toolCallId ${callId} has no tool step.`,
          stepId: step.id,
          toolCallId: callId,
        });
      }
      if (!emitted.has(callId)) {
        warnings.push({
          kind: 'consume_without_emit',
          message: `Consumed toolCallId ${callId} without emission.`,
          stepId: step.id,
          toolCallId: callId,
        });
      }
    });
  });

  toolSteps.forEach((step, callId) => {
    if (!emitted.has(callId)) {
      warnings.push({
        kind: 'unemitted_tool',
        message: `Tool step ${step.id} has toolCallId ${callId} never emitted.`,
        stepId: step.id,
        toolCallId: callId,
      });
    }
    if (!consumed.has(callId)) {
      warnings.push({
        kind: 'unconsumed_tool',
        message: `Tool step ${step.id} has toolCallId ${callId} never consumed.`,
        stepId: step.id,
        toolCallId: callId,
      });
    }
  });

  return warnings;
}

function computeCriticalPath(steps: StepSummary[]) {
  const durations = new Map<string, number>();
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  steps.forEach((step) => {
    durations.set(step.id, step.durationMs ?? 0);
    if (step.parentStepId) {
      const list = children.get(step.parentStepId) ?? [];
      list.push(step.id);
      children.set(step.parentStepId, list);
    } else {
      roots.push(step.id);
    }
  });

  const memo = new Map<string, number>();
  const visit = (stepId: string): number => {
    if (memo.has(stepId)) return memo.get(stepId) ?? 0;
    const childIds = children.get(stepId) ?? [];
    const longestChild = childIds.reduce((max, childId) => Math.max(max, visit(childId)), 0);
    const value = (durations.get(stepId) ?? 0) + longestChild;
    memo.set(stepId, value);
    return value;
  };

  if (!roots.length) return 0;
  return Math.max(...roots.map((rootId) => visit(rootId)));
}

function computeConcurrency(trace: TraceSummary) {
  const start = parseIso(trace.startedAt);
  if (start == null) return { buckets: [], peak: 0 };
  const end =
    parseIso(trace.endedAt ?? undefined) ??
    Math.max(
      ...trace.steps.map((step) => parseIso(step.endedAt ?? step.startedAt) ?? start),
      start
    );
  const wallMs = Math.max(1, end - start);
  const bucketCount = 12;
  const bucketMs = Math.max(1, Math.floor(wallMs / bucketCount));
  const buckets = [];
  let peak = 0;

  for (let i = 0; i < bucketCount; i += 1) {
    const bucketStart = start + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    let active = 0;
    trace.steps.forEach((step) => {
      const stepStart = parseIso(step.startedAt);
      const stepEnd = parseIso(step.endedAt ?? step.startedAt);
      if (stepStart == null || stepEnd == null) return;
      if (stepEnd >= bucketStart && stepStart <= bucketEnd) active += 1;
    });
    peak = Math.max(peak, active);
    buckets.push({ startMs: i * bucketMs, endMs: (i + 1) * bucketMs, active });
  }

  return { buckets, peak };
}

function computeRetryPatterns(steps: StepSummary[]) {
  const retryCounts: Record<string, number> = {};
  steps.forEach((step) => {
    if (!step.retryOfStepId) return;
    retryCounts[step.retryOfStepId] = (retryCounts[step.retryOfStepId] ?? 0) + 1;
  });
  const totalRetries = Object.values(retryCounts).reduce((sum, count) => sum + count, 0);
  const entries = Object.entries(retryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    totalRetries,
    retryRate: steps.length ? totalRetries / steps.length : 0,
    topRetries: entries.map(([stepId, count]) => ({ stepId, count })),
  };
}
