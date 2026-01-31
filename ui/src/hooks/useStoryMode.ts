import { useCallback, useEffect, useRef, useState } from 'react';
import type { StepSummary, TraceSummary } from '../types';

export type StoryBeat = {
  action: 'setPlayhead' | 'play' | 'pause' | 'setSpeed' | 'selectStep' | 'setMode' | 'wait';
  payload?: unknown;
  durationMs: number;
  label?: string;
};

export type StoryState = {
  active: boolean;
  step: number;
};

export type StoryModeState = {
  storyState: StoryState | null;
  storyPlan: StoryBeat[];
  isStoryActive: boolean;
};

export type StoryModeActions = {
  startStory: () => void;
  stopStory: () => void;
  toggleStory: () => void;
};

type StoryModeCallbacks = {
  setPlayheadMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setSelectedStepId: (id: string | null) => void;
  setMode: (mode: 'cinema' | 'flow' | 'compare') => void;
};

export function useStoryMode(
  trace: TraceSummary | null,
  steps: StepSummary[],
  compareTrace: TraceSummary | null,
  callbacks: StoryModeCallbacks
): [StoryModeState, StoryModeActions] {
  const [storyState, setStoryState] = useState<StoryState | null>(null);
  const [storyPlan, setStoryPlan] = useState<StoryBeat[]>([]);
  const storyTraceIdRef = useRef<string | null>(null);

  const { setPlayheadMs, setIsPlaying, setSpeed, setSelectedStepId, setMode } = callbacks;

  // Build story plan when trace changes
  const buildStoryPlan = useCallback((): StoryBeat[] => {
    if (!trace) return [];

    const duration = trace.metadata.wallTimeMs ?? 5000;
    const sortedSteps = [...steps].sort((a, b) => a.index - b.index);

    // Find bottleneck step (longest duration)
    const bottleneckStep = sortedSteps.reduce<StepSummary | null>((longest, step) => {
      if (!longest) return step;
      return (step.durationMs ?? 0) > (longest.durationMs ?? 0) ? step : longest;
    }, null);

    const bottleneckMs = bottleneckStep
      ? new Date(bottleneckStep.startedAt).getTime() - new Date(trace.startedAt).getTime()
      : duration * 0.6;

    const beats: StoryBeat[] = [
      // Opening: reset to start
      { action: 'setPlayhead', payload: 0, durationMs: 300, label: 'Opening the reel' },
      { action: 'setSpeed', payload: 2, durationMs: 100 },
      { action: 'setMode', payload: 'cinema', durationMs: 100 },

      // Act 1: Pace through timeline
      { action: 'play', durationMs: 1100, label: 'Pacing the timeline' },

      // Pause at bottleneck
      { action: 'pause', durationMs: 100 },
      { action: 'setPlayhead', payload: bottleneckMs, durationMs: 400, label: 'Freeze on bottleneck' },
      { action: 'wait', durationMs: 800 },

      // Act 2: Inspect the bottleneck
      { action: 'selectStep', payload: bottleneckStep?.id, durationMs: 500, label: 'Inspect the moment' },
      { action: 'wait', durationMs: 1200 },

      // Act 3: Switch to Flow
      { action: 'setMode', payload: 'flow', durationMs: 800, label: 'Morph into flow' },
      { action: 'wait', durationMs: 1500 },
    ];

    // If there's a compare trace, show it
    if (compareTrace) {
      beats.push(
        { action: 'setMode', payload: 'cinema', durationMs: 400, label: "Director's Cut replay" },
        { action: 'setPlayhead', payload: 0, durationMs: 200 },
        { action: 'setSpeed', payload: 1.5, durationMs: 100 },
        { action: 'play', durationMs: 2200 },
        { action: 'pause', durationMs: 100 },
        { action: 'setMode', payload: 'compare', durationMs: 600, label: 'Compare the cut' },
        { action: 'wait', durationMs: 2000 }
      );
    }

    // Finale
    beats.push(
      { action: 'setMode', payload: 'cinema', durationMs: 400, label: 'Final frame' },
      { action: 'setPlayhead', payload: duration, durationMs: 300 },
      { action: 'setSpeed', payload: 1, durationMs: 100 },
      { action: 'pause', durationMs: 0 }
    );

    return beats;
  }, [trace, steps, compareTrace]);

  // Story beat executor
  useEffect(() => {
    if (!storyState?.active || storyPlan.length === 0) return;
    if (storyState.step >= storyPlan.length) {
      setStoryState(null);
      return;
    }

    const beat = storyPlan[storyState.step];

    // Execute the action
    switch (beat.action) {
      case 'setPlayhead':
        setPlayheadMs(beat.payload as number);
        break;
      case 'play':
        setIsPlaying(true);
        break;
      case 'pause':
        setIsPlaying(false);
        break;
      case 'setSpeed':
        setSpeed(beat.payload as number);
        break;
      case 'selectStep':
        setSelectedStepId(beat.payload as string | null);
        break;
      case 'setMode':
        setMode(beat.payload as 'cinema' | 'flow' | 'compare');
        break;
      case 'wait':
        // Just wait
        break;
    }

    // Advance to next beat after duration
    const timer = setTimeout(() => {
      setStoryState((prev) => {
        if (!prev) return null;
        return { ...prev, step: prev.step + 1 };
      });
    }, beat.durationMs);

    return () => clearTimeout(timer);
  }, [storyState, storyPlan, setPlayheadMs, setIsPlaying, setSpeed, setSelectedStepId, setMode]);

  // Sync story mode to DOM
  useEffect(() => {
    if (storyState?.active) {
      document.body.classList.add('story-mode');
    } else {
      document.body.classList.remove('story-mode');
    }
    return () => {
      document.body.classList.remove('story-mode');
    };
  }, [storyState?.active]);

  // Stop story if trace changes
  useEffect(() => {
    if (trace && storyTraceIdRef.current && storyTraceIdRef.current !== trace.id) {
      setStoryState(null);
    }
    storyTraceIdRef.current = trace?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace?.id]);

  const startStory = useCallback(() => {
    const plan = buildStoryPlan();
    if (plan.length === 0) return;

    setStoryPlan(plan);
    setStoryState({ active: true, step: 0 });
  }, [buildStoryPlan]);

  const stopStory = useCallback(() => {
    setStoryState(null);
    setIsPlaying(false);
  }, [setIsPlaying]);

  const toggleStory = useCallback(() => {
    if (storyState?.active) {
      stopStory();
    } else {
      startStory();
    }
  }, [storyState?.active, startStory, stopStory]);

  return [
    {
      storyState,
      storyPlan,
      isStoryActive: storyState?.active ?? false,
    },
    {
      startStory,
      stopStory,
      toggleStory,
    },
  ];
}
