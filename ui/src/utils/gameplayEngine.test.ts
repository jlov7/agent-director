import { describe, expect, it } from 'vitest';
import {
  advanceGuildOperation,
  advanceLiveOpsWeek,
  advanceRaidObjective,
  applyBossAction,
  applyNarrativeChoice,
  completeCampaignMission,
  craftUpgrade,
  createInitialGameplayState,
  createTimeFork,
  equipLoadoutSkill,
  generateAdaptiveDirectorUpdate,
  joinRaid,
  mergeForkIntoPrimary,
  pushCinematicEvent,
  rewindActiveFork,
  runPvPRound,
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

  it('runs asymmetric pvp rounds', () => {
    let state = createInitialGameplayState('trace-1');
    state = runPvPRound(state, 'sabotage');
    state = runPvPRound(state, 'stabilize');
    expect(state.pvp.round).toBe(2);
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
});
