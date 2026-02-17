import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TraceSummary, StepDetails } from '../types';
import demoTrace from '../data/demoTrace.json';

/**
 * API Layer Tests
 *
 * Note: The VITE_FORCE_DEMO environment variable is read at module load time,
 * making it difficult to test demo mode separately. These tests focus on:
 * 1. API behavior when not in demo mode (fetch interactions)
 * 2. Fallback behavior (returning demo data on errors)
 * 3. Cache functionality
 * 4. Replay functionality
 */

// Import the module functions
import {
  fetchTraces,
  fetchLatestTrace,
  fetchTrace,
  fetchStepDetails,
  replayFromStep,
  subscribeToLatestTrace,
  runTraceQuery,
  fetchInvestigation,
  fetchComments,
  createComment,
  listExtensions,
  runExtension,
  createReplayJob,
  fetchReplayJob,
  fetchReplayMatrix,
  cancelReplayJob,
  createGameplaySession,
  getGameplaySession,
  joinGameplaySession,
  applyGameplayAction,
  fetchGameplayObservabilitySummary,
  fetchGameplayAnalyticsFunnels,
  fetchGameplayLiveOps,
  advanceGameplayLiveOpsWeek,
  subscribeToGameplaySession,
  clearStepDetailsCache,
} from './api';

