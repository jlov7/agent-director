import { useMemo, useState } from 'react';
import {
  advanceGuildOperation,
  advanceLiveOpsWeek,
  advanceRaidObjective,
  applyBossAction,
  applyNarrativeChoice,
  blockPlayer,
  completeCampaignMission,
  craftUpgrade,
  createTimeFork,
  equipLoadoutSkill,
  generateAdaptiveDirectorUpdate,
  joinRaid,
  mergeForkIntoPrimary,
  mutePlayer,
  pushCinematicEvent,
  reportPlayer,
  rewindActiveFork,
  runPvPRound,
  unlockSkillNode,
  type GameplayState,
  type RaidRole,
} from '../../utils/gameplayEngine';
import type { GameplayGuild, GameplaySession } from '../../types';

type GameplayModeProps = {
  state: GameplayState;
  playheadMs: number;
  onUpdate: (updater: (prev: GameplayState) => GameplayState) => void;
  session?: GameplaySession | null;
  playerId?: string;
  sessionError?: string | null;
  onCreateSession?: (name: string) => void;
  onJoinSession?: (sessionId: string, playerId: string, role: RaidRole) => void;
  onLeaveSession?: () => void;
  onDispatchAction?: (actionType: string, payload?: Record<string, unknown>) => void;
  guild?: GameplayGuild | null;
  onCreateGuild?: (guildId: string, name: string) => void;
  onJoinGuild?: (guildId: string, playerId: string) => void;
  onScheduleGuildEvent?: (guildId: string, title: string, scheduledAt: string) => void;
  onCompleteGuildEvent?: (guildId: string, eventId: string, impact: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function GameplayMode({
  state,
  playheadMs,
  onUpdate,
  session,
  playerId,
  sessionError,
  onCreateSession,
  onJoinSession,
  onLeaveSession,
  onDispatchAction,
  guild,
  onCreateGuild,
  onJoinGuild,
  onScheduleGuildEvent,
  onCompleteGuildEvent,
}: GameplayModeProps) {
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<RaidRole>('strategist');
  const [forkLabel, setForkLabel] = useState('alt path');
  const [sessionName, setSessionName] = useState('Night Ops');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [joinRole, setJoinRole] = useState<RaidRole>('operator');
  const [guildIdInput, setGuildIdInput] = useState('guild-night-ops');
  const [guildNameInput, setGuildNameInput] = useState('Night Ops Guild');
  const [guildEventTitle, setGuildEventTitle] = useState('Weekly Raid Drill');
  const [guildEventAt, setGuildEventAt] = useState('2026-02-16T20:00:00Z');
  const [safetyTargetPlayer, setSafetyTargetPlayer] = useState('');
  const [safetyReason, setSafetyReason] = useState('Abusive behavior');
  const multiplayerActive = Boolean(session?.id && onDispatchAction);

  const applyAction = (
    actionType: string,
    payload: Record<string, unknown>,
    fallback: (prev: GameplayState) => GameplayState
  ) => {
    if (multiplayerActive) {
      onDispatchAction?.(actionType, payload);
      return;
    }
    onUpdate(fallback);
  };

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
  const safety = state.safety ?? { mutedPlayerIds: [], blockedPlayerIds: [], reports: [] };

  return (
    <section className="gameplay-mode">
      <header className="gameplay-header">
        <div>
          <h2>Gameplay Command Center</h2>
          <p>World-class mechanics stack: raids, campaign, narrative, PvP, time control, boss runs, and liveops.</p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="Session name"
              aria-label="Session name"
            />
            <button className="ghost-button" type="button" onClick={() => onCreateSession?.(sessionName)}>
              Create multiplayer session
            </button>
            <input
              className="search-input"
              value={joinSessionId}
              onChange={(event) => setJoinSessionId(event.target.value)}
              placeholder="Session id"
              aria-label="Join session id"
            />
            <select value={joinRole} onChange={(event) => setJoinRole(event.target.value as RaidRole)}>
              <option value="strategist">Strategist</option>
              <option value="operator">Operator</option>
              <option value="analyst">Analyst</option>
              <option value="saboteur">Saboteur</option>
            </select>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onJoinSession?.(joinSessionId, playerId ?? 'director', joinRole)}
            >
              Join session
            </button>
            {session?.id ? (
              <button className="ghost-button" type="button" onClick={() => onLeaveSession?.()}>
                Leave session
              </button>
            ) : null}
          </div>
          <p>
            Session: {session?.id ?? 'local-only'} {playerId ? `• Player ${playerId}` : ''}{' '}
            {session ? `• Version ${session.version}` : ''}
          </p>
          {sessionError ? <p>{sessionError}</p> : null}
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
                if (multiplayerActive) {
                  onJoinSession?.(session?.id ?? '', memberName.trim(), memberRole);
                } else {
                  onUpdate((prev) => joinRaid(prev, memberName.trim(), memberRole));
                }
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
                  onClick={() =>
                    applyAction(
                      'raid.objective_progress',
                      { objective_id: objective.id, delta: 25 },
                      (prev) => advanceRaidObjective(prev, objective.id, 25)
                    )
                  }
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
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                applyAction(
                  'campaign.resolve_mission',
                  { success: true },
                  (prev) => completeCampaignMission(prev, true)
                )
              }
            >
              Mission success
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'campaign.resolve_mission',
                  { success: false },
                  (prev) => completeCampaignMission(prev, false)
                )
              }
            >
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
              <button
                key={choice.id}
                className="ghost-button"
                type="button"
                onClick={() =>
                  applyAction(
                    'narrative.choose',
                    { choice_id: choice.id },
                    (prev) => applyNarrativeChoice(prev, choice.id)
                  )
                }
              >
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
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    applyAction(
                      'skills.unlock',
                      { player_id: playerId ?? 'director', skill_id: node.id },
                      (prev) => unlockSkillNode(prev, node.id)
                    )
                  }
                >
                  {node.unlocked ? 'Unlocked' : 'Unlock'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    applyAction(
                      'skills.equip',
                      { player_id: playerId ?? 'director', skill_id: node.id },
                      (prev) => equipLoadoutSkill(prev, node.id)
                    )
                  }
                >
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
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('pvp.act', { action: 'sabotage' }, (prev) => runPvPRound(prev, 'sabotage'))}
            >
              Sabotage
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('pvp.act', { action: 'stabilize' }, (prev) => runPvPRound(prev, 'stabilize'))}
            >
              Stabilize
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('pvp.act', { action: 'scan' }, (prev) => runPvPRound(prev, 'scan'))}
            >
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
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'time.create_fork',
                  { label: forkLabel, playhead_ms: playheadMs },
                  (prev) => createTimeFork(prev, forkLabel, playheadMs)
                )
              }
            >
              Create fork
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('time.rewind', { amount_ms: 1000 }, (prev) => rewindActiveFork(prev, 1000))}
            >
              Rewind 1s
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'time.merge',
                  { fork_id: state.time.activeForkId },
                  (prev) => mergeForkIntoPrimary(prev, prev.time.activeForkId)
                )
              }
            >
              Merge
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>7) Boss Encounter Runs</h3>
          <p>{state.boss.name} • Phase {state.boss.phase} • HP {state.boss.hp}/{state.boss.maxHp}</p>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('boss.act', { action: 'strike' }, (prev) => applyBossAction(prev, 'strike'))}
            >
              Strike
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('boss.act', { action: 'shield' }, (prev) => applyBossAction(prev, 'shield'))}
            >
              Shield
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction('boss.act', { action: 'exploit' }, (prev) => applyBossAction(prev, 'exploit'))
              }
            >
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
            onClick={() => {
              const failures = state.pvp.sabotage > state.pvp.stability ? 2 : 0;
              const retries = Math.floor(((state.raid.objectives[0]?.progress ?? 0) as number) / 40);
              const latencyMs = 900 + (state.pvp.fog * 10);
              applyAction(
                'director.evaluate',
                { failures, retries, latency_ms: latencyMs },
                (prev) => generateAdaptiveDirectorUpdate(prev, { failures, retries, latencyMs })
              );
            }}
          >
            Recompute guidance
          </button>
        </article>

        <article className="gameplay-card">
          <h3>9) Mission Economy + Crafting</h3>
          <p>Credits {state.economy.credits} • Materials {state.economy.materials}</p>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'economy.craft',
                  { recipe_id: 'stability_patch' },
                  (prev) => craftUpgrade(prev, 'stability_patch')
                )
              }
            >
              Craft stability patch
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'economy.craft',
                  { recipe_id: 'precision_lens' },
                  (prev) => craftUpgrade(prev, 'precision_lens')
                )
              }
            >
              Craft precision lens
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'economy.craft',
                  { recipe_id: 'overclock_core' },
                  (prev) => craftUpgrade(prev, 'overclock_core')
                )
              }
            >
              Craft overclock core
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>10) Guild Operations</h3>
          <p>{state.guild.name} • Ops score {state.guild.operationsScore} • Events {state.guild.eventsCompleted}</p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={guildIdInput}
              onChange={(event) => setGuildIdInput(event.target.value)}
              placeholder="Guild id"
              aria-label="Guild id"
            />
            <input
              className="search-input"
              value={guildNameInput}
              onChange={(event) => setGuildNameInput(event.target.value)}
              placeholder="Guild name"
              aria-label="Guild name"
            />
            <button className="ghost-button" type="button" onClick={() => onCreateGuild?.(guildIdInput, guildNameInput)}>
              Create guild
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onJoinGuild?.(guildIdInput, memberName.trim() || playerId || 'director')}
            >
              Join guild
            </button>
          </div>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={guildEventTitle}
              onChange={(event) => setGuildEventTitle(event.target.value)}
              placeholder="Event title"
              aria-label="Guild event title"
            />
            <input
              className="search-input"
              value={guildEventAt}
              onChange={(event) => setGuildEventAt(event.target.value)}
              placeholder="2026-02-16T20:00:00Z"
              aria-label="Guild event schedule"
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() => onScheduleGuildEvent?.(guildIdInput, guildEventTitle, guildEventAt)}
            >
              Schedule event
            </button>
          </div>
          {guild ? (
            <div className="gameplay-list">
              <p>{guild.member_count} members • Score {guild.operations_score}</p>
              {guild.scoreboard.slice(0, 4).map((row) => (
                <div key={row.player_id} className="gameplay-node">
                  <span>{row.player_id}</span>
                  <span>{row.score}</span>
                </div>
              ))}
              {guild.events.slice(-3).map((event) => (
                <div key={event.id} className="gameplay-node">
                  <span>{event.title}</span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => onCompleteGuildEvent?.(guild.id, event.id, 10)}
                  >
                    Complete
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('guild.op', { impact: 6 }, (prev) => advanceGuildOperation(prev, 6))}
            >
              Positive op
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('guild.op', { impact: -3 }, (prev) => advanceGuildOperation(prev, -3))}
            >
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
              onClick={() =>
                applyAction(
                  'cinematic.emit',
                  { event_type: 'critical', message: 'Critical cascade detected', intensity: 3 },
                  (prev) => pushCinematicEvent(prev, 'critical', 'Critical cascade detected', 3)
                )
              }
            >
              Critical beat
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'cinematic.emit',
                  { event_type: 'success', message: 'System stabilizing', intensity: 2 },
                  (prev) => pushCinematicEvent(prev, 'success', 'System stabilizing', 2)
                )
              }
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
            <button
              className="ghost-button"
              type="button"
              onClick={() => applyAction('liveops.advance_week', {}, (prev) => advanceLiveOpsWeek(prev))}
            >
              Next week
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'liveops.progress',
                  { delta: 1 },
                  (prev) => ({
                    ...prev,
                    liveops: {
                      ...prev.liveops,
                      challenge: {
                        ...prev.liveops.challenge,
                        progress: clamp(prev.liveops.challenge.progress + 1, 0, prev.liveops.challenge.goal),
                        completed: prev.liveops.challenge.progress + 1 >= prev.liveops.challenge.goal,
                      },
                    },
                  })
                )
              }
            >
              Progress challenge
            </button>
          </div>
        </article>

        <article className="gameplay-card">
          <h3>13) Safety and Moderation</h3>
          <p>
            Muted {safety.mutedPlayerIds.length} • Blocked {safety.blockedPlayerIds.length} • Reports{' '}
            {safety.reports.length}
          </p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={safetyTargetPlayer}
              onChange={(event) => setSafetyTargetPlayer(event.target.value)}
              placeholder="Player id"
              aria-label="Safety player id"
            />
            <input
              className="search-input"
              value={safetyReason}
              onChange={(event) => setSafetyReason(event.target.value)}
              placeholder="Reason"
              aria-label="Safety reason"
            />
          </div>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => mutePlayer(prev, safetyTargetPlayer))}
            >
              Mute player
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => blockPlayer(prev, safetyTargetPlayer))}
            >
              Block player
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUpdate((prev) => reportPlayer(prev, safetyTargetPlayer, safetyReason))}
            >
              Report player
            </button>
          </div>
          {safety.reports.length > 0 ? (
            <div className="gameplay-list">
              {safety.reports.slice(0, 3).map((report) => (
                <div key={report.id} className="gameplay-node">
                  <span>{report.targetPlayerId}</span>
                  <span>{report.reason}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
