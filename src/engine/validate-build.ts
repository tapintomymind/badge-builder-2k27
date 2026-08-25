/**
 * validateBuild (F3, scope.md §0.1 A2) — the engine owns the position→height
 * rule; the UI clamps at the point of change and DISCLOSES, and this
 * validator covers every state the clamp never sees (imported JSON, builds
 * saved before the amendment existed).
 *
 * Enforcement class: HARD-DISCLOSED, never HARD-BLOCKING. This module never
 * mutates a build and never un-buys a badge — H8 forbids silently
 * re-validating a user's plan away. The F1 deserializer must NOT reject an
 * out-of-range height either: MalformedSavedBuildError stays for SHAPE
 * violations only (pinned in tests/serialization.test.ts).
 *
 * Mirrors validate-loadout.ts's idiom: violation types are declared locally
 * in this module, not hoisted into types.ts.
 */

import { POSITION_HEIGHT_RANGES } from "../data/position-heights";
import { shippedDataset } from "./dataset";
import type { Build } from "./types";
import type { Position } from "./vocabulary";
import { formatHeightInches } from "./vocabulary";

export interface PositionHeightRange {
  minInches: number;
  maxInches: number;
}

/** The dataset's own height coverage — DERIVED from shippedDataset, never
 * authored here (the same computation App.tsx carried pre-F3). */
const datasetHeightRange: PositionHeightRange = {
  minInches: Math.min(
    ...shippedDataset.badges.map((badge) => badge.requirements.heightMinInches),
  ),
  maxInches: Math.max(
    ...shippedDataset.badges.map((badge) => badge.requirements.heightMaxInches),
  ),
};

/**
 * The ONLY route by which src/ui/** may learn a height range — a lint in
 * tests/architecture.test.ts asserts no UI file imports the data module.
 * Position unset ("Any") ⇒ the dataset's own range, so the zero state and
 * every pre-F3 build behave exactly as they did before this amendment.
 */
export function positionHeightRange(position?: Position): PositionHeightRange {
  if (position === undefined) return { ...datasetHeightRange };
  const bounds = POSITION_HEIGHT_RANGES[position];
  return { minInches: bounds.minInches, maxInches: bounds.maxInches };
}

/** HARD-DISCLOSED — reported, never blocked, never auto-corrected. */
export type BuildViolation = {
  kind: "heightOutsidePositionRange";
  position: Position;
  heightInches: number;
  range: PositionHeightRange;
  /** Human-readable, in validateBadge's reasons[] idiom:
   * `6'10" is outside the PG range 5'9"–6'7"`. */
  reason: string;
};

export interface BuildValidation {
  violations: BuildViolation[];
}

/**
 * Emits heightOutsidePositionRange when the build has a position and its
 * height falls outside that position's (inclusive) range. Emits nothing when
 * position is unset. Pure — NEVER mutates the input build.
 */
export function validateBuild(build: Build): BuildValidation {
  const violations: BuildViolation[] = [];
  if (build.position !== undefined) {
    const range = positionHeightRange(build.position);
    if (build.heightInches < range.minInches || build.heightInches > range.maxInches) {
      violations.push({
        kind: "heightOutsidePositionRange",
        position: build.position,
        heightInches: build.heightInches,
        range,
        reason:
          `${formatHeightInches(build.heightInches)} is outside the ` +
          `${build.position} range ` +
          `${formatHeightInches(range.minInches)}–${formatHeightInches(range.maxInches)}`,
      });
    }
  }
  return { violations };
}
