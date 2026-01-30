# Visual System

Agent Director’s visuals map directly to the agent’s behavior.

## Shape language
- **Bars** = time on the Cinema timeline
- **Nodes** = steps in Flow mode
- **Edges** = semantic dependencies

## Color mapping (step types)
- `llm_call` → teal
- `tool_call` → green
- `decision` → gold
- `handoff` → orange
- `guardrail` → rose

## Motion rules
- Cinematic playback always honors wall-clock time.
- Morphs use FLIP to avoid flicker or visual jumps.
- Reduced motion disables morphs and pulses.

## Composition
- Heavy contrast for legibility in dense traces.
- Use focus glows to guide attention (never rely on color alone).
- Keep the Insight Strip at the top to provide instant narrative context.
- A floating Quick Actions dock keeps demo-critical controls within reach.
- Explain overlays use a consistent glow + arrowed callout to teach without clutter.
- The Director briefing ribbon uses a subtle sweep to draw attention once, then gets out of the way.
