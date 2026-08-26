/**
 * F8-E2 — the roll engine. INV-1a, 3–9, 12–14, 17, 18 and every decline case.
 *
 * FIRST PROOF, and it is first for a reason: a roll that offers a GAP level is
 * silently-wrong output that looks completely plausible, which is this
 * project's named cardinal failure shape. The INV-4 assertion below was
 * written and seen to FAIL — for the right reason, "Cannot find module
 * ../src/engine/randomize", i.e. no roller yet rather than a fixture bug —
 * before the walk existed. The RED run is in docs/proof/f8e2-verification.txt.
 *
 * ON THE DISTRIBUTION CLAIM (AJ-9). Nothing in this file asserts, or names a
 * test after, uniformity over OUTCOMES. That claim is FALSE for randomized
 * greedy and is banned outright by scope.md §0.1 A4. What is true, and what is
 * tested, is move-equiprobability (INV-10, and INV-23 for the third move kind)
 * plus equivariance (INV-8, and INV-24 for the third move kind) — and
 * equivariance is the load-bearing one, because a statistic can only fail to
 * observe a preference whereas equivariance shows the roller cannot express one.
 *
 * F8-E3 adds INV-20..24 and restates INV-5 and INV-7 over the ENLARGED move
 * set. The three-kind move set does not weaken a single claim above: `netCost
 * > 0` gates whether an exchange is OFFERED, exactly as `netCost <=
 * remainingPoints` already did, and never how often it is drawn.
 */

import { describe, expect, it } from "vitest";
import { effectiveBudgets, zeroBonus } from "../src/engine/budget";
import { loadDataset, shippedRawDataset } from "../src/engine/dataset";
import { RollDidNotTerminateError } from "../src/engine/errors";
import {
  ROLL_ALGORITHM_VERSION,
  rollBuild,
  rollCategory,
  rollIterationBound,
} from "../src/engine/randomize";
import type { PinMode, RollRequest } from "../src/engine/randomize";
import {
  syntheticAndMidNullGap,
  syntheticAndTrailingNull,
  syntheticBadges,
  syntheticCheapBronzeOnly,
  syntheticDearBronzeOnly,
  syntheticExchangePlusFour,
  syntheticExchangePlusOne,
  syntheticFreeAtHof,
  syntheticHeightBoundary,
  syntheticOrBothNull,
  syntheticThresholdBoundary,
  syntheticTwinA,
  syntheticTwinB,
} from "../src/engine/__fixtures__/synthetic-badges";
import { badgeById } from "../src/engine/dataset";
import { createRng, pickUniform } from "../src/engine/random";
import { applyStep, exchangeSteps, isExchangeStep, legalSteps } from "../src/engine/steps";
import type { RollStep } from "../src/engine/steps";
import { entryIsStale } from "../src/engine/eligibility";
import { synergyRoleFor } from "../src/engine/synergy";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import { validateLoadout } from "../src/engine/validate-loadout";
import type {
  BadgeDataset,
  BonusBudget,
  Budget,
  LoadoutEntry,
  RawBadge,
  SynergySlot,
} from "../src/engine/types";
import type { Category, PurchasableLevel } from "../src/engine/vocabulary";
import { CATEGORIES, levelIndex } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";
import {
  equalAttributeFamily,
  grossSpendOf,
  optimalAddedSpend,
  spreadAttributeFamily,
} from "./randomize-oracle";
import type { SweepFixture } from "./randomize-oracle";
import { categoryFeasibility } from "../src/ui/grid/feasibility";

// ---------------------------------------------------------------------------
// Datasets. Isolated ones exist because the statistical and equivariance
// invariants need a category containing EXACTLY the fixture pair — with 53
// shipped badges in the way the signal is unmeasurable.
// ---------------------------------------------------------------------------

/**
 * THE SWEEP DATASET IS PINNED TO A NAMED SET, NOT SPLATTED FROM
 * `syntheticBadges`. Same reasoning `tests/feasibility-golden.test.ts` already
 * records, and F8-E3 is the slice that proved it was needed here too.
 *
 * The barrel export GROWS, and a fixture added to make one statistical property
 * observable in an ISOLATED two- or three-badge dataset has no business
 * changing a distribution measured over the whole dataset. INV-23's pair is
 * exactly that: `synthetic-exchange-plus-four` is legal ONLY at HOF, which is a
 * shape no shipped badge has, and dropping it into Physicals turns a
 * capacity-free pool of 12 into an exact-cover problem that randomized greedy
 * can miss by 4 — see `the adversarial fixture, disclosed` below, where that
 * finding is pinned rather than hidden.
 *
 * So: this dataset is the E1/E2 fixture set, which also makes the
 * `equal-attributes` sweep family a true reproduction of what F8-E2 measured.
 * INV-23 and INV-22 reach their pair through `datasetOf(...)` instead.
 */
const dataset: BadgeDataset = loadDataset({
  ...shippedRawDataset,
  badges: [
    ...shippedRawDataset.badges,
    syntheticAndTrailingNull,
    syntheticAndMidNullGap,
    syntheticOrBothNull,
    syntheticHeightBoundary,
    syntheticThresholdBoundary,
    syntheticTwinA,
    syntheticTwinB,
    syntheticDearBronzeOnly,
    syntheticCheapBronzeOnly,
    syntheticFreeAtHof,
  ],
});

function datasetOf(...badges: RawBadge[]): BadgeDataset {
  return loadDataset({ ...shippedRawDataset, badges });
}

const fixture = (id: string): RawBadge =>
  syntheticBadges.find((badge) => badge.id === id) as RawBadge;

const GAP_ID = "synthetic-and-mid-null-gap"; // Shooting — legal BRZ/GLD/HOF, NOT SLV

function budgets(points: number, equipSlots: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots, points }]),
  ) as Record<Category, Budget>;
}

function stateOf(overrides: Partial<SynergyLedgerState> = {}): SynergyLedgerState {
  return {
    loadout: [],
    budgets: budgets(16, 4),
    synergySlots: createDefaultSynergySlots(),
    refundTrigger: "legendByAnyMeans",
    ...overrides,
  };
}

function requestOf(overrides: Partial<RollRequest> = {}): RollRequest {
  return {
    state: stateOf(),
    build: makeBuild(78, 85),
    pins: {},
    excludedBadgeIds: [],
    seed: "base",
    mode: "fill",
    ...overrides,
  };
}

const NONE: ReadonlySet<string> = new Set<string>();

/**
 * The walk's OWN bookkeeping, re-derived from the report so the tests can check
 * the safety boundary without the engine handing them the answer. An `add`
 * enrols a badge; an `exchange` swaps one id for another; an UPGRADE ENROLS
 * NOTHING, because an `include`-pinned entry the user placed may legally be
 * raised and enrolling it there is exactly how a roll would start deleting the
 * user's badges.
 */
function rollCreatedIdsOf(steps: readonly RollStep[]): Set<string> {
  const created = new Set<string>();
  for (const step of steps) {
    if (isExchangeStep(step)) {
      created.delete(step.outBadgeId);
      created.add(step.badgeId);
    } else if (step.fromLevel === null) {
      created.add(step.badgeId);
    }
  }
  return created;
}

const exchangesIn = (steps: readonly RollStep[]) => steps.filter(isExchangeStep);

/**
 * E2'S TWO-MOVE WALK, kept alive here as a REFERENCE IMPLEMENTATION for INV-20.
 *
 * Why a reference walk rather than goldens copied from the E2 run: the whole
 * point of `ROLL_ALGORITHM_VERSION` is that it rides in the per-category RNG
 * seed string, so at version 2 the SAME seed necessarily draws a different
 * stream than it did at version 1. Literal E2 output cannot match, BY
 * CONSTRUCTION — that is the mechanism working, not a regression. What the
 * theorem actually claims is that the two-move and three-move walks agree
 * wherever no exchange is offered, and this compares them at the same version,
 * which is the apples-to-apples form of exactly that claim.
 *
 * Scoped to the sweep's shape — empty loadout, `fill`, no pins, no exclusions —
 * so it stays a few lines rather than a second engine.
 */
function twoMoveWalk(
  seed: string,
  state: SynergyLedgerState,
  build: ReturnType<typeof makeBuild>,
  category: Category,
  activeDataset: BadgeDataset,
): LoadoutEntry[] {
  const rng = createRng(`${seed} ${ROLL_ALGORITHM_VERSION} ${category}`);
  const capacity = state.budgets[category].equipSlots;
  let loadout: LoadoutEntry[] = [...state.loadout];
  const at = (): SynergyLedgerState => ({ ...state, loadout });
  for (let guard = 0; guard < 400; guard += 1) {
    const readout = categoryLedgerAt(at(), "current", category, activeDataset);
    const newBadgesAllowed = readout.equipSlotsUsed < capacity;
    const candidates = legalSteps(
      { state: at(), build, pinnedBadgeIds: NONE, excludedBadgeIds: NONE },
      category,
      activeDataset,
    ).filter(
      (step) =>
        step.netCost <= readout.remainingPoints &&
        (!step.requiresNewBadgeSlot || newBadgesAllowed),
    );
    if (candidates.length === 0) break;
    loadout = applyStep(loadout, pickUniform(rng, candidates)) as LoadoutEntry[];
  }
  return loadout.filter((entry) => badgeById(activeDataset, entry.badgeId)?.category === category);
}

/** Twenty structurally different starting states, for the property sweeps. */
function sweepStates(): SynergyLedgerState[] {
  const picks: LoadoutEntry[][] = [
    [],
    [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
    [{ badgeId: "deadeye", purchasedLevel: "hof" }],
    [
      { badgeId: "deadeye", purchasedLevel: "gold" },
      { badgeId: "pogo-stick", purchasedLevel: "bronze" },
    ],
    [
      { badgeId: "posterizer", purchasedLevel: "bronze" },
      { badgeId: "dimer", purchasedLevel: "silver" },
      { badgeId: "interceptor", purchasedLevel: "gold" },
    ],
  ];
  const shapes = [
    { points: 0, equipSlots: 4 },
    { points: 7, equipSlots: 2 },
    { points: 16, equipSlots: 4 },
    { points: 40, equipSlots: 6 },
  ];
  return picks.flatMap((loadout) =>
    shapes.map((shape) => stateOf({ loadout, budgets: budgets(shape.points, shape.equipSlots) })),
  );
}

// ===========================================================================

describe("INV-4 / H3 — THE CARDINAL TEST: the roll NEVER proposes a gap level", () => {
  it("never proposes Silver on the gap badge, over 500 seeds", { timeout: 20000 }, () => {
    let sawGapBadge = 0;
    for (let seed = 0; seed < 500; seed += 1) {
      const result = rollBuild(
        requestOf({
          state: stateOf({ budgets: budgets(40, 6) }),
          build: makeBuild(78, 99),
          categories: ["Shooting"],
          seed: `gap-${seed}`,
        }),
        dataset,
      );
      for (const entry of result.proposedLoadout) {
        if (entry.badgeId !== GAP_ID) continue;
        sawGapBadge += 1;
        expect(
          entry.purchasedLevel,
          `seed gap-${seed} proposed a level the build CANNOT BUY`,
        ).not.toBe("silver");
      }
    }
    expect(
      sawGapBadge,
      "the gap badge was never rolled — the test proves nothing",
    ).toBeGreaterThan(0);
  });

  it("every applied step came from the enumerator, so per-level legality is inherited", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const request = requestOf({
        state: stateOf({ budgets: budgets(30, 5) }),
        build: makeBuild(78, 88),
        seed: `levels-${seed}`,
      });
      const result = rollBuild(request, dataset);
      for (const report of result.categories) {
        const legal = legalSteps(
          {
            state: request.state,
            build: request.build,
            pinnedBadgeIds: NONE,
            excludedBadgeIds: NONE,
          },
          report.category,
          dataset,
        );
        for (const step of report.steps) {
          expect(legal.some((candidate) => candidate.badgeId === step.badgeId)).toBe(true);
        }
      }
    }
  });
});

