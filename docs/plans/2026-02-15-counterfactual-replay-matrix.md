# Counterfactual Replay Matrix + Causal Diff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a matrix workflow that runs multiple replay scenarios from one anchor step and ranks likely root-cause factors by observed outcome deltas.

**Architecture:** Add a backend replay-job layer that executes scenario batches and emits N-way summary artifacts. Reuse existing replay and diff primitives, then extend the UI with a new matrix mode that shows sortable outcomes and causal rankings. Keep v1 deterministic and sequential for reliability, then harden with cancellation, limits, and performance protections.

**Tech Stack:** Python (`http.server`, unittest), TypeScript/React (Vite, Vitest, Playwright), existing `server/replay/*`, `server/main.py`, and `ui/src/*`.

---

## Scope and Acceptance Criteria

- [x] User can define 2-N replay scenarios from a selected step.
- [x] Backend executes scenarios and exposes progress, status, and errors per scenario.
- [x] Matrix summary returns base-vs-scenario deltas for cost, wall time, errors, and changed steps.
- [x] Causal panel ranks factors with score, confidence, and evidence.
- [x] Matrix UI supports sort, inspect, compare jump, and safe export behavior.
- [x] Docs include quickstart and troubleshooting for matrix mode and missing env vars.

## Out of Scope for v1

- Distributed workers or background queue infra.
- Statistical causality guarantees beyond heuristic ranking.
- Cross-job global analytics dashboard.

## Implementation Rules

- TDD required for each behavior change (red, green, refactor).
- Keep each commit to one logical slice.
- Do not exceed five touched files per micro-slice without explicit approval.
- Prefer additive changes over refactors unless required by failing tests.

---

### Task 1: Replay Job Domain Model

**Files:**
- Create: `server/replay/jobs.py`
- Create: `server/tests/test_replay_jobs.py`
- Modify: `server/replay/__init__.py`

**Step 1: Write the failing test**
- Add tests for:
- `create_job` initializes `queued` state and scenario metadata.
- `start_next_scenario` transitions to `running`.
- `complete_scenario` and `fail_scenario` update per-scenario status.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_replay_jobs -v`
- Expected: `FAIL` with missing module/function errors.

**Step 3: Write minimal implementation**
- Add dataclasses/types for:
- `ReplayScenario`
- `ReplayJob`
- `ReplayJobStore` (in-memory for v1)

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_replay_jobs -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/replay/jobs.py server/replay/__init__.py server/tests/test_replay_jobs.py`
- `git commit -m "feat: add replay job domain primitives"`

---

### Task 2: Replay Job Submission API

**Files:**
- Modify: `server/main.py`
- Modify: `server/tests/test_api.py`

**Step 1: Write the failing test**
- Add API tests for:
- `POST /api/replay-jobs` with valid payload returns `202` and job ID.
- Invalid payload returns `400` with actionable error.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `FAIL` due to 404/missing handler.

**Step 3: Write minimal implementation**
- Add request validation and endpoint wiring in `ApiHandler.do_POST`.
- Return minimal job payload: `id`, `status`, `scenarioCount`, timestamps.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/main.py server/tests/test_api.py`
- `git commit -m "feat: add replay job submission endpoint"`

---

### Task 3: Replay Job Status and Cancel APIs

**Files:**
- Modify: `server/main.py`
- Modify: `server/tests/test_api.py`
- Modify: `server/replay/jobs.py`

**Step 1: Write the failing test**
- Add tests for:
- `GET /api/replay-jobs/{job_id}` status payload.
- `POST /api/replay-jobs/{job_id}/cancel` cancels queued/running job.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `FAIL` on missing routes/status changes.

**Step 3: Write minimal implementation**
- Implement lookup, serialization, and cancel transition behavior.
- Ensure canceled job cannot be resumed.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/main.py server/replay/jobs.py server/tests/test_api.py`
- `git commit -m "feat: add replay job status and cancel endpoints"`

---

### Task 4: Scenario Execution Engine (Sequential v1)

**Files:**
- Modify: `server/replay/jobs.py`
- Modify: `server/main.py`
- Modify: `server/tests/test_replay_jobs.py`

**Step 1: Write the failing test**
- Add tests verifying:
- Job runner executes scenarios in order.
- Scenario stores generated replay trace IDs.
- Failure in one scenario does not drop completed results.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_replay_jobs -v`
- Expected: `FAIL` due to missing runner behavior.

**Step 3: Write minimal implementation**
- Call existing `replay_from_step` for each scenario.
- Ingest resulting traces and update job progress.
- Capture per-scenario exception text.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_replay_jobs -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/replay/jobs.py server/main.py server/tests/test_replay_jobs.py`
- `git commit -m "feat: execute replay job scenarios sequentially"`

