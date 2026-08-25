/**
 * Eligibility tests (H3) — the semantics no shipped badge can exercise, pinned
 * by the synthetic fixtures, plus real-dataset checks.
 */

import { describe, expect, it } from "vitest";
import { badgeById, loadBadge, shippedDataset } from "../src/engine/dataset";
import {
  entryIsStale,
  maxPurchasableLevel,
  recheckEligibility,
  validateBadge,
} from "../src/engine/eligibility";
import type {
  Badge,
  BadgeDataset,
  Build,
  LoadoutEntry,
  SavedBuild,
} from "../src/engine/types";
import { CATEGORIES } from "../src/engine/vocabulary";
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
    expect(eligibility.reasons.some((reason) => /needs 91 Agility for HOF/.test(reason))).toBe(true);
  });

  it("a build meeting every threshold has no reasons and max HOF (Glove, Steal 99 at 6'6)", () => {
    const glove = badgeById(shippedDataset, "glove");
    const eligibility = validateBadge(glove!, makeBuild(78, 0, { steal: 99 }));
    expect(eligibility).toEqual({ allowed: true, maxPurchasableLevel: "hof", reasons: [] });
  });
});

/* ------------------------------------------------------- F8-E1: INV-20 -- */

describe("INV-20 — entryIsStale IS recheckEligibility's predicate, not a second copy", () => {
  /** Every purchased entry the drift report would flag, by badge id. */
  function driftIds(saved: SavedBuild, dataset: BadgeDataset): string[] {
    return recheckEligibility(saved, dataset)
      .filter((drift) => !drift.droppedFromDataset)
      .map((drift) => drift.badgeId)
      .sort();
  }

  /** The same set, computed independently through the extracted predicate. */
  function predicateIds(saved: SavedBuild, dataset: BadgeDataset): string[] {
    return saved.loadout
      .flatMap((entry) => {
        const badge = badgeById(dataset, entry.badgeId);
        if (badge === undefined) return []; // the droppedFromDataset branch is NOT this predicate's
        return entryIsStale(badge, saved.build, entry.purchasedLevel) ? [entry.badgeId] : [];
      })
      .sort();
  }

  function savedWith(build: Build, loadout: LoadoutEntry[]): SavedBuild {
    return {
      schemaVersion: 1,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2026-08-26T00:00:00.000Z",
      name: "inv-20",
      build,
      budgets: Object.fromEntries(
        CATEGORIES.map((category) => [category, { equipSlots: 3, points: 20 }]),
      ) as SavedBuild["budgets"],
      loadout,
      synergy: [],
      config: { refundTrigger: "legendByAnyMeans", plusTwoSlotIds: null, budgetStrategy: "manual" },
    };
  }

  const loadout: LoadoutEntry[] = [
    { badgeId: "limitless-range", purchasedLevel: "hof" }, // needs 99 3Pt — stale on a weak build
    { badgeId: "posterizer", purchasedLevel: "bronze" },
    { badgeId: "paint-prodigy", purchasedLevel: "gold" }, // 75–88 — height-blocked at 5'9"
    { badgeId: "dimer", purchasedLevel: "silver" },
  ];

  const scenarios: { name: string; build: Build }[] = [
    { name: "a maxed build (nothing drifts)", build: makeBuild(78, 99) },
    { name: "a weak build (attribute drift)", build: makeBuild(78, 55) },
    { name: "a short build (height drift)", build: makeBuild(69, 99) },
    { name: "short AND weak (both classes at once)", build: makeBuild(69, 40) },
  ];

  for (const scenario of scenarios) {
    it(`the two agree exactly for ${scenario.name}`, () => {
      const saved = savedWith(scenario.build, loadout);
      expect(driftIds(saved, shippedDataset)).toEqual(predicateIds(saved, shippedDataset));
    });
  }

  it("the fixtures are LIVE — some scenario actually drifts, so the equality is not vacuous", () => {
    const drifted = scenarios.flatMap((scenario) =>
      driftIds(savedWith(scenario.build, loadout), shippedDataset),
    );
    expect(drifted.length).toBeGreaterThan(0);
  });

  it("the droppedFromDataset branch is still recheckEligibility's own — the predicate never sees it", () => {
    const saved = savedWith(makeBuild(78, 99), [
      { badgeId: "no-such-badge", purchasedLevel: "gold" },
    ]);
    const drift = recheckEligibility(saved, shippedDataset);
    expect(drift.length).toBe(1);
    expect(drift[0]?.droppedFromDataset).toBe(true);
    expect(badgeById(shippedDataset, "no-such-badge")).toBeUndefined();
  });

  it("entryIsStale reads the two stale classes the way the drift report does", () => {
    const badge = badgeById(shippedDataset, "paint-prodigy") as Badge;
    // height-blocked (75–88) at 5'9", regardless of attributes
    expect(entryIsStale(badge, makeBuild(69, 99), "bronze")).toBe(true);
    // in range and qualified
    expect(entryIsStale(badge, makeBuild(78, 99), "hof")).toBe(false);
    // in range, but purchased above the level the build supports
    expect(entryIsStale(badge, makeBuild(78, 61), "gold")).toBe(true);
    expect(entryIsStale(badge, makeBuild(78, 61), "bronze")).toBe(false);
  });
});