describe("INV-1a — determinism", () => {
  it("100 seeds x 10 repeats: identical request, byte-identical result", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const request = requestOf({ seed: `det-${seed}` });
      const first = rollBuild(request, dataset);
      for (let repeat = 0; repeat < 10; repeat += 1) {
        expect(rollBuild(request, dataset)).toEqual(first);
      }
    }
  });

  it("different seeds genuinely diverge — determinism is not a constant function", () => {
    const shapes = new Set(
      Array.from({ length: 40 }, (_unused, seed) =>
        JSON.stringify(rollBuild(requestOf({ seed: `spread-${seed}` }), dataset).proposedLoadout),
      ),
    );
    expect(shapes.size).toBeGreaterThan(5);
  });

  it("the reproducibility token carries every input that can change the answer", () => {
    const base = requestOf({ seed: "token" });
    const token = rollBuild(base, dataset).token;
    expect(token.seed).toBe("token");
    expect(token.rollAlgorithmVersion).toBe(ROLL_ALGORITHM_VERSION);
    expect(token.dataVersion).toBe(dataset.dataVersion);
    expect(token.refundTrigger).toBe("legendByAnyMeans");

    const digests = new Set([
      token.inputDigest,
      rollBuild({ ...base, build: makeBuild(79, 85) }, dataset).token.inputDigest,
      rollBuild({ ...base, mode: "reroll" }, dataset).token.inputDigest,
      rollBuild({ ...base, excludedBadgeIds: ["deadeye"] }, dataset).token.inputDigest,
      rollBuild({ ...base, pins: { deadeye: "exact" } }, dataset).token.inputDigest,
      rollBuild({ ...base, categories: ["Shooting"] }, dataset).token.inputDigest,
      rollBuild({ ...base, state: stateOf({ budgets: budgets(17, 4) }) }, dataset).token.inputDigest,
    ]);
    expect(digests.size).toBe(7);
  });
});

describe("INV-3 — legality: every proposal validates clean", () => {
  it("validateLoadout(proposed).errors is [] across 500 rolls", { timeout: 20000 }, () => {
    const states = sweepStates();
    for (let seed = 0; seed < 500; seed += 1) {
      const state = states[seed % states.length] as SynergyLedgerState;
      const result = rollBuild(
        requestOf({ state, seed: `legal-${seed}`, mode: seed % 2 === 0 ? "fill" : "reroll" }),
        dataset,
      );
      const validation = validateLoadout({ ...state, loadout: result.proposedLoadout }, dataset);
      expect(validation.errors, `seed legal-${seed} produced a HARD violation`).toEqual([]);
    }
  });
});

describe("INV-5 — pin respect: no pin is EVER dropped, under any outcome", () => {
  const loadout: LoadoutEntry[] = [
    { badgeId: "deadeye", purchasedLevel: "gold" },
    { badgeId: "static-middy", purchasedLevel: "bronze" },
    { badgeId: "posterizer", purchasedLevel: "bronze" },
  ];
  // Attributes 95 so NOTHING in this fixture is accidentally stale. At 85,
  // deadeye@gold is above its cap and would be pinned for reason "stale" — the
  // tests below would still pass, but they would be exercising the IMPLICIT
  // pin instead of the user pin they claim to test.
  const healthy = makeBuild(78, 95);

  it("exact pins keep their identical level; include pins never fall", { timeout: 20000 }, () => {
    const pins: Record<string, PinMode> = { deadeye: "exact", "static-middy": "include" };
    for (let seed = 0; seed < 150; seed += 1) {
      for (const mode of ["fill", "reroll"] as const) {
        const state = stateOf({ loadout, budgets: budgets(30, 5) });
        const result = rollBuild(
          requestOf({ state, build: healthy, pins, seed: `pin-${seed}`, mode }),
          dataset,
        );
        const byId = new Map(result.proposedLoadout.map((entry) => [entry.badgeId, entry]));

        // NO PIN IS EVER DROPPED.
        expect(byId.has("deadeye")).toBe(true);
        expect(byId.has("static-middy")).toBe(true);
        // exact: identical level.
        expect(byId.get("deadeye")?.purchasedLevel).toBe("gold");
        // include: membership held, level may rise, NEVER falls.
        expect(
          levelIndex(byId.get("static-middy")?.purchasedLevel as PurchasableLevel),
        ).toBeGreaterThanOrEqual(levelIndex("bronze"));
      }
    }
  });

  it(
    "INV-5b — A4-R1: in `fill`, every entry absent from `pins` is byte-identical",
    { timeout: 20000 },
    () => {
      // `fill` ADDS; only `reroll` REBUILDS. An absent id is not permission, so a
      // forgotten pin fails CLOSED — which is the point, because a `fill` that
      // quietly raises one entry is a single pip in a 53-card grid.
      for (let seed = 0; seed < 500; seed += 1) {
        const state = sweepStates()[seed % 20] as SynergyLedgerState;
        const result = rollBuild(
          requestOf({
            state,
            build: healthy,
            pins: {},
            seed: `fillpin-${seed}`,
            mode: "fill",
          }),
          dataset,
        );
        for (const original of state.loadout) {
          const proposed = result.proposedLoadout.find(
            (entry) => entry.badgeId === original.badgeId,
          );
          expect(proposed, `${original.badgeId} vanished from a fill`).toEqual(
            original,
          );
        }
      }
    },
  );

  it("INV-5b — an explicit `include` is what re-opens an entry to `fill`", () => {
    // The corollary, and the reason the rule is a PERMISSION GRANT rather than
    // a ban: the mechanism to raise an existing entry still exists, it just has
    // to be asked for. Without this the correction would be indistinguishable
    // from "fill can never upgrade anything".
    const state = stateOf({
      loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
      budgets: budgets(30, 5),
    });
    const held = rollCategory(
      requestOf({
        state,
        build: healthy,
        pins: {},
        seed: "grant",
        mode: "fill",
      }),
      "Shooting",
      dataset,
    );
    const granted = rollCategory(
      requestOf({
        state,
        build: healthy,
        pins: { deadeye: "include" },
        seed: "grant",
        mode: "fill",
      }),
      "Shooting",
      dataset,
    );
    const levelOf = (report: { proposedEntries: LoadoutEntry[] }) =>
      report.proposedEntries.find((entry) => entry.badgeId === "deadeye")
        ?.purchasedLevel;
    expect(levelOf(held)).toBe("bronze");
    expect(levelIndex(levelOf(granted) as PurchasableLevel)).toBeGreaterThan(
      levelIndex("bronze"),
    );
  });

  it("INV-5b — the `fillDefault` note fires only where the rule COST something", () => {
    // Emitting a note for all twenty entries of a full build is noise. The note
    // means "this one could have absorbed points if you let it".
    const rich = rollCategory(
      requestOf({
        state: stateOf({
          loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
          budgets: budgets(30, 5),
        }),
        build: healthy,
        seed: "note",
        mode: "fill",
      }),
      "Shooting",
      dataset,
    );
    expect(rich.pinned.some((note) => note.reason === "fillDefault")).toBe(
      true,
    );

    // Same entry, nothing left to pay with: held all the same, but SILENT.
    const broke = rollCategory(
      requestOf({
        state: stateOf({
          loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
          budgets: budgets(1, 5),
        }),
        build: healthy,
        seed: "note",
        mode: "fill",
      }),
      "Shooting",
      dataset,
    );
    expect(broke.proposedEntries).toContainEqual({
      badgeId: "deadeye",
      purchasedLevel: "bronze",
    });
    expect(broke.pinned.some((note) => note.reason === "fillDefault")).toBe(false);
  });

  it("a synergy-role holder is IMPLICITLY and NON-OVERRIDABLY pinned", () => {
    // The highest-severity risk in the feature: clearing this entry would
    // strand a fuse reference, which is the F2.1 defect class.
    const synergySlots: SynergySlot[] = createDefaultSynergySlots().map((synergySlot) =>
      synergySlot.id === 5
        ? { ...synergySlot, unlocked: true, fuseBadgeId: "deadeye" }
        : synergySlot,
    );
    for (let seed = 0; seed < 50; seed += 1) {
      const state = stateOf({ loadout, synergySlots, budgets: budgets(30, 5) });
      const result = rollBuild(
        requestOf({ state, build: healthy, pins: {}, seed: `role-${seed}`, mode: "reroll" }),
        dataset,
      );
      expect(
        result.proposedLoadout.find((entry) => entry.badgeId === "deadeye")?.purchasedLevel,
      ).toBe("gold");
      const report = result.categories.find((entry) => entry.category === "Shooting");
      expect(report?.pinned.some((note) => note.reason === "synergyRole")).toBe(true);
    }
  });

  it("a role on a LOCKED synergy slot still pins — the reference exists either way", () => {
    const synergySlots: SynergySlot[] = createDefaultSynergySlots().map((synergySlot) =>
      synergySlot.id === 5 ? { ...synergySlot, fuseBadgeId: "deadeye" } : synergySlot,
    );
    const state = stateOf({ loadout, synergySlots, budgets: budgets(30, 5) });
    const result = rollBuild(
      requestOf({ state, build: healthy, seed: "locked-role", mode: "reroll" }),
      dataset,
    );
    expect(result.proposedLoadout.some((entry) => entry.badgeId === "deadeye")).toBe(true);
  });

  it("a STALE purchase is implicitly pinned, never repaired and never re-proposed (H8)", () => {
    // limitless-range needs 83 threePt at Bronze; this build has 60.
    const weak = makeBuild(78, 60);
    const stale: LoadoutEntry[] = [{ badgeId: "limitless-range", purchasedLevel: "gold" }];
    const state = stateOf({ loadout: stale, budgets: budgets(30, 5) });
    for (const mode of ["fill", "reroll"] as const) {
      const result = rollBuild(requestOf({ state, build: weak, seed: "stale", mode }), dataset);
      const kept = result.proposedLoadout.find((entry) => entry.badgeId === "limitless-range");
      expect(kept?.purchasedLevel, "the roll REPAIRED a disclosure").toBe("gold");
      const report = result.categories.find((entry) => entry.category === "Shooting");
      expect(report?.pinned.some((note) => note.reason === "stale")).toBe(true);
    }
  });

  it("an owned EXCLUDED badge is HELD, not cleared — `never roll this` must not delete a purchase", () => {
    const state = stateOf({ loadout, budgets: budgets(30, 5) });
    const result = rollBuild(
      requestOf({ state, build: healthy, excludedBadgeIds: ["deadeye"], seed: "excl", mode: "reroll" }),
      dataset,
    );
    expect(result.proposedLoadout.find((e) => e.badgeId === "deadeye")?.purchasedLevel).toBe("gold");
    const report = result.categories.find((entry) => entry.category === "Shooting");
    expect(report?.pinned.some((note) => note.reason === "excluded")).toBe(true);
  });

  it("an excluded badge is never purchased or upgraded, over 150 seeds", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const result = rollBuild(
        requestOf({
          state: stateOf({ budgets: budgets(40, 6) }),
          excludedBadgeIds: ["deadeye", "posterizer"],
          seed: `never-${seed}`,
        }),
        dataset,
      );
      for (const report of result.categories) {
        for (const step of report.steps) {
          expect(["deadeye", "posterizer"]).not.toContain(step.badgeId);
        }
      }
    }
  });
});

