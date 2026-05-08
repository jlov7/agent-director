import { describe, expect, it } from 'vitest';
import type { TraceSummary } from '../types';
import { buildTraceEvidenceSummary } from './traceEvidence';

describe('buildTraceEvidenceSummary', () => {
  it('summarizes imported trace provenance, cost, tokens, and latency', () => {
    const summary = buildTraceEvidenceSummary({
      id: 'trace-1',
      name: 'Imported OTel Regression',
      startedAt: '2026-05-07T10:00:00.000Z',
      endedAt: '2026-05-07T10:00:02.000Z',
      status: 'failed',
      metadata: {
        source: 'otel_genai',
        framework: 'otel_genai',
        provider: 'openai',
        providerTraceId: 'otel-trace-1',
        agentName: 'EvalAgent',
        modelId: 'gpt-4.1',
        wallTimeMs: 2000,
        totalTokens: 75,
        totalCostUsd: 0.0042,
        errorCount: 1,
        importerWarnings: ['missing parent normalized'],
      },
      steps: [
        {
          id: 's1',
          index: 0,
          type: 'llm_call',
          name: 'Plan',
          startedAt: '2026-05-07T10:00:00.000Z',
          endedAt: '2026-05-07T10:00:01.000Z',
          durationMs: 1000,
          status: 'completed',
          childStepIds: [],
          providerSpanId: 'span-1',
        },
        {
          id: 's2',
          index: 1,
          type: 'tool_call',
          name: 'Search',
          startedAt: '2026-05-07T10:00:01.000Z',
          endedAt: '2026-05-07T10:00:02.000Z',
          durationMs: 1000,
          status: 'failed',
          error: 'timeout',
          childStepIds: [],
          providerSpanId: 'span-2',
          providerParentSpanId: 'span-1',
          metrics: { tokensTotal: 25, costUsd: 0.001 },
        },
      ],
    } as TraceSummary);

    expect(summary).toEqual({
      sourceLabel: 'otel_genai',
      providerLabel: 'openai',
      modelLabel: 'gpt-4.1',
      providerTraceId: 'otel-trace-1',
      tokenLabel: '75 tokens',
      costLabel: '$0.0042',
      wallTimeLabel: '2.0s wall time',
      slowestStepLabel: 'Slowest: Plan, 1.0s',
      failureLabel: '1 failed step',
      warningCount: 1,
      warningLabel: '1 importer warning',
      replayModeLabel: 'Recorded evidence',
      replayTruthLabel: 'Recorded trace evidence, no replay branch selected.',
      imported: true,
    });
  });
});
