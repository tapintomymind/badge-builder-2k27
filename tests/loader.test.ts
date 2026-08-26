/**
 * Loader tests (H6 + the NB-5 ruling). The loader's guards are ARITY ONLY:
 * it converts positional 4-arrays to keyed records and asserts length === 4
 * on the way in — and it must NOT enforce suffix-only nulls or monotonicity,
 * because the H3 fixtures deliberately violate those and must stay loadable.
 */

import { describe, expect, it } from "vitest";
import { keyPerLevel, loadBadge, loadDataset, shippedRawDataset, shippedDataset } from "../src/engine/dataset";
import { DatasetArityError } from "../src/engine/errors";
import { syntheticAndMidNullGap } from "../src/engine/__fixtures__/synthetic-badges";
import type { RawBadgeDataset } from "../src/engine/types";

describe("loader: positional → keyed conversion (H6)", () => {
  it("keys [BRZ, SLV, GLD, HOF] by purchasable level", () => {
    expect(keyPerLevel([65, 86, 96, null], "test")).toEqual({
      bronze: 65,
      silver: 86,
      gold: 96,
      hof: null,
    });
  });

  it("keys tierCosts so Legend indexing is a compile error, not a runtime undefined", () => {
    expect(shippedDataset.tierCosts.A).toEqual({ bronze: 3, silver: 5, gold: 6, hof: 7 });
    expect(shippedDataset.tierCosts.B).toEqual({ bronze: 2, silver: 4, gold: 5, hof: 6 });
    expect(shippedDataset.tierCosts.C).toEqual({ bronze: 1, silver: 3, gold: 4, hof: 5 });
  });

  it("loads all 53 shipped badges with keyed attr lines", () => {
    expect(shippedDataset.badges.length).toBe(53);
    const unpluckable = shippedDataset.badges.find((badge) => badge.id === "unpluckable");
    expect(unpluckable?.requirements.attrs[0]?.perLevel).toEqual({
      bronze: 65,
      silver: 86,
      gold: 96,
      hof: null,
    });
  });
});

describe("loader: ARITY guards only", () => {
  it("throws DatasetArityError on a perLevel array of length 3", () => {
    expect(() => keyPerLevel([60, 70, 80], "test")).toThrowError(DatasetArityError);
  });

  it("throws DatasetArityError on a perLevel array of length 5", () => {
    expect(() => keyPerLevel([60, 70, 80, 90, 99], "test")).toThrowError(DatasetArityError);
  });

  it("throws DatasetArityError on a tierCosts array of length != 4", () => {
    const raw = structuredClone(shippedRawDataset) as RawBadgeDataset;
    const broken: RawBadgeDataset = {
      ...raw,
      tierCosts: { ...raw.tierCosts, B: [2, 4, 5] },
    };
    expect(() => loadDataset(broken)).toThrowError(DatasetArityError);
  });

  it("POSITIVE PAIRED TEST (NB-5): the loader ACCEPTS the mid-array-null fixture — suffix-only nulls is a DATASET test, never a loader guard", () => {
    const loaded = loadBadge(syntheticAndMidNullGap);
    expect(loaded.requirements.attrs[1]?.perLevel).toEqual({
      bronze: 60,
      silver: null,
      gold: 80,
      hof: 90,
    });
  });

  it("the loader also accepts non-monotonic thresholds (assertion 12 is a dataset test too)", () => {
    const loaded = loadBadge({
      ...syntheticAndMidNullGap,
      requirements: {
        ...syntheticAndMidNullGap.requirements,
        attrs: [{ attr: "mid", perLevel: [90, 80, 70, 60] }],
      },
    });
    expect(loaded.requirements.attrs[0]?.perLevel).toEqual({
      bronze: 90,
      silver: 80,
      gold: 70,
      hof: 60,
    });
  });
});
