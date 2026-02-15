import type {
  ExtensionDefinition,
  InvestigationReport,
  ReplayJob,
  ReplayMatrix,
  ReplayScenarioInput,
  StepDetails,
  TraceComment,
  TraceInsights,
  TraceQueryResult,
  TraceSummary,
} from '../types';
import demoTrace from '../data/demoTrace.json';
import { diffTraces } from '../utils/diff';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const FORCE_DEMO = import.meta.env.VITE_FORCE_DEMO === '1';
const stepDetailsCache = new Map<string, StepDetails>();
const stepDetailsInflight = new Map<string, Promise<StepDetails | null>>();
const replayJobCache = new Map<string, { job: ReplayJob; matrix: ReplayMatrix }>();

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function safePostJson<T>(url: string, payload: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTraces(): Promise<TraceSummary[]> {
  if (FORCE_DEMO) return [demoTrace as TraceSummary];
  const payload = await safeFetchJson<{ traces: TraceSummary[] }>(`${API_BASE}/api/traces`);
  if (payload && Array.isArray(payload.traces)) return payload.traces;
  return [demoTrace as TraceSummary];
}

export async function fetchLatestTrace(): Promise<TraceSummary> {
  if (FORCE_DEMO) return demoTrace as TraceSummary;
  const payload = await safeFetchJson<{ trace: TraceSummary | null }>(
    `${API_BASE}/api/traces?latest=1`
  );
  if (payload?.trace) return payload.trace;
  return demoTrace as TraceSummary;
}

export async function fetchTrace(traceId: string): Promise<{ trace: TraceSummary; insights?: TraceInsights } | null> {
  if (FORCE_DEMO) return { trace: demoTrace as TraceSummary };
  const payload = await safeFetchJson<{ trace: TraceSummary; insights?: TraceInsights }>(
    `${API_BASE}/api/traces/${traceId}`
  );
  if (payload?.trace) return payload;
  return { trace: demoTrace as TraceSummary };
}

// Demo payload data for step details
const demoPayloads: Record<string, Record<string, unknown>> = {
  s1: {
    role: 'assistant',
    content: "I'll analyze the user's request and create a plan to fetch information from two sources: a web search for current EU AI Act updates and a database query for historical compliance data.",
    model: 'gpt-4o-2024-11-20',
    usage: { prompt_tokens: 150, completion_tokens: 150, total_tokens: 300 },
    reasoning: "The user wants comprehensive information about AI regulations. I'll use parallel tool calls to maximize efficiency.",
  },
  s2: {
    role: 'assistant',
    content: null,
    tool_calls: [
      { id: 'tc-001', type: 'function', function: { name: 'web_search', arguments: '{"q":"EU AI Act latest updates 2026"}' } },
      { id: 'tc-002', type: 'function', function: { name: 'database_query', arguments: '{"sql":"SELECT * FROM compliance_records WHERE region=\'EU\' ORDER BY date DESC LIMIT 10"}' } },
    ],
    model: 'gpt-4o-2024-11-20',
    usage: { prompt_tokens: 80, completion_tokens: 40, total_tokens: 120 },
  },
  s3: {
    tool_call_id: 'tc-001',
    tool_name: 'web_search',
    input: { q: 'EU AI Act latest updates 2026' },
    output: {
      results: [
        { title: 'EU AI Act Implementation Timeline', url: 'https://example.com/ai-act', snippet: 'The EU AI Act enters full force in 2026...' },
        { title: 'High-Risk AI Systems Classification', url: 'https://example.com/classification', snippet: 'New guidance on high-risk categorization...' },
        { title: 'Compliance Deadlines Approaching', url: 'https://example.com/deadlines', snippet: 'Organizations must comply by August 2026...' },
      ],
      total_results: 3,
      search_time_ms: 1850,
    },
    status: 'success',
  },
  s4: {
    tool_call_id: 'tc-002',
    tool_name: 'database_query',
    input: { sql: "SELECT * FROM compliance_records WHERE region='EU' ORDER BY date DESC LIMIT 10" },
    output: {
      rows: [
        { id: 1, company: 'TechCorp', status: 'compliant', date: '2026-01-15' },
        { id: 2, company: 'AIStartup', status: 'in_progress', date: '2026-01-10' },
        { id: 3, company: 'DataCo', status: 'compliant', date: '2026-01-05' },
      ],
      row_count: 42,
      query_time_ms: 1100,
    },
    status: 'success',
  },
  s5: {
    role: 'assistant',
    content: "Based on my analysis of the web search results and database records:\n\n**Key Findings:**\n1. The EU AI Act is now in full effect as of 2026\n2. High-risk AI systems require specific compliance measures\n3. 42 organizations in our database have compliance records\n\n**Recommendations:**\n- Review classification of AI systems\n- Ensure documentation is complete\n- Schedule compliance audit before August deadline",
    model: 'gpt-4o-2024-11-20',
    usage: { prompt_tokens: 450, completion_tokens: 250, total_tokens: 700 },
    reasoning: "Synthesized information from both the web search (3 relevant articles) and database query (42 compliance records) to provide actionable insights.",
  },
};

function getDemoStepDetails(stepId: string, safeExport: boolean): StepDetails | null {
  const step = (demoTrace as TraceSummary).steps.find((s) => s.id === stepId);
  if (!step) return null;

  const rawData = demoPayloads[stepId];
  if (!rawData) return null;

  // Apply redaction for safe export
  const data = safeExport ? redactSensitiveData(rawData) : rawData;

  return {
    ...step,
    data,
  };
}

function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const redacted = JSON.parse(JSON.stringify(data));
  // Redact SQL queries
  if (redacted.input?.sql) {
    redacted.input.sql = '[REDACTED]';
  }
  // Redact database rows
  if (redacted.output?.rows) {
    redacted.output.rows = redacted.output.rows.map((row: Record<string, unknown>) => ({
      ...row,
      company: '[REDACTED]',
    }));
  }
  // Redact tool call arguments
  if (redacted.tool_calls) {
    redacted.tool_calls = redacted.tool_calls.map((tc: Record<string, unknown>) => ({
      ...tc,
      function: {
        ...(tc.function as Record<string, unknown>),
        arguments: '[REDACTED]',
      },
    }));
  }
  return redacted;
}

