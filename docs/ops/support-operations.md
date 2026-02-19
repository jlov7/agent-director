# Support Operations Runbook

Last updated: 2026-02-17

## Objective

Provide a consistent path for user support, incident communication, and issue triage.

## User Intake Channels

- Product issue reports (bugs, data problems, replay mismatches)
- Safety reports (abusive behavior, misuse)
- Account/data requests (privacy, deletion, correction)
- In-app support diagnostics payload (Operations -> Support panel / Header -> Support)

## Severity Levels

- Sev1: complete outage or integrity risk
- Sev2: major feature unavailable with workaround missing
- Sev3: degraded quality or isolated defect
- Sev4: minor UX/docs issue

## Triage SLA Targets

- Sev1: acknowledge within 15 minutes
- Sev2: acknowledge within 1 hour
- Sev3: acknowledge within 1 business day
- Sev4: acknowledge within 2 business days

## Standard Response Flow

1. Acknowledge report and assign severity.
2. Reproduce and capture evidence.
3. Route to code fix or policy action.
4. Close with user-facing summary and mitigation.

## In-App Support Payload Contract

When available, request the in-app support payload copy from the user. It includes:
- trace id/status, selected mode/step, safe export state
- workspace id/role
- browser environment (`userAgent`, online status)
- recent notifications and async action outcomes
- optional operator support note + ownership metadata

Required triage behavior:
1. Validate whether safe export is enabled before requesting any additional payload screenshots.
2. Link ticket owner to `run owner` / `handoff owner` metadata when present.
3. Attach payload JSON directly to incident timeline for reproducibility.

## Known Issues Process

Maintain a live known-issues list in release comms with:
- issue summary
- impact scope
- workaround (if any)
- expected fix window

## Data Requests

For deletion/export/correction requests:
- verify requester identity,
- capture scope and timeline,
- execute per privacy policy and log completion.
