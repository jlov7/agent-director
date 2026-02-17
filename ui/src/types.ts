export type StepType = 'llm_call' | 'tool_call' | 'decision' | 'handoff' | 'guardrail';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TraceStatus = 'running' | 'completed' | 'failed';
export type ReplayStrategy = 'recorded' | 'live' | 'hybrid';
export type ReplayJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface TraceMetadata {
  source: 'openai_agents' | 'langsmith' | 'langfuse' | 'manual' | string;
  agentName: string;
  modelId: string;
  wallTimeMs: number;
  workTimeMs?: number;
  totalTokens?: number;
  totalCostUsd?: number;
  errorCount?: number;
  retryCount?: number;
}

export interface StepMetrics {
  tokensTotal?: number;
  costUsd?: number;
}

export interface StepPreview {
  title?: string;
  subtitle?: string;
  inputPreview?: string;
  outputPreview?: string;
}

export interface StepIo {
  emittedToolCallIds?: string[];
  consumedToolCallIds?: string[];
}

export interface StepSummary {
  id: string;
  index: number;
  type: StepType;
  name: string;
  startedAt: string;
  endedAt: string | null;
  durationMs?: number;
  status: StepStatus;
  error?: string;
  parentStepId?: string;
  childStepIds: string[];
  attempt?: number;
  retryOfStepId?: string;
  metrics?: StepMetrics;
  preview?: StepPreview;
  io?: StepIo;
  toolCallId?: string;
}

export interface ReplayInfo {
  strategy: ReplayStrategy;
  modifiedStepId: string;
  modifications: Record<string, unknown>;
  createdAt: string;
}

export interface ReplayScenarioInput {
  name: string;
  strategy: ReplayStrategy;
  modifications: Record<string, unknown>;
}

export interface ReplayScenarioStatus extends ReplayScenarioInput {
  id: string;
  status: ReplayJobStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  replayTraceId?: string | null;
  error?: string | null;
}

export interface ReplayJob {
  id: string;
  traceId: string;
  stepId: string;
  status: ReplayJobStatus;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  scenarioCount: number;
  completedCount: number;
  failedCount: number;
  canceledCount: number;
  scenarios: ReplayScenarioStatus[];
}

export interface ReplayMatrixRow {
  scenarioId: string;
  name: string;
  strategy: ReplayStrategy;
  status: ReplayJobStatus;
  replayTraceId?: string | null;
  modifications: Record<string, unknown>;
  error?: string | null;
  changedStepIds: string[];
  addedStepIds: string[];
  removedStepIds: string[];
  metrics: {
    costDeltaUsd: number | null;
    wallTimeDeltaMs: number | null;
    errorDelta: number | null;
    retryDelta: number | null;
    changedSteps: number;
    addedSteps: number;
    removedSteps: number;
    invalidatedStepCount: number;
  };
}

export interface CausalFactor {
  factor: string;
  score: number;
  confidence: number;
  evidence: {
    samples: number;
    examples: string[];
    positive: number;
    negative: number;
  };
}

export interface ReplayMatrix {
  jobId: string;
  traceId: string;
  stepId: string;
  rows: ReplayMatrixRow[];
  causalRanking: CausalFactor[];
}

export interface TraceSummary {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  status: TraceStatus;
  metadata: TraceMetadata;
  steps: StepSummary[];
  parentTraceId?: string;
  branchPointStepId?: string;
  replay?: ReplayInfo;
}

export interface RedactionField {
  path: string;
  kind: 'secret' | 'pii' | 'token';
}

export interface RedactionInfo {
  mode: 'redacted' | 'raw';
  fieldsRedacted: RedactionField[];
  revealedFields?: RedactionField[];
}

export interface StepDetails extends StepSummary {
  data: Record<string, unknown>;
  redaction?: RedactionInfo;
}

