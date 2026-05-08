# Design System: Agent Director Frontier UI

## Visual Theme & Atmosphere

Agent Director should read as a command-grade observability cockpit: near-black surfaces, warm technical borders, precise typography, and selective signal color. The mood is not generic dark SaaS. It should feel like a focused incident room where the interface quietly turns trace evidence into decisions.

This direction combines:

- Taste Skill discipline: strong hierarchy, high variance without chaos, no default AI-dashboard patterns.
- Awesome DESIGN.md reference: VoltAgent-inspired terminal confidence, emerald signal energy, warm carbon surfaces, and code-native credibility.
- Impeccable product rules: design serves the workflow, cards are used sparingly, no thick side-stripe accents, no gradient text, no decorative glass by default.

## Color Palette & Roles

- Canvas Carbon: `#05070b`, the deepest app background.
- Panel Carbon: `#0a111c`, primary contained surface.
- Warm Border: `rgba(126, 118, 105, 0.28)`, structural lines with slight warmth.
- Snow Text: `#f2f6f4`, high-emphasis text.
- Steel Text: `#a9b6c9`, body and explanation text.
- Muted Telemetry: `#748399`, tertiary labels and timestamps.
- Signal Emerald: `#2fd6a1`, high-signal success, readiness, and eval proof.
- Signal Blue: `#6fb7ff`, selected trace and route focus.
- Warning Amber: `#f0c86d`, caution and running states.
- Danger Coral: `#f07c82`, failure and destructive states.

Use one active accent per component. Do not flood large panels with accent fills.

## Typography

- Display and UI headings use the existing Space Grotesk stack.
- Numbers, trace IDs, provider IDs, and compact evidence labels use IBM Plex Mono.
- Headings should be compressed but readable. Body copy stays at 65 to 75 characters where possible.
- Do not introduce serif fonts, gradient text, emoji, or decorative label noise.

## Layout

- Route screens use asymmetric evidence zones instead of equal repeated card grids.
- Dense evidence blocks may use bordered cells, rails, and compact lists.
- Avoid nested cards. If a component already sits inside a card, inner structure should be a rail, grid, list, or diagram.
- Do not use thick one-sided accent borders. Use full-border color shifts, inset rings, or signal dots.
- Mobile collapses to a single column with no horizontal overflow.

## Motion

- Motion should communicate state changes: readiness, progression, signal flow, and completion.
- Animate `transform` and `opacity` only.
- Respect reduced motion. Ambient motion must be subtle and non-blocking.
- Prefer CSS micro-motion already present in the app over adding new dependencies.

## Component Rules

- Primary buttons must stay visually legible on dark surfaces.
- Evidence metrics should include provenance, cost, token, latency, and eval state where relevant.
- Eval and replay controls should always preserve truth labels and current status.
- Empty states should say what to do next, not just that data is absent.
- Status indicators need text plus visual treatment, never color alone.

## Banned Patterns

- AI-purple/blue gradient text.
- Thick side-tab borders on cards, rows, callouts, or alerts.
- Glassmorphism as decoration.
- Generic three-card feature rows.
- Fake hero metrics.
- Emoji and casual mascot language.
- Copy that claims live execution when the product is showing recorded or simulated replay.
