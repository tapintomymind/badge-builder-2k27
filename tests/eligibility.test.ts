/**
 * Eligibility tests (H3) — the semantics no shipped badge can exercise, pinned
 * by the synthetic fixtures, plus real-dataset checks.
 */

import { describe, expect, it } from "vitest";
import { badgeById, loadBadge, shippedDataset } from "../src/engine/dataset";
import { maxPurchasableLevel, validateBadge } from "../src/engine/eligibility";
import {
  syntheticAndMidNullGap,
  syntheticAndTrailingNull,
  syntheticBadges,
  syntheticHeightBoundary,
  syntheticOrBothNull,
  syntheticThresholdBoundary,
} from "../src/engine/__fixtures__/synthetic-badges";
import { makeBuild } from "./helpers/test-utils";

describe("H3 synthetic fixtures (the shipped dataset cannot exercise these)", () => {
  it("fixture isolation: synthetic ids ∩ badges.json ids = ∅ — synthetic data can NEVER leak into the shipped dataset", () => {
    const shippedIds = new Set(shippedDataset.badges.map((badge) => badge.id));
    for (const fixture of syntheticBadges) {
      expect(shippedIds.has(fixture.id), `fixture id "${fixture.id}" leaked into badges.json`).toBe(
        false,
      );
    }
  });

  it("and + trailing null: attrs 99 give max GOLD, not HOF — null on any `and` line makes the level unreachable", () => {
    const badge = loadBadge(syntheticAndTrailingNull);
    expect(maxPurchasableLevel(badge, makeBuild(78, 99))).toBe("gold");
  });

  it("and + MID null (gap): attrs 99 give max HOF — levels are evaluated INDEPENDENTLY; a first-failure scan would return Bronze", () => {
    const badge = loadBadge(syntheticAndMidNullGap);
    const build = makeBuild(78, 99);
    expect(maxPurchasableLevel(badge, build)).toBe("hof");
    // The gap itself: Silver fails while Bronze, Gold, HOF pass.
    const eligibility = validateBadge(badge, build);
    expect(eligibility.maxPurchasableLevel).toBe("hof");
    expect(eligibility.reasons.some((reason) => reason.includes("Silver"))).toBe(true);
  });

  it("or + both null at a level: attrs 99 give max SILVER — an `or` level with every line null is unreachable", () => {
    const badge = loadBadge(syntheticOrBothNull);
    expect(maxPurchasableLevel(badge, makeBuild(78, 99))).toBe("silver");
  });

  it("height boundary (range exactly 78–78): 78 passes; 77 and 79 are FULLY blocked", () => {
    const badge = loadBadge(syntheticHeightBoundary);
    expect(validateBadge(badge, makeBuild(78, 99)).allowed).toBe(true);
    for (const heightInches of [77, 79]) {
      const eligibility = validateBadge(badge, makeBuild(heightInches, 99));
      expect(eligibility.allowed).toBe(false);
      expect(eligibility.maxPurchasableLevel).toBeNull();
      expect(eligibility.reasons.length).toBeGreaterThan(0);
    }
  });

  it("threshold boundary: threshold 83 with attribute exactly 83 PASSES (>=, not >); 82 fails", () => {
    const badge = loadBadge(syntheticThresholdBoundary);
    expect(maxPurchasableLevel(badge, makeBuild(78, 83))).toBe("bronze");
    expect(maxPurchasableLevel(badge, makeBuild(78, 82))).toBeNull();
  });
});

describe("eligibility against the real dataset", () => {
  it("Unpluckable (the shipped null): Post Ctrl 99 alone gives max GOLD — HOF is null on that line and the Ball Hdl line is unmet", () => {
    const unpluckable = badgeById(shippedDataset, "unpluckable");
    expect(unpluckable).toBeDefined();
    const build = makeBuild(78, 0, { postControl: 99 });
    expect(maxPurchasableLevel(unpluckable!, build)).toBe("gold");
  });

  it("Unpluckable: Ball Hdl 97 reaches HOF via the or-line that is non-null there", () => {
    const unpluckable = badgeById(shippedDataset, "unpluckable");
    const build = makeBuild(78, 0, { ballHandle: 97 });
    expect(maxPurchasableLevel(unpluckable!, build)).toBe("hof");
  });

  it("height gates use the badge's own range: Paint Patroller (6'5–7'4) blocks a 6'4 build entirely", () => {
    const paintPatroller = badgeById(shippedDataset, "paint-patroller");
    const eligibility = validateBadge(paintPatroller!, makeBuild(76, 99));
    expect(eligibility.allowed).toBe(false);
    expect(eligibility.maxPurchasableLevel).toBeNull();
    expect(eligibility.reasons[0]).toContain("height");
  });

  it("and-logic on real data: Flash needs BOTH Spd and Aglty at each level", () => {
    const flash = badgeById(shippedDataset, "flash");
    // Spd 70/82/87/95 AND Aglty 60/78/81/91: spd 99 alone gives nothing…
    expect(maxPurchasableLevel(flash!, makeBuild(78, 0, { speed: 99 }))).toBeNull();
    // …spd 99 + aglty 81 gives gold (81 >= 81, hof needs 91).
    expect(maxPurchasableLevel(flash!, makeBuild(78, 0, { speed: 99, agility: 81 }))).toBe("gold");
  });

  it("reasons name the failing requirement with the level, e.g. `needs N <Attr> for <Level>`", () => {
    const flash = badgeById(shippedDataset, "flash");
    const eligibility = validateBadge(flash!, makeBuild(78, 0, { speed: 99, agility: 81 }));
    expect(eligibility.allowed).toBe(true);
    expect(eligibility.maxPurchasableLevel).toBe("gold");
    expect(eligibility.reasons.some((reason) => /needs 91 Aglty for HOF/.test(reason))).toBe(true);
  });

  it("a build meeting every threshold has no reasons and max HOF (Glove, Steal 99 at 6'6)", () => {
    const glove = badgeById(shippedDataset, "glove");
    const eligibility = validateBadge(glove!, makeBuild(78, 0, { steal: 99 }));
    expect(eligibility).toEqual({ allowed: true, maxPurchasableLevel: "hof", reasons: [] });
  });
});
