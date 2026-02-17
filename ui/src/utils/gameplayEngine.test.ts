import { describe, expect, it } from 'vitest';
import {
  advanceGuildOperation,
  applyLiveOpsBalancing,
  advanceLiveOpsWeek,
  advanceRaidObjective,
  applyBossAction,
  claimCadenceReward,
  applyNarrativeChoice,
  blockPlayer,
  completeCampaignMission,
  craftUpgrade,
  createInitialGameplayState,
  createTimeFork,
  difficultyForDepth,
  equipLoadoutSkill,
  generateAdaptiveDirectorUpdate,
  joinRaid,
  mergeForkIntoPrimary,
  mutePlayer,
  pushCinematicEvent,
  reportPlayer,
  rewindActiveFork,
  runPvPRound,
  setSandboxMode,
  unlockSkillNode,
} from './gameplayEngine';

describe('gameplayEngine', () => {
  it('supports co-op raids with objective progression', () => {
    let state = createInitialGameplayState('trace-1');
    state = joinRaid(state, 'alice', 'strategist');
    state = advanceRaidObjective(state, state.raid.objectives[0]?.id ?? '', 100);
    expect(state.raid.party).toContain('alice');
    expect(state.raid.objectives[0]?.completed).toBe(true);
  });

  it('advances roguelike campaign progression', () => {
    let state = createInitialGameplayState('trace-1');
    const initialDepth = state.campaign.depth;
    state = completeCampaignMission(state, true);
    expect(state.campaign.depth).toBe(initialDepth + 1);
    expect(state.economy.credits).toBeGreaterThan(0);
    expect(state.outcome.status).toBe('partial');
    expect(state.progression.xp).toBeGreaterThan(0);
  });

  it('applies branching narrative choices', () => {
    let state = createInitialGameplayState('trace-1');
    const choiceId = state.narrative.nodes[0]?.choices[0]?.id ?? '';
    state = applyNarrativeChoice(state, choiceId);
    expect(state.narrative.history.length).toBe(1);
  });

  it('unlocks and equips skill nodes', () => {
    let state = createInitialGameplayState('trace-1');
    const node = state.skills.nodes.find((item) => item.cost <= state.skills.points);
    expect(node).toBeDefined();
    state = unlockSkillNode(state, node?.id ?? '');
    state = equipLoadoutSkill(state, node?.id ?? '');
    expect(state.skills.nodes.find((item) => item.id === node?.id)?.unlocked).toBe(true);
    expect(state.skills.loadout.equipped).toContain(node?.id);
  });

  it('enforces skill unlock level and milestone gates', () => {
    let state = createInitialGameplayState('trace-1');
    state = unlockSkillNode(state, 'skill-focus');
    state = unlockSkillNode(state, 'skill-surge');
    expect(state.skills.nodes.find((item) => item.id === 'skill-surge')?.unlocked).toBe(false);

    for (let index = 0; index < 5; index += 1) {
      state = completeCampaignMission(state, true);
    }
    state = unlockSkillNode(state, 'skill-resilience');
    state = unlockSkillNode(state, 'skill-ward');
    expect(state.progression.level).toBeGreaterThanOrEqual(3);
    expect(state.progression.milestones).toContain('milestone-level-3');
    expect(state.skills.nodes.find((item) => item.id === 'skill-ward')?.unlocked).toBe(true);
  });

  it('enforces per-slot loadout constraints', () => {
    let state = createInitialGameplayState('trace-1');
    state = {
      ...state,
      progression: {
        ...state.progression,
        level: 4,
        milestones: ['milestone-level-3'],
      },
      skills: {
        ...state.skills,
        points: 10,
        nodes: state.skills.nodes.map((node) =>
          ['skill-focus', 'skill-resilience', 'skill-surge', 'skill-ward'].includes(node.id)
            ? { ...node, unlocked: true }
            : node
        ),
      },
    };
    state = equipLoadoutSkill(state, 'skill-surge');
    state = equipLoadoutSkill(state, 'skill-ward');
    expect(state.skills.loadout.equipped).toContain('skill-surge');
    expect(state.skills.loadout.equipped).not.toContain('skill-ward');
  });

  it('runs asymmetric pvp rounds', () => {
    let state = createInitialGameplayState('trace-1');
    state = runPvPRound(state, 'sabotage');
    state = runPvPRound(state, 'stabilize');
    expect(state.pvp.round).toBe(2);
  });

  it('uses deterministic difficulty ramp bands', () => {
    expect(difficultyForDepth(1)).toBe(1);
    expect(difficultyForDepth(3)).toBe(2);
    expect(difficultyForDepth(6)).toBe(4);
    expect(difficultyForDepth(25)).toBe(10);
  });

  it('supports time fork create, rewind, and merge', () => {
    let state = createInitialGameplayState('trace-1');
    state = createTimeFork(state, 'alt path', 12000);
    state = rewindActiveFork(state, 2000);
    const fork = state.time.forks.find((item) => item.id === state.time.activeForkId);
    expect(fork?.playheadMs).toBe(10000);
    state = mergeForkIntoPrimary(state, state.time.activeForkId);
    expect(state.time.activeForkId).toBe('primary');
  });

  it('progresses boss encounter phases', () => {
    let state = createInitialGameplayState('trace-1');
    state = applyBossAction(state, 'exploit');
    expect(state.boss.hp).toBeLessThan(state.boss.maxHp);
    expect(state.boss.phaseMechanic.length).toBeGreaterThan(0);
  });

  it('surfaces phase-specific boss vulnerability mechanics', () => {
    let state = createInitialGameplayState('trace-1');
    while (state.boss.phase === 1) {
      state = applyBossAction(state, 'exploit');
    }
    expect(state.boss.phase).toBeGreaterThanOrEqual(2);
    expect(state.boss.vulnerability).toBe('strike');
  });

  it('adapts director guidance from performance signals', () => {
    const state = createInitialGameplayState('trace-1');
    const next = generateAdaptiveDirectorUpdate(state, { failures: 2, latencyMs: 1800, retries: 3 });
    expect(next.director.hint.length).toBeGreaterThan(0);
    expect(next.director.risk).toBeGreaterThan(state.director.risk);
  });

  it('supports economy and crafting loop', () => {
    let state = createInitialGameplayState('trace-1');
    state = craftUpgrade(state, 'stability_patch');
    expect(state.economy.crafted).toContain('stability_patch');
  });

  it('applies anti-inflation reward scaling and sink controls', () => {
    let state = createInitialGameplayState('trace-1');
    state = {
      ...state,
      economy: {
        ...state.economy,
        credits: 900,
        inflationIndex: 2.813,
      },
    };
    const before = state.economy.credits;
    state = completeCampaignMission(state, true);
    expect(state.economy.credits).toBeLessThan(before + 75);
    expect(state.economy.inflationIndex).toBeGreaterThan(0);
  });

  it('applies weekly upkeep sink during liveops rotation', () => {
    const state = {
      ...createInitialGameplayState('trace-1'),
      economy: {
        ...createInitialGameplayState('trace-1').economy,
        credits: 700,
        inflationIndex: 2.188,
      },
    };
    const next = advanceLiveOpsWeek(state);
    expect(next.economy.credits).toBeLessThan(state.economy.credits);
  });

  it('claims cadence rewards with gating rules', () => {
    let state = createInitialGameplayState('trace-1');
    state = claimCadenceReward(state, 'daily');
    expect(state.rewards.streakDays).toBe(1);
    const afterSecondDaily = claimCadenceReward(state, 'daily');
    expect(afterSecondDaily.rewards.history.length).toBe(state.rewards.history.length);

    const blockedSession = claimCadenceReward(state, 'session');
    expect(blockedSession.rewards.sessionClaimed).toBe(false);
    state = advanceRaidObjective(state, state.raid.objectives[0]?.id ?? '', 10);
    state = claimCadenceReward(state, 'session');
    expect(state.rewards.sessionClaimed).toBe(true);
  });

  it('claims mastery reward once requirement is met', () => {
    let state = createInitialGameplayState('trace-1');
    state = advanceRaidObjective(state, 'obj-root-cause', 100);
    state = advanceRaidObjective(state, 'obj-recover', 100);
    state = advanceRaidObjective(state, 'obj-harden', 100);
    state = claimCadenceReward(state, 'mastery', 'raid_mastery');
    expect(state.rewards.masteryClaims).toContain('raid_mastery');
  });

  it('updates guild operations score', () => {
    const state = createInitialGameplayState('trace-1');
    const next = advanceGuildOperation(state, 8);
    expect(next.guild.operationsScore).toBeGreaterThan(state.guild.operationsScore);
  });

  it('queues cinematic events', () => {
    const state = createInitialGameplayState('trace-1');
    const next = pushCinematicEvent(state, 'critical', 'Failure spike detected', 3);
    expect(next.cinematic.queue[0]?.type).toBe('critical');
  });

  it('rotates weekly liveops challenges', () => {
    const state = createInitialGameplayState('trace-1');
    const next = advanceLiveOpsWeek(state);
    expect(next.liveops.week).toBe(state.liveops.week + 1);
    expect(next.liveops.challenge.id).not.toBe(state.liveops.challenge.id);
  });

  it('applies liveops balancing and records tuning history', () => {
    const state = createInitialGameplayState('trace-1');
    const next = applyLiveOpsBalancing(state, {
      difficultyFactor: 1.35,
      rewardMultiplier: 1.5,
      note: 'Nightly tuning',
    });
    expect(next.liveops.difficultyFactor).toBeCloseTo(1.35, 2);
    expect(next.liveops.rewardMultiplier).toBeCloseTo(1.5, 2);
    expect(next.liveops.tuningHistory[0]?.note).toBe('Nightly tuning');
    expect(next.liveops.challenge.rewardCredits).toBeGreaterThan(state.liveops.challenge.rewardCredits);
  });

  it('tracks player safety moderation actions', () => {
    let state = createInitialGameplayState('trace-1');
    state = mutePlayer(state, 'griefer-1');
    state = blockPlayer(state, 'griefer-2');
    state = reportPlayer(state, 'griefer-2', 'Repeated sabotage and abuse');
    expect(state.safety.mutedPlayerIds).toContain('griefer-1');
    expect(state.safety.blockedPlayerIds).toContain('griefer-2');
    expect(state.safety.reports[0]?.targetPlayerId).toBe('griefer-2');
  });

  it('marks run as win when campaign reaches success threshold', () => {
    let state = createInitialGameplayState('trace-1');
    for (let index = 0; index < 4; index += 1) {
      state = completeCampaignMission(state, true);
    }
    expect(state.outcome.status).toBe('win');
  });

  it('prevents life penalties when sandbox mode is enabled', () => {
    let state = createInitialGameplayState('trace-1');
    state = setSandboxMode(state, true);
    const livesBefore = state.campaign.lives;
    state = completeCampaignMission(state, false);
    expect(state.campaign.lives).toBe(livesBefore);
    expect(state.outcome.reason).toMatch(/no life penalty/i);
  });

  it('levels up and awards skill points from progression xp', () => {
    let state = createInitialGameplayState('trace-1');
    const initialLevel = state.progression.level;
    const initialPoints = state.skills.points;
    for (let index = 0; index < 3; index += 1) {
      state = completeCampaignMission(state, true);
    }
    expect(state.progression.level).toBeGreaterThanOrEqual(initialLevel + 1);
    expect(state.skills.points).toBeGreaterThan(initialPoints);
  });
});
