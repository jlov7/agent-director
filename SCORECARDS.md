# System Scorecards (v1)

This repo enforces 10/10 release quality via measurable scorecards.

Generate scorecards and evidence:

```bash
make scorecard
```

Artifact output:
- `artifacts/scorecards.json`
- `artifacts/doctor.json`

## Scoring Model
- Each domain is binary-scored: pass criteria = `10/10`, otherwise `0/10`.
- Release target is strict: every domain must be `10/10`.

## Domains

| Domain | 10/10 Criteria |
|--------|----------------|
| Journey UX | Deep UX probe suite passes, critical journey specs pass, and journey/onboarding/accessibility gates pass. |
| Frontend Engineering | Strict verify pipeline passes (lint/typecheck/build/unit/e2e/mutation). |
| Backend Reliability | Backend probe suite passes (API + replay engine invariants) and strict verify passes. |
| Security Hygiene | Secret scan + dependency audit + security release gate pass. |
| Frontier Evidence Loop | Real/adversarial trace corpus imports, generates eval cases, runs deterministic evals, and preserves replay truth. |
| System Coherence | Active product/release docs stay aligned with the observability thesis, current scorecard totals, and archived legacy gameplay planning. |
| Performance | Performance gate passes, Lighthouse representative performance >= `0.85`, and CLS <= `0.1`. |
| Docs & Enablement | Docs gate passes with required launch and steering artifacts present. |
| CI & Release Signals | CI gate passes on active PR checks. |

## Current Operation Rule
- Do not consider release-ready unless total score is perfect:
  - `90/90` and `all_perfect=true` in `artifacts/scorecards.json`.
