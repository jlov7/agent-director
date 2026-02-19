import { useMemo, useState } from 'react';
import {
  applyLiveOpsBalancing,
  advanceGuildOperation,
  advanceLiveOpsWeek,
  advanceRaidObjective,
  applyBossAction,
  applyNarrativeChoice,
  blockPlayer,
  completeCampaignMission,
  claimCadenceReward,
  craftUpgrade,
  createTimeFork,
  equipLoadoutSkill,
  evaluateSkillEquip,
  evaluateSkillUnlock,
  evaluateCadenceReward,
  generateAdaptiveDirectorUpdate,
  joinRaid,
  mergeForkIntoPrimary,
  mutePlayer,
  progressLiveOpsChallenge,
  pushCinematicEvent,
  reportPlayer,
  sendTeamPing,
  setSandboxMode,
  rewindActiveFork,
  runPvPRound,
  unlockSkillNode,
  type GameplayState,
  type RaidRole,
  type TeamPingIntent,
} from '../../utils/gameplayEngine';
import type {
  GameplayAnalyticsFunnelSummary,
  GameplayGuild,
  GameplayObservabilitySummary,
  GameplaySession,
  GameplaySocialGraph,
} from '../../types';
import { gameplayLabel, type GameplayLocale } from '../../utils/gameplayI18n';

type GameplayModeProps = {
  state: GameplayState;
  playheadMs: number;
  onUpdate: (updater: (prev: GameplayState) => GameplayState) => void;
  session?: GameplaySession | null;
  playerId?: string;
  sessionError?: string | null;
  onCreateSession?: (name: string) => void;
  onQuickMatchSession?: () => void;
  onJoinSession?: (sessionId: string, playerId: string, role: RaidRole) => void;
  onLeaveSession?: () => void;
  onDispatchAction?: (actionType: string, payload?: Record<string, unknown>) => void;
  guild?: GameplayGuild | null;
  onCreateGuild?: (guildId: string, name: string) => void;
  onJoinGuild?: (guildId: string, playerId: string) => void;
  onScheduleGuildEvent?: (guildId: string, title: string, scheduledAt: string) => void;
  onCompleteGuildEvent?: (guildId: string, eventId: string, impact: number) => void;
  onReconnectSession?: () => void;
  social?: GameplaySocialGraph | null;
  onInviteFriend?: (toPlayerId: string) => void;
  onAcceptFriendInvite?: (inviteId: string) => void;
  locale?: GameplayLocale;
  onLocaleChange?: (locale: GameplayLocale) => void;
  gamepadEnabled?: boolean;
  onToggleGamepad?: (enabled: boolean) => void;
  gamepadPreset?: 'standard' | 'lefty';
  onGamepadPresetChange?: (preset: 'standard' | 'lefty') => void;
  isOnline?: boolean;
  onRetryConnectivity?: () => void;
  observability?: GameplayObservabilitySummary | null;
  analytics?: GameplayAnalyticsFunnelSummary | null;
};

