# Browser Quirk Playbook

## Scope

Known browser/rendering differences and approved mitigations for Agent Director visual verification.

## Snapshot Isolation

- Use per-project snapshot paths in visual matrix config: `{projectName}` in `snapshotPathTemplate`.
- Never share one baseline file across Chromium/Firefox/WebKit.

## Known Quirks

- Firefox/WebKit can differ in subpixel text rasterization and anti-aliasing.
- WebKit tablet profile can produce small pixel variance on dense gradients.
- Height drift may appear if container fit/settlement is not explicitly stabilized.

## Mitigations

- Keep geometry assertions strict and engine-agnostic.
- Allow bounded browser-specific screenshot diff ratio only for raster noise.
- Apply deterministic freeze styles (`stylePath`) for captures.
- Force fit/settlement before `window.__READY` in flow canvas.

## Verification Commands

- `pnpm verify:visual`
- `pnpm -C ui test:e2e:visual-matrix`

## Escalation

Escalate as defect when:

- Geometry assertions fail.
- Diff is structural (layout/position/content) instead of raster-only.
- Same browser profile regresses across repeated runs.
