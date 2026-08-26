/**
 * A6 — Cap Breakers, engine half [scope.md §0.1 A6 · A6-R9 tests 1.1-1.5,
 * 3.1-3.3 · features/cap-breakers/engine-data-design.md §2, §4].
 *
 * The containment lint (2.1-2.3) and the never-invent-2K-data ship gate (1.6)
 * live in tests/architecture.test.ts, where the other source lints are. The
 * persistence rows (5.1-5.4) live in tests/serialization.test.ts, and the
 * data-destruction ship gate (4.2) in tests/ui/f2-builds-persistence.test.tsx.
 */

import { describe, expect, it } from "vitest";
import { effectiveAttribute, hasCapBreakers } from "../src/engine/attributes";
import { costForLevel, whatIf } from "../src/engine/cost";
import { shippedDataset } from "../src/engine/dataset";
import {
  entryIsStale,
  maxPurchasableLevel,
  recheckEligibility,
  validateBadge,
} from "../src/engine/eligibility";
import { categoryLedger, totalCost } from "../src/engine/ledger";
import type { LedgerState } from "../src/engine/ledger";
import type { Badge, Build, Budget, LoadoutEntry, SavedBuild } from "../src/engine/types";
import type { Attr, Category, PurchasableLevel } from "../src/engine/vocabulary";
import { CATEGORIES, PURCHASABLE_LEVELS, levelIndex } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

const HEIGHT = 78;

function zeroBudgets(): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 4, points: 200 }]),
  ) as Record<Category, Budget>;
}

function ledgerState(loadout: readonly LoadoutEntry[]): LedgerState {
  return { loadout, budgets: zeroBudgets(), refundTrigger: "legendByAnyMeans" };
}

/* ------------------------------------------------------ 1.1-1.3: the model -- */

describe("A6 1.1-1.3 — effectiveAttribute is max(entered, declared)", () => {
  it("1.1a returns the entered value when the FIELD is absent", () => {
    const build = makeBuild(HEIGHT, 60);
    expect(build.capBrokenAttributes).toBeUndefined();
    expect(effectiveAttribute(build, "threePt")).toBe(60);
  });

  it("1.1b returns the entered value when the KEY is absent from a present record", () => {
    const build = makeBuild(HEIGHT, 60, {}, { close: 90 });
    expect(effectiveAttribute(build, "threePt")).toBe(60);
    expect(effectiveAttribute(build, "close")).toBe(90);
  });

  it("1.1c returns the entered value when the wire carried NULL", () => {
    // `null` is a legal wire value meaning "absent" (A6-R5's table), and
    // `build` reaches the typed world through a blind cast — so this is a
    // REAL runtime shape, not a type-level impossibility. A truthiness test
    // here would be indistinguishable; a `=== undefined`-only test would
    // return null and poison every comparison downstream with NaN semantics.
    const build = {
      ...makeBuild(HEIGHT, 60),
      capBrokenAttributes: { threePt: null },
    } as unknown as Build;
    expect(effectiveAttribute(build, "threePt")).toBe(60);
  });

  it("1.1d treats a whole-field null as absent", () => {
    const build = {
      ...makeBuild(HEIGHT, 60),
      capBrokenAttributes: null,
    } as unknown as Build;
    expect(effectiveAttribute(build, "threePt")).toBe(60);
    expect(hasCapBreakers(build)).toBe(false);
  });

  it("1.2 returns the DECLARED value when it exceeds the entered one", () => {
    // The user's own example: 5 cap breakers took Three-Point 60 → 83. The
    // app stores 83, never 5 and never +23.
    const build = makeBuild(HEIGHT, 60, {}, { threePt: 83 });
    expect(effectiveAttribute(build, "threePt")).toBe(83);
  });

  it("1.3 returns the ENTERED value when the declared one is BELOW it", () => {
    // Math.max is a ruling, not defensive noise: the app's own UI produces
    // this state (declare 83, then drag the slider to 90). The declaration
    // goes inert; the engine does NOT rewrite the user's stored 83 (H8).
    const build = makeBuild(HEIGHT, 90, {}, { threePt: 83 });
    expect(effectiveAttribute(build, "threePt")).toBe(90);
    expect(build.capBrokenAttributes?.threePt).toBe(83);
  });

  it("hasCapBreakers ignores a declared 0 — 0 means 'not entered' app-wide", () => {
    expect(hasCapBreakers(makeBuild(HEIGHT, 60, {}, { threePt: 0 }))).toBe(false);
    expect(hasCapBreakers(makeBuild(HEIGHT, 60, {}, { threePt: 1 }))).toBe(true);
    expect(hasCapBreakers(makeBuild(HEIGHT, 60))).toBe(false);
  });
});

