# Next-Level Features ExecPlan

## Purpose / Big Picture

Deliver seven advanced capabilities requested in one coordinated push so Agent Director supports deeper replay control, realtime ingestion, semantic query, automated diagnosis, collaboration, stronger redaction policy, and extensibility.

## Scope

- In scope: production-ready v1 implementation for all seven requested feature families.
- Out of scope: unrelated refactors, visual redesigns, or speculative extras.

## Progress

- [x] Initialize exhaustive planning artifacts
- [x] Feature 1: Deterministic branchable replay v2
- [x] Feature 2: Live trace streaming + realtime cinema updates
- [x] Feature 3: TraceQL query engine + API + UI wiring
- [x] Feature 4: Root-cause investigator + evidence links
- [x] Feature 5: Multi-user collaboration primitives (comments/pins)
- [x] Feature 6: Policy-grade redaction with role-aware reveal auditing
- [x] Feature 7: Extension SDK surface and plugin execution
- [x] Full verification and evidence refresh

## Surprises & Discoveries

- Existing replay/diff/insights foundations enabled rapid feature layering.
- Visual/E2E snapshots required baseline refresh after toolbar/inspector growth.
- Inspector collaboration additions introduced selector collisions in E2E that required class-level disambiguation.

## Decision Log

- Used deterministic replay IDs and checkpoint signatures to stabilize branch replay semantics.
- Chose SSE for live trace updates with polling-safe client behavior.
- Implemented TraceQL as strict AND-clause parser for predictable behavior.
- Implemented investigator as deterministic hypothesis heuristics tied to evidence step IDs.
- Implemented collaboration as persisted step comments with pinned-note support.
- Enforced role policy for reveals (`viewer`/`analyst`/`admin`) plus persisted redaction audit events.
- Implemented extension SDK via server-side plugin discovery + run API + UI trigger.

## Risks

- Inspector tests emit non-fatal React act warnings due async updates in existing test style.
- Extension plugin API is intentionally minimal and may need hardening for untrusted plugins.

## Validation Plan

- Backend unit/API tests expanded for each feature track.
- UI unit tests expanded for API client and inspector collaboration flows.
- Visual snapshot baselines updated to match intentional UI surface changes.
- End-to-end verification and release artifacts refreshed.

## Outcomes & Retrospective

Done:
- All seven requested feature tracks delivered and integrated.
- All core verification gates green.
- Doctor and scorecard artifacts refreshed and passing.

Not done:
- No additional optional hardening beyond requested scope.

Lessons:
- Large additive feature drops need early snapshot strategy to reduce churn late in verification.