export async function fetchStepDetails(
  traceId: string,
  stepId: string,
  redactionMode: 'redacted' | 'raw',
  revealPaths: string[] = [],
  safeExport: boolean = false
): Promise<StepDetails | null> {
  if (FORCE_DEMO) {
    // Simulate network delay for realism
    await new Promise((resolve) => setTimeout(resolve, 150));
    return getDemoStepDetails(stepId, safeExport);
  }
  const effectiveMode = safeExport ? 'redacted' : redactionMode;
  const effectiveRevealPaths = effectiveMode === 'redacted' && !safeExport ? revealPaths : [];
  const cacheKey = `${traceId}:${stepId}:${effectiveMode}:${safeExport}:${effectiveRevealPaths.join('|')}`;

  if (stepDetailsCache.has(cacheKey)) {
    return stepDetailsCache.get(cacheKey) ?? null;
  }
  if (stepDetailsInflight.has(cacheKey)) {
    return stepDetailsInflight.get(cacheKey) ?? null;
  }

  const revealQuery = effectiveRevealPaths.map((path) => `reveal_path=${encodeURIComponent(path)}`).join('&');
  const querySuffix = revealQuery ? `&${revealQuery}` : '';
  const safeExportQuery = safeExport ? '&safe_export=1' : '';
  const roleQuery = '&role=admin';

  const request = safeFetchJson<{ step: StepDetails }>(
    `${API_BASE}/api/traces/${traceId}/steps/${stepId}?redaction_mode=${effectiveMode}${roleQuery}${safeExportQuery}${querySuffix}`
  )
    .then((payload) => {
      const step = payload?.step ?? null;
      if (step) {
        stepDetailsCache.set(cacheKey, step);
        return step;
      }
      // Fallback to demo data when API is unavailable
      const demoStep = getDemoStepDetails(stepId, safeExport);
      if (demoStep) stepDetailsCache.set(cacheKey, demoStep);
      return demoStep;
    })
    .finally(() => {
      stepDetailsInflight.delete(cacheKey);
    });

  stepDetailsInflight.set(cacheKey, request);
  return request;
}

