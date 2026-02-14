import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import InsightStrip from './components/InsightStrip';
import SearchBar from './components/SearchBar';
import CinemaMode from './components/CinemaMode';
import PlaybackControls from './components/CinemaMode/PlaybackControls';
import MiniTimeline from './components/CinemaMode/MiniTimeline';
import ShortcutsModal from './components/common/ShortcutsModal';
import CommandPalette, { type CommandAction } from './components/common/CommandPalette';
import JourneyPanel from './components/common/JourneyPanel';
import DirectorBrief from './components/common/DirectorBrief';
import GuidedTour, { type TourStep } from './components/common/GuidedTour';
import ContextHelpOverlay from './components/common/ContextHelpOverlay';
import IntroOverlay from './components/common/IntroOverlay';
import HeroRibbon from './components/common/HeroRibbon';
import QuickActions from './components/common/QuickActions';
import StoryModeBanner from './components/common/StoryModeBanner';
import MorphOrchestrator from './components/Morph/MorphOrchestrator';
import { useTrace } from './hooks/useTrace';
import type { StepSummary, StepType, TraceSummary } from './types';
import { clearStepDetailsCache, prefetchStepDetails, replayFromStep } from './store/api';
import { usePersistedState } from './hooks/usePersistedState';
import { buildFlowLayout } from './utils/flowLayout';
import { buildIoEdgesFromSummary } from './utils/ioEdgeUtils';
import { collectStepBoundaries, findNextBoundary } from './utils/playbackBoundaries';
import { diffTraces } from './utils/diff';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

type Mode = 'cinema' | 'flow' | 'compare';

type Rect = { left: number; top: number; width: number; height: number };

type StoryBeat = {
  id: string;
  label: string;
  duration: number;
  action: () => void | Promise<void>;
};

const FlowMode = lazy(() => import('./components/FlowMode'));
const Compare = lazy(() => import('./components/Compare'));
const Inspector = lazy(() => import('./components/Inspector'));

function buildStructureEdges(steps: StepSummary[]) {
  return steps
    .filter((step) => step.parentStepId)
    .map((step) => ({ source: step.parentStepId as string, target: step.id }));
}

function buildSequenceEdges(steps: StepSummary[]) {
  const sorted = [...steps].sort((a, b) => a.index - b.index);
  return sorted.slice(1).map((step, index) => ({ source: sorted[index].id, target: step.id }));
}

function collectStepRects(container: HTMLElement): Record<string, Rect> {
  const rects: Record<string, Rect> = {};
  const containerRect = container.getBoundingClientRect();
  const cards = container.querySelectorAll<HTMLElement>('.step-card');
  cards.forEach((card) => {
    const stepId = card.dataset.stepId;
    if (!stepId) return;
    const rect = card.getBoundingClientRect();
    rects[stepId] = {
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    };
  });
  return rects;
}