export default function GameplayMode({
  state,
  playheadMs,
  onUpdate,
  session,
  playerId,
  sessionError,
  onCreateSession,
  onQuickMatchSession,
  onJoinSession,
  onLeaveSession,
  onDispatchAction,
  guild,
  onCreateGuild,
  onJoinGuild,
  onScheduleGuildEvent,
  onCompleteGuildEvent,
  onReconnectSession,
  social,
  onInviteFriend,
  onAcceptFriendInvite,
  locale = 'en',
  onLocaleChange,
  gamepadEnabled = true,
  onToggleGamepad,
  gamepadPreset = 'standard',
  onGamepadPresetChange,
  isOnline = true,
  onRetryConnectivity,
  observability,
  analytics,
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
  const [liveopsDifficultyFactor, setLiveopsDifficultyFactor] = useState('1');
  const [liveopsRewardMultiplier, setLiveopsRewardMultiplier] = useState('1');
  const [liveopsTuningNote, setLiveopsTuningNote] = useState('Weekly balance update');
  const [pingIntent, setPingIntent] = useState<TeamPingIntent>('focus');
  const [pingObjectiveId, setPingObjectiveId] = useState('obj-root-cause');
  const [friendPlayerId, setFriendPlayerId] = useState('');
  const [localSocial, setLocalSocial] = useState<GameplaySocialGraph>(() => ({
    player_id: (playerId ?? 'director').toLowerCase(),
    friends: [],
    incoming_invites: [],
    outgoing_invites: [],
    recent_teammates: [],
  }));
  const multiplayerActive = Boolean(session?.id && onDispatchAction);
  const effectiveSocial = social ?? localSocial;

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
  const teamComms = state.teamComms ?? { pings: [] };
  const sandbox = state.sandbox ?? { enabled: false };
  const progression = state.progression ?? { xp: 0, level: 1, nextLevelXp: 200, milestones: [] };
  const rewards = state.rewards ?? {
    dailyClaimedOn: null,
    streakDays: 0,
    sessionClaimed: false,
    streakClaimedFor: 0,
    masteryClaims: [],
    history: [],
  };
  const coreLoopPhase = useMemo(() => {
    if (state.outcome.status === 'win' || state.outcome.status === 'loss') return 4;
    const executionSignals =
      state.raid.objectives.some((objective) => objective.progress > 0) || state.pvp.round > 0 || state.time.forks.length > 1;
    if (!executionSignals) return 1;
    if (state.campaign.depth > 1 || state.narrative.history.length > 0) return 3;
    return 2;
  }, [state]);

  return (
    <section className="gameplay-mode">
      <header className="gameplay-header">
        <div>
          <h2>Gameplay Command Center</h2>
          <p>World-class mechanics stack: raids, campaign, narrative, PvP, time control, boss runs, and liveops.</p>
          <p>v1 core loop target session length: 18-22 minutes.</p>
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
            <button className="ghost-button" type="button" onClick={() => onQuickMatchSession?.()}>
              Quick matchmake
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
            {session?.id ? (
              <button className="ghost-button" type="button" onClick={() => onReconnectSession?.()}>
                Reconnect
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
          <h3>0) Core Loop + Outcomes</h3>
          <p>
            Phase {coreLoopPhase}/4 • Outcome {state.outcome.status.replace('_', ' ')} • Sandbox{' '}
            {sandbox.enabled ? 'ON' : 'OFF'}
          </p>
          <p>{state.outcome.reason}</p>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'session.toggle_sandbox',
                  { enabled: !sandbox.enabled },
                  (prev) => setSandboxMode(prev, !sandbox.enabled)
                )
              }
            >
              {sandbox.enabled ? 'Disable sandbox' : 'Enable sandbox'}
            </button>
          </div>
          <div className="gameplay-list">
            <div className="gameplay-node">
              <span>{coreLoopPhase >= 1 ? 'x' : 'o'} Brief: inspect run and set objective</span>
            </div>
            <div className="gameplay-node">
              <span>{coreLoopPhase >= 2 ? 'x' : 'o'} Execute: complete raid and mission actions</span>
            </div>
            <div className="gameplay-node">
              <span>{coreLoopPhase >= 3 ? 'x' : 'o'} Adapt: choose narrative and tune loadout/liveops</span>
            </div>
            <div className="gameplay-node">
              <span>{coreLoopPhase >= 4 ? 'x' : 'o'} Resolve: finish with win/loss review</span>
            </div>
          </div>
          <div className="gameplay-list">
            <p>Telemetry funnels:</p>
            <div className="gameplay-node"><span>funnel.session_start</span></div>
            <div className="gameplay-node"><span>funnel.first_objective_progress</span></div>
            <div className="gameplay-node"><span>funnel.first_mission_outcome</span></div>
            <div className="gameplay-node"><span>funnel.run_outcome</span></div>
          </div>
        </article>

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
          <div className="gameplay-inline">
            <select aria-label="Ping intent" value={pingIntent} onChange={(event) => setPingIntent(event.target.value as TeamPingIntent)}>
              <option value="focus">Focus</option>
              <option value="assist">Assist</option>
              <option value="defend">Defend</option>
              <option value="rotate">Rotate</option>
            </select>
            <input
              className="search-input"
              value={pingObjectiveId}
              onChange={(event) => setPingObjectiveId(event.target.value)}
              placeholder="obj-root-cause"
              aria-label="Ping objective id"
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'comms.ping',
                  { intent: pingIntent, target_objective_id: pingObjectiveId },
                  (prev) => sendTeamPing(prev, pingIntent, pingObjectiveId, playerId ?? 'director')
                )
              }
            >
              Send ping
            </button>
          </div>
          {teamComms.pings.length > 0 ? (
            <div className="gameplay-list">
              {teamComms.pings.slice(0, 3).map((ping) => (
                <div key={ping.id} className="gameplay-node">
                  <span>{ping.intent}</span>
                  <span>{ping.targetObjectiveId ?? 'team-wide'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="gameplay-card">
          <h3>2) Roguelike Scenario Campaign</h3>
          <p>Depth {state.campaign.depth} • Lives {state.campaign.lives}</p>
          <p>{state.campaign.currentMission.title} (difficulty {state.campaign.currentMission.difficulty})</p>
          <p>Mission seed {state.campaign.currentMission.missionSeed} • Hazards {state.campaign.currentMission.hazards.join(', ')}</p>
          <p>
            Pack {state.campaign.currentMission.templateId ?? 'legacy-template'} • Archetype{' '}
            {state.campaign.currentMission.archetype ?? 'legacy'} • Library {state.campaign.currentMission.launchPackSize ?? 0} templates
          </p>
          <p>
            Quality {state.campaign.currentMission.qualityScore ?? 0} • Novelty {state.campaign.currentMission.noveltyScore ?? 0} •
            Repetition penalty {state.campaign.currentMission.repetitionPenalty ?? 0}
          </p>
          <p>
            Mission history {state.campaign.missionHistory.length} • Distinct clears {new Set(state.campaign.completedMissionIds).size}
          </p>
          <p>{state.campaign.currentMission.blueprint}</p>
          <p>Difficulty ramp bands: D1-1, D2-3, D4-5, D6-7, D8-9, D10+.</p>
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
          <p>
            Level {progression.level} • XP {progression.xp}/{progression.nextLevelXp} • Milestones{' '}
            {progression.milestones.length}
          </p>
          <p>
            Points {state.skills.points} • Equipped {state.skills.loadout.equipped.length}/{state.skills.loadout.capacity} •
            Slots C/U/P {state.skills.loadout.slotCaps.core}/{state.skills.loadout.slotCaps.utility}/
            {state.skills.loadout.slotCaps.power}
          </p>
          <div className="gameplay-list">
            {state.skills.nodes.map((node) => (
              <div key={node.id} className="gameplay-node">
                <span>
                  {node.label} ({node.cost}) • T{node.tier} • {node.loadoutSlot} • L{node.minLevel}
                </span>
                {node.requires.length > 0 ? <small>Requires {node.requires.join(', ')}</small> : <small>Starter node</small>}
                {node.requiredMilestones.length > 0 ? (
                  <small>Milestones: {node.requiredMilestones.join(', ')}</small>
                ) : null}
                {(() => {
                  const unlockRule = evaluateSkillUnlock(state, node.id);
                  const equipRule = evaluateSkillEquip(state, node.id);
                  return (
                    <>
                      {!node.unlocked && !unlockRule.allowed ? <small>{unlockRule.reason}</small> : null}
                      {node.unlocked && !equipRule.allowed ? <small>{equipRule.reason}</small> : null}
                      <button
                        className="ghost-button"
                        type="button"
                        aria-label={`Unlock ${node.label}`}
                        disabled={!node.unlocked && !unlockRule.allowed}
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
                        aria-label={`Equip ${node.label}`}
                        disabled={!equipRule.allowed}
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
                    </>
                  );
                })()}
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
          <p>{state.boss.phaseMechanic}</p>
          <p>Current vulnerability: {state.boss.vulnerability}</p>
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
          <p>
            Reserve target {state.economy.reserveTarget} • Inflation index {state.economy.inflationIndex.toFixed(2)} (
            {state.economy.inflationIndex > 1.7 ? 'hot' : state.economy.inflationIndex > 1.2 ? 'elevated' : 'stable'})
          </p>
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
          <div className="gameplay-list">
            <p>
              Reward cadence: streak {rewards.streakDays} • session {rewards.sessionClaimed ? 'claimed' : 'open'} • mastery{' '}
              {rewards.masteryClaims.length}
            </p>
            <div className="gameplay-inline">
              <button
                className="ghost-button"
                type="button"
                disabled={!evaluateCadenceReward(state, 'daily').allowed}
                onClick={() =>
                  applyAction(
                    'rewards.claim',
                    { kind: 'daily' },
                    (prev) => claimCadenceReward(prev, 'daily')
                  )
                }
              >
                Claim daily
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!evaluateCadenceReward(state, 'session').allowed}
                onClick={() =>
                  applyAction(
                    'rewards.claim',
                    { kind: 'session' },
                    (prev) => claimCadenceReward(prev, 'session')
                  )
                }
              >
                Claim session
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!evaluateCadenceReward(state, 'streak').allowed}
                onClick={() =>
                  applyAction(
                    'rewards.claim',
                    { kind: 'streak' },
                    (prev) => claimCadenceReward(prev, 'streak')
                  )
                }
              >
                Claim streak
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!evaluateCadenceReward(state, 'mastery', 'raid_mastery').allowed}
                onClick={() =>
                  applyAction(
                    'rewards.claim',
                    { kind: 'mastery', mastery_id: 'raid_mastery' },
                    (prev) => claimCadenceReward(prev, 'mastery', 'raid_mastery')
                  )
                }
              >
                Claim raid mastery
              </button>
            </div>
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
          <p>
            Difficulty x{state.liveops.difficultyFactor.toFixed(2)} • Reward x{state.liveops.rewardMultiplier.toFixed(2)}
          </p>
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
                  (prev) => progressLiveOpsChallenge(prev, 1)
                )
              }
            >
              Progress challenge
            </button>
          </div>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={liveopsDifficultyFactor}
              onChange={(event) => setLiveopsDifficultyFactor(event.target.value)}
              placeholder="Difficulty (0.6-1.6)"
              aria-label="LiveOps difficulty factor"
            />
            <input
              className="search-input"
              value={liveopsRewardMultiplier}
              onChange={(event) => setLiveopsRewardMultiplier(event.target.value)}
              placeholder="Reward (0.5-2.0)"
              aria-label="LiveOps reward multiplier"
            />
          </div>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={liveopsTuningNote}
              onChange={(event) => setLiveopsTuningNote(event.target.value)}
              placeholder="Tuning note"
              aria-label="LiveOps tuning note"
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                const difficultyFactor = Number.parseFloat(liveopsDifficultyFactor);
                const rewardMultiplier = Number.parseFloat(liveopsRewardMultiplier);
                applyAction(
                  'liveops.balance',
                  {
                    difficulty_factor: Number.isFinite(difficultyFactor) ? difficultyFactor : 1,
                    reward_multiplier: Number.isFinite(rewardMultiplier) ? rewardMultiplier : 1,
                    note: liveopsTuningNote,
                  },
                  (prev) =>
                    applyLiveOpsBalancing(prev, {
                      difficultyFactor: Number.isFinite(difficultyFactor) ? difficultyFactor : 1,
                      rewardMultiplier: Number.isFinite(rewardMultiplier) ? rewardMultiplier : 1,
                      note: liveopsTuningNote,
                    })
                );
              }}
            >
              Apply balancing
            </button>
          </div>
          {state.liveops.tuningHistory.length > 0 ? (
            <div className="gameplay-list">
              {state.liveops.tuningHistory.slice(0, 3).map((entry) => (
                <div key={entry.id} className="gameplay-node">
                  <span>{new Date(entry.changedAt).toLocaleDateString()} • {entry.note}</span>
                  <span>D x{entry.difficultyFactor.toFixed(2)} / R x{entry.rewardMultiplier.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : null}
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
              onClick={() =>
                applyAction(
                  'safety.mute',
                  { target_player_id: safetyTargetPlayer },
                  (prev) => mutePlayer(prev, safetyTargetPlayer)
                )
              }
            >
              Mute player
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'safety.block',
                  { target_player_id: safetyTargetPlayer },
                  (prev) => blockPlayer(prev, safetyTargetPlayer)
                )
              }
            >
              Block player
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                applyAction(
                  'safety.report',
                  { target_player_id: safetyTargetPlayer, reason: safetyReason },
                  (prev) => reportPlayer(prev, safetyTargetPlayer, safetyReason)
                )
              }
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

        <article className="gameplay-card">
          <h3>14) Observability + Funnel Analytics</h3>
          <p>
            Sessions {observability?.metrics.total_sessions ?? 0} • Running {observability?.metrics.running_sessions ?? 0}
          </p>
          <p>
            Avg latency {Math.round(observability?.metrics.avg_latency_ms ?? 0)}ms • P95{' '}
            {Math.round(observability?.metrics.p95_latency_ms ?? 0)}ms
          </p>
          <p>
            Failure rate {(observability?.metrics.failure_rate_pct ?? 0).toFixed(2)}% • Challenge completion{' '}
            {(observability?.metrics.challenge_completion_rate_pct ?? 0).toFixed(2)}%
          </p>
          <div className="gameplay-list">
            <p>Funnels</p>
            <div className="gameplay-node">
              <span>Session start</span>
              <span>{analytics?.funnels.session_start ?? 0}</span>
            </div>
            <div className="gameplay-node">
              <span>First objective progress</span>
              <span>{analytics?.funnels.first_objective_progress ?? 0}</span>
            </div>
            <div className="gameplay-node">
              <span>First mission outcome</span>
              <span>{analytics?.funnels.first_mission_outcome ?? 0}</span>
            </div>
            <div className="gameplay-node">
              <span>Run outcome</span>
              <span>{analytics?.funnels.run_outcome ?? 0}</span>
            </div>
          </div>
          <div className="gameplay-list">
            <p>
              Retention D1 {(analytics?.retention.d1_pct ?? 0).toFixed(2)}% • D7{' '}
              {(analytics?.retention.d7_pct ?? 0).toFixed(2)}% • D30 {(analytics?.retention.d30_pct ?? 0).toFixed(2)}%
            </p>
          </div>
          {observability?.alerts.length ? (
            <div className="gameplay-list">
              {observability.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="gameplay-node">
                  <span>{alert.severity.toUpperCase()}</span>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="gameplay-card">
          <h3>15) Friends + Invites</h3>
          <p>
            Friends {effectiveSocial.friends.length} • Incoming {effectiveSocial.incoming_invites.length} • Outgoing{' '}
            {effectiveSocial.outgoing_invites.length}
          </p>
          <p>
            Recent teammates:{' '}
            {effectiveSocial.recent_teammates.length ? effectiveSocial.recent_teammates.slice(0, 4).join(', ') : 'none yet'}
          </p>
          <div className="gameplay-inline">
            <input
              className="search-input"
              value={friendPlayerId}
              onChange={(event) => setFriendPlayerId(event.target.value)}
              placeholder="Player id"
              aria-label="Friend player id"
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                const targetPlayerId = friendPlayerId.trim().toLowerCase();
                if (!targetPlayerId) return;
                if (onInviteFriend) {
                  onInviteFriend(targetPlayerId);
                  setFriendPlayerId('');
                  return;
                }
                setLocalSocial((previous) => {
                  const duplicate =
                    previous.friends.includes(targetPlayerId) ||
                    previous.outgoing_invites.some((invite) => invite.to_player_id === targetPlayerId);
                  if (duplicate) return previous;
                  const invite = {
                    id: `invite-local-${previous.outgoing_invites.length + 1}`,
                    from_player_id: previous.player_id,
                    to_player_id: targetPlayerId,
                    status: 'pending' as const,
                    created_at: new Date().toISOString(),
                  };
                  return {
                    ...previous,
                    outgoing_invites: [invite, ...previous.outgoing_invites].slice(0, 10),
                  };
                });
                setFriendPlayerId('');
              }}
            >
              Invite friend
            </button>
          </div>
          {effectiveSocial.incoming_invites.length > 0 ? (
            <div className="gameplay-list">
              {effectiveSocial.incoming_invites.slice(0, 3).map((invite) => (
                <div key={invite.id} className="gameplay-node">
                  <span>{invite.from_player_id}</span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      if (onAcceptFriendInvite) {
                        onAcceptFriendInvite(invite.id);
                        return;
                      }
                      setLocalSocial((previous) => ({
                        ...previous,
                        incoming_invites: previous.incoming_invites.filter((entry) => entry.id !== invite.id),
                        friends: previous.friends.includes(invite.from_player_id)
                          ? previous.friends
                          : [...previous.friends, invite.from_player_id],
                      }));
                    }}
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="gameplay-card">
          <h3>{gameplayLabel(locale, 'input_resilience_title')}</h3>
          <p>{isOnline ? gameplayLabel(locale, 'connectivity_online') : gameplayLabel(locale, 'connectivity_offline')}</p>
          <p>{gameplayLabel(locale, 'controller_hint')}</p>
          <div className="gameplay-inline">
            <label>
              {gameplayLabel(locale, 'locale_label')}
              <select
                aria-label="Gameplay locale"
                value={locale}
                onChange={(event) => onLocaleChange?.(event.target.value as GameplayLocale)}
              >
                <option value="en">English</option>
                <option value="es">Espanol</option>
              </select>
            </label>
            <label>
              {gameplayLabel(locale, 'gamepad_preset_label')}
              <select
                aria-label="Gamepad preset"
                value={gamepadPreset}
                onChange={(event) => onGamepadPresetChange?.(event.target.value as 'standard' | 'lefty')}
              >
                <option value="standard">Standard</option>
                <option value="lefty">Lefty</option>
              </select>
            </label>
          </div>
          <div className="gameplay-inline">
            <button
              className="ghost-button"
              type="button"
              onClick={() => onToggleGamepad?.(!gamepadEnabled)}
            >
              {gamepadEnabled ? gameplayLabel(locale, 'toggle_gamepad_on') : gameplayLabel(locale, 'toggle_gamepad_off')}
            </button>
            <button className="ghost-button" type="button" onClick={() => onRetryConnectivity?.()}>
              {gameplayLabel(locale, 'retry_sync')}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
