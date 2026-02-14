# Gap Backlog (Release v1)

Status legend: `Open` | `In Progress` | `Blocked` | `Closed`

## P0

### GAP-P0-001: Missing strict, repeatable doctor command with machine-readable evidence
- Evidence: No `scripts/doctor.*` command or `artifacts/doctor.json` release evidence artifact existed.
- Impacted journey: Engineering release sign-off and CI parity validation.
- Fix strategy: Add `scripts/doctor.py` + `make doctor` to run full checks and emit gate evidence JSON.
- Status: `Closed` (2026-02-14, `make doctor` now emits passing `artifacts/doctor.json`)

### GAP-P0-002: Release gates not codified with explicit evidence requirements
- Evidence: No `RELEASE_GATES.md`; release criteria were checklist-style only.
- Impacted journey: Final go/no-go release decision.
- Fix strategy: Add `RELEASE_GATES.md` with gate IDs, pass criteria, and evidence mapping to `artifacts/doctor.json`.
- Status: `Closed` (2026-02-14, `RELEASE_GATES.md` added and wired to doctor output)

## P1

### GAP-P1-001: AGENTS workflow did not enforce a non-terminating gap loop
- Evidence: Existing `AGENTS.md` had milestone guidance but no strict algorithm or stop conditions.
- Impacted journey: Autonomous release execution cadence.
- Fix strategy: Add strict Gap Loop algorithm, rules, stop conditions, and non-stop conditions in `AGENTS.md`.
- Status: `Closed` (2026-02-14, strict loop + stop conditions added)

### GAP-P1-002: Doctor secret scan produced false positives
- Evidence: Initial `make doctor` failed security gate by matching `scripts/doctor.py` and `.pyc` cache artifacts.
- Impacted journey: Security gate reliability in automated release verification.
- Fix strategy: Exclude known-safe test fixture, scanner implementation file, and compiled cache artifacts from static secret scan.
- Status: `Closed` (2026-02-14, `make doctor` passes after scanner exclusions)

## P2

### GAP-P2-001: Gap backlog artifact was missing
- Evidence: No `GAPS.md` existed, so open/closed release gaps were not tracked in one place.
- Impacted journey: Transparent prioritization and reviewability.
- Fix strategy: Create `GAPS.md` and keep it current each loop cycle.
- Status: `Closed` (2026-02-14, backlog created and actively maintained)