export interface TraceInsights {
  topLatencySteps: Array<{ stepId: string; name: string; durationMs: number }>;
  costByType: Record<string, number>;
  costByTool?: Record<string, number>;
  costByModel?: Record<string, number>;
  errors: number;
  retries: number;
  wallTimeMs: number;
  workTimeMs: number;
  timing?: {
    degraded: boolean;
    issues: string[];
    missingStepIds?: string[];
    skewedStepIds?: string[];
  };
  ioWarnings?: Array<{
    kind: string;
    message: string;
    stepId?: string;
    toolCallId?: string;
  }>;
  criticalPathMs?: number;
  concurrency?: {
    buckets: Array<{ startMs: number; endMs: number; active: number }>;
    peak: number;
  };
  retryPatterns?: {
    totalRetries: number;
    retryRate: number;
    topRetries: Array<{ stepId: string; count: number }>;
  };
}

export interface TraceQueryResult {
  query: string;
  matchedStepIds: string[];
  matchCount: number;
  clauses: Array<{ field: string; op: string; value: string }>;
  explain: string;
}

export interface InvestigationHypothesis {
  id: string;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  evidenceStepIds: string[];
}

export interface InvestigationReport {
  generatedAt: string;
  traceId: string;
  hypotheses: InvestigationHypothesis[];
}

