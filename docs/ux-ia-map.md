# UX Information Architecture Map

Last updated: 2026-02-20

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

## IA v2 Route Mapping (Old -> New)

| Previous label/surface | New route | New action-first label | Notes |
|---|---|---|---|
| `Understand` workspace section | `overview` | `Review` | First-touch status and context review route. |
| `Diagnose` workspace section | `diagnose` | `Diagnose` | Deep analysis route with contextual mode switcher. |
| `Validate` nav entry | `triage` + analysis tooling | `Triage` | Validation is no longer a standalone global nav route. |
| `Coordinate` workspace section | `coordinate` | `Coordinate` | Ownership and responder alignment route. |
| `Configure` workspace section | `settings` | `Configure` | Consolidated setup/preferences controls. |
| Global toolbar mode tabs | analysis context panel | `Analysis tools` | Mode switching moved out of always-visible global strip in route-shell mode. |

## Route Transition Rules

- Route transitions update the canonical breadcrumb (`Workspace / <Route> / <Mode>`).
- Route transitions map directly to a single active workspace section.
- Validation-focused transitions are gated to analysis routes rather than global navigation.

## Navigation Rules
- Use action-first labels (`Review`, `Triage`, `Diagnose`, `Coordinate`, `Configure`) for route-shell navigation.
- Keep exactly one primary CTA per workspace section header.
- Keep advanced/diagnostic controls behind explicit progressive disclosure.

## Orientation Rules
- Every workspace section must expose:
  - section title indicating user intent,
  - one-line description of expected outcome,
  - one primary action.
- Main toolbar must include semantic heading and remain independently understandable by screen reader users.