function buildFlowRects(steps: StepSummary[], container: HTMLElement, cacheKey?: string): Record<string, Rect> {
  const edges = [
    ...buildStructureEdges(steps),
    ...buildSequenceEdges(steps),
    ...buildIoEdgesFromSummary(steps).map((edge) => ({ source: edge.source, target: edge.target })),
  ];

  const layout = buildFlowLayout(steps, edges, cacheKey);
  const containerRect = container.getBoundingClientRect();

  const minX = Math.min(...layout.map((node) => node.position.x));
  const minY = Math.min(...layout.map((node) => node.position.y));
  const maxX = Math.max(...layout.map((node) => node.position.x));
  const maxY = Math.max(...layout.map((node) => node.position.y));

  const layoutWidth = maxX - minX + NODE_WIDTH;
  const layoutHeight = maxY - minY + NODE_HEIGHT;

  const offsetX = Math.max(32, (containerRect.width - layoutWidth) / 2);
  const offsetY = Math.max(24, (containerRect.height - layoutHeight) / 2);

  return layout.reduce((acc, node) => {
    acc[node.id] = {
      left: node.position.x - minX + offsetX,
      top: node.position.y - minY + offsetY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
    return acc;
  }, {} as Record<string, Rect>);
}

function filterSteps(steps: StepSummary[], query: string, typeFilter: StepType | 'all') {
  const q = query.trim().toLowerCase();
  return steps.filter((step) => {
    if (typeFilter !== 'all' && step.type !== typeFilter) return false;
    if (!q) return true;
    const haystack = [step.name, step.preview?.title, step.preview?.outputPreview, step.preview?.inputPreview]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export default function App() {
  const { trace, insights, loading, error, reload, traces, selectedTraceId, setSelectedTraceId } = useTrace();
  const [mode, setMode] = usePersistedState<Mode>('agentDirector.mode', 'cinema');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<StepType | 'all'>('all');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [safeExport, setSafeExport] = usePersistedState('agentDirector.safeExport', false);
  const [compareTrace, setCompareTrace] = useState<TraceSummary | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [speed, setSpeed] = usePersistedState('agentDirector.speed', 1);
  const [windowed, setWindowed] = usePersistedState('agentDirector.windowed', false);
  const [windowSpanMs, setWindowSpanMs] = useState(20000);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = usePersistedState('agentDirector.overlayEnabled', false);
  const [journeyCollapsed, setJourneyCollapsed] = usePersistedState('agentDirector.onboarded', false);
  const [tourCompleted, setTourCompleted] = usePersistedState('agentDirector.tourCompleted', false);
  const [explainMode, setExplainMode] = usePersistedState('agentDirector.explainMode', true);
  const [heroDismissed, setHeroDismissed] = usePersistedState('agentDirector.heroDismissed', false);
  const [dockOpen, setDockOpen] = usePersistedState('agentDirector.dockOpen', false);
  const skipIntro = import.meta.env.VITE_SKIP_INTRO === '1';
  const [introDismissed, setIntroDismissed] = usePersistedState('agentDirector.introDismissed', skipIntro);
  const [tourOpen, setTourOpen] = useState(false);
  const [storyState, setStoryState] = useState<{ active: boolean; step: number } | null>(null);
  const [storyPlan, setStoryPlan] = useState<StoryBeat[]>([]);
  const [storyTraceId, setStoryTraceId] = useState<string | null>(null);
  const [morphState, setMorphState] = useState<{
    steps: StepSummary[];
    fromRects: Record<string, Rect>;
    toRects: Record<string, Rect>;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const compareTraceRef = useRef<TraceSummary | null>(null);

  const steps = useMemo(() => (trace ? filterSteps(trace.steps, query, typeFilter) : []), [trace, query, typeFilter]);
  const compareSteps = useMemo(
    () => (compareTrace ? filterSteps(compareTrace.steps, query, typeFilter) : []),
    [compareTrace, query, typeFilter]
  );
  const stepBoundaries = useMemo(() => {
    if (!trace) return [];
    return collectStepBoundaries(trace.startedAt, trace.endedAt, trace.steps);
  }, [trace]);
  const diff = useMemo(() => {
    if (!trace || !compareTrace) return null;
    return diffTraces(trace, compareTrace);
  }, [trace, compareTrace]);
  const selectedStep = useMemo(
    () => (trace ? trace.steps.find((step) => step.id === selectedStepId) ?? null : null),
    [trace, selectedStepId]
  );

  useEffect(() => {
    compareTraceRef.current = compareTrace;
  }, [compareTrace]);

  useEffect(() => {
    if (mode === 'compare') {
      setDockOpen(false);
    }
  }, [mode, setDockOpen]);

  const handleReplay = useCallback(
    async (stepId: string) => {
      if (!trace) return;
      const newTrace = await replayFromStep(trace.id, stepId, 'hybrid', { note: 'UI replay' }, trace);
      if (newTrace) {
        setCompareTrace(newTrace);
        setOverlayEnabled(true);
        setMode('flow');
      }
    },
    [trace, setCompareTrace, setMode, setOverlayEnabled]
  );

  const jumpToBottleneck = useCallback(() => {
    if (!trace) return;
    const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
    if (bottleneck) {
      setSelectedStepId(bottleneck.id);
      setMode('cinema');
    }
  }, [trace, setMode]);

  const getBottleneckId = useCallback(() => {
    if (!trace || trace.steps.length === 0) return null;
    const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
    return bottleneck?.id ?? null;
  }, [trace]);

  const jumpToError = useCallback(() => {
    if (!trace) return;
    const firstError = trace.steps.find((step) => step.status === 'failed');
    if (firstError) {
      setSelectedStepId(firstError.id);
      setMode('cinema');
    }
  }, [trace, setMode]);

  const handleModeChange = useCallback(
    (next: Mode) => {
      if (next === mode || !trace) return;
      if (next === 'flow') setIsPlaying(false);
      if (next === 'flow' && mode === 'cinema' && viewportRef.current) {
        const container = viewportRef.current;
        const fromRects = collectStepRects(container);
        const toRects = buildFlowRects(trace.steps, container, trace.id);
        setMorphState({ steps: trace.steps, fromRects, toRects });
        return;
      }
      setMode(next);
    },
    [mode, trace, setIsPlaying, setMode]
  );

  const togglePlayback = useCallback(() => {
    if (mode === 'flow') {
      handleModeChange('cinema');
    }
    setIsPlaying((prev) => !prev);
  }, [mode, handleModeChange]);

  const stopStory = useCallback(() => {
    setStoryState(null);
    setStoryPlan([]);
    setStoryTraceId(null);
    setIsPlaying(false);
  }, [setIsPlaying]);

  const buildStoryPlan = useCallback(
    (anchorId: string | null): StoryBeat[] => [
      {
        id: 'setup',
        label: 'Opening the reel',
        duration: 1100,
        action: () => {
          setExplainMode(true);
          setIsPlaying(false);
          setPlayheadMs(0);
          setSelectedStepId(null);
          setOverlayEnabled(false);
          setSpeed(1);
          if (trace && trace.steps.length < 500) setWindowed(false);
          handleModeChange('cinema');
        },
      },
      {
        id: 'pace',
        label: 'Pacing the timeline',
        duration: 2200,
        action: () => {
          handleModeChange('cinema');
          setIsPlaying(true);
          setSpeed(1.1);
        },
      },
      {
        id: 'bottleneck',
        label: 'Freeze on the bottleneck',
        duration: 1600,
        action: () => {
          setIsPlaying(false);
          jumpToBottleneck();
        },
      },
      {
        id: 'inspect',
        label: 'Inspect the moment',
        duration: 1600,
        action: () => {
          if (!anchorId) return;
          setSelectedStepId(anchorId);
        },
      },
      {
        id: 'flow',
        label: 'Morph into flow',
        duration: 2100,
        action: () => {
          handleModeChange('flow');
        },
      },
      {
        id: 'replay',
        label: 'Director’s Cut replay',
        duration: 2200,
        action: async () => {
          if (!trace) return;
          const currentCompare = compareTraceRef.current;
          if (!currentCompare && anchorId) {
            await handleReplay(anchorId);
          }
          setOverlayEnabled(true);
          setMode('compare');
        },
      },
      {
        id: 'compare',
        label: 'Compare the cut',
        duration: 2000,
        action: () => {
          setIsPlaying(true);
          setSpeed(1);
        },
      },
      {
        id: 'finale',
        label: 'Final frame',
        duration: 1100,
        action: () => {
          setIsPlaying(false);
        },
      },
    ],
    [
      handleModeChange,
      handleReplay,
      jumpToBottleneck,
      setExplainMode,
      setIsPlaying,
      setMode,
      setOverlayEnabled,
      setPlayheadMs,
      setSelectedStepId,
      setSpeed,
      setWindowed,
      trace,
    ]
  );

  const startStory = useCallback(() => {
    if (!trace) return;
    const anchor = selectedStepId ?? getBottleneckId() ?? trace.steps[0]?.id ?? null;
    setStoryPlan(buildStoryPlan(anchor));
    setStoryState({ active: true, step: 0 });
    setStoryTraceId(trace.id);
    setTourOpen(false);
    setShowShortcuts(false);
    setShowPalette(false);
  }, [
    buildStoryPlan,
    getBottleneckId,
    selectedStepId,
    trace,
    setShowPalette,
    setShowShortcuts,
    setStoryPlan,
    setStoryState,
    setStoryTraceId,
    setTourOpen,
  ]);

  const toggleStory = useCallback(() => {
    if (storyState?.active) {
      stopStory();
      return;
    }
    startStory();
  }, [startStory, stopStory, storyState?.active]);

  const tourSteps = useMemo<TourStep[]>(() => {
    const steps: TourStep[] = [
      {
        id: 'header',
        title: 'Mission control',
        body: 'Confirm the run, status, and metadata. Use Guide and Explain to orient the room instantly.',
        target: '[data-tour="header"]',
        placement: 'bottom',
      },
    ];

    if (!heroDismissed) {
      steps.push({
        id: 'hero',
        title: 'Director briefing',
        body: 'Choose Tour, Story mode, or Explain to ramp up quickly.',
        target: '[data-tour="hero"]',
        placement: 'bottom',
      });
    }

    steps.push(
      {
        id: 'insights',
        title: 'Fast diagnosis',
        body: 'Jump straight to bottlenecks, errors, and high-cost steps with one click.',
        target: '[data-tour="insights"]',
        placement: 'bottom',
      },
      {
        id: 'journey',
        title: 'Director journey',
        body: 'A narrative path that teaches how to watch, inspect, and direct a better run.',
        target: '[data-tour="journey"]',
        placement: 'bottom',
      },
      {
        id: 'toolbar',
        title: 'Filters + modes',
        body: 'Search, filter, and switch between Cinema, Flow, and Compare as the story evolves.',
        target: '[data-tour="toolbar"]',
        placement: 'bottom',
      },
      {
        id: 'quick-actions',
        title: 'Quick actions',
        body: 'Launch Story Mode, open the command palette, or jump to bottlenecks instantly.',
        target: '[data-tour="quick-actions"]',
        placement: 'left',
      },
      {
        id: 'stage',
        title: 'Cinema stage',
        body: 'The timeline shows every step as a scene. Scrub to see pacing and concurrency.',
        target: '[data-tour="stage"]',
        placement: 'top',
      },
      {
        id: 'inspector',
        title: 'Inspector',
        body: 'Open any step to read payloads, apply redaction, and replay from that moment.',
        target: '[data-tour="inspector"]',
        placement: 'left',
      },
      {
        id: 'compare',
        title: 'Compare runs',
        body: compareTrace
          ? 'Compare is live. Review deltas in cost, steps, and wall time side by side.'
          : 'Replay from a step to unlock compare mode and validate improvements.',
        target: '[data-tour="compare"]',
        placement: 'top',
      }
    );

    return steps;
  }, [compareTrace, heroDismissed]);

  const handleMorphComplete = useCallback(() => {
    setMorphState(null);
    setMode('flow');
  }, [setMode]);

  useEffect(() => {
    if (!trace) return;
    clearStepDetailsCache();
    setPlayheadMs(0);
    setIsPlaying(false);
    const defaultSpan = Math.min(Math.max((trace.metadata.wallTimeMs || 1) * 0.2, 5000), 60000);
    setWindowSpanMs(defaultSpan);
    if (trace.steps.length > 500) {
      setWindowed(true);
    }
    if (!compareTrace) {
      setOverlayEnabled(false);
    }
    if (mode === 'compare' && !compareTrace) {
      setMode('cinema');
    }
  }, [trace, compareTrace, mode, setMode, setWindowed, setOverlayEnabled]);

  useEffect(() => {
    if (!tourCompleted && introDismissed) {
      setTourOpen(true);
    }
  }, [tourCompleted, introDismissed]);

  useEffect(() => {
    document.body.classList.toggle('explain-mode', explainMode);
    return () => {
      document.body.classList.remove('explain-mode');
    };
  }, [explainMode]);

  useEffect(() => {
    document.body.classList.toggle('story-mode', Boolean(storyState?.active));
    return () => {
      document.body.classList.remove('story-mode');
    };
  }, [storyState?.active]);

  useEffect(() => {
    if (!storyState?.active) return;
    const beat = storyPlan[storyState.step];
    if (!beat) {
      stopStory();
      return;
    }
    void Promise.resolve(beat.action());
    const timeout = window.setTimeout(() => {
      setStoryState((prev) => (prev && prev.active ? { ...prev, step: prev.step + 1 } : prev));
    }, beat.duration);
    return () => window.clearTimeout(timeout);
  }, [storyPlan, stopStory, storyState]);

  useEffect(() => {
    if (!storyState?.active) return;
    if (!trace || !storyTraceId) return;
    if (trace.id !== storyTraceId) {
      stopStory();
    }
  }, [storyState?.active, trace, storyTraceId, stopStory]);

  useEffect(() => {
    if (!trace) return;
    const traceStart = Date.parse(trace.startedAt);
    const target = traceStart + playheadMs;
    let closestIndex = 0;
    let closestDelta = Number.POSITIVE_INFINITY;
    trace.steps.forEach((step, index) => {
      const start = Date.parse(step.startedAt);
      const end = Date.parse(step.endedAt ?? step.startedAt);
      if (target >= start && target <= end) {
        closestIndex = index;
        closestDelta = 0;
        return;
      }
      const delta = Math.min(Math.abs(target - start), Math.abs(target - end));
      if (delta < closestDelta) {
        closestDelta = delta;
        closestIndex = index;
      }
    });
    const neighborIndexes = [closestIndex, closestIndex - 1, closestIndex + 1].filter(
      (index) => index >= 0 && index < trace.steps.length
    );
    neighborIndexes.forEach((index) => {
      const step = trace.steps[index];
      if (step) {
        void prefetchStepDetails(trace.id, step.id, safeExport);
      }
    });
  }, [trace, playheadMs, safeExport]);

  useEffect(() => {
    if (!trace || !isPlaying || (mode !== 'cinema' && mode !== 'compare')) return;
    const compareWall = compareTrace?.metadata.wallTimeMs ?? 0;
    const wallTimeMs =
      mode === 'compare' ? Math.max(trace.metadata.wallTimeMs || 1, compareWall || 1) : trace.metadata.wallTimeMs || 1;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) * speed;
      last = now;
      setPlayheadMs((prev) => {
        const next = prev + delta;
        if (next >= wallTimeMs) {
          setIsPlaying(false);
          return wallTimeMs;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trace, compareTrace, isPlaying, speed, mode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowPalette((prev) => !prev);
        return;
      }

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        toggleStory();
        return;
      }

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setExplainMode((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        setTourOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setShowShortcuts(false);
        setShowPalette(false);
        setSelectedStepId(null);
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (mode === 'cinema' || mode === 'compare') setIsPlaying((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (mode === 'flow') setMode('cinema');
        else if (mode === 'cinema') handleModeChange('flow');
        return;
      }

      if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        if (selectedStepId) setSelectedStepId(null);
        else if (trace?.steps.length) setSelectedStepId(trace.steps[0].id);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (!trace) return;
        const wallTimeMs = trace.metadata.wallTimeMs || 1;
        if (event.shiftKey) {
          setPlayheadMs(event.key === 'ArrowLeft' ? 0 : wallTimeMs);
          setIsPlaying(false);
          setMode('cinema');
          return;
        }
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = findNextBoundary(stepBoundaries, playheadMs, direction);
        if (next != null) {
          setPlayheadMs(next);
          setIsPlaying(false);
          setMode('cinema');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    mode,
    selectedStepId,
    trace,
    playheadMs,
    stepBoundaries,
    handleModeChange,
    setMode,
    setExplainMode,
    setShowPalette,
    setTourOpen,
    toggleStory,
  ]);

  const windowRange = useMemo(() => {
    if (!trace || !windowed || query) return null;
    const wallTimeMs = trace.metadata.wallTimeMs || 1;
    const span = Math.min(Math.max(windowSpanMs, 5000), wallTimeMs);
    let startMs = Math.max(0, playheadMs - span / 2);
    const endMs = Math.min(wallTimeMs, startMs + span);
    if (endMs - startMs < span) {
      startMs = Math.max(0, endMs - span);
    }
    return { startMs, endMs };
  }, [trace, windowed, playheadMs, query, windowSpanMs]);

  const storyActive = Boolean(storyState?.active);
  const storyStep = storyState?.step ?? 0;
  const storyLabel = storyPlan[storyStep]?.label ?? 'Wrapping up';
  const storyTotal = storyPlan.length;

  const commandActions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'story-toggle',
        label: storyActive ? 'Stop story mode' : 'Start story mode',
        description: 'Auto-runs a cinematic walkthrough.',
        group: 'Story',
        keys: 'S',
        onTrigger: toggleStory,
      },
      {
        id: 'tour-start',
        label: 'Start guided tour',
        description: 'Walk the interface step by step.',
        group: 'Onboarding',
        keys: 'T',
        onTrigger: () => setTourOpen(true),
      },
      {
        id: 'explain-toggle',
        label: explainMode ? 'Disable explain mode' : 'Enable explain mode',
        description: 'Toggle contextual overlays.',
        group: 'Onboarding',
        keys: 'E',
        onTrigger: () => setExplainMode((prev) => !prev),
      },
      {
        id: 'shortcuts',
        label: 'Show shortcuts',
        description: 'Open the keyboard map.',
        group: 'Onboarding',
        keys: '?',
        onTrigger: () => setShowShortcuts(true),
      },
      {
        id: 'playback-toggle',
        label: isPlaying ? 'Pause playback' : 'Play playback',
        description: 'Start or stop the run.',
        group: 'Playback',
        keys: 'Space',
        onTrigger: togglePlayback,
      },
      {
        id: 'mode-cinema',
        label: 'Switch to Cinema',
        description: 'Timeline playback view.',
        group: 'Modes',
        keys: 'C',
        onTrigger: () => handleModeChange('cinema'),
      },
      {
        id: 'mode-flow',
        label: 'Switch to Flow',
        description: 'Graph dependency view.',
        group: 'Modes',
        keys: 'F',
        onTrigger: () => handleModeChange('flow'),
      },
      {
        id: 'mode-compare',
        label: 'Open Compare',
        description: 'Side-by-side diff view.',
        group: 'Modes',
        onTrigger: () => handleModeChange('compare'),
        disabled: !compareTrace,
      },
      {
        id: 'jump-bottleneck',
        label: 'Jump to bottleneck',
        description: 'Select the slowest step.',
        group: 'Navigation',
        onTrigger: jumpToBottleneck,
      },
      {
        id: 'jump-error',
        label: 'Jump to error',
        description: 'Select the first failed step.',
        group: 'Navigation',
        onTrigger: jumpToError,
      },
      {
        id: 'replay-step',
        label: 'Replay from selected step',
        description: 'Branch a Director’s Cut.',
        group: 'Tools',
        onTrigger: () => selectedStepId && handleReplay(selectedStepId),
        disabled: !selectedStepId,
      },
      {
        id: 'overlay-toggle',
        label: overlayEnabled ? 'Hide overlay' : 'Show overlay',
        description: 'Ghost diff in Cinema/Flow.',
        group: 'Tools',
        onTrigger: () => setOverlayEnabled((prev) => !prev),
        disabled: !compareTrace,
      },
      {
        id: 'safe-export',
        label: safeExport ? 'Disable safe export' : 'Enable safe export',
        description: 'Redact sensitive payloads.',
        group: 'Safety',
        onTrigger: () => setSafeExport((prev) => !prev),
      },
      {
        id: 'reload',
        label: 'Reload traces',
        description: 'Refresh trace data.',
        group: 'Meta',
        onTrigger: reload,
      },
    ],
    [
      storyActive,
      toggleStory,
      explainMode,
      isPlaying,
      togglePlayback,
      handleModeChange,
      compareTrace,
      jumpToBottleneck,
      jumpToError,
      selectedStepId,
      handleReplay,
      overlayEnabled,
      safeExport,
      reload,
      setExplainMode,
      setOverlayEnabled,
      setSafeExport,
      setShowShortcuts,
      setTourOpen,
    ]
  );

  if (loading) {
    return <div className="loading">Loading trace...</div>;
  }

  if (!error && !trace && traces.length === 0) {
    return (
      <div className="error">
        <h2>No traces yet</h2>
        <p>Ingest your first trace, then reload to begin the Observe → Inspect → Direct workflow.</p>
        <div className="error-actions">
          <button className="primary-button" type="button" onClick={reload}>
            Retry
          </button>
          <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
            Open help
          </a>
        </div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="error">
        <p>{error ?? 'Failed to load trace.'}</p>
        <div className="error-actions">
          <button className="primary-button" type="button" onClick={reload}>
            Retry
          </button>
          <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
            Open help
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${explainMode ? 'explain-mode' : ''} ${mode === 'compare' ? 'mode-compare' : ''}`}>
      <Header
        trace={trace}
        traces={traces}
        selectedTraceId={selectedTraceId}
        onSelectTrace={setSelectedTraceId}
        onReload={reload}
        onStartTour={() => setTourOpen(true)}
        onToggleStory={toggleStory}
        onOpenPalette={() => setShowPalette(true)}
        onToggleExplain={() => setExplainMode((prev) => !prev)}
        explainMode={explainMode}
        storyActive={storyActive}
      />
      {!introDismissed && !skipIntro ? (
        <IntroOverlay
          onComplete={() => setIntroDismissed(true)}
          onStartTour={() => {
            setIntroDismissed(true);
            setTourOpen(true);
          }}
          onStartStory={startStory}
        />
      ) : null}
      {introDismissed && !heroDismissed ? (
        <HeroRibbon
          explainMode={explainMode}
          storyActive={storyActive}
          onStartTour={() => {
            setHeroDismissed(true);
            setTourOpen(true);
          }}
          onStartStory={() => {
            setHeroDismissed(true);
            startStory();
          }}
          onToggleExplain={() => setExplainMode((prev) => !prev)}
          onDismiss={() => setHeroDismissed(true)}
        />
      ) : null}
      <GuidedTour
        steps={tourSteps}
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          setTourCompleted(true);
        }}
        onComplete={() => {
          setTourOpen(false);
          setTourCompleted(true);
        }}
      />
      <ContextHelpOverlay enabled={explainMode} />
      <StoryModeBanner
        active={storyActive}
        label={storyLabel}
        step={storyStep}
        total={storyTotal}
        onStop={stopStory}
        onRestart={startStory}
      />
      <InsightStrip
        insights={insights}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          if (mode !== 'cinema') setMode('cinema');
        }}
        onJumpToError={jumpToError}
        onJumpToBottleneck={jumpToBottleneck}
      />

      <JourneyPanel
        trace={trace}
        mode={mode}
        playheadMs={playheadMs}
        selectedStepId={selectedStepId}
        compareTrace={compareTrace}
        collapsed={journeyCollapsed}
        onToggleCollapsed={() => setJourneyCollapsed((prev) => !prev)}
        onModeChange={handleModeChange}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          if (mode !== 'cinema') setMode('cinema');
        }}
        onJumpToBottleneck={jumpToBottleneck}
        onReplay={handleReplay}
        onStartTour={() => setTourOpen(true)}
      />

      <div
        className="toolbar"
        data-help
        data-help-indicator
        data-tour="toolbar"
        data-help-title="Search + filters"
        data-help-body="Filter by step type, enable Safe export, and jump between Cinema, Flow, and Compare."
        data-help-placement="bottom"
      >
        <SearchBar query={query} typeFilter={typeFilter} onQueryChange={setQuery} onTypeFilterChange={setTypeFilter} />
        <div className="toolbar-actions">
          <button
            className={`ghost-button ${mode === 'cinema' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'cinema'}
            title="Timeline playback"
            onClick={() => handleModeChange('cinema')}
            data-help
            data-help-title="Cinema mode"
            data-help-body="Timeline view with step cards ordered by time."
            data-help-placement="bottom"
          >
            Cinema
          </button>
          <button
            className={`ghost-button ${mode === 'flow' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'flow'}
            title="Graph view"
            onClick={() => handleModeChange('flow')}
            data-help
            data-help-title="Flow mode"
            data-help-body="Dependency graph of steps and tool calls."
            data-help-placement="bottom"
          >
            Flow
          </button>
          <button
            className={`ghost-button ${mode === 'compare' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'compare'}
            title={compareTrace ? 'Side-by-side compare' : 'Run a replay to enable compare'}
            onClick={() => handleModeChange('compare')}
            disabled={!compareTrace}
            data-tour="compare"
            data-help
            data-help-title="Compare mode"
            data-help-body="Side-by-side view after a replay. Enabled once you replay."
            data-help-placement="bottom"
          >
            Compare
          </button>
          <label
            className="toggle"
            title="Redact payloads and disable raw views for safe sharing"
            data-help
            data-help-title="Safe export"
            data-help-body="Redacts secrets and disables raw payload views for safe sharing."
            data-help-placement="bottom"
          >
            <input type="checkbox" checked={safeExport} onChange={() => setSafeExport((prev) => !prev)} />
            Safe export
          </label>
          {trace.steps.length > 200 || windowed ? (
            <label
              className="toggle"
              title="Window steps around the playhead for large traces"
              data-help
              data-help-title="Windowed mode"
              data-help-body="Limits rendering to a playhead window for large traces."
              data-help-placement="bottom"
            >
              <input type="checkbox" checked={windowed} onChange={() => setWindowed((prev) => !prev)} />
              Windowed
            </label>
          ) : null}
          {compareTrace ? (
            <label
              className="toggle"
              title="Show ghost overlay of replay in Cinema/Flow"
              data-help
              data-help-title="Overlay replay"
              data-help-body="Layer the replay over the base run to spot differences."
              data-help-placement="bottom"
            >
              <input
                type="checkbox"
                checked={overlayEnabled}
                onChange={() => setOverlayEnabled((prev) => !prev)}
              />
              Overlay
            </label>
          ) : null}
        </div>
      </div>

      {mode === 'cinema' ? (
        <div className="playback-stack" data-tour="playback">
          <div
            data-help
            data-help-title="Playback controls"
            data-help-body="Play, pause, scrub, and adjust speed to feel the rhythm of the run."
            data-help-placement="bottom"
          >
            <PlaybackControls
              playheadMs={playheadMs}
              wallTimeMs={trace.metadata.wallTimeMs || 1}
              isPlaying={isPlaying}
              speed={speed}
              onToggle={() => setIsPlaying((prev) => !prev)}
              onScrub={(value) => setPlayheadMs(value)}
              onSpeedChange={setSpeed}
            />
          </div>
          <div
            data-help
            data-help-title="Density map"
            data-help-body="Zoom into hotspots and keep long traces readable with windowing."
            data-help-placement="bottom"
          >
            <MiniTimeline
              traceStart={trace.startedAt}
              traceEnd={trace.endedAt}
              steps={trace.steps}
              playheadMs={playheadMs}
              windowRange={windowRange}
              windowed={windowed}
              spanMs={windowSpanMs}
              onSpanChange={setWindowSpanMs}
              onToggleWindowed={setWindowed}
              onScrub={(value) => setPlayheadMs(value)}
            />
          </div>
        </div>
      ) : null}
      {mode === 'compare' && compareTrace ? (
        <div
          data-help
          data-help-title="Compare playback"
          data-help-body="Sync both runs to evaluate improvements at identical timestamps."
          data-help-placement="bottom"
        >
          <PlaybackControls
            playheadMs={playheadMs}
            wallTimeMs={Math.max(trace.metadata.wallTimeMs || 1, compareTrace.metadata.wallTimeMs || 1)}
            isPlaying={isPlaying}
            speed={speed}
            onToggle={() => setIsPlaying((prev) => !prev)}
            onScrub={(value) => setPlayheadMs(value)}
            onSpeedChange={setSpeed}
          />
        </div>
      ) : null}

      <main className={`stage ${mode === 'compare' ? 'stage-compare' : ''}`} role="main">
        <div
          className="main"
          ref={viewportRef}
          data-help
          data-help-indicator
          data-tour="stage"
          data-help-title="Trace stage"
          data-help-body="Every step becomes a scene. Hover or click to open deep inspection."
          data-help-placement="top"
        >
          <MorphOrchestrator morph={morphState} onComplete={handleMorphComplete}>
            <Suspense fallback={<div className="loading">Loading view...</div>}>
              {mode === 'cinema' ? (
                <CinemaMode
                  trace={trace}
                  steps={steps}
                  selectedStepId={selectedStepId}
                  onSelectStep={(stepId) => setSelectedStepId(stepId)}
                  playheadMs={playheadMs}
                  windowRange={windowRange}
                  timing={insights?.timing}
                  ghostTrace={overlayEnabled ? compareTrace : null}
                  diff={diff}
                />
              ) : null}
              {mode === 'flow' ? (
                <FlowMode
                  steps={steps}
                  selectedStepId={selectedStepId}
                  onSelectStep={(stepId) => setSelectedStepId(stepId)}
                  baseTrace={trace}
                  compareTrace={compareTrace}
                  compareSteps={compareSteps}
                  overlayEnabled={overlayEnabled}
                  onToggleOverlay={() => setOverlayEnabled((prev) => !prev)}
                />
              ) : null}
              {mode === 'compare' && compareTrace ? (
                <Compare
                  baseTrace={trace}
                  compareTrace={compareTrace}
                  playheadMs={playheadMs}
                  safeExport={safeExport}
                  onExit={() => {
                    setMode('cinema');
                    setCompareTrace(null);
                  }}
                />
              ) : null}
            </Suspense>
          </MorphOrchestrator>
        </div>

        <Suspense fallback={<div className="loading">Loading panel...</div>}>
          {mode === 'compare' ? null : selectedStep ? (
            <Inspector
              traceId={trace.id}
              step={selectedStep}
              safeExport={safeExport}
              onClose={() => setSelectedStepId(null)}
              onReplay={handleReplay}
            />
          ) : (
            <DirectorBrief
              trace={trace}
              mode={mode}
              selectedStepId={selectedStepId}
              onModeChange={handleModeChange}
              onSelectStep={(stepId) => setSelectedStepId(stepId)}
              onJumpToBottleneck={jumpToBottleneck}
              onReplay={handleReplay}
            />
          )}
        </Suspense>
      </main>
      <QuickActions
        mode={mode}
        isPlaying={isPlaying}
        storyActive={storyActive}
        explainMode={explainMode}
        hidden={mode === 'compare'}
        open={dockOpen}
        onToggleOpen={() => setDockOpen((prev) => !prev)}
        onTogglePlay={togglePlayback}
        onStartStory={startStory}
        onStopStory={stopStory}
        onStartTour={() => setTourOpen(true)}
        onOpenPalette={() => setShowPalette(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onToggleExplain={() => setExplainMode((prev) => !prev)}
        onJumpToBottleneck={jumpToBottleneck}
      />
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} actions={commandActions} />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
