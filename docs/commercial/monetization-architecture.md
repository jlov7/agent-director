# Monetization Architecture (Cosmetic-First)

Last updated: 2026-02-17

Private experimental note: gameplay monetization concepts are not part of the public Agent Director v1 product surface. Gameplay APIs require `AGENT_DIRECTOR_ENABLE_GAMEPLAY=1` and need separate approval before any commercial rollout.

## Product Principle

Agent Director monetization must never provide gameplay power advantages. Paid items are cosmetic, vanity, or convenience-only.

## Non-Negotiables

- No pay-to-win progression multipliers.
- No paid modifiers that alter raid/boss/PvP outcome probabilities.
- No paid unlock bypass for competitive capability.

## v1 Commercial Model

- Cosmetic profile themes and visual packs.
- Optional creator support bundles (badge-only recognition).
- Seasonal cosmetic reward track aligned with engagement goals.

## Technical Architecture

- Commerce layer is isolated from gameplay simulation state.
- Entitlements are read by UI presentation surfaces only.
- Gameplay action evaluators ignore monetization state by design.
- Audit logs capture purchase and entitlement grant/revoke events.

## Compliance + Trust Requirements

- Clear storefront labeling for cosmetic-only items.
- Refund and support pathways documented in support ops.
- Terms/privacy references include commercial processing disclosures as applicable.

## Release Gate for Commercial Rollout

- Security review complete for payment provider integration.
- Anti-fraud checks in place for entitlement abuse.
- Regression tests confirm gameplay outcomes unchanged with/without cosmetics.
