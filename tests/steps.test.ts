/**
 * F8-E1 group 2 — `src/engine/steps.ts`, THE single step enumerator.
 *
 * The cardinal test in this file is 2.1 (H3 / INV-4): a roll or a readout that
 * offers a GAP level is silently-wrong output that looks completely plausible,
 * which is this project's named cardinal failure shape. The shipped dataset
 * CANNOT express a gap — badges.json carries exactly one null threshold and
 * every line is monotone — so the synthetic fixture is the only proof there is.
 */

import { describe, expect, it } from "vitest";
import { whatIf } from "../src/engine/cost";
import { loadDataset, shippedRawDataset } from "../src/engine/dataset";
import { levelPasses, validateBadge } from "../src/engine/eligibility";
import { syntheticBadges } from "../src/engine/__fixtures__/synthetic-badges";
import {
  applyExchange,
  ceilingSpendFor,
  exchangeSteps,
  legalSteps,
  netCostOf,
} from "../src/engine/steps";
import type { ExchangeStep, LegalStep } from "../src/engine/steps";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import type { Badge, BadgeDataset, Budget, LoadoutEntry, RefundTrigger, SynergySlot } from "../src/engine/types";
import type { Category, PurchasableLevel } from "../src/engine/vocabulary";
import { CATEGORIES, PURCHASABLE_LEVELS } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

const dataset: BadgeDataset = loadDataset({
  ...shippedRawDataset,
  badges: [...shippedRawDataset.badges, ...syntheticBadges],
});

const GAP_ID = "synthetic-and-mid-null-gap"; // Shooting, tier B, legal BRZ/GLD/HOF — NOT SLV
const HEIGHT_ID = "synthetic-height-boundary"; // Defense, height 78–78 exactly

/**
 * Every member of the RefundTrigger union, with a compile-time exhaustiveness
 * guard. When F4 lands `onFuse`, THIS LINE STOPS COMPILING until the new arm
 * is added — which is the point: INV-11 must be re-proved for every trigger,
 * not silently skipped for the new one.
 *
 * (The brief says "all four refundTrigger values". Pre-F4 the union has
 * THREE; the guard below is what makes the fourth impossible to forget.)
 */
const REFUND_TRIGGERS = [
  "legendByAnyMeans",
  "legendByPermanentBoostOnly",
  "hofOrAbove",
  "onFuse",
] as const satisfies readonly RefundTrigger[];
type Unlisted = Exclude<RefundTrigger, (typeof REFUND_TRIGGERS)[number]>;
const _everyTriggerIsCovered: Unlisted extends never ? true : never = true;
void _everyTriggerIsCovered;

const NONE: ReadonlySet<string> = new Set<string>();

function budgets(points = 99, equipSlots = 6): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots, points }]),
  ) as Record<Category, Budget>;
}

function stateOf(
  loadout: readonly LoadoutEntry[],
  overrides: Partial<SynergyLedgerState> = {},
): SynergyLedgerState {
  return {
    loadout,
    budgets: budgets(),
    synergySlots: createDefaultSynergySlots(),
    refundTrigger: "legendByAnyMeans",
    ...overrides,
  };
}

function enumerate(
  loadout: readonly LoadoutEntry[],
  category: Category,
  options: {
    attrs?: number;
    height?: number;
    pinned?: ReadonlySet<string>;
    excluded?: ReadonlySet<string>;
    state?: Partial<SynergyLedgerState>;
  } = {},
): LegalStep[] {
  const build = makeBuild(options.height ?? 78, options.attrs ?? 99);
  return legalSteps(
    {
      state: stateOf(loadout, options.state ?? {}),
      build,
      pinnedBadgeIds: options.pinned ?? NONE,
      excludedBadgeIds: options.excluded ?? NONE,
    },
    category,
    dataset,
  );
}