describe("INV-6 — budget respect (AJ-11): a roll never creates a violation it could avoid", () => {
  it("remaining >= 0, used <= capacity, and SOFT violations never increase", { timeout: 20000 }, () => {
    const states = sweepStates();
    for (let seed = 0; seed < 300; seed += 1) {
      const state = states[seed % states.length] as SynergyLedgerState;
      const request = requestOf({
        state,
        seed: `budget-${seed}`,
        mode: seed % 2 === 0 ? "fill" : "reroll",
      });
      const result = rollBuild(request, dataset);
      const proposedState = { ...state, loadout: result.proposedLoadout };

      for (const report of result.categories) {
        if (report.outcome === "declined") continue;
        expect(report.after.remainingPoints).toBeGreaterThanOrEqual(0);
        expect(report.after.equipSlotsUsed).toBeLessThanOrEqual(report.equipSlotCapacity);
      }

      const beforeWarnings = validateLoadout(state, dataset).warnings;
      const afterWarnings = validateLoadout(proposedState, dataset).warnings;
      expect(afterWarnings.length).toBeLessThanOrEqual(beforeWarnings.length);
      // [A5] NARROWED, NOT RE-SCOPED. `SoftViolation` gained two BUILD-LEVEL
      // kinds (bonus*OverApplied) that carry no `category`, so the union no
      // longer has that field on every member. These sweep states carry no
      // bonus layer at all, so neither kind can fire and the set below is
      // exactly the set it has always been — no expectation moves.
      const hadWarning = new Set(
        beforeWarnings.flatMap((warning) => ("category" in warning ? [warning.category] : [])),
      );
      for (const warning of afterWarnings) {
        if (!("category" in warning)) continue;
        expect(hadWarning.has(warning.category), `a NEW warning in ${warning.category}`).toBe(true);
      }
    }
  });

  it("Badge Slots are a HARD cap on the roll's OUTPUT even though H4 is soft for the user", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = rollBuild(
        requestOf({ state: stateOf({ budgets: budgets(99, 2) }), seed: `cap-${seed}` }),
        dataset,
      );
      for (const report of result.categories) {
        expect(report.after.equipSlotsUsed).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("INV-7 — maximality, by re-running BOTH enumerators on the result", () => {
  // F8-E3 restates this over the ENLARGED move set, which makes it strictly
  // stronger than E2's version: a roll is now maximal against add, upgrade AND
  // exchange, so "no move of any kind remains" is what the empty-candidate-set
  // exit actually means.
  it("no affordable move of ANY kind remains in any rolled category", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const request = requestOf({
        state: stateOf({ budgets: budgets(24, 4) }),
        seed: `max-${seed}`,
      });
      const result = rollBuild(request, dataset);
      const proposedState: SynergyLedgerState = {
        ...request.state,
        loadout: result.proposedLoadout,
      };
      for (const report of result.categories) {
        if (report.outcome === "declined") continue;
        const readout = categoryLedgerAt(proposedState, "current", report.category, dataset);
        const remaining = legalSteps(
          {
            state: proposedState,
            build: request.build,
            pinnedBadgeIds: new Set(
              report.pinned.filter((note) => note.mode === "exact").map((note) => note.badgeId),
            ),
            excludedBadgeIds: NONE,
          },
          report.category,
          dataset,
        ).filter(
          (step) =>
            step.netCost <= readout.remainingPoints &&
            (!step.requiresNewBadgeSlot || readout.equipSlotsUsed < report.equipSlotCapacity),
        );
        expect(remaining, `${report.category} left a step on the table`).toEqual([]);

        // …AND the third move kind, under the roll's own capacity policy.
        const remainingExchanges =
          readout.equipSlotsUsed < report.equipSlotCapacity
            ? []
            : exchangeSteps(
                {
                  state: proposedState,
                  build: request.build,
                  pinnedBadgeIds: new Set(
                    report.pinned
                      .filter((note) => note.mode === "exact")
                      .map((note) => note.badgeId),
                  ),
                  excludedBadgeIds: NONE,
                  exchangeableBadgeIds: rollCreatedIdsOf(report.steps),
                },
                report.category,
                dataset,
              ).filter((step) => step.netCost <= readout.remainingPoints);
        expect(remainingExchanges, `${report.category} left an exchange on the table`).toEqual([]);
      }
    }
  });
});

describe("INV-8 — QUALITY-BLINDNESS BY EQUIVARIANCE (deterministic; the real argument)", () => {
  const twinA = fixture("synthetic-twin-a");
  const twinB = fixture("synthetic-twin-b");
  // A pool of 2 with a B-tier Bronze at 2 means exactly ONE twin fits, so
  // which one is picked is observable rather than washed out.
  const tight = () => stateOf({ budgets: budgets(2, 2), loadout: [] });

  it("(a) RELABEL: renaming a badge's id AND name changes nothing but the label", () => {
    const renamedA: RawBadge = {
      ...twinA,
      id: "synthetic-twin-a-renamed",
      name: "Totally Different",
    };
    for (let seed = 0; seed < 60; seed += 1) {
      const original = rollBuild(
        requestOf({ state: tight(), categories: ["Rebounding"], seed: `relabel-${seed}` }),
        datasetOf(twinA, twinB),
      );
      const relabelled = rollBuild(
        requestOf({ state: tight(), categories: ["Rebounding"], seed: `relabel-${seed}` }),
        datasetOf(renamedA, twinB),
      );
      const substitute = (id: string) => (id === twinA.id ? renamedA.id : id);
      expect(relabelled.proposedLoadout).toEqual(
        original.proposedLoadout.map((entry) => ({
          ...entry,
          badgeId: substitute(entry.badgeId),
        })),
      );
    }
  });

  it("(b) SWAP: swapping two indistinguishable badges' positions mirrors the result", () => {
    const sawBoth = new Set<string>();
    for (let seed = 0; seed < 60; seed += 1) {
      const straight = rollBuild(
        requestOf({ state: tight(), categories: ["Rebounding"], seed: `swap-${seed}` }),
        datasetOf(twinA, twinB),
      );
      const swapped = rollBuild(
        requestOf({ state: tight(), categories: ["Rebounding"], seed: `swap-${seed}` }),
        datasetOf(twinB, twinA),
      );
      const mirror = (id: string) => (id === twinA.id ? twinB.id : twinA.id);
      expect(swapped.proposedLoadout.map((entry) => entry.badgeId)).toEqual(
        straight.proposedLoadout.map((entry) => mirror(entry.badgeId)),
      );
      for (const entry of straight.proposedLoadout) sawBoth.add(entry.badgeId);
    }
    // Both twins must actually be reachable, or the mirror is trivial.
    expect(sawBoth.size).toBe(2);
  });

  it("the pair really is indistinguishable except by label — otherwise (a) and (b) prove nothing", () => {
    expect(twinA.name).not.toBe(twinB.name);
    expect(twinA.tier).toBe(twinB.tier);
    expect(twinA.category).toBe(twinB.category);
    expect(twinA.requirements).toEqual(twinB.requirements);
  });
});

describe("INV-9 — no cost or tier preference, of EITHER sign", () => {
  it("P(dear A-tier bought first) is in [0.47, 0.53] over 4,000 seeds", { timeout: 20000 }, () => {
    const dear = fixture("synthetic-dear-bronze-only"); // A, Bronze only, cost 3
    const cheap = fixture("synthetic-cheap-bronze-only"); // C, Bronze only, cost 1
    const isolated = datasetOf(dear, cheap);
    const seeds = 4000;
    let dearFirst = 0;
    for (let seed = 0; seed < seeds; seed += 1) {
      const report = rollCategory(
        requestOf({
          state: stateOf({ budgets: budgets(3, 2) }),
          build: makeBuild(78, 90),
          seed: `inv9-${seed}`,
        }),
        "Physicals",
        isolated,
      );
      expect(report.steps.length).toBeGreaterThan(0);
      if ((report.steps[0] as { badgeId: string }).badgeId === dear.id) dearFirst += 1;
    }
    const share = dearFirst / seeds;
    expect(
      share,
      `P(dear first) = ${share} — a cost preference of some sign exists`,
    ).toBeGreaterThan(0.47);
    expect(share).toBeLessThan(0.53);
  });
});

describe("INV-12 — synergy is untouched, structurally and behaviourally", () => {
  it("(a) TYPE LEVEL: RollResult carries no synergy field at all", () => {
    const result = rollBuild(requestOf({ seed: "synergy-shape" }), dataset);
    expect(Object.keys(result).sort()).toEqual([
      "categories",
      "changed",
      "proposedLoadout",
      "token",
    ]);
    for (const report of result.categories) {
      expect(Object.keys(report)).not.toContain("synergySlots");
      expect(Object.keys(report)).not.toContain("synergy");
    }
  });

  it("(b) BEHAVIOURAL: synergySlots is REFERENCE-identical and no stranded ref is produced", { timeout: 20000 }, () => {
    const synergySlots: SynergySlot[] = createDefaultSynergySlots().map((synergySlot) =>
      synergySlot.id === 5
        ? {
            ...synergySlot,
            unlocked: true,
            fuseBadgeId: "deadeye",
            reactionBadgeId: "static-middy",
          }
        : synergySlot,
    );
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "gold" },
      { badgeId: "static-middy", purchasedLevel: "bronze" },
    ];
    for (let seed = 0; seed < 150; seed += 1) {
      const state = stateOf({ loadout, synergySlots, budgets: budgets(30, 5) });
      const result = rollBuild(
        requestOf({ state, seed: `syn-${seed}`, mode: seed % 2 === 0 ? "fill" : "reroll" }),
        dataset,
      );
      // Reference identity: nothing was cloned, reordered or written.
      expect(state.synergySlots).toBe(synergySlots);
      const validation = validateLoadout({ ...state, loadout: result.proposedLoadout }, dataset);
      expect(
        validation.errors.filter((error) => error.kind === "synergyTargetNotPurchased"),
      ).toEqual([]);
    }
  });

  it("the input state object is never mutated", () => {
    const state = stateOf({ budgets: budgets(30, 5) });
    const snapshot = JSON.stringify(state);
    rollBuild(requestOf({ state, seed: "purity" }), dataset);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("declines — every failure-table case, and a decline MUTATES NOTHING (INV-13)", () => {
  const loadout: LoadoutEntry[] = [
    { badgeId: "deadeye", purchasedLevel: "gold" },
    { badgeId: "static-middy", purchasedLevel: "gold" },
  ];

  it("equipSlots === 0 declines as badgeSlotsCapacityUnset — NEVER treated as zero capacity", () => {
    const state = stateOf({
      budgets: { ...budgets(16, 4), Shooting: { equipSlots: 0, points: 16 } },
    });
    const report = rollCategory(requestOf({ state, seed: "unset" }), "Shooting", dataset);
    expect(report.outcome).toBe("declined");
    expect(report.decline).toEqual({ kind: "badgeSlotsCapacityUnset" });
    expect(report.steps).toEqual([]);
    expect(report.after).toEqual(report.before);
  });

  it("a pre-existing OVERSPEND declines in `fill` as alreadyOverspent", () => {
    const state = stateOf({ loadout, budgets: budgets(3, 4) }); // 6 + 6 spent against 3
    const report = rollCategory(
      requestOf({ state, seed: "over", mode: "fill" }),
      "Shooting",
      dataset,
    );
    expect(report.decline).toEqual({ kind: "alreadyOverspent", overBy: 9 });
    expect(report.proposedEntries).toEqual(loadout);
  });

  it("…and in `reroll` as pinnedOverPoints — TWO DISTINCT discriminants for a better sentence", () => {
    const pins: Record<string, PinMode> = { deadeye: "exact", "static-middy": "exact" };
    const state = stateOf({ loadout, budgets: budgets(3, 4) });
    const report = rollCategory(
      requestOf({ state, pins, seed: "over", mode: "reroll" }),
      "Shooting",
      dataset,
    );
    expect(report.decline?.kind).toBe("pinnedOverPoints");
    expect(report.decline).toMatchObject({ pool: 3, overBy: 9 });
    expect(report.proposedEntries).toEqual(loadout);
    expect(report.cleared).toEqual([]);
  });

  it("AJ-11 — a pre-existing BADGE SLOTS overflow declines in `reroll`…", () => {
    const pins: Record<string, PinMode> = { deadeye: "exact", "static-middy": "exact" };
    const state = stateOf({ loadout, budgets: budgets(40, 1) });
    const report = rollCategory(
      requestOf({ state, pins, seed: "cap", mode: "reroll" }),
      "Shooting",
      dataset,
    );
    expect(report.decline).toEqual({
      kind: "pinnedOverBadgeSlots",
      pinnedCount: 2,
      equipSlotCapacity: 1,
      overBy: 1,
    });
  });

  it("…but does NOT decline in `fill` — it blocks slot-consuming steps and DISCLOSES", () => {
    // Deriving a BLOCK from a WARNING is the one thing H4's taxonomy exists to
    // prevent, so `fill` proceeds with upgrades only.
    const state = stateOf({
      loadout: [
        { badgeId: "deadeye", purchasedLevel: "bronze" },
        { badgeId: "static-middy", purchasedLevel: "bronze" },
      ],
      budgets: budgets(40, 1),
    });
    const report = rollCategory(
      requestOf({ state, seed: "fillcap", mode: "fill" }),
      "Shooting",
      dataset,
    );
    expect(report.outcome).not.toBe("declined");
    expect(report.decline).toBeNull();
    expect(report.newBadgesBlockedByBadgeSlots).toBe(true);
    // Only upgrades of the two it already owns; no third badge appeared.
    expect(report.proposedEntries.length).toBe(2);
    expect(report.steps.every((step) => !step.requiresNewBadgeSlot)).toBe(true);
    // A4-R1: unpinned in `fill` means HELD, so the two entries are byte-identical
    // and the overflow is disclosed rather than worked around. Stated explicitly
    // because `every()` over an empty array is vacuously true, and an assertion
    // that cannot fail is not an assertion.
    expect(report.steps).toEqual([]);
    expect(report.pinned.every((note) => note.reason === "fillDefault")).toBe(true);
  });

  it("…and with explicit `include` pins the SAME overflow upgrades, still slot-neutral", () => {
    // The non-vacuous half: grant permission and `fill` genuinely works inside
    // the overflow. This is the input A4-R2 ratified the bound for.
    const state = stateOf({
      loadout: [
        { badgeId: "deadeye", purchasedLevel: "bronze" },
        { badgeId: "static-middy", purchasedLevel: "bronze" },
      ],
      budgets: budgets(40, 1),
    });
    const report = rollCategory(
      requestOf({
        state,
        pins: { deadeye: "include", "static-middy": "include" },
        seed: "fillcap",
        mode: "fill",
      }),
      "Shooting",
      dataset,
    );
    expect(report.outcome).toBe("rolled");
    expect(report.steps.length).toBeGreaterThan(0);
    expect(report.steps.every((step) => !step.requiresNewBadgeSlot)).toBe(true);
    // INV-22 in the overflow: the roll never makes a disclosed violation worse.
    expect(report.after.equipSlotsUsed).toBeLessThanOrEqual(
      report.before.equipSlotsUsed,
    );
    expect(exchangesIn(report.steps)).toEqual([]);
  });


  it("no eligible badge at all declines as noEligibleBadges", () => {
    // A 5'9" build cannot reach the 78–78 fixture, and it is the only badge.
    const isolated = datasetOf(fixture("synthetic-height-boundary"));
    const report = rollCategory(
      requestOf({
        state: stateOf({ budgets: budgets(40, 4) }),
        build: makeBuild(69, 99),
        seed: "none",
      }),
      "Defense",
      isolated,
    );
    expect(report.decline).toEqual({ kind: "noEligibleBadges" });
  });

  it("nothing AFFORDABLE is outcome `noLegalStep` — a FACT, not a failure, and not a decline", () => {
    const report = rollCategory(
      requestOf({ state: stateOf({ budgets: budgets(0, 4) }), seed: "broke" }),
      "Shooting",
      dataset,
    );
    expect(report.outcome).toBe("noLegalStep");
    expect(report.decline).toBeNull();
    expect(report.steps).toEqual([]);
  });

  it("INV-13 — for EVERY declined category the entries are byte-identical to the input", { timeout: 20000 }, () => {
    const state = stateOf({
      loadout,
      budgets: {
        ...budgets(3, 4),
        Rebounding: { equipSlots: 0, points: 10 },
        Physicals: { equipSlots: 0, points: 10 },
      },
    });
    for (let seed = 0; seed < 60; seed += 1) {
      for (const mode of ["fill", "reroll"] as const) {
        const result = rollBuild(requestOf({ state, seed: `noop-${seed}`, mode }), dataset);
        const declined = result.categories.filter((report) => report.outcome === "declined");
        expect(declined.length).toBeGreaterThan(0);
        for (const report of declined) {
          expect(report.steps).toEqual([]);
          expect(report.cleared).toEqual([]);
          expect(report.after).toEqual(report.before);
        }
        // Shooting is declined (overspent) — both its entries survive untouched.
        expect(
          result.proposedLoadout.filter((entry) =>
            loadout.some((original) => original.badgeId === entry.badgeId),
          ),
        ).toEqual(loadout);
      }
    }
  });

  it("one report per category in scope, ALWAYS — silence is never an outcome", () => {
    const result = rollBuild(requestOf({ seed: "coverage" }), dataset);
    expect(result.categories.map((report) => report.category)).toEqual([...CATEGORIES]);
    const scoped = rollBuild(requestOf({ seed: "coverage", categories: ["Defense"] }), dataset);
    expect(scoped.categories.map((report) => report.category)).toEqual(["Defense"]);
  });

  it("`changed` is false exactly when the proposal deep-equals the input", () => {
    const broke = rollBuild(
      requestOf({ state: stateOf({ budgets: budgets(0, 4) }), seed: "nochange" }),
      dataset,
    );
    expect(broke.changed).toBe(false);
    expect(broke.proposedLoadout).toEqual([]);
    expect(rollBuild(requestOf({ seed: "yeschange" }), dataset).changed).toBe(true);
  });
});

describe("INV-17 — termination is bounded by the LATTICE, not by the budget", () => {
  it("the two-move bound 4 x max(entries, capacity) + 1 survives as the ceilingSpend-0 case", () => {
    // A4-R2 RATIFIED this form and E3 EXTENDS it; it does not replace it. With
    // nothing left to absorb, the extended formula collapses to it exactly.
    expect(rollIterationBound(0, 3, 0)).toBe(13);
    expect(rollIterationBound(3, 3, 0)).toBe(13);
    // THE CASE THE BRIEF'S 4*equipSlots WOULD HAVE THROWN ON: five entries
    // against a capacity of one is legal input that `fill` may roll into, and
    // it admits up to fifteen upgrade steps against a bound of five.
    expect(rollIterationBound(5, 1, 0)).toBe(21);
    expect(4 * 1 + 1).toBeLessThan(3 * 5);
  });

  it("the third argument is REQUIRED, and it is the exchange move's term", () => {
    // Each exchange raises net spend by >= 1 and hands an entry's level index
    // back by at most 3, so `ceilingSpend` enters with the same weight of 4.
    expect(rollIterationBound(0, 3, 11)).toBe(4 * (3 + 11) + 1);
    expect(rollIterationBound(5, 1, 2)).toBe(4 * (5 + 2) + 1);
    // A LATTICE bound, not a budget one: a fat-fingered pool cannot inflate it
    // past what the category could actually absorb, because ceilingSpend is
    // min(points, legalCeiling) and the caller passes the capped value.
    expect(rollIterationBound(0, 3, 6)).toBeLessThan(
      rollIterationBound(0, 3, 999),
    );
  });

  it("AJ-11 REGRESSION: 5 entries against capacity 1 in `fill` completes and does not throw", () => {
    // THE EXACT INPUT THE BRIEF'S `4 * equipSlots + 1` WOULD HAVE THROWN ON.
    // Five entries in one category against a capacity of one is legal input —
    // AJ-11 explicitly permits `fill` to roll into a pre-existing Badge Slots
    // overflow — and it admits fifteen upgrade steps against a bound of five.
    // Pinned so the tightening cannot come back.
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "bronze" },
      { badgeId: "quick-trigger", purchasedLevel: "bronze" },
      { badgeId: "smooth-operator", purchasedLevel: "bronze" },
      { badgeId: "limitless-range", purchasedLevel: "bronze" },
    ];
    const pins = Object.fromEntries(
      loadout.map((entry) => [entry.badgeId, "include" as PinMode]),
    );
    const state = stateOf({ loadout, budgets: budgets(60, 1) });
    // Both arms: permission granted (fifteen upgrades live) and withheld.
    for (const activePins of [pins, {}]) {
      const report = rollCategory(
        requestOf({
          state,
          build: makeBuild(78, 99),
          pins: activePins,
          seed: "aj11",
          mode: "fill",
        }),
        "Shooting",
        dataset,
      );
      expect(report.outcome).not.toBe("declined");
      expect(report.after.equipSlotsUsed).toBe(5);
    }
    // …and the bound really is the loose one, not the form that would throw.
    expect(rollIterationBound(5, 1, 0)).toBeGreaterThanOrEqual(3 * 5);
    expect(4 * 1 + 1).toBeLessThan(3 * 5);
  });

  it("a ZERO-NET-COST fixture under hofOrAbove terminates — a budget bound would not", () => {
    // Under hofOrAbove, buying straight to HOF is NET-FREE (gross paid, full
    // amount refunded), so a pool of 0 still admits purchases. Reachable on a
    // shipped config value, not hypothetically.
    const isolated = datasetOf(fixture("synthetic-free-at-hof"));
    const report = rollCategory(
      requestOf({
        state: stateOf({ budgets: budgets(0, 3), refundTrigger: "hofOrAbove" }),
        build: makeBuild(78, 99),
        seed: "free",
      }),
      "Defense",
      isolated,
    );
    expect(report.outcome).toBe("rolled");
    expect(report.steps.some((step) => step.netCost === 0)).toBe(true);
    expect(report.after.remainingPoints).toBeGreaterThanOrEqual(0);
  });

  it("many zero-net-cost candidates still terminate, bounded by Badge Slots", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const report = rollCategory(
        requestOf({
          state: stateOf({ budgets: budgets(0, 3), refundTrigger: "hofOrAbove" }),
          build: makeBuild(78, 99),
          seed: `freemany-${seed}`,
        }),
        "Defense",
        dataset,
      );
      expect(report.after.equipSlotsUsed).toBeLessThanOrEqual(3);
      expect(report.steps.length).toBeLessThanOrEqual(rollIterationBound(0, 3, 0));
    }
  });

  it("exhausting the guard THROWS RollDidNotTerminateError rather than looping or truncating", () => {
    // Driven through the test-only bound override, because a CORRECT
    // implementation cannot reach the real bound — which is exactly why the
    // guard exists (H6: fail loudly, never silently).
    expect(() =>
      rollCategory(
        requestOf({ state: stateOf({ budgets: budgets(40, 6) }), seed: "guard" }),
        "Shooting",
        dataset,
        { iterationBound: 1 },
      ),
    ).toThrowError(RollDidNotTerminateError);
  });
});

