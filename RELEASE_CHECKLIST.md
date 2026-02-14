# Release Checklist (v1)

## Core User Journeys
- [ ] Happy path is coherent end-to-end.
- [ ] Key failure states are coherent end-to-end.
- [ ] UX and copy are clear in both success and failure states.

## Onboarding
- [x] First-run onboarding is implemented.
- [ ] Empty states are implemented.
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
- [ ] Keyboard navigation works for primary flows.
- [ ] Focus states are sensible.
- [ ] Labels/aria attributes exist where needed.

## Performance Basics
- [ ] No obvious slow pages.
- [ ] Unnecessary re-renders are avoided on critical flows.
- [ ] Bundle size is reasonable for stack.

## Security Hygiene
- [ ] No secrets in repo.
- [ ] Inputs are validated.
- [ ] Error handling is safe.
- [ ] Auth boundaries are respected (if applicable).

## Docs
- [ ] `README.md` includes local setup notes.
- [ ] `README.md` includes run notes.
- [ ] `README.md` includes test notes.
- [ ] `README.md` includes deploy notes.
- [ ] `README.md` includes env vars.