const levelsFor = (steps: LegalStep[], badgeId: string): PurchasableLevel[] =>
  steps.filter((step) => step.badgeId === badgeId).map((step) => step.toLevel);

describe("2.1 — INV-4 / H3, THE CARDINAL TEST: gaps are legal and Silver is NEVER emitted", () => {
  it("from the unpurchased state, the gap badge emits Bronze, Gold and HOF — never Silver", () => {
    const levels = levelsFor(enumerate([], "Shooting"), GAP_ID);
    expect(levels).toEqual(["bronze", "gold", "hof"]);
    expect(levels).not.toContain("silver");
  });

  it("from purchased-at-Bronze, it emits Gold and HOF — never Silver", () => {
    const levels = levelsFor(
      enumerate([{ badgeId: GAP_ID, purchasedLevel: "bronze" }], "Shooting"),
      GAP_ID,
    );
    expect(levels).toEqual(["gold", "hof"]);
    expect(levels).not.toContain("silver");
  });

  it("a bronze..maxPurchasableLevel RANGE would have produced Silver — so the gap is a real distinction", () => {
    // maxPurchasableLevel here is "hof", so the naive range is BRZ..HOF, which
    // includes the level the build cannot buy. This assertion exists so the
    // test cannot pass vacuously against a badge with no gap.
    const naiveRange = PURCHASABLE_LEVELS.slice(0, PURCHASABLE_LEVELS.indexOf("hof") + 1);
    expect(naiveRange).toContain("silver");
    expect(levelsFor(enumerate([], "Shooting"), GAP_ID)).not.toEqual(naiveRange);
  });
});

describe("2.2 — a height-blocked badge emits ZERO steps at any level", () => {
  it("blocks the badge entirely even where levelPasses would pass", () => {
    // Attributes 99 pass every level; only the height gate refuses.
    expect(levelsFor(enumerate([], "Defense", { height: 77 }), HEIGHT_ID)).toEqual([]);
    expect(levelsFor(enumerate([], "Defense", { height: 79 }), HEIGHT_ID)).toEqual([]);
    // …and at the boundary it is fully enumerable, so the fixture is live.
    expect(levelsFor(enumerate([], "Defense", { height: 78 }), HEIGHT_ID)).toEqual([
      "bronze",
      "silver",
      "gold",
      "hof",
    ]);
  });
});

describe("2.3 — no downgrade, no re-buy", () => {
  it("an entry at Gold emits ONLY HOF", () => {
    const steps = enumerate([{ badgeId: "deadeye", purchasedLevel: "gold" }], "Shooting");
    expect(levelsFor(steps, "deadeye")).toEqual(["hof"]);
  });

  it("an entry at HOF emits nothing", () => {
    const steps = enumerate([{ badgeId: "deadeye", purchasedLevel: "hof" }], "Shooting");
    expect(levelsFor(steps, "deadeye")).toEqual([]);
  });
});

describe("2.4 — pins and exclusions remove exactly their badge's steps and nothing else", () => {
  const baseline = enumerate([], "Shooting");

  it("pinnedBadgeIds removes only the pinned badge", () => {
    const pinned = enumerate([], "Shooting", { pinned: new Set(["deadeye"]) });
    expect(pinned.every((step) => step.badgeId !== "deadeye")).toBe(true);
    expect(pinned).toEqual(baseline.filter((step) => step.badgeId !== "deadeye"));
  });

  it("excludedBadgeIds removes only the excluded badge", () => {
    const excluded = enumerate([], "Shooting", { excluded: new Set(["deadeye"]) });
    expect(excluded).toEqual(baseline.filter((step) => step.badgeId !== "deadeye"));
  });
});