describe("INV-18 — scope compositionality", () => {
  it("rollCategory(X, C, S) is exactly rollBuild(X, all, S).categories[C]", { timeout: 20000 }, () => {
    for (let seed = 0; seed < 40; seed += 1) {
      for (const mode of ["fill", "reroll"] as const) {
        const request = requestOf({
          state: stateOf({
            loadout: [
              { badgeId: "deadeye", purchasedLevel: "bronze" },
              { badgeId: "posterizer", purchasedLevel: "bronze" },
            ],
            budgets: budgets(20, 4),
          }),
          seed: `compose-${seed}`,
          mode,
        });
        const whole = rollBuild(request, dataset);
        for (const category of CATEGORIES) {
          const { proposedEntries: _entries, ...single } = rollCategory(request, category, dataset);
          const fromWhole = whole.categories.find((report) => report.category === category);
          expect(single, `${category} diverged between rollCategory and rollBuild`).toEqual(
            fromWhole,
          );
        }
      }
    }
  });

  it("a single-category roll leaves every other category byte-identical", () => {
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "posterizer", purchasedLevel: "gold" },
    ];
    const request = requestOf({
      state: stateOf({ loadout, budgets: budgets(20, 4) }),
      categories: ["Shooting"],
      seed: "scoped",
    });
    const result = rollBuild(request, dataset);
    expect(result.proposedLoadout.find((entry) => entry.badgeId === "posterizer")).toEqual({
      badgeId: "posterizer",
      purchasedLevel: "gold",
    });
  });
});

