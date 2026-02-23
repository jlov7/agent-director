# Agent Director Release Proof (Showboat)

*2026-02-23T15:26:41Z by Showboat dev*
<!-- showboat-id: 1fe4c4ba-d06b-42e0-bfcc-7df5db6c6854 -->

This executable document captures reproducible release-proof checks for Agent Director. Use it as human-readable evidence that verification entry points and core documentation contracts exist and stay stable.

All commands below are deterministic, local, and CI-friendly.

```bash
test -x scripts/verify-frontend.sh && echo verify_frontend_gate_ready
```

```output
verify_frontend_gate_ready
```

```bash
test -x scripts/verify-visual.sh && echo verify_visual_gate_ready
```

```output
verify_visual_gate_ready
```

```bash
test -f docs/visual-verification-protocol.md && echo visual_verification_protocol_present
```

```output
visual_verification_protocol_present
```

```bash
jq -r '.scripts["verify:frontend"], .scripts["verify:visual"]' package.json
```

```output
./scripts/verify-frontend.sh
./scripts/verify-visual.sh
```

```bash
grep -q '^## Quickstart (5 Minutes)$' README.md && grep -q '^## Testing$' README.md && grep -q '^## Deployment notes$' README.md && grep -q '^## Executable Demo Docs (Showboat)$' README.md && echo readme_sections_present
```

```output
readme_sections_present
```
