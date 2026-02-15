import type { ReplayJob, ReplayMatrix } from '../types';
import { redactSensitiveValues } from './sensitive';

type MatrixExportInput = {
  job: ReplayJob | null;
  matrix: ReplayMatrix;
  safeExport: boolean;
  sensitiveKeys: string[];
  anchorStepName?: string | null;
};

type MatrixMarkdownInput = {
  job: ReplayJob | null;
  matrix: ReplayMatrix;
  safeExport: boolean;
  anchorStepName?: string | null;
};

function formatNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  return value.toString();
}

function formatUsd(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  return value.toFixed(3);
}

function redactModifications(modifications: Record<string, unknown>, safeExport: boolean) {
  return safeExport ? (redactSensitiveValues(modifications) as Record<string, unknown>) : modifications;
}

export function buildMatrixExport({ job, matrix, safeExport, sensitiveKeys, anchorStepName }: MatrixExportInput) {
  const rows = matrix.rows.map((row) => ({
    scenarioId: row.scenarioId,
    name: row.name,
    strategy: row.strategy,
    status: row.status,
    replayTraceId: row.replayTraceId,
    modifications: redactModifications(row.modifications, safeExport),
    error: row.error ?? null,
    changedStepIds: row.changedStepIds,
    addedStepIds: row.addedStepIds,
    removedStepIds: row.removedStepIds,
    metrics: row.metrics,
  }));

  return {
    generatedAt: new Date().toISOString(),
    safeExport,
    redaction: {
      safeExport,
      sensitiveKeys,
      policy: safeExport ? 'redacted' : 'raw',
    },
    job: job
      ? {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
          startedAt: job.startedAt ?? null,
          endedAt: job.endedAt ?? null,
          scenarioCount: job.scenarioCount,
          completedCount: job.completedCount,
          failedCount: job.failedCount,
          canceledCount: job.canceledCount,
        }
      : null,
    base: {
      traceId: matrix.traceId,
      stepId: matrix.stepId,
      anchorStepName: anchorStepName ?? null,
    },
    rows,
    causalRanking: matrix.causalRanking,
  };
}

export function buildMatrixMarkdown({ job, matrix, safeExport, anchorStepName }: MatrixMarkdownInput) {
  const lines: string[] = [];
  const generatedAt = new Date().toISOString();

  lines.push('# Counterfactual Replay Matrix');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Safe export: ${safeExport ? 'on' : 'off'}`);
  lines.push('');
  lines.push('## Base trace');
  lines.push(`- Trace: ${matrix.traceId}`);
  lines.push(`- Anchor step: ${anchorStepName ?? matrix.stepId}`);
  lines.push('');
  if (job) {
    lines.push('## Job status');
    lines.push(`- Job: ${job.id}`);
    lines.push(`- Status: ${job.status}`);
    lines.push(
      `- Scenarios: ${job.scenarioCount} (completed ${job.completedCount}, failed ${job.failedCount}, canceled ${job.canceledCount})`
    );
    lines.push('');
  }

  lines.push('## Scenario outcomes');
  lines.push('| Scenario | Status | Wall Δ (ms) | Cost Δ (USD) | Errors Δ | Changed |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  matrix.rows.forEach((row) => {
    lines.push(
      `| ${row.name} | ${row.status} | ${formatNumber(row.metrics.wallTimeDeltaMs)} | ${formatUsd(
        row.metrics.costDeltaUsd
      )} | ${formatNumber(row.metrics.errorDelta)} | ${row.metrics.changedSteps} |`
    );
  });
  lines.push('');

  lines.push('## Causal ranking');
  if (!matrix.causalRanking.length) {
    lines.push('- No causal ranking available.');
  } else {
    matrix.causalRanking.slice(0, 10).forEach((item) => {
      lines.push(
        `- ${item.factor}: score ${item.score.toFixed(3)}, confidence ${(item.confidence * 100).toFixed(0)}% (samples ${item.evidence.samples})`
      );
    });
  }
  lines.push('');

  lines.push('## Redaction');
  lines.push(`Safe export: ${safeExport ? 'enabled' : 'disabled'}.`);
  lines.push('');

  return lines.join('\n');
}
