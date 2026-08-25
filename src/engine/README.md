# `src/engine/` — the rules

Pure TypeScript. **No DOM, no React, no I/O.** Nothing here imports from `src/ui/`
or from `react`.

Every rule in this project lives here: costs, eligibility, the points ledger,
synergy resolution, effective level. If a number appears on screen, it was
computed in this directory.

Fully unit-testable in isolation — that is the point. The entire correctness
surface of the tool sits behind a DOM-free boundary so it can be covered by fast
unit tests rather than browser assertions.

## Module map (M1)

- `vocabulary.ts` — the canonical unions: levels, tiers, categories vs attr
  groups (separate, never derived), the 20 attrs, display labels.
- `types.ts` — Raw (positional, as in badges.json) vs Loaded (keyed) shapes,
  Build, eligibility, loadout, budget, synergy TYPES (behavior is M2),
  SavedBuild envelope.
- `errors.ts` — typed loud failures; nothing here fails silently.
- `dataset.ts` — the loader. Positional 4-arrays → keyed records; guards are
  ARITY ONLY (suffix-null / monotonicity are dataset tests, not loader guards).
  After the loader, no positional indexing exists anywhere.
- `cost.ts` — `costForLevel` (throws on Legend), `costForLevelOrNull` (the one
  named nullable variant), `whatIf` deltas.
- `ledger.ts` — spent / refunded / remainingPoints / totalCost / equipSlotsUsed,
  all pure functions of current state. No accumulators.
- `eligibility.ts` — `validateBadge` with independent per-level evaluation
  (gaps are legal), plus `recheckEligibility` for dataset-drift reporting.
- `serialization.ts` — pure string ↔ SavedBuild with the schemaVersion
  migration seam. The localStorage adapter is `src/persist/` (M3), not here.
- `__fixtures__/` — synthetic badges pinning the semantics the shipped
  dataset cannot exercise. Ids are isolation-tested against badges.json.

## F8-E1 additions — the ONE enumerator, and the summary selectors

- `steps.ts` — **`legalSteps` is the single enumerator of "what moves exist
  from here."** `src/ui/grid/feasibility.ts` already WAS this function; it is
  now expressed as counts over it, with a golden table
  (`tests/feasibility-golden.test.ts`) proving the re-expression moved zero
  numbers. **Anything that needs to know what a build could buy next calls
  `legalSteps`. A second enumerator anywhere is drift, and the drift is
  user-visible**: the grid saying "3 upgrades still affordable" immediately
  before a roll says "nothing fits". Legality is evaluated PER LEVEL (H3) —
  a range is never derived from `maxPurchasableLevel`, because gaps are legal.
- `summary.ts` — `buildSummary` / `synergyProjections` /
  `badgeSlotsBaselineText`. Pure projections over committed state. **The
  signature takes no `OverlayState` and never will** (H2), the same structural
  control as `categoryLedgerAt`'s `LedgerBasis`. Overlay-dependent values live
  only in `synergyProjections`, whose field is named `activatesTo`.
- `summary-text.ts` — `formatSummaryText`, design-spec §14.5's copy-as-text
  block. Prose lives in the engine here because a string encoding tier costs,
  effective levels, refund consequences and unset-capacity semantics IS a rule;
  the builder consumes an already-computed `BuildSummary` and re-derives
  nothing. The payoff is that panel↔text equality is asserted, not hoped.
- `ledger.ts` gained `badgeSlotsCapacityUnset` and `eligibility.ts` gained
  `entryIsStale` — both hoisted out of components, both now with exactly one
  definition. No re-export shim was left behind in either UI module.
