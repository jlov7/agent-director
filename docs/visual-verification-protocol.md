# Visual Verification Protocol

Protocol version: `1.0.0`  
Last updated: `2026-02-22`

## Purpose

Define a deterministic, machine-verifiable visual QA contract that is reusable across Codex projects.

## Required Runtime Controls

Any visual-critical surface must support deterministic test-mode controls:

- `seed=<int>`: seed all randomness used by layout/animation/jitter.
- `static=1`: disable runtime animation behavior for capture mode.
- `ticks=<int>`: advance simulation/update loop deterministically, then stop.
- `debug=1`: expose debug metadata and overlays for assertions.

## Required Readiness + Debug API

Expose these globals in test mode:

- `window.__READY: boolean` set to `true` only after the surface has stabilized.
- `window.__constellationDebug(): VisualDebugContract` returning machine-readable geometry/debug state.

`VisualDebugContract` fields:

- `dpr: number`
- `canvas: { w: number; h: number; cssW: number; cssH: number }`
- `nodes: Array<{ id: string; x: number; y: number; r: number; w: number; h: number }>`
- `overlaps: Array<{ a: string; b: string }>`
- `clipped: string[]`
- `zeroSized: string[]`
- `invalid: string[]`
- `expectedNodeCount: number`
- `seed: number | null`
- `watermark: { sha: string; viewport: string; dpr: string; seed: string; frame: string }`

## Required Assertions

At minimum, visual suites must assert:

- No overlaps.
- No clipped nodes/elements.
- No invalid (`NaN`/`Infinity`) geometry.
- No zero-sized elements.
- Canvas pixel size equals CSS size × DPR.
- Expected node/element count.
- Watermark includes current commit SHA, viewport, DPR, seed, frame/tick.

## Screenshot Contract

- Use Playwright `toHaveScreenshot`.
- Apply freeze stylesheet via `stylePath`.
- Keep Chromium strictest; allow bounded browser-specific raster diff budgets for Firefox/WebKit if geometry checks remain strict.
- Use project-scoped snapshot paths for matrix runs (e.g. include `{projectName}` in `snapshotPathTemplate`).

## Evidence Contract

Store artifacts in stable paths:

- `artifacts/visual-verification/*-assertions.json`
- `artifacts/visual-verification/*-watermark-proof.json`
- `artifacts/visual-verification/index.json`
- `ui/test-results/*-diff.png` for failures

## Required Commands

- Deterministic single-engine gate: `pnpm verify:visual`
- Cross-browser matrix gate: `pnpm -C ui test:e2e:visual-matrix`
- Full frontend gate: `pnpm verify:frontend`

## Adoption Checklist (Per Repo)

1. Add deterministic controls + readiness/debug API to target surface.
2. Add shared geometry helper.
3. Add deterministic visual suite with watermark checks.
4. Add freeze stylesheet and snapshot assertions.
5. Add artifact index generation.
6. Add `verify:visual` and optional `verify:frontend` scripts.
7. Add cross-browser matrix config with project-scoped snapshot paths.
