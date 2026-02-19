# UX Information Architecture Map

Last updated: 2026-02-19

## Top User Intents
1. Understand this run.
2. Diagnose root cause.
3. Coordinate responders.
4. Configure workspace.
5. Execute mode-specific analysis (Cinema, Flow, Compare, Matrix, Gameplay).

## Surface Mapping

| Intent | Primary Surface | Primary CTA | Secondary Controls |
|---|---|---|---|
| Understand this run | Workspace section: `Understand` | `Save current view` | Saved views/apply/delete, persona progression |
| Diagnose root cause | Workspace section: `Diagnose` | `Queue narrative export` | Async actions, diagnostics export queue |
| Coordinate responders | Workspace section: `Coordinate` | `Share live link` | Ownership fields, handoff digest, activity feed |
| Configure workspace | Workspace section: `Configure` | `Open setup wizard` | Feature flags, support panel, settings center |
| Execute mode analysis | Toolbar mode switcher | Select mode | Advanced controls (TraceQL, extension runner) behind explicit toggle |

## Navigation Rules
- Use action-first labels (`Understand`, `Diagnose`, `Coordinate`, `Configure`) for workspace-level navigation.
- Keep exactly one primary CTA per workspace section header.
- Keep advanced/diagnostic controls behind explicit progressive disclosure.

## Orientation Rules
- Every workspace section must expose:
  - section title indicating user intent,
  - one-line description of expected outcome,
  - one primary action.
- Main toolbar must include semantic heading and remain independently understandable by screen reader users.
