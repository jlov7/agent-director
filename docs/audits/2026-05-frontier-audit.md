# Frontier Audit: 2026-05

Date: 2026-05-07

## Summary

Agent Director is strongest when it helps a team turn an agent run into a concrete improvement loop. The product should not stop at a polished trace viewer. The frontier version needs to ingest real traces, preserve provenance, explain replay truthfully, create eval cases from failures, and make release evidence visible in the core journey.

Baseline evidence on 2026-05-07:
- `make doctor` failed with `overall_status=fail`.
- `verify_strict=pass`, so core local quality was not the immediate blocker.
- `dependency_audit=fail` because `ui > dagre > lodash` hit high advisory `GHSA-r5fr-rjxr-66jc`.
- `ci_status=fail` because doctor only accepted a recent `verify` run and did not use the successful `verify-strict` main workflow as release verification evidence.
- Gates failed: `G6-security`, `G8-ci`.

External bar used for this audit:
- OpenAI Agents SDK tracing and SDK evolution.
- OpenTelemetry GenAI semantic conventions.
- OpenInference-style span provenance.
- LangSmith, Langfuse, Phoenix, and Braintrust observability/eval positioning.

## First-Principles Thesis

An agent observability product is useful only if it can answer five questions with evidence:

1. What actually happened?
2. Why did it happen?
3. What did the system believe at each step?
4. What change would likely prevent the failure?
5. How do we know the change stays fixed?

Before this wave, Agent Director was visually strong but too demo-shaped. It could inspect and replay local traces, but it lacked enough real-world ingestion, eval creation, and replay truth labeling to compete as a production agent improvement system.

## Ranked Findings

| Rank | Area | Finding | Severity | Status |
|---|---|---|---|---|
| F-001 | Security gate | Dependency audit was blocked by abandoned `dagre` pulling vulnerable `lodash`. | P0 | Closed in this wave by moving layout to `@dagrejs/dagre`. |
| F-002 | CI evidence | Doctor rejected current successful `verify-strict` main runs when `verify` was absent from recent GitHub runs. | P0 | Closed in this wave with explicit release workflow fallback semantics. |
| F-003 | Product focus | Public API/docs exposed gameplay systems that dilute the agent observability thesis. | P0 | Closed in this wave by disabling gameplay APIs by default and removing them from public docs. Full deletion remains a separate approval checkpoint. |
| F-004 | Trace correctness | The system lacked typed import for real Agent Director, OpenAI Agents-style, OTel GenAI, and OpenInference spans. | P0 | Closed in this wave with `POST /api/traces/import`, provenance fields, importer warnings, and tests. |
| F-005 | Improvement loop | Failed traces could not become deterministic eval evidence. | P1 | Closed in this wave with eval-case and eval-run APIs plus Diagnose-route evidence controls. |
| F-006 | Replay truth | Simulated replay risked being perceived as actual re-execution. | P1 | Closed in this wave by adding `executionMode` and `truthLabel` metadata. |
| F-007 | API contract | OpenAPI/generated client/docs lagged new surfaces. | P1 | Closed in this wave by updating OpenAPI and generated UI client artifacts. |
| F-008 | Frontend complexity | `ui/src/App.tsx` is still too large for sustained product velocity. | P1 | In Progress. This wave only added route orchestration props where touched; a broad refactor should be separately planned. |
| F-009 | Production validation | Imported real traces need permanent E2E coverage through route-shell journeys. | P1 | Open. Backend/unit/API coverage exists; full browser journey fixture remains next. |
| F-010 | Eval sophistication | Current evals are deterministic trace-state checks, not semantic/LLM evaluator pipelines. | P2 | Open. This is acceptable for v1 evidence but not the final frontier bar. |
| F-011 | Cost/latency analysis | Import schema captures token metadata, but UI cost/latency rollups remain shallow. | P2 | Open. |
| F-012 | Multi-tenant ops | Auth/tenant boundaries exist for new import/eval surfaces, but broader deployment hardening needs external environment validation. | P2 | Open. |

## Implementation Waves

### Wave 0: Restore Green Gates

Done:
- Added regression coverage for doctor CI fallback.
- Doctor now accepts the newest successful `main` run for `verify` or `verify-strict`, preferring `verify` when both exist.
- Replaced `dagre` with maintained `@dagrejs/dagre`.
- Verified `pnpm -C ui audit --prod --audit-level high` passes after dependency resolution.

### Wave 1: Remove Product Drift

Done:
- Added `AGENT_DIRECTOR_ENABLE_GAMEPLAY`.
- Gameplay API and SSE surfaces return `404` unless explicitly enabled.
- Public API docs and privacy copy no longer present gameplay as part of v1.

### Wave 2: Real Trace Ingestion

Done:
- Added `POST /api/traces/import`.
- Supported sources: `agent_director`, `openai_agents`, `otel_genai`, `openinference`.
- Normalized span arrays and OTLP-style `resourceSpans` into `TraceSummary` and `StepDetails`.
- Added provenance fields for provider trace/span IDs, parent span ID, framework/source, provider/model metadata, token metrics, and importer warnings.
- Added tenant assignment and audit events for imported traces.

### Wave 3: Trace-to-Eval

Done:
- Added eval case creation from trace evidence.
- Added deterministic eval runs and persisted eval evidence.
- Added UI controls in the Diagnose route for creating eval cases and running the eval suite.

### Wave 4: Replay Truth

Done:
- Added replay `executionMode` and `truthLabel`.
- Recorded replay is labeled as copied trace evidence.
- Hybrid/live simulated replay is labeled as counterfactual simulation, not actual live agent execution.

### Wave 5: Quality and Frontier Follow-Through

Done in this wave:
- Updated OpenAPI, generated UI client path set, README, technical guide, and API reference.
- Added targeted backend and frontend tests for the new contracts.

Still needed:
- Add E2E coverage that imports a real fixture, opens the trace through route-shell journeys, creates an eval case, and verifies replay/eval truth copy.
- Continue shrinking `App.tsx` only around route orchestration boundaries as future changes touch it.
- Add richer evaluator types after the deterministic v1 loop is stable.

## Acceptance Evidence

Completed targeted checks:
- `python3 -m unittest server.tests.test_doctor_ci server.tests.test_trace_import server.tests.test_evals_api server.tests.test_replay_engine server.tests.test_api server.tests.test_gameplay_api`
- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui test -- src/store/api.test.ts src/routes/__tests__/WorkspaceRoute.test.tsx`

Completed full gates:
- `make verify`
- `make verify-frontend`
- `make doctor`
- `make scorecard`

Current release artifacts:
- `artifacts/doctor.json` refreshed on 2026-05-07 with `overall_status=pass` and `G1` through `G8` all true.
- `artifacts/scorecards.json` refreshed on 2026-05-07 with `70/70` and `all_perfect=true`.

## Next Backlog

P1:
- Add imported-trace E2E fixture through route-shell Diagnose and eval creation.
- Add eval evidence summary to release artifacts or scorecard.
- Split route orchestration state from `App.tsx` when the next UI wave touches this area.

P2:
- Add semantic evaluator adapters.
- Add richer cost/latency imported-trace UI rollups.
- Add production deployment validation for auth/tenant import and eval workflows.
