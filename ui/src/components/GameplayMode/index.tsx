import { useMemo, useState } from 'react';
import {
  advanceGuildOperation,
  advanceLiveOpsWeek,
  advanceRaidObjective,
  applyBossAction,
  applyNarrativeChoice,
  completeCampaignMission,
  craftUpgrade,
  createTimeFork,
  equipLoadoutSkill,
  generateAdaptiveDirectorUpdate,
  joinRaid,
  mergeForkIntoPrimary,
  pushCinematicEvent,
  rewindActiveFork,
  runPvPRound,
  unlockSkillNode,
  type GameplayState,
  type RaidRole,
} from '../../utils/gameplayEngine';

type GameplayModeProps = {
  state: GameplayState;
  playheadMs: number;
  onUpdate: (updater: (prev: GameplayState) => GameplayState) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function GameplayMode({ state, playheadMs, onUpdate }: GameplayModeProps) {
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<RaidRole>('strategist');
  const [forkLabel, setForkLabel] = useState('alt path');

  const activeNarrativeNode = useMemo(
    () => state.narrative.nodes.find((node) => node.id === state.narrative.currentNodeId),
    [state.narrative.currentNodeId, state.narrative.nodes]
  );

  const completion = useMemo(() => {
    const tracks = [
      state.raid.completed,
      state.campaign.depth >= 3,
      state.narrative.history.length >= 2,
      state.skills.loadout.equipped.length >= 2,
      state.pvp.round >= 3 || state.pvp.winner != null,
      state.time.forks.length >= 2 || state.time.forks[0]?.history.length > 1,
      state.boss.hp < state.boss.maxHp,
      state.director.lastOutcome !== 'mixed',
      state.economy.crafted.length >= 1,
      state.guild.operationsScore > 0,
      state.cinematic.queue.length >= 1,
      state.liveops.week >= 2,
    ];
    const done = tracks.filter(Boolean).length;
    return { done, total: tracks.length, pct: Math.round((done / tracks.length) * 100) };
  }, [state]);

  return (
    <section className="gameplay-mode">
      <header className="gameplay-header">
        <div>
          <h2>Gameplay Command Center</h2>
          <p>World-class mechanics stack: raids, campaign, narrative, PvP, time control, boss runs, and liveops.</p>
        </div>
        <div className="gameplay-completion" aria-label="Gameplay completion">
          <strong>{completion.done}/{completion.total}</strong>
          <span>{completion.pct}% complete</span>
        </div>
      </header>

      <div className="gameplay-grid">
        <article className="gameplay-card">
          <h3>1) Co-op Incident Raids</h3>
          <p>Party: {state.raid.party.length} members</p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              placeholder="Member name"
              aria-label="Raid member name"
            />
            <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as RaidRole)}>
              <option value="strategist">Strategist</option>
              <option value="operator">Operator</option>
              <option value="analyst">Analyst</option>
              <option value="saboteur">Saboteur</option>
            </select>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                if (!memberName.trim()) return;
                onUpdate((prev) => joinRaid(prev, memberName.trim(), memberRole));
                setMemberName('');
              }}
            >
              Add member
            </button>
          </div>
          <div className="gameplay-objectives">
            {state.raid.objectives.map((objective) => (
              <div key={objective.id} className="gameplay-objective">
                <span>{objective.label}</span>
                <span>{objective.progress}/{objective.target}</span>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => onUpdate((prev) => advanceRaidObjective(prev, objective.id, 25))}
                >
                  +25
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="gameplay-card">
          <h3>2) Roguelike Scenario Campaign</h3>
          <p>Depth {state.campaign.depth} • Lives {state.campaign.lives}</p>
          <p>{state.campaign.currentMission.title} (difficulty {state.campaign.currentMission.difficulty})</p>
          <div className="gameplay-inline">
            <button className="primary-button" type="button" onClick={() => onUpdate((prev) => completeCampaignMission(prev, true))}>
              Mission success
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => completeCampaignMission(prev, false))}>
              Mission fail
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>3) Branching Narrative Director</h3>
          <p>{activeNarrativeNode?.title}</p>
          <p>Tension {state.narrative.tension}</p>
          <div className="gameplay-list">
            {(activeNarrativeNode?.choices ?? []).map((choice) => (
              <button key={choice.id} className="ghost-button" type="button" onClick={() => onUpdate((prev) => applyNarrativeChoice(prev, choice.id))}>
                {choice.label}
              </button>
            ))}
          </div>
        </article>

        <article className="gameplay-card">
          <h3>4) Skill Tree + Loadout</h3>
          <p>Points {state.skills.points} • Equipped {state.skills.loadout.equipped.length}/{state.skills.loadout.capacity}</p>
          <div className="gameplay-list">
            {state.skills.nodes.map((node) => (
              <div key={node.id} className="gameplay-node">
                <span>{node.label} ({node.cost})</span>
                <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => unlockSkillNode(prev, node.id))}>
                  {node.unlocked ? 'Unlocked' : 'Unlock'}
                </button>
                <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => equipLoadoutSkill(prev, node.id))}>
                  Equip
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="gameplay-card">
          <h3>5) Asymmetric PvP</h3>
          <p>Round {state.pvp.round} • Stability {state.pvp.stability} • Sabotage {state.pvp.sabotage}</p>
          <div className="gameplay-inline">
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => runPvPRound(prev, 'sabotage'))}>
              Sabotage
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => runPvPRound(prev, 'stabilize'))}>
              Stabilize
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => runPvPRound(prev, 'scan'))}>
              Scan
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>6) Time Manipulation</h3>
          <p>Active fork: {state.time.activeForkId}</p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={forkLabel}
              onChange={(event) => setForkLabel(event.target.value)}
              aria-label="Fork label"
            />
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => createTimeFork(prev, forkLabel, playheadMs))}>
              Create fork
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => rewindActiveFork(prev, 1000))}>
              Rewind 1s
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => mergeForkIntoPrimary(prev, prev.time.activeForkId))}
            >
              Merge
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>7) Boss Encounter Runs</h3>
          <p>{state.boss.name} • Phase {state.boss.phase} • HP {state.boss.hp}/{state.boss.maxHp}</p>
          <div className="gameplay-inline">
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => applyBossAction(prev, 'strike'))}>
              Strike
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => applyBossAction(prev, 'shield'))}>
              Shield
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => applyBossAction(prev, 'exploit'))}>
              Exploit
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>8) Adaptive AI Dungeon Master</h3>
          <p>Risk {state.director.risk} • Outcome {state.director.lastOutcome}</p>
          <p>{state.director.hint}</p>
          <button
            className="ghost-button"
            type="button"
            onClick={() =>
              onUpdate((prev) =>
                generateAdaptiveDirectorUpdate(prev, {
                  failures: prev.pvp.sabotage > prev.pvp.stability ? 2 : 0,
                  retries: Math.floor(prev.raid.objectives[0]?.progress ?? 0 / 40),
                  latencyMs: 900 + (prev.pvp.fog * 10),
                })
              )
            }
          >
            Recompute guidance
          </button>
        </article>

        <article className="gameplay-card">
          <h3>9) Mission Economy + Crafting</h3>
          <p>Credits {state.economy.credits} • Materials {state.economy.materials}</p>
          <div className="gameplay-inline">
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => craftUpgrade(prev, 'stability_patch'))}>
              Craft stability patch
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => craftUpgrade(prev, 'precision_lens'))}>
              Craft precision lens
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => craftUpgrade(prev, 'overclock_core'))}>
              Craft overclock core
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>10) Guild Operations</h3>
          <p>{state.guild.name} • Ops score {state.guild.operationsScore} • Events {state.guild.eventsCompleted}</p>
          <div className="gameplay-inline">
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => advanceGuildOperation(prev, 6))}>
              Positive op
            </button>
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => advanceGuildOperation(prev, -3))}>
              Risky op
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>11) Cinematic Event Engine</h3>
          <p>{state.cinematic.queue.length} queued events</p>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => pushCinematicEvent(prev, 'critical', 'Critical cascade detected', 3))}
            >
              Critical beat
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => pushCinematicEvent(prev, 'success', 'System stabilizing', 2))}
            >
              Success beat
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>12) Seasonal LiveOps</h3>
          <p>{state.liveops.season} • Week {state.liveops.week}</p>
          <p>{state.liveops.challenge.title}</p>
          <div className="gameplay-inline">
            <button className="ghost-button" type="button" onClick={() => onUpdate((prev) => advanceLiveOpsWeek(prev))}>
              Next week
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                onUpdate((prev) => ({
                  ...prev,
                  liveops: {
                    ...prev.liveops,
                    challenge: {
                      ...prev.liveops.challenge,
                      progress: clamp(prev.liveops.challenge.progress + 1, 0, prev.liveops.challenge.goal),
                      completed: prev.liveops.challenge.progress + 1 >= prev.liveops.challenge.goal,
                    },
                  },
                }))
              }
            >
              Progress challenge
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
