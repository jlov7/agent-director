export type RaidRole = 'strategist' | 'operator' | 'analyst' | 'saboteur';
export type PvPAction = 'sabotage' | 'stabilize' | 'scan';
export type BossAction = 'strike' | 'shield' | 'exploit';
export type CraftRecipeId = 'stability_patch' | 'precision_lens' | 'overclock_core';
export type CinematicEventType = 'critical' | 'success' | 'warning' | 'twist';
export type GameplayOutcomeStatus = 'in_progress' | 'win' | 'loss' | 'partial';

export type RaidObjective = {
  id: string;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
};

export type RaidState = {
  party: string[];
  roles: Record<string, RaidRole>;
  objectives: RaidObjective[];
  completed: boolean;
};

export type CampaignMission = {
  id: string;
  title: string;
  difficulty: number;
  hazards: string[];
  rewardCredits: number;
};

export type CampaignState = {
  depth: number;
  lives: number;
  currentMission: CampaignMission;
  completedMissionIds: string[];
  mutators: string[];
};

export type NarrativeChoice = {
  id: string;
  label: string;
  nextNodeId: string;
  tensionDelta: number;
  mutator: string;
};

export type NarrativeNode = {
  id: string;
  title: string;
  body: string;
  choices: NarrativeChoice[];
};

export type NarrativeState = {
  currentNodeId: string;
  nodes: NarrativeNode[];
  history: Array<{ nodeId: string; choiceId: string }>;
  tension: number;
};

export type SkillNode = {
  id: string;
  label: string;
  cost: number;
  requires: string[];
  minLevel: number;
  requiredMilestones: string[];
  tier: 1 | 2 | 3;
  loadoutSlot: 'core' | 'utility' | 'power';
  unlocked: boolean;
};

export type SkillTreeState = {
  points: number;
  nodes: SkillNode[];
  loadout: {
    capacity: number;
    equipped: string[];
    slotCaps: {
      core: number;
      utility: number;
      power: number;
    };
  };
};

export type SkillRuleCheck = {
  allowed: boolean;
  reason: string;
};

export type RewardRuleCheck = {
  allowed: boolean;
  reason: string;
};

export type PvPState = {
  round: number;
  stability: number;
  sabotage: number;
  fog: number;
  winner: 'operator' | 'saboteur' | null;
};

export type TimeFork = {
  id: string;
  label: string;
  playheadMs: number;
  history: number[];
};

export type TimeState = {
  activeForkId: string;
  forks: TimeFork[];
};

export type BossState = {
  name: string;
  phase: 1 | 2 | 3;
  hp: number;
  maxHp: number;
  enraged: boolean;
  phaseMechanic: string;
  vulnerability: BossAction;
};

export type DirectorState = {
  risk: number;
  hint: string;
  recommendedModifier: string;
  lastOutcome: 'success' | 'failure' | 'mixed';
};

export type EconomyState = {
  credits: number;
  materials: number;
  crafted: string[];
  inflationIndex: number;
  reserveTarget: number;
};

export type CadenceRewardKind = 'daily' | 'session' | 'streak' | 'mastery';

export type RewardHistoryEntry = {
  id: string;
  kind: CadenceRewardKind;
  amount: number;
  at: number;
  details?: Record<string, string | number>;
};

export type RewardsState = {
  dailyClaimedOn: string | null;
  streakDays: number;
  sessionClaimed: boolean;
  streakClaimedFor: number;
  masteryClaims: string[];
  history: RewardHistoryEntry[];
};

export type GuildState = {
  name: string;
  members: number;
  operationsScore: number;
  eventsCompleted: number;
};

export type CinematicEvent = {
  id: string;
  type: CinematicEventType;
  message: string;
  intensity: 1 | 2 | 3;
  at: number;
};

export type CinematicState = {
  queue: CinematicEvent[];
};

export type LiveOpsChallenge = {
  id: string;
  title: string;
  goal: number;
  progress: number;
  rewardCredits: number;
  completed: boolean;
};

export type LiveOpsTuningEntry = {
  id: string;
  changedAt: number;
  difficultyFactor: number;
  rewardMultiplier: number;
  note: string;
};

export type LiveOpsState = {
  season: string;
  week: number;
  challenge: LiveOpsChallenge;
  difficultyFactor: number;
  rewardMultiplier: number;
  tuningHistory: LiveOpsTuningEntry[];
};

export type SafetyReport = {
  id: string;
  targetPlayerId: string;
  reason: string;
  createdAt: number;
};

export type SafetyState = {
  mutedPlayerIds: string[];
  blockedPlayerIds: string[];
  reports: SafetyReport[];
};

export type OutcomeState = {
  status: GameplayOutcomeStatus;
  reason: string;
  updatedAt: number;
};

export type SandboxState = {
  enabled: boolean;
};

export type ProgressionState = {
  xp: number;
  level: number;
  nextLevelXp: number;
  milestones: string[];
};

export const DIFFICULTY_RAMP_TABLE: Array<{ minDepth: number; maxDepth: number; difficulty: number }> = [
  { minDepth: 1, maxDepth: 1, difficulty: 1 },
  { minDepth: 2, maxDepth: 3, difficulty: 2 },
  { minDepth: 4, maxDepth: 5, difficulty: 3 },
  { minDepth: 6, maxDepth: 7, difficulty: 4 },
  { minDepth: 8, maxDepth: 9, difficulty: 5 },
  { minDepth: 10, maxDepth: 12, difficulty: 6 },
  { minDepth: 13, maxDepth: 16, difficulty: 7 },
  { minDepth: 17, maxDepth: 20, difficulty: 8 },
  { minDepth: 21, maxDepth: 24, difficulty: 9 },
  { minDepth: 25, maxDepth: Number.MAX_SAFE_INTEGER, difficulty: 10 },
];

