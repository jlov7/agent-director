# Next-Level Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver all seven advanced feature tracks in Agent Director as production-capable v1 capabilities with end-to-end API/UI paths and verification.

**Architecture:** Extend the existing trace/replay core with additive domain modules and API endpoints, keeping current contracts stable while introducing deterministic replay metadata, realtime transport, query execution, investigation outputs, collaboration data, policy enforcement, and extension hooks. UI will add focused panels/toggles and call new endpoints through the existing store layer.

**Tech Stack:** Python (ThreadingHTTPServer + dataclasses + sqlite3), TypeScript/React, Vitest, Playwright, unittest.

---

### Task 1: Deterministic branchable replay v2

**Files:**
- Modify: `server/replay/engine.py`
- Modify: `server/trace/schema.py`
- Modify: `server/mcp/tools/replay_from_step.py`
- Modify: `server/main.py`
- Create: `server/replay/merge.py`
- Test: `server/tests/test_replay_engine.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- Replay IDs are deterministic for same `(source trace, step, strategy, modifications)`.
- Replay metadata includes checkpoint signatures per step.
- API supports merge operation for two replay branches.

### Task 2: Live trace streaming + realtime cinema

**Files:**
- Modify: `server/main.py`
- Create: `server/trace/live.py`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/hooks/useTrace.ts`
- Test: `server/tests/test_api.py`
- Test: `ui/src/store/api.test.ts`

**Acceptance criteria:**
- SSE endpoint streams latest trace updates.
- Client can subscribe/unsubscribe and update current trace in real time.
- Existing polling behavior remains safe fallback.

### Task 3: TraceQL

**Files:**
- Create: `server/trace/query.py`
- Modify: `server/main.py`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/types.ts`
- Modify: `ui/src/App.tsx`
- Test: `server/tests/test_query.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- Query language supports core filters (type/status/duration/name).
- API returns matched step IDs and explain metadata.
- UI can run TraceQL query and highlight matched steps.

### Task 4: Root-cause investigator

**Files:**
- Create: `server/trace/investigator.py`
- Modify: `server/main.py`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/types.ts`
- Modify: `ui/src/components/InsightStrip/index.tsx`
- Test: `server/tests/test_investigator.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- API returns ranked hypotheses with severity/confidence and linked step evidence.
- UI renders top hypotheses and jump links.

### Task 5: Collaboration primitives

**Files:**
- Modify: `server/trace/store.py`
- Modify: `server/main.py`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/components/Inspector/index.tsx`
- Test: `server/tests/test_store.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- Step comments can be created/listed per trace and step.
- Comments persist and are timestamped.
- UI displays and posts comments from inspector.

### Task 6: Policy-grade redaction engine

**Files:**
- Modify: `server/trace/schema.py`
- Modify: `server/trace/redaction.py`
- Modify: `server/mcp/tools/get_step_details.py`
- Modify: `server/main.py`
- Test: `server/tests/test_redaction.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- Redaction can enforce role policy (`viewer`, `analyst`, `admin`).
- Reveal attempts are audited for safe export compliance.
- Safe export path remains redaction-first and non-bypassable.

### Task 7: Extension SDK foundation

**Files:**
- Create: `server/extensions/loader.py`
- Create: `server/extensions/__init__.py`
- Create: `server/extensions/types.py`
- Modify: `server/main.py`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/src/App.tsx`
- Test: `server/tests/test_extensions.py`
- Test: `server/tests/test_api.py`

**Acceptance criteria:**
- Server discovers extension modules from `server/extensions/plugins`.
- API lists available extensions and can execute an extension for a trace.
- UI can list and run extension actions.

### Task 8: Verification + release evidence refresh

**Files:**
- Modify: `.codex/SCRATCHPAD.md`
- Modify: `.codex/PLANS.md`
- Potentially modify: `GAPS.md`, `RELEASE_GATES.md` (if new evidence notes needed)

**Acceptance criteria:**
- Targeted tests pass for each feature area.
- `make verify`, `make doctor`, and `make scorecard` pass.
- Tracking docs reflect final status and discoveries.
