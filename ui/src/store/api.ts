import type { StepDetails, TraceInsights, TraceSummary } from '../types';
import demoTrace from '../data/demoTrace.json';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const stepDetailsCache = new Map<string, StepDetails>();
const stepDetailsInflight = new Map<string, Promise<StepDetails | null>>();

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTraces(): Promise<TraceSummary[]> {
  const payload = await safeFetchJson<{ traces: TraceSummary[] }>(`${API_BASE}/api/traces`);
  if (payload?.traces?.length) return payload.traces;
  return [demoTrace as TraceSummary];
}

export async function fetchLatestTrace(): Promise<TraceSummary> {
  const payload = await safeFetchJson<{ trace: TraceSummary | null }>(
    `${API_BASE}/api/traces?latest=1`
  );
  if (payload?.trace) return payload.trace;
  return demoTrace as TraceSummary;
}

export async function fetchTrace(traceId: string): Promise<{ trace: TraceSummary; insights?: TraceInsights } | null> {
  const payload = await safeFetchJson<{ trace: TraceSummary; insights?: TraceInsights }>(
    `${API_BASE}/api/traces/${traceId}`
  );
  if (payload?.trace) return payload;
  return { trace: demoTrace as TraceSummary };
}

export async function fetchStepDetails(
  traceId: string,
  stepId: string,
  redactionMode: 'redacted' | 'raw',
  revealPaths: string[] = [],
  safeExport: boolean = false
): Promise<StepDetails | null> {
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

  const request = safeFetchJson<{ step: StepDetails }>(
    `${API_BASE}/api/traces/${traceId}/steps/${stepId}?redaction_mode=${effectiveMode}${safeExportQuery}${querySuffix}`
  )
    .then((payload) => {
      const step = payload?.step ?? null;
      if (step) stepDetailsCache.set(cacheKey, step);
      return step;
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

export function clearStepDetailsCache() {
  stepDetailsCache.clear();
  stepDetailsInflight.clear();
}

export async function replayFromStep(
  traceId: string,
  stepId: string,
  strategy: string,
  modifications: Record<string, unknown>,
  baseTrace?: TraceSummary
): Promise<TraceSummary | null> {
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
  const now = new Date();
  const shiftMs = 60_000;
  cloned.id = `${baseTrace.id}-replay-${now.getTime()}`;
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
