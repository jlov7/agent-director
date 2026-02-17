# Pre-Release Hardening and Deployment Integrity Plan

> **For Codex:** Execute this plan in strict ID order and update tracker status after every task.

**Goal:** Close the final deployment and documentation hardening gaps so release evidence, Vercel behavior, and public docs stay deterministic.

**Architecture:** Keep the existing product architecture unchanged. Add only release-process hardening around deployment config, verification scripts, and public-facing docs. Prefer additive docs/scripts over structural refactors.

**Tech Stack:** Vite, pnpm workspaces, Vercel, Python release scripts, Markdown docs.

---

## Task RRH-001: Final hardening tracker sync

**Files:**
- Modify: `TASKS.md`
- Modify: `.codex/PLANS.md`
- Modify: `.codex/SCRATCHPAD.md`

**Steps:**
1. Add a dedicated section for this hardening wave with explicit task IDs.
2. Mark only the currently running task as `in_progress`.
3. Keep all downstream tasks as `todo` until implemented and verified.

**Done when:** tracker, plans, and scratchpad all reference the same task set and status.

---

## Task RRH-002: Deterministic Vercel toolchain hardening

**Files:**
- Create: `package.json`
- Modify: `vercel.json`

**Steps:**
1. Add a root `package.json` with `private: true` and explicit `packageManager` pin for deterministic pnpm behavior in CI/Vercel.
2. Keep existing workspace semantics intact (no script behavior changes).
3. Ensure Vercel still builds from `ui` output and no deployment behavior regresses.

**Done when:** Vercel no longer relies on inferred pnpm versioning and config remains valid.

---

## Task RRH-003: Deployment verification automation

**Files:**
- Create: `scripts/vercel_release_check.sh`
- Modify: `Makefile`

**Steps:**
1. Add a release-check script that validates Vercel CLI auth, inspects production deployment, and confirms `Ready` status.
2. Add a Make target to run this script non-interactively.
3. Keep script output concise and CI-friendly.

**Done when:** `make vercel-check` returns success with current production deployment status.

---

## Task RRH-004: Public docs hardening for deployment ops

**Files:**
- Modify: `README.md`
- Modify: `docs/hosting.md`

**Steps:**
1. Document deterministic toolchain expectations for Vercel builds.
2. Add explicit operator runbook commands for pre-deploy and post-deploy verification.
3. Preserve existing R&D/passion-project disclaimer footer at README bottom.

**Done when:** docs are consistent, accurate, and include an explicit verification flow.

---

## Task RRH-005: Verification and release evidence refresh

**Files:**
- Modify: `TASKS.md`
- Modify: `.codex/PLANS.md`
- Modify: `.codex/SCRATCHPAD.md`
- Artifacts: `artifacts/doctor.json`, `artifacts/scorecards.json`

**Steps:**
1. Run `make verify`.
2. Run `make doctor`.
3. Run `make scorecard`.
4. Run `make vercel-check`.
5. Mark RRH tasks complete only after all checks pass.

**Done when:** all RRH tasks are marked `done` with fresh passing evidence.
