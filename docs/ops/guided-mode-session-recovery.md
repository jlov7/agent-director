# Guided Mode + Session Recovery Runbook

## When To Use
Use this runbook when users report one or more of:
- "Too much on screen" during first run.
- "Workspace session expired" blocking write actions.
- Missing onboarding guidance after deployment.

## Guided Mode Behavior
- Onboarding `select` stage is now a clean first-run gateway (persona choice + one start action only).
- Route nav, insight strip, and workspace context scaffolding stay hidden during `select` to avoid overload.
- Route-shell guided mode is active while onboarding is not completed.
- Advanced workspace surfaces are hidden until explicit opt-in with `Open full workspace now` (available once guided checklist starts).
- After onboarding completion, focused mode remains default; full analysis stays explicit via `Open analysis canvas`.

## Session Recovery Behavior
- If stale local state indicates an expired session on route shell load, app auto-recovers by:
  - renewing session,
  - restoring operator role when needed,
  - preserving onboarding progress (does not force reset back to `select`),
  - reopening guided tools when needed,
  - suppressing misleading stale-expiry warning.

## Operator Verification Steps
1. Open app with stale local state (`sessionExpiresAt` in past).
2. Confirm header shows active session time (not expired).
3. Confirm onboarding/guided controls are visible for first-run stage.
4. Confirm `Workspace session expired...` warning is not shown during auto-recovery.

## Escalation Payload
If issue persists:
1. Open support diagnostics from contextual recovery points.
2. Copy diagnostics payload.
3. Include active route, onboarding stage, workspace role, and session label in ticket.
