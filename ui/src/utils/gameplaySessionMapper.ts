import type { GameplaySession } from '../types';
import type { GameplayState } from './gameplayEngine';

export function mapGameplaySessionToState(
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