describe("2.5 — deterministic order: dataset order, then PURCHASABLE_LEVELS order", () => {
  it("two calls on equal input are deeply equal", () => {
    expect(enumerate([], "Physicals")).toEqual(enumerate([], "Physicals"));
  });

  it("THE ORDER IS ASSERTED, not merely stable — it is pickUniform's index space", () => {
    const steps = enumerate([], "Physicals");
    const datasetOrder = dataset.badges
      .filter((badge) => badge.category === "Physicals")
      .map((badge) => badge.id);
    const expected: string[] = [];
    for (const badgeId of datasetOrder) {
      for (const level of PURCHASABLE_LEVELS) {
        if (steps.some((step) => step.badgeId === badgeId && step.toLevel === level)) {
          expected.push(`${badgeId}:${level}`);
        }
      }
    }
    expect(steps.map((step) => `${step.badgeId}:${step.toLevel}`)).toEqual(expected);
  });
});

describe("2.6 — requiresNewBadgeSlot is true iff fromLevel is null", () => {
  it("holds for every emitted step across every category", () => {
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "pogo-stick", purchasedLevel: "silver" },
    ];
    for (const category of CATEGORIES) {
      for (const step of enumerate(loadout, category)) {
        expect(step.requiresNewBadgeSlot).toBe(step.fromLevel === null);
      }
    }
  });
});

