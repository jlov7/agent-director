# Novice Usability Protocol (No-Guesswork Gate)

This protocol validates that first-time users can succeed without coaching.

## Goal

Prove that onboarding, guidance, help, and troubleshooting remove guesswork for new users.

## Test Cohort

- Minimum 5 first-time users.
- Include at least:
  - 2 non-technical participants
  - 2 technical participants unfamiliar with Agent Director
  - 1 mixed-role operator/support participant

## Test Setup

- Fresh browser profile (no prior local storage state).
- Start from app home with no verbal assistance.
- Record screen + timestamps.
- Facilitator can answer only: "Use in-product guidance and help."

## Mandatory Tasks

1. Understand first-run value proposition from intro and enter the product.
2. Complete guided tour (or Story mode) and identify where to inspect a failing step.
3. Open Help and locate recovery guidance.
4. Trigger a replay/compare workflow.
5. Use "Need help now" and copy diagnostics payload.

## Pass/Fail Rubric (100 Points)

- Onboarding clarity (20): user can explain Observe -> Inspect -> Direct in their own words.
- Navigation confidence (20): user reaches each primary mode without facilitator hints.
- Troubleshooting discoverability (20): user finds Help and support diagnostics in < 20 seconds.
- Recovery confidence (20): user can escalate via "Need help now" with prefilled context.
- Completion speed (20): all mandatory tasks completed in <= 8 minutes.

### Required Threshold

- Release pass: >= 85/100 average and no participant below 70/100.
- Block release if any user cannot find help/escalation path.

## Stuck-Signal Review

Capture and review these per session:

- Rage-click events (rapid repeated clicks on the same control).
- Repeated dead-end actions (multiple error outcomes in a short period).
- Time-to-first-success (ms from session start to first successful action).

If stuck signals trigger, verify:

1. User saw "Need help now".
2. Support panel opened with contextual prefilled note.
3. Diagnostics payload contained enough context for handoff.

## Evidence to Archive

- Test recording links
- Session notes per participant
- Rubric scores
- Stuck-signal counts and time-to-first-success
- Improvement actions and owner

## Exit Criteria

- All blocker findings closed.
- No unresolved onboarding/help dead-ends.
- Protocol rerun with passing score after fixes.