/* ------------------------------------------------- 1.4: end to end, real data -- */

/** A shipped badge + attr + level where the threshold sits strictly between
 * two values — found in the dataset, never invented. */
function findGatedBadge(low: number, high: number) {
  for (const badge of shippedDataset.badges) {
    if (badge.requirements.logic !== "single") continue;
    if (badge.requirements.heightMinInches > HEIGHT) continue;
    if (badge.requirements.heightMaxInches < HEIGHT) continue;
    for (const line of badge.requirements.attrs) {
      const threshold = line.perLevel.gold;
      if (threshold !== null && threshold > low && threshold <= high) {
        return { badge, attr: line.attr, threshold };
      }
    }
  }
  throw new Error(`no shipped single-logic badge gates Gold between ${low} and ${high}`);
}

describe("A6 1.4 — the feature, end to end on shipped data", () => {
  it("a badge failing Gold at the entered value PASSES Gold cap-broken, thresholds unchanged", () => {
    const { badge, attr, threshold } = findGatedBadge(60, 83);
    const entered = makeBuild(HEIGHT, 60);
    const capBroken = makeBuild(HEIGHT, 60, {}, { [attr]: 83 } as Partial<Record<Attr, number>>);

    expect(validateBadge(badge, entered).maxPurchasableLevel).not.toBe("gold");
    const after = validateBadge(badge, capBroken);
    expect(after.allowed).toBe(true);
    expect(
      after.maxPurchasableLevel !== null && levelIndex(after.maxPurchasableLevel) >= levelIndex("gold"),
      `${badge.id} should reach at least Gold at ${attr}=83 (threshold ${threshold})`,
    ).toBe(true);

    // The DATASET did not move — only the value the gate reads.
    expect(badge.requirements.attrs.find((line) => line.attr === attr)?.perLevel.gold).toBe(
      threshold,
    );
    expect(entered.attributes[attr]).toBe(60);
    expect(capBroken.attributes[attr]).toBe(60);
  });
});

/* --------------------------------- 1.5: the economy cannot see a cap breaker -- */

describe("A6 1.5 — cap breakers move NO ledger number", () => {
  it("spent / refunded / remainingPoints / equipSlotsUsed / totalCost / whatIf / costForLevel are byte-identical", () => {
    const { badge, attr } = findGatedBadge(60, 83);
    const loadout: LoadoutEntry[] = [{ badgeId: badge.id, purchasedLevel: "gold" }];
    const state = ledgerState(loadout);

    const before = {
      ledger: Object.fromEntries(
        CATEGORIES.map((category) => [category, categoryLedger(state, category)]),
      ),
      total: totalCost(state),
      whatIfGold: whatIf(loadout, badge.id, "gold"),
      whatIfHof: whatIf(loadout, badge.id, "hof"),
      cost: costForLevel(badge.tier, "gold"),
    };

    // Declaring a cap breaker changes ELIGIBILITY…
    const entered = makeBuild(HEIGHT, 60);
    const capBroken = makeBuild(HEIGHT, 60, {}, { [attr]: 83 } as Partial<Record<Attr, number>>);
    expect(maxPurchasableLevel(badge, capBroken)).not.toBe(maxPurchasableLevel(badge, entered));

    // …and NOTHING in the economy. This is structural, not policed: the
    // fourteen economy modules read no attribute at all, and `LedgerState`
    // does not carry a `Build` — so there is no channel through which a cap
    // breaker could reach a cost. The assertion pins the property; the
    // architecture lint pins the reason.
    const after = {
      ledger: Object.fromEntries(
        CATEGORIES.map((category) => [category, categoryLedger(state, category)]),
      ),
      total: totalCost(state),
      whatIfGold: whatIf(loadout, badge.id, "gold"),
      whatIfHof: whatIf(loadout, badge.id, "hof"),
      cost: costForLevel(badge.tier, "gold"),
    };
    expect(after).toEqual(before);
  });

  it("LedgerState carries no Build — the economy has no channel to a cap breaker", () => {
    const state = ledgerState([]);
    expect(Object.keys(state).sort()).toEqual(["budgets", "loadout", "refundTrigger"]);
  });
});

/* ------------------------------------------- 3.1: INV-A6-1, exhaustively pinned -- */

