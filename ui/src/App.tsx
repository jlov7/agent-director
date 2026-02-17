import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import type { MatrixScenarioDraft } from './components/Matrix';
import MorphOrchestrator from './components/Morph/MorphOrchestrator';
import { useTrace } from './hooks/useTrace';
import type {
  ExtensionDefinition,
  GameplayGuild,
  GameplaySession,
  InvestigationReport,
  ReplayJob,
  ReplayMatrix,
  ReplayScenarioInput,
  StepSummary,
  StepType,
  TraceQueryResult,
  TraceSummary,
} from './types';
import {
  cancelReplayJob,
  clearStepDetailsCache,
  createReplayJob,
  createGameplaySession,
  fetchInvestigation,
  getGameplaySession,
  fetchReplayJob,
  fetchReplayMatrix,
  fetchTrace as fetchTraceById,
  joinGameplaySession,
  leaveGameplaySession,
  listExtensions,
  prefetchStepDetails,
  applyGameplayAction,
  replayFromStep,
  runExtension,
  runTraceQuery,
  subscribeToGameplaySession,
  createGameplayGuild,
  getGameplayGuild,
  joinGameplayGuild,
  scheduleGameplayGuildEvent,
  completeGameplayGuildEvent,
} from './store/api';
import { usePersistedState } from './hooks/usePersistedState';
import { buildFlowLayout } from './utils/flowLayout';
import { buildIoEdgesFromSummary } from './utils/ioEdgeUtils';
import { collectStepBoundaries, findNextBoundary } from './utils/playbackBoundaries';
import { diffTraces } from './utils/diff';
import { computePollDelay } from './utils/replayPolling';
import { downloadText } from './utils/export';
import {
  DEFAULT_TIMELINE_STUDIO_CONFIG,
  deriveLaneGroups,
  normalizeLaneOrder,
  type LaneStrategy,
  type TimelineStudioConfig,
} from './utils/timelineStudio';
import {
  mergeSharedAnnotations,
  parseJsonObject,
  truncateActivity,
  type ActivityEntry,
  type SessionCursor,
  type SharedAnnotation,
} from './utils/collaboration';
import { createInitialGameplayState, type GameplayState } from './utils/gameplayEngine';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const PRESENCE_STORAGE_KEY = 'agentDirector.presence.v1';
const PRESENCE_TTL_MS = 20000;
const PRESENCE_HEARTBEAT_MS = 5000;
const COLLAB_CURSOR_STORAGE_KEY = 'agentDirector.collab.cursors.v1';
const COLLAB_ANNOTATION_STORAGE_KEY = 'agentDirector.collab.annotations.v1';
const COLLAB_ACTIVITY_STORAGE_KEY = 'agentDirector.collab.activity.v1';

type Mode = 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
type IntroPersona = 'builder' | 'executive' | 'operator';
type ThemeMode = 'studio' | 'focus' | 'contrast';
type MotionMode = 'cinematic' | 'balanced' | 'minimal';
type LaunchPath = 'rapid_triage' | 'deep_diagnosis' | 'team_sync';
type RecommendationTone = 'priority' | 'warning' | 'info';

type Rect = { left: number; top: number; width: number; height: number };
type DirectorRecommendation = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  tone: RecommendationTone;
  action: () => void;
};

type MissionId =
  | 'playback'
  | 'flow'
  | 'inspect'
  | 'matrix'
  | 'replay'
  | 'annotate'
  | 'collaborate';

type StoryBeat = {
  id: string;
  label: string;
  duration: number;
  action: () => void | Promise<void>;
};

const FlowMode = lazy(() => import('./components/FlowMode'));
const Compare = lazy(() => import('./components/Compare'));
const Inspector = lazy(() => import('./components/Inspector'));
const Matrix = lazy(() => import('./components/Matrix'));
const GameplayMode = lazy(() => import('./components/GameplayMode'));

function makeScenarioId() {
  return `scenario-${Math.random().toString(36).slice(2, 9)}`;
}
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

function mapGameplaySessionToState(
  session: GameplaySession,
  playerId: string,
  fallback: GameplayState
): GameplayState {
  const profile =
    session.profiles[playerId] ??
    session.profiles[session.players[0]?.player_id ?? ''] ??
    Object.values(session.profiles)[0];
  const roleMap = session.players.reduce<Record<string, 'strategist' | 'operator' | 'analyst' | 'saboteur'>>(
    (acc, player) => {
      acc[player.player_id] = player.role;
      return acc;
    },
    {}
  );
  const nodes = Object.entries(session.narrative.nodes).map(([nodeId, node]) => ({
    id: nodeId,
    title: node.title,
    body: node.title,
    choices: node.choices.map((choice) => ({
      id: choice.id,
      label: choice.id,
      nextNodeId: choice.next,
      tensionDelta: choice.tension,
      mutator: choice.modifier,
    })),
  }));
  const pvpWinner = session.pvp.winner ?? null;
  const failureSignals = session.telemetry.failures;
  const outcome: 'success' | 'failure' | 'mixed' = failureSignals > 0 ? 'failure' : pvpWinner ? 'success' : 'mixed';
  return {
    seed: session.seed,
    raid: {
      party: session.players.map((player) => player.player_id),
      roles: roleMap,
      objectives: session.raid.objectives.map((objective) => ({
        id: objective.id,
        label: objective.label,
        progress: objective.progress,
        target: objective.target,
        completed: objective.completed,
      })),
      completed: session.raid.completed,
    },
    campaign: {
      depth: session.campaign.depth,
      lives: session.campaign.lives,
      currentMission: {
        id: session.campaign.current_mission.id,
        title: session.campaign.current_mission.title,
        difficulty: session.campaign.current_mission.difficulty,
        hazards: session.campaign.current_mission.hazards,
        rewardCredits: session.campaign.current_mission.reward_tokens,
      },
      completedMissionIds: session.campaign.completed_missions,
      mutators: [...session.campaign.modifiers, ...session.campaign.unlocked_modifiers],
    },
    narrative: {
      currentNodeId: session.narrative.current_node_id,
      nodes: nodes.length > 0 ? nodes : fallback.narrative.nodes,
      history: session.narrative.history.map((entry) => ({ nodeId: entry.node_id, choiceId: entry.choice_id })),
      tension: session.narrative.tension,
    },
    skills: {
      points: profile?.skill_points ?? fallback.skills.points,
      nodes: fallback.skills.nodes.map((node) => ({
        ...node,
        unlocked: Boolean(profile?.unlocked_skills.includes(node.id)),
      })),
      loadout: {
        capacity: profile?.loadout_capacity ?? fallback.skills.loadout.capacity,
        equipped: profile?.loadout ?? [],
      },
    },
    pvp: {
      round: session.pvp.round,
      stability: session.pvp.operator_stability,
      sabotage: session.pvp.sabotage_pressure,
      fog: session.pvp.fog,
      winner: pvpWinner,
    },
    time: {
      activeForkId: session.time.active_fork_id,
      forks: session.time.forks.map((fork) => ({
        id: fork.id,
        label: fork.label,
        playheadMs: fork.playhead_ms,
        history: fork.history,
      })),
    },
    boss: {
      name: session.boss.name,
      phase: session.boss.phase,
      hp: session.boss.hp,
      maxHp: session.boss.max_hp,
      enraged: session.boss.enraged,
    },
    director: {
      risk: session.director.risk,
      hint: session.director.hint,
      recommendedModifier: session.director.hazard_bias,
      lastOutcome: outcome,
    },
    economy: {
      credits: session.economy.tokens,
      materials: session.economy.materials,
      crafted: session.economy.crafted,
    },
    guild: {
      name: session.guild.guild_id ?? 'Trace Guild',
      members: session.players.length,
      operationsScore: session.guild.operations_score,
      eventsCompleted: session.guild.events_completed,
    },
    cinematic: {
      queue: session.cinematic.events.map((event) => ({
        id: event.id,
        type: (event.type === 'critical' || event.type === 'success' || event.type === 'warning' || event.type === 'twist'
          ? event.type
          : 'warning'),
        message: event.message,
        intensity: (event.intensity as 1 | 2 | 3) || 1,
        at: Date.parse(event.at) || Date.now(),
      })),
    },
    liveops: {
      season: session.liveops.season,
      week: session.liveops.week,
      challenge: {
        id: session.liveops.challenge.id,
        title: session.liveops.challenge.title,
        goal: session.liveops.challenge.goal,
        progress: session.liveops.challenge.progress,
        rewardCredits: session.liveops.challenge.reward,
        completed: session.liveops.challenge.completed,
      },
    },
    safety: fallback.safety,
  };
}

