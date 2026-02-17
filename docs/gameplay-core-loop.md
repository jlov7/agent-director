# Gameplay Core Loop (v1)

Target session length: **18-22 minutes**.

## Loop Stages

1. **Brief**
   - Inspect the run, set intent, and join/create a session.
2. **Execute**
   - Progress raid objectives, campaign missions, and tactical actions.
3. **Adapt**
   - Apply narrative choices, loadout changes, and liveops balancing.
4. **Resolve**
   - End with a clear run outcome: `win`, `loss`, or `partial`.

## Outcome Model

- `in_progress`: run has started and no decisive outcome yet.
- `partial`: meaningful progress or setbacks, but run is still open.
- `win`: run target met (for example campaign depth/boss clear/operator victory).
- `loss`: run fails due to collapse conditions.

## Telemetry Funnel Names

These events are emitted and persisted in local storage (`agentDirector.gameplayFunnel.v1`):

- `funnel.session_start`
- `funnel.first_objective_progress`
- `funnel.first_mission_outcome`
- `funnel.run_outcome`
- `funnel.tutorial_start`
- `funnel.tutorial_skip`
- `funnel.tutorial_complete`

## Difficulty Ramp Contract

Campaign difficulty uses deterministic depth bands (`difficultyForDepth`):

- Depth 1 -> difficulty 1
- Depth 2-3 -> difficulty 2
- Depth 4-5 -> difficulty 3
- Depth 6-7 -> difficulty 4
- Depth 8-9 -> difficulty 5
- Depth 10-12 -> difficulty 6
- Depth 13-16 -> difficulty 7
- Depth 17-20 -> difficulty 8
- Depth 21-24 -> difficulty 9
- Depth 25+ -> difficulty 10
