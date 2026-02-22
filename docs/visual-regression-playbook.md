# Visual Regression Playbook

## FE-076: Optional Semantic Diff Layer

Optional cloud semantic diff can be enabled with Percy for broader change semantics.

- Existing integration command: `pnpm -C ui percy:playwright`
- Use as supplemental signal; deterministic local contracts remain source-of-truth.

## FE-077: PR Failure Comment Format

Visual matrix workflow posts a PR comment on failure with:

- failing browser project
- artifact bundle name
- repro commands
- index path for assertion + watermark status

Workflow:

- `.github/workflows/visual-verify.yml`

## FE-091: Shared Artifact Viewer

- Generate index: `scripts/visual_artifact_index.mjs`
- Generate viewer: `scripts/visual_artifact_viewer.mjs`
- Output: `artifacts/visual-verification/viewer.html`

## FE-092: Triage Runbook

When visual suite fails:

1. Check geometry assertions first (`*-assertions.json`).
2. If geometry fails, fix layout/settlement before touching snapshots.
3. If geometry passes, inspect `*-diff.png` in `ui/test-results`.
4. Confirm watermark (`sha`, `viewport`, `dpr`, `seed`, `frame`) is current.
5. Reproduce with:

```bash
pnpm verify:visual
pnpm -C ui test:e2e:visual-matrix
```

6. Only after intentional design confirmation, update snapshots.