export async function prefetchStepDetails(
  traceId: string,
  stepId: string,
  safeExport: boolean
): Promise<void> {
  await fetchStepDetails(traceId, stepId, 'redacted', [], safeExport);
}

export function subscribeToLatestTrace(
  onTrace: (trace: TraceSummary) => void,
  onError?: (error: unknown) => void
): () => void {
  if (FORCE_DEMO || typeof EventSource === 'undefined') {
    return () => undefined;
  }
  const source = new EventSource(`${API_BASE}/api/stream/traces/latest`);

  const parseAndEmit = (rawData: string) => {
    try {
      const payload = JSON.parse(rawData) as { trace?: TraceSummary };
      if (payload.trace) {
        onTrace(payload.trace);
      }
    } catch {
      // Ignore malformed SSE data.
    }
  };

  const traceHandler = (event: MessageEvent<string>) => {
    parseAndEmit(event.data);
  };

  source.addEventListener('trace', traceHandler as EventListener);
  source.onmessage = (event) => parseAndEmit(event.data);
  source.onerror = (event) => {
    if (onError) onError(event);
  };

  return () => {
    source.removeEventListener('trace', traceHandler as EventListener);
    source.close();
  };
}

export function clearStepDetailsCache() {
  stepDetailsCache.clear();
  stepDetailsInflight.clear();
}

export async function runTraceQuery(traceId: string, query: string): Promise<TraceQueryResult | null> {
  if (FORCE_DEMO) return null;
  const payload = await safePostJson<TraceQueryResult>(`${API_BASE}/api/traces/${traceId}/query`, { query });
  return payload;
}

export async function fetchInvestigation(traceId: string): Promise<InvestigationReport | null> {
  if (FORCE_DEMO) return null;
  const payload = await safeFetchJson<{ investigation: InvestigationReport }>(
    `${API_BASE}/api/traces/${traceId}/investigate`
  );
  return payload?.investigation ?? null;
}

export async function fetchComments(traceId: string, stepId: string): Promise<TraceComment[]> {
  if (FORCE_DEMO) return [];
  const payload = await safeFetchJson<{ comments: TraceComment[] }>(
    `${API_BASE}/api/traces/${traceId}/comments?step_id=${encodeURIComponent(stepId)}`
  );
  return payload?.comments ?? [];
}

export async function createComment(
  traceId: string,
  stepId: string,
  author: string,
  body: string,
  pinned: boolean
): Promise<TraceComment | null> {
  if (FORCE_DEMO) return null;
  const payload = await safePostJson<{ comment: TraceComment }>(
    `${API_BASE}/api/traces/${traceId}/comments`,
    { step_id: stepId, author, body, pinned }
  );
  return payload?.comment ?? null;
}

export async function listExtensions(): Promise<ExtensionDefinition[]> {
  if (FORCE_DEMO) return [];
  const payload = await safeFetchJson<{ extensions: ExtensionDefinition[] }>(`${API_BASE}/api/extensions`);
  return payload?.extensions ?? [];
}

export async function runExtension(
  extensionId: string,
  traceId: string
): Promise<{ extensionId: string; traceId: string; result: Record<string, unknown> } | null> {
  if (FORCE_DEMO) return null;
  return safePostJson<{ extensionId: string; traceId: string; result: Record<string, unknown> }>(
    `${API_BASE}/api/extensions/${encodeURIComponent(extensionId)}/run`,
    { trace_id: traceId }
  );
}

export async function replayFromStep(
  traceId: string,
  stepId: string,
  strategy: string,
  modifications: Record<string, unknown>,
  baseTrace?: TraceSummary
): Promise<TraceSummary | null> {
  if (FORCE_DEMO) {
    return baseTrace ? buildLocalReplay(baseTrace, stepId, strategy, modifications) : null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/traces/${traceId}/replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_id: stepId, strategy, modifications }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { trace: TraceSummary };
    return payload.trace;
  } catch {
    return baseTrace ? buildLocalReplay(baseTrace, stepId, strategy, modifications) : null;
  }
}

