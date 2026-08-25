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

export const syntheticBadges: readonly RawBadge[] = [
  syntheticAndTrailingNull,
  syntheticAndMidNullGap,
  syntheticOrBothNull,
  syntheticHeightBoundary,
  syntheticThresholdBoundary,
];
