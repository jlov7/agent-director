# SaaS UX World-Class Sweep Plan

> **For Codex:** Execute in strict task order, keep tracker status current, and verify after each batch.

**Goal:** Upgrade Agent Director frontend UX/UI and core journeys to SaaS-grade release quality with no critical journey gaps.

**Approach:** Deliver in batches: platform UX foundations first (routing, app states, notifications, SEO/PWA), then journey expansion (auth/workspace/RBAC/provisioning), then polish/governance (analytics, support, experimentation, CI UX gates).

## Task Groups

### Group A — Platform UX Foundations (P0)
1. Deep-link URL state for mode/trace/step and shareable journeys.
2. Unified app state surfaces (loading/empty/error/recovery).
3. Global notification center for success/warn/error events.
4. Retry/cancel/resume UX consistency for async actions.
5. SEO baseline (`robots.txt`, sitemap, metadata).
6. PWA baseline (manifest, icons, service worker, theme color).
7. Keyboard and accessibility parity pass for new controls.
8. Cross-browser smoke matrix for core journeys.

### Group B — SaaS Journey Core (P0/P1)
9. Auth/session UX contract and session-expiry flow.
10. Workspace/organization switcher in global header.
11. Role-aware UI states (viewer/operator/admin).
12. First-run setup wizard (data source/import/invite).
13. Global navigation IA polish.
14. Recoverable destructive actions (confirm + undo).
15. System support entry flow (diagnostics + handoff).

### Group C — World-Class Product UX (P1)
16. Persona-driven onboarding and mission progression.
17. Saved views and journey presets.
18. Command palette intelligence v2.
19. Collaboration handoff and ownership refinements.
20. Export center UX and retry queue.
21. Form validation consistency layer.
22. Responsive and small-screen interaction polish.

### Group D — Product Intelligence + Quality Governance (P1/P2)
23. Product analytics taxonomy and instrumentation pass.
24. Frontend error/perf telemetry integration.
25. Experiment/feature-flag-ready UX hooks.
26. CI gates for UX (SEO/PWA + accessibility + visual quality).
27. Documentation sweep for SaaS UX operations.

## Validation Gates

- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e`
- `make verify-ux`
- `make verify`
- `make doctor`

## Completion Criteria

- No open P0 UX gap from this plan.
- Core journeys are deep-linkable and recoverable.
- SEO/PWA baseline passes configured checks.
- Documentation reflects shipped UX behavior and operator workflows.
