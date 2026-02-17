# Release Safety Runbook (Canary + Rollback)

Last updated: 2026-02-17

## Objective

Deploy safely with explicit rollback criteria and commands.

## Pre-Deploy Gate

All must pass:
- `make verify`
- `make doctor`
- `make scorecard`
- Latest GitHub `verify` workflow on `main` is green

## Canary Procedure

1. Deploy preview build and smoke-test critical journeys.
2. Deploy production canary (small traffic slice if platform supports).
3. Observe for 30-60 minutes:
   - API error rate
   - p95 latency
   - E2E critical action success
4. Promote to full rollout only if error/latency remain within baseline thresholds.

## Rollback Triggers

Rollback immediately if any of the following occurs:
- sustained elevated error rate;
- core mission loop unavailable;
- authentication/session corruption;
- severe data integrity risk.

## Rollback Commands

### Vercel

```bash
vercel ls agent-director
vercel rollback <deployment-url-or-id>
vercel inspect <deployment-url-or-id> --logs
```

### GitHub Pages

```bash
git revert <bad_commit_sha>
git push origin main
```

## Post-Rollback

- Open incident summary in `QUESTIONS.md` with root cause, impact window, and remediation.
- Add follow-up gap item in `GAPS.md` if a release gate missed the issue.