---

### Task 5: N-Way Matrix Summary

**Files:**
- Create: `server/replay/matrix.py`
- Create: `server/tests/test_matrix.py`
- Modify: `server/replay/__init__.py`

**Step 1: Write the failing test**
- Add tests for:
- Base-vs-scenario metric deltas.
- Changed-step count from diff results.
- Stable row ordering by scenario index.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_matrix -v`
- Expected: `FAIL` with missing module/function.

**Step 3: Write minimal implementation**
- Build `build_matrix_summary(base_trace, scenario_traces)`.
- Reuse `compare_traces` for per-scenario deltas.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_matrix -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/replay/matrix.py server/replay/__init__.py server/tests/test_matrix.py`
- `git commit -m "feat: add n-way matrix summary builder"`

---

### Task 6: Causal Ranking Heuristic

**Files:**
- Modify: `server/replay/matrix.py`
- Modify: `server/tests/test_matrix.py`

**Step 1: Write the failing test**
- Add tests for:
- Rank factors that consistently reduce target metric.
- Tie handling and deterministic order.
- Low-evidence scenarios lower confidence.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_matrix -v`
- Expected: `FAIL` for missing ranking behavior.

**Step 3: Write minimal implementation**
- Add `rank_causal_factors(rows)` that outputs:
- `factor`, `score`, `confidence`, `evidence`.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_matrix -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/replay/matrix.py server/tests/test_matrix.py`
- `git commit -m "feat: add causal factor ranking for replay matrix"`

---

### Task 7: Matrix API Endpoint

**Files:**
- Modify: `server/main.py`
- Modify: `server/tests/test_api.py`

**Step 1: Write the failing test**
- Add test for:
- `GET /api/replay-jobs/{job_id}/matrix` returns rows + causal ranking.

**Step 2: Run test to verify it fails**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `FAIL` on missing route.

**Step 3: Write minimal implementation**
- Wire endpoint and compute matrix only when job has completed scenarios.
- Return partial rows for partially completed jobs.

**Step 4: Run test to verify it passes**
- Run: `python3 -m unittest server.tests.test_api -v`
- Expected: `OK`.

**Step 5: Commit**
- `git add server/main.py server/tests/test_api.py`
- `git commit -m "feat: expose replay job matrix summary endpoint"`

---

### Task 8: UI Contracts and API Client

**Files:**
- Modify: `ui/src/types.ts`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/store/api.test.ts`

**Step 1: Write the failing test**
- Add tests for:
- `createReplayJob`, `fetchReplayJob`, `fetchReplayMatrix`, `cancelReplayJob`.
- API fallback behavior when backend unavailable.

**Step 2: Run test to verify it fails**
- Run: `pnpm -C ui test -- run src/store/api.test.ts`
- Expected: `FAIL` due to missing exports/functions.

**Step 3: Write minimal implementation**
- Add typed interfaces and client methods in `api.ts`.

**Step 4: Run test to verify it passes**
- Run: `pnpm -C ui test -- run src/store/api.test.ts`
- Expected: `PASS`.

**Step 5: Commit**
- `git add ui/src/types.ts ui/src/store/api.ts ui/src/store/api.test.ts`
- `git commit -m "feat: add replay job client contracts"`

---

### Task 9: Matrix Mode Shell in App

**Files:**
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/components/Header/index.tsx`
- Create: `ui/src/components/Matrix/index.tsx`
- Create: `ui/src/components/__tests__/Matrix.test.tsx`

**Step 1: Write the failing test**
- Add tests for:
- New mode toggle appears.
- Matrix placeholder renders loading/error/empty states.

**Step 2: Run test to verify it fails**
- Run: `pnpm -C ui test -- run src/components/__tests__/Matrix.test.tsx`
- Expected: `FAIL` on missing component/mode.

**Step 3: Write minimal implementation**
- Add `matrix` mode to app state and header controls.
- Render a simple matrix view shell.

**Step 4: Run test to verify it passes**
- Run: `pnpm -C ui test -- run src/components/__tests__/Matrix.test.tsx`
- Expected: `PASS`.

**Step 5: Commit**
- `git add ui/src/App.tsx ui/src/components/Header/index.tsx ui/src/components/Matrix/index.tsx ui/src/components/__tests__/Matrix.test.tsx`
- `git commit -m "feat: add matrix mode shell"`