describe("F8-E3 FIRST PROOF — the worked case that triggered the E2 escalation", () => {
  it(
    "capacity 3, pool 16, Finishing at attrs 72: within 2 points of the achievable optimum, over 50 seeds",
    { timeout: 20000 },
    () => {
      const state = stateOf({ budgets: budgets(16, 3) });
      const build = makeBuild(78, 72);
      const optimal = optimalAddedSpend(state, build, "Finishing", dataset);
      const misses: string[] = [];
      for (let seed = 0; seed < 50; seed += 1) {
        const report = rollCategory(
          requestOf({ state, build, seed: `worked-${seed}` }),
          "Finishing",
          dataset,
        );
        const spend = grossSpendOf(
          report.proposedEntries,
          "Finishing",
          dataset,
        );
        if (optimal - spend > 2)
          misses.push(
            `seed ${seed}: spent ${spend} of an achievable ${optimal}`,
          );
      }
      expect(
        misses,
        `${misses.length}/50 seeds left more than 2 points on the table :: ${misses.slice(0, 5).join(" | ")}`,
      ).toEqual([]);
    },
  );
});

/* ========================================================== F8-E3 sweep === */

/**
 * THE SHARED SWEEP behind INV-14 and INV-20. Run once, read three ways.
 *
 * TWO FAMILIES, REPORTED SEPARATELY. F8-E2's 200 fixtures were all
 * `makeBuild(78, attrs)` — twenty equal attributes at one height — and a
 * distribution measured only there speaks for builds nobody makes. The second
 * family carries per-attribute spreads across seven heights.
 *
 * NEITHER FAMILY CARRIES PINS, EXCLUSIONS OR A STARTING LOADOUT, and that is a
 * PRECONDITION rather than an accident: `optimalAddedSpend` solves the
 * unconstrained problem, so a fixture that gained a pin would leave the oracle
 * solving a DIFFERENT problem and every gap below would be contaminated. The
 * precondition is asserted, not trusted.
 */
interface Sample {
  family: SweepFixture["family"];
  index: number;
  seed: string;
  category: Category;
  points: number;
  equipSlots: number;
  optimal: number;
  spend: number;
  gap: number;
  capacityBound: boolean;
  exchanges: number;
  iterations: number;
  /** Capacity-free only: is the result byte-identical to the two-move walk? */
  matchesTwoMoveWalk: boolean | null;
}

function runSweep(): Sample[] {
  const samples: Sample[] = [];
  for (const fixtureSpec of [
    ...equalAttributeFamily(),
    ...spreadAttributeFamily(),
  ]) {
    const { index, family, points, equipSlots, category, build } = fixtureSpec;
    const state = stateOf({ budgets: budgets(points, equipSlots) });
    const optimal = optimalAddedSpend(state, build, category, dataset);
    for (let seed = 0; seed < 5; seed += 1) {
      const seedString = `oracle-${family}-${index}-${seed}`;
      const report = rollCategory(
        requestOf({ state, build, seed: seedString }),
        category,
        dataset,
      );
      if (report.outcome === "declined") continue;
      const spend = grossSpendOf(report.proposedEntries, category, dataset);
      const capacityBound = report.after.equipSlotsUsed >= equipSlots;
      samples.push({
        family,
        index,
        seed: seedString,
        category,
        points,
        equipSlots,
        optimal,
        spend,
        gap: optimal - spend,
        capacityBound,
        exchanges: exchangesIn(report.steps).length,
        // The walk runs one extra iteration to see the empty candidate set.
        iterations: report.steps.length + 1,
        matchesTwoMoveWalk: capacityBound
          ? null
          : JSON.stringify(report.proposedEntries) ===
            JSON.stringify(
              twoMoveWalk(seedString, state, build, category, dataset),
            ),
      });
    }
  }
  return samples;
}

const sweepSamples = runSweep();

function quantile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * fraction)] as number;
}

interface Stats {
  n: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  exactShare: number;
}

function statsOf(subset: Sample[]): Stats {
  const gaps = subset.map((sample) => sample.gap);
  return {
    n: subset.length,
    median: gaps.length === 0 ? 0 : quantile(gaps, 0.5),
    p90: gaps.length === 0 ? 0 : quantile(gaps, 0.9),
    p95: gaps.length === 0 ? 0 : quantile(gaps, 0.95),
    max: gaps.length === 0 ? 0 : Math.max(...gaps),
    exactShare:
      gaps.length === 0
        ? 1
        : gaps.filter((gap) => gap === 0).length / gaps.length,
  };
}

const bySlice = (
  family: SweepFixture["family"] | "both",
  regime: "bound" | "free" | "all",
) =>
  sweepSamples.filter(
    (sample) =>
      (family === "both" || sample.family === family) &&
      (regime === "all" ||
        (regime === "bound" ? sample.capacityBound : !sample.capacityBound)),
  );

const worstFive = () =>
  [...sweepSamples]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5)
    .map(
      (sample) =>
        `${sample.family}#${sample.index} ${sample.category} pool ${sample.points} ` +
        `slots ${sample.equipSlots} seed ${sample.seed}: spent ${sample.spend} of ` +
        `${sample.optimal} (gap ${sample.gap})`,
    );

