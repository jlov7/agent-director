import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import InsightStrip from './components/InsightStrip';
import SearchBar from './components/SearchBar';
import CinemaMode from './components/CinemaMode';
import PlaybackControls from './components/CinemaMode/PlaybackControls';
import MiniTimeline from './components/CinemaMode/MiniTimeline';
import ShortcutsModal from './components/common/ShortcutsModal';
import OnboardingTips from './components/common/OnboardingTips';
import IntroOverlay from './components/common/IntroOverlay';
import FlowMode from './components/FlowMode';
import Compare from './components/Compare';
import Inspector from './components/Inspector';
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
  const [overlayEnabled, setOverlayEnabled] = usePersistedState('agentDirector.overlayEnabled', false);
  const [dismissedTips, setDismissedTips] = usePersistedState('agentDirector.onboarded', false);
  const skipIntro = import.meta.env.VITE_SKIP_INTRO === '1';
  const [introDismissed, setIntroDismissed] = usePersistedState('agentDirector.introDismissed', skipIntro);
  const [morphState, setMorphState] = useState<{
    steps: StepSummary[];
    fromRects: Record<string, Rect>;
    toRects: Record<string, Rect>;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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

  const handleReplay = async (stepId: string) => {
    if (!trace) return;
    const newTrace = await replayFromStep(trace.id, stepId, 'hybrid', { note: 'UI replay' }, trace);
    if (newTrace) {
      setCompareTrace(newTrace);
      setOverlayEnabled(true);
      setMode('flow');
    }
  };

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

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (event.key === 'Escape') {
        setShowShortcuts(false);
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
  }, [mode, selectedStepId, trace, playheadMs, stepBoundaries, handleModeChange, setMode]);

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

  if (loading) {
    return <div className="loading">Loading trace...</div>;
  }

  if (error || !trace) {
    return (
      <div className="error">
        <p>{error ?? 'Failed to load trace.'}</p>
        <button className="primary-button" type="button" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        trace={trace}
        traces={traces}
        selectedTraceId={selectedTraceId}
        onSelectTrace={setSelectedTraceId}
        onReload={reload}
      />
      {!introDismissed && !skipIntro ? <IntroOverlay onComplete={() => setIntroDismissed(true)} /> : null}
      <InsightStrip
        insights={insights}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          if (mode !== 'cinema') setMode('cinema');
        }}
        onJumpToError={() => {
          const firstError = trace.steps.find((step) => step.status === 'failed');
          if (firstError) {
            setSelectedStepId(firstError.id);
            setMode('cinema');
          }
        }}
        onJumpToBottleneck={() => {
          const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
          if (bottleneck) {
            setSelectedStepId(bottleneck.id);
            setMode('cinema');
          }
        }}
      />

      {!dismissedTips ? <OnboardingTips trace={trace} onDismiss={() => setDismissedTips(true)} /> : null}

      <div className="toolbar">
        <SearchBar query={query} typeFilter={typeFilter} onQueryChange={setQuery} onTypeFilterChange={setTypeFilter} />
        <div className="toolbar-actions">
          <button
            className={`ghost-button ${mode === 'cinema' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'cinema'}
            title="Timeline playback"
            onClick={() => handleModeChange('cinema')}
          >
            Cinema
          </button>
          <button
            className={`ghost-button ${mode === 'flow' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'flow'}
            title="Graph view"
            onClick={() => handleModeChange('flow')}
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
          >
            Compare
          </button>
          <label className="toggle" title="Redact payloads and disable raw views for safe sharing">
            <input type="checkbox" checked={safeExport} onChange={() => setSafeExport((prev) => !prev)} />
            Safe export
          </label>
          {trace.steps.length > 200 || windowed ? (
            <label className="toggle" title="Window steps around the playhead for large traces">
              <input type="checkbox" checked={windowed} onChange={() => setWindowed((prev) => !prev)} />
              Windowed
            </label>
          ) : null}
          {compareTrace ? (
            <label className="toggle" title="Show ghost overlay of replay in Cinema/Flow">
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
        <>
          <PlaybackControls
            playheadMs={playheadMs}
            wallTimeMs={trace.metadata.wallTimeMs || 1}
            isPlaying={isPlaying}
            speed={speed}
            onToggle={() => setIsPlaying((prev) => !prev)}
            onScrub={(value) => setPlayheadMs(value)}
            onSpeedChange={setSpeed}
          />
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
        </>
      ) : null}
      {mode === 'compare' && compareTrace ? (
        <PlaybackControls
          playheadMs={playheadMs}
          wallTimeMs={Math.max(trace.metadata.wallTimeMs || 1, compareTrace.metadata.wallTimeMs || 1)}
          isPlaying={isPlaying}
          speed={speed}
          onToggle={() => setIsPlaying((prev) => !prev)}
          onScrub={(value) => setPlayheadMs(value)}
          onSpeedChange={setSpeed}
        />
      ) : null}

      <div className="main" ref={viewportRef}>
        <MorphOrchestrator morph={morphState} onComplete={handleMorphComplete}>
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
        </MorphOrchestrator>
      </div>

      <Inspector
        traceId={trace.id}
        step={selectedStep}
        safeExport={safeExport}
        onClose={() => setSelectedStepId(null)}
        onReplay={handleReplay}
      />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
