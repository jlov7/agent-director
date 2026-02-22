# UI Privacy + Security Checklist

## FE-079: UI Redaction Consistency Audit

Required checks:

- Safe export ON keeps sensitive payload values redacted.
- Raw payload controls are disabled while safe export is ON.
- Shared exports include redaction mode metadata.

Evidence:

- `ui/src/store/api.ts`
- `ui/src/components/Inspector/index.tsx`
- `ui/tests/e2e/ux-checklist.spec.ts`

## FE-080: Safe Export Guardrails

Guardrails:

- Disabling safe export requires explicit confirmation.
- High-risk toggles show undo path.
- Trust state messaging is visible in settings and route shell.

Evidence:

- `ui/src/App.tsx` (`requestConfirm`, `pushUndo`, `toggleSafeExportWithConfirm`)
- `ui/src/routes/SettingsRoute.tsx`

## FE-081: Rich Text Sanitization

Policy:

- No untrusted HTML rendering in UI (no `dangerouslySetInnerHTML`).
- User/share narratives are exported as plain text/markdown only.

Evidence:

- Search guard: no untrusted HTML sinks in `ui/src`.
- Markdown export paths in `ui/src/App.tsx`, `ui/src/components/Matrix/index.tsx`.

## FE-082: CSP Hardening Verification

Headers include CSP with restrictive defaults.

Evidence:

- `vercel.json` `Content-Security-Policy`.

## FE-083: Sensitive local/session storage lifecycle

Policy:

- Local/session storage only stores UX preferences/session continuity flags.
- No secrets or raw sensitive payloads are persisted in browser storage.
- Storage keys are reviewed when adding new persisted state.

Evidence:

- `ui/src/hooks/usePersistedState.ts`
- `ui/src/App.tsx` localStorage key usage.

## FE-084: Privacy Threat-Model Checklist

For any new frontend feature, answer before merge:

- Does it expose sensitive data in UI copy/export/logs?
- Does it add new persisted browser state containing sensitive values?
- Does it bypass safe export/redaction controls?
- Does it add external network destinations requiring CSP updates?
- Are user-facing trust states clear and reversible?
