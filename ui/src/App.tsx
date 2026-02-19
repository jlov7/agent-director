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
import AppShellState from './components/common/AppShellState';
import NotificationCenter, {
  type AppNotification,
  type NotificationLevel,
} from './components/common/NotificationCenter';
import type { MatrixScenarioDraft } from './components/Matrix';
import MorphOrchestrator from './components/Morph/MorphOrchestrator';
import { useTrace } from './hooks/useTrace';
import type {
  ExtensionDefinition,
  GameplayAnalyticsFunnelSummary,
  GameplayGuild,
  GameplayObservabilitySummary,
  GameplaySocialGraph,
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
  reconnectGameplaySession,
  fetchGameplayAnalyticsFunnels,
  fetchGameplaySocialGraph,
  fetchInvestigation,
  fetchGameplayObservabilitySummary,
  getGameplaySession,
  fetchReplayJob,
  fetchReplayMatrix,
  fetchTrace as fetchTraceById,
  joinGameplaySession,
  matchmakeGameplaySession,
  leaveGameplaySession,
  inviteGameplayFriend,
  acceptGameplayFriendInvite,
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
import { recordGameplayFunnelEvent } from './utils/gameplayFunnel';
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
import type { GameplayLocale } from './utils/gameplayI18n';
import { APP_LOCALE_OPTIONS, appLabel, normalizeAppLocale, type AppLocale } from './utils/appI18n';
import { buildUrlAppState, parseUrlAppState } from './utils/urlState';
import { buildLikelyStepPrefetchList, deriveLikelyMode } from './utils/prefetchPolicy';
import {
  appendProductEvent,
  captureSupportDiagnostics,
  DEFAULT_FEATURE_FLAGS,
  mergeAsyncAction,
  readFeatureFlags,
  validateSetupWizardDraft,
  writeFeatureFlags,
  type AsyncActionRecord,
  type FeatureFlags,
  type ProductEventName,
  type SetupWizardDraft,
} from './utils/saasUx';
import { computeTimeToFirstSuccessMs, pruneToWindow, shouldTriggerRageClick } from './utils/usabilitySignals';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  normalizeShortcutBindings,
  REMAPPABLE_SHORTCUTS,
  setShortcutBinding,
  SHORTCUT_KEY_OPTIONS,
  type ShortcutBindings,
} from './utils/shortcutBindings';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const PRESENCE_STORAGE_KEY = 'agentDirector.presence.v1';
const PRESENCE_TTL_MS = 20000;
const PRESENCE_HEARTBEAT_MS = 5000;
const COLLAB_CURSOR_STORAGE_KEY = 'agentDirector.collab.cursors.v1';
const COLLAB_ANNOTATION_STORAGE_KEY = 'agentDirector.collab.annotations.v1';
const COLLAB_ACTIVITY_STORAGE_KEY = 'agentDirector.collab.activity.v1';
const NOTIFICATION_TTL_MS = 6000;
const GLOBAL_KILL_SWITCH = import.meta.env.VITE_GLOBAL_KILL_SWITCH === '1';
const RAGE_CLICK_WINDOW_MS = 1600;
const RAGE_CLICK_THRESHOLD = 4;
const STUCK_SIGNAL_COOLDOWN_MS = 20000;
const DEAD_END_WINDOW_MS = 120000;
const DEAD_END_THRESHOLD = 3;

type Mode = 'cinema' | 'flow' | 'compare' | 'matrix' | 'gameplay';
type IntroPersona = 'builder' | 'executive' | 'operator';
type ThemeMode = 'studio' | 'focus' | 'contrast';
type MotionMode = 'cinematic' | 'balanced' | 'minimal';
type DensityMode = 'auto' | 'comfortable' | 'compact';
type LaunchPath = 'rapid_triage' | 'deep_diagnosis' | 'team_sync';
type RecommendationTone = 'priority' | 'warning' | 'info';
type SaaSRole = 'viewer' | 'operator' | 'admin';
type WorkspaceSection = 'journey' | 'analysis' | 'collaboration' | 'operations';
type SetupWizardStep = 'source' | 'import' | 'invite';
type ExportTaskStatus = 'queued' | 'running' | 'success' | 'error';

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

type WorkspaceOption = { id: string; label: string };
type SavedView = {
  id: string;
  name: string;
  state: {
    mode: Mode;
    query: string;
    typeFilter: StepType | 'all';
    selectedStepId: string | null;
    safeExport: boolean;
    windowed: boolean;
    syncPlayback: boolean;
    explainMode: boolean;
    section: WorkspaceSection;
  };
};
type ExportTask = {
  id: string;
  label: string;
  status: ExportTaskStatus;
  detail: string;
  updatedAt: number;
  retryable: boolean;
};
type StuckSignalKind = 'rage_click' | 'dead_end_actions';
type StuckSignal = {
  id: string;
  kind: StuckSignalKind;
  detail: string;
  at: number;
};

const WORKSPACE_SECTION_COPY: Record<WorkspaceSection, { title: string; description: string }> = {
  journey: {
    title: 'Understand this run',
    description: 'Track progression and save the exact view you need to return to quickly.',
  },
  analysis: {
    title: 'Diagnose root cause',
    description: 'Run exports and async diagnostics to isolate what changed and why.',
  },
  collaboration: {
    title: 'Coordinate responders',
    description: 'Set ownership, create handoffs, and keep the team aligned in real time.',
  },
  operations: {
    title: 'Configure workspace',
    description: 'Manage setup, support access, and release-safe feature controls.',
  },
};

const MODE_ORIENTATION_COPY: Record<Mode, string> = {
  cinema: 'Timeline playback',
  flow: 'Flow graph',
  compare: 'Compare runs',
  matrix: 'Scenario matrix',
  gameplay: 'Gameplay command',
};

