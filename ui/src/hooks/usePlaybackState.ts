import { useCallback, useEffect, useRef, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import type { StepSummary, TraceSummary } from '../types';
import { prefetchStepDetails } from '../store/api';
import { collectBoundaries } from '../utils/playbackBoundaries';

export type PlaybackState = {
  isPlaying: boolean;
  playheadMs: number;
  speed: number;
  windowed: boolean;
  windowSpanMs: number;
};

export type PlaybackActions = {
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  setPlayheadMs: (ms: number | ((prev: number) => number)) => void;
  setSpeed: (speed: number) => void;
  setWindowed: (windowed: boolean) => void;
  setWindowSpanMs: (ms: number) => void;
  togglePlayback: () => void;
  seekToStep: (stepId: string, steps: StepSummary[]) => void;
  seekToBoundary: (direction: 'prev' | 'next', steps: StepSummary[]) => void;
  jumpToStart: () => void;
  jumpToEnd: (trace: TraceSummary | null) => void;
};

export function usePlaybackState(
  trace: TraceSummary | null,
  onModeChange?: (mode: 'cinema' | 'flow' | 'compare') => void,
  currentMode?: 'cinema' | 'flow' | 'compare',
  safeExport?: boolean
): [PlaybackState, PlaybackActions] {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [speed, setSpeed] = usePersistedState('agentDirector.speed', 1);
  const [windowed, setWindowed] = usePersistedState('agentDirector.windowed', true);
  const [windowSpanMs, setWindowSpanMs] = useState(10_000);

  const lastFrameRef = useRef<number | null>(null);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || !trace) {
      lastFrameRef.current = null;
      return;
    }

    const duration = trace.metadata.wallTimeMs ?? 5000;
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }
      const delta = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      setPlayheadMs((prev) => {
        const next = prev + delta * speed;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, trace, speed]);

  // Prefetch step details around playhead
  useEffect(() => {
    if (!trace) return;

    const steps = trace.steps;
    const traceStart = new Date(trace.startedAt).getTime();
    const currentTime = traceStart + playheadMs;

    // Find steps near the playhead
    const nearbySteps = steps.filter((step) => {
      const stepStart = new Date(step.startedAt).getTime();
      const stepEnd = step.endedAt ? new Date(step.endedAt).getTime() : stepStart + (step.durationMs ?? 0);
      return Math.abs(stepStart - currentTime) < 5000 || Math.abs(stepEnd - currentTime) < 5000;
    });

    // Prefetch nearby steps
    nearbySteps.slice(0, 3).forEach((step) => {
      prefetchStepDetails(trace.id, step.id, safeExport ?? false);
    });
  }, [trace, playheadMs, safeExport]);

  // Reset playhead on trace change
  useEffect(() => {
    setPlayheadMs(0);
    setIsPlaying(false);
  }, [trace?.id]);

  const togglePlayback = useCallback(() => {
    if (currentMode === 'flow' && onModeChange) {
      onModeChange('cinema');
    }
    setIsPlaying((prev) => !prev);
  }, [currentMode, onModeChange]);

  const seekToStep = useCallback((stepId: string, steps: StepSummary[]) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step || !trace) return;

    const traceStart = new Date(trace.startedAt).getTime();
    const stepStart = new Date(step.startedAt).getTime();
    setPlayheadMs(stepStart - traceStart);
  }, [trace]);

  const seekToBoundary = useCallback((direction: 'prev' | 'next', steps: StepSummary[]) => {
    if (!trace) return;

    const boundaries = collectBoundaries(steps, trace);
    const traceStart = new Date(trace.startedAt).getTime();

    if (direction === 'next') {
      const next = boundaries.find((b) => b > playheadMs + traceStart);
      if (next !== undefined) {
        setPlayheadMs(next - traceStart);
      }
    } else {
      const prevBoundaries = boundaries.filter((b) => b < playheadMs + traceStart - 50);
      const prev = prevBoundaries[prevBoundaries.length - 1];
      if (prev !== undefined) {
        setPlayheadMs(prev - traceStart);
      }
    }
  }, [trace, playheadMs]);

  const jumpToStart = useCallback(() => {
    setPlayheadMs(0);
  }, []);

  const jumpToEnd = useCallback((trace: TraceSummary | null) => {
    if (!trace) return;
    const duration = trace.metadata.wallTimeMs ?? 5000;
    setPlayheadMs(duration);
  }, []);

  return [
    { isPlaying, playheadMs, speed, windowed, windowSpanMs },
    {
      setIsPlaying,
      setPlayheadMs,
      setSpeed,
      setWindowed,
      setWindowSpanMs,
      togglePlayback,
      seekToStep,
      seekToBoundary,
      jumpToStart,
      jumpToEnd,
    },
  ];
}
