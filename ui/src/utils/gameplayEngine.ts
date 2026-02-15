export type RaidRole = 'strategist' | 'operator' | 'analyst' | 'saboteur';
export type PvPAction = 'sabotage' | 'stabilize' | 'scan';
export type BossAction = 'strike' | 'shield' | 'exploit';
export type CraftRecipeId = 'stability_patch' | 'precision_lens' | 'overclock_core';
export type CinematicEventType = 'critical' | 'success' | 'warning' | 'twist';

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
  unlocked: boolean;
};

export type SkillTreeState = {
  points: number;
  nodes: SkillNode[];
  loadout: {
    capacity: number;
    equipped: string[];
  };
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

export type LiveOpsState = {
  season: string;
  week: number;
  challenge: LiveOpsChallenge;
};

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
  guild: GuildState;
  cinematic: CinematicState;
  liveops: LiveOpsState;
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
    difficulty: clamp(1 + Math.floor(depth / 2), 1, 10),
    hazards: [hazardA, hazardB, ...mutators.slice(-1)],
    rewardCredits: 60 + depth * 15,
  };
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
        { id: 'skill-focus', label: 'Focus Matrix', cost: 2, requires: [], unlocked: false },
        { id: 'skill-resilience', label: 'Resilience Mesh', cost: 2, requires: [], unlocked: false },
        { id: 'skill-surge', label: 'Surge Compiler', cost: 3, requires: ['skill-focus'], unlocked: false },
        { id: 'skill-echo', label: 'Echo Anticipator', cost: 3, requires: ['skill-resilience'], unlocked: false },
      ],
      loadout: { capacity: 3, equipped: [] },
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
    },
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
  return {
    ...state,
    raid: {
      ...state.raid,
      objectives,
      completed,
    },
    economy: {
      ...state.economy,
      credits: state.economy.credits + completionReward,
    },
  };
}

export function completeCampaignMission(state: GameplayState, success: boolean): GameplayState {
  const current = state.campaign.currentMission;
  if (success) {
    const depth = state.campaign.depth + 1;
    const withMission = withCampaignMission(state, depth, state.campaign.mutators);
    return {
      ...withMission,
      campaign: {
        ...withMission.campaign,
        completedMissionIds: [...withMission.campaign.completedMissionIds, current.id],
      },
      economy: {
        ...withMission.economy,
        credits: withMission.economy.credits + current.rewardCredits,
        materials: withMission.economy.materials + 14,
      },
      director: {
        ...withMission.director,
        lastOutcome: 'success',
      },
    };
  }

  const lives = clamp(state.campaign.lives - 1, 0, 3);
  const withMission = withCampaignMission(state, state.campaign.depth, applyMissionMutator(state.campaign.mutators, 'failure-loop'));
  return {
    ...withMission,
    campaign: {
      ...withMission.campaign,
      lives,
    },
    director: {
      ...withMission.director,
      lastOutcome: 'failure',
    },
  };
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
  if (!node || node.unlocked) return state;
  const unlocked = new Set(state.skills.nodes.filter((item) => item.unlocked).map((item) => item.id));
  const prerequisitesMet = node.requires.every((id) => unlocked.has(id));
  if (!prerequisitesMet || state.skills.points < node.cost) return state;

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
  const node = state.skills.nodes.find((item) => item.id === nodeId);
  if (!node?.unlocked) return state;
  if (state.skills.loadout.equipped.includes(nodeId)) return state;
  if (state.skills.loadout.equipped.length >= state.skills.loadout.capacity) return state;
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

export function runPvPRound(state: GameplayState, action: PvPAction): GameplayState {
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
  return { ...state, pvp: next };
}

export function createTimeFork(state: GameplayState, label: string, playheadMs: number): GameplayState {
  const id = `fork-${state.time.forks.length + 1}`;
  const fork: TimeFork = {
    id,
    label: label.trim() || id,
    playheadMs: clamp(playheadMs, 0, 3_600_000),
    history: [clamp(playheadMs, 0, 3_600_000)],
  };
  return {
    ...state,
    time: {
      ...state.time,
      activeForkId: id,
      forks: [...state.time.forks, fork],
    },
  };
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
  const damage = action === 'exploit' ? 42 : action === 'strike' ? 24 : 8;
  const hp = clamp(state.boss.hp - damage, 0, state.boss.maxHp);
  const ratio = hp / state.boss.maxHp;
  const phase: 1 | 2 | 3 = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
  return {
    ...state,
    boss: {
      ...state.boss,
      hp,
      phase,
      enraged: phase === 3 || hp <= state.boss.maxHp * 0.2,
    },
  };
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
  let nextState: GameplayState = {
    ...state,
    economy: {
      ...state.economy,
      credits: state.economy.credits - recipe.credits,
      materials: state.economy.materials - recipe.materials,
      crafted,
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
  return nextState;
}

export function advanceGuildOperation(state: GameplayState, impact: number): GameplayState {
  const normalizedImpact = Math.round(impact);
  return {
    ...state,
    guild: {
      ...state.guild,
      operationsScore: state.guild.operationsScore + normalizedImpact,
      eventsCompleted: state.guild.eventsCompleted + (normalizedImpact > 0 ? 1 : 0),
    },
    economy: {
      ...state.economy,
      credits: state.economy.credits + Math.max(0, normalizedImpact * 3),
    },
  };
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
  const week = state.liveops.week + 1;
  const challenge = challengeForWeek(state.seed, week);
  return {
    ...state,
    liveops: {
      ...state.liveops,
      week,
      challenge,
    },
  };
}
