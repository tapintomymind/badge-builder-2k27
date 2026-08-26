/**
 * validateBuild + positionHeightRange (F3, scope.md §0.1 A2).
 *
 * Enforcement class pins: HARD-DISCLOSED, never HARD-BLOCKING — the
 * validator reports, never mutates, and position-unset is ALWAYS silent
 * (the zero state and every pre-F3 build behave exactly as before).
 */

import { describe, expect, it } from "vitest";
import { POSITION_HEIGHT_RANGES } from "../src/data/position-heights";
import { shippedDataset } from "../src/engine/dataset";
import { positionHeightRange, validateBuild } from "../src/engine/validate-build";
import type { Build } from "../src/engine/types";
import { POSITIONS } from "../src/engine/vocabulary";
import type { Position } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

const datasetMin = Math.min(
  ...shippedDataset.badges.map((badge) => badge.requirements.heightMinInches),
);
const datasetMax = Math.max(
  ...shippedDataset.badges.map((badge) => badge.requirements.heightMaxInches),
);

function buildAt(heightInches: number, position?: Position): Build {
  const build = makeBuild(heightInches, 50);
  return position === undefined ? build : { ...build, position };
}

describe("positionHeightRange", () => {
  it("position UNSET ⇒ the dataset's own derived range (pre-F3 behavior)", () => {
    expect(positionHeightRange()).toEqual({ minInches: datasetMin, maxInches: datasetMax });
    expect(positionHeightRange(undefined)).toEqual({
      minInches: 69,
      maxInches: 88,
    });
  });

  it("each position returns exactly its user-supplied bounds", () => {
    for (const position of POSITIONS) {
      expect(positionHeightRange(position)).toEqual({
        minInches: POSITION_HEIGHT_RANGES[position].minInches,
        maxInches: POSITION_HEIGHT_RANGES[position].maxInches,
      });
    }
  });
});

describe("validateBuild — heightOutsidePositionRange, bounds ±1 for all five", () => {
  for (const position of POSITIONS) {
    const range = POSITION_HEIGHT_RANGES[position];

    it(`${position}: below min and above max each emit the violation`, () => {
      for (const heightInches of [range.minInches - 1, range.maxInches + 1]) {
        const result = validateBuild(buildAt(heightInches, position));
        expect(result.violations).toHaveLength(1);
        const violation = result.violations[0];
        expect(violation?.kind).toBe("heightOutsidePositionRange");
        expect(violation?.position).toBe(position);
        expect(violation?.heightInches).toBe(heightInches);
        expect(violation?.range).toEqual(range);
      }
    });

    it(`${position}: the exact bounds are INCLUSIVE — no violation at min or max`, () => {
      for (const heightInches of [range.minInches, range.maxInches]) {
        expect(validateBuild(buildAt(heightInches, position)).violations).toEqual([]);
      }
    });
  }

  it("emits NOTHING when position is unset, at any height", () => {
    for (const heightInches of [60, datasetMin, datasetMax, 100]) {
      expect(validateBuild(buildAt(heightInches)).violations).toEqual([]);
    }
  });

  it("carries the reasons[]-idiom human-readable string", () => {
    const result = validateBuild(buildAt(82, "PG"));
    expect(result.violations[0]?.reason).toBe(
      `6'10" is outside the PG range 5'9"–6'7"`,
    );
    const centerResult = validateBuild(buildAt(69, "C"));
    expect(centerResult.violations[0]?.reason).toBe(
      `5'9" is outside the C range 6'7"–7'4"`,
    );
  });

  it("NEVER mutates the input build (HARD-DISCLOSED, not HARD-BLOCKING)", () => {
    const build = buildAt(84, "PG");
    const snapshot = structuredClone(build);
    validateBuild(build);
    expect(build).toEqual(snapshot);
  });
});
