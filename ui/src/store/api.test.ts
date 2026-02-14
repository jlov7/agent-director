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
  clearStepDetailsCache,
} from './api';

describe('API Layer', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    clearStepDetailsCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
});