describe("INV-14 — the unspent gap against the exact-DP oracle, over TWO fixture families", () => {
  /**
   * THE E2 ESCALATION IS RULED AND CLOSED. scope.md §0.1 A4 ruled it 2026-08-26:
   * ENLARGE THE MOVE SET, DO NOT ADD A PREFERENCE. E2 measured capacity-bound
   * median 1 / p95 4, with a case at capacity 3 / pool 16 / Finishing that spent
   * 5 of an achievable 11 and was MAXIMAL — no badge it had bought qualified at
   * any higher level. The enumerator was never wrong; a Badge Slot commitment
   * was IRREVERSIBLE, and F8-E3's exchange move makes it reversible without any
   * comparator, argmax or weight entering the file.
   *
   * A headroom "fair-share" admission filter was the other candidate and it was
   * MEASURED AND REJECTED: it only reached median 0 / p95 3, it has cliff
   * behaviour exactly where the worst fixtures live, and it costs a real
   * weakening of the equiprobability claim for a partial gain.
   *
   * The thresholds below are the ruled ones. There is no pending adjudication
   * and nothing here is provisional. A miss is a STOP-AND-REPORT with the five
   * worst fixtures — never a relaxed number, and never a preference, a weight
   * or a tie-break reached for to close the remainder.
   */
  it("the sweep's shape, and the ORACLE PRECONDITION that makes its numbers mean anything", () => {
    const fixtures = [...equalAttributeFamily(), ...spreadAttributeFamily()];
    expect(
      fixtures.filter((one) => one.family === "equal-attributes").length,
    ).toBe(200);
    expect(
      fixtures.filter((one) => one.family === "spread-attributes").length,
    ).toBeGreaterThanOrEqual(200);
    // The second family is genuinely a different slice of the input space.
    const heights = new Set(fixtures.map((one) => one.build.heightInches));
    expect(heights.size).toBe(7);
    const spread = fixtures.find(
      (one) => one.family === "spread-attributes",
    ) as SweepFixture;
    expect(
      new Set(Object.values(spread.build.attributes)).size,
    ).toBeGreaterThan(1);

    // THE PRECONDITION. `optimalAddedSpend` passes pinnedBadgeIds: NONE and
    // excludedBadgeIds: NONE, which is the SAME problem the roll solves only
    // while no fixture carries pins, exclusions or a starting loadout.
    const request = requestOf({ state: stateOf({ budgets: budgets(16, 3) }) });
    expect(request.pins).toEqual({});
    expect(request.excludedBadgeIds).toEqual([]);
    expect(request.state.loadout).toEqual([]);

    expect(bySlice("both", "all").length).toBeGreaterThan(1500);
    expect(bySlice("both", "bound").length).toBeGreaterThan(200);
    expect(bySlice("both", "free").length).toBeGreaterThan(200);
  });

  it("the oracle is a true UPPER bound — no gap is ever negative, in EITHER family", () => {
    // A negative gap would mean the roller beat the exact optimum, i.e. the
    // oracle is wrong and every number in this file is meaningless.
    for (const family of ["equal-attributes", "spread-attributes"] as const) {
      const gaps = bySlice(family, "all").map((sample) => sample.gap);
      expect(
        Math.min(...gaps),
        `${family} produced a negative gap`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("CAPACITY BOUND: median 0, p95 <= 1, max <= 2 — the regime E3 exists for", () => {
    for (const family of ["equal-attributes", "spread-attributes"] as const) {
      const stats = statsOf(bySlice(family, "bound"));
      const label = `${family} bound n=${stats.n} median ${stats.median} p95 ${stats.p95} max ${stats.max}`;
      expect(stats.median, label).toBe(0);
      expect(stats.p95, label).toBeLessThanOrEqual(1);
      expect(stats.max, label).toBeLessThanOrEqual(2);
    }
  });

  it("CAPACITY FREE: median 0, p95 <= 1, max <= 2 — must not regress", () => {
    for (const family of ["equal-attributes", "spread-attributes"] as const) {
      const stats = statsOf(bySlice(family, "free"));
      const label = `${family} free n=${stats.n} median ${stats.median} p95 ${stats.p95} max ${stats.max}`;
      expect(stats.median, label).toBe(0);
      expect(stats.p95, label).toBeLessThanOrEqual(1);
      expect(stats.max, label).toBeLessThanOrEqual(2);
    }
  });

  it("THE HARD CAP: no single roll in either family is more than 2 points short", () => {
    // "Spend the pool as fully as it can", made mechanical. A distributional
    // gate alone would let the 11-points-unspent tail survive as a statistic,
    // which is the whole reason this gate is per-roll and not per-quantile.
    const over = sweepSamples.filter((sample) => sample.gap > 2);
    expect(
      over.length,
      `${over.length} rolls over the cap :: ${worstFive().join(" | ")}`,
    ).toBe(0);
  });

  it("exactly-optimal on at least 90% of rolls overall — the gap is a thin tail", () => {
    const share = statsOf(bySlice("both", "all")).exactShare;
    expect(
      share,
      `exactly-optimal share ${share.toFixed(4)}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("prints the full table, both families, split by regime", () => {
    const rows: string[] = [];
    for (const family of [
      "equal-attributes",
      "spread-attributes",
      "both",
    ] as const) {
      for (const regime of ["bound", "free", "all"] as const) {
        const stats = statsOf(bySlice(family, regime));
        rows.push(
          `${family.padEnd(18)} ${regime.padEnd(6)} n=${String(stats.n).padStart(5)} ` +
            `median ${stats.median} p90 ${stats.p90} p95 ${stats.p95} max ${stats.max} ` +
            `exact ${(stats.exactShare * 100).toFixed(1)}%`,
        );
      }
    }
    const iterations = Math.max(
      ...sweepSamples.map((sample) => sample.iterations),
    );
    const exchanges = sweepSamples.reduce(
      (total, sample) => total + sample.exchanges,
      0,
    );
    rows.push(
      `max iterations observed ${iterations}, exchanges applied ${exchanges}`,
    );
    rows.push(`five worst :: ${worstFive().join(" | ")}`);
    // eslint-disable-next-line no-console
    console.log(["INV-14 TABLE", ...rows].join("\n"));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("the walk stays far inside its termination guard", () => {
    const iterations = Math.max(
      ...sweepSamples.map((sample) => sample.iterations),
    );
    expect(iterations, `max iterations observed ${iterations}`).toBeLessThan(
      40,
    );
  });
});

/**
 * Six capacity-free fixtures, pinned byte-for-byte. Generated FROM THIS
 * IMPLEMENTATION at ROLL_ALGORITHM_VERSION 2 and labelled as such — see the
 * golden test below for why an E2-era golden cannot exist at version 2.
 */
const CAPACITY_FREE_GOLDEN: {
  seed: string;
  category: Category;
  points: number;
  equipSlots: number;
  attrs: number;
  entries: LoadoutEntry[];
}[] = [
  {
    seed: "golden-1",
    category: "Shooting",
    points: 4,
    equipSlots: 6,
    attrs: 70,
    entries: [
      { badgeId: "synthetic-and-mid-null-gap", purchasedLevel: "bronze" },
      { badgeId: "set-and-fire", purchasedLevel: "bronze" },
    ],
  },
  {
    seed: "golden-2",
    category: "Finishing",
    points: 5,
    equipSlots: 6,
    attrs: 68,
    entries: [
      { badgeId: "paint-prodigy", purchasedLevel: "bronze" },
      { badgeId: "physical-finisher", purchasedLevel: "bronze" },
      { badgeId: "hook-specialist", purchasedLevel: "bronze" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    ],
  },
  {
    seed: "golden-3",
    category: "Playmaking",
    points: 6,
    equipSlots: 6,
    attrs: 72,
    entries: [
      { badgeId: "pace", purchasedLevel: "bronze" },
      { badgeId: "handles-for-days", purchasedLevel: "bronze" },
      { badgeId: "versatile-visionary", purchasedLevel: "bronze" },
    ],
  },
  {
    seed: "golden-4",
    category: "Rebounding",
    points: 4,
    equipSlots: 5,
    attrs: 75,
    entries: [{ badgeId: "synthetic-twin-a", purchasedLevel: "silver" }],
  },
  {
    seed: "golden-5",
    category: "Defense",
    points: 5,
    equipSlots: 6,
    attrs: 66,
    entries: [
      { badgeId: "post-lockdown", purchasedLevel: "bronze" },
      { badgeId: "ankle-braces", purchasedLevel: "bronze" },
      { badgeId: "off-ball-pest", purchasedLevel: "bronze" },
    ],
  },
  {
    seed: "golden-6",
    category: "Physicals",
    points: 6,
    equipSlots: 6,
    attrs: 71,
    entries: [
      { badgeId: "synthetic-dear-bronze-only", purchasedLevel: "bronze" },
      { badgeId: "slippery-off-ball", purchasedLevel: "bronze" },
      { badgeId: "pogo-stick", purchasedLevel: "bronze" },
    ],
  },
];

describe("INV-20 — CAPACITY-FREE INERTNESS: the theorem, not a measurement", () => {
  /**
   * No move ever DECREASES the entry count, and exchanges are offered only at
   * `equipSlotsUsed >= equipSlots`. So a walk that ENDS below capacity was below
   * capacity at every iteration, was never offered an exchange, and is the
   * two-move walk verbatim. That is a proof; the tests below are the mechanical
   * check that the code implements the proof.
   */
  it("ZERO exchange steps in 100% of capacity-free rolls, over the full sweep", () => {
    const offenders = bySlice("both", "free").filter(
      (sample) => sample.exchanges > 0,
    );
    expect(
      offenders.length,
      `${offenders.length} capacity-free rolls saw an exchange :: ${offenders
        .slice(0, 5)
        .map((sample) => sample.seed)
        .join(", ")}`,
    ).toBe(0);
  });

  it("every capacity-free roll is BYTE-IDENTICAL to the two-move walk at the same seed", () => {
    const free = bySlice("both", "free");
    const diverged = free.filter(
      (sample) => sample.matchesTwoMoveWalk !== true,
    );
    expect(
      `${free.length - diverged.length}/${free.length} identical`,
      diverged
        .slice(0, 5)
        .map((sample) => sample.seed)
        .join(", "),
    ).toBe(`${free.length}/${free.length} identical`);
  });

  it("GOLDEN: six capacity-free fixtures, pinned byte-for-byte", () => {
    // Checked in from THIS implementation, and labelled as such. Goldens copied
    // from the E2 run cannot be used: ROLL_ALGORITHM_VERSION rides in the
    // per-category RNG seed string precisely so a version bump changes the
    // stream, so literal E2 output cannot match at version 2 BY CONSTRUCTION —
    // that is the mechanism working. The theorem is carried by the differential
    // test above; this golden is the regression pin.
    expect(ROLL_ALGORITHM_VERSION).toBe(2);
    const golden = CAPACITY_FREE_GOLDEN;
    for (const row of golden) {
      const state = stateOf({ budgets: budgets(row.points, row.equipSlots) });
      const report = rollCategory(
        requestOf({ state, build: makeBuild(78, row.attrs), seed: row.seed }),
        row.category,
        dataset,
      );
      expect(
        report.after.equipSlotsUsed,
        `${row.seed} is not capacity-free`,
      ).toBeLessThan(row.equipSlots);
      expect(exchangesIn(report.steps)).toEqual([]);
      expect(report.proposedEntries, row.seed).toEqual(row.entries);
    }
  });
});

describe("INV-21 — an exchange NEVER drops a pin and NEVER touches a user entry", () => {
  it("over the sweep, every outBadgeId was created by an EARLIER step of the same walk", () => {
    // Asserted directly rather than inferred from INV-5 passing.
    let checked = 0;
    for (const fixtureSpec of spreadAttributeFamily(120)) {
      const state = stateOf({
        budgets: budgets(fixtureSpec.points, fixtureSpec.equipSlots),
      });
      for (let seed = 0; seed < 3; seed += 1) {
        const report = rollCategory(
          requestOf({
            state,
            build: fixtureSpec.build,
            seed: `inv21-${fixtureSpec.index}-${seed}`,
          }),
          fixtureSpec.category,
          dataset,
        );
        const created = new Set<string>();
        for (const step of report.steps) {
          if (isExchangeStep(step)) {
            expect(
              created.has(step.outBadgeId),
              `${step.outBadgeId} was exchanged out without this walk having created it`,
            ).toBe(true);
            created.delete(step.outBadgeId);
            created.add(step.badgeId);
            checked += 1;
          } else if (step.fromLevel === null) {
            created.add(step.badgeId);
          }
        }
      }
    }
    expect(
      checked,
      "no exchange fired at all — the assertion above proved nothing",
    ).toBeGreaterThan(50);
  });

  it(
    "with pins, exclusions, a synergy role and a stale entry all live, none is EVER exchanged out",
    { timeout: 20000 },
    () => {
      const loadout: LoadoutEntry[] = [
        { badgeId: "deadeye", purchasedLevel: "hof" }, // synergy-role holder
        { badgeId: "static-middy", purchasedLevel: "bronze" }, // user-pinned
        { badgeId: "limitless-range", purchasedLevel: "hof" }, // stale at attrs 72
      ];
      const synergySlots: SynergySlot[] = createDefaultSynergySlots().map(
        (synergySlot) =>
          synergySlot.id === 5
            ? { ...synergySlot, unlocked: true, fuseBadgeId: "deadeye" }
            : synergySlot,
      );
      const build = makeBuild(78, 72);
      const state = stateOf({ loadout, synergySlots, budgets: budgets(40, 6) });
      const protectedIds = new Set(loadout.map((entry) => entry.badgeId));

      // The protections really are live, or the assertion below proves nothing.
      expect(synergyRoleFor(synergySlots, "deadeye")).not.toBeNull();
      expect(
        entryIsStale(
          badgeById(dataset, "limitless-range") as NonNullable<
            ReturnType<typeof badgeById>
          >,
          build,
          "hof",
        ),
      ).toBe(true);

      let exchanges = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        for (const mode of ["fill", "reroll"] as const) {
          const report = rollCategory(
            requestOf({
              state,
              build,
              pins: { "static-middy": "exact" },
              excludedBadgeIds: ["quick-trigger"],
              seed: `inv21g-${seed}`,
              mode,
            }),
            "Shooting",
            dataset,
          );
          for (const step of exchangesIn(report.steps)) {
            exchanges += 1;
            expect(
              protectedIds.has(step.outBadgeId),
              `${step.outBadgeId} — a badge the USER placed — was exchanged out`,
            ).toBe(false);
            expect(step.outBadgeId).not.toBe("quick-trigger");
            expect(step.badgeId).not.toBe("quick-trigger");
          }
          // …and every protected entry is still there afterwards.
          for (const original of loadout) {
            expect(
              report.proposedEntries.some(
                (entry) => entry.badgeId === original.badgeId,
              ),
              `${original.badgeId} vanished in ${mode}`,
            ).toBe(true);
          }
        }
      }
      expect(
        exchanges,
        "no exchange fired — the guarded fixture proved nothing",
      ).toBeGreaterThan(0);
    },
  );
});

describe("INV-22 — an exchange is slot-neutral and overflow-safe", () => {
  it("every exchange the sweep applied is structurally slot-free", () => {
    const fired = sweepSamples.reduce(
      (total, sample) => total + sample.exchanges,
      0,
    );
    expect(fired, "no exchange fired anywhere in the sweep").toBeGreaterThan(
      100,
    );
    for (const fixtureSpec of equalAttributeFamily(60)) {
      const state = stateOf({
        budgets: budgets(fixtureSpec.points, fixtureSpec.equipSlots),
      });
      const report = rollCategory(
        requestOf({
          state,
          build: fixtureSpec.build,
          seed: `inv22-${fixtureSpec.index}`,
        }),
        fixtureSpec.category,
        dataset,
      );
      for (const step of exchangesIn(report.steps)) {
        expect(step.requiresNewBadgeSlot).toBe(false);
      }
      // One out, one in: the entry count can only ever be moved by an `add`.
      const adds = report.steps.filter(
        (step) => !isExchangeStep(step) && step.fromLevel === null,
      ).length;
      expect(report.after.equipSlotsUsed - report.before.equipSlotsUsed).toBe(
        adds,
      );
    }
  });

  it("applying exchanges leaves equipSlotsUsed exactly where it was", () => {
    const isolated = datasetOf(
      fixture("synthetic-cheap-bronze-only"),
      fixture("synthetic-exchange-plus-one"),
      fixture("synthetic-exchange-plus-four"),
    );
    let saw = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const report = rollCategory(
        requestOf({
          state: stateOf({ budgets: budgets(5, 1) }),
          build: makeBuild(78, 90),
          seed: `inv22n-${seed}`,
        }),
        "Physicals",
        isolated,
      );
      if (exchangesIn(report.steps).length === 0) continue;
      saw += 1;
      expect(report.after.equipSlotsUsed).toBe(1);
      expect(report.proposedEntries.length).toBe(1);
    }
    expect(saw).toBeGreaterThan(0);
  });

  it("a PRE-EXISTING overflow is never made worse: `fill`, 5 entries against capacity 1", () => {
    const loadout: LoadoutEntry[] = [
      { badgeId: "deadeye", purchasedLevel: "bronze" },
      { badgeId: "static-middy", purchasedLevel: "bronze" },
      { badgeId: "quick-trigger", purchasedLevel: "bronze" },
      { badgeId: "smooth-operator", purchasedLevel: "bronze" },
      { badgeId: "limitless-range", purchasedLevel: "bronze" },
    ];
    const pins = Object.fromEntries(
      loadout.map((entry) => [entry.badgeId, "include" as PinMode]),
    );
    for (let seed = 0; seed < 60; seed += 1) {
      const report = rollCategory(
        requestOf({
          state: stateOf({ loadout, budgets: budgets(60, 1) }),
          build: makeBuild(78, 99),
          pins,
          seed: `overflow-${seed}`,
          mode: "fill",
        }),
        "Shooting",
        dataset,
      );
      const overflowBefore =
        report.before.equipSlotsUsed - report.equipSlotCapacity;
      const overflowAfter =
        report.after.equipSlotsUsed - report.equipSlotCapacity;
      expect(overflowAfter).toBeLessThanOrEqual(overflowBefore);
      // The walk created nothing, so it has nothing it is allowed to trade —
      // INV-5 by construction, visible in the one state where it matters most.
      expect(exchangesIn(report.steps)).toEqual([]);
    }
  });
});

describe("INV-23 — an exchange is NOT a cost preference, of either sign", () => {
  /**
   * The fixture is built so the measurement cannot be anything else. Physicals,
   * capacity 1, pool 5, exactly three badges each legal at exactly one level:
   * the C-tier Bronze `cheap` at 1, a B-tier Bronze at 2, and a C-tier HOF at 5.
   *
   * A walk that opens on `cheap` is instantly at capacity with 4 points left and
   * EXACTLY TWO admissible exchanges: +1 and +4. Four-fold difference in delta,
   * one uniform draw, nothing else in the fixture able to skew it. Any weighting
   * by delta — "spend more where you can", or "churn less" — fails this.
   */
  it(
    "a +1 and a +4 exchange are drawn at parity, within +/-1.5%",
    { timeout: 20000 },
    () => {
      const isolated = datasetOf(
        fixture("synthetic-cheap-bronze-only"),
        fixture("synthetic-exchange-plus-one"),
        fixture("synthetic-exchange-plus-four"),
      );
      const seeds = 40000;
      let plusOne = 0;
      let plusFour = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        const report = rollCategory(
          requestOf({
            state: stateOf({ budgets: budgets(5, 1) }),
            build: makeBuild(78, 90),
            seed: `inv23-${seed}`,
          }),
          "Physicals",
          isolated,
        );
        const first = report.steps[0];
        const second = report.steps[1];
        if (first === undefined || second === undefined) continue;
        if (
          isExchangeStep(first) ||
          first.badgeId !== "synthetic-cheap-bronze-only"
        )
          continue;
        if (!isExchangeStep(second)) continue;
        // The candidate set at this point is EXACTLY these two.
        expect(second.outBadgeId).toBe("synthetic-cheap-bronze-only");
        if (second.badgeId === "synthetic-exchange-plus-one") {
          expect(second.netCost).toBe(1);
          plusOne += 1;
        } else {
          expect(second.badgeId).toBe("synthetic-exchange-plus-four");
          expect(second.netCost).toBe(4);
          plusFour += 1;
        }
      }
      const observations = plusOne + plusFour;
      const share = plusOne / observations;
      const label =
        `n=${observations} of ${seeds} seeds — delta+1 ${plusOne} (${(share * 100).toFixed(2)}%), ` +
        `delta+4 ${plusFour}`;
      // eslint-disable-next-line no-console
      console.log(`INV-23 ${label}`);
      expect(observations, label).toBeGreaterThan(10000);
      // Parity relative to the candidate-set size: two candidates, so 1/2 each.
      expect(share, label).toBeGreaterThan(0.5 - 0.015);
      expect(share, label).toBeLessThan(0.5 + 0.015);
    },
  );
});

describe("INV-24 — INV-8's equivariance survives the third move kind", () => {
  const twinA = fixture("synthetic-twin-a");
  const twinB = fixture("synthetic-twin-b");
  // Capacity 1 with a pool of 6 puts the walk at capacity after ONE add and
  // leaves every higher level of the OTHER twin affordable as an exchange, so
  // exchanges genuinely fire here — which is the whole point of re-running
  // INV-8 on this fixture rather than on E2's capacity-free one.
  const bound = () => stateOf({ budgets: budgets(6, 1), loadout: [] });

  it("exchanges actually fire on this fixture, or (a) and (b) below prove nothing", () => {
    let exchanges = 0;
    for (let seed = 0; seed < 60; seed += 1) {
      const report = rollCategory(
        requestOf({ state: bound(), seed: `inv24-${seed}` }),
        "Rebounding",
        datasetOf(twinA, twinB),
      );
      exchanges += exchangesIn(report.steps).length;
    }
    expect(exchanges).toBeGreaterThan(0);
  });

  it("(a) RELABEL, capacity-bound: renaming a badge changes nothing but the label", () => {
    const renamedA: RawBadge = {
      ...twinA,
      id: "synthetic-twin-a-renamed",
      name: "Totally Different",
    };
    for (let seed = 0; seed < 60; seed += 1) {
      const original = rollBuild(
        requestOf({
          state: bound(),
          categories: ["Rebounding"],
          seed: `inv24a-${seed}`,
        }),
        datasetOf(twinA, twinB),
      );
      const relabelled = rollBuild(
        requestOf({
          state: bound(),
          categories: ["Rebounding"],
          seed: `inv24a-${seed}`,
        }),
        datasetOf(renamedA, twinB),
      );
      const substitute = (id: string) => (id === twinA.id ? renamedA.id : id);
      expect(relabelled.proposedLoadout).toEqual(
        original.proposedLoadout.map((entry) => ({
          ...entry,
          badgeId: substitute(entry.badgeId),
        })),
      );
    }
  });

  it("(b) SWAP, capacity-bound: swapping two indistinguishable badges mirrors the result", () => {
    const sawBoth = new Set<string>();
    for (let seed = 0; seed < 60; seed += 1) {
      const straight = rollBuild(
        requestOf({
          state: bound(),
          categories: ["Rebounding"],
          seed: `inv24b-${seed}`,
        }),
        datasetOf(twinA, twinB),
      );
      const swapped = rollBuild(
        requestOf({
          state: bound(),
          categories: ["Rebounding"],
          seed: `inv24b-${seed}`,
        }),
        datasetOf(twinB, twinA),
      );
      const mirror = (id: string) => (id === twinA.id ? twinB.id : twinA.id);
      expect(swapped.proposedLoadout.map((entry) => entry.badgeId)).toEqual(
        straight.proposedLoadout.map((entry) => mirror(entry.badgeId)),
      );
      for (const entry of straight.proposedLoadout) sawBoth.add(entry.badgeId);
    }
    expect(sawBoth.size).toBe(2);
  });
});

describe("the adversarial fixture, disclosed — a KNOWN capacity-free limit of randomized greedy", () => {
  /**
   * H8's habit applied to a measurement: DISCLOSE, DO NOT REPAIR.
   *
   * INV-23's `synthetic-exchange-plus-four` is legal ONLY at HOF — a shape no
   * shipped badge has — and it exists to make a four-fold delta observable in a
   * three-badge dataset. Merged into the full Physicals category it turns a
   * capacity-free pool of 12 into an exact-cover problem, and randomized greedy
   * can then finish 4 points short.
   *
   * THIS IS NOT SOMETHING THE EXCHANGE MOVE CAUSED OR COULD FIX. The roll below
   * is CAPACITY-FREE, so by INV-20 it is byte-identical to the two-move walk at
   * the same seed: F8-E2's engine produces exactly this result. Recorded here so
   * that (a) the reason the sweep dataset is a named set is testable rather than
   * a comment, and (b) nobody re-splats the barrel into it without seeing this.
   */
  it("with the HOF-only fixture in the category, a capacity-free roll can finish 4 short", () => {
    const contaminated = loadDataset({
      ...shippedRawDataset,
      badges: [
        ...shippedRawDataset.badges,
        syntheticDearBronzeOnly,
        syntheticCheapBronzeOnly,
        syntheticThresholdBoundary,
        syntheticExchangePlusOne,
        syntheticExchangePlusFour,
      ],
    });
    const fixtureSpec = spreadAttributeFamily().find(
      (one) => one.index === 47,
    ) as SweepFixture;
    const state = stateOf({ budgets: budgets(fixtureSpec.points, fixtureSpec.equipSlots) });
    const report = rollCategory(
      requestOf({ state, build: fixtureSpec.build, seed: "oracle-spread-attributes-47-2" }),
      "Physicals",
      contaminated,
    );
    const optimal = optimalAddedSpend(state, fixtureSpec.build, "Physicals", contaminated);
    const spend = grossSpendOf(report.proposedEntries, "Physicals", contaminated);
    expect(optimal - spend).toBe(4);
    // Capacity-free, therefore exchange-free, therefore E2's own result.
    expect(report.after.equipSlotsUsed).toBeLessThan(fixtureSpec.equipSlots);
    expect(exchangesIn(report.steps)).toEqual([]);
    expect(report.proposedEntries).toEqual(
      twoMoveWalk(
        "oracle-spread-attributes-47-2",
        state,
        fixtureSpec.build,
        "Physicals",
        contaminated,
      ),
    );
  });
});

// ===========================================================================
// A5 group 5 — THE PAYOFF.
//
// "This will help equip extra badges too" [user 2026-08-26]. That sentence is
// the reason the amendment exists, and 5.1 is the acceptance test for the
// whole of it: the claim is PROVEN against the shipped roll engine rather than
// asserted. The engine itself is UNEDITED by A5 — `newBadgesAllowed =
// used < budget.equipSlots` is the hard cap, and it reads the COMPOSED record,
// so an applied bonus Badge Slot reaches it with no code change at all.
// [engine-data-design.md §6 group 5]
// ===========================================================================

describe("A5 group 5 — an applied bonus Badge Slot lets the roll equip one more badge", () => {
  /** A category pinned at FULL base capacity with points to spare: two badges
   *  owned, two base Badge Slots, a deep pool. Everything qualifies at 99. */
  const PAYOFF_BUILD = makeBuild(78, 99);
  const PAYOFF_LOADOUT: LoadoutEntry[] = [
    { badgeId: "deadeye", purchasedLevel: "bronze" },
    { badgeId: "static-middy", purchasedLevel: "bronze" },
  ];
  const PAYOFF_SEED = "a5-payoff";
  const BASE_EQUIP_SLOTS = 2;

  function payoffBase(): Record<Category, Budget> {
    return budgets(200, BASE_EQUIP_SLOTS);
  }

  function payoffRequest(bonus: BonusBudget): RollRequest {
    return requestOf({
      state: stateOf({
        loadout: PAYOFF_LOADOUT,
        budgets: effectiveBudgets(payoffBase(), bonus),
        bonus,
      }),
      build: PAYOFF_BUILD,
      seed: PAYOFF_SEED,
      mode: "fill",
    });
  }

  it("5.1 SHIP GATE — same seed: zero bonus is blocked at capacity; ONE applied bonus Badge Slot buys exactly ONE more new badge", () => {
    // --- Leg A: no bonus. The category is full, so no new badge may land,
    // and the engine says so explicitly rather than leaving it inferable.
    const withoutBonus = rollCategory(payoffRequest(zeroBonus()), "Shooting", dataset);
    expect(withoutBonus.outcome).not.toBe("declined");
    expect(withoutBonus.equipSlotCapacity).toBe(BASE_EQUIP_SLOTS);
    expect(withoutBonus.newBadgesBlockedByBadgeSlots).toBe(true);
    const newBadgesWithout = withoutBonus.steps.filter((step) => step.requiresNewBadgeSlot);
    expect(newBadgesWithout).toHaveLength(0);

    // --- Leg B: THE SAME SEED, one bonus Badge Slot applied to that category.
    const bonus: BonusBudget = {
      ...zeroBonus(),
      earnedEquipSlots: 1,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 1 },
    };
    const withBonus = rollCategory(payoffRequest(bonus), "Shooting", dataset);
    expect(withBonus.outcome).toBe("rolled");
    expect(withBonus.equipSlotCapacity).toBe(BASE_EQUIP_SLOTS + 1);

    const newBadgesWith = withBonus.steps.filter((step) => step.requiresNewBadgeSlot);
    expect(newBadgesWith).toHaveLength(1);
    // One more Badge Slot, exactly one more equipped badge — not two, and the
    // cap re-closes behind it.
    expect(withBonus.after.equipSlotsUsed).toBe(BASE_EQUIP_SLOTS + 1);
    expect(withBonus.after.equipSlotsUsed).toBe(withoutBonus.after.equipSlotsUsed + 1);
    expect(withBonus.newBadgesBlockedByBadgeSlots).toBe(true);
  });

  it("5.2 an applied bonus Badge POINT raises the affordable-upgrade count", () => {
    const base = {
      ...budgets(0, 4),
      Shooting: { equipSlots: 4, points: 1 },
    };
    const build = makeBuild(78, 99);
    const stateAt = (bonus: BonusBudget) =>
      stateOf({ loadout: [], budgets: effectiveBudgets(base, bonus), bonus });

    const poor = stateAt(zeroBonus());
    const poorCount = categoryFeasibility(
      poor,
      build,
      "Shooting",
      categoryLedgerAt(poor, "current", "Shooting", dataset).remainingPoints,
      dataset,
    ).affordableUpgrades;

    const funded: BonusBudget = {
      ...zeroBonus(),
      earnedPoints: 40,
      appliedPoints: { ...zeroBonus().appliedPoints, Shooting: 40 },
    };
    const rich = stateAt(funded);
    const richCount = categoryFeasibility(
      rich,
      build,
      "Shooting",
      categoryLedgerAt(rich, "current", "Shooting", dataset).remainingPoints,
      dataset,
    ).affordableUpgrades;

    expect(richCount).toBeGreaterThan(poorCount);
  });

  it("5.3 THE DEADLOCK BREAK — a bonus applied to a BASE-0 category is REAL capacity, and the roll fills it; nothing applied still declines", () => {
    // A5-U INVERTED THIS TEST (design-spec §17.9 Ruling ②, canary 4). It used
    // to pin the zero-base carve-out: a bonus placed in a genuinely-zero
    // discipline granted nothing, forever, because "the base is entered, at
    // zero" made the carve-out's escape hatch unreachable. Low attributes in a
    // discipline is precisely when a player reaches for a reassignable bonus
    // slot, so the old rule made the LIKELY case impossible.
    //
    // The roll is the sharpest place to assert it: the fill loop reads capacity
    // to decide how much fits, so if the composition were still absorbing at
    // zero this would decline.
    const base = { ...budgets(200, 4), Shooting: { equipSlots: 0, points: 200 } };
    const bonus: BonusBudget = {
      ...zeroBonus(),
      earnedEquipSlots: 3,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 3 },
    };
    const report = rollCategory(
      requestOf({
        state: stateOf({ budgets: effectiveBudgets(base, bonus), bonus }),
        build: makeBuild(78, 99),
        seed: "a5-deadlock-break",
      }),
      "Shooting",
      dataset,
    );
    expect(report.outcome).toBe("rolled");
    expect(report.decline).toBeNull();
    expect(report.steps.length).toBeGreaterThan(0);

    // …AND THE ZERO STATE IS UNDISTURBED (canary 4b): the SAME base with
    // NOTHING placed still declines as capacity-unset, so Ruling ② did not
    // loosen §4.7 for a category nobody has touched.
    const nothingPlaced = rollCategory(
      requestOf({
        state: stateOf({ budgets: effectiveBudgets(base, zeroBonus()) }),
        build: makeBuild(78, 99),
        seed: "a5-deadlock-break",
      }),
      "Shooting",
      dataset,
    );
    expect(nothingPlaced.outcome).toBe("declined");
    expect(nothingPlaced.decline).toEqual({ kind: "badgeSlotsCapacityUnset" });
  });

  it("5.4 rollIterationBound grows with the EFFECTIVE capacity and the walk still terminates", () => {
    const base = budgets(200, 4);
    const bonus: BonusBudget = {
      ...zeroBonus(),
      earnedEquipSlots: 6,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 6 },
    };
    const effective = effectiveBudgets(base, bonus);
    expect(effective.Shooting.equipSlots).toBe(10);
    // A4-R2's ratified formula is UNCHANGED; only its input grew.
    expect(
      rollIterationBound(0, effective.Shooting.equipSlots, 0),
    ).toBeGreaterThan(rollIterationBound(0, base.Shooting.equipSlots, 0));

    const request = requestOf({
      state: stateOf({ budgets: effective, bonus }),
      build: makeBuild(78, 99),
      seed: "a5-bound",
    });
    expect(() => rollCategory(request, "Shooting", dataset)).not.toThrow(
      RollDidNotTerminateError,
    );
    const report = rollCategory(request, "Shooting", dataset);
    expect(report.after.equipSlotsUsed).toBeLessThanOrEqual(10);
  });

  it("5.5 the reproducibility token is unaffected: two states with the same EFFECTIVE record roll identically", () => {
    // F8-E3 note — `bonus` is deliberately NOT added to stableDigest. Two
    // states with the same effective record are the same input to a roll, so
    // the roll must not be able to tell them apart.
    const viaBase = requestOf({
      state: stateOf({ loadout: PAYOFF_LOADOUT, budgets: budgets(200, 3) }),
      build: PAYOFF_BUILD,
      seed: PAYOFF_SEED,
    });
    const bonus: BonusBudget = {
      ...zeroBonus(),
      earnedEquipSlots: 1,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 1 },
    };
    const viaBonus = requestOf({
      state: stateOf({
        loadout: PAYOFF_LOADOUT,
        budgets: effectiveBudgets(
          { ...budgets(200, 3), Shooting: { equipSlots: 2, points: 200 } },
          bonus,
        ),
        bonus,
      }),
      build: PAYOFF_BUILD,
      seed: PAYOFF_SEED,
    });
    expect(rollCategory(viaBonus, "Shooting", dataset).steps).toEqual(
      rollCategory(viaBase, "Shooting", dataset).steps,
    );
  });
});