const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'operations', label: 'Operations' },
  { id: 'executive', label: 'Executive' },
];

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
        missionSeed:
          session.campaign.current_mission.mission_seed ??
          fallback.campaign.currentMission.missionSeed ??
          session.seed,
        blueprint:
          session.campaign.current_mission.blueprint ??
          fallback.campaign.currentMission.blueprint ??
          `seed=${session.seed};depth=${session.campaign.depth}`,
        templateId: session.campaign.current_mission.template_id ?? fallback.campaign.currentMission.templateId,
        archetype: session.campaign.current_mission.archetype ?? fallback.campaign.currentMission.archetype,
        qualityScore: session.campaign.current_mission.quality_score ?? fallback.campaign.currentMission.qualityScore,
        noveltyScore: session.campaign.current_mission.novelty_score ?? fallback.campaign.currentMission.noveltyScore,
        repetitionPenalty:
          session.campaign.current_mission.repetition_penalty ?? fallback.campaign.currentMission.repetitionPenalty,
        launchPackSize: session.campaign.current_mission.launch_pack_size ?? fallback.campaign.currentMission.launchPackSize,
      },
      completedMissionIds: session.campaign.completed_missions,
      missionHistory:
        session.campaign.mission_history?.map((entry) => ({
          missionId: entry.mission_id,
          templateId: entry.template_id ?? 'legacy-template',
          archetype: entry.archetype ?? 'legacy',
          hazards: entry.hazards ?? [],
          qualityScore: entry.quality_score ?? 50,
          noveltyScore: entry.novelty_score ?? 50,
          repetitionPenalty: entry.repetition_penalty ?? 0,
          outcome: entry.outcome === 'success' || entry.outcome === 'failure' ? entry.outcome : 'unknown',
        })) ?? fallback.campaign.missionHistory,
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
        slotCaps: fallback.skills.loadout.slotCaps,
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
      phaseMechanic:
        session.boss.phase_mechanic ??
        (session.boss.phase === 1
          ? 'Phase 1: Shield lattice destabilization'
          : session.boss.phase === 2
            ? 'Phase 2: Mirror clones absorb exploit damage'
            : 'Phase 3: Enrage pulse; shield counters become lethal'),
      vulnerability:
        session.boss.vulnerability === 'strike' || session.boss.vulnerability === 'shield' || session.boss.vulnerability === 'exploit'
          ? session.boss.vulnerability
          : session.boss.phase === 1
            ? 'exploit'
            : session.boss.phase === 2
              ? 'strike'
              : 'shield',
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
      reserveTarget: session.economy.policy?.target_reserve ?? fallback.economy.reserveTarget ?? 320,
      inflationIndex:
        session.economy.inflation_index ??
        Number(
          (
            session.economy.tokens /
            (session.economy.policy?.target_reserve ?? fallback.economy.reserveTarget ?? 320)
          ).toFixed(3)
        ),
    },
    rewards: {
      dailyClaimedOn: session.rewards?.daily_claimed_date ?? fallback.rewards?.dailyClaimedOn ?? null,
      streakDays: session.rewards?.streak_days ?? fallback.rewards?.streakDays ?? 0,
      sessionClaimed: session.rewards?.session_claimed ?? fallback.rewards?.sessionClaimed ?? false,
      streakClaimedFor: session.rewards?.streak_claimed_for ?? fallback.rewards?.streakClaimedFor ?? 0,
      masteryClaims: session.rewards?.mastery_claims ?? fallback.rewards?.masteryClaims ?? [],
      history:
        session.rewards?.history?.map((entry) => ({
          id: entry.id,
          kind:
            entry.kind === 'daily' || entry.kind === 'session' || entry.kind === 'streak' || entry.kind === 'mastery'
              ? entry.kind
              : 'daily',
          amount: entry.amount,
          at: Date.parse(entry.at) || Date.now(),
          details: entry.details ? Object.fromEntries(Object.entries(entry.details).map(([key, value]) => [key, String(value)])) : {},
        })) ?? fallback.rewards?.history ?? [],
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
      difficultyFactor: session.liveops.telemetry.difficultyFactor ?? fallback.liveops.difficultyFactor ?? 1,
      rewardMultiplier: session.liveops.telemetry.rewardMultiplier ?? fallback.liveops.rewardMultiplier ?? 1,
      tuningHistory:
        session.liveops.tuning_history?.map((entry) => ({
          id: entry.id,
          changedAt: Date.parse(entry.changed_at) || Date.now(),
          difficultyFactor: entry.difficultyFactor,
          rewardMultiplier: entry.rewardMultiplier,
          note: entry.note,
        })) ?? fallback.liveops.tuningHistory ?? [],
    },
    teamComms: {
      pings:
        session.team_comms?.pings?.map((ping) => ({
          id: ping.id,
          fromPlayerId: ping.from_player_id,
          intent:
            ping.intent === 'focus' || ping.intent === 'assist' || ping.intent === 'defend' || ping.intent === 'rotate'
              ? ping.intent
              : 'focus',
          targetObjectiveId: ping.target_objective_id ?? null,
          createdAt: Date.parse(ping.created_at) || Date.now(),
        })) ?? fallback.teamComms.pings ?? [],
    },
    safety: {
      mutedPlayerIds: session.safety?.muted_player_ids ?? fallback.safety.mutedPlayerIds ?? [],
      blockedPlayerIds: session.safety?.blocked_player_ids ?? fallback.safety.blockedPlayerIds ?? [],
      reports:
        session.safety?.reports?.map((report) => ({
          id: report.id,
          targetPlayerId: report.target_player_id,
          reason: report.reason,
          createdAt: Date.parse(report.created_at) || Date.now(),
        })) ?? fallback.safety.reports ?? [],
    },
    outcome:
      session.status === 'completed'
        ? {
            status: session.telemetry.successes >= session.telemetry.failures ? 'win' : 'loss',
            reason:
              session.telemetry.successes >= session.telemetry.failures
                ? 'Session completed with positive outcomes.'
                : 'Session completed with unresolved failures.',
            updatedAt: Date.now(),
          }
        : session.telemetry.failures > 0
          ? {
              status: 'partial',
              reason: `${session.telemetry.failures} failure signals observed; run still active.`,
              updatedAt: Date.now(),
            }
          : fallback.outcome ?? {
              status: 'in_progress',
              reason: 'Run in progress.',
              updatedAt: Date.now(),
            },
    sandbox: { enabled: session.sandbox?.enabled ?? fallback.sandbox?.enabled ?? false },
    progression: {
      xp: profile?.xp ?? fallback.progression?.xp ?? 0,
      level: profile?.level ?? fallback.progression?.level ?? 1,
      nextLevelXp: (profile?.level ?? fallback.progression?.level ?? 1) * 200,
      milestones: profile?.milestones ?? fallback.progression?.milestones ?? [],
    },
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
  const [activeSection, setActiveSection] = usePersistedState<WorkspaceSection>(
    'agentDirector.workspaceSection.v1',
    'journey'
  );
  const [workspaceActionsOpen, setWorkspaceActionsOpen] = useState(false);
  const [workspacePanelOpen, setWorkspacePanelOpen] = usePersistedState(
    'agentDirector.workspacePanelOpen.v1',
    false
  );
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [typeFilter, setTypeFilter] = useState<StepType | 'all'>('all');
  const [traceQuery, setTraceQuery] = useState('');
  const [traceQueryResult, setTraceQueryResult] = useState<TraceQueryResult | null>(null);
  const [traceQueryError, setTraceQueryError] = useState<string | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = usePersistedState('agentDirector.toolbarAdvanced.v1', false);
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
  const [densityMode, setDensityMode] = usePersistedState<DensityMode>('agentDirector.densityMode.v1', 'auto');
  const [viewportWidth, setViewportWidth] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth);
  const [workspaceId, setWorkspaceId] = usePersistedState('agentDirector.workspaceId.v1', WORKSPACE_OPTIONS[0].id);
  const [workspaceRole, setWorkspaceRole] = usePersistedState<SaaSRole>('agentDirector.workspaceRole.v1', 'operator');
  const [sessionExpiresAt, setSessionExpiresAt] = usePersistedState(
    'agentDirector.sessionExpiresAt.v1',
    Date.now() + 1000 * 60 * 60 * 4
  );
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
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [setupWizardStep, setSetupWizardStep] = useState<SetupWizardStep>('source');
  const [setupWizardDraft, setSetupWizardDraft] = usePersistedState<SetupWizardDraft>(
    'agentDirector.setupWizardDraft.v1',
    { dataSource: '', importPath: '', inviteEmails: '' }
  );
  const [setupWizardComplete, setSetupWizardComplete] = usePersistedState(
    'agentDirector.setupWizardComplete.v1',
    false
  );
  const [setupWizardPrompted, setSetupWizardPrompted] = usePersistedState(
    'agentDirector.setupWizardPrompted.v1',
    false
  );
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
  const [gameplaySocial, setGameplaySocial] = useState<GameplaySocialGraph | null>(null);
  const [appLocale, setAppLocale] = usePersistedState<AppLocale>('agentDirector.locale.v1', 'en');
  const [gameplayLocale, setGameplayLocale] = usePersistedState<GameplayLocale>('agentDirector.gameplayLocale.v1', 'en');
  const [gamepadEnabled, setGamepadEnabled] = usePersistedState('agentDirector.gamepad.enabled.v1', true);
  const [gamepadPreset, setGamepadPreset] = usePersistedState<'standard' | 'lefty'>(
    'agentDirector.gamepad.preset.v1',
    'standard'
  );
  const [shortcutBindings, setShortcutBindings] = usePersistedState<ShortcutBindings>(
    'agentDirector.shortcuts.bindings.v1',
    DEFAULT_SHORTCUT_BINDINGS
  );
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [gameplayObservability, setGameplayObservability] = useState<GameplayObservabilitySummary | null>(null);
  const [gameplayAnalytics, setGameplayAnalytics] = useState<GameplayAnalyticsFunnelSummary | null>(null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<AppNotification & { expiresAt: number }>>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [asyncActions, setAsyncActions] = useState<AsyncActionRecord[]>([]);
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
  const [savedViews, setSavedViews] = usePersistedState<SavedView[]>('agentDirector.savedViews.v1', []);
  const [savedViewName, setSavedViewName] = useState('');
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string>('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportNote, setSupportNote] = useState('');
  const [timeToFirstSuccessMs, setTimeToFirstSuccessMs] = useState<number | null>(null);
  const [stuckSignals, setStuckSignals] = useState<StuckSignal[]>([]);
  const [runOwner, setRunOwner] = usePersistedState('agentDirector.runOwner.v1', 'on-call-operator');
  const [handoffOwner, setHandoffOwner] = usePersistedState('agentDirector.handoffOwner.v1', '');
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [pendingConfirm, setPendingConfirm] = useState<null | { id: string; title: string; message: string }>(null);
  const [undoState, setUndoState] = useState<null | { id: string; label: string }>(null);
  const [sessionCursors, setSessionCursors] = useState<Record<string, SessionCursor>>({});
  const [sharedAnnotations, setSharedAnnotations] = useState<SharedAnnotation[]>([]);

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [hydrationLimit, setHydrationLimit] = useState(800);
  const [filterComputeMs, setFilterComputeMs] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceActionsRef = useRef<HTMLDivElement>(null);
  const compareTraceRef = useRef<TraceSummary | null>(null);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const lastCursorWriteRef = useRef(0);
  const lastNotificationAnnouncementRef = useRef<string | null>(null);
  const asyncActionAnnouncementRef = useRef<Record<string, string>>({});
  const filterMeasureRef = useRef(0);
  const applyingRemoteCursorRef = useRef(false);
  const gameplayFunnelFlagsRef = useRef<Record<string, boolean>>({});
  const gamepadPressedRef = useRef<Record<string, boolean>>({});
  const sessionStartedAtRef = useRef(Date.now());
  const firstSuccessTrackedRef = useRef(false);
  const clickBurstMapRef = useRef<Record<string, number[]>>({});
  const deadEndErrorTimestampsRef = useRef<number[]>([]);
  const stuckSignalCooldownRef = useRef<Record<string, number>>({});
  const asyncActionHandlersRef = useRef<Record<string, () => void>>({});
  const asyncActionResumeHandlersRef = useRef<Record<string, () => void>>({});
  const exportRetryHandlersRef = useRef<Record<string, () => void>>({});
  const confirmHandlersRef = useRef<Record<string, () => void>>({});
  const undoHandlersRef = useRef<Record<string, () => void>>({});
  const smartPrefetchSignatureRef = useRef<string>('');
  const initialUrlStateRef = useRef(
    typeof window === 'undefined' ? parseUrlAppState('') : parseUrlAppState(window.location.search)
  );
  const urlStateAppliedRef = useRef(false);
  const normalizedShortcutBindings = useMemo(
    () => normalizeShortcutBindings(shortcutBindings),
    [shortcutBindings]
  );
  const normalizedAppLocale = useMemo(() => normalizeAppLocale(appLocale), [appLocale]);
  const t = useCallback((key: Parameters<typeof appLabel>[1]) => appLabel(normalizedAppLocale, key), [normalizedAppLocale]);

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
  const likelyPrefetchMode = useMemo(
    () => deriveLikelyMode(activeSection, mode, Boolean(compareTrace)),
    [activeSection, mode, compareTrace]
  );
  const likelyPrefetchStepIds = useMemo(
    () => buildLikelyStepPrefetchList(trace?.steps ?? [], selectedStepId),
    [trace?.steps, selectedStepId]
  );
  const likelyPrefetchStepKey = useMemo(() => likelyPrefetchStepIds.join('|'), [likelyPrefetchStepIds]);
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
  const sessionState = useMemo(() => {
    const remainingMs = sessionExpiresAt - Date.now();
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
    return {
      expired: remainingMs <= 0,
      remainingMinutes,
      label: remainingMs <= 0 ? 'Expired' : `${remainingMinutes}m left`,
    };
  }, [sessionExpiresAt]);
  const setupValidation = useMemo(() => validateSetupWizardDraft(setupWizardDraft), [setupWizardDraft]);
  const savedViewNameError = useMemo(() => {
    if (!savedViewName.trim()) return 'Saved view name is required.';
    const exists = savedViews.some((view) => view.name.toLowerCase() === savedViewName.trim().toLowerCase());
    return exists ? 'Saved view name already exists.' : null;
  }, [savedViewName, savedViews]);
  const supportDiagnostics = useMemo(
    () =>
      captureSupportDiagnostics({
        trace,
        selectedStepId,
        mode,
        workspaceId,
        workspaceRole,
        safeExport,
        notifications: notifications.map((item) => ({ message: item.message, level: item.level })),
        actions: asyncActions,
        stepCount: trace?.steps.length ?? 0,
        timeToFirstSuccessMs,
        stuckSignals: stuckSignals.map((signal) => ({ kind: signal.kind, detail: signal.detail, at: signal.at })),
      }),
    [asyncActions, mode, notifications, safeExport, selectedStepId, stuckSignals, timeToFirstSuccessMs, trace, workspaceId, workspaceRole]
  );
  const addNotification = useCallback((message: string, level: NotificationLevel = 'info') => {
    const normalized = message.trim();
    if (!normalized) return;
    const now = Date.now();
    setNotifications((prev) => {
      if (prev.some((item) => item.message === normalized && item.level === level)) return prev;
      const next = [...prev, { id: `notif-${now}-${Math.random().toString(36).slice(2, 8)}`, message: normalized, level, expiresAt: now + NOTIFICATION_TTL_MS }];
      return next.slice(-6);
    });
  }, []);
  const trackProductEvent = useCallback((name: ProductEventName, metadata: Record<string, unknown> = {}) => {
    try {
      appendProductEvent(window.localStorage, {
        name,
        at: new Date().toISOString(),
        metadata,
      });
    } catch {
      // Non-blocking analytics queue.
    }
  }, []);
  const registerStuckSignal = useCallback(
    (kind: StuckSignalKind, detail: string, metadata: Record<string, unknown> = {}) => {
      const now = Date.now();
      const key = `${kind}:${String(metadata.target ?? 'global')}`;
      const lastRaisedAt = stuckSignalCooldownRef.current[key] ?? 0;
      if (now - lastRaisedAt < STUCK_SIGNAL_COOLDOWN_MS) return;
      stuckSignalCooldownRef.current[key] = now;
      setStuckSignals((prev) =>
        [{ id: `stuck-${now}-${Math.random().toString(36).slice(2, 8)}`, kind, detail, at: now }, ...prev].slice(0, 8)
      );
      addNotification('Looks like you might be stuck. Use Need help now for guided recovery.', 'warning');
      trackProductEvent('ux.error.window', { signal: kind, detail, ...metadata });
    },
    [addNotification, trackProductEvent]
  );
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      const actionable = target.closest<HTMLElement>('button, a, [role="button"]');
      if (!actionable) return;
      const rawLabel =
        actionable.getAttribute('aria-label') ??
        actionable.getAttribute('data-help-title') ??
        actionable.textContent ??
        '';
      const label = rawLabel.trim().replace(/\s+/g, ' ').slice(0, 60).toLowerCase();
      if (!label) return;
      const now = Date.now();
      const key = `click:${label}`;
      const previous = clickBurstMapRef.current[key] ?? [];
      const next = [...pruneToWindow(previous, now, RAGE_CLICK_WINDOW_MS), now];
      clickBurstMapRef.current[key] = next;
      if (shouldTriggerRageClick(next, RAGE_CLICK_THRESHOLD)) {
        registerStuckSignal('rage_click', `Rapid repeated clicks on "${label}".`, { target: label, count: next.length });
      }
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [registerStuckSignal]);
  useEffect(() => {
    const latest = notifications[notifications.length - 1];
    if (!latest) return;
    const now = Date.now();
    if (!firstSuccessTrackedRef.current && latest.level === 'success') {
      const elapsedMs = computeTimeToFirstSuccessMs(sessionStartedAtRef.current, now);
      firstSuccessTrackedRef.current = true;
      setTimeToFirstSuccessMs(elapsedMs);
      trackProductEvent('ux.action.confirmed', {
        source: 'time_to_first_success',
        elapsedMs,
        message: latest.message,
      });
    }
    if (latest.level === 'error') {
      const next = [...pruneToWindow(deadEndErrorTimestampsRef.current, now, DEAD_END_WINDOW_MS), now];
      deadEndErrorTimestampsRef.current = next;
      if (next.length >= DEAD_END_THRESHOLD) {
        registerStuckSignal('dead_end_actions', 'Multiple error outcomes detected in a short period.', { count: next.length });
      }
    }
  }, [notifications, registerStuckSignal, trackProductEvent]);
  const setAsyncAction = useCallback(
    (next: Omit<AsyncActionRecord, 'updatedAt'> & { updatedAt?: number }) => {
      setAsyncActions((prev) => mergeAsyncAction(prev, next));
    },
    []
  );
  const runExportTask = useCallback(
    async (task: { id: string; label: string; run: () => void }) => {
      exportRetryHandlersRef.current[task.id] = () => {
        void runExportTask(task);
      };
      setExportTasks((prev) => {
        const existing = prev.find((item) => item.id === task.id);
        const next: ExportTask = {
          id: task.id,
          label: task.label,
          status: 'running',
          detail: 'Running',
          updatedAt: Date.now(),
          retryable: false,
        };
        if (!existing) return [next, ...prev].slice(0, 8);
        return [next, ...prev.filter((item) => item.id !== task.id)].slice(0, 8);
      });
      trackProductEvent('ux.export.queued', { taskId: task.id, label: task.label });
      try {
        task.run();
        setExportTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: 'success',
                  detail: 'Completed',
                  updatedAt: Date.now(),
                  retryable: false,
                }
              : item
          )
        );
        trackProductEvent('ux.export.completed', { taskId: task.id, label: task.label });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Export failed';
        setExportTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: 'error',
                  detail,
                  updatedAt: Date.now(),
                  retryable: true,
                }
              : item
          )
        );
        addNotification(`Export failed: ${task.label}`, 'error');
        trackProductEvent('ux.export.failed', { taskId: task.id, label: task.label, detail });
      }
    },
    [addNotification, trackProductEvent]
  );
  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    const id = `confirm-${Math.random().toString(36).slice(2, 9)}`;
    confirmHandlersRef.current[id] = onConfirm;
    setPendingConfirm({ id, title, message });
  }, []);
  const pushUndo = useCallback((label: string, onUndo: () => void) => {
    const id = `undo-${Math.random().toString(36).slice(2, 9)}`;
    undoHandlersRef.current[id] = onUndo;
    setUndoState({ id, label });
  }, []);
  const canMutate = workspaceRole !== 'viewer' && !sessionState.expired;
  const requireMutationAccess = useCallback(
    (intent: string) => {
      if (canMutate) return true;
      if (sessionState.expired) {
        addNotification(`Session expired. Renew session to ${intent}.`, 'warning');
      } else {
        addNotification(`Viewer role cannot ${intent}. Switch role to operator or admin.`, 'warning');
      }
      return false;
    },
    [addNotification, canMutate, sessionState.expired]
  );
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const renewSession = useCallback(() => {
    setSessionExpiresAt(Date.now() + 1000 * 60 * 60 * 4);
    addNotification('Session renewed for 4 hours.', 'success');
  }, [addNotification, setSessionExpiresAt]);

  useEffect(() => {
    setFeatureFlags(readFeatureFlags(window.localStorage));
  }, []);

  useEffect(() => {
    if (!featureFlags.setupWizardV1) return;
    if (window.localStorage.getItem('agentDirector.setupWizardAuto') !== '1') return;
    if (!introDismissed || setupWizardComplete || setupWizardOpen || setupWizardPrompted) return;
    setSetupWizardOpen(true);
    setSetupWizardPrompted(true);
    trackProductEvent('ux.setup.opened', { source: 'auto' });
  }, [
    featureFlags.setupWizardV1,
    introDismissed,
    setSetupWizardPrompted,
    setupWizardComplete,
    setupWizardOpen,
    setupWizardPrompted,
    trackProductEvent,
  ]);

  useEffect(() => {
    if (!undoState) return;
    const timeout = window.setTimeout(() => {
      setUndoState(null);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [undoState]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackProductEvent('ux.error.window', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'unknown');
      trackProductEvent('ux.error.window', { kind: 'unhandledrejection', reason });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [trackProductEvent]);

  useEffect(() => {
    if (urlStateAppliedRef.current) return;
    const initialState = initialUrlStateRef.current;
    if (!initialState.mode && !initialState.traceId && !initialState.stepId) {
      urlStateAppliedRef.current = true;
      return;
    }
    if (initialState.mode && initialState.mode !== mode) {
      setMode(initialState.mode);
    }
    if (initialState.traceId) {
      const traceExists = traces.some((item) => item.id === initialState.traceId);
      if (!traceExists) return;
      if (selectedTraceId !== initialState.traceId) {
        setSelectedTraceId(initialState.traceId);
        return;
      }
    }
    if (initialState.stepId && trace?.steps.some((step) => step.id === initialState.stepId)) {
      if (selectedStepId !== initialState.stepId) {
        setSelectedStepId(initialState.stepId);
      }
    }
    urlStateAppliedRef.current = true;
  }, [mode, selectedStepId, selectedTraceId, setMode, setSelectedTraceId, trace?.steps, traces]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextHref = buildUrlAppState(window.location.href, {
      mode,
      traceId: selectedTraceId ?? undefined,
      stepId: selectedStepId ?? undefined,
    });
    if (nextHref !== window.location.href) {
      window.history.replaceState(null, '', nextHref);
    }
  }, [mode, selectedStepId, selectedTraceId]);

  useEffect(() => {
    if (!notifications.length) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNotifications((prev) => prev.filter((item) => item.expiresAt > now));
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [notifications.length]);

  useEffect(() => {
    if (!workspaceActionsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (workspaceActionsRef.current?.contains(event.target as Node)) return;
      setWorkspaceActionsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWorkspaceActionsOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [workspaceActionsOpen]);

  useEffect(() => {
    setWorkspaceActionsOpen(false);
  }, [activeSection, mode]);

  useEffect(() => {
    const latest = notifications[notifications.length - 1];
    if (!latest) return;
    if (latest.id === lastNotificationAnnouncementRef.current) return;
    lastNotificationAnnouncementRef.current = latest.id;
    setLiveAnnouncement(latest.message);
  }, [notifications]);

  useEffect(() => {
    const latestAction = asyncActions[0];
    if (!latestAction) return;
    const previousStatus = asyncActionAnnouncementRef.current[latestAction.id];
    if (previousStatus === latestAction.status) return;
    asyncActionAnnouncementRef.current[latestAction.id] = latestAction.status;
    const detail = latestAction.detail?.trim();
    const statusLabel = latestAction.status === 'running' ? 'running' : latestAction.status;
    setLiveAnnouncement(detail ? `${latestAction.label}: ${statusLabel}. ${detail}` : `${latestAction.label}: ${statusLabel}.`);
  }, [asyncActions]);

  useEffect(() => {
    if (shareStatus) addNotification(shareStatus, 'success');
  }, [addNotification, shareStatus]);

  useEffect(() => {
    if (!showPalette) return;
    trackProductEvent('ux.palette.opened', { section: activeSection, mode });
  }, [activeSection, mode, showPalette, trackProductEvent]);

  useEffect(() => {
    if (handoffStatus) addNotification(handoffStatus, 'success');
  }, [addNotification, handoffStatus]);

  useEffect(() => {
    if (matrixError) addNotification(matrixError, 'error');
  }, [addNotification, matrixError]);

  useEffect(() => {
    if (traceQueryError) addNotification(traceQueryError, 'warning');
  }, [addNotification, traceQueryError]);

  useEffect(() => {
    if (gameplaySessionError) addNotification(gameplaySessionError, 'warning');
  }, [addNotification, gameplaySessionError]);

  useEffect(() => {
    if (sessionState.expired) {
      addNotification('Workspace session expired. Renew to continue write actions.', 'warning');
    }
  }, [addNotification, sessionState.expired]);

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
    let cancelled = false;
    void fetchGameplaySocialGraph(gameplayPlayerId).then((social) => {
      if (cancelled) return;
      if (social) setGameplaySocial(social);
    });
    return () => {
      cancelled = true;
    };
  }, [gameplayPlayerId, gameplaySession?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!gamepadEnabled) {
      gamepadPressedRef.current = {};
      return;
    }
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    const mapping =
      gamepadPreset === 'lefty'
        ? { playPause: 1, palette: 3, modeCycle: 2, speedDown: 6, speedUp: 7 }
        : { playPause: 0, palette: 2, modeCycle: 3, speedDown: 4, speedUp: 5 };
    const modeOrder: Mode[] = ['cinema', 'flow', 'compare', 'matrix', 'gameplay'];
    let frameId = 0;
    const check = (pressed: boolean, key: string, onPress: () => void) => {
      const wasPressed = Boolean(gamepadPressedRef.current[key]);
      if (pressed && !wasPressed) onPress();
      gamepadPressedRef.current[key] = pressed;
    };
    const tick = () => {
      const gamepad = navigator.getGamepads()[0];
      if (gamepad) {
        check(Boolean(gamepad.buttons[mapping.playPause]?.pressed), 'playPause', () => setIsPlaying((prev) => !prev));
        check(Boolean(gamepad.buttons[mapping.palette]?.pressed), 'palette', () => setShowPalette(true));
        check(Boolean(gamepad.buttons[mapping.modeCycle]?.pressed), 'modeCycle', () => {
          setMode((prev) => {
            const index = modeOrder.indexOf(prev);
            return modeOrder[(index + 1) % modeOrder.length] as Mode;
          });
        });
        check(Boolean(gamepad.buttons[mapping.speedDown]?.pressed), 'speedDown', () => {
          setSpeed((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
        });
        check(Boolean(gamepad.buttons[mapping.speedUp]?.pressed), 'speedUp', () => {
          setSpeed((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))));
        });
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      gamepadPressedRef.current = {};
    };
  }, [gamepadEnabled, gamepadPreset, setMode, setSpeed]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const [observability, analytics] = await Promise.all([
        fetchGameplayObservabilitySummary(),
        fetchGameplayAnalyticsFunnels(),
      ]);
      if (cancelled) return;
      if (observability) setGameplayObservability(observability);
      if (analytics) setGameplayAnalytics(analytics);
    };
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setTraceQueryResult(null);
    setTraceQueryError(null);
  }, [trace?.id]);

  useEffect(() => {
    const ms = Math.round(filterMeasureRef.current);
    setFilterComputeMs(ms);
    if (ms > 0) {
      trackProductEvent('ux.perf.filter_ms', { ms, steps: textFilteredSteps.length });
    }
  }, [textFilteredSteps, trackProductEvent]);

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
    if (!trace) return;
    if (trace.steps.length < 450 || windowed) return;
    setWindowed(true);
    setWindowSpanMs((prev) => Math.min(prev, 15000));
    addNotification('Enabled windowed playback automatically for large traces.', 'info');
  }, [addNotification, trace, windowed, setWindowed]);

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

  const emitGameplayFunnelOnce = useCallback(
    (key: string, name: Parameters<typeof recordGameplayFunnelEvent>[0], metadata: Record<string, unknown>) => {
      if (gameplayFunnelFlagsRef.current[key]) return;
      gameplayFunnelFlagsRef.current[key] = true;
      recordGameplayFunnelEvent(name, metadata);
    },
    []
  );

  const executeTrackedAction = useCallback(
    async function executeTrackedAction<T>(options: {
      id: string;
      label: string;
      run: () => Promise<T>;
      retry?: () => void;
      resume?: () => void;
      successDetail?: string;
    }): Promise<T> {
      if (options.retry) asyncActionHandlersRef.current[options.id] = options.retry;
      if (options.resume) asyncActionResumeHandlersRef.current[options.id] = options.resume;
      setAsyncAction({
        id: options.id,
        label: options.label,
        status: 'running',
        detail: 'Running',
        retryable: false,
        resumable: false,
      });
      try {
        const result = await options.run();
        setAsyncAction({
          id: options.id,
          label: options.label,
          status: 'success',
          detail: options.successDetail ?? 'Completed',
          retryable: false,
          resumable: false,
        });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Action failed';
        setAsyncAction({
          id: options.id,
          label: options.label,
          status: 'error',
          detail: message,
          retryable: Boolean(options.retry),
          resumable: Boolean(options.resume),
        });
        throw err;
      }
    },
    [setAsyncAction]
  );

  const retryAsyncAction = useCallback(
    (id: string) => {
      const handler = asyncActionHandlersRef.current[id];
      if (!handler) return;
      trackProductEvent('ux.action.retry', { id });
      handler();
    },
    [trackProductEvent]
  );

  const resumeAsyncAction = useCallback(
    (id: string) => {
      const handler = asyncActionResumeHandlersRef.current[id];
      if (!handler) return;
      trackProductEvent('ux.action.resume', { id });
      handler();
    },
    [trackProductEvent]
  );

  const handleReplay = useCallback(
    async (stepId: string) => {
      if (!trace) return;
      if (!requireMutationAccess('run replay')) return;
      const newTrace = await replayFromStep(trace.id, stepId, 'hybrid', { note: 'UI replay' }, trace);
      if (newTrace) {
        setCompareTrace(newTrace);
        setOverlayEnabled(true);
        setMode('flow');
        setMissionProgress((prev) => (prev.replay ? prev : { ...prev, replay: true }));
        appendActivity(`Created replay from ${stepId}`);
      }
    },
    [appendActivity, requireMutationAccess, setMissionProgress, trace, setCompareTrace, setMode, setOverlayEnabled]
  );

  const handleTraceQuery = useCallback(async () => {
    if (!trace) return;
    if (!traceQuery.trim()) {
      setTraceQueryResult(null);
      setTraceQueryError(null);
      return;
    }
    try {
      const result = await executeTrackedAction({
        id: 'trace-query',
        label: 'TraceQL query',
        run: async () => runTraceQuery(trace.id, traceQuery.trim()),
        successDetail: 'Query complete',
      });
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
    } catch {
      setTraceQueryError('TraceQL query failed');
      setTraceQueryResult(null);
    }
  }, [executeTrackedAction, mode, setMode, trace, traceQuery]);

  const handleRunExtension = useCallback(async () => {
    if (!trace || !selectedExtensionId) return;
    setExtensionRunning(true);
    try {
      const output = await executeTrackedAction({
        id: 'run-extension',
        label: 'Run extension',
        run: async () => runExtension(selectedExtensionId, trace.id),
        successDetail: 'Extension output ready',
      });
      if (!output) return;
      setExtensionOutput(output.result);
    } finally {
      setExtensionRunning(false);
    }
  }, [executeTrackedAction, selectedExtensionId, trace]);

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
      if (!requireMutationAccess('create gameplay sessions')) return;
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
    [appendActivity, gameplayPlayerId, requireMutationAccess, setGameplaySessionId, trace]
  );

  const handleQuickMatchGameplaySession = useCallback(async () => {
    if (!trace) return;
    if (!requireMutationAccess('matchmake gameplay sessions')) return;
    const matched = await matchmakeGameplaySession({
      traceId: trace.id,
      playerId: gameplayPlayerId,
      preferredRoles: ['operator', 'analyst', 'strategist', 'saboteur'],
    });
    if (!matched) {
      setGameplaySessionError('Failed to matchmake gameplay session.');
      return;
    }
    setGameplaySession(matched.session);
    setGameplaySessionId(matched.session.id);
    setGameplaySessionError(null);
    appendActivity(
      `${matched.match.type === 'created' ? 'Created' : 'Matched'} gameplay session ${matched.session.id} as ${matched.match.assigned_role}`
    );
  }, [appendActivity, gameplayPlayerId, requireMutationAccess, setGameplaySessionId, trace]);

  const handleJoinGameplaySession = useCallback(
    async (sessionId: string, playerId: string, role: 'strategist' | 'operator' | 'analyst' | 'saboteur') => {
      if (!requireMutationAccess('join gameplay sessions')) return;
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
    [appendActivity, requireMutationAccess, setGameplaySessionId]
  );

  const handleLeaveGameplaySession = useCallback(async () => {
    if (!gameplaySessionId) return;
    if (!requireMutationAccess('leave gameplay sessions')) return;
    requestConfirm('Leave gameplay session', `Leave session ${gameplaySessionId}?`, () => {
      void (async () => {
        const session = await leaveGameplaySession({ sessionId: gameplaySessionId, playerId: gameplayPlayerId });
        if (!session) {
          setGameplaySessionError('Failed to leave gameplay session.');
          return;
        }
        setGameplaySession(null);
        setGameplaySessionId('');
        setGameplaySessionError(null);
        appendActivity(`Left gameplay session ${gameplaySessionId}`);
        trackProductEvent('ux.action.confirmed', { action: 'leave_gameplay_session', sessionId: gameplaySessionId });
      })();
    });
  }, [
    appendActivity,
    gameplayPlayerId,
    gameplaySessionId,
    requestConfirm,
    requireMutationAccess,
    setGameplaySessionId,
    trackProductEvent,
  ]);

  const handleReconnectGameplaySession = useCallback(async () => {
    if (!gameplaySessionId) return;
    const session = await reconnectGameplaySession({ sessionId: gameplaySessionId, playerId: gameplayPlayerId });
    if (!session) {
      setGameplaySessionError('Failed to reconnect gameplay session.');
      return;
    }
    setGameplaySession(session);
    setGameplaySessionError(null);
    appendActivity(`Reconnected gameplay session ${gameplaySessionId}`);
  }, [appendActivity, gameplayPlayerId, gameplaySessionId]);

  const handleGameplayAction = useCallback(
    async (actionType: string, payload?: Record<string, unknown>) => {
      if (!gameplaySession?.id) return;
      if (!requireMutationAccess(`run gameplay action ${actionType}`)) return;
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
    [appendActivity, gameplayPlayerId, gameplaySession, requireMutationAccess]
  );

  const handleCreateGameplayGuild = useCallback(
    async (guildId: string, name: string) => {
      if (!requireMutationAccess('create guilds')) return;
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
    [appendActivity, gameplayPlayerId, gameplaySession, requireMutationAccess]
  );

  const handleJoinGameplayGuild = useCallback(
    async (guildId: string, playerId: string) => {
      if (!requireMutationAccess('join guilds')) return;
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
    [appendActivity, requireMutationAccess]
  );

  const handleScheduleGameplayGuildEvent = useCallback(
    async (guildId: string, title: string, scheduledAt: string) => {
      if (!requireMutationAccess('schedule guild events')) return;
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
    [appendActivity, requireMutationAccess]
  );

  const handleCompleteGameplayGuildEvent = useCallback(
    async (guildId: string, eventId: string, impact: number) => {
      if (!requireMutationAccess('complete guild events')) return;
      const guild = await completeGameplayGuildEvent(guildId, eventId, impact);
      if (!guild) {
        setGameplaySessionError('Failed to complete guild event.');
        return;
      }
      setGameplayGuild(guild);
      setGameplaySessionError(null);
      appendActivity(`Completed guild event ${eventId}`);
    },
    [appendActivity, requireMutationAccess]
  );

  const handleInviteGameplayFriend = useCallback(
    async (toPlayerId: string) => {
      if (!requireMutationAccess('send friend invites')) return;
      const payload = await inviteGameplayFriend({
        fromPlayerId: gameplayPlayerId,
        toPlayerId: toPlayerId.trim().toLowerCase(),
      });
      if (!payload) {
        setGameplaySessionError('Failed to send friend invite.');
        return;
      }
      setGameplaySocial(payload.social);
      setGameplaySessionError(null);
      appendActivity(`Sent friend invite to ${toPlayerId}`);
    },
    [appendActivity, gameplayPlayerId, requireMutationAccess]
  );

  const handleAcceptGameplayFriendInvite = useCallback(
    async (inviteId: string) => {
      if (!requireMutationAccess('accept friend invites')) return;
      const social = await acceptGameplayFriendInvite({
        playerId: gameplayPlayerId,
        inviteId,
      });
      if (!social) {
        setGameplaySessionError('Failed to accept friend invite.');
        return;
      }
      setGameplaySocial(social);
      setGameplaySessionError(null);
      appendActivity(`Accepted friend invite ${inviteId}`);
    },
    [appendActivity, gameplayPlayerId, requireMutationAccess]
  );

  const handleRetryConnectivity = useCallback(() => {
    void executeTrackedAction({
      id: 'retry-connectivity',
      label: 'Retry connectivity',
      retry: () => handleRetryConnectivity(),
      run: async () => {
        setGameplaySessionError(null);
        reload();
        if (gameplaySessionId) {
          const session = await getGameplaySession(gameplaySessionId);
          if (session) setGameplaySession(session);
        }
        const [social, observability, analytics] = await Promise.all([
          fetchGameplaySocialGraph(gameplayPlayerId),
          fetchGameplayObservabilitySummary(),
          fetchGameplayAnalyticsFunnels(),
        ]);
        if (social) setGameplaySocial(social);
        if (observability) setGameplayObservability(observability);
        if (analytics) setGameplayAnalytics(analytics);
        appendActivity('Retried connectivity sync');
        return true;
      },
      successDetail: 'Connectivity synced',
    }).catch(() => {
      setGameplaySessionError('Retry connectivity failed.');
    });
  }, [appendActivity, executeTrackedAction, gameplayPlayerId, gameplaySessionId, reload]);

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
    if (matrixScenarios.length <= 1) return;
    requestConfirm('Remove scenario', 'Remove this scenario from the matrix run?', () => {
      let removed: MatrixScenarioDraft | null = null;
      let removedIndex = -1;
      setMatrixScenarios((prev) => {
        removedIndex = prev.findIndex((item) => item.id === id);
        if (removedIndex === -1 || prev.length <= 1) return prev;
        removed = prev[removedIndex] ?? null;
        return prev.filter((item) => item.id !== id);
      });
      if (!removed || removedIndex === -1) return;
      pushUndo('Scenario removed', () => {
        setMatrixScenarios((prev) => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removed as MatrixScenarioDraft);
          return next;
        });
        trackProductEvent('ux.action.undone', { action: 'matrix_scenario_remove', scenarioId: id });
      });
      trackProductEvent('ux.action.confirmed', { action: 'matrix_scenario_remove', scenarioId: id });
    });
  }, [matrixScenarios.length, pushUndo, requestConfirm, trackProductEvent]);

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
      if (!requireMutationAccess('run replay matrix')) return;
      const stepId = matrixAnchorStepId || selectedStepId || trace.steps[0]?.id;
      if (!stepId) {
        setMatrixError('Select an anchor step before running the matrix.');
        return;
      }
      try {
        setMatrixLoading(true);
        setMatrixError(null);
        await executeTrackedAction({
          id: 'matrix-run',
          label: 'Replay matrix run',
          retry: () => {
            void runReplayMatrix(scenarios);
          },
          resume: () => {
            void runReplayMatrix(scenarios);
          },
          run: async () => {
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
            return matrix;
          },
          successDetail: `${scenarios.length} scenario(s) complete`,
        });
      } catch (err) {
        setMatrixError(err instanceof Error ? err.message : 'Failed to run replay matrix.');
      } finally {
        setMatrixLoading(false);
      }
    },
    [appendActivity, executeTrackedAction, matrixAnchorStepId, requireMutationAccess, selectedStepId, trace, setMode]
  );

  const cancelMatrixRun = useCallback(async () => {
    if (!replayJob) return;
    if (!requireMutationAccess('cancel replay matrix jobs')) return;
    requestConfirm('Cancel matrix job', `Cancel replay job ${replayJob.id}?`, () => {
      void (async () => {
        setMatrixLoading(true);
        try {
          const canceled = await cancelReplayJob(replayJob.id);
          if (!canceled) {
            setMatrixError('Failed to cancel replay job.');
            return;
          }
          setReplayJob(canceled);
          setAsyncAction({
            id: 'matrix-run',
            label: 'Replay matrix run',
            status: 'canceled',
            detail: `Canceled ${replayJob.id}`,
            resumable: true,
            retryable: true,
          });
          const matrix = await fetchReplayMatrix(canceled.id);
          if (matrix) setReplayMatrix(matrix);
          appendActivity(`Canceled matrix job ${replayJob.id}`);
          trackProductEvent('ux.action.cancel', { id: replayJob.id });
        } finally {
          setMatrixLoading(false);
        }
      })();
    });
  }, [appendActivity, replayJob, requestConfirm, requireMutationAccess, setAsyncAction, trackProductEvent]);

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
    void runExportTask({
      id: 'export-director-narrative',
      label: 'Director narrative markdown',
      run: () => {
        const markdown = `# Director Narrative\n\n${directorNarrative}\n\n## Recommended Actions\n${directorRecommendations
          .map((item) => `- ${item.title}: ${item.body}`)
          .join('\n')}`;
        downloadText(`agent-director-narrative-${trace.id}.md`, markdown, 'text/markdown');
      },
    });
  }, [directorNarrative, directorRecommendations, runExportTask, trace]);

  const createHandoffDigest = useCallback(async () => {
    if (!trace) return;
    const topRecommendation = directorRecommendations[0];
    const failed = trace.steps.filter((step) => step.status === 'failed').length;
    const digestLines = [
      `Session handoff (${new Date().toISOString()})`,
      `Trace: ${trace.id}`,
      `Owner: ${runOwner}`,
      `Handoff owner: ${handoffOwner || 'unassigned'}`,
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
      trackProductEvent('ux.support.payload_copied', { kind: 'handoff_digest' });
    } catch {
      window.prompt('Copy handoff digest', digest);
      setHandoffStatus('Handoff digest ready');
    }
    window.setTimeout(() => setHandoffStatus(null), 2200);
  }, [
    directorNarrative,
    directorRecommendations,
    handoffOwner,
    mode,
    runHealthScore,
    runOwner,
    selectedStepId,
    trace,
    trackProductEvent,
  ]);

  const toggleFeatureFlag = useCallback(
    (flag: keyof FeatureFlags) => {
      setFeatureFlags((prev) => {
        const next = { ...prev, [flag]: !prev[flag] };
        writeFeatureFlags(window.localStorage, next);
        trackProductEvent('ux.feature_flag.toggled', { flag, enabled: next[flag] });
        return next;
      });
    },
    [trackProductEvent]
  );

  const completeSetupWizard = useCallback(() => {
    if (!setupValidation.isValid) return;
    setSetupWizardComplete(true);
    setSetupWizardOpen(false);
    setSetupWizardStep('source');
    addNotification('Workspace setup complete.', 'success');
    trackProductEvent('ux.setup.completed', {
      dataSource: setupWizardDraft.dataSource,
      hasInvites: Boolean(setupWizardDraft.inviteEmails.trim()),
    });
  }, [addNotification, setupValidation.isValid, setupWizardDraft, trackProductEvent, setSetupWizardComplete]);

  const openNeedHelpNow = useCallback(
    (source: string) => {
      const latestSignal = stuckSignals[0];
      const fallbackStep = selectedStepId ?? 'none';
      const fallbackTrace = trace?.id ?? 'none';
      const guide = [
        `Need-help escalation (${new Date().toISOString()})`,
        `Trace: ${fallbackTrace}`,
        `Mode: ${mode}`,
        `Selected step: ${fallbackStep}`,
        `Signal: ${latestSignal ? `${latestSignal.kind} - ${latestSignal.detail}` : 'manual escalation request'}`,
        `Time to first success: ${timeToFirstSuccessMs ?? 'not yet achieved'} ms`,
        'What happened: ',
        'Expected outcome: ',
        'What blocked progress: ',
      ].join('\n');
      setSupportNote((prev) => (prev.trim() ? prev : guide));
      setSupportOpen(true);
      addNotification('Guided support opened with contextual diagnostics.', 'info');
      trackProductEvent('ux.support.opened', {
        source,
        escalated: true,
        signal: latestSignal?.kind ?? null,
        timeToFirstSuccessMs,
      });
    },
    [addNotification, mode, selectedStepId, stuckSignals, timeToFirstSuccessMs, trace, trackProductEvent]
  );

  const copySupportPayload = useCallback(async () => {
    const payload = JSON.stringify(
      {
        diagnostics: supportDiagnostics,
        note: supportNote,
        owner: runOwner,
        handoffOwner: handoffOwner || null,
      },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(payload);
      addNotification('Support payload copied.', 'success');
      trackProductEvent('ux.support.payload_copied', { bytes: payload.length });
    } catch {
      window.prompt('Copy support payload', payload);
    }
  }, [addNotification, handoffOwner, runOwner, supportDiagnostics, supportNote, trackProductEvent]);

  const saveCurrentView = useCallback(() => {
    const name = savedViewName.trim();
    if (!name || savedViewNameError) return;
    const view: SavedView = {
      id: `view-${Math.random().toString(36).slice(2, 9)}`,
      name,
      state: {
        mode,
        query,
        typeFilter,
        selectedStepId,
        safeExport,
        windowed,
        syncPlayback,
        explainMode,
        section: activeSection,
      },
    };
    setSavedViews((prev) => [view, ...prev].slice(0, 20));
    setSavedViewName('');
    setSelectedSavedViewId(view.id);
    trackProductEvent('ux.saved_view.created', { viewId: view.id, name });
    addNotification(`Saved view: ${name}`, 'success');
  }, [
    activeSection,
    addNotification,
    explainMode,
    mode,
    query,
    safeExport,
    savedViewName,
    savedViewNameError,
    selectedStepId,
    setSavedViews,
    syncPlayback,
    trackProductEvent,
    typeFilter,
    windowed,
  ]);

  const applySavedView = useCallback(
    (viewId: string) => {
      const view = savedViews.find((item) => item.id === viewId);
      if (!view) return;
      setMode(view.state.mode);
      setQuery(view.state.query);
      setTypeFilter(view.state.typeFilter);
      setSelectedStepId(view.state.selectedStepId);
      setSafeExport(view.state.safeExport);
      setWindowed(view.state.windowed);
      setSyncPlayback(view.state.syncPlayback);
      setExplainMode(view.state.explainMode);
      setActiveSection(view.state.section);
      setSelectedSavedViewId(view.id);
      trackProductEvent('ux.saved_view.applied', { viewId: view.id, name: view.name });
      addNotification(`Applied view: ${view.name}`, 'info');
    },
    [
      addNotification,
      savedViews,
      setActiveSection,
      setExplainMode,
      setMode,
      setSafeExport,
      setSyncPlayback,
      setWindowed,
      trackProductEvent,
    ]
  );

  const deleteSavedView = useCallback(() => {
    if (!selectedSavedViewId) return;
    const view = savedViews.find((item) => item.id === selectedSavedViewId);
    if (!view) return;
    requestConfirm('Delete saved view', `Delete saved view "${view.name}"?`, () => {
      setSavedViews((prev) => prev.filter((item) => item.id !== selectedSavedViewId));
      setSelectedSavedViewId('');
      trackProductEvent('ux.saved_view.deleted', { viewId: view.id, name: view.name });
      addNotification(`Deleted view: ${view.name}`, 'warning');
    });
  }, [addNotification, requestConfirm, savedViews, selectedSavedViewId, setSavedViews, trackProductEvent]);

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
    if (introDismissed || skipIntro) return;
    emitGameplayFunnelOnce(
      `tutorial_start:${trace?.id || gameplayTraceId || gameplayState.seed}`,
      'funnel.tutorial_start',
      { traceId: trace?.id || gameplayTraceId || 'unknown', persona: introPersona, launchPath }
    );
  }, [
    emitGameplayFunnelOnce,
    gameplayState.seed,
    gameplayTraceId,
    introDismissed,
    introPersona,
    launchPath,
    skipIntro,
    trace?.id,
  ]);

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
    emitGameplayFunnelOnce(
      `session_start:${gameplayTraceId || gameplayState.seed}`,
      'funnel.session_start',
      { traceId: gameplayTraceId || trace?.id || 'unknown', seed: gameplayState.seed }
    );
  }, [emitGameplayFunnelOnce, gameplayState.seed, gameplayTraceId, trace?.id]);

  useEffect(() => {
    const objectiveProgressed = gameplayState.raid.objectives.some((objective) => objective.progress > 0);
    if (!objectiveProgressed) return;
    emitGameplayFunnelOnce(
      `objective_progress:${gameplayTraceId || gameplayState.seed}`,
      'funnel.first_objective_progress',
      { traceId: gameplayTraceId || trace?.id || 'unknown' }
    );
  }, [emitGameplayFunnelOnce, gameplayState.raid.objectives, gameplayState.seed, gameplayTraceId, trace?.id]);

  useEffect(() => {
    if (gameplayState.outcome.status === 'in_progress') return;
    emitGameplayFunnelOnce(
      `first_outcome:${gameplayTraceId || gameplayState.seed}`,
      'funnel.first_mission_outcome',
      { status: gameplayState.outcome.status, reason: gameplayState.outcome.reason }
    );
    if (gameplayState.outcome.status === 'win' || gameplayState.outcome.status === 'loss') {
      emitGameplayFunnelOnce(
        `run_outcome:${gameplayTraceId || gameplayState.seed}`,
        'funnel.run_outcome',
        { status: gameplayState.outcome.status, reason: gameplayState.outcome.reason }
      );
    }
  }, [emitGameplayFunnelOnce, gameplayState.outcome.reason, gameplayState.outcome.status, gameplayState.seed, gameplayTraceId]);

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
    if (!trace) return;
    if (!likelyPrefetchStepKey) return;
    const signature = `${trace.id}:${likelyPrefetchMode}:${compareTrace?.id ?? 'none'}:${safeExport ? 'safe' : 'raw'}:${likelyPrefetchStepKey}`;
    if (smartPrefetchSignatureRef.current === signature) return;
    smartPrefetchSignatureRef.current = signature;

    const timer = window.setTimeout(() => {
      likelyPrefetchStepIds.forEach((stepId) => {
        void prefetchStepDetails(trace.id, stepId, safeExport);
      });

      if (likelyPrefetchMode === 'compare' && compareTrace) {
        likelyPrefetchStepIds.forEach((stepId) => {
          void prefetchStepDetails(compareTrace.id, stepId, safeExport);
        });
      }

      if (likelyPrefetchMode === 'flow') {
        void import('./components/FlowMode');
      } else if (likelyPrefetchMode === 'matrix') {
        void import('./components/Matrix');
      } else if (likelyPrefetchMode === 'compare' && compareTrace) {
        void import('./components/Compare');
      } else if (likelyPrefetchMode === 'gameplay') {
        void import('./components/GameplayMode');
      }
    }, 160);

    return () => window.clearTimeout(timer);
  }, [
    compareTrace,
    likelyPrefetchMode,
    likelyPrefetchStepIds,
    likelyPrefetchStepKey,
    safeExport,
    trace,
  ]);

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
    const persisted = JSON.stringify(shortcutBindings);
    const normalized = JSON.stringify(normalizedShortcutBindings);
    if (persisted !== normalized) {
      setShortcutBindings(normalizedShortcutBindings);
    }
  }, [normalizedShortcutBindings, setShortcutBindings, shortcutBindings]);

  const handleShortcutBindingChange = useCallback(
    (id: keyof ShortcutBindings, nextKey: string) => {
      setShortcutBindings((previous) => setShortcutBinding(previous, id, nextKey));
      trackProductEvent('ux.settings.shortcut.updated', { shortcut: id, key: nextKey.toLowerCase() });
    },
    [setShortcutBindings, trackProductEvent]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isShortcutPressed = (id: keyof ShortcutBindings): boolean =>
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === normalizedShortcutBindings[id];
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

      if (isShortcutPressed('toggleStory')) {
        event.preventDefault();
        toggleStory();
        return;
      }

      if (isShortcutPressed('toggleExplain')) {
        event.preventDefault();
        setExplainMode((prev) => !prev);
        return;
      }

      if (isShortcutPressed('startTour')) {
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

      if (isShortcutPressed('toggleFlow')) {
        event.preventDefault();
        if (mode === 'flow') setMode('cinema');
        else if (mode === 'cinema') handleModeChange('flow');
        return;
      }

      if (isShortcutPressed('toggleCinema')) {
        event.preventDefault();
        if (mode !== 'cinema') setMode('cinema');
        return;
      }

      if (isShortcutPressed('toggleGameplay')) {
        event.preventDefault();
        handleModeChange('gameplay');
        return;
      }

      if (isShortcutPressed('toggleInspector')) {
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
    normalizedShortcutBindings,
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
  const personaFocus = useMemo(() => {
    if (introPersona === 'executive') {
      return [
        { label: 'Review run health', done: runHealthScore >= 80 },
        { label: 'Inspect top risk', done: Boolean(selectedStepId) },
        { label: 'Share handoff digest', done: Boolean(handoffStatus) },
      ];
    }
    if (introPersona === 'operator') {
      return [
        { label: 'Open failed step', done: Boolean(selectedStepId) },
        { label: 'Run replay', done: Boolean(compareTrace) },
        { label: 'Use support diagnostics', done: supportOpen || Boolean(supportNote.trim()) },
      ];
    }
    return [
      { label: 'Open flow graph', done: mode === 'flow' },
      { label: 'Run matrix scenario', done: Boolean(replayMatrix) },
      { label: 'Save a reusable view', done: savedViews.length > 0 },
    ];
  }, [
    compareTrace,
    handoffStatus,
    introPersona,
    mode,
    replayMatrix,
    runHealthScore,
    savedViews.length,
    selectedStepId,
    supportNote,
    supportOpen,
  ]);

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
      {
        id: 'section-journey',
        label: 'Open journey workspace',
        description: 'Show journey presets and persona progression.',
        group: 'Workspace',
        onTrigger: () => setActiveSection('journey'),
      },
      {
        id: 'section-analysis',
        label: 'Open analysis workspace',
        description: 'Show async action health and export queue.',
        group: 'Workspace',
        onTrigger: () => setActiveSection('analysis'),
      },
      {
        id: 'section-collaboration',
        label: 'Open collaboration workspace',
        description: 'Ownership, handoff, and activity timeline.',
        group: 'Workspace',
        onTrigger: () => setActiveSection('collaboration'),
      },
      {
        id: 'section-operations',
        label: 'Open operations workspace',
        description: 'Setup, support, and feature flags.',
        group: 'Workspace',
        onTrigger: () => setActiveSection('operations'),
      },
      {
        id: 'open-setup-wizard',
        label: 'Open setup wizard',
        description: 'Connect source, import context, and invite teammates.',
        group: 'Workspace',
        onTrigger: () => {
          setSetupWizardOpen(true);
          trackProductEvent('ux.setup.opened', { source: 'command_palette' });
        },
        disabled: !featureFlags.setupWizardV1,
      },
      {
        id: 'open-support-panel',
        label: 'Open support diagnostics',
        description: 'Collect support payload and copy handoff diagnostics.',
        group: 'Workspace',
        onTrigger: () => {
          openNeedHelpNow('command_palette');
        },
        disabled: !featureFlags.supportPanelV1,
      },
      ...savedViews.slice(0, 5).map((view) => ({
        id: `saved-view-${view.id}`,
        label: `Apply saved view: ${view.name}`,
        description: 'Restore a saved journey configuration.',
        group: 'Workspace',
        onTrigger: () => applySavedView(view.id),
      })),
    ],
    [
      applySavedView,
      createHandoffDigest,
      featureFlags.setupWizardV1,
      featureFlags.supportPanelV1,
      openNeedHelpNow,
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
      setSetupWizardOpen,
      setTourOpen,
      setActiveSection,
      savedViews,
      startLaunchPath,
      trackProductEvent,
    ]
  );

  const handleIntroSkip = useCallback(() => {
    emitGameplayFunnelOnce(
      `tutorial_skip:intro:${trace?.id || gameplayTraceId || gameplayState.seed}`,
      'funnel.tutorial_skip',
      { traceId: trace?.id || gameplayTraceId || 'unknown', source: 'intro_overlay' }
    );
    setIntroDismissed(true);
  }, [emitGameplayFunnelOnce, gameplayState.seed, gameplayTraceId, setIntroDismissed, trace?.id]);

  const handleStartIntroTour = useCallback(() => {
    setIntroDismissed(true);
    setTourOpen(true);
  }, [setIntroDismissed, setTourOpen]);

  const handleGuidedTourClose = useCallback(() => {
    emitGameplayFunnelOnce(
      `tutorial_skip:tour:${trace?.id || gameplayTraceId || gameplayState.seed}`,
      'funnel.tutorial_skip',
      { traceId: trace?.id || gameplayTraceId || 'unknown', source: 'guided_tour' }
    );
    setTourOpen(false);
    setTourCompleted(true);
  }, [emitGameplayFunnelOnce, gameplayState.seed, gameplayTraceId, setTourCompleted, trace?.id]);

  const handleGuidedTourComplete = useCallback(() => {
    emitGameplayFunnelOnce(
      `tutorial_complete:${trace?.id || gameplayTraceId || gameplayState.seed}`,
      'funnel.tutorial_complete',
      { traceId: trace?.id || gameplayTraceId || 'unknown' }
    );
    setTourOpen(false);
    setTourCompleted(true);
  }, [emitGameplayFunnelOnce, gameplayState.seed, gameplayTraceId, setTourCompleted, trace?.id]);

  if (loading) {
    return (
      <AppShellState
        variant="loading"
        title="Loading trace..."
        message="Preparing timeline, graph, and replay context."
      />
    );
  }

  if (GLOBAL_KILL_SWITCH) {
    return (
      <AppShellState
        variant="error"
        title="Temporarily unavailable"
        message="A release safety kill switch is active while we stabilize production. Read-only diagnostics are available in support."
        actions={[
          {
            id: 'open-help',
            label: 'Open help',
            node: (
              <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
                Open help
              </a>
            ),
          },
          {
            id: 'retry',
            label: 'Retry',
            node: (
              <button className="primary-button" type="button" onClick={reload}>
                Retry
              </button>
            ),
          },
        ]}
      />
    );
  }

  if (!error && !trace && traces.length === 0) {
    return (
      <AppShellState
        variant="empty"
        title="No traces yet"
        message="Ingest your first trace, then reload to begin the Observe → Inspect → Direct workflow."
        actions={[
          {
            id: 'retry',
            label: 'Retry',
            node: (
              <button className="primary-button" type="button" onClick={reload}>
                Retry
              </button>
            ),
          },
          {
            id: 'help',
            label: 'Open help',
            node: (
              <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
                Open help
              </a>
            ),
          },
        ]}
      />
    );
  }

  if (error || !trace) {
    return (
      <AppShellState
        variant="error"
        title="Trace load failed"
        message={error ?? 'Failed to load trace.'}
        actions={[
          {
            id: 'retry',
            label: 'Retry',
            node: (
              <button className="primary-button" type="button" onClick={reload}>
                Retry
              </button>
            ),
          },
          {
            id: 'help',
            label: 'Open help',
            node: (
              <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
                Open help
              </a>
            ),
          },
        ]}
      />
    );
  }

  const activeWorkspaceSection = WORKSPACE_SECTION_COPY[activeSection];
  const advancedControlsActive = Boolean(
    traceQuery.trim() || traceQueryResult || traceQueryError || selectedExtensionId || extensionRunning
  );
  const workspacePrimaryAction = (() => {
    switch (activeSection) {
      case 'journey':
        return {
          label: 'Save current view',
          onClick: () => saveCurrentView(),
          disabled: Boolean(savedViewNameError),
        };
      case 'analysis':
        return {
          label: 'Queue narrative export',
          onClick: () => exportDirectorNarrative(),
          disabled: !trace || !featureFlags.exportCenterV1,
        };
      case 'collaboration':
        return {
          label: 'Share live link',
          onClick: () => {
            void shareSession();
          },
          disabled: !featureFlags.ownershipPanelV1,
        };
      case 'operations':
      default:
        return {
          label: t('open_setup_wizard'),
          onClick: () => {
            setSetupWizardOpen(true);
            trackProductEvent('ux.setup.opened', { source: 'workspace_primary' });
          },
          disabled: !featureFlags.setupWizardV1,
        };
    }
  })();
  const modeOrientationLabel = MODE_ORIENTATION_COPY[mode];
  const effectiveDensity: Exclude<DensityMode, 'auto'> =
    densityMode === 'auto' ? (viewportWidth <= 980 ? 'compact' : 'comfortable') : densityMode;
  const workspaceTrail = `Workspace / ${activeWorkspaceSection.title} / ${modeOrientationLabel}`;
  const nextBestAction = (() => {
    if (activeSection === 'journey') {
      if (mode !== 'cinema') {
        return {
          summary: 'Switch back to timeline playback to inspect sequence order before you save or share.',
          label: 'Open timeline playback',
          onClick: () => handleModeChange('cinema'),
          disabled: false,
        };
      }
      return {
        summary: 'Save this viewpoint so you can return to the exact context during handoff.',
        label: 'Save current view',
        onClick: () => saveCurrentView(),
        disabled: Boolean(savedViewNameError),
      };
    }

    if (activeSection === 'analysis') {
      if (mode !== 'flow') {
        return {
          summary: 'Open the flow graph to inspect causal edges before running deeper diagnostics.',
          label: 'Open flow graph',
          onClick: () => handleModeChange('flow'),
          disabled: false,
        };
      }
      return {
        summary: 'Queue a director narrative so root-cause evidence is ready for reporting.',
        label: 'Queue narrative export',
        onClick: () => exportDirectorNarrative(),
        disabled: !featureFlags.exportCenterV1,
      };
    }

    if (activeSection === 'collaboration') {
      if (!syncPlayback) {
        return {
          summary: 'Enable sync playback so collaborators stay aligned on the same investigation moment.',
          label: 'Enable sync playback',
          onClick: () => setSyncPlayback(true),
          disabled: false,
        };
      }
      return {
        summary: 'Share a live session link so responders open this exact context immediately.',
        label: 'Share live link',
        onClick: () => {
          void shareSession();
        },
        disabled: !featureFlags.ownershipPanelV1,
      };
    }

    return {
      summary: 'Run setup checks before demo and release handoff to avoid surprises.',
      label: t('open_setup_wizard'),
      onClick: () => {
        setSetupWizardOpen(true);
        trackProductEvent('ux.setup.opened', { source: 'workspace_next_action' });
      },
      disabled: !featureFlags.setupWizardV1,
    };
  })();

  return (
    <div
      className={`app theme-${themeMode} density-${effectiveDensity} ${explainMode ? 'explain-mode' : ''} ${
        mode === 'compare' ? 'mode-compare' : ''
      } ${mode === 'matrix' ? 'mode-matrix' : ''} ${mode === 'gameplay' ? 'mode-gameplay' : ''}`}
    >
      <h1 className="sr-only">Workspace</h1>
      <div className="live-region" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
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
        onOpenSupport={() => {
          openNeedHelpNow('header');
        }}
        onThemeChange={setThemeMode}
        onMotionChange={setMotionMode}
        densityMode={densityMode}
        onDensityChange={setDensityMode}
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
        workspaces={WORKSPACE_OPTIONS}
        workspaceId={workspaceId}
        onWorkspaceChange={setWorkspaceId}
        workspaceRole={workspaceRole}
        onWorkspaceRoleChange={setWorkspaceRole}
        sessionLabel={sessionState.label}
        sessionExpired={sessionState.expired}
        onRenewSession={renewSession}
      />
      <NotificationCenter
        notifications={notifications.map(({ id, message, level }) => ({ id, message, level }))}
        onDismiss={dismissNotification}
      />
      {stuckSignals.length > 0 || timeToFirstSuccessMs === null ? (
        <section className="help-escalation-banner" aria-live="polite">
          <div className="help-escalation-copy">
            <strong>Need help now?</strong>
            <p>
              {stuckSignals.length > 0
                ? `Detected ${stuckSignals.length} potential friction signal${stuckSignals.length === 1 ? '' : 's'} in this session.`
                : 'No successful action recorded yet in this session. Start guided recovery to avoid guesswork.'}
            </p>
          </div>
          <div className="help-escalation-actions">
            <button className="primary-button" type="button" onClick={() => openNeedHelpNow('escalation_banner')}>
              Need help now
            </button>
            <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
              Open quick help
            </a>
          </div>
        </section>
      ) : null}
      {undoState ? (
        <div className="undo-banner" role="status" aria-live="polite">
          <span>{undoState.label}</span>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              undoHandlersRef.current[undoState.id]?.();
              setUndoState(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
      {pendingConfirm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm action">
          <div className="palette confirm-dialog">
            <div className="palette-header">
              <div>
                <div className="palette-title">{pendingConfirm.title}</div>
                <div className="palette-subtitle">{pendingConfirm.message}</div>
              </div>
            </div>
            <div className="workspace-inline-form">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  const id = pendingConfirm.id;
                  trackProductEvent('ux.action.confirmed', { confirmationId: id });
                  confirmHandlersRef.current[id]?.();
                  delete confirmHandlersRef.current[id];
                  setPendingConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {setupWizardOpen && featureFlags.setupWizardV1 ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="First-run setup wizard">
          <div className="palette setup-wizard">
            <div className="palette-header">
              <div>
                <div className="palette-title">First-run setup wizard</div>
                <div className="palette-subtitle">Connect source, import context, invite teammates.</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSetupWizardOpen(false)}>
                Close
              </button>
            </div>
            <div className="setup-stepper">
              <span className={setupWizardStep === 'source' ? 'active' : ''}>1. Source</span>
              <span className={setupWizardStep === 'import' ? 'active' : ''}>2. Import</span>
              <span className={setupWizardStep === 'invite' ? 'active' : ''}>3. Invite</span>
            </div>
            {setupWizardStep === 'source' ? (
              <div className="workspace-card">
                <label>
                  Data source
                  <select
                    className="search-select"
                    value={setupWizardDraft.dataSource}
                    onChange={(event) =>
                      setSetupWizardDraft((prev) => ({ ...prev, dataSource: event.target.value }))
                    }
                  >
                    <option value="">Select source</option>
                    <option value="api">Live API</option>
                    <option value="file">Trace file import</option>
                    <option value="hybrid">Hybrid replay baseline</option>
                  </select>
                </label>
                {setupValidation.dataSourceError ? (
                  <p className="workspace-error">{setupValidation.dataSourceError}</p>
                ) : null}
              </div>
            ) : null}
            {setupWizardStep === 'import' ? (
              <div className="workspace-card">
                <label>
                  Import path or URI
                  <input
                    className="search-input"
                    value={setupWizardDraft.importPath}
                    onChange={(event) =>
                      setSetupWizardDraft((prev) => ({ ...prev, importPath: event.target.value }))
                    }
                    placeholder="/data/traces/latest.json"
                  />
                </label>
                {setupValidation.importPathError ? (
                  <p className="workspace-error">{setupValidation.importPathError}</p>
                ) : null}
              </div>
            ) : null}
            {setupWizardStep === 'invite' ? (
              <div className="workspace-card">
                <label>
                  Invite emails (comma-separated)
                  <input
                    className="search-input"
                    value={setupWizardDraft.inviteEmails}
                    onChange={(event) =>
                      setSetupWizardDraft((prev) => ({ ...prev, inviteEmails: event.target.value }))
                    }
                    placeholder="ops@example.com, qa@example.com"
                  />
                </label>
                {setupValidation.inviteEmailsError ? (
                  <p className="workspace-error">{setupValidation.inviteEmailsError}</p>
                ) : null}
              </div>
            ) : null}
            <div className="workspace-inline-form">
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setSetupWizardStep((prev) =>
                    prev === 'invite' ? 'import' : prev === 'import' ? 'source' : 'source'
                  )
                }
                disabled={setupWizardStep === 'source'}
              >
                Back
              </button>
              {setupWizardStep !== 'invite' ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    setSetupWizardStep((prev) => (prev === 'source' ? 'import' : 'invite'))
                  }
                >
                  Continue
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  disabled={!setupValidation.isValid}
                  onClick={completeSetupWizard}
                >
                  Complete setup
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {supportOpen && featureFlags.supportPanelV1 ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Support diagnostics">
          <div className="palette support-panel">
            <div className="palette-header">
              <div>
                <div className="palette-title">Support diagnostics</div>
                <div className="palette-subtitle">Capture environment, friction signals, and handoff payload for rapid triage.</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSupportOpen(false)}>
                Close
              </button>
            </div>
            <div className="support-guided-recovery">
              <strong>Guided recovery context</strong>
              <p>
                {stuckSignals.length
                  ? `Latest signal: ${stuckSignals[0]?.kind.replace('_', ' ')}. ${stuckSignals[0]?.detail}`
                  : 'No explicit friction signal detected. This panel still captures full context for proactive support.'}
              </p>
              <p>
                Time to first success:{' '}
                {timeToFirstSuccessMs === null ? 'not yet recorded in this session' : `${timeToFirstSuccessMs}ms`}
              </p>
            </div>
            <label>
              Support note
              <textarea
                className="search-input"
                value={supportNote}
                onChange={(event) => setSupportNote(event.target.value)}
                rows={3}
                placeholder="Describe the issue, reproduction path, expected behavior, and where the user got stuck."
              />
            </label>
            <pre className="support-diagnostics-preview">{JSON.stringify(supportDiagnostics, null, 2)}</pre>
            <div className="workspace-inline-form">
              <button className="primary-button" type="button" onClick={() => void copySupportPayload()}>
                Copy diagnostics payload
              </button>
              <a className="ghost-button" href="/help.html" target="_blank" rel="noreferrer">
                Open help
              </a>
            </div>
          </div>
        </div>
      ) : null}
      {!introDismissed && !skipIntro ? (
        <IntroOverlay
          onComplete={handleIntroSkip}
          onStartTour={handleStartIntroTour}
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
        onClose={handleGuidedTourClose}
        onComplete={handleGuidedTourComplete}
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

      <nav className="workspace-nav" aria-label="Workspace navigation">
        <button
          className={`ghost-button ${activeSection === 'journey' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeSection === 'journey'}
          aria-label="Understand this run workspace section"
          onClick={() => setActiveSection('journey')}
        >
          Understand
        </button>
        <button
          className={`ghost-button ${activeSection === 'analysis' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeSection === 'analysis'}
          aria-label="Diagnose root cause workspace section"
          onClick={() => setActiveSection('analysis')}
        >
          Diagnose
        </button>
        <button
          className={`ghost-button ${activeSection === 'collaboration' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeSection === 'collaboration'}
          aria-label="Coordinate responders workspace section"
          onClick={() => setActiveSection('collaboration')}
        >
          Coordinate
        </button>
        <button
          className={`ghost-button ${activeSection === 'operations' ? 'active' : ''}`}
          type="button"
          aria-pressed={activeSection === 'operations'}
          aria-label="Configure workspace section"
          onClick={() => setActiveSection('operations')}
        >
          Configure
        </button>
        <button
          className={`ghost-button ${mode === 'compare' || mode === 'matrix' ? 'active' : ''}`}
          type="button"
          aria-pressed={mode === 'compare' || mode === 'matrix'}
          aria-label="Validate outcome intent"
          onClick={() => {
            setActiveSection('analysis');
            if (compareTrace) {
              handleModeChange('compare');
            } else {
              handleModeChange('matrix');
            }
          }}
        >
          Validate
        </button>
      </nav>
      <div className="workspace-orientation" aria-live="polite">
        <p className="workspace-breadcrumb" aria-label="Current location">
          {workspaceTrail}
        </p>
        <div className="workspace-orientation-meta">
          <span className="status-badge">Workspace: {workspaceId}</span>
          <span className="status-badge">Role: {workspaceRole}</span>
        </div>
      </div>
      <div className="workspace-section-header">
        <div className="workspace-section-meta">
          <p className="workspace-section-eyebrow">Workspace</p>
          <h2 id="workspace-section-title">{activeWorkspaceSection.title}</h2>
          <p>{activeWorkspaceSection.description}</p>
          <div className="workspace-next-action">
            <p className="workspace-next-action-eyebrow">Next best action</p>
            <p className="workspace-next-action-summary">{nextBestAction.summary}</p>
            <button className="ghost-button" type="button" onClick={nextBestAction.onClick} disabled={nextBestAction.disabled}>
              {nextBestAction.label}
            </button>
          </div>
        </div>
        <div className="workspace-section-actions">
          <button
            className="primary-button workspace-primary-button"
            type="button"
            onClick={workspacePrimaryAction.onClick}
            disabled={workspacePrimaryAction.disabled}
          >
            {workspacePrimaryAction.label}
          </button>
          <div className="workspace-secondary-actions" ref={workspaceActionsRef}>
            <button
              className={`ghost-button ${workspaceActionsOpen ? 'active' : ''}`}
              type="button"
              onClick={() => setWorkspaceActionsOpen((prev) => !prev)}
              aria-expanded={workspaceActionsOpen}
              aria-controls="workspace-actions-menu"
            >
              More actions
            </button>
            {workspaceActionsOpen ? (
              <div className="workspace-actions-menu" id="workspace-actions-menu" role="menu" aria-label="Workspace secondary actions">
                <button
                  className="ghost-button"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setWorkspacePanelOpen((prev) => !prev);
                    setWorkspaceActionsOpen(false);
                  }}
                  aria-controls="workspace-context-panel"
                  aria-expanded={workspacePanelOpen}
                >
                  {workspacePanelOpen ? 'Hide workspace tools' : 'Show workspace tools'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTourOpen(true);
                    setWorkspaceActionsOpen(false);
                  }}
                >
                  Open guide
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {workspacePanelOpen ? (
        <section
          className="workspace-context-panel"
          id="workspace-context-panel"
          aria-labelledby="workspace-section-title"
        >
        {activeSection === 'journey' ? (
          <div className="workspace-context-grid">
            <article className="workspace-card">
              <h3>Track persona progress</h3>
              <p>
                {introPersona === 'executive'
                  ? 'Executive mission path'
                  : introPersona === 'operator'
                    ? 'Operator mission path'
                    : 'Builder mission path'}
              </p>
              <div className="workspace-checklist">
                {personaFocus.map((item) => (
                  <div key={item.label} className={`workspace-check ${item.done ? 'done' : ''}`}>
                    <span>{item.done ? '✓' : '○'}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="workspace-card">
              <h3>Save and restore views</h3>
              <div className="workspace-inline-form">
                <input
                  className="search-input"
                  placeholder="Saved view name"
                  value={savedViewName}
                  onChange={(event) => setSavedViewName(event.target.value)}
                  aria-label="Saved view name"
                />
                <button className="ghost-button" type="button" onClick={saveCurrentView} disabled={Boolean(savedViewNameError)}>
                  Save view
                </button>
              </div>
              {savedViewNameError && savedViewName.trim() ? <p className="workspace-error">{savedViewNameError}</p> : null}
              <div className="workspace-inline-form">
                <select
                  className="search-select"
                  value={selectedSavedViewId}
                  onChange={(event) => setSelectedSavedViewId(event.target.value)}
                  aria-label="Saved views"
                >
                  <option value="">Select saved view</option>
                  {savedViews.map((view) => (
                    <option key={view.id} value={view.id}>
                      {view.name}
                    </option>
                  ))}
                </select>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => selectedSavedViewId && applySavedView(selectedSavedViewId)}
                  disabled={!selectedSavedViewId}
                >
                  Apply
                </button>
                <button className="ghost-button" type="button" onClick={deleteSavedView} disabled={!selectedSavedViewId}>
                  Delete
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {activeSection === 'analysis' ? (
          <div className="workspace-context-grid">
            <article className="workspace-card">
              <h3>Track async actions</h3>
              {asyncActions.length === 0 ? <p>No tracked async actions yet.</p> : null}
              {asyncActions.map((action) => (
                <div key={action.id} className={`async-action-row status-${action.status}`} data-status={action.status}>
                  <div>
                    <strong>{action.label}</strong>
                    <p>{action.detail}</p>
                  </div>
                  <div className="async-action-actions">
                    {action.retryable ? (
                      <button className="ghost-button" type="button" onClick={() => retryAsyncAction(action.id)}>
                        Retry
                      </button>
                    ) : null}
                    {action.resumable ? (
                      <button className="ghost-button" type="button" onClick={() => resumeAsyncAction(action.id)}>
                        Resume
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </article>
            <article className="workspace-card">
              <h3>Run exports</h3>
              {!featureFlags.exportCenterV1 ? <p>Export center is disabled by feature flag.</p> : null}
              <div className="workspace-inline-form">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => exportDirectorNarrative()}
                  disabled={!trace || !featureFlags.exportCenterV1}
                >
                  Queue narrative export
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    void runExportTask({
                      id: 'export-support-diagnostics',
                      label: 'Support diagnostics JSON',
                      run: () => downloadText('agent-director-support-diagnostics.json', JSON.stringify(supportDiagnostics, null, 2), 'application/json'),
                    });
                  }}
                  disabled={!featureFlags.exportCenterV1}
                >
                  Queue diagnostics export
                </button>
              </div>
              {featureFlags.exportCenterV1 && exportTasks.length === 0 ? <p>No exports queued.</p> : null}
              {exportTasks.map((task) => (
                <div key={task.id} className={`export-task-row status-${task.status}`} data-status={task.status}>
                  <span>{task.label}</span>
                  <span>{task.detail}</span>
                  {task.retryable ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        trackProductEvent('ux.export.retried', { taskId: task.id });
                        exportRetryHandlersRef.current[task.id]?.();
                      }}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ))}
            </article>
          </div>
        ) : null}

        {activeSection === 'collaboration' ? (
          <div className="workspace-context-grid">
            {!featureFlags.ownershipPanelV1 ? (
              <article className="workspace-card">
                <h3>Enable ownership to continue</h3>
                <p>Enable the ownership panel feature flag in Operations to configure handoff ownership.</p>
              </article>
            ) : null}
            {featureFlags.ownershipPanelV1 ? (
              <>
                <article className="workspace-card">
                  <h3>Assign ownership and handoff</h3>
                  <div className="workspace-inline-form">
                    <input
                      className="search-input"
                      value={runOwner}
                      onChange={(event) => setRunOwner(event.target.value)}
                      aria-label="Run owner"
                      placeholder="Run owner"
                    />
                    <input
                      className="search-input"
                      value={handoffOwner}
                      onChange={(event) => setHandoffOwner(event.target.value)}
                      aria-label="Handoff owner"
                      placeholder="Handoff owner"
                    />
                  </div>
                  <div className="workspace-inline-form">
                    <button className="ghost-button" type="button" onClick={() => void shareSession()}>
                      Share live link
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void createHandoffDigest()}>
                      Copy handoff digest
                    </button>
                  </div>
                </article>
                <article className="workspace-card">
                  <h3>Review collaboration activity</h3>
                  {activityFeed.length === 0 ? <p>No collaboration activity yet.</p> : null}
                  <div className="workspace-feed">
                    {activityFeed.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="workspace-feed-item">
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </>
            ) : null}
          </div>
        ) : null}

        {activeSection === 'operations' ? (
          <div className="workspace-context-grid">
            <article className="workspace-card">
              <h3>{t('setup_support_title')}</h3>
              <div className="workspace-inline-form">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setSetupWizardOpen(true);
                    trackProductEvent('ux.setup.opened', { source: 'operations_panel' });
                  }}
                  disabled={!featureFlags.setupWizardV1}
                >
                  {t('open_setup_wizard')}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    openNeedHelpNow('operations_panel');
                  }}
                  disabled={!featureFlags.supportPanelV1}
                >
                  {t('open_support_panel')}
                </button>
              </div>
              <div className="workspace-inline-form">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featureFlags.setupWizardV1}
                    onChange={() => toggleFeatureFlag('setupWizardV1')}
                  />
                  Enable setup wizard
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featureFlags.supportPanelV1}
                    onChange={() => toggleFeatureFlag('supportPanelV1')}
                  />
                  Enable support panel
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featureFlags.exportCenterV1}
                    onChange={() => toggleFeatureFlag('exportCenterV1')}
                  />
                  Enable export center
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featureFlags.ownershipPanelV1}
                    onChange={() => toggleFeatureFlag('ownershipPanelV1')}
                  />
                  Enable ownership panel
                </label>
              </div>
            </article>
            <article className="workspace-card">
              <h3>{t('telemetry_summary_title')}</h3>
              <p>{t('telemetry_summary_body')}</p>
              <div className="workspace-inline-form">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    const eventsRaw = window.localStorage.getItem('agentDirector.analytics.events.v1') ?? '[]';
                    void runExportTask({
                      id: 'export-analytics-events',
                      label: 'Frontend analytics events',
                      run: () => downloadText('agent-director-frontend-events.json', eventsRaw, 'application/json'),
                    });
                  }}
                >
                  {t('export_event_queue')}
                </button>
              </div>
            </article>
            <article className="workspace-card">
              <h3>{t('settings_center_title')}</h3>
              <p>{t('settings_center_body')}</p>
              <div className="workspace-inline-form">
                <label className="toggle">
                  <input type="checkbox" checked={safeExport} onChange={() => setSafeExport((prev) => !prev)} />
                  {t('safe_export')}
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={gamepadEnabled} onChange={() => setGamepadEnabled((prev) => !prev)} />
                  {t('gamepad_enabled')}
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={windowed} onChange={() => setWindowed((prev) => !prev)} />
                  {t('timeline_windowing')}
                </label>
              </div>
              <div className="workspace-inline-form">
                <label>
                  {t('theme_label')}
                  <select className="search-select" value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
                    <option value="studio">Studio</option>
                    <option value="focus">Focus</option>
                    <option value="contrast">Contrast</option>
                  </select>
                </label>
                <label>
                  {t('motion_label')}
                  <select className="search-select" value={motionMode} onChange={(event) => setMotionMode(event.target.value as MotionMode)}>
                    <option value="cinematic">Cinematic</option>
                    <option value="balanced">Balanced</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
                <label>
                  {t('app_language_label')}
                  <select
                    className="search-select"
                    value={normalizedAppLocale}
                    onChange={(event) => setAppLocale(normalizeAppLocale(event.target.value))}
                  >
                    {APP_LOCALE_OPTIONS.map((localeOption) => (
                      <option key={localeOption.value} value={localeOption.value}>
                        {localeOption.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('gameplay_locale_label')}
                  <select
                    className="search-select"
                    value={gameplayLocale}
                    onChange={(event) => setGameplayLocale(event.target.value as GameplayLocale)}
                  >
                    <option value="en">English</option>
                    <option value="es">Espanol</option>
                  </select>
                </label>
              </div>
              <div className="workspace-feed">
                {REMAPPABLE_SHORTCUTS.map((shortcut) => (
                  <label key={shortcut.id} className="workspace-inline-form">
                    <span>{shortcut.label}</span>
                    <select
                      className="search-select"
                      value={normalizedShortcutBindings[shortcut.id]}
                      onChange={(event) => handleShortcutBindingChange(shortcut.id, event.target.value)}
                      aria-label={`${shortcut.label} shortcut`}
                    >
                      {SHORTCUT_KEY_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {key.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </article>
          </div>
        ) : null}
        </section>
      ) : (
        <p className="workspace-panel-collapsed" id="workspace-context-panel">
          Workspace tools are hidden to reduce clutter. Use “Show workspace tools” when you need deeper controls.
        </p>
      )}

      <section
        className="toolbar"
        data-help
        data-help-indicator
        data-tour="toolbar"
        data-help-title="Search + filters"
        data-help-body="Core controls stay visible. Open Advanced controls for TraceQL and extension diagnostics."
        data-help-placement="bottom"
        aria-labelledby="workspace-toolbar-heading"
      >
        <h2 id="workspace-toolbar-heading" className="sr-only">
          Controls
        </h2>
        <div className="toolbar-primary">
          <SearchBar query={query} typeFilter={typeFilter} onQueryChange={setQuery} onTypeFilterChange={setTypeFilter} />
          <div className="toolbar-mode-switcher">
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
              {t('mode_cinema')}
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
              {t('mode_flow')}
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
              {t('mode_compare')}
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
              {t('mode_matrix')}
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
              {t('mode_gameplay')}
            </button>
          </div>
        </div>

        <div className="toolbar-utility">
          <div className="toolbar-toggle-group">
            <label
              className="toggle"
              title="Redact payloads and disable raw views for safe sharing"
              data-help
              data-help-title="Safe export"
              data-help-body="Redacts secrets and disables raw payload views for safe sharing."
              data-help-placement="bottom"
            >
              <input type="checkbox" checked={safeExport} onChange={() => setSafeExport((prev) => !prev)} />
              {t('safe_export')}
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
                {t('windowed')}
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
                {t('overlay')}
              </label>
            ) : null}
            <label className="toggle" title="Follow active collaborator cursor and mode updates">
              <input
                type="checkbox"
                checked={syncPlayback}
                onChange={() => setSyncPlayback((prev) => !prev)}
              />
              {t('sync_playback')}
            </label>
          </div>
          <div className="toolbar-advanced-controls">
            {!showAdvancedControls && advancedControlsActive ? (
              <span className="status-badge">Advanced controls active</span>
            ) : null}
            <button
              className={`ghost-button ${showAdvancedControls ? 'active' : ''}`}
              type="button"
              onClick={() => setShowAdvancedControls((prev) => !prev)}
              aria-expanded={showAdvancedControls}
              aria-controls="advanced-toolbar-panel"
            >
              {showAdvancedControls ? 'Hide advanced controls' : 'Show advanced controls'}
            </button>
          </div>
        </div>

        {showAdvancedControls ? (
          <div className="toolbar-advanced-panel" id="advanced-toolbar-panel">
            <div className="toolbar-advanced-group">
              <input
                className="search-input"
                value={traceQuery}
                onChange={(event) => setTraceQuery(event.target.value)}
                placeholder={t('traceql_placeholder')}
                aria-label="TraceQL query"
              />
              <button className="ghost-button" type="button" onClick={() => void handleTraceQuery()}>
                {t('run_traceql')}
              </button>
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
                  {t('clear_traceql')}
                </button>
              ) : null}
            </div>
            <div className="toolbar-advanced-group">
              <select
                className="search-select"
                value={selectedExtensionId}
                onChange={(event) => setSelectedExtensionId(event.target.value)}
                aria-label="Extension selector"
              >
                <option value="">{t('select_extension')}</option>
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
                {extensionRunning ? t('running_extension') : t('run_extension')}
              </button>
            </div>
            <div className="toolbar-advanced-status">
              {traceQueryResult ? <span className="status-badge">{traceQueryResult.matchCount} match(es)</span> : null}
              {isFilteringDeferred ? <span className="status-badge">Filtering...</span> : null}
              <span className="status-badge">Hydration {hydrationStatus}</span>
              <span className="status-badge">Filter {filterComputeMs}ms</span>
              {traceQueryError ? <span className="status-badge warn">{traceQueryError}</span> : null}
            </div>
          </div>
        ) : null}

      </section>

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
            <Suspense fallback={<div className="loading">{t('loading_view')}</div>}>
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
                  onQuickMatchSession={handleQuickMatchGameplaySession}
                  onJoinSession={handleJoinGameplaySession}
                  onLeaveSession={handleLeaveGameplaySession}
                  onReconnectSession={handleReconnectGameplaySession}
                  onDispatchAction={handleGameplayAction}
                  guild={gameplayGuild}
                  social={gameplaySocial}
                  onInviteFriend={handleInviteGameplayFriend}
                  onAcceptFriendInvite={handleAcceptGameplayFriendInvite}
                  locale={gameplayLocale}
                  onLocaleChange={setGameplayLocale}
                  gamepadEnabled={gamepadEnabled}
                  onToggleGamepad={setGamepadEnabled}
                  gamepadPreset={gamepadPreset}
                  onGamepadPresetChange={setGamepadPreset}
                  isOnline={isOnline}
                  onRetryConnectivity={handleRetryConnectivity}
                  onCreateGuild={handleCreateGameplayGuild}
                  onJoinGuild={handleJoinGameplayGuild}
                  onScheduleGuildEvent={handleScheduleGameplayGuildEvent}
                  onCompleteGuildEvent={handleCompleteGameplayGuildEvent}
                  observability={gameplayObservability}
                  analytics={gameplayAnalytics}
                />
              ) : null}
            </Suspense>
          </MorphOrchestrator>
        </div>

        <Suspense fallback={<div className="loading">{t('loading_panel')}</div>}>
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
          className={`ghost-button ${mode === 'cinema' ? 'active' : ''}`}
          type="button"
          onClick={() => handleModeChange('cinema')}
          aria-label="Open timeline mode"
        >
          Timeline
        </button>
        <button
          className={`ghost-button ${mode === 'flow' ? 'active' : ''}`}
          type="button"
          onClick={() => handleModeChange('flow')}
          aria-label="Open flow graph mode"
        >
          Flow
        </button>
        <button
          className={`ghost-button ${mode === 'compare' || mode === 'matrix' ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setActiveSection('analysis');
            if (compareTrace) {
              handleModeChange('compare');
            } else {
              handleModeChange('matrix');
            }
          }}
          aria-label="Open validation mode"
        >
          Validate
        </button>
        <button className="ghost-button" type="button" onClick={() => setTourOpen(true)} aria-label="Start guided tour">
          Guide
        </button>
        <button className="ghost-button" type="button" onClick={() => setShowPalette(true)} aria-label="Open command palette">
          Command
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
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        actions={commandActions}
        context={{ section: activeSection, mode, persona: introPersona }}
        onActionRun={(action) => trackProductEvent('ux.palette.command_run', { id: action.id, group: action.group ?? null })}
      />
      <ShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        bindings={normalizedShortcutBindings}
      />
    </div>
  );
}