---

### Task 10: Matrix Table + Causal Panel

**Files:**
- Modify: `ui/src/components/Matrix/index.tsx`
- Modify: `ui/src/styles/main.css`
- Create: `ui/src/components/Matrix/CausalPanel.tsx`
- Create: `ui/src/components/Matrix/ScenarioTable.tsx`
- Modify: `ui/src/components/__tests__/Matrix.test.tsx`

**Step 1: Write the failing test**
- Add tests for:
- Sort by wall-time delta and cost delta.
- Render causal factor chips with confidence label.

**Step 2: Run test to verify it fails**
- Run: `pnpm -C ui test -- run src/components/__tests__/Matrix.test.tsx`
- Expected: `FAIL` on missing behavior.

**Step 3: Write minimal implementation**
- Implement sortable table + causal list.
- Keep styling aligned with current design system.

**Step 4: Run test to verify it passes**
- Run: `pnpm -C ui test -- run src/components/__tests__/Matrix.test.tsx`
- Expected: `PASS`.

**Step 5: Commit**
- `git add ui/src/components/Matrix/index.tsx ui/src/components/Matrix/CausalPanel.tsx ui/src/components/Matrix/ScenarioTable.tsx ui/src/styles/main.css ui/src/components/__tests__/Matrix.test.tsx`
- `git commit -m "feat: render matrix summary and causal ranking panel"`

---

### Task 11: Scenario Builder + Execution Flow

**Files:**
- Modify: `ui/src/components/Inspector/index.tsx`
- Modify: `ui/src/App.tsx`
- Create: `ui/src/components/Matrix/ScenarioBuilder.tsx`
- Modify: `ui/src/components/__tests__/Inspector.test.tsx`

**Step 1: Write the failing test**
- Add tests for:
- Add/remove scenario rows.
- Validation for duplicate names.
- Submit triggers replay job creation.

**Step 2: Run test to verify it fails**
- Run: `pnpm -C ui test -- run src/components/__tests__/Inspector.test.tsx`
- Expected: `FAIL` for missing controls/behavior.

**Step 3: Write minimal implementation**
- Implement builder form and submit integration.
- Poll job status and update matrix view.

**Step 4: Run test to verify it passes**
- Run: `pnpm -C ui test -- run src/components/__tests__/Inspector.test.tsx`
- Expected: `PASS`.

**Step 5: Commit**
- `git add ui/src/components/Inspector/index.tsx ui/src/components/Matrix/ScenarioBuilder.tsx ui/src/App.tsx ui/src/components/__tests__/Inspector.test.tsx`
- `git commit -m "feat: add scenario builder and replay job flow"`

---

### Task 12: End-to-End + Docs + Verification Gate

**Files:**
- Create: `ui/tests/e2e/matrix-mode.spec.ts`
- Modify: `README.md`
- Modify: `docs/ux.md`
- Modify: `docs/index.md`

**Step 1: Write the failing E2E test**
- Add flow: create scenarios, run job, inspect matrix, jump to compare.

**Step 2: Run test to verify it fails**
- Run: `pnpm -C ui test:e2e -- ui/tests/e2e/matrix-mode.spec.ts`
- Expected: `FAIL` until UI/API wiring complete.

**Step 3: Write minimal implementation/docs**
- Close any missing wiring for the E2E path.
- Document matrix mode quickstart + troubleshooting.

**Step 4: Run full verification**
- Run: `make verify`
- Expected: full green; resolve any failures before merge.

**Step 5: Commit**
- `git add ui/tests/e2e/matrix-mode.spec.ts README.md docs/ux.md docs/index.md`
- `git commit -m "feat: ship matrix mode with tests and docs"`

---

## Risks and Mitigations

- Replay fan-out can spike runtime.
- Mitigation: hard cap scenario count and add cancellation.
- Causal ranking may be over-trusted.
- Mitigation: always expose confidence and evidence counts.
- API/UI drift across rapid slices.
- Mitigation: keep contract tests for replay-job and matrix endpoints.

## Verification Gates

1. Backend gate: `python3 -m unittest discover -s server/tests`
2. UI unit gate: `pnpm -C ui test`
3. UI E2E gate: `pnpm -C ui test:e2e`
4. Full gate: `make verify`

## Execution Order Recommendation

1. Tasks 1-4 (backend jobs)
2. Tasks 5-7 (matrix + causal API)
3. Tasks 8-11 (UI mode and flow)
4. Task 12 (E2E, docs, full verify)
