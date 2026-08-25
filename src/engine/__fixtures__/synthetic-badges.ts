/**
 * H3 synthetic fixtures. The SHIPPED dataset cannot exercise any of these
 * semantics — its only null is on Unpluckable, an `or` badge — so a wrong
 * implementation would pass 100% of dataset-driven tests and lie the day the
 * data changes. These fixtures pin the semantics the data cannot.
 *
 * SYNTHETIC DATA, NOT 2K27 DATA: every id is prefixed `synthetic-` and a
 * fixture-isolation test asserts these ids never appear in badges.json —
 * leaking one would be inventing 2K27 data through the back door.
 *
 * The mid-array-null fixture DELIBERATELY violates data-integrity assertion
 * 11 (suffix-only nulls). That is the point: assertions 11/12 are dataset
 * tests over badges.json only, the loader's guards are arity-only, and this
 * fixture MUST stay loadable — it is the only proof that levels are evaluated
 * independently rather than scanned to first failure.
 */

import type { RawBadge } from "../types";

/** A `[60,70,80,90]` AND B `[60,70,80,null]` → attrs 99 give max GOLD, not
 * HOF: one null on any `and` line makes the level unreachable, full stop. */
export const syntheticAndTrailingNull: RawBadge = {
  id: "synthetic-and-trailing-null",
  name: "Synthetic And Trailing Null",
  tier: "A",
  category: "Finishing",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "and",
    attrs: [
      { attr: "close", perLevel: [60, 70, 80, 90] },
      { attr: "layup", perLevel: [60, 70, 80, null] },
    ],
  },
};

/** A `[60,70,80,90]` AND B `[60,null,80,90]` → attrs 99 give max HOF, with a
 * GAP at Silver. Pins independent-per-level evaluation: a first-failure scan
 * would return Bronze and silently under-report. */
export const syntheticAndMidNullGap: RawBadge = {
  id: "synthetic-and-mid-null-gap",
  name: "Synthetic And Mid Null Gap",
  tier: "B",
  category: "Shooting",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "and",
    attrs: [
      { attr: "mid", perLevel: [60, 70, 80, 90] },
      { attr: "threePt", perLevel: [60, null, 80, 90] },
    ],
  },
};

/** A `[60,70,null,null]` OR B `[60,70,null,null]` → attrs 99 give max SILVER:
 * an `or` level with every line null is unreachable. */
export const syntheticOrBothNull: RawBadge = {
  id: "synthetic-or-both-null",
  name: "Synthetic Or Both Null",
  tier: "C",
  category: "Playmaking",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "or",
    attrs: [
      { attr: "passAcc", perLevel: [60, 70, null, null] },
      { attr: "ballHandle", perLevel: [60, 70, null, null] },
    ],
  },
};

/** Height range exactly 78–78: 78 passes; 77 and 79 are fully blocked. */
export const syntheticHeightBoundary: RawBadge = {
  id: "synthetic-height-boundary",
  name: "Synthetic Height Boundary",
  tier: "A",
  category: "Defense",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 78,
    heightMaxInches: 78,
    logic: "single",
    attrs: [{ attr: "steal", perLevel: [60, 70, 80, 90] }],
  },
};

/** Threshold 83 at Bronze: attribute exactly 83 passes (>=, not >). */
export const syntheticThresholdBoundary: RawBadge = {
  id: "synthetic-threshold-boundary",
  name: "Synthetic Threshold Boundary",
  tier: "C",
  category: "Physicals",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "single",
    attrs: [{ attr: "speed", perLevel: [83, 85, 90, 95] }],
  },
};

/* -------------------------------------------------------------- F8-E2 -- */

/**
 * THE EQUIVARIANCE PAIR (INV-8). Two badges IDENTICAL in tier and in every
 * requirement, differing only in id and name, adjacent in dataset order.
 *
 * This pair is the real quality-blindness argument. A statistic can only say
 * "we did not observe a preference"; swapping two indistinguishable badges and
 * getting the mirror-image result for the same seed says the roller CANNOT
 * express one, because nothing it reads distinguishes them. `badge.name` is
 * never read and `badge.id` is used only as a map key.
 */
export const syntheticTwinA: RawBadge = {
  id: "synthetic-twin-a",
  name: "Synthetic Twin A",
  tier: "B",
  category: "Rebounding",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "single",
    attrs: [{ attr: "offReb", perLevel: [60, 70, 80, 90] }],
  },
};

export const syntheticTwinB: RawBadge = {
  ...syntheticTwinA,
  id: "synthetic-twin-b",
  name: "Synthetic Twin B",
};

/**
 * THE COST-INDIFFERENCE PAIR (INV-9). One A-tier badge and one C-tier badge,
 * each legal at BRONZE ONLY, so the only thing that can distinguish them is
 * price: 3 points against 1. With a pool of 3 and capacity 2 both fit, and a
 * cost preference OF EITHER SIGN — cheap-first to fit more, or dear-first to
 * "spend well" — shows up as a skewed first pick.
 */
export const syntheticDearBronzeOnly: RawBadge = {
  id: "synthetic-dear-bronze-only",
  name: "Synthetic Dear Bronze Only",
  tier: "A",
  category: "Physicals",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "single",
    attrs: [{ attr: "strength", perLevel: [60, null, null, null] }],
  },
};

export const syntheticCheapBronzeOnly: RawBadge = {
  id: "synthetic-cheap-bronze-only",
  name: "Synthetic Cheap Bronze Only",
  tier: "C",
  category: "Physicals",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "single",
    attrs: [{ attr: "strength", perLevel: [60, null, null, null] }],
  },
};

/**
 * THE ZERO-NET-COST FIXTURE (INV-17). Legal at every level, so under the
 * selectable `hofOrAbove` refund trigger a purchase straight to HOF is
 * NET-FREE — gross cost paid, full amount refunded — and an upgrade from
 * Bronze to HOF is net-NEGATIVE.
 *
 * This is why termination is bounded by the LATTICE and not by the budget: a
 * budget-based bound assumes every step consumes points, and this one does not.
 * The case is reachable TODAY on a shipped config value, not hypothetically.
 */
export const syntheticFreeAtHof: RawBadge = {
  id: "synthetic-free-at-hof",
  name: "Synthetic Free At HOF",
  tier: "C",
  category: "Defense",
  description: "Synthetic fixture — not 2K27 data.",
  isNew: false,
  requirements: {
    heightMinInches: 69,
    heightMaxInches: 88,
    logic: "single",
    attrs: [{ attr: "block", perLevel: [10, 20, 30, 40] }],
  },
};

export const syntheticBadges: readonly RawBadge[] = [
  syntheticAndTrailingNull,
  syntheticAndMidNullGap,
  syntheticOrBothNull,
  syntheticHeightBoundary,
  syntheticThresholdBoundary,
  syntheticTwinA,
  syntheticTwinB,
  syntheticDearBronzeOnly,
  syntheticCheapBronzeOnly,
  syntheticFreeAtHof,
];
