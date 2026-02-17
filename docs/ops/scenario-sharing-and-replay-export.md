# Scenario Sharing + Replay Export

Last updated: 2026-02-17

## Objective

Enable safe scenario sharing/discovery and robust replay export artifacts without exposing sensitive content.

## Scenario Sharing (Current v1)

- Scenario sets support import/export as JSON in Matrix mode.
- Built-in scenario presets provide discoverability for common experiments.
- Safe-export mode enforces redaction-first behavior in export flows.
- Sensitive-key detection warns when scenario modifications include risky fields.

## Replay Export Artifacts

- Matrix export includes:
  - structured JSON summary (`buildMatrixExport`)
  - share-ready markdown digest (`buildMatrixMarkdown`)
- Exports record safe-export status and redaction metadata.
- Compare and matrix deltas include provenance fields for traceability.

## Moderation + Safety Guardrails

- Share workflow defaults to redacted output when safe export is enabled.
- Raw payload reveal is disabled when safe export is active.
- Unsafe key hints require manual acknowledgement before team sharing.

## Recommended Team Workflow

1. Build and validate scenarios in Matrix mode.
2. Run replay batch and inspect matrix causal ranking.
3. Export markdown + JSON using safe export.
4. Share artifact in team channel with trace IDs and objective context.

## Verification Evidence

- `ui/src/components/Matrix/index.tsx`
- `ui/src/utils/matrixExport.ts`
- `ui/src/utils/matrixExport.test.ts`
- `ui/src/store/api.test.ts`
