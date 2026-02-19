# UX Typography and Spacing Scale

Last updated: 2026-02-19

## Typography Tiers
Defined in `/ui/src/styles/main.css` under `:root` tokens:
- `--type-display-lg`: Hero/display titles.
- `--type-title-lg`: Section titles.
- `--type-title-md`: Subsection titles and card headings.
- `--type-body-md`: Standard body copy.
- `--type-body-sm`: Secondary/help/caption copy.
- `--type-label-xs`: Eyebrow labels and compact metadata.

## Spacing Scale
Defined in `/ui/src/styles/main.css` under `:root` tokens:
- `--space-2xs` = 4px
- `--space-xs` = 8px
- `--space-sm` = 12px
- `--space-md` = 16px
- `--space-lg` = 24px
- `--space-xl` = 32px

## Application Rules
- Use spacing tokens (not ad-hoc pixel values) for app shell gap/padding, workspace chrome, and toolbar spacing.
- Use typography tokens for section headers and supporting copy.
- Reserve display scale for major entry surfaces only; avoid display sizes in dense control clusters.

## Current Adoption Coverage
- App shell spacing now tokenized.
- Toolbar spacing/padding now tokenized.
- Workspace nav/header/panel spacing now tokenized.
- Workspace title/description/eyebrow typography now tokenized.