export type GameplayState = {
  seed: number;
  raid: RaidState;
  campaign: CampaignState;
  narrative: NarrativeState;
  skills: SkillTreeState;
  pvp: PvPState;
  time: TimeState;
  boss: BossState;
  director: DirectorState;
  economy: EconomyState;
  rewards: RewardsState;
  guild: GuildState;
  cinematic: CinematicState;
  liveops: LiveOpsState;
  safety: SafetyState;
  outcome: OutcomeState;
  sandbox: SandboxState;
  progression: ProgressionState;
};

const HAZARD_POOL = [
  'latency storm',
  'cache divergence',
  'tool timeout chain',
  'stale prompt vector',
  'schema mismatch surge',
];

const LIVEOPS_CATALOG: Array<Omit<LiveOpsChallenge, 'progress' | 'completed'>> = [
  { id: 'seasonal-incident-sprint', title: 'Resolve 3 raid objectives', goal: 3, rewardCredits: 120 },
  { id: 'boss-shutdown', title: 'Defeat one boss encounter', goal: 1, rewardCredits: 200 },
  { id: 'guild-push', title: 'Complete 2 guild operations', goal: 2, rewardCredits: 160 },
  { id: 'timeline-weaver', title: 'Merge 2 timeline forks', goal: 2, rewardCredits: 150 },
];

