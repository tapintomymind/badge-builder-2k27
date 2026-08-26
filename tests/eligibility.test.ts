/**
 * Eligibility tests (H3) — the semantics no shipped badge can exercise, pinned
 * by the synthetic fixtures, plus real-dataset checks.
 */

import { describe, expect, it } from "vitest";
import { zeroBonus } from "../src/engine/budget";
import { badgeById, loadBadge, shippedDataset } from "../src/engine/dataset";
import {
  entryIsStale,
  maxPurchasableLevel,
  reasonsForLevel,
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
import { makeBuild, srcSources, stripComments } from "./helpers/test-utils";

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
    // [A6 rider ②] The reason now carries the near-miss value. Agility is 81
    // against HOF's 91 — the point of the annotation is that the disclosure
    // says how far away the build is, not only what the badge wants.
    expect(
      eligibility.reasons.some((reason) => /needs 91 Agility \(now 81\) for HOF/.test(reason)),
    ).toBe(true);
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
      bonus: zeroBonus(),
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

/* ------------------------------ A6 rider ②: near-miss reasons, all three arms -- */

/**
 * Every locked pip becomes a near-miss meter: the reason says HOW FAR AWAY
 * the build is, not only what the badge wants
 * [features/visible-feedback-loop/design.md §3 · engine-data-design §5A].
 *
 * Landed as A6-E's SECOND commit, never folded into the first — ② changes a
 * rendered string on all 53 cards, and merging it would have destroyed the
 * inert-by-construction proof that is the whole point of commit 1.
 */
describe("A6 ② — the near-miss parenthetical", () => {
  // The SHIPPED badge, read from the dataset — its thresholds are never
  // re-typed here (never invent 2K27 data, and never transcribe it either).
  const floatGame = badgeById(shippedDataset, "float-game") as Badge;

  it("② `or` — EVERY term carries its own value, which is why one trailing note cannot work", () => {
    const build = makeBuild(78, 0, { close: 90, layup: 70 });
    expect(reasonsForLevel(floatGame.requirements, build, "hof")).toEqual([
      "needs 96 Close (now 90) or 95 Layup (now 70) for HOF",
    ]);
  });

  it("② `and` — FAILING terms only, each annotated; a met term contributes nothing", () => {
    const posterizer = badgeById(shippedDataset, "posterizer") as Badge;
    // Vertical clears Gold (80); Driving Dunk (93) does not.
    const build = makeBuild(78, 0, { drivingDunk: 70, vertical: 85 });
    const reasons = reasonsForLevel(posterizer.requirements, build, "gold");
    expect(reasons).toEqual(["needs 93 Driving Dunk (now 70) for Gold"]);
    expect(reasons.some((reason) => reason.includes("Vertical"))).toBe(false);
  });

  it("② `null` threshold — NO parenthetical: there is no distance to be near", () => {
    const trailingNull = loadBadge(syntheticAndTrailingNull);
    const reasons = reasonsForLevel(trailingNull.requirements, makeBuild(78, 0), "hof");
    expect(reasons).toContain("HOF is unreachable via Layup");
    for (const reason of reasons) {
      if (reason.includes("unreachable")) expect(reason).not.toMatch(/\(now /);
    }

    const bothNull = loadBadge(syntheticOrBothNull);
    expect(reasonsForLevel(bothNull.requirements, makeBuild(78, 0), "gold")).toEqual([
      "Gold is unreachable via this badge's attributes",
    ]);
  });

  it("② reads effectiveAttribute — a cap-broken value says so, beside a slider that does not", () => {
    // The whole reason the marker is mandatory: without it the user reads
    // "(now 83)", looks at the slider showing 60, and concludes the app is
    // wrong about the one thing it exists to be right about.
    const build = makeBuild(78, 0, { close: 60, layup: 70 }, { close: 83 });
    expect(reasonsForLevel(floatGame.requirements, build, "hof")).toEqual([
      "needs 96 Close (now 83 cap-broken) or 95 Layup (now 70) for HOF",
    ]);
  });

  it("② a STALE declaration is not announced as cap-broken — it is inert, not active", () => {
    // Declared 83, slider since dragged to 90. Math.max makes the declaration
    // inert, and the disclosure must not credit a cap breaker that is doing
    // nothing. Derived by COMPARING the values, never by testing presence.
    const build = makeBuild(78, 0, { close: 90, layup: 70 }, { close: 83 });
    expect(reasonsForLevel(floatGame.requirements, build, "hof")).toEqual([
      "needs 96 Close (now 90) or 95 Layup (now 70) for HOF",
    ]);
  });

  /* ------------------------------------------------- THE MANDATORY CANARY -- */

  /**
   * `BadgeCard.tsx`'s `reasonsFor` (:80-86) selects which reason belongs to
   * which pip by string-matching the TRAILING `for Gold` / `for HOF`. A
   * parenthetical appended AFTER that suffix silently empties both
   * `nextLockedReasons` and `staleReasons` — and the card renders its
   * eligibility line only when that array is non-empty, so the load-bearing
   * H8 disclosure would vanish from all 53 cards with no error and no
   * exception. WITHOUT THIS CANARY THAT REGRESSION SHIPS GREEN [§5A.3].
   *
   * Transcribed from the component rather than imported, because the function
   * is private — so the transcription's premise is pinned too, immediately
   * below. A canary that has silently drifted from the thing it watches is
   * worse than no canary.
   */
  function reasonsForPip(levelLabel: string, reasons: string[]): string[] {
    return reasons.filter(
      (reason) =>
        reason.endsWith(`for ${levelLabel}`) || reason.startsWith(`${levelLabel} is unreachable`),
    );
  }

  it("② POSITIVE CANARY — the pip selector still finds a two-term `or` reason", () => {
    const build = makeBuild(78, 0, { close: 90, layup: 70 });
    const reasons = validateBadge(floatGame, build).reasons;
    expect(reasons.length).toBeGreaterThan(0);

    const selected = reasonsForPip("HOF", reasons);
    expect(selected.length, "the §5A.3 trap fired — the card's eligibility line is EMPTY").toBe(1);
    expect(selected[0]).toContain("(now 90)");
    expect(selected[0]).toContain("(now 70)");
    expect(selected[0]?.endsWith("for HOF")).toBe(true);

    // The negative half: this is precisely what the rejected form would do.
    const trailingForm = ["needs 96 Close or 95 Layup for HOF (now 90)"];
    expect(reasonsForPip("HOF", trailingForm)).toEqual([]);
  });

  it("② CANARY PREMISE — BadgeCard still selects by the trailing `for {label}` suffix", () => {
    // If this reddens, the canary above is watching a function that no longer
    // exists in that shape: re-derive it before trusting either.
    const source = stripComments(srcSources["/src/ui/grid/BadgeCard.tsx"] as string);
    expect(source).toContain("reason.endsWith(`for ${label}`)");
    expect(source).toContain("reason.startsWith(`${label} is unreachable`)");
  });

  it("② every purchasable level's reason still ends in its own level suffix", () => {
    // The trap, swept across the whole shipped dataset rather than one badge.
    const build = makeBuild(78, 0, { close: 60, layup: 40 }, { close: 83 });
    for (const badge of shippedDataset.badges) {
      const eligibility = validateBadge(badge, build);
      if (!eligibility.allowed) continue;
      for (const reason of eligibility.reasons) {
        expect(
          /(?: for (?:Bronze|Silver|Gold|HOF))$|is unreachable/.test(reason),
          `${badge.id}: "${reason}" would be invisible on the card`,
        ).toBe(true);
        expect(reason).not.toMatch(/for (?:Bronze|Silver|Gold|HOF)\s*\(/);
      }
    }
  });
});
