# Release Checklist (v1)

## Core User Journeys
- [x] Happy path is coherent end-to-end.
- [x] Key failure states are coherent end-to-end.
- [x] UX and copy are clear in both success and failure states.

## Onboarding
- [x] First-run onboarding is implemented.
- [x] Empty states are implemented.
- [x] Progressive disclosure is implemented.

## Help
- [x] In-app help/tooltips are implemented.
- [x] Minimal docs/help page is implemented.

## Quality Gates
- [x] Tests exist for critical logic.
- [x] Tests exist for key UI flows.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Build passes.
- [ ] CI is green.

## Accessibility Basics
- [x] Keyboard navigation works for primary flows.
- [x] Focus states are sensible.
- [x] Labels/aria attributes exist where needed.

## Performance Basics
- [x] No obvious slow pages.
- [x] Unnecessary re-renders are avoided on critical flows.
- [ ] Bundle size is reasonable for stack.

## Security Hygiene
- [x] No secrets in repo.
- [x] Inputs are validated.
- [x] Error handling is safe.
- [x] Auth boundaries are respected (if applicable).

## Docs
- [x] `README.md` includes local setup notes.
- [x] `README.md` includes run notes.
- [x] `README.md` includes test notes.
- [x] `README.md` includes deploy notes.
- [x] `README.md` includes env vars.