const RECIPES: Record<CraftRecipeId, { credits: number; materials: number }> = {
  stability_patch: { credits: 20, materials: 12 },
  precision_lens: { credits: 28, materials: 16 },
  overclock_core: { credits: 42, materials: 24 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(source: string) {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 100_000;
  }
  return hash;
}

function missionFromDepth(seed: number, depth: number, mutators: string[]): CampaignMission {
  const hazardA = HAZARD_POOL[(seed + depth) % HAZARD_POOL.length] as string;
  const hazardB = HAZARD_POOL[(seed + depth + 2) % HAZARD_POOL.length] as string;
  return {
    id: `mission-${depth}-${(seed + depth) % 997}`,
    title: `Scenario Depth ${depth}`,
    difficulty: difficultyForDepth(depth),
    hazards: [hazardA, hazardB, ...mutators.slice(-1)],
    rewardCredits: 60 + depth * 15,
  };
}

export function difficultyForDepth(depth: number): number {
  const normalized = Math.max(1, Math.floor(depth));
  return (
    DIFFICULTY_RAMP_TABLE.find((band) => normalized >= band.minDepth && normalized <= band.maxDepth)?.difficulty ?? 10
  );
}

function buildNarrativeNodes(): NarrativeNode[] {
  return [
    {
      id: 'node-alpha',
      title: 'Signal Fracture',
      body: 'Telemetry divergence emerges across parallel tool paths.',
      choices: [
        {
          id: 'alpha-risk',
          label: 'Push aggressive branch optimization',
          nextNodeId: 'node-beta',
          tensionDelta: 12,
          mutator: 'risk-surge',
        },
        {
          id: 'alpha-safe',
          label: 'Stabilize and preserve deterministic flow',
          nextNodeId: 'node-beta',
          tensionDelta: -5,
          mutator: 'stability-first',
        },
      ],
    },
    {
      id: 'node-beta',
      title: 'Protocol Fork',
      body: 'The team must choose speed versus interpretability under pressure.',
      choices: [
        {
          id: 'beta-speed',
          label: 'Favor speed and absorb uncertainty',
          nextNodeId: 'node-gamma',
          tensionDelta: 8,
          mutator: 'throughput-boost',
        },
        {
          id: 'beta-clarity',
          label: 'Favor clarity and route through guardrails',
          nextNodeId: 'node-gamma',
          tensionDelta: -3,
          mutator: 'clarity-path',
        },
      ],
    },
    {
      id: 'node-gamma',
      title: 'Final Directive',
      body: 'Command has one move left before the run locks in.',
      choices: [
        {
          id: 'gamma-strike',
          label: 'Launch decisive strike sequence',
          nextNodeId: 'node-alpha',
          tensionDelta: 10,
          mutator: 'strike-loop',
        },
        {
          id: 'gamma-reset',
          label: 'Reset tempo and rebuild confidence',
          nextNodeId: 'node-alpha',
          tensionDelta: -6,
          mutator: 'tempo-reset',
        },
      ],
    },
  ];
}

function challengeForWeek(seed: number, week: number): LiveOpsChallenge {
  const base = LIVEOPS_CATALOG[(seed + week) % LIVEOPS_CATALOG.length] as Omit<
    LiveOpsChallenge,
    'progress' | 'completed'
  >;
  return {
    ...base,
    progress: 0,
    completed: false,
  };
}

function applyMissionMutator(mutators: string[], nextMutator: string): string[] {
  const merged = [...mutators, nextMutator];
  return Array.from(new Set(merged)).slice(-6);
}

function withCampaignMission(state: GameplayState, depth: number, mutators: string[]) {
  return {
    ...state,
    campaign: {
      ...state.campaign,
      depth,
      mutators,
      currentMission: missionFromDepth(state.seed, depth, mutators),
    },
  };
}

export function createInitialGameplayState(seedSource: string): GameplayState {
  const seed = hashSeed(seedSource);
  const mutators = ['baseline'];
  return {
    seed,
    raid: {
      party: ['director'],
      roles: { director: 'strategist' },
      objectives: [
        { id: 'obj-root-cause', label: 'Identify root cause chain', progress: 0, target: 100, completed: false },
        { id: 'obj-recover', label: 'Recover operational stability', progress: 0, target: 100, completed: false },
        { id: 'obj-harden', label: 'Harden replay strategy', progress: 0, target: 100, completed: false },
      ],
      completed: false,
    },
    campaign: {
      depth: 1,
      lives: 3,
      completedMissionIds: [],
      mutators,
      currentMission: missionFromDepth(seed, 1, mutators),
    },
    narrative: {
      currentNodeId: 'node-alpha',
      nodes: buildNarrativeNodes(),
      history: [],
      tension: 35,
    },
    skills: {
      points: 6,
      nodes: [
        {
          id: 'skill-focus',
          label: 'Focus Matrix',
          cost: 1,
          requires: [],
          minLevel: 1,
          requiredMilestones: [],
          tier: 1,
          loadoutSlot: 'core',
          unlocked: false,
        },
        {
          id: 'skill-resilience',
          label: 'Resilience Mesh',
          cost: 1,
          requires: [],
          minLevel: 1,
          requiredMilestones: [],
          tier: 1,
          loadoutSlot: 'utility',
          unlocked: false,
        },
        {
          id: 'skill-surge',
          label: 'Surge Compiler',
          cost: 2,
          requires: ['skill-focus'],
          minLevel: 2,
          requiredMilestones: [],
          tier: 2,
          loadoutSlot: 'power',
          unlocked: false,
        },
        {
          id: 'skill-echo',
          label: 'Echo Anticipator',
          cost: 2,
          requires: ['skill-resilience'],
          minLevel: 2,
          requiredMilestones: [],
          tier: 2,
          loadoutSlot: 'utility',
          unlocked: false,
        },
        {
          id: 'skill-ward',
          label: 'Ward Lattice',
          cost: 2,
          requires: ['skill-resilience'],
          minLevel: 3,
          requiredMilestones: ['milestone-level-3'],
          tier: 3,
          loadoutSlot: 'power',
          unlocked: false,
        },
        {
          id: 'skill-overclock',
          label: 'Overclock Nexus',
          cost: 3,
          requires: ['skill-surge', 'skill-echo'],
          minLevel: 4,
          requiredMilestones: ['milestone-level-3'],
          tier: 3,
          loadoutSlot: 'power',
          unlocked: false,
        },
      ],
      loadout: {
        capacity: 3,
        equipped: [],
        slotCaps: {
          core: 1,
          utility: 1,
          power: 1,
        },
      },
    },
    pvp: {
      round: 0,
      stability: 72,
      sabotage: 28,
      fog: 40,
      winner: null,
    },
    time: {
      activeForkId: 'primary',
      forks: [{ id: 'primary', label: 'Primary timeline', playheadMs: 0, history: [0] }],
    },
    boss: {
      name: 'The Causality Hydra',
      phase: 1,
      hp: 320,
      maxHp: 320,
      enraged: false,
      phaseMechanic: 'Phase 1: Shield lattice destabilization',
      vulnerability: 'exploit',
    },
    director: {
      risk: 30,
      hint: 'Start with the bottleneck path and branch cautiously.',
      recommendedModifier: 'stability_patch',
      lastOutcome: 'mixed',
    },
    economy: {
      credits: 140,
      materials: 90,
      crafted: [],
      inflationIndex: 0.438,
      reserveTarget: 320,
    },
    rewards: {
      dailyClaimedOn: null,
      streakDays: 0,
      sessionClaimed: false,
      streakClaimedFor: 0,
      masteryClaims: [],
      history: [],
    },
    guild: {
      name: 'Trace Guild',
      members: 4,
      operationsScore: 0,
      eventsCompleted: 0,
    },
    cinematic: {
      queue: [],
    },
    liveops: {
      season: `Season-${2026 + (seed % 2)}`,
      week: 1,
      challenge: challengeForWeek(seed, 1),
      difficultyFactor: 1,
      rewardMultiplier: 1,
      tuningHistory: [],
    },
    safety: {
      mutedPlayerIds: [],
      blockedPlayerIds: [],
      reports: [],
    },
    outcome: {
      status: 'in_progress',
      reason: 'Run started. Complete missions and stabilize the incident.',
      updatedAt: Date.now(),
    },
    sandbox: {
      enabled: false,
    },
    progression: {
      xp: 0,
      level: 1,
      nextLevelXp: 200,
      milestones: [],
    },
  };
}

export function setSandboxMode(state: GameplayState, enabled: boolean): GameplayState {
  return {
    ...state,
    sandbox: {
      enabled,
    },
    outcome: enabled
      ? {
          status: 'in_progress',
          reason: 'Sandbox mode enabled. Penalties are disabled for safe practice runs.',
          updatedAt: Date.now(),
        }
      : state.outcome,
  };
}

export function joinRaid(state: GameplayState, member: string, role: RaidRole): GameplayState {
  if (!member.trim()) return state;
  const party = state.raid.party.includes(member) ? state.raid.party : [...state.raid.party, member];
  return {
    ...state,
    raid: {
      ...state.raid,
      party,
      roles: { ...state.raid.roles, [member]: role },
    },
  };
}

export function advanceRaidObjective(state: GameplayState, objectiveId: string, delta: number): GameplayState {
  const currentOutcome = readOutcomeState(state);
  const objectives = state.raid.objectives.map((objective) => {
    if (objective.id !== objectiveId) return objective;
    const progress = clamp(objective.progress + delta, 0, objective.target);
    return {
      ...objective,
      progress,
      completed: progress >= objective.target,
    };
  });
  const completed = objectives.every((objective) => objective.completed);
  const completionReward = completed && !state.raid.completed ? 180 : 0;
  const nextState: GameplayState = {
    ...state,
    raid: {
      ...state.raid,
      objectives,
      completed,
    },
    outcome:
      completed && !state.raid.completed
        ? {
            status: 'partial',
            reason: 'Raid objectives completed. Push campaign and boss tracks to close the run.',
            updatedAt: Date.now(),
          }
        : currentOutcome,
  };
  if (!completed || state.raid.completed) return nextState;
  return grantProgressionXp(applyCreditReward(nextState, completionReward), 60);
}

export function completeCampaignMission(state: GameplayState, success: boolean): GameplayState {
  const sandbox = readSandboxState(state);
  const current = state.campaign.currentMission;
  if (success) {
    const depth = state.campaign.depth + 1;
    const withMission = withCampaignMission(state, depth, state.campaign.mutators);
    const outcome: OutcomeState =
      depth >= 5
        ? {
            status: 'win',
            reason: 'Campaign depth target reached. Incident run is stabilized.',
            updatedAt: Date.now(),
          }
        : {
            status: 'partial',
            reason: `Mission ${current.id} cleared. Advance deeper to secure the run.`,
            updatedAt: Date.now(),
          };
    const nextState: GameplayState = {
      ...withMission,
      campaign: {
        ...withMission.campaign,
        completedMissionIds: [...withMission.campaign.completedMissionIds, current.id],
      },
      economy: {
        ...withMission.economy,
        materials: withMission.economy.materials + 14,
      },
      director: {
        ...withMission.director,
        lastOutcome: 'success',
      },
      outcome,
    };
    return grantProgressionXp(applyCreditReward(nextState, current.rewardCredits), 120);
  }

  const lives = sandbox.enabled ? state.campaign.lives : clamp(state.campaign.lives - 1, 0, 3);
  const withMission = withCampaignMission(state, state.campaign.depth, applyMissionMutator(state.campaign.mutators, 'failure-loop'));
  const outcome: OutcomeState =
    sandbox.enabled
      ? {
          status: 'partial',
          reason: 'Sandbox mode active. Failure recorded with no life penalty.',
          updatedAt: Date.now(),
        }
      : lives <= 0
      ? {
          status: 'loss',
          reason: 'No campaign lives remaining. Incident run failed.',
          updatedAt: Date.now(),
        }
      : {
          status: 'partial',
          reason: `Mission failed. ${lives} campaign lives remaining.`,
          updatedAt: Date.now(),
        };
  const nextState: GameplayState = {
    ...withMission,
    campaign: {
      ...withMission.campaign,
      lives,
    },
    director: {
      ...withMission.director,
      lastOutcome: 'failure',
    },
    outcome,
  };
  return grantProgressionXp(nextState, 40);
}

export function applyNarrativeChoice(state: GameplayState, choiceId: string): GameplayState {
  const node = state.narrative.nodes.find((item) => item.id === state.narrative.currentNodeId);
  const choice = node?.choices.find((item) => item.id === choiceId);
  if (!node || !choice) return state;
  const tension = clamp(state.narrative.tension + choice.tensionDelta, 0, 100);
  const mutators = applyMissionMutator(state.campaign.mutators, choice.mutator);
  const withMission = withCampaignMission(state, state.campaign.depth, mutators);
  return {
    ...withMission,
    narrative: {
      ...withMission.narrative,
      currentNodeId: choice.nextNodeId,
      history: [...withMission.narrative.history, { nodeId: node.id, choiceId: choice.id }],
      tension,
    },
  };
}

export function unlockSkillNode(state: GameplayState, nodeId: string): GameplayState {
  const node = state.skills.nodes.find((item) => item.id === nodeId);
  if (!node) return state;
  const check = evaluateSkillUnlock(state, nodeId);
  if (!check.allowed) return state;

  return {
    ...state,
    skills: {
      ...state.skills,
      points: state.skills.points - node.cost,
      nodes: state.skills.nodes.map((item) => (item.id === nodeId ? { ...item, unlocked: true } : item)),
    },
  };
}

export function equipLoadoutSkill(state: GameplayState, nodeId: string): GameplayState {
  const check = evaluateSkillEquip(state, nodeId);
  if (!check.allowed) return state;
  return {
    ...state,
    skills: {
      ...state.skills,
      loadout: {
        ...state.skills.loadout,
        equipped: [...state.skills.loadout.equipped, nodeId],
      },
    },
  };
}

export function evaluateSkillUnlock(state: GameplayState, nodeId: string): SkillRuleCheck {
  const node = state.skills.nodes.find((item) => item.id === nodeId);
  if (!node) return { allowed: false, reason: 'Unknown skill node.' };
  if (node.unlocked) return { allowed: false, reason: 'Skill already unlocked.' };
  const unlocked = new Set(state.skills.nodes.filter((item) => item.unlocked).map((item) => item.id));
  const missingPrerequisites = node.requires.filter((id) => !unlocked.has(id));
  if (missingPrerequisites.length > 0) {
    return { allowed: false, reason: `Requires: ${missingPrerequisites.join(', ')}` };
  }
  const progression = readProgressionState(state);
  if (progression.level < node.minLevel) {
    return { allowed: false, reason: `Requires level ${node.minLevel}` };
  }
  const missingMilestones = node.requiredMilestones.filter((milestone) => !progression.milestones.includes(milestone));
  if (missingMilestones.length > 0) {
    return { allowed: false, reason: `Requires milestone ${missingMilestones[0]}` };
  }
  if (state.skills.points < node.cost) {
    return { allowed: false, reason: `Need ${node.cost} points` };
  }
  return { allowed: true, reason: 'Unlock available' };
}

export function evaluateSkillEquip(state: GameplayState, nodeId: string): SkillRuleCheck {
  const node = state.skills.nodes.find((item) => item.id === nodeId);
  if (!node) return { allowed: false, reason: 'Unknown skill node.' };
  if (!node.unlocked) return { allowed: false, reason: 'Unlock required before equip.' };
  if (state.skills.loadout.equipped.includes(nodeId)) return { allowed: false, reason: 'Already equipped.' };
  if (state.skills.loadout.equipped.length >= state.skills.loadout.capacity) {
    return { allowed: false, reason: 'Loadout capacity reached.' };
  }
  const slotCap = state.skills.loadout.slotCaps[node.loadoutSlot];
  const equippedInSlot = state.skills.loadout.equipped.reduce((count, equippedId) => {
    const equippedNode = state.skills.nodes.find((item) => item.id === equippedId);
    return equippedNode?.loadoutSlot === node.loadoutSlot ? count + 1 : count;
  }, 0);
  if (equippedInSlot >= slotCap) {
    return { allowed: false, reason: `${node.loadoutSlot} slot limit reached.` };
  }
  return { allowed: true, reason: 'Equip available' };
}

export function runPvPRound(state: GameplayState, action: PvPAction): GameplayState {
  const currentOutcome = readOutcomeState(state);
  const next = { ...state.pvp };
  if (action === 'sabotage') {
    next.sabotage = clamp(next.sabotage + 13, 0, 100);
    next.stability = clamp(next.stability - 11, 0, 100);
    next.fog = clamp(next.fog + 9, 0, 100);
  } else if (action === 'stabilize') {
    next.stability = clamp(next.stability + 14, 0, 100);
    next.sabotage = clamp(next.sabotage - 8, 0, 100);
    next.fog = clamp(next.fog - 6, 0, 100);
  } else {
    next.fog = clamp(next.fog - 16, 0, 100);
    next.stability = clamp(next.stability + 3, 0, 100);
    next.sabotage = clamp(next.sabotage - 4, 0, 100);
  }
  next.round += 1;
  if (next.stability <= 0) next.winner = 'saboteur';
  else if (next.sabotage <= 0) next.winner = 'operator';
  else if (next.round >= 10) next.winner = next.stability >= next.sabotage ? 'operator' : 'saboteur';
  const outcome: OutcomeState =
    next.winner === 'operator'
      ? {
          status: 'win',
          reason: 'Operator side prevailed in the sabotage conflict.',
          updatedAt: Date.now(),
        }
      : next.winner === 'saboteur'
        ? {
            status: 'loss',
            reason: 'Saboteur pressure overwhelmed system stability.',
            updatedAt: Date.now(),
          }
        : currentOutcome;
  const nextState: GameplayState = { ...state, pvp: next, outcome };
  return grantProgressionXp(nextState, next.winner ? 72 : 12);
}

export function createTimeFork(state: GameplayState, label: string, playheadMs: number): GameplayState {
  const id = `fork-${state.time.forks.length + 1}`;
  const fork: TimeFork = {
    id,
    label: label.trim() || id,
    playheadMs: clamp(playheadMs, 0, 3_600_000),
    history: [clamp(playheadMs, 0, 3_600_000)],
  };
  const nextState: GameplayState = {
    ...state,
    time: {
      ...state.time,
      activeForkId: id,
      forks: [...state.time.forks, fork],
    },
  };
  return nextState;
}

export function rewindActiveFork(state: GameplayState, amountMs: number): GameplayState {
  const activeId = state.time.activeForkId;
  const forks = state.time.forks.map((fork) => {
    if (fork.id !== activeId) return fork;
    const playheadMs = clamp(fork.playheadMs - Math.abs(amountMs), 0, 3_600_000);
    return {
      ...fork,
      playheadMs,
      history: [...fork.history, playheadMs],
    };
  });
  return {
    ...state,
    time: {
      ...state.time,
      forks,
    },
  };
}

export function mergeForkIntoPrimary(state: GameplayState, forkId: string): GameplayState {
  if (forkId === 'primary') return state;
  const source = state.time.forks.find((fork) => fork.id === forkId);
  const primary = state.time.forks.find((fork) => fork.id === 'primary');
  if (!source || !primary) return state;
  const mergedPrimary: TimeFork = {
    ...primary,
    playheadMs: source.playheadMs,
    history: [...primary.history, source.playheadMs],
  };
  return {
    ...state,
    time: {
      activeForkId: 'primary',
      forks: [mergedPrimary, ...state.time.forks.filter((fork) => fork.id !== 'primary' && fork.id !== forkId)],
    },
  };
}

export function applyBossAction(state: GameplayState, action: BossAction): GameplayState {
  const currentOutcome = readOutcomeState(state);
  const phaseDamage: Record<1 | 2 | 3, Record<BossAction, number>> = {
    1: { exploit: 42, strike: 24, shield: 8 },
    2: { exploit: 34, strike: 28, shield: 10 },
    3: { exploit: 26, strike: 18, shield: 14 },
  };
  const baseDamage = phaseDamage[state.boss.phase][action];
  const vulnerabilityBonus = state.boss.vulnerability === action ? 8 : 0;
  const damage = baseDamage + vulnerabilityBonus;
  const hp = clamp(state.boss.hp - damage, 0, state.boss.maxHp);
  const ratio = hp / state.boss.maxHp;
  const phase: 1 | 2 | 3 = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
  const phaseMechanic =
    phase === 1
      ? 'Phase 1: Shield lattice destabilization'
      : phase === 2
        ? 'Phase 2: Mirror clones absorb exploit damage'
        : 'Phase 3: Enrage pulse; shield counters become lethal';
  const vulnerability: BossAction = phase === 1 ? 'exploit' : phase === 2 ? 'strike' : 'shield';
  const nextState: GameplayState = {
    ...state,
    boss: {
      ...state.boss,
      hp,
      phase,
      enraged: phase === 3 || hp <= state.boss.maxHp * 0.2,
      phaseMechanic,
      vulnerability,
    },
    outcome:
      hp <= 0
        ? {
            status: 'win',
            reason: 'Boss encounter cleared. Run secured.',
            updatedAt: Date.now(),
          }
        : currentOutcome,
  };
  return grantProgressionXp(nextState, hp <= 0 ? 180 : 10);
}

export function generateAdaptiveDirectorUpdate(
  state: GameplayState,
  inputs: { failures: number; latencyMs: number; retries: number }
): GameplayState {
  const riskDelta = inputs.failures * 12 + inputs.retries * 4 + (inputs.latencyMs > 1400 ? 8 : 0);
  const risk = clamp(state.director.risk + riskDelta, 0, 100);
  const hint =
    inputs.failures > 0
      ? 'Prioritize failure triage and run a stabilizing replay branch.'
      : inputs.latencyMs > 1400
        ? 'Latency pressure detected. Reduce fan-out and tighten tool boundaries.'
        : 'Momentum is stable. Push a high-confidence optimization branch.';
  const recommendedModifier =
    inputs.failures > 1 ? 'stability_patch' : inputs.latencyMs > 1400 ? 'precision_lens' : 'overclock_core';
  const lastOutcome: 'success' | 'failure' | 'mixed' = inputs.failures > 0 ? 'failure' : 'success';
  return {
    ...state,
    director: {
      risk,
      hint,
      recommendedModifier,
      lastOutcome,
    },
  };
}

export function craftUpgrade(state: GameplayState, recipeId: CraftRecipeId): GameplayState {
  const recipe = RECIPES[recipeId];
  if (!recipe) return state;
  if (state.economy.credits < recipe.credits || state.economy.materials < recipe.materials) return state;
  const crafted = state.economy.crafted.includes(recipeId) ? state.economy.crafted : [...state.economy.crafted, recipeId];
  const reserveTarget = state.economy.reserveTarget || 320;
  const nextCredits = state.economy.credits - recipe.credits;
  let nextState: GameplayState = {
    ...state,
    economy: {
      ...state.economy,
      credits: nextCredits,
      materials: state.economy.materials - recipe.materials,
      crafted,
      inflationIndex: Number((nextCredits / reserveTarget).toFixed(3)),
    },
  };
  if (recipeId === 'stability_patch') {
    nextState = {
      ...nextState,
      pvp: { ...nextState.pvp, stability: clamp(nextState.pvp.stability + 8, 0, 100) },
    };
  }
  if (recipeId === 'precision_lens') {
    nextState = {
      ...nextState,
      raid: {
        ...nextState.raid,
        objectives: nextState.raid.objectives.map((objective, index) =>
          index === 0
            ? {
                ...objective,
                progress: clamp(objective.progress + 10, 0, objective.target),
                completed: clamp(objective.progress + 10, 0, objective.target) >= objective.target,
              }
            : objective
        ),
      },
    };
  }
  if (recipeId === 'overclock_core') {
    nextState = {
      ...nextState,
      boss: {
        ...nextState.boss,
        hp: clamp(nextState.boss.hp - 16, 0, nextState.boss.maxHp),
      },
    };
  }
  return grantProgressionXp(nextState, 10);
}

export function advanceGuildOperation(state: GameplayState, impact: number): GameplayState {
  const normalizedImpact = Math.round(impact);
  const nextState: GameplayState = {
    ...state,
    guild: {
      ...state.guild,
      operationsScore: state.guild.operationsScore + normalizedImpact,
      eventsCompleted: state.guild.eventsCompleted + (normalizedImpact > 0 ? 1 : 0),
    },
  };
  const withReward = normalizedImpact > 0 ? applyCreditReward(nextState, normalizedImpact * 3) : nextState;
  return grantProgressionXp(withReward, Math.max(0, normalizedImpact * 6));
}

export function pushCinematicEvent(
  state: GameplayState,
  type: CinematicEventType,
  message: string,
  intensity: 1 | 2 | 3
): GameplayState {
  const event: CinematicEvent = {
    id: `event-${state.cinematic.queue.length + 1}-${state.seed % 1000}`,
    type,
    message,
    intensity,
    at: Date.now(),
  };
  return {
    ...state,
    cinematic: {
      queue: [event, ...state.cinematic.queue].slice(0, 12),
    },
  };
}

export function advanceLiveOpsWeek(state: GameplayState): GameplayState {
  const liveops = readLiveOpsState(state);
  const week = liveops.week + 1;
  const challengeSeed = challengeForWeek(state.seed, week);
  const difficultyFactor = clamp(liveops.difficultyFactor ?? 1, 0.6, 1.6);
  const rewardMultiplier = clamp(liveops.rewardMultiplier ?? 1, 0.5, 2);
  const challenge = {
    ...challengeSeed,
    goal: Math.max(1, Math.round(challengeSeed.goal * difficultyFactor)),
    rewardCredits: Math.max(1, Math.round(challengeSeed.rewardCredits * rewardMultiplier)),
  };
  const nextState: GameplayState = {
    ...state,
    liveops: {
      ...liveops,
      week,
      challenge,
    },
  };
  return applyWeeklyEconomySink(nextState);
}

export function progressLiveOpsChallenge(state: GameplayState, delta: number): GameplayState {
  const liveops = readLiveOpsState(state);
  const challenge = liveops.challenge;
  const normalizedDelta = clamp(delta, 0, 20);
  const progress = clamp(challenge.progress + normalizedDelta, 0, challenge.goal);
  const completed = progress >= challenge.goal;
  const nextState: GameplayState = {
    ...state,
    liveops: {
      ...liveops,
      challenge: {
        ...challenge,
        progress,
        completed,
      },
    },
  };
  if (!completed || challenge.completed) return nextState;
  return grantProgressionXp(applyCreditReward(nextState, challenge.rewardCredits), 80);
}

export function evaluateCadenceReward(
  state: GameplayState,
  kind: CadenceRewardKind,
  masteryId: 'raid_mastery' | 'campaign_mastery' | 'boss_mastery' = 'raid_mastery'
): RewardRuleCheck {
  const rewards = readRewardsState(state);
  const today = new Date().toISOString().slice(0, 10);
  if (kind === 'daily') {
    if (rewards.dailyClaimedOn === today) return { allowed: false, reason: 'Daily reward already claimed today.' };
    return { allowed: true, reason: 'Daily reward available.' };
  }
  if (kind === 'session') {
    if (rewards.sessionClaimed) return { allowed: false, reason: 'Session reward already claimed.' };
    const sessionEligible =
      state.raid.objectives.some((objective) => objective.progress > 0) || state.campaign.depth > 1 || state.pvp.round > 0;
    if (!sessionEligible) return { allowed: false, reason: 'Session reward requires gameplay activity.' };
    return { allowed: true, reason: 'Session reward available.' };
  }
  if (kind === 'streak') {
    if (rewards.streakDays < 3) return { allowed: false, reason: 'Streak reward requires 3+ daily claims.' };
    if (rewards.streakClaimedFor >= rewards.streakDays) {
      return { allowed: false, reason: 'Streak reward already claimed for current streak.' };
    }
    return { allowed: true, reason: 'Streak reward available.' };
  }
  if (rewards.masteryClaims.includes(masteryId)) return { allowed: false, reason: 'Mastery reward already claimed.' };
  const masteryReady =
    masteryId === 'raid_mastery'
      ? state.raid.completed
      : masteryId === 'campaign_mastery'
        ? state.campaign.depth >= 4
        : state.boss.hp <= 0;
  if (!masteryReady) return { allowed: false, reason: 'Mastery requirement not met.' };
  return { allowed: true, reason: 'Mastery reward available.' };
}

export function claimCadenceReward(
  state: GameplayState,
  kind: CadenceRewardKind,
  masteryId: 'raid_mastery' | 'campaign_mastery' | 'boss_mastery' = 'raid_mastery'
): GameplayState {
  const check = evaluateCadenceReward(state, kind, masteryId);
  if (!check.allowed) return state;
  const rewards = readRewardsState(state);
  const today = new Date().toISOString().slice(0, 10);
  let nextRewards: RewardsState = rewards;
  let baseCredits = 0;
  let details: RewardHistoryEntry['details'] = {};
  if (kind === 'daily') {
    const streakDays = rewards.dailyClaimedOn === today ? rewards.streakDays : rewards.streakDays + 1;
    nextRewards = {
      ...rewards,
      dailyClaimedOn: today,
      streakDays,
    };
    baseCredits = 90 + Math.min(7, streakDays) * 10;
    details = { streakDays };
  } else if (kind === 'session') {
    nextRewards = {
      ...rewards,
      sessionClaimed: true,
    };
    baseCredits = 140;
    details = { actions: state.pvp.round + state.narrative.history.length + state.campaign.depth };
  } else if (kind === 'streak') {
    nextRewards = {
      ...rewards,
      streakClaimedFor: rewards.streakDays,
    };
    baseCredits = 170 + rewards.streakDays * 5;
    details = { streakDays: rewards.streakDays };
  } else {
    nextRewards = {
      ...rewards,
      masteryClaims: [...rewards.masteryClaims, masteryId],
    };
    baseCredits = masteryId === 'boss_mastery' ? 260 : masteryId === 'campaign_mastery' ? 220 : 180;
    details = { masteryId };
  }
  const nextState = applyCreditReward({ ...state, rewards: nextRewards }, baseCredits);
  const awarded = Math.max(1, nextState.economy.credits - state.economy.credits);
  const entry: RewardHistoryEntry = {
    id: `reward-${nextRewards.history.length + 1}-${state.seed % 1000}`,
    kind,
    amount: awarded,
    at: Date.now(),
    details,
  };
  return grantProgressionXp(
    {
      ...nextState,
      rewards: {
        ...nextRewards,
        history: [entry, ...nextRewards.history].slice(0, 60),
      },
    },
    30 + Math.max(1, Math.round(awarded / 10))
  );
}

export function applyLiveOpsBalancing(
  state: GameplayState,
  inputs: { difficultyFactor: number; rewardMultiplier: number; note: string }
): GameplayState {
  const liveops = readLiveOpsState(state);
  const nextDifficulty = clamp(inputs.difficultyFactor, 0.6, 1.6);
  const nextReward = clamp(inputs.rewardMultiplier, 0.5, 2);
  const currentDifficulty = liveops.difficultyFactor || 1;
  const currentReward = liveops.rewardMultiplier || 1;
  const note = inputs.note.trim() || 'Operator tuning update';
  const tunedChallenge: LiveOpsChallenge = {
    ...liveops.challenge,
    goal: Math.max(1, Math.round((liveops.challenge.goal / currentDifficulty) * nextDifficulty)),
    rewardCredits: Math.max(1, Math.round((liveops.challenge.rewardCredits / currentReward) * nextReward)),
  };
  const tuningEntry: LiveOpsTuningEntry = {
    id: `tuning-${liveops.tuningHistory.length + 1}-${state.seed % 1000}`,
    changedAt: Date.now(),
    difficultyFactor: nextDifficulty,
    rewardMultiplier: nextReward,
    note,
  };
  return {
    ...state,
    liveops: {
      ...liveops,
      challenge: tunedChallenge,
      difficultyFactor: nextDifficulty,
      rewardMultiplier: nextReward,
      tuningHistory: [tuningEntry, ...liveops.tuningHistory].slice(0, 20),
    },
  };
}

function applyCreditReward(state: GameplayState, baseCredits: number): GameplayState {
  if (baseCredits <= 0) return state;
  const reserveTarget = state.economy.reserveTarget || 320;
  const credits = state.economy.credits;
  let multiplier = 1;
  if (credits <= reserveTarget) {
    const lift = Math.min(0.12, ((reserveTarget - credits) / reserveTarget) * 0.12);
    multiplier = Math.min(1.12, 1 + lift);
  } else {
    const pressure = (credits - reserveTarget) / reserveTarget;
    multiplier = Math.max(0.45, 1 - pressure * 0.35);
  }
  const awarded = Math.max(1, Math.round(baseCredits * multiplier));
  const sinkThreshold = Math.round(reserveTarget * 1.7);
  const preSinkCredits = credits + awarded;
  const sink = preSinkCredits > sinkThreshold ? Math.max(1, Math.round((preSinkCredits - sinkThreshold) * 0.22)) : 0;
  const nextCredits = preSinkCredits - sink;
  return {
    ...state,
    economy: {
      ...state.economy,
      credits: nextCredits,
      inflationIndex: Number((nextCredits / reserveTarget).toFixed(3)),
    },
  };
}

function applyWeeklyEconomySink(state: GameplayState): GameplayState {
  const reserveTarget = state.economy.reserveTarget || 320;
  if (state.economy.credits <= reserveTarget) {
    return {
      ...state,
      economy: {
        ...state.economy,
        inflationIndex: Number((state.economy.credits / reserveTarget).toFixed(3)),
      },
    };
  }
  const upkeep = Math.max(6, Math.round((state.economy.credits - reserveTarget) * 0.08));
  const nextCredits = Math.max(0, state.economy.credits - upkeep);
  return {
    ...state,
    economy: {
      ...state.economy,
      credits: nextCredits,
      inflationIndex: Number((nextCredits / reserveTarget).toFixed(3)),
    },
  };
}

function readLiveOpsState(state: GameplayState): LiveOpsState {
  return {
    season: state.liveops?.season ?? 'Season-2026',
    week: state.liveops?.week ?? 1,
    challenge:
      state.liveops?.challenge ?? {
        id: 'fallback-liveops',
        title: 'Complete one objective',
        goal: 1,
        progress: 0,
        rewardCredits: 100,
        completed: false,
      },
    difficultyFactor: state.liveops?.difficultyFactor ?? 1,
    rewardMultiplier: state.liveops?.rewardMultiplier ?? 1,
    tuningHistory: state.liveops?.tuningHistory ?? [],
  };
}

function readRewardsState(state: GameplayState): RewardsState {
  return (
    state.rewards ?? {
      dailyClaimedOn: null,
      streakDays: 0,
      sessionClaimed: false,
      streakClaimedFor: 0,
      masteryClaims: [],
      history: [],
    }
  );
}

function normalizePlayerId(value: string) {
  return value.trim().toLowerCase();
}

function readSafetyState(state: GameplayState): SafetyState {
  return (
    state.safety ?? {
      mutedPlayerIds: [],
      blockedPlayerIds: [],
      reports: [],
    }
  );
}

function readOutcomeState(state: GameplayState): OutcomeState {
  return (
    state.outcome ?? {
      status: 'in_progress',
      reason: 'Run in progress.',
      updatedAt: Date.now(),
    }
  );
}

function readSandboxState(state: GameplayState): SandboxState {
  return state.sandbox ?? { enabled: false };
}

function readProgressionState(state: GameplayState): ProgressionState {
  return (
    state.progression ?? {
      xp: 0,
      level: 1,
      nextLevelXp: 200,
      milestones: [],
    }
  );
}

function grantProgressionXp(state: GameplayState, amount: number): GameplayState {
  if (amount <= 0) return state;
  const progression = readProgressionState(state);
  let xp = progression.xp + amount;
  let level = progression.level;
  let nextLevelXp = progression.nextLevelXp;
  let skillPointGain = 0;
  while (xp >= nextLevelXp) {
    xp -= nextLevelXp;
    level += 1;
    skillPointGain += 1;
    nextLevelXp = level * 200;
  }
  const milestones = [...progression.milestones];
  [3, 5, 10].forEach((milestoneLevel) => {
    const milestoneId = `milestone-level-${milestoneLevel}`;
    if (level >= milestoneLevel && !milestones.includes(milestoneId)) {
      milestones.push(milestoneId);
    }
  });
  return {
    ...state,
    progression: {
      xp,
      level,
      nextLevelXp,
      milestones,
    },
    skills: {
      ...state.skills,
      points: state.skills.points + skillPointGain,
    },
  };
}

export function reportPlayer(state: GameplayState, targetPlayerId: string, reason: string): GameplayState {
  const playerId = normalizePlayerId(targetPlayerId);
  const message = reason.trim();
  if (!playerId || !message) return state;
  const safety = readSafetyState(state);
  const report: SafetyReport = {
    id: `report-${safety.reports.length + 1}-${state.seed % 1000}`,
    targetPlayerId: playerId,
    reason: message,
    createdAt: Date.now(),
  };
  return {
    ...state,
    safety: {
      ...safety,
      reports: [report, ...safety.reports].slice(0, 40),
    },
  };
}

export function mutePlayer(state: GameplayState, targetPlayerId: string): GameplayState {
  const playerId = normalizePlayerId(targetPlayerId);
  const safety = readSafetyState(state);
  if (!playerId || safety.mutedPlayerIds.includes(playerId)) return state;
  return {
    ...state,
    safety: {
      ...safety,
      mutedPlayerIds: [...safety.mutedPlayerIds, playerId],
    },
  };
}

export function blockPlayer(state: GameplayState, targetPlayerId: string): GameplayState {
  const playerId = normalizePlayerId(targetPlayerId);
  const safety = readSafetyState(state);
  if (!playerId || safety.blockedPlayerIds.includes(playerId)) return state;
  return {
    ...state,
    safety: {
      ...safety,
      blockedPlayerIds: [...safety.blockedPlayerIds, playerId],
      mutedPlayerIds: safety.mutedPlayerIds.includes(playerId)
        ? safety.mutedPlayerIds
        : [...safety.mutedPlayerIds, playerId],
    },
  };
}