describe('API Layer', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    clearStepDetailsCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
  });

  describe('fetchTraces', () => {
    it('returns traces array from successful API response', async () => {
      const mockTraces: TraceSummary[] = [
        { ...demoTrace, id: 'trace-1', name: 'Test Trace 1' } as TraceSummary,
        { ...demoTrace, id: 'trace-2', name: 'Test Trace 2' } as TraceSummary,
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ traces: mockTraces }),
      });

      const traces = await fetchTraces();
      expect(traces).toHaveLength(2);
      expect(traces[0].id).toBe('trace-1');
      expect(traces[1].id).toBe('trace-2');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/traces'));
    });

    it('returns empty list on empty API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ traces: [] }),
      });

      const traces = await fetchTraces();
      expect(traces).toHaveLength(0);
    });

    it('returns demo trace on API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const traces = await fetchTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].id).toBe(demoTrace.id);
    });

    it('returns demo trace on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const traces = await fetchTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].id).toBe(demoTrace.id);
    });

    it('returns demo trace when payload is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const traces = await fetchTraces();
      expect(traces[0].id).toBe(demoTrace.id);
    });

    it('returns demo trace when traces property is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const traces = await fetchTraces();
      expect(traces[0].id).toBe(demoTrace.id);
    });
  });

  describe('fetchLatestTrace', () => {
    it('returns latest trace from successful API response', async () => {
      const mockTrace = { ...demoTrace, id: 'latest-trace' } as TraceSummary;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace: mockTrace }),
      });

      const trace = await fetchLatestTrace();
      expect(trace.id).toBe('latest-trace');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/traces?latest=1'));
    });

    it('returns demo trace when API returns null trace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace: null }),
      });

      const trace = await fetchLatestTrace();
      expect(trace.id).toBe(demoTrace.id);
    });

    it('returns demo trace on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const trace = await fetchLatestTrace();
      expect(trace.id).toBe(demoTrace.id);
    });
  });

  describe('fetchTrace', () => {
    it('returns trace with insights from successful API response', async () => {
      const mockTrace = { ...demoTrace, id: 'specific-trace' } as TraceSummary;
      const mockInsights = { errors: 0, retries: 0, wallTimeMs: 5000, workTimeMs: 7200 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace: mockTrace, insights: mockInsights }),
      });

      const result = await fetchTrace('specific-trace');
      expect(result?.trace.id).toBe('specific-trace');
      expect(result?.insights).toEqual(mockInsights);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/traces/specific-trace'));
    });

    it('returns trace without insights when not provided', async () => {
      const mockTrace = { ...demoTrace, id: 'no-insights-trace' } as TraceSummary;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace: mockTrace }),
      });

      const result = await fetchTrace('no-insights-trace');
      expect(result?.trace.id).toBe('no-insights-trace');
      expect(result?.insights).toBeUndefined();
    });

    it('returns demo trace on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchTrace('nonexistent');
      expect(result?.trace.id).toBe(demoTrace.id);
    });

    it('returns demo trace on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchTrace('any-id');
      expect(result?.trace.id).toBe(demoTrace.id);
    });
  });

  describe('fetchStepDetails', () => {
    const createMockStepDetails = (overrides: Partial<StepDetails> = {}): StepDetails => ({
      id: 's1',
      index: 0,
      type: 'llm_call',
      name: 'plan',
      startedAt: '2026-01-27T10:00:00.000Z',
      endedAt: '2026-01-27T10:00:01.000Z',
      status: 'completed',
      childStepIds: [],
      data: { role: 'assistant', content: 'Test content' },
      ...overrides,
    });

    it('returns step details from successful API response', async () => {
      const mockStep = createMockStepDetails();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ step: mockStep }),
      });

      const result = await fetchStepDetails('trace-1', 's1', 'redacted');
      expect(result?.id).toBe('s1');
      expect(result?.data.role).toBe('assistant');
    });

    it('falls back to demo data on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchStepDetails('trace-1', 's1', 'redacted');
      // Falls back to demo data for step s1
      expect(result).not.toBeNull();
      expect(result?.id).toBe('s1');
      expect(result?.name).toBe('plan');
    });

    it('falls back to demo data on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchStepDetails('trace-1', 's1', 'redacted');
      // Falls back to demo data for step s1
      expect(result).not.toBeNull();
      expect(result?.id).toBe('s1');
      expect(result?.name).toBe('plan');
    });

    it('returns null when step not in demo data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchStepDetails('trace-1', 'nonexistent-step', 'redacted');
      expect(result).toBeNull();
    });

    describe('caching', () => {
      it('caches successful responses', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ step: mockStep }),
        });

        // First call fetches from API
        const result1 = await fetchStepDetails('trace-1', 's1', 'redacted');
        expect(result1?.id).toBe('s1');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call uses cache
        const result2 = await fetchStepDetails('trace-1', 's1', 'redacted');
        expect(result2?.id).toBe('s1');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('uses different cache keys for different redaction modes', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ step: mockStep }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted');
        await fetchStepDetails('trace-1', 's1', 'raw');

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('uses different cache keys for different safeExport values', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ step: mockStep }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted', [], false);
        await fetchStepDetails('trace-1', 's1', 'redacted', [], true);

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('uses different cache keys for different reveal paths', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ step: mockStep }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted', ['path.a']);
        await fetchStepDetails('trace-1', 's1', 'redacted', ['path.b']);

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('deduplicates inflight requests', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ step: mockStep }),
                  }),
                50
              )
            )
        );

        // Make concurrent requests
        const [result1, result2] = await Promise.all([
          fetchStepDetails('trace-1', 's1', 'redacted'),
          fetchStepDetails('trace-1', 's1', 'redacted'),
        ]);

        expect(result1?.id).toBe('s1');
        expect(result2?.id).toBe('s1');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('clears cache when clearStepDetailsCache is called', async () => {
        const mockStep = createMockStepDetails();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ step: mockStep }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted');
        clearStepDetailsCache();
        await fetchStepDetails('trace-1', 's1', 'redacted');

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('URL construction', () => {
      it('builds correct URL for basic request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ step: null }),
        });

        await fetchStepDetails('trace-123', 'step-456', 'redacted');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/traces/trace-123/steps/step-456')
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('redaction_mode=redacted')
        );
      });

      it('includes reveal paths in URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ step: null }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted', ['path.one', 'path.two']);

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('reveal_path=path.one');
        expect(calledUrl).toContain('reveal_path=path.two');
      });

      it('includes safe_export flag when true', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ step: null }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted', [], true);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('safe_export=1')
        );
      });

      it('encodes reveal paths correctly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ step: null }),
        });

        await fetchStepDetails('trace-1', 's1', 'redacted', ['path with spaces']);

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('reveal_path=path%20with%20spaces');
      });
    });
  });

  describe('replayFromStep', () => {
    it('sends POST request with correct payload', async () => {
      const mockReplayTrace = { ...demoTrace, id: 'replay-trace' } as TraceSummary;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace: mockReplayTrace }),
      });

      const result = await replayFromStep('trace-1', 's2', 'live', { key: 'value' });

      expect(result?.id).toBe('replay-trace');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/traces/trace-1/replay'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_id: 's2',
            strategy: 'live',
            modifications: { key: 'value' },
          }),
        })
      );
    });

    it('returns null on API error without baseTrace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await replayFromStep('trace-1', 's2', 'live', {});
      expect(result).toBeNull();
    });

    it('returns null on network error without baseTrace', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await replayFromStep('trace-1', 's2', 'live', {});
      expect(result).toBeNull();
    });

    describe('local replay fallback', () => {
      it('returns null on API error even with baseTrace (fallback only on network error)', async () => {
        // Note: The actual implementation only falls back to local replay on network errors,
        // not on HTTP error responses. This tests the actual behavior.
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's2', 'live', {}, baseTrace);

        // API errors return null, only network exceptions trigger local replay
        expect(result).toBeNull();
      });

      it('falls back to local replay on network error with baseTrace', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's2', 'hybrid', {}, baseTrace);

        expect(result).not.toBeNull();
        expect(result?.replay?.strategy).toBe('hybrid');
      });

      it('sets correct replay metadata', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const modifications = { prompt: 'modified prompt' };
        const result = await replayFromStep('trace-1', 's2', 'live', modifications, baseTrace);

        expect(result?.parentTraceId).toBe(baseTrace.id);
        expect(result?.branchPointStepId).toBe('s2');
        expect(result?.replay?.strategy).toBe('live');
        expect(result?.replay?.modifiedStepId).toBe('s2');
        expect(result?.replay?.modifications).toEqual(modifications);
        expect(result?.replay?.createdAt).toBeDefined();
      });

      it('invalidates steps after branch point for live strategy', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's2', 'live', {}, baseTrace);

        // s2 is index 1, so s3 (index 2), s4 (index 3), s5 (index 4) should be invalidated
        const s3 = result?.steps.find((s) => s.id === 's3');
        const s4 = result?.steps.find((s) => s.id === 's4');
        const s5 = result?.steps.find((s) => s.id === 's5');

        expect(s3?.status).toBe('pending');
        expect(s4?.status).toBe('pending');
        expect(s5?.status).toBe('pending');
        expect(s3?.preview?.outputPreview).toBe('[invalidated for replay]');
      });

      it('invalidates steps after branch point for hybrid strategy', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's2', 'hybrid', {}, baseTrace);

        const s3 = result?.steps.find((s) => s.id === 's3');
        expect(s3?.status).toBe('pending');
      });

      it('does not invalidate steps for recorded strategy', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's2', 'recorded', {}, baseTrace);

        const s3 = result?.steps.find((s) => s.id === 's3');
        expect(s3?.status).toBe('completed');
      });

      it('marks branch point step as modified', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's1', 'recorded', {}, baseTrace);

        const s1 = result?.steps.find((s) => s.id === 's1');
        expect(s1?.preview?.outputPreview).toContain('(modified)');
      });

      it('shifts timestamps forward', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's1', 'recorded', {}, baseTrace);

        const baseStart = new Date(baseTrace.startedAt).getTime();
        const replayStart = new Date(result?.startedAt ?? '').getTime();

        // Should be shifted forward by 60 seconds
        expect(replayStart - baseStart).toBe(60000);
      });

      it('generates unique replay IDs based on timestamp', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const baseTrace = demoTrace as TraceSummary;
        const result = await replayFromStep('trace-1', 's1', 'recorded', {}, baseTrace);

        // The replay ID contains the base trace id and '-replay-'
        expect(result?.id).toContain(baseTrace.id);
        expect(result?.id).toContain('-replay-');
        // The ID includes a timestamp component
        expect(result?.id).toMatch(/-replay-\d+$/);
      });
    });
  });

  describe('replay jobs', () => {
    it('creates replay job with expected payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            id: 'job-1',
            status: 'queued',
            traceId: 'trace-1',
            stepId: 's1',
            scenarioCount: 1,
            completedCount: 0,
            failedCount: 0,
            canceledCount: 0,
            scenarios: [],
          },
        }),
      });

      const result = await createReplayJob({
        traceId: 'trace-1',
        stepId: 's1',
        scenarios: [{ name: 'Prompt tweak', strategy: 'hybrid', modifications: { prompt: 'shorter' } }],
      });

      expect(result?.id).toBe('job-1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/replay-jobs'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('fetches replay job by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            id: 'job-1',
            status: 'running',
            traceId: 'trace-1',
            stepId: 's1',
            scenarioCount: 1,
            completedCount: 0,
            failedCount: 0,
            canceledCount: 0,
            scenarios: [],
          },
        }),
      });

      const result = await fetchReplayJob('job-1');
      expect(result?.id).toBe('job-1');
      expect(result?.status).toBe('running');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/replay-jobs/job-1'));
    });

    it('fetches replay matrix payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matrix: {
            jobId: 'job-1',
            traceId: 'trace-1',
            stepId: 's1',
            rows: [],
            causalRanking: [],
          },
        }),
      });

      const result = await fetchReplayMatrix('job-1');
      expect(result?.jobId).toBe('job-1');
      expect(result?.rows).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/replay-jobs/job-1/matrix'));
    });

    it('cancels replay job', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            id: 'job-1',
            status: 'canceled',
            traceId: 'trace-1',
            stepId: 's1',
            scenarioCount: 1,
            completedCount: 0,
            failedCount: 0,
            canceledCount: 1,
            scenarios: [],
          },
        }),
      });

      const result = await cancelReplayJob('job-1');
      expect(result?.status).toBe('canceled');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/replay-jobs/job-1/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('returns null when replay job APIs fail', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      expect(
        await createReplayJob({
          traceId: 'trace-1',
          stepId: 's1',
          scenarios: [{ name: 'x', strategy: 'hybrid', modifications: {} }],
        })
      ).toBeNull();
      expect(await fetchReplayJob('job-1')).toBeNull();
      expect(await fetchReplayMatrix('job-1')).toBeNull();
      expect(await cancelReplayJob('job-1')).toBeNull();
    });
  });

  describe('Error Scenarios', () => {
    it('handles malformed JSON response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      const traces = await fetchTraces();
      expect(traces[0].id).toBe(demoTrace.id);
    });

    it('handles null response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const trace = await fetchLatestTrace();
      expect(trace.id).toBe(demoTrace.id);
    });

    it('handles timeout-like scenarios', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 10);
          })
      );

      const traces = await fetchTraces();
      expect(traces[0].id).toBe(demoTrace.id);
    });
  });

  describe('subscribeToLatestTrace', () => {
    it('parses trace events and closes subscription', () => {
      const listeners: Record<string, Array<(event: MessageEvent<string>) => void>> = {};
      const close = vi.fn();
      class MockEventSource {
        onmessage: ((event: MessageEvent<string>) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        constructor(url: string) {
          void url;
        }

        addEventListener(type: string, listener: EventListener) {
          if (!listeners[type]) listeners[type] = [];
          listeners[type].push(listener as (event: MessageEvent<string>) => void);
        }

        removeEventListener(type: string, listener: EventListener) {
          listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== listener);
        }

        close() {
          close();
        }
      }

      globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
      let emitted: TraceSummary | null = null;
      const unsubscribe = subscribeToLatestTrace((trace) => {
        emitted = trace;
      });

      const traceEvent = listeners.trace?.[0];
      expect(traceEvent).toBeDefined();
      traceEvent?.({
        data: JSON.stringify({ trace: { ...(demoTrace as TraceSummary), id: 'live-trace-1' } }),
      } as MessageEvent<string>);

      expect(emitted).not.toBeNull();
      expect(emitted!.id).toBe('live-trace-1');
      unsubscribe();
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('runTraceQuery', () => {
    it('posts query and returns results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'type=llm_call',
          matchedStepIds: ['s1'],
          matchCount: 1,
          clauses: [{ field: 'type', op: '=', value: 'llm_call' }],
          explain: 'Clauses use AND semantics in evaluation order.',
        }),
      });

      const result = await runTraceQuery('trace-1', 'type=llm_call');
      expect(result?.matchedStepIds).toEqual(['s1']);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/traces/trace-1/query'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('returns null when query API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
      const result = await runTraceQuery('trace-1', 'invalid');
      expect(result).toBeNull();
    });
  });

  describe('fetchInvestigation', () => {
    it('returns investigation report from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          investigation: {
            generatedAt: '2026-02-15T01:00:00.000Z',
            traceId: 'trace-1',
            hypotheses: [
              {
                id: 'latency-bottleneck',
                title: 'Primary latency bottleneck',
                summary: 's2 dominates runtime.',
                severity: 'medium',
                confidence: 0.75,
                evidenceStepIds: ['s2'],
              },
            ],
          },
        }),
      });

      const report = await fetchInvestigation('trace-1');
      expect(report?.traceId).toBe('trace-1');
      expect(report?.hypotheses[0].id).toBe('latency-bottleneck');
    });

    it('returns null when investigation API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const report = await fetchInvestigation('trace-1');
      expect(report).toBeNull();
    });
  });

  describe('collaboration comments', () => {
    it('fetches step comments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comments: [
            {
              id: 'c1',
              traceId: 'trace-1',
              stepId: 's1',
              author: 'jason',
              body: 'Check this',
              pinned: true,
              createdAt: '2026-02-15T01:00:00.000Z',
            },
          ],
        }),
      });
      const comments = await fetchComments('trace-1', 's1');
      expect(comments).toHaveLength(1);
      expect(comments[0].author).toBe('jason');
    });

    it('creates a comment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          comment: {
            id: 'c2',
            traceId: 'trace-1',
            stepId: 's1',
            author: 'jason',
            body: 'Investigate this branch',
            pinned: false,
            createdAt: '2026-02-15T01:10:00.000Z',
          },
        }),
      });
      const created = await createComment('trace-1', 's1', 'jason', 'Investigate this branch', false);
      expect(created?.id).toBe('c2');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/traces/trace-1/comments'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('extensions', () => {
    it('lists available extensions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          extensions: [{ id: 'latency_hotspots', name: 'Latency Hotspots', description: 'Top runtime steps' }],
        }),
      });
      const extensions = await listExtensions();
      expect(extensions).toHaveLength(1);
      expect(extensions[0].id).toBe('latency_hotspots');
    });

    it('runs extension against trace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          extensionId: 'latency_hotspots',
          traceId: 'trace-1',
          result: { topLatencySteps: [{ stepId: 's1', durationMs: 1000 }] },
        }),
      });
      const output = await runExtension('latency_hotspots', 'trace-1');
      expect(output?.extensionId).toBe('latency_hotspots');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/extensions/latency_hotspots/run'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('gameplay api', () => {
    it('creates, loads, and joins a gameplay session', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ session: { id: 'session-1', version: 1, players: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ session: { id: 'session-1', version: 1, players: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            session: { id: 'session-1', version: 2, players: [{ player_id: 'alice', role: 'operator' }] },
          }),
        });

      const created = await createGameplaySession({ traceId: 'trace-1', hostPlayerId: 'alice', name: 'Ops' });
      const loaded = await getGameplaySession('session-1');
      const joined = await joinGameplaySession({ sessionId: 'session-1', playerId: 'alice', role: 'operator' });

      expect(created?.id).toBe('session-1');
      expect(loaded?.id).toBe('session-1');
      expect(joined?.version).toBe(2);
    });

    it('reports conflict on gameplay action version mismatch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Session version mismatch' }),
      });
      const result = await applyGameplayAction({
        sessionId: 'session-1',
        playerId: 'alice',
        type: 'raid.objective_progress',
        payload: { objective_id: 'obj-root-cause', delta: 25 },
        expectedVersion: 3,
      });
      expect(result.conflict).toBe(true);
      expect(result.error).toContain('version');
    });

    it('loads and advances liveops state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ liveops: { season: 'Season-2026', week: 1, challenge: { id: 'challenge-raid' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ liveops: { season: 'Season-2026', week: 2, challenge: { id: 'challenge-boss' } } }),
        });
      const current = await fetchGameplayLiveOps();
      const next = await advanceGameplayLiveOpsWeek();
      expect(current?.week).toBe(1);
      expect(next?.week).toBe(2);
    });

    it('loads gameplay observability summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          observability: {
            generated_at: '2026-02-17T00:00:00Z',
            metrics: {
              total_sessions: 4,
              running_sessions: 1,
              avg_latency_ms: 980,
              p95_latency_ms: 1400,
              failure_rate_pct: 4.2,
              challenge_completion_rate_pct: 42,
            },
            alerts: [],
          },
        }),
      });
      const summary = await fetchGameplayObservabilitySummary();
      expect(summary?.metrics.total_sessions).toBe(4);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/gameplay/observability/summary'));
    });

    it('loads gameplay funnel analytics summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            generated_at: '2026-02-17T00:00:00Z',
            funnels: {
              session_start: 4,
              first_objective_progress: 3,
              first_mission_outcome: 2,
              run_outcome: 1,
              win_outcome: 1,
            },
            dropoff: {
              objective_dropoff: 1,
              outcome_dropoff: 1,
              resolution_dropoff: 1,
            },
            retention: {
              cohort_size: 3,
              d1_pct: 66.67,
              d7_pct: 33.33,
              d30_pct: 0,
            },
          },
        }),
      });
      const summary = await fetchGameplayAnalyticsFunnels();
      expect(summary?.funnels.session_start).toBe(4);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/gameplay/analytics/funnels'));
    });
  });

  describe('subscribeToGameplaySession', () => {
    it('parses gameplay stream events and closes subscription', () => {
      const listeners: Record<string, Array<(event: MessageEvent<string>) => void>> = {};
      const close = vi.fn();
      class MockEventSource {
        onmessage: ((event: MessageEvent<string>) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        constructor(url: string) {
          void url;
        }

        addEventListener(type: string, listener: EventListener) {
          if (!listeners[type]) listeners[type] = [];
          listeners[type].push(listener as (event: MessageEvent<string>) => void);
        }

        removeEventListener(type: string, listener: EventListener) {
          listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== listener);
        }

        close() {
          close();
        }
      }

      globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
      let sessionId = '';
      const unsubscribe = subscribeToGameplaySession('session-1', (session) => {
        sessionId = session.id;
      });

      const event = listeners.gameplay?.[0];
      event?.({ data: JSON.stringify({ session: { id: 'session-1', version: 3 } }) } as MessageEvent<string>);
      expect(sessionId).toBe('session-1');
      unsubscribe();
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
