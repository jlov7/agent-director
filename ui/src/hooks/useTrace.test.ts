import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { TraceSummary, TraceInsights } from '../types';
import demoTrace from '../data/demoTrace.json';

// Mock the api module
const mockFetchTraces = vi.fn();
const mockFetchTrace = vi.fn();

vi.mock('../store/api', () => ({
  fetchTraces: () => mockFetchTraces(),
  fetchTrace: (traceId: string) => mockFetchTrace(traceId),
}));

// Mock the insights utility
vi.mock('../utils/insights', () => ({
  computeInsights: vi.fn(() => ({
    topLatencySteps: [],
    costByType: {},
    errors: 0,
    retries: 0,
    wallTimeMs: 5000,
    workTimeMs: 7200,
  })),
}));

// Import after mocks
import { useTrace } from './useTrace';

describe('useTrace Hook', () => {
  const mockTrace = demoTrace as TraceSummary;
  const mockInsights: TraceInsights = {
    topLatencySteps: [{ stepId: 's5', name: 'analyze', durationMs: 1400 }],
    costByType: { llm_call: 0.018 },
    errors: 0,
    retries: 0,
    wallTimeMs: 5000,
    workTimeMs: 7200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Loading', () => {
    it('starts in loading state', async () => {
      mockFetchTraces.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useTrace());

      expect(result.current.loading).toBe(true);
      expect(result.current.trace).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('loads trace list on mount', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace, insights: mockInsights });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.traces).toHaveLength(1);
      });

      expect(mockFetchTraces).toHaveBeenCalled();
      expect(result.current.traces[0].id).toBe(mockTrace.id);
    });

    it('selects the latest trace by default', async () => {
      const trace1 = { ...mockTrace, id: 'trace-1' };
      const trace2 = { ...mockTrace, id: 'trace-2' };
      mockFetchTraces.mockResolvedValue([trace1, trace2]);
      mockFetchTrace.mockResolvedValue({ trace: trace2, insights: mockInsights });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.selectedTraceId).toBe('trace-2');
      });
    });
  });

  describe('Trace Data', () => {
    it('loads trace data with insights from API', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace, insights: mockInsights });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.trace).not.toBeNull();
      });

      expect(result.current.trace?.id).toBe(mockTrace.id);
      expect(result.current.insights).toBeDefined();
      expect(result.current.insights?.errors).toBe(0);
    });

    it('computes insights locally when API does not provide them', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace }); // No insights

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.trace).not.toBeNull();
      });

      // computeInsights is called when no insights provided
      expect(result.current.insights).toBeDefined();
    });

    it('returns null insights when trace is null', async () => {
      mockFetchTraces.mockResolvedValue([]);
      mockFetchTrace.mockResolvedValue(null);

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.trace).toBeNull();
      expect(result.current.insights).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('sets loading to true during initial fetch', async () => {
      let resolveTraces: (value: TraceSummary[]) => void;
      mockFetchTraces.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveTraces = resolve;
          })
      );

      const { result } = renderHook(() => useTrace());

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveTraces!([mockTrace]);
      });

      await waitFor(() => {
        expect(result.current.traces).toHaveLength(1);
      });
    });

    it('sets loading to false after successful load', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace, insights: mockInsights });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets loading to false after error', async () => {
      mockFetchTraces.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Error Handling', () => {
    it('handles fetch error with Error instance', async () => {
      mockFetchTraces.mockRejectedValue(new Error('Network failed'));

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.error).toBe('Network failed');
      });
    });

    it('handles fetch error with non-Error value', async () => {
      mockFetchTraces.mockRejectedValue('Something went wrong');

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load trace');
      });
    });

    it('handles trace load error separately', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockRejectedValue(new Error('Trace load failed'));

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.error).toBe('Trace load failed');
      });
    });
  });

  describe('Trace Selection', () => {
    it('provides setSelectedTraceId function', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.setSelectedTraceId).toBe('function');
    });

    it('loads new trace when selectedTraceId changes', async () => {
      const trace1 = { ...mockTrace, id: 'trace-1', name: 'Trace 1' };
      const trace2 = { ...mockTrace, id: 'trace-2', name: 'Trace 2' };
      mockFetchTraces.mockResolvedValue([trace1, trace2]);
      mockFetchTrace.mockResolvedValue({ trace: trace2 });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.selectedTraceId).toBe('trace-2');
      });

      mockFetchTrace.mockResolvedValue({ trace: trace1 });

      act(() => {
        result.current.setSelectedTraceId('trace-1');
      });

      await waitFor(() => {
        expect(result.current.selectedTraceId).toBe('trace-1');
      });

      expect(mockFetchTrace).toHaveBeenCalledWith('trace-1');
    });
  });

  describe('Reload Function', () => {
    it('provides reload function', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.reload).toBe('function');
    });

    it('reload fetches traces again', async () => {
      mockFetchTraces.mockResolvedValue([mockTrace]);
      mockFetchTrace.mockResolvedValue({ trace: mockTrace });

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockFetchTraces.mock.calls.length;

      await act(async () => {
        await result.current.reload();
      });

      expect(mockFetchTraces.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Empty State', () => {
    it('handles empty trace list', async () => {
      mockFetchTraces.mockResolvedValue([]);

      const { result } = renderHook(() => useTrace());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.traces).toHaveLength(0);
      expect(result.current.trace).toBeNull();
      expect(result.current.selectedTraceId).toBeNull();
    });
  });
});
