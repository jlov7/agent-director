# Live Balancing Runbook

Last updated: 2026-02-17

## Objective

Tune gameplay difficulty and economy safely without destabilizing active users.

## Inputs

- Session completion rate
- Failure ratio
- Boss defeat ratio
- LiveOps challenge completion ratio
- Economy velocity (credits/materials earned vs spent)

## Weekly Balancing Workflow

1. Review telemetry trends for prior week.
2. Propose small parameter deltas.
3. Apply canary tuning in controlled window.
4. Validate no severe regressions.
5. Promote and record change log.

## Guardrails

- Avoid >10% weekly parameter shifts unless incident-driven.
- Change one major system at a time (difficulty, economy, or rewards).
- Roll back if completion or stability drops sharply.

## Change Log Template

- Date
- Parameter changed
- Old value -> new value
- Expected effect
- Observed effect after 24h/72h