describe("2.7 — grossCost IS a literal whatIf call, so the hoist is bit-identical by construction", () => {
  it("every emitted step's grossCost equals whatIf(loadout, badgeId, toLevel, dataset)", () => {
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "gold" },
    ];
    let checked = 0;
    for (const category of CATEGORIES) {
      for (const step of enumerate(loadout, category)) {
        expect(step.grossCost).toBe(whatIf(loadout, step.badgeId, step.toLevel, dataset));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe("2.8 — INV-11, cost-model additivity (Invariant R's pin)", () => {
  // A tiny deterministic LCG: the engine's PRNG is E2's and is not imported
  // here, and Math.random would make a RED run unreproducible.
  function lcg(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };
  }

  function randomLoadout(next: () => number): LoadoutEntry[] {
    const chosen: LoadoutEntry[] = [];
    for (const badge of dataset.badges) {
      if (next() < 0.25) {
        const level = PURCHASABLE_LEVELS[
          Math.floor(next() * PURCHASABLE_LEVELS.length)
        ] as PurchasableLevel;
        chosen.push({ badgeId: badge.id, purchasedLevel: level });
      }
    }
    return chosen;
  }

  function randomSynergySlots(next: () => number, loadout: LoadoutEntry[]): SynergySlot[] {
    const slots = createDefaultSynergySlots();
    const used = new Set<string>();
    return slots.map((synergySlot) => {
      if (loadout.length === 0 || next() < 0.5) return { ...synergySlot, unlocked: next() < 0.5 };
      const pick = loadout[Math.floor(next() * loadout.length)] as LoadoutEntry;
      if (used.has(pick.badgeId)) return { ...synergySlot, unlocked: true };
      used.add(pick.badgeId);
      return { ...synergySlot, unlocked: true, fuseBadgeId: pick.badgeId };
    });
  }

  it(
    "Σ netCostOf(entry) === spent(C) − refunded(C), over random loadouts × EVERY refundTrigger",
    { timeout: 20000 },
    () => {
      const next = lcg(20260826);
      for (let iteration = 0; iteration < 60; iteration += 1) {
        const loadout = randomLoadout(next);
        const synergySlots = randomSynergySlots(next, loadout);
        for (const refundTrigger of REFUND_TRIGGERS) {
          const state = stateOf(loadout, { synergySlots, refundTrigger });
          for (const category of CATEGORIES) {
            const readout = categoryLedgerAt(state, "current", category, dataset);
            const sum = loadout.reduce((total, entry) => {
              const badge = dataset.badges.find((candidate) => candidate.id === entry.badgeId);
              if (badge === undefined || badge.category !== category) return total;
              return total + netCostOf(state, badge, entry.purchasedLevel, dataset);
            }, 0);
            expect(
              sum,
              `additivity broke for ${category} under ${refundTrigger} — E2's fast path is UNSAFE`,
            ).toBe(readout.spent - readout.refunded);
          }
        }
      }
    },
  );
});

describe("2.9 — the ONE live case the net-cost machinery exists for", () => {
  it("under hofOrAbove a step to HOF on an unfused badge is net-FREE while grossCost > 0", () => {
    const steps = enumerate([], "Shooting", { state: { refundTrigger: "hofOrAbove" } });
    const hofSteps = steps.filter((step) => step.toLevel === "hof");
    expect(hofSteps.length).toBeGreaterThan(0);
    for (const step of hofSteps) {
      expect(step.grossCost).toBeGreaterThan(0);
      expect(step.netCost, `${step.badgeId} HOF should be net-free under hofOrAbove`).toBe(0);
    }
  });

  it("under legendByAnyMeans the same steps cost their gross price — the machinery is not a no-op either way", () => {
    const steps = enumerate([], "Shooting", { state: { refundTrigger: "legendByAnyMeans" } });
    for (const step of steps.filter((candidate) => candidate.toLevel === "hof")) {
      expect(step.netCost).toBe(step.grossCost);
    }
  });
});

/* =========================================================== F8-E3 ======== */

function trade(
  loadout: readonly LoadoutEntry[],
  category: Category,
  exchangeableBadgeIds: ReadonlySet<string>,
  options: {
    attrs?: number;
    height?: number;
    pinned?: ReadonlySet<string>;
    excluded?: ReadonlySet<string>;
    state?: Partial<SynergyLedgerState>;
  } = {},
): ExchangeStep[] {
  return exchangeSteps(
    {
      state: stateOf(loadout, options.state ?? {}),
      build: makeBuild(options.height ?? 78, options.attrs ?? 99),
      pinnedBadgeIds: options.pinned ?? NONE,
      excludedBadgeIds: options.excluded ?? NONE,
      exchangeableBadgeIds,
    },
    category,
    dataset,
  );
}

describe("2.10 — exchangeSteps: the SAFETY BOUNDARY is the exchangeable set, and nothing else", () => {
  const held: LoadoutEntry[] = [{ badgeId: "deadeye", purchasedLevel: "bronze" }];

  it("an EMPTY exchangeable set yields nothing, whatever is owned", () => {
    expect(trade(held, "Shooting", NONE)).toEqual([]);
  });

  it("only entries IN the set can leave, even when other entries are owned and unpinned", () => {
    const two: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "bronze" },
    ];
    const steps = trade(two, "Shooting", new Set(["deadeye"]));
    expect(steps.length).toBeGreaterThan(0);
    expect(new Set(steps.map((step) => step.outBadgeId))).toEqual(new Set(["deadeye"]));
  });

  it("an id in the set that is NOT owned is silently no exchange, never a throw", () => {
    expect(trade([], "Shooting", new Set(["deadeye"]))).toEqual([]);
  });

  it("the incoming badge is always UNOWNED — raising something held is an upgrade, not a trade", () => {
    const two: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "bronze" },
    ];
    const steps = trade(two, "Shooting", new Set(["deadeye", "static-middy"]));
    for (const step of steps) {
      expect(two.some((entry) => entry.badgeId === step.badgeId)).toBe(false);
    }
  });

  it("an EXCLUDED badge is never bought, and a PINNED id is never bought", () => {
    const excluded = new Set(["limitless-range"]);
    for (const step of trade(held, "Shooting", new Set(["deadeye"]), { excluded })) {
      expect(step.badgeId).not.toBe("limitless-range");
    }
    const pinned = new Set(["static-middy"]);
    for (const step of trade(held, "Shooting", new Set(["deadeye"]), { pinned })) {
      expect(step.badgeId).not.toBe("static-middy");
    }
  });

  it("a HEIGHT-BLOCKED badge is never bought — the gate is legalSteps' gate, verbatim", () => {
    const isolated = exchangeSteps(
      {
        state: stateOf([{ badgeId: "synthetic-twin-a", purchasedLevel: "bronze" }]),
        build: makeBuild(69, 99),
        pinnedBadgeIds: NONE,
        excludedBadgeIds: NONE,
        exchangeableBadgeIds: new Set(["synthetic-twin-a"]),
      },
      "Defense",
      dataset,
    );
    expect(isolated.every((step) => step.badgeId !== HEIGHT_ID)).toBe(true);
  });
});

