import type { TraceSummary } from '../types';

export type TraceEvidenceSummary = {
  sourceLabel: string;
  providerLabel: string;
  modelLabel: string;
  providerTraceId: string;
  tokenLabel: string;
  costLabel: string;
  wallTimeLabel: string;
  slowestStepLabel: string;
  failureLabel: string;
  warningCount: number;
  warningLabel: string;
  replayModeLabel: string;
  replayTruthLabel: string;
  imported: boolean;
};

export function buildTraceEvidenceSummary(trace: TraceSummary | null): TraceEvidenceSummary | null {
  if (!trace) return null;
  const metadata = trace.metadata;
  const sourceLabel = metadata.framework || metadata.source || 'manual';
  const providerLabel = metadata.provider || 'unknown provider';
  const modelLabel = metadata.modelId || 'unknown model';
  const tokenCount = metadata.totalTokens ?? trace.steps.reduce((total, step) => total + (step.metrics?.tokensTotal ?? 0), 0);
  const cost = metadata.totalCostUsd ?? trace.steps.reduce((total, step) => total + (step.metrics?.costUsd ?? 0), 0);
  const slowestStep = [...trace.steps].sort((left, right) => (right.durationMs ?? 0) - (left.durationMs ?? 0))[0];
  const failureCount = metadata.errorCount ?? trace.steps.filter((step) => step.status === 'failed').length;
  const warningCount = metadata.importerWarnings?.length ?? 0;
  const replayMode = trace.replay?.executionMode ?? 'recorded_evidence';

  return {
    sourceLabel,
    providerLabel,
    modelLabel,
    providerTraceId: metadata.providerTraceId || trace.id,
    tokenLabel: `${tokenCount} ${tokenCount === 1 ? 'token' : 'tokens'}`,
    costLabel: `$${cost.toFixed(4)}`,
    wallTimeLabel: `${formatDuration(metadata.wallTimeMs)} wall time`,
    slowestStepLabel: slowestStep ? `Slowest: ${slowestStep.name}, ${formatDuration(slowestStep.durationMs ?? 0)}` : 'Slowest: none',
    failureLabel: `${failureCount} ${failureCount === 1 ? 'failed step' : 'failed steps'}`,
    warningCount,
    warningLabel: warningCount
      ? `${warningCount} importer ${warningCount === 1 ? 'warning' : 'warnings'}`
      : 'No importer warnings',
    replayModeLabel: formatReplayMode(replayMode),
    replayTruthLabel: trace.replay?.truthLabel ?? 'Recorded trace evidence, no replay branch selected.',
    imported: sourceLabel !== 'manual' || Boolean(metadata.providerTraceId),
  };
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatReplayMode(mode: string): string {
  if (mode === 'recorded_replay') return 'Recorded replay';
  if (mode === 'counterfactual_simulation') return 'Counterfactual simulation';
  if (mode === 'executed_replay') return 'Executed replay';
  return 'Recorded evidence';
}
