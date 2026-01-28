import { useCallback, useEffect, useState } from 'react';
import type { TraceInsights, TraceSummary } from '../types';
import { fetchTraces, fetchTrace } from '../store/api';
import { computeInsights } from '../utils/insights';

export function useTrace() {
  const [trace, setTrace] = useState<TraceSummary | null>(null);
  const [insights, setInsights] = useState<TraceInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const loadTrace = useCallback(
    async (traceId: string) => {
      const payload = await fetchTrace(traceId);
      const nextTrace = payload?.trace ?? null;
      setTrace(nextTrace);
      if (nextTrace) {
        setInsights(payload?.insights ?? computeInsights(nextTrace));
      } else {
        setInsights(null);
      }
    },
    [setTrace, setInsights]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTraces();
      setTraces(list);
      const latestId = list[list.length - 1]?.id ?? null;
      const targetId = selectedTraceId ?? latestId;
      if (!targetId) {
        setTrace(null);
        setInsights(null);
        return;
      }
      if (!selectedTraceId || selectedTraceId !== targetId) {
        setSelectedTraceId(targetId);
        return;
      }
      await loadTrace(targetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trace');
    } finally {
      setLoading(false);
    }
  }, [selectedTraceId, loadTrace]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedTraceId) return;
    setLoading(true);
    loadTrace(selectedTraceId)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load trace');
      })
      .finally(() => setLoading(false));
  }, [selectedTraceId, loadTrace]);

  return {
    trace,
    insights,
    loading,
    error,
    reload: load,
    traces,
    selectedTraceId,
    setSelectedTraceId,
  };
}