describe("2.11 — exchangeSteps: `netCost > 0` is an ADMISSIBILITY test, not a leaning", () => {
  it("no emitted exchange is ever free or backwards", () => {
    const steps = trade(
      [{ badgeId: "deadeye", purchasedLevel: "hof" }],
      "Shooting",
      new Set(["deadeye"]),
    );
    for (const step of steps) expect(step.netCost).toBeGreaterThan(0);
  });

  it("a dear outgoing entry simply has FEWER admissible trades — it is not down-ranked", () => {
    // deadeye is B-tier: Bronze 2, HOF 6. From HOF almost nothing is dearer, so
    // the set SHRINKS. That is the admissibility condition doing its job; the
    // surviving members are still returned flat, with nothing to order them by.
    const fromBronze = trade(
      [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
      "Shooting",
      new Set(["deadeye"]),
    );
    const fromHof = trade(
      [{ badgeId: "deadeye", purchasedLevel: "hof" }],
      "Shooting",
      new Set(["deadeye"]),
    );
    expect(fromBronze.length).toBeGreaterThan(fromHof.length);
  });

  it("the delta is PROBED THROUGH THE SHIPPED LEDGER, never hand-rolled", () => {
    // INV-11's additivity, restated for the third move kind and proved across
    // EVERY refundTrigger — post-F4 the `onFuse` arm is live, and a locally
    // computed delta would be wrong exactly where a refund fires.
    for (const refundTrigger of REFUND_TRIGGERS) {
      const loadout: LoadoutEntry[] = [{ badgeId: "deadeye", purchasedLevel: "bronze" }];
      const state = stateOf(loadout, { refundTrigger });
      const steps = trade(loadout, "Shooting", new Set(["deadeye"]), {
        state: { refundTrigger },
      });
      const outBadge = dataset.badges.find((badge) => badge.id === "deadeye") as Badge;
      for (const step of steps) {
        const inBadge = dataset.badges.find((badge) => badge.id === step.badgeId) as Badge;
        expect(step.netCost, `${refundTrigger} ${step.badgeId}`).toBe(
          netCostOf(state, inBadge, step.toLevel, dataset) -
            netCostOf(state, outBadge, "bronze", dataset),
        );
      }
    }
  });

  it("H3 PER LEVEL is inherited: the gap badge is offered at Bronze, Gold and HOF, never Silver", () => {
    const loadout: LoadoutEntry[] = [{ badgeId: "arc-cadence", purchasedLevel: "bronze" }];
    const levels = trade(loadout, "Shooting", new Set(["arc-cadence"]))
      .filter((step) => step.badgeId === GAP_ID)
      .map((step) => step.toLevel);
    expect(levels.length).toBeGreaterThan(0);
    expect(levels).not.toContain("silver");
  });

  it("every exchange is slot-neutral and deterministically ordered", () => {
    const loadout: LoadoutEntry[] = [{ badgeId: "deadeye", purchasedLevel: "bronze" }];
    const once = trade(loadout, "Shooting", new Set(["deadeye"]));
    const twice = trade(loadout, "Shooting", new Set(["deadeye"]));
    expect(once).toEqual(twice);
    for (const step of once) {
      expect(step.requiresNewBadgeSlot).toBe(false);
      expect(step.kind).toBe("exchange");
      expect(step.outLevel).toBe("bronze");
      expect(step.category).toBe("Shooting");
    }
    // Dataset order, then PURCHASABLE_LEVELS order — an INPUT to a uniform
    // index, exactly as in legalSteps, never a preference.
    const order = dataset.badges.filter((badge) => badge.category === "Shooting").map((b) => b.id);
    const seen = once.map((step) => step.badgeId);
    const positions = seen.map((id) => order.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe("2.12 — applyExchange is pure, and the entry count cannot move", () => {
  it("drops the outgoing entry, appends the incoming one, mutates nothing", () => {
    const loadout: readonly LoadoutEntry[] = Object.freeze([
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "gold" },
    ]);
    const step = trade([...loadout], "Shooting", new Set(["deadeye"]))[0] as ExchangeStep;
    const after = applyExchange(loadout, step);
    expect(after.length).toBe(loadout.length);
    expect(after.some((entry) => entry.badgeId === "deadeye")).toBe(false);
    expect(after).toContainEqual({ badgeId: step.badgeId, purchasedLevel: step.toLevel });
    // Untouched entries carry through byte-identical, and the input is intact.
    expect(after).toContainEqual({ badgeId: "static-middy", purchasedLevel: "gold" });
    expect(loadout).toEqual([
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "gold" },
    ]);
  });
});

describe("2.13 — ceilingSpendFor is a LATTICE quantity, capped by the pool", () => {
  const input = () => ({
    state: stateOf([]),
    build: makeBuild(78, 99),
    pinnedBadgeIds: NONE,
    excludedBadgeIds: NONE,
  });

  it("a fat-fingered pool cannot inflate it — it saturates at what the category can absorb", () => {
    const huge = ceilingSpendFor(input(), "Shooting", 999, dataset);
    expect(huge).toBeLessThan(999);
    expect(ceilingSpendFor(input(), "Shooting", 999999, dataset)).toBe(huge);
  });

  it("a small pool caps it — min(points, legalCeiling), both arms live", () => {
    expect(ceilingSpendFor(input(), "Shooting", 3, dataset)).toBe(3);
  });

  it("it is a genuine UPPER bound on what one category can hold", () => {
    // Checked against the real thing rather than against a re-derivation: buy
    // EVERY Shooting badge at its dearest legal level and the ledger's own
    // net spend must not exceed the ceiling. Deliberately not `toBe` against a
    // sum of HOF costs — not every badge reaches HOF even at attrs 99, and a
    // test that assumes otherwise is testing its own arithmetic.
    const build = makeBuild(78, 99);
    const everything: LoadoutEntry[] = [];
    for (const badge of dataset.badges) {
      if (badge.category !== "Shooting") continue;
      // HEIGHT FIRST. `levelPasses` is the ATTRIBUTE gate only; a height-blocked
      // badge can never be bought, so it must not enter the comparison — while
      // the LEDGER would happily charge for one, because H8 says a stale
      // purchase is disclosed rather than repaired.
      if (!validateBadge(badge, build).allowed) continue;
      const dearest = [...PURCHASABLE_LEVELS]
        .reverse()
        .find((level) => levelPasses(badge.requirements, build, level));
      if (dearest !== undefined) everything.push({ badgeId: badge.id, purchasedLevel: dearest });
    }
    const readout = categoryLedgerAt(stateOf(everything), "current", "Shooting", dataset);
    const ceiling = ceilingSpendFor(input(), "Shooting", 999, dataset);
    expect(everything.length).toBeGreaterThan(5);
    expect(readout.spent - readout.refunded).toBe(ceiling);
  });

  it("a height-blocked badge contributes nothing to the ceiling", () => {
    const tall = ceilingSpendFor(
      { ...input(), build: makeBuild(78, 99) },
      "Defense",
      999,
      dataset,
    );
    const short = ceilingSpendFor(
      { ...input(), build: makeBuild(69, 99) },
      "Defense",
      999,
      dataset,
    );
    // The 78–78 fixture is reachable at 78 and blocked at 69.
    expect(tall).toBeGreaterThan(short);
  });
});
