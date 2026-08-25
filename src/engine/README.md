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

## F8-E2 additions — the roll engine

- `random.ts` — **the only randomness in the app, and it is deterministic.**
  xmur3 to mulberry32, hand-rolled as the canonical published algorithms with a
  checked-in golden vector, because a dependency here is a tripwire and a
  hidden input makes every determinism test flaky-green. `pickUniform` is
  **rejection-sampled, never `% n`** — modulo is biased for any arity that does
  not divide 2^32, and a candidate set of 7 or 11 is completely ordinary.
- `randomize.ts` — `rollCategory` / `rollBuild` return a **pure value**: a
  proposed complete loadout plus a per-category report, applied by the UI as
  **one atomic state write**. The walk is randomized greedy over the legal-step
  set from `steps.ts`, and it stops only when that set is empty, so the result
  is **maximal by construction**. *Maximal is not maximum* — the gap to the
  achievable optimum is measured against a test-only exact-DP oracle, and
  closing it would require a preference, which is the one thing the carve-out
  forbids.
- **ONE SELECTION PRIMITIVE, ONE CALL SITE.** `pickUniform` is the only
  selection anywhere in the roll: no sort, no comparator, no reduce to an
  extremum, no weights, no probability parameter. The enumeration order is
  fixed by the dataset and is an *input to a uniform index*, not a preference.
  `tests/vocabulary.test.ts` class 2 and `tests/architecture.test.ts` group (f)
  keep it that way mechanically rather than culturally.
- **Termination is bounded by the LATTICE, not the budget** —
  `4 x max(entries, capacity)`, because a zero-net-cost step is reachable today
  under the selectable `hofOrAbove` trigger. Exhausting the bound throws
  `RollDidNotTerminateError` rather than breaking quietly (H6).
- **Synergy is out of v1 structurally:** `RollResult` has no field able to
  carry a `SynergySlot`. Assigning a fuse frees that badge's spend back to its
  pool, which funds another purchase, which is itself a fuse candidate — so
  purchases and assignments become mutually determining and "maximal" stops
  being well-defined. The roller reads `remainingPoints` as it finds it, so
  existing refunds already count and it composes correctly regardless.
