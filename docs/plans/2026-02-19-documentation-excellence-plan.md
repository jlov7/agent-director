# Documentation Excellence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a world-class documentation system that lets technical and non-technical audiences understand, evaluate, run, and demo Agent Director from repository docs alone.

**Architecture:** Keep README as the canonical front door, then route users into focused role-based guides and deeper system docs through a curated docs hub. Reuse existing screenshots, GIFs, and concept illustrations while adding clearer structure and navigation.

**Tech Stack:** Markdown, Mermaid, existing repository media assets.

---

### Task 1: Baseline and Tracking

**Files:**
- Modify: `.codex/PLANS.md`
- Modify: `.codex/SCRATCHPAD.md`
- Modify: `TASKS.md`

**Steps:**
1. Register documentation excellence as active tracked work.
2. Define completion checklist with explicit docs deliverables.
3. Keep tracker statuses synced as tasks close.

### Task 2: README Front-Door Rewrite

**Files:**
- Modify: `README.md`

**Steps:**
1. Preserve ASCII logo and legal disclaimer at footer.
2. Add role-based quick paths (non-technical, technical, demo host, contributor).
3. Add visual-first sections (screenshots, GIF, architecture quick diagram, user journey diagram).
4. Improve onboarding section from 0 to first demo in under 5 minutes.
5. Add explicit links to detailed docs and operations runbooks.

### Task 3: Audience-Specific Guides

**Files:**
- Create: `docs/non-technical-guide.md`
- Create: `docs/technical-guide.md`

**Steps:**
1. Write non-technical guide focused on value, outcomes, personas, and demo script.
2. Write technical guide focused on architecture, API contracts, data model, and extension points.
3. Ensure both guides share the same vocabulary and journey language.

### Task 4: User Journey Mapping

**Files:**
- Create: `docs/user-journeys.md`

**Steps:**
1. Document core journeys (first-time evaluator, daily operator, team collaborator, release owner).
2. Add Mermaid journey/state diagrams for each lifecycle phase.
3. Define success checkpoints and common failure/recovery paths.

### Task 5: Documentation Hub Overhaul

**Files:**
- Modify: `docs/index.md`

**Steps:**
1. Convert into a role-based + lifecycle navigation hub.
2. Group links into Start/Understand/Operate/Launch references.
3. Add explicit "where to go next" routing from each section.

### Task 6: Validation and Closure

**Files:**
- Modify: `TASKS.md`
- Modify: `.codex/SCRATCHPAD.md`

**Steps:**
1. Verify docs consistency and link targets manually.
2. Run `make verify`, `make doctor`, and `make scorecard`.
3. Mark DOCX tasks complete and summarize outcomes.