function buildLocalReplay(
  baseTrace: TraceSummary,
  stepId: string,
  strategy: string,
  modifications: Record<string, unknown>
): TraceSummary {
  const cloned = JSON.parse(JSON.stringify(baseTrace)) as TraceSummary;
  const shiftMs = 60_000;
  const fallbackEpoch = Date.parse('2024-01-01T00:00:00.000Z');
  const baseEpoch = Date.parse(baseTrace.endedAt ?? baseTrace.startedAt ?? '');
  const baseTime = Number.isNaN(baseEpoch) ? fallbackEpoch : baseEpoch;
  const replayEpoch = baseTime + shiftMs;
  const now = new Date(replayEpoch);
  cloned.id = `${baseTrace.id}-replay-${replayEpoch}`;
  cloned.parentTraceId = baseTrace.id;
  cloned.branchPointStepId = stepId;
  cloned.replay = {
    strategy: strategy as 'recorded' | 'live' | 'hybrid',
    modifiedStepId: stepId,
    modifications,
    createdAt: now.toISOString(),
  };

  const shiftTime = (iso: string | null) => {
    if (!iso) return iso;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? iso : new Date(parsed + shiftMs).toISOString();
  };

  cloned.startedAt = shiftTime(cloned.startedAt) ?? cloned.startedAt;
  cloned.endedAt = shiftTime(cloned.endedAt);

  const invalidatedIds = new Set<string>();
  const branchIndex = cloned.steps.find((step) => step.id === stepId)?.index ?? -1;
  if (strategy === 'live') {
    cloned.steps.forEach((step) => {
      if (step.index > branchIndex) invalidatedIds.add(step.id);
    });
  } else if (strategy === 'hybrid') {
    cloned.steps.forEach((step) => {
      if (step.index > branchIndex) invalidatedIds.add(step.id);
    });
  }

  cloned.steps = cloned.steps.map((step) => {
    const next = { ...step };
    next.startedAt = shiftTime(step.startedAt) ?? step.startedAt;
    next.endedAt = shiftTime(step.endedAt);
    if (step.id === stepId) {
      const basePreview = step.preview?.outputPreview ?? '';
      next.preview = {
        ...step.preview,
        outputPreview: `${basePreview} (modified)`.trim(),
      };
    }
    if (invalidatedIds.has(step.id)) {
      next.status = 'pending';
      next.endedAt = null;
      next.durationMs = undefined;
      next.metrics = undefined;
      next.preview = { ...step.preview, outputPreview: '[invalidated for replay]' };
    }
    return next;
  });

  return cloned;
}

