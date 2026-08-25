/**
 * Position-height table integrity — TRIPWIRE class (scope.md §2.1 idiom,
 * ruled in scope.md §0.1 A2 / impl-brief F3 §4.6).
 *
 * These pins protect USER-SUPPLIED data. A failure here does NOT mean the
 * code is wrong — it means the table no longer matches what the user
 * supplied and confirmed on 2026-08-26. The response is ASK THE USER,
 * never "fix" the numbers.
 */

import { describe, expect, it } from "vitest";
import {
  POSITION_HEIGHT_RANGES,
  positionHeightsProvenance,
} from "../src/data/position-heights";
import { shippedDataset } from "../src/engine/dataset";
import { POSITIONS } from "../src/engine/vocabulary";

const TRIPWIRE =
  "TRIPWIRE: the user gave us different numbers — ask the user, never 'fix' the data.";

const datasetMin = Math.min(
  ...shippedDataset.badges.map((badge) => badge.requirements.heightMinInches),
);
const datasetMax = Math.max(
  ...shippedDataset.badges.map((badge) => badge.requirements.heightMaxInches),
);

describe("position-height table — the ten user-supplied bounds, verbatim", () => {
  it(`carries exactly the user-confirmed table (2026-08-26). ${TRIPWIRE}`, () => {
    expect(POSITION_HEIGHT_RANGES, TRIPWIRE).toEqual({
      PG: { minInches: 69, maxInches: 79 },
      SG: { minInches: 72, maxInches: 80 },
      SF: { minInches: 76, maxInches: 82 },
      PF: { minInches: 77, maxInches: 84 },
      C: { minInches: 79, maxInches: 88 },
    });
  });

  it(`covers all five positions with min ≤ max. ${TRIPWIRE}`, () => {
    expect(Object.keys(POSITION_HEIGHT_RANGES).sort(), TRIPWIRE).toEqual(
      [...POSITIONS].sort(),
    );
    for (const position of POSITIONS) {
      const range = POSITION_HEIGHT_RANGES[position];
      expect(
        range.minInches <= range.maxInches,
        `${position} has min > max. ${TRIPWIRE}`,
      ).toBe(true);
    }
  });

  it(`every range is a subset of the dataset's own height coverage. ${TRIPWIRE}`, () => {
    for (const position of POSITIONS) {
      const range = POSITION_HEIGHT_RANGES[position];
      expect(
        range.minInches >= datasetMin && range.maxInches <= datasetMax,
        `${position} (${range.minInches}–${range.maxInches}) escapes the dataset's ` +
          `${datasetMin}–${datasetMax} coverage. ${TRIPWIRE}`,
      ).toBe(true);
    }
  });

  it(`the union of the five ranges is EXACTLY the dataset range, contiguous. ${TRIPWIRE}`, () => {
    // Exact union: no height in the dataset is unreachable by every
    // position, and no gap strands a user mid-clamp.
    for (let inches = datasetMin; inches <= datasetMax; inches += 1) {
      const covered = POSITIONS.some((position) => {
        const range = POSITION_HEIGHT_RANGES[position];
        return inches >= range.minInches && inches <= range.maxInches;
      });
      expect(
        covered,
        `${inches}" is covered by NO position — a gap in the union. ${TRIPWIRE}`,
      ).toBe(true);
    }
    const unionMin = Math.min(
      ...POSITIONS.map((position) => POSITION_HEIGHT_RANGES[position].minInches),
    );
    const unionMax = Math.max(
      ...POSITIONS.map((position) => POSITION_HEIGHT_RANGES[position].maxInches),
    );
    expect(unionMin, TRIPWIRE).toBe(datasetMin);
    expect(unionMax, TRIPWIRE).toBe(datasetMax);
  });
});

describe("position-height provenance (H8-mirroring, own version line)", () => {
  it("carries the five provenance fields with gameVersion NEVER guessed", () => {
    expect(positionHeightsProvenance.positionDataVersion).toBe("2026-08-26.1");
    expect(positionHeightsProvenance.source).toBe(
      "User-supplied from the in-game 2K27 MyPlayer builder",
    );
    expect(positionHeightsProvenance.asOf).toBe("2026-08-26");
    expect(positionHeightsProvenance.gameVersion).toBeNull();
    expect(positionHeightsProvenance.confidence).toBe("user-supplied");
  });

  it("records the verbatim provenance string (impl-brief F3 §2)", () => {
    expect(positionHeightsProvenance.provenance).toBe(
      "user-supplied 2026-08-26, PG min confirmed same date",
    );
  });
});