describe("A6 3.1 — INV-A6-1: raising a cap breaker can never create a stale purchase", () => {
  const badges: Badge[] = shippedDataset.badges;

  it("scans the whole shipped dataset", () => {
    expect(badges.length).toBeGreaterThan(50);
  });

  it("over every shipped badge × every purchasable level, non-stale stays non-stale", () => {
    // The proof (engine-data-design §4): effectiveAttribute is non-decreasing
    // in the declared value; linePassesAt is monotone in the effective value;
    // every/some are monotone; the fold can only move UP; and `allowed` is a
    // HEIGHT test, invariant under any cap breaker. So entryIsStale can only
    // go true→false. Asserted here rather than trusted.
    const low = makeBuild(HEIGHT, 60);
    const raised = makeBuild(
      HEIGHT,
      60,
      {},
      Object.fromEntries(
        shippedDataset.badges.flatMap((badge) =>
          badge.requirements.attrs.map((line) => [line.attr, 99]),
        ),
      ) as Partial<Record<Attr, number>>,
    );

    let everLoosened = 0;
    for (const badge of badges) {
      for (const level of PURCHASABLE_LEVELS) {
        const staleBefore = entryIsStale(badge, low, level);
        const staleAfter = entryIsStale(badge, raised, level);
        if (!staleBefore) {
          expect(
            staleAfter,
            `${badge.id} @ ${level}: raising a cap breaker turned a NON-STALE entry stale`,
          ).toBe(false);
        }
        if (staleBefore && !staleAfter) everLoosened += 1;

        // maxPurchasableLevel is monotone non-decreasing too.
        const maxBefore = maxPurchasableLevel(badge, low);
        const maxAfter = maxPurchasableLevel(badge, raised);
        const indexOf = (value: PurchasableLevel | null) =>
          value === null ? -1 : levelIndex(value);
        expect(
          indexOf(maxAfter) >= indexOf(maxBefore),
          `${badge.id}: maxPurchasableLevel went DOWN when a cap breaker went up`,
        ).toBe(true);
      }
    }
    // A vacuous pass would be worthless: prove the sweep actually moved some
    // entries, so "never turned stale" is a real result and not "nothing
    // changed anywhere".
    expect(everLoosened).toBeGreaterThan(0);
  });

  it("`allowed` is a HEIGHT test and is invariant under any cap breaker", () => {
    const tooShort = 69;
    for (const badge of badges) {
      const bare = makeBuild(tooShort, 0);
      const maxed = makeBuild(
        tooShort,
        0,
        {},
        Object.fromEntries(
          badge.requirements.attrs.map((line) => [line.attr, 99]),
        ) as Partial<Record<Attr, number>>,
      );
      expect(validateBadge(badge, maxed).allowed).toBe(validateBadge(badge, bare).allowed);
    }
  });
});

/* ------------------- 3.2 / 3.3: lowering runs the SHIPPED stale path, unchanged -- */

describe("A6 3.2-3.3 — removing a cap breaker flows through the EXISTING disclosure", () => {
  it("3.2 produces exactly the shipped stale shape — no new mechanism", () => {
    const { badge, attr } = findGatedBadge(60, 83);
    const withBreaker = makeBuild(HEIGHT, 60, {}, { [attr]: 83 } as Partial<Record<Attr, number>>);
    const withoutBreaker = makeBuild(HEIGHT, 60);
    const loadout: LoadoutEntry[] = [{ badgeId: badge.id, purchasedLevel: "gold" }];

    expect(entryIsStale(badge, withBreaker, "gold")).toBe(false);
    expect(entryIsStale(badge, withoutBreaker, "gold")).toBe(true);

    // The SAME reporter F2 has used since M3 — no A6 field, no A6 branch,
    // and the drift payload's shape is unchanged.
    const saved = { loadout, build: withoutBreaker } as unknown as SavedBuild;
    const drifted = recheckEligibility(saved, shippedDataset);
    expect(drifted.map((row) => row.badgeId)).toContain(badge.id);
    const row = drifted.find((candidate) => candidate.badgeId === badge.id);
    expect(Object.keys(row ?? {}).sort()).toEqual(
      [
        "badgeId",
        "droppedFromDataset",
        "heightBlocked",
        "maxPurchasableLevel",
        "purchasedLevel",
      ].sort(),
    );

    // And the SAME reporter finds nothing while the cap breaker is present.
    const withSaved = { loadout, build: withBreaker } as unknown as SavedBuild;
    expect(recheckEligibility(withSaved, shippedDataset)).toEqual([]);
  });

  it("3.3 the ledger keeps CHARGING a purchase gone stale — disclose, never repair", () => {
    const { badge } = findGatedBadge(60, 83);
    const loadout: LoadoutEntry[] = [{ badgeId: badge.id, purchasedLevel: "gold" }];
    const state = ledgerState(loadout);
    expect(totalCost(state)).toBe(costForLevel(badge.tier, "gold"));
    // …and it is the same number whether or not the build still qualifies:
    // staleness is an eligibility fact, and the ledger charges what is owned.
    expect(entryIsStale(badge, makeBuild(HEIGHT, 60), "gold")).toBe(true);
    expect(totalCost(state)).toBe(costForLevel(badge.tier, "gold"));
  });
});
