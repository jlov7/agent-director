# Visual QA Checklist

## Pass Criteria

1. Route-shell pages expose one clear intent and one dominant CTA path.
2. Typography on route-shell surfaces uses only `--ux-tier-1..4`.
3. Card spacing follows the defined rhythm scale with no off-scale values.
4. No section mixes multiple heavy visual treatments.
5. Status chips are consistent and readable across async/export/timeline states.
6. Quick actions are contextual, capped to four visible actions.
7. Duplicate Guide/Command/Explain controls are removed from overlapping surfaces.
8. Desktop and tablet route snapshots pass for all five routes.
9. 3-second scan proxy passes for all routes.

## Failure Criteria

1. More than one competing primary action in the same route section.
2. Any route-shell font-size outside the four-tier scale.
3. Off-rhythm spacing values in route layout/components styles.
4. Route cards using more than one heavy treatment property.
5. Route snapshots missing for any required breakpoint/route combination.
6. Scan proxy route exceeds 3 seconds to show intent + key action.