export interface TraceComment {
  id: string;
  traceId: string;
  stepId: string;
  author: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface ExtensionDefinition {
  id: string;
  name: string;
  description: string;
}

export type GameplayRole = 'strategist' | 'operator' | 'analyst' | 'saboteur';

export interface GameplaySessionPlayer {
  player_id: string;
  role: GameplayRole;
  joined_at: string;
  cooldowns: Record<string, number>;
  presence: 'active' | 'idle';
}

export interface GameplayObjective {
  id: string;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface GameplayMission {
  id: string;
  title: string;
  difficulty: number;
  hazards: string[];
  reward_tokens: number;
  reward_materials: number;
}

export interface GameplayProfile {
  player_id: string;
  xp: number;
  level: number;
  skill_points: number;
  milestones?: string[];
  unlocked_skills: string[];
  loadout: string[];
  loadout_capacity: number;
  stats: Record<string, number>;
  modifiers: Record<string, Record<string, number>>;
}

export interface GameplaySession {
  id: string;
  name: string;
  trace_id: string;
  status: 'lobby' | 'running' | 'completed';
  seed: number;
  version: number;
  created_at: string;
  updated_at: string;
  players: GameplaySessionPlayer[];
  raid: {
    objectives: GameplayObjective[];
    completed: boolean;
  };
  campaign: {
    depth: number;
    lives: number;
    permadeath: boolean;
    modifiers: string[];
    unlocked_modifiers: string[];
    completed_missions: string[];
    current_mission: GameplayMission;
  };
  narrative: {
    current_node_id: string;
    history: Array<{ node_id: string; choice_id: string; at: string }>;
    tension: number;
    nodes: Record<
      string,
      { title: string; choices: Array<{ id: string; next: string; tension: number; modifier: string }> }
    >;
  };
  profiles: Record<string, GameplayProfile>;
  pvp: {
    round: number;
    operator_stability: number;
    sabotage_pressure: number;
    fog: number;
    winner: 'operator' | 'saboteur' | null;
  };
  time: {
    active_fork_id: string;
    forks: Array<{
      id: string;
      label: string;
      playhead_ms: number;
      history: number[];
      parent_fork_id: string | null;
    }>;
    audits: Array<Record<string, unknown>>;
  };
  boss: {
    name: string;
    phase: 1 | 2 | 3;
    hp: number;
    max_hp: number;
    enraged: boolean;
    adaptive_pattern: string;
    phase_mechanic?: string;
    vulnerability?: 'strike' | 'shield' | 'exploit';
  };
  director: {
    risk: number;
    skill_tier: string;
    hazard_bias: string;
    goal: string;
    hint: string;
  };
  economy: {
    tokens: number;
    materials: number;
    crafted: string[];
    ledger: Array<Record<string, unknown>>;
    ledger_count: number;
    inflation_index?: number;
    policy?: {
      target_reserve?: number;
      sink_threshold?: number;
      sink_rate?: number;
      reward_floor?: number;
      reward_ceiling?: number;
    };
  };
  rewards?: {
    daily_claimed_date?: string | null;
    streak_days?: number;
    session_claimed?: boolean;
    streak_claimed_for?: number;
    mastery_claims?: string[];
    history?: Array<{
      id: string;
      kind: string;
      amount: number;
      at: string;
      details?: Record<string, unknown>;
    }>;
  };
  guild: {
    guild_id: string | null;
    operations_score: number;
    events_completed: number;
  };
  cinematic: {
    events: Array<{
      id: string;
      type: string;
      message: string;
      intensity: number;
      camera_state: string;
      at: string;
    }>;
    camera_state: string;
  };
  liveops: {
    season: string;
    seed: number;
    week: number;
    tuning_history?: Array<{
      id: string;
      changed_at: string;
      difficultyFactor: number;
      rewardMultiplier: number;
      note: string;
      actor_player_id?: string;
    }>;
    challenge: {
      id: string;
      title: string;
      goal: number;
      reward: number;
      progress: number;
      completed: boolean;
    };
    telemetry: {
      sessionsStarted: number;
      sessionsCompleted: number;
      actionsApplied: number;
      challengeCompletions: number;
      difficultyFactor: number;
      rewardMultiplier?: number;
    };
  };
  safety?: {
    muted_player_ids: string[];
    blocked_player_ids: string[];
    reports: Array<{
      id: string;
      target_player_id: string;
      reason: string;
      created_at: string;
      reporter_player_id?: string;
    }>;
  };
  sandbox?: {
    enabled: boolean;
  };
  telemetry: {
    actions: number;
    successes: number;
    failures: number;
    avg_latency_ms: number;
    boss_damage_total: number;
  };
}

export interface GameplayGuild {
  id: string;
  name: string;
  owner_player_id: string;
  members: string[];
  member_count: number;
  operations_score: number;
  events: Array<{
    id: string;
    title: string;
    scheduled_at: string;
    status: string;
    created_at: string;
    completed_at?: string;
  }>;
  events_completed: number;
  scoreboard: Array<{ player_id: string; score: number }>;
  created_at: string;
}

export interface GameplayLiveOps {
  season: string;
  seed: number;
  week: number;
  tuning_history?: Array<{
    id: string;
    changed_at: string;
    difficultyFactor: number;
    rewardMultiplier: number;
    note: string;
    actor_player_id?: string;
  }>;
  challenge: {
    id: string;
    title: string;
    goal: number;
    reward: number;
    progress: number;
    completed: boolean;
  };
  telemetry: {
    sessionsStarted: number;
    sessionsCompleted: number;
    actionsApplied: number;
    challengeCompletions: number;
    difficultyFactor: number;
    rewardMultiplier?: number;
  };
}

export interface GameplayObservabilitySummary {
  generated_at: string;
  metrics: {
    total_sessions: number;
    running_sessions: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    failure_rate_pct: number;
    challenge_completion_rate_pct: number;
  };
  alerts: Array<{
    id: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    metric: string;
    threshold: number;
    value: number;
  }>;
}

export interface GameplayAnalyticsFunnelSummary {
  generated_at: string;
  funnels: {
    session_start: number;
    first_objective_progress: number;
    first_mission_outcome: number;
    run_outcome: number;
    win_outcome: number;
  };
  dropoff: {
    objective_dropoff: number;
    outcome_dropoff: number;
    resolution_dropoff: number;
  };
  retention: {
    cohort_size: number;
    d1_pct: number;
    d7_pct: number;
    d30_pct: number;
  };
}