function getOrCreateSessionId() {
  const existing = window.sessionStorage.getItem('agentDirector.sessionId');
  if (existing) return existing;
  const next = `session-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem('agentDirector.sessionId', next);
  return next;
}

function readPresenceStore() {
  try {
    const raw = window.localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, number> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'number') normalized[key] = value;
    });
    return normalized;
  } catch {
    return {} as Record<string, number>;
  }
}

function prunePresence(store: Record<string, number>, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(store).filter(([, heartbeat]) => now - heartbeat < PRESENCE_TTL_MS)
  );
}

export default function App() {
  const { trace, insights, loading, error, reload, traces, selectedTraceId, setSelectedTraceId } = useTrace();
  const [mode, setMode] = usePersistedState<Mode>('agentDirector.mode', 'cinema');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [typeFilter, setTypeFilter] = useState<StepType | 'all'>('all');
  const [traceQuery, setTraceQuery] = useState('');
  const [traceQueryResult, setTraceQueryResult] = useState<TraceQueryResult | null>(null);
  const [traceQueryError, setTraceQueryError] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationReport | null>(null);
  const [extensions, setExtensions] = useState<ExtensionDefinition[]>([]);
  const [selectedExtensionId, setSelectedExtensionId] = useState('');
  const [extensionOutput, setExtensionOutput] = useState<Record<string, unknown> | null>(null);
  const [extensionRunning, setExtensionRunning] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [safeExport, setSafeExport] = usePersistedState('agentDirector.safeExport', false);
  const [syncPlayback, setSyncPlayback] = usePersistedState('agentDirector.syncPlayback', true);
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
  const [, setTourCompleted] = usePersistedState('agentDirector.tourCompleted', false);
  const [explainMode, setExplainMode] = usePersistedState('agentDirector.explainMode', true);
  const [heroDismissed, setHeroDismissed] = usePersistedState('agentDirector.heroDismissed', false);
  const [dockOpen, setDockOpen] = usePersistedState('agentDirector.dockOpen', false);
  const [introPersona, setIntroPersona] = usePersistedState<IntroPersona>(
    'agentDirector.introPersona',
    'builder'
  );
  const [launchPath, setLaunchPath] = usePersistedState<LaunchPath>(
    'agentDirector.launchPath',
    'rapid_triage'
  );
  const [themeMode, setThemeMode] = usePersistedState<ThemeMode>('agentDirector.themeMode', 'studio');
  const [motionMode, setMotionMode] = usePersistedState<MotionMode>('agentDirector.motionMode', 'balanced');
  const [laneStrategy, setLaneStrategy] = usePersistedState<LaneStrategy>(
    'agentDirector.timelineLaneStrategy',
    'type'
  );
  const [timelineStudioConfig, setTimelineStudioConfig] = usePersistedState<TimelineStudioConfig>(
    'agentDirector.timelineStudioConfig',
    DEFAULT_TIMELINE_STUDIO_CONFIG
  );
  const [missionProgress, setMissionProgress] = usePersistedState<Record<MissionId, boolean>>(
    'agentDirector.missions',
    {
      playback: false,
      flow: false,
      inspect: false,
      matrix: false,
      replay: false,
      annotate: false,
      collaborate: false,
    }
  );
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
  const [matrixAnchorStepId, setMatrixAnchorStepId] = useState<string>('');
  const [matrixScenarios, setMatrixScenarios] = useState<MatrixScenarioDraft[]>([
    {
      id: makeScenarioId(),
      name: 'Prompt tighter',
      strategy: 'hybrid',
      modificationsText: '{"prompt":"Return concise response"}',
    },
    {
      id: makeScenarioId(),
      name: 'Recorded baseline',
      strategy: 'recorded',
      modificationsText: '{}',
    },
  ]);
  const [replayJob, setReplayJob] = useState<ReplayJob | null>(null);
  const [replayMatrix, setReplayMatrix] = useState<ReplayMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [gameplayState, setGameplayState] = usePersistedState<GameplayState>(
    'agentDirector.gameplayState.v1',
    createInitialGameplayState('bootstrap')
  );
  const [gameplayTraceId, setGameplayTraceId] = usePersistedState('agentDirector.gameplayTraceId.v1', '');
  const [gameplayPlayerId] = usePersistedState(
    'agentDirector.gameplayPlayerId.v1',
    `player-${Math.random().toString(36).slice(2, 8)}`
  );
  const [gameplaySessionId, setGameplaySessionId] = usePersistedState('agentDirector.gameplaySessionId.v1', '');
  const [gameplaySession, setGameplaySession] = useState<GameplaySession | null>(null);
  const [gameplaySessionError, setGameplaySessionError] = useState<string | null>(null);
  const [gameplayGuild, setGameplayGuild] = useState<GameplayGuild | null>(null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [sessionCursors, setSessionCursors] = useState<Record<string, SessionCursor>>({});
  const [sharedAnnotations, setSharedAnnotations] = useState<SharedAnnotation[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [hydrationLimit, setHydrationLimit] = useState(800);
  const [filterComputeMs, setFilterComputeMs] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const compareTraceRef = useRef<TraceSummary | null>(null);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const lastCursorWriteRef = useRef(0);
  const filterMeasureRef = useRef(0);
  const applyingRemoteCursorRef = useRef(false);

  const textFilteredSteps = useMemo(() => {
    if (!trace) return [];
    const start = performance.now();
    const filtered = filterSteps(trace.steps, deferredQuery, typeFilter);
    filterMeasureRef.current = performance.now() - start;
    return filtered;
  }, [trace, deferredQuery, typeFilter]);
  const hydratedSteps = useMemo(
    () => textFilteredSteps.slice(0, Math.min(textFilteredSteps.length, hydrationLimit)),
    [hydrationLimit, textFilteredSteps]
  );
  const steps = useMemo(() => {
    if (!traceQueryResult) return hydratedSteps;
    const matched = new Set(traceQueryResult.matchedStepIds);
    return hydratedSteps.filter((step) => matched.has(step.id));
  }, [hydratedSteps, traceQueryResult]);
  const compareSteps = useMemo(
    () =>
      compareTrace
        ? filterSteps(compareTrace.steps, deferredQuery, typeFilter).slice(
            0,
            Math.min(compareTrace.steps.length, hydrationLimit)
          )
        : [],
    [compareTrace, deferredQuery, typeFilter, hydrationLimit]
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
  const laneGroups = useMemo(
    () => (trace ? deriveLaneGroups(trace.steps, laneStrategy) : []),
    [trace, laneStrategy]
  );
  const laneConfig = useMemo(() => {
    const current = timelineStudioConfig[laneStrategy] ?? DEFAULT_TIMELINE_STUDIO_CONFIG[laneStrategy];
    return normalizeLaneOrder(laneGroups, current.order, current.hidden);
  }, [laneGroups, laneStrategy, timelineStudioConfig]);
  const visibleLaneGroups = useMemo(
    () => laneConfig.order.filter((group) => !laneConfig.hidden.includes(group)),
    [laneConfig.hidden, laneConfig.order]
  );
  const remoteCursors = useMemo(() => {
    const sessionId = sessionIdRef.current;
    return Object.values(sessionCursors)
      .filter((cursor) => cursor.sessionId !== sessionId)
      .filter((cursor) => cursor.traceId === (trace?.id ?? 'none'))
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, [sessionCursors, trace?.id]);
  const remotePlayheads = useMemo(
    () => remoteCursors.map((cursor) => cursor.playheadMs),
    [remoteCursors]
  );
  const currentTraceAnnotations = useMemo(
    () => sharedAnnotations.filter((annotation) => annotation.traceId === trace?.id),
    [sharedAnnotations, trace?.id]
  );
  const missionCompletion = useMemo(() => {
    const total = Object.keys(missionProgress).length;
    const done = Object.values(missionProgress).filter(Boolean).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [missionProgress]);
  const runHealthScore = useMemo(() => {
    if (!trace) return 100;
    const base = 100;
    const errorPenalty = Math.min(60, (insights?.errors ?? 0) * 16);
    const retryPenalty = Math.min(24, (insights?.retries ?? 0) * 6);
    const wallPenalty = trace.metadata.wallTimeMs > 60000 ? 12 : trace.metadata.wallTimeMs > 30000 ? 6 : 0;
    const timingPenalty = insights?.timing?.degraded ? 8 : 0;
    return Math.max(0, Math.min(100, Math.round(base - errorPenalty - retryPenalty - wallPenalty - timingPenalty)));
  }, [insights?.errors, insights?.retries, insights?.timing?.degraded, trace]);
  const modeHotkeys = useMemo(() => {
    if (mode === 'flow') return 'F / C / Space';
    if (mode === 'compare') return 'C / Space / ← →';
    if (mode === 'matrix') return 'G / C / Cmd+K';
    if (mode === 'gameplay') return 'G / S / Cmd+K';
    return 'C / F / Space';
  }, [mode]);

  useEffect(() => {
    if (!trace) return;
    if (trace.id === gameplayTraceId) return;
    setGameplayState(createInitialGameplayState(trace.id));
    setGameplayTraceId(trace.id);
  }, [gameplayTraceId, setGameplayState, setGameplayTraceId, trace]);

  useEffect(() => {
    let cancelled = false;
    if (!gameplaySessionId) {
      setGameplaySession(null);
      return;
    }
    void getGameplaySession(gameplaySessionId).then((session) => {
      if (cancelled) return;
      setGameplaySession(session);
      if (!session) {
        setGameplaySessionError('Gameplay session not found.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gameplaySessionId]);

  useEffect(() => {
    if (!gameplaySessionId) return;
    const unsubscribe = subscribeToGameplaySession(
      gameplaySessionId,
      (session) => {
        setGameplaySession(session);
        setGameplaySessionError(null);
      },
      () => setGameplaySessionError('Realtime sync disconnected. Falling back to polling.')
    );
    return () => unsubscribe();
  }, [gameplaySessionId]);

  useEffect(() => {
    if (!gameplaySession) return;
    setGameplayState((prev) => mapGameplaySessionToState(gameplaySession, gameplayPlayerId, prev));
  }, [gameplayPlayerId, gameplaySession, setGameplayState]);

  useEffect(() => {
    let cancelled = false;
    const guildId = gameplaySession?.guild.guild_id;
    if (!guildId) {
      setGameplayGuild(null);
      return;
    }
    void getGameplayGuild(guildId).then((guild) => {
      if (cancelled) return;
      setGameplayGuild(guild);
    });
    return () => {
      cancelled = true;
    };
  }, [gameplaySession?.guild.guild_id]);

  useEffect(() => {
    setTraceQueryResult(null);
    setTraceQueryError(null);
  }, [trace?.id]);

  useEffect(() => {
    setFilterComputeMs(Math.round(filterMeasureRef.current));
  }, [textFilteredSteps]);

  useEffect(() => {
    if (!trace) return;
    const total = textFilteredSteps.length;
    if (total <= 1200) {
      setHydrationLimit(total);
      return;
    }
    setHydrationLimit(800);
    const interval = window.setInterval(() => {
      setHydrationLimit((prev) => {
        if (prev >= total) {
          window.clearInterval(interval);
          return total;
        }
        return Math.min(total, prev + 1000);
      });
    }, 70);
    return () => window.clearInterval(interval);
  }, [textFilteredSteps.length, trace]);

  useEffect(() => {
    let cancelled = false;
    if (!trace?.id) {
      setInvestigation(null);
      return;
    }
    void fetchInvestigation(trace.id).then((report) => {
      if (!cancelled) setInvestigation(report);
    });
    return () => {
      cancelled = true;
    };
  }, [trace?.id]);

  useEffect(() => {
    let cancelled = false;
    void listExtensions().then((items) => {
      if (cancelled) return;
      setExtensions(items);
      if (!selectedExtensionId && items.length > 0) {
        setSelectedExtensionId(items[0].id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedExtensionId]);

  useEffect(() => {
    compareTraceRef.current = compareTrace;
  }, [compareTrace]);

  useEffect(() => {
    document.body.dataset.theme = themeMode;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [themeMode]);

  useEffect(() => {
    document.body.dataset.motion = motionMode;
    return () => {
      delete document.body.dataset.motion;
    };
  }, [motionMode]);

  useEffect(() => {
    const sessionId = sessionIdRef.current;

    const writeHeartbeat = (remove = false) => {
      const now = Date.now();
      const next = prunePresence(readPresenceStore(), now);
      if (remove) {
        delete next[sessionId];
      } else {
        next[sessionId] = now;
      }
      window.localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(next));
      setActiveSessions(Math.max(1, Object.keys(next).length));
    };

    const syncPresence = () => {
      const next = prunePresence(readPresenceStore(), Date.now());
      setActiveSessions(Math.max(1, Object.keys(next).length));
    };

    writeHeartbeat();
    const heartbeat = window.setInterval(() => writeHeartbeat(), PRESENCE_HEARTBEAT_MS);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PRESENCE_STORAGE_KEY) syncPresence();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') writeHeartbeat();
    };
    const handleUnload = () => writeHeartbeat(true);

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(heartbeat);
      writeHeartbeat(true);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  useEffect(() => {
    if (mode === 'compare') {
      setDockOpen(false);
    }
  }, [mode, setDockOpen]);

  useEffect(() => {
    if (laneGroups.length === 0) return;
    setTimelineStudioConfig((prev) => {
      const current = prev[laneStrategy] ?? DEFAULT_TIMELINE_STUDIO_CONFIG[laneStrategy];
      const normalized = normalizeLaneOrder(laneGroups, current.order, current.hidden);
      const unchanged =
        normalized.order.join('|') === current.order.join('|') &&
        normalized.hidden.join('|') === current.hidden.join('|');
      if (unchanged) return prev;
      return {
        ...prev,
        [laneStrategy]: normalized,
      };
    });
  }, [laneGroups, laneStrategy, setTimelineStudioConfig]);

  useEffect(() => {
    setSessionCursors(parseJsonObject<Record<string, SessionCursor>>(
      window.localStorage.getItem(COLLAB_CURSOR_STORAGE_KEY),
      {}
    ));
    setSharedAnnotations(parseJsonObject<SharedAnnotation[]>(
      window.localStorage.getItem(COLLAB_ANNOTATION_STORAGE_KEY),
      []
    ));
    setActivityFeed(parseJsonObject<ActivityEntry[]>(
      window.localStorage.getItem(COLLAB_ACTIVITY_STORAGE_KEY),
      []
    ));
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (now - lastCursorWriteRef.current < 120 && isPlaying) return;
    lastCursorWriteRef.current = now;

    const sessionId = sessionIdRef.current;
    const nextCursor: SessionCursor = {
      sessionId,
      traceId: trace?.id ?? 'none',
      mode,
      playheadMs: Math.round(playheadMs),
      selectedStepId,
      updatedAt: now,
    };
    const existing = parseJsonObject<Record<string, SessionCursor>>(
      window.localStorage.getItem(COLLAB_CURSOR_STORAGE_KEY),
      {}
    );
    const next = { ...existing, [sessionId]: nextCursor };
    window.localStorage.setItem(COLLAB_CURSOR_STORAGE_KEY, JSON.stringify(next));
    setSessionCursors(next);
  }, [isPlaying, mode, playheadMs, selectedStepId, trace?.id]);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    return () => {
      const existing = parseJsonObject<Record<string, SessionCursor>>(
        window.localStorage.getItem(COLLAB_CURSOR_STORAGE_KEY),
        {}
      );
      if (!existing[sessionId]) return;
      const next = { ...existing };
      delete next[sessionId];
      window.localStorage.setItem(COLLAB_CURSOR_STORAGE_KEY, JSON.stringify(next));
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === COLLAB_CURSOR_STORAGE_KEY) {
        setSessionCursors(parseJsonObject<Record<string, SessionCursor>>(event.newValue, {}));
      }
      if (event.key === COLLAB_ANNOTATION_STORAGE_KEY) {
        const incoming = parseJsonObject<SharedAnnotation[]>(event.newValue, []);
        setSharedAnnotations((prev) => mergeSharedAnnotations(prev, incoming));
      }
      if (event.key === COLLAB_ACTIVITY_STORAGE_KEY) {
        setActivityFeed(truncateActivity(parseJsonObject<ActivityEntry[]>(event.newValue, [])));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const appendActivity = useCallback((message: string) => {
    const entry: ActivityEntry = {
      id: `activity-${Math.random().toString(36).slice(2, 9)}`,
      sessionId: sessionIdRef.current,
      message,
      timestamp: Date.now(),
    };
    setActivityFeed((prev) => {
      const next = truncateActivity([entry, ...prev]);
      window.localStorage.setItem(COLLAB_ACTIVITY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleReplay = useCallback(
    async (stepId: string) => {
      if (!trace) return;
      const newTrace = await replayFromStep(trace.id, stepId, 'hybrid', { note: 'UI replay' }, trace);
      if (newTrace) {
        setCompareTrace(newTrace);
        setOverlayEnabled(true);
        setMode('flow');
        setMissionProgress((prev) => (prev.replay ? prev : { ...prev, replay: true }));
        appendActivity(`Created replay from ${stepId}`);
      }
    },
    [appendActivity, setMissionProgress, trace, setCompareTrace, setMode, setOverlayEnabled]
  );

  const handleTraceQuery = useCallback(async () => {
    if (!trace) return;
    if (!traceQuery.trim()) {
      setTraceQueryResult(null);
      setTraceQueryError(null);
      return;
    }
    const result = await runTraceQuery(trace.id, traceQuery.trim());
    if (!result) {
      setTraceQueryError('TraceQL query failed');
      setTraceQueryResult(null);
      return;
    }
    setTraceQueryResult(result);
    setTraceQueryError(null);
    const firstMatch = result.matchedStepIds[0];
    if (firstMatch) {
      setSelectedStepId(firstMatch);
      if (mode !== 'cinema') setMode('cinema');
    }
  }, [mode, setMode, trace, traceQuery]);

  const handleRunExtension = useCallback(async () => {
    if (!trace || !selectedExtensionId) return;
    setExtensionRunning(true);
    const output = await runExtension(selectedExtensionId, trace.id);
    setExtensionRunning(false);
    if (!output) return;
    setExtensionOutput(output.result);
  }, [selectedExtensionId, trace]);

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

  const shareSession = useCallback(async () => {
    if (!trace) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('trace', selectedTraceId ?? trace.id);
    shareUrl.searchParams.set('mode', mode);
    if (selectedStepId) {
      shareUrl.searchParams.set('step', selectedStepId);
    } else {
      shareUrl.searchParams.delete('step');
    }

    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setShareStatus('Live link copied');
    } catch {
      window.prompt('Copy live session link', shareUrl.toString());
      setShareStatus('Live link ready');
    }

    window.setTimeout(() => setShareStatus(null), 1800);
  }, [mode, selectedStepId, selectedTraceId, trace]);

  const handleLaneStrategyChange = useCallback(
    (strategy: LaneStrategy) => {
      setLaneStrategy(strategy);
      appendActivity(`Switched lane strategy to ${strategy}`);
    },
    [appendActivity, setLaneStrategy]
  );

  const toggleLaneGroupVisibility = useCallback(
    (groupKey: string) => {
      setTimelineStudioConfig((prev) => {
        const current = prev[laneStrategy] ?? DEFAULT_TIMELINE_STUDIO_CONFIG[laneStrategy];
        const hidden = current.hidden.includes(groupKey)
          ? current.hidden.filter((key) => key !== groupKey)
          : [...current.hidden, groupKey];
        return {
          ...prev,
          [laneStrategy]: { ...current, hidden },
        };
      });
      appendActivity(`Toggled lane visibility for ${groupKey}`);
    },
    [appendActivity, laneStrategy, setTimelineStudioConfig]
  );

  const handleCreateGameplaySession = useCallback(
    async (name: string) => {
      if (!trace) return;
      const session = await createGameplaySession({
        traceId: trace.id,
        hostPlayerId: gameplayPlayerId,
        name: name.trim() || 'Night Ops',
      });
      if (!session) {
        setGameplaySessionError('Failed to create gameplay session.');
        return;
      }
      setGameplaySession(session);
      setGameplaySessionId(session.id);
      setGameplaySessionError(null);
      appendActivity(`Created gameplay session ${session.id}`);
    },
    [appendActivity, gameplayPlayerId, setGameplaySessionId, trace]
  );

  const handleJoinGameplaySession = useCallback(
    async (sessionId: string, playerId: string, role: 'strategist' | 'operator' | 'analyst' | 'saboteur') => {
      if (!sessionId.trim()) {
        setGameplaySessionError('Session id is required.');
        return;
      }
      const session = await joinGameplaySession({
        sessionId: sessionId.trim(),
        playerId: playerId.trim(),
        role,
      });
      if (!session) {
        setGameplaySessionError('Failed to join gameplay session.');
        return;
      }
      setGameplaySession(session);
      setGameplaySessionId(session.id);
      setGameplaySessionError(null);
      appendActivity(`Joined gameplay session ${session.id} as ${playerId}`);
    },
    [appendActivity, setGameplaySessionId]
  );

  const handleLeaveGameplaySession = useCallback(async () => {
    if (!gameplaySessionId) return;
    const session = await leaveGameplaySession({ sessionId: gameplaySessionId, playerId: gameplayPlayerId });
    if (!session) {
      setGameplaySessionError('Failed to leave gameplay session.');
      return;
    }
    setGameplaySession(null);
    setGameplaySessionId('');
    setGameplaySessionError(null);
    appendActivity(`Left gameplay session ${gameplaySessionId}`);
  }, [appendActivity, gameplayPlayerId, gameplaySessionId, setGameplaySessionId]);

  const handleGameplayAction = useCallback(
    async (actionType: string, payload?: Record<string, unknown>) => {
      if (!gameplaySession?.id) return;
      const result = await applyGameplayAction({
        sessionId: gameplaySession.id,
        playerId: gameplayPlayerId,
        type: actionType,
        payload,
        expectedVersion: gameplaySession.version,
      });
      if (result.session) {
        setGameplaySession(result.session);
        setGameplaySessionError(null);
        appendActivity(`Gameplay action: ${actionType}`);
        return;
      }
      if (result.conflict) {
        const latest = await getGameplaySession(gameplaySession.id);
        if (latest) setGameplaySession(latest);
        setGameplaySessionError('Session changed by another player. Synced latest state.');
        return;
      }
      setGameplaySessionError(result.error ?? 'Gameplay action failed.');
    },
    [appendActivity, gameplayPlayerId, gameplaySession]
  );

  const handleCreateGameplayGuild = useCallback(
    async (guildId: string, name: string) => {
      if (!guildId.trim() || !name.trim()) {
        setGameplaySessionError('Guild id and name are required.');
        return;
      }
      const guild = await createGameplayGuild({
        guildId: guildId.trim(),
        name: name.trim(),
        ownerPlayerId: gameplayPlayerId,
      });
      if (!guild) {
        setGameplaySessionError('Failed to create guild.');
        return;
      }
      setGameplayGuild(guild);
      if (gameplaySession) {
        const result = await applyGameplayAction({
          sessionId: gameplaySession.id,
          playerId: gameplayPlayerId,
          type: 'guild.bind',
          payload: { guild_id: guild.id },
          expectedVersion: gameplaySession.version,
        });
        if (result.session) setGameplaySession(result.session);
      }
      setGameplaySessionError(null);
      appendActivity(`Created guild ${guild.id}`);
    },
    [appendActivity, gameplayPlayerId, gameplaySession]
  );

  const handleJoinGameplayGuild = useCallback(
    async (guildId: string, playerId: string) => {
      if (!guildId.trim() || !playerId.trim()) {
        setGameplaySessionError('Guild id and player id are required.');
        return;
      }
      const guild = await joinGameplayGuild(guildId.trim(), playerId.trim());
      if (!guild) {
        setGameplaySessionError('Failed to join guild.');
        return;
      }
      setGameplayGuild(guild);
      setGameplaySessionError(null);
      appendActivity(`Joined guild ${guild.id} as ${playerId}`);
    },
    [appendActivity]
  );

  const handleScheduleGameplayGuildEvent = useCallback(
    async (guildId: string, title: string, scheduledAt: string) => {
      if (!guildId.trim() || !title.trim() || !scheduledAt.trim()) {
        setGameplaySessionError('Guild id, title, and schedule are required.');
        return;
      }
      const payload = await scheduleGameplayGuildEvent({
        guildId: guildId.trim(),
        title: title.trim(),
        scheduledAt: scheduledAt.trim(),
      });
      if (!payload) {
        setGameplaySessionError('Failed to schedule guild event.');
        return;
      }
      setGameplayGuild(payload.guild);
      setGameplaySessionError(null);
      appendActivity(`Scheduled guild event ${payload.event.id}`);
    },
    [appendActivity]
  );

  const handleCompleteGameplayGuildEvent = useCallback(
    async (guildId: string, eventId: string, impact: number) => {
      const guild = await completeGameplayGuildEvent(guildId, eventId, impact);
      if (!guild) {
        setGameplaySessionError('Failed to complete guild event.');
        return;
      }
      setGameplayGuild(guild);
      setGameplaySessionError(null);
      appendActivity(`Completed guild event ${eventId}`);
    },
    [appendActivity]
  );

  const moveLaneGroup = useCallback(
    (groupKey: string, direction: 'up' | 'down') => {
      setTimelineStudioConfig((prev) => {
        const current = prev[laneStrategy] ?? DEFAULT_TIMELINE_STUDIO_CONFIG[laneStrategy];
        const order = [...current.order];
        const index = order.indexOf(groupKey);
        if (index === -1) return prev;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= order.length) return prev;
        const [moved] = order.splice(index, 1);
        order.splice(targetIndex, 0, moved);
        return {
          ...prev,
          [laneStrategy]: { ...current, order },
        };
      });
      appendActivity(`Moved lane group ${groupKey} ${direction}`);
    },
    [appendActivity, laneStrategy, setTimelineStudioConfig]
  );

  const resetMissions = useCallback(() => {
    setMissionProgress({
      playback: false,
      flow: false,
      inspect: false,
      matrix: false,
      replay: false,
      annotate: false,
      collaborate: false,
    });
    appendActivity('Reset onboarding missions');
  }, [appendActivity, setMissionProgress]);

  const addSharedAnnotation = useCallback(
    (body: string, stepId: string | null) => {
      if (!trace || !body.trim()) return;
      const timestamp = Date.now();
      const nextAnnotation: SharedAnnotation = {
        id: `annotation-${Math.random().toString(36).slice(2, 9)}`,
        traceId: trace.id,
        stepId,
        body: body.trim(),
        authorSessionId: sessionIdRef.current,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setSharedAnnotations((prev) => {
        const next = mergeSharedAnnotations(prev, [nextAnnotation]);
        window.localStorage.setItem(COLLAB_ANNOTATION_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setMissionProgress((prev) => (prev.annotate ? prev : { ...prev, annotate: true }));
      appendActivity(stepId ? `Added annotation on step ${stepId}` : 'Added trace annotation');
    },
    [appendActivity, setMissionProgress, trace]
  );

  const updateMatrixScenario = useCallback((id: string, patch: Partial<MatrixScenarioDraft>) => {
    setMatrixScenarios((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const replaceMatrixScenarios = useCallback((next: MatrixScenarioDraft[]) => {
    setMatrixScenarios(next);
  }, []);

  const addMatrixScenario = useCallback(() => {
    setMatrixScenarios((prev) => [
      ...prev,
      { id: makeScenarioId(), name: `Scenario ${prev.length + 1}`, strategy: 'hybrid', modificationsText: '{}' },
    ]);
  }, []);

  const removeMatrixScenario = useCallback((id: string) => {
    setMatrixScenarios((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const duplicateMatrixScenario = useCallback((id: string) => {
    setMatrixScenarios((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const source = prev[index];
      const duplicate: MatrixScenarioDraft = {
        ...source,
        id: makeScenarioId(),
        name: `${source.name} copy`,
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
  }, []);

  const moveMatrixScenario = useCallback((id: string, direction: 'up' | 'down') => {
    setMatrixScenarios((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const runReplayMatrix = useCallback(
    async (scenarios: ReplayScenarioInput[]) => {
      if (!trace) return;
    const stepId = matrixAnchorStepId || selectedStepId || trace.steps[0]?.id;
    if (!stepId) {
      setMatrixError('Select an anchor step before running the matrix.');
      return;
    }
    try {
      setMatrixLoading(true);
      setMatrixError(null);
      const created = await createReplayJob({
        traceId: trace.id,
        stepId,
        scenarios,
      });
      if (!created) {
        throw new Error('Failed to create replay job.');
      }
      setReplayJob(created);

      let latest = created;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (latest.status !== 'queued' && latest.status !== 'running') break;
        const delay = computePollDelay(attempt);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        const refreshed = await fetchReplayJob(created.id);
        if (!refreshed) break;
        latest = refreshed;
        setReplayJob(refreshed);
      }

      const matrix = await fetchReplayMatrix(created.id);
      if (!matrix) {
        throw new Error('Replay job finished but matrix summary is unavailable.');
      }
      setReplayMatrix(matrix);
      setMode('matrix');
      appendActivity(`Ran matrix with ${scenarios.length} scenario(s) from ${stepId}`);
    } catch (err) {
      setMatrixError(err instanceof Error ? err.message : 'Failed to run replay matrix.');
    } finally {
      setMatrixLoading(false);
    }
    },
    [appendActivity, matrixAnchorStepId, selectedStepId, trace, setMode]
  );

  const cancelMatrixRun = useCallback(async () => {
    if (!replayJob) return;
    setMatrixLoading(true);
    try {
      const canceled = await cancelReplayJob(replayJob.id);
      if (!canceled) {
        setMatrixError('Failed to cancel replay job.');
        return;
      }
      setReplayJob(canceled);
      const matrix = await fetchReplayMatrix(canceled.id);
      if (matrix) setReplayMatrix(matrix);
      appendActivity(`Canceled matrix job ${replayJob.id}`);
    } finally {
      setMatrixLoading(false);
    }
  }, [appendActivity, replayJob]);

  const openMatrixCompare = useCallback(
    async (traceId: string) => {
      const payload = await fetchTraceById(traceId);
      if (!payload?.trace) {
        setMatrixError('Could not load replay trace for compare view.');
        return;
      }
      setCompareTrace(payload.trace);
      setOverlayEnabled(true);
      setMode('compare');
      appendActivity(`Opened matrix compare trace ${traceId}`);
    },
    [appendActivity, setMode, setOverlayEnabled]
  );

  const handleModeChange = useCallback(
    (next: Mode) => {
      if (next === mode || !trace) return;
      if (next === 'flow' || next === 'matrix' || next === 'gameplay') setIsPlaying(false);
      if (next === 'flow' && mode === 'cinema' && viewportRef.current) {
        const container = viewportRef.current;
        const fromRects = collectStepRects(container);
        const toRects = buildFlowRects(trace.steps, container, trace.id);
        setMorphState({ steps: trace.steps, fromRects, toRects });
        appendActivity('Morphed cinema to flow');
        return;
      }
      setMode(next);
      appendActivity(`Switched mode to ${next}`);
    },
    [appendActivity, mode, trace, setIsPlaying, setMode]
  );

  const startLaunchPath = useCallback(
    async (path: LaunchPath) => {
      setLaunchPath(path);
      if (path === 'rapid_triage') {
        setExplainMode(true);
        handleModeChange('cinema');
        jumpToError();
        if (!trace?.steps.some((step) => step.status === 'failed')) {
          jumpToBottleneck();
        }
        appendActivity('Started rapid triage launch path');
        return;
      }
      if (path === 'deep_diagnosis') {
        setExplainMode(true);
        handleModeChange('flow');
        setTourOpen(true);
        appendActivity('Started deep diagnosis launch path');
        return;
      }
      setSyncPlayback(true);
      handleModeChange('matrix');
      await shareSession();
      appendActivity('Started team sync launch path');
    },
    [
      appendActivity,
      handleModeChange,
      jumpToBottleneck,
      jumpToError,
      setExplainMode,
      setLaunchPath,
      setSyncPlayback,
      shareSession,
      trace,
    ]
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
    const personaGuidance: Record<IntroPersona, string> = {
      builder: 'Focus on payload flow, tool-call sequencing, and replay-ready steps.',
      executive: 'Focus on bottlenecks, risk signals, and run-level outcome changes.',
      operator: 'Focus on failure patterns, retries, and runtime reliability posture.',
    };
    const steps: TourStep[] = [
      {
        id: 'header',
        title: 'Mission control',
        body: `Confirm run status and metadata. ${personaGuidance[introPersona]}`,
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
        body:
          introPersona === 'executive'
            ? 'Jump straight to bottlenecks and high-cost segments for fast executive readouts.'
            : introPersona === 'operator'
              ? 'Jump to failures and retries first, then inspect impacted steps.'
              : 'Jump straight to bottlenecks, errors, and high-cost steps with one click.',
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
        body:
          introPersona === 'executive'
            ? 'Open key moments to validate outcome impact and communication-ready summaries.'
            : 'Open any step to read payloads, apply redaction, and replay from that moment.',
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
  }, [compareTrace, heroDismissed, introPersona]);

  const handleMorphComplete = useCallback(() => {
    setMorphState(null);
    setMode('flow');
  }, [setMode]);

  const directorRecommendations = useMemo<DirectorRecommendation[]>(() => {
    if (!trace) return [];
    const list: DirectorRecommendation[] = [];
    const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
    const firstError = trace.steps.find((step) => step.status === 'failed');

    if (firstError && selectedStepId !== firstError.id) {
      list.push({
        id: 'jump-error',
        title: 'Investigate first failure',
        body: `${firstError.name} failed and should be inspected before optimization work.`,
        actionLabel: 'Open failed step',
        tone: 'warning',
        action: jumpToError,
      });
    }

    if (bottleneck && selectedStepId !== bottleneck.id) {
      list.push({
        id: 'jump-bottleneck',
        title: 'Tackle latency bottleneck',
        body: `${bottleneck.name} is the slowest scene in this run and the best optimization target.`,
        actionLabel: 'Open bottleneck',
        tone: 'priority',
        action: jumpToBottleneck,
      });
    }

    if (investigation?.hypotheses?.[0]) {
      const topHypothesis = investigation.hypotheses[0];
      list.push({
        id: 'investigate-hypothesis',
        title: topHypothesis.title,
        body: topHypothesis.summary,
        actionLabel: 'Inspect evidence',
        tone: 'info',
        action: () => {
          const evidenceStepId = topHypothesis.evidenceStepIds[0];
          if (evidenceStepId) {
            setSelectedStepId(evidenceStepId);
            if (mode !== 'cinema') setMode('cinema');
          }
        },
      });
    }

    if (mode !== 'matrix') {
      list.push({
        id: 'matrix-experiment',
        title: 'Run scenario matrix',
        body: 'Compare prompt and strategy alternatives from one anchor step to rank causal impact.',
        actionLabel: 'Open matrix',
        tone: 'info',
        action: () => {
          setMatrixAnchorStepId(selectedStepId ?? trace.steps[0]?.id ?? '');
          setMode('matrix');
        },
      });
    }

    if (!compareTrace && (selectedStepId || trace.steps[0]?.id)) {
      const replayStep = selectedStepId ?? trace.steps[0]?.id ?? null;
      if (replayStep) {
        list.push({
          id: 'run-replay',
          title: 'Create director replay',
          body: 'Branch a replay trace and validate whether your change improves the run.',
          actionLabel: 'Replay from step',
          tone: 'info',
          action: () => {
            void handleReplay(replayStep);
          },
        });
      }
    }

    if (replayMatrix?.causalRanking?.length) {
      const top = replayMatrix.causalRanking[0];
      list.push({
        id: 'causal-factor',
        title: `Top causal factor: ${top.factor}`,
        body: `Confidence ${(top.confidence * 100).toFixed(0)}% across ${top.evidence.samples} sample(s).`,
        actionLabel: 'View matrix',
        tone: 'priority',
        action: () => setMode('matrix'),
      });
    }

    return list.slice(0, 4);
  }, [
    compareTrace,
    handleReplay,
    investigation,
    jumpToBottleneck,
    jumpToError,
    mode,
    replayMatrix,
    selectedStepId,
    trace,
    setMode,
  ]);

  const journeyPriorityQueue = useMemo(
    () =>
      directorRecommendations.map((item, index) => {
        const severity: 'high' | 'medium' | 'low' =
          item.tone === 'warning' ? 'high' : item.tone === 'priority' ? 'medium' : 'low';
        return {
          id: `priority-${item.id}`,
          title: item.title,
          detail: item.body,
          severity,
          actionLabel: item.actionLabel,
          onAction: item.action,
          done:
            index === 0
              ? (item.id === 'jump-error' && Boolean(selectedStepId)) ||
                (item.id === 'jump-bottleneck' && Boolean(selectedStepId))
              : false,
        };
      }),
    [directorRecommendations, selectedStepId]
  );

  const directorNarrative = useMemo(() => {
    if (!trace) return 'No trace loaded.';
    const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
    const failed = trace.steps.filter((step) => step.status === 'failed').length;
    const topHypothesis = investigation?.hypotheses?.[0];
    const causal = replayMatrix?.causalRanking?.[0];
    const lines = [
      `Run ${trace.id} completed with ${trace.steps.length} steps across ${trace.metadata.wallTimeMs}ms.`,
      bottleneck ? `Primary latency driver: ${bottleneck.name} (${bottleneck.durationMs ?? 0}ms).` : null,
      failed > 0 ? `Observed ${failed} failed step(s), indicating reliability risk.` : 'No failed steps observed.',
      topHypothesis ? `Top investigation hypothesis: ${topHypothesis.title} (${topHypothesis.severity}).` : null,
      causal ? `Highest ranked causal factor from matrix: ${causal.factor} (${(causal.confidence * 100).toFixed(0)}% confidence).` : null,
      'Recommended plan: inspect bottleneck evidence, validate with replay matrix, and lock in mitigations.',
    ].filter(Boolean);
    return lines.join(' ');
  }, [investigation, replayMatrix?.causalRanking, trace]);

  const askDirector = useCallback(
    (question: string) => {
      const q = question.toLowerCase();
      if (!trace) return 'No trace is loaded yet.';
      if (q.includes('bottleneck') || q.includes('slow')) {
        const bottleneck = [...trace.steps].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
        return bottleneck
          ? `The primary bottleneck is ${bottleneck.name} at ${bottleneck.durationMs ?? 0}ms. Prioritize this step for optimization and replay validation.`
          : 'No bottleneck could be determined from current trace data.';
      }
      if (q.includes('risk') || q.includes('failure') || q.includes('error')) {
        const failures = trace.steps.filter((step) => step.status === 'failed');
        return failures.length
          ? `Risk is concentrated in ${failures.length} failed step(s), starting at ${failures[0]?.name ?? 'unknown'}.`
          : 'Failure risk appears low for this run; no failed steps were observed.';
      }
      if (q.includes('cost')) {
        const cost = trace.metadata.totalCostUsd ?? 0;
        return `Recorded run cost is ${cost.toFixed(4)} USD. Use matrix scenarios to evaluate cheaper prompt/strategy options.`;
      }
      if (q.includes('next') || q.includes('action')) {
        return directorRecommendations.length
          ? `Next action: ${directorRecommendations[0]?.title ?? 'Open matrix'}.`
          : 'Next action: open Cinema mode, inspect bottleneck, then run the matrix.';
      }
      return directorNarrative;
    },
    [directorNarrative, directorRecommendations, trace]
  );

  const exportDirectorNarrative = useCallback(() => {
    if (!trace) return;
    const markdown = `# Director Narrative\n\n${directorNarrative}\n\n## Recommended Actions\n${directorRecommendations
      .map((item) => `- ${item.title}: ${item.body}`)
      .join('\n')}`;
    downloadText(`agent-director-narrative-${trace.id}.md`, markdown, 'text/markdown');
  }, [directorNarrative, directorRecommendations, trace]);

  const createHandoffDigest = useCallback(async () => {
    if (!trace) return;
    const topRecommendation = directorRecommendations[0];
    const failed = trace.steps.filter((step) => step.status === 'failed').length;
    const digestLines = [
      `Session handoff (${new Date().toISOString()})`,
      `Trace: ${trace.id}`,
      `Mode: ${mode}`,
      `Selected step: ${selectedStepId ?? 'none'}`,
      `Run health: ${runHealthScore}/100`,
      `Failures: ${failed}`,
      `Wall time: ${trace.metadata.wallTimeMs}ms`,
      `Top recommendation: ${topRecommendation ? `${topRecommendation.title} -> ${topRecommendation.actionLabel}` : 'None'}`,
      `Narrative: ${directorNarrative}`,
    ];
    const digest = digestLines.join('\n');
    try {
      await navigator.clipboard.writeText(digest);
      setHandoffStatus('Handoff digest copied');
    } catch {
      window.prompt('Copy handoff digest', digest);
      setHandoffStatus('Handoff digest ready');
    }
    window.setTimeout(() => setHandoffStatus(null), 2200);
  }, [directorNarrative, directorRecommendations, mode, runHealthScore, selectedStepId, trace]);

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
    const nextAnchor = selectedStepId && trace.steps.some((step) => step.id === selectedStepId)
      ? selectedStepId
      : trace.steps[0]?.id ?? '';
    setMatrixAnchorStepId((current) => (current && trace.steps.some((step) => step.id === current) ? current : nextAnchor));
  }, [trace, compareTrace, mode, selectedStepId, setMode, setWindowed, setOverlayEnabled]);

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
    if (playheadMs > 0) {
      setMissionProgress((prev) => (prev.playback ? prev : { ...prev, playback: true }));
    }
  }, [playheadMs, setMissionProgress]);

  useEffect(() => {
    if (mode === 'flow') {
      setMissionProgress((prev) => (prev.flow ? prev : { ...prev, flow: true }));
    }
    if (mode === 'matrix') {
      setMissionProgress((prev) => (prev.matrix ? prev : { ...prev, matrix: true }));
    }
  }, [mode, setMissionProgress]);

  useEffect(() => {
    if (selectedStepId) {
      setMissionProgress((prev) => (prev.inspect ? prev : { ...prev, inspect: true }));
    }
  }, [selectedStepId, setMissionProgress]);

  useEffect(() => {
    if (activeSessions > 1) {
      setMissionProgress((prev) => (prev.collaborate ? prev : { ...prev, collaborate: true }));
    }
  }, [activeSessions, setMissionProgress]);

  useEffect(() => {
    if (!syncPlayback || isPlaying || applyingRemoteCursorRef.current) return;
    const latest = remoteCursors[0];
    if (!latest || latest.traceId !== trace?.id) return;
    const drift = Math.abs(latest.playheadMs - playheadMs);
    const modeMismatch = latest.mode !== mode;
    const stepMismatch = (latest.selectedStepId ?? null) !== (selectedStepId ?? null);
    if (drift < 600 && !modeMismatch && !stepMismatch) return;

    applyingRemoteCursorRef.current = true;
    setPlayheadMs(latest.playheadMs);
    if (
      latest.mode === 'cinema' ||
      latest.mode === 'flow' ||
      latest.mode === 'compare' ||
      latest.mode === 'matrix' ||
      latest.mode === 'gameplay'
    ) {
      setMode(latest.mode);
    }
    setSelectedStepId(latest.selectedStepId ?? null);
    window.setTimeout(() => {
      applyingRemoteCursorRef.current = false;
    }, 180);
  }, [isPlaying, mode, playheadMs, remoteCursors, selectedStepId, setMode, syncPlayback, trace?.id]);

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
        if (tourOpen) {
          setTourOpen(false);
          setTourCompleted(true);
          return;
        }
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

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        if (mode !== 'cinema') setMode('cinema');
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        handleModeChange('gameplay');
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
    setTourCompleted,
    tourOpen,
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
  const isFilteringDeferred = query !== deferredQuery;
  const hydrationStatus = `${Math.min(textFilteredSteps.length, hydrationLimit)}/${textFilteredSteps.length}`;

  const commandActions = useMemo<CommandAction[]>(
    () => [
      {
        id: 'macro-rapid-triage',
        label: 'Run rapid triage launch path',
        description: 'Jump to the highest-risk step and start mitigation.',
        group: 'Macros',
        onTrigger: () => {
          void startLaunchPath('rapid_triage');
        },
      },
      {
        id: 'macro-deep-diagnosis',
        label: 'Run deep diagnosis launch path',
        description: 'Open flow analysis and guided tour.',
        group: 'Macros',
        onTrigger: () => {
          void startLaunchPath('deep_diagnosis');
        },
      },
      {
        id: 'macro-team-sync',
        label: 'Run team sync launch path',
        description: 'Enable sync mode and generate shareable context.',
        group: 'Macros',
        onTrigger: () => {
          void startLaunchPath('team_sync');
        },
      },
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
        id: 'mode-matrix',
        label: 'Open Matrix',
        description: 'Counterfactual replay matrix view.',
        group: 'Modes',
        onTrigger: () => handleModeChange('matrix'),
      },
      {
        id: 'mode-gameplay',
        label: 'Open Gameplay',
        description: 'World-class gameplay mechanics control center.',
        group: 'Modes',
        keys: 'G',
        onTrigger: () => handleModeChange('gameplay'),
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
      {
        id: 'handoff-digest',
        label: 'Copy handoff digest',
        description: 'Capture mode, risk summary, and next actions for teammates.',
        group: 'Meta',
        keys: 'H',
        onTrigger: () => {
          void createHandoffDigest();
        },
      },
    ],
    [
      createHandoffDigest,
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
      startLaunchPath,
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
    <div
      className={`app theme-${themeMode} ${explainMode ? 'explain-mode' : ''} ${
        mode === 'compare' ? 'mode-compare' : ''
      } ${mode === 'matrix' ? 'mode-matrix' : ''} ${mode === 'gameplay' ? 'mode-gameplay' : ''}`}
    >
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
        onShareSession={shareSession}
        onCreateHandoffDigest={() => void createHandoffDigest()}
        onThemeChange={setThemeMode}
        onMotionChange={setMotionMode}
        themeMode={themeMode}
        motionMode={motionMode}
        activeSessions={activeSessions}
        shareStatus={shareStatus}
        handoffStatus={handoffStatus}
        explainMode={explainMode}
        storyActive={storyActive}
        mode={mode}
        missionCompletion={missionCompletion}
        runHealthScore={runHealthScore}
        modeHotkeys={modeHotkeys}
      />
      {!introDismissed && !skipIntro ? (
        <IntroOverlay
          onComplete={() => setIntroDismissed(true)}
          onStartTour={() => {
            setIntroDismissed(true);
            setTourOpen(true);
          }}
          onStartStory={startStory}
          persona={introPersona}
          onPersonaChange={setIntroPersona}
          launchPath={launchPath}
          onLaunchPathChange={setLaunchPath}
          onStartLaunchPath={(path) => void startLaunchPath(path)}
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
        investigation={investigation}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          if (mode !== 'cinema') setMode('cinema');
        }}
        onJumpToError={jumpToError}
        onJumpToBottleneck={jumpToBottleneck}
      />

      <JourneyPanel
        trace={trace}
        mode={mode === 'matrix' || mode === 'gameplay' ? 'cinema' : mode}
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
        priorityQueue={journeyPriorityQueue}
      />

      <div
        className="toolbar"
        data-help
        data-help-indicator
        data-tour="toolbar"
        data-help-title="Search + filters"
        data-help-body="Filter by step type, enable Safe export, and jump between Cinema, Flow, Compare, and Matrix."
        data-help-placement="bottom"
      >
        <SearchBar query={query} typeFilter={typeFilter} onQueryChange={setQuery} onTypeFilterChange={setTypeFilter} />
        <div className="toolbar-actions">
          <input
            className="search-input"
            value={traceQuery}
            onChange={(event) => setTraceQuery(event.target.value)}
            placeholder='TraceQL (example: type=tool_call and duration_ms>800)'
            aria-label="TraceQL query"
          />
          <button className="ghost-button" type="button" onClick={() => void handleTraceQuery()}>
            Run TraceQL
          </button>
          {traceQueryResult ? <span className="status-badge">{traceQueryResult.matchCount} match(es)</span> : null}
          {isFilteringDeferred ? <span className="status-badge">Filtering...</span> : null}
          <span className="status-badge">Hydration {hydrationStatus}</span>
          <span className="status-badge">Filter {filterComputeMs}ms</span>
          {traceQueryResult ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setTraceQuery('');
                setTraceQueryResult(null);
                setTraceQueryError(null);
              }}
            >
              Clear TraceQL
            </button>
          ) : null}
          {traceQueryError ? <span className="status-badge warn">{traceQueryError}</span> : null}
          <select
            className="search-select"
            value={selectedExtensionId}
            onChange={(event) => setSelectedExtensionId(event.target.value)}
            aria-label="Extension selector"
          >
            <option value="">Select extension</option>
            {extensions.map((extension) => (
              <option key={extension.id} value={extension.id}>
                {extension.name}
              </option>
            ))}
          </select>
          <button
            className="ghost-button"
            type="button"
            onClick={() => void handleRunExtension()}
            disabled={!trace || !selectedExtensionId || extensionRunning}
          >
            {extensionRunning ? 'Running extension...' : 'Run extension'}
          </button>
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
          <button
            className={`ghost-button ${mode === 'matrix' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'matrix'}
            title="Counterfactual replay matrix"
            onClick={() => handleModeChange('matrix')}
            data-help
            data-help-title="Matrix mode"
            data-help-body="Run multiple replay scenarios and rank likely causal factors."
            data-help-placement="bottom"
          >
            Matrix
          </button>
          <button
            className={`ghost-button ${mode === 'gameplay' ? 'active' : ''}`}
            type="button"
            aria-pressed={mode === 'gameplay'}
            title="Gameplay mechanics command center"
            onClick={() => handleModeChange('gameplay')}
            data-help
            data-help-title="Gameplay mode"
            data-help-body="Command raids, campaign, pvp, time forks, boss runs, economy, and liveops."
            data-help-placement="bottom"
          >
            Gameplay
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
          <label
            className="toggle"
            title="Follow active collaborator cursor and mode updates"
          >
            <input
              type="checkbox"
              checked={syncPlayback}
              onChange={() => setSyncPlayback((prev) => !prev)}
            />
            Sync playback
          </label>
        </div>
      </div>

      {extensionOutput ? (
        <div className="inspector-section">
          <div className="inspector-section-title">Extension output</div>
          <pre className="inspector-json">{JSON.stringify(extensionOutput, null, 2)}</pre>
        </div>
      ) : null}

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
              persistenceKey={trace.id}
              laneStrategy={laneStrategy}
              visibleLaneGroups={visibleLaneGroups}
              remotePlayheads={remotePlayheads}
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

      <main className={`stage ${mode === 'compare' ? 'stage-compare' : ''} motion-fade-in`} role="main">
        <div
          className="main motion-slide-up"
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
                  laneStrategy={laneStrategy}
                  laneGroupsOrder={laneConfig.order}
                  hiddenLaneGroups={laneConfig.hidden}
                  onLaneStrategyChange={handleLaneStrategyChange}
                  onToggleLaneGroupVisibility={toggleLaneGroupVisibility}
                  onMoveLaneGroup={moveLaneGroup}
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
              {mode === 'matrix' ? (
                <Matrix
                  steps={trace.steps}
                  anchorStepId={matrixAnchorStepId}
                  onAnchorStepChange={setMatrixAnchorStepId}
                  scenarios={matrixScenarios}
                  onScenarioChange={updateMatrixScenario}
                  onDuplicateScenario={duplicateMatrixScenario}
                  onMoveScenario={moveMatrixScenario}
                  onAddScenario={addMatrixScenario}
                  onRemoveScenario={removeMatrixScenario}
                  onRun={runReplayMatrix}
                  onCancel={cancelMatrixRun}
                  onReplaceScenarios={replaceMatrixScenarios}
                  loading={matrixLoading}
                  error={matrixError}
                  job={replayJob}
                  matrix={replayMatrix}
                  safeExport={safeExport}
                  onOpenCompare={openMatrixCompare}
                />
              ) : null}
              {mode === 'gameplay' ? (
                <GameplayMode
                  state={gameplayState}
                  playheadMs={playheadMs}
                  onUpdate={(updater) => setGameplayState((prev) => updater(prev))}
                  session={gameplaySession}
                  playerId={gameplayPlayerId}
                  sessionError={gameplaySessionError}
                  onCreateSession={handleCreateGameplaySession}
                  onJoinSession={handleJoinGameplaySession}
                  onLeaveSession={handleLeaveGameplaySession}
                  onDispatchAction={handleGameplayAction}
                  guild={gameplayGuild}
                  onCreateGuild={handleCreateGameplayGuild}
                  onJoinGuild={handleJoinGameplayGuild}
                  onScheduleGuildEvent={handleScheduleGameplayGuildEvent}
                  onCompleteGuildEvent={handleCompleteGameplayGuildEvent}
                />
              ) : null}
            </Suspense>
          </MorphOrchestrator>
        </div>

        <Suspense fallback={<div className="loading">Loading panel...</div>}>
          {mode === 'compare' || mode === 'matrix' || mode === 'gameplay' ? null : selectedStep ? (
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
              recommendations={directorRecommendations}
              persona={introPersona}
              annotations={currentTraceAnnotations}
              activityFeed={activityFeed}
              onAddAnnotation={addSharedAnnotation}
              missionProgress={missionProgress}
              missionCompletion={missionCompletion}
              onResetMissions={resetMissions}
              narrative={directorNarrative}
              onAskDirector={askDirector}
              onExportNarrative={exportDirectorNarrative}
            />
          )}
        </Suspense>
      </main>
      <div className="mobile-quick-rail" aria-label="Mobile quick actions">
        <button
          className={`ghost-button ${storyActive ? 'active' : ''}`}
          type="button"
          onClick={toggleStory}
          aria-label={storyActive ? 'Stop story mode' : 'Start story mode'}
        >
          {storyActive ? 'Stop Story' : 'Story'}
        </button>
        <button className="ghost-button" type="button" onClick={() => setTourOpen(true)} aria-label="Start guided tour">
          Guide
        </button>
        <button className="ghost-button" type="button" onClick={() => setShowPalette(true)} aria-label="Open command palette">
          Command
        </button>
        <button className="ghost-button" type="button" onClick={() => void createHandoffDigest()} aria-label="Copy handoff digest">
          Handoff
        </button>
      </div>
      <QuickActions
        mode={mode === 'matrix' || mode === 'gameplay' ? 'cinema' : mode}
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
