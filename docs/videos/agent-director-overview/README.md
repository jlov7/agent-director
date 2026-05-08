# Agent Director Overview Film

Repo-native HyperFrames source for the Agent Director proof film.

## Story

The film explains Agent Director in one viewing:

1. Agent runs fail with too much ambiguous telemetry.
2. Agent Director imports real traces and normalizes provenance.
3. The Diagnose route turns spans into evidence-backed findings.
4. Failed traces become deterministic eval cases.
5. Replay labels distinguish recorded evidence from counterfactual simulation.
6. Release gates turn the loop into ship-ready proof.

## Commands

```bash
npm run check
npm run render:draft
npm run render
```

Preview in the HyperFrames studio:

```bash
npm run dev
```

Then open:

```text
http://localhost:3002/#project/agent-director-overview
```

## Source Assets

The composition intentionally uses current app screenshots copied into `assets/` rather than mocked product art. Refresh the source screenshots from `../../screenshots/` when the app UI materially changes.

## Composition Structure

- `index.html` is the root timeline and mounts five segment compositions.
- `compositions/segment-problem-questions.html` covers the opening problem.
- `compositions/segment-reveal-workflow.html` covers product reveal and workflow.
- `compositions/segment-import-diagnose.html` covers ingestion and diagnosis.
- `compositions/segment-eval-replay.html` covers eval creation and replay truth.
- `compositions/segment-proof-close.html` covers release gates and close.

## Render Output

The canonical final render path is:

```text
docs/videos/agent-director-overview/renders/agent-director-overview.mp4
```