export async function compareTraces(
  leftTraceId: string,
  rightTraceId: string
): Promise<Record<string, unknown> | null> {
  if (FORCE_DEMO) return null;
  try {
    const response = await fetch(`${API_BASE}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left_trace_id: leftTraceId, right_trace_id: rightTraceId }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { diff: Record<string, unknown> };
    return payload.diff;
  } catch {
    return null;
  }
}

export async function createReplayJob(input: {
  traceId: string;
  stepId: string;
  scenarios: ReplayScenarioInput[];
  execute?: boolean;
}): Promise<ReplayJob | null> {
  if (FORCE_DEMO) {
    return buildDemoReplayJob(input);
  }
  try {
    const response = await fetch(`${API_BASE}/api/replay-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trace_id: input.traceId,
        step_id: input.stepId,
        scenarios: input.scenarios,
        execute: input.execute ?? true,
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { job: ReplayJob };
    return payload.job;
  } catch {
    return null;
  }
}

export async function fetchReplayJob(jobId: string): Promise<ReplayJob | null> {
  if (FORCE_DEMO) {
    return replayJobCache.get(jobId)?.job ?? null;
  }
  const payload = await safeFetchJson<{ job: ReplayJob }>(`${API_BASE}/api/replay-jobs/${jobId}`);
  return payload?.job ?? null;
}

export async function fetchReplayMatrix(jobId: string): Promise<ReplayMatrix | null> {
  if (FORCE_DEMO) {
    return replayJobCache.get(jobId)?.matrix ?? null;
  }
  const payload = await safeFetchJson<{ matrix: ReplayMatrix }>(`${API_BASE}/api/replay-jobs/${jobId}/matrix`);
  return payload?.matrix ?? null;
}

export async function cancelReplayJob(jobId: string): Promise<ReplayJob | null> {
  if (FORCE_DEMO) {
    const cached = replayJobCache.get(jobId);
    if (!cached) return null;
    const canceled = {
      ...cached.job,
      status: 'canceled' as const,
      scenarios: cached.job.scenarios.map((scenario) => ({
        ...scenario,
        status: 'canceled' as const,
        endedAt: scenario.endedAt ?? new Date().toISOString(),
      })),
    };
    replayJobCache.set(jobId, { ...cached, job: canceled });
    return canceled;
  }
  try {
    const response = await fetch(`${API_BASE}/api/replay-jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { job: ReplayJob };
    return payload.job;
  } catch {
    return null;
  }
}

function buildDemoReplayJob(input: {
  traceId: string;
  stepId: string;
  scenarios: ReplayScenarioInput[];
  execute?: boolean;
}): ReplayJob {
  const jobId = `demo-job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const baseTrace = demoTrace as TraceSummary;
  const startedAt = new Date().toISOString();
  const scenarios = input.scenarios.map((scenario, index) => ({
    id: `demo-scn-${index + 1}`,
    name: scenario.name,
    strategy: scenario.strategy,
    modifications: scenario.modifications,
    status: 'running' as const,
    startedAt,
    endedAt: null,
    replayTraceId: `${jobId}-replay-${index + 1}`,
  }));

  const job: ReplayJob = {
    id: jobId,
    traceId: input.traceId,
    stepId: input.stepId,
    status: 'running',
    createdAt: startedAt,
    startedAt,
    endedAt: null,
    scenarioCount: scenarios.length,
    completedCount: 0,
    failedCount: 0,
    canceledCount: 0,
    scenarios,
  };

  const rows = scenarios.map((scenario) => {
    const replayTrace = buildLocalReplay(baseTrace, input.stepId, scenario.strategy, scenario.modifications);
    replayTrace.id = scenario.replayTraceId;
    const diff = diffTraces(baseTrace, replayTrace);
    const baseCost = baseTrace.metadata.totalCostUsd ?? 0;
    const replayCost = replayTrace.metadata.totalCostUsd ?? baseCost;
    const baseErrors = baseTrace.metadata.errorCount ?? 0;
    const replayErrors = replayTrace.metadata.errorCount ?? baseErrors;
    const baseRetries = baseTrace.metadata.retryCount ?? 0;
    const replayRetries = replayTrace.metadata.retryCount ?? baseRetries;
    const invalidated = replayTrace.steps.filter((step) => step.status === 'pending').length;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      strategy: scenario.strategy,
      status: 'completed' as const,
      replayTraceId: scenario.replayTraceId,
      modifications: scenario.modifications,
      error: null,
      changedStepIds: diff.changedSteps,
      addedStepIds: diff.addedSteps,
      removedStepIds: diff.removedSteps,
      metrics: {
        costDeltaUsd: replayCost - baseCost,
        wallTimeDeltaMs: (replayTrace.metadata.wallTimeMs ?? 0) - (baseTrace.metadata.wallTimeMs ?? 0),
        errorDelta: replayErrors - baseErrors,
        retryDelta: replayRetries - baseRetries,
        changedSteps: diff.changedSteps.length,
        addedSteps: diff.addedSteps.length,
        removedSteps: diff.removedSteps.length,
        invalidatedStepCount: invalidated,
      },
    };
  });

  const matrix: ReplayMatrix = {
    jobId,
    traceId: input.traceId,
    stepId: input.stepId,
    rows,
    causalRanking: [],
  };

  replayJobCache.set(jobId, { job, matrix });
  window.setTimeout(() => {
    const cached = replayJobCache.get(jobId);
    if (!cached) return;
    const finishedAt = new Date().toISOString();
    const completedScenarios = cached.job.scenarios.map((scenario) => ({
      ...scenario,
      status: 'completed' as const,
      endedAt: finishedAt,
    }));
    const completedJob: ReplayJob = {
      ...cached.job,
      status: 'completed',
      endedAt: finishedAt,
      completedCount: completedScenarios.length,
      scenarios: completedScenarios,
    };
    const completedMatrix: ReplayMatrix = {
      ...cached.matrix,
      rows: cached.matrix.rows.map((row) => ({ ...row, status: 'completed' as const })),
    };
    replayJobCache.set(jobId, { job: completedJob, matrix: completedMatrix });
  }, 600);
  return job;
}
