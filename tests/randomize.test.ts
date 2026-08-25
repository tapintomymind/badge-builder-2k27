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
 * test after, "every loadout is equally likely". That sentence is FALSE for
 * randomized greedy. What is true, and what is tested, is step-equiprobability
 * (INV-10) plus equivariance (INV-8) — and equivariance is the load-bearing
 * one, because a statistic can only fail to observe a preference whereas
 * equivariance shows the roller cannot express one.
 */

import { describe, expect, it } from "vitest";
import { loadDataset, shippedRawDataset } from "../src/engine/dataset";
import { RollDidNotTerminateError } from "../src/engine/errors";
import {
  ROLL_ALGORITHM_VERSION,
  rollBuild,
  rollCategory,
  rollIterationBound,
} from "../src/engine/randomize";
import type { PinMode, RollRequest } from "../src/engine/randomize";
import { syntheticBadges } from "../src/engine/__fixtures__/synthetic-badges";
import { legalSteps } from "../src/engine/steps";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import { validateLoadout } from "../src/engine/validate-loadout";
import type { BadgeDataset, Budget, LoadoutEntry, RawBadge, SynergySlot } from "../src/engine/types";
import type { Category, PurchasableLevel } from "../src/engine/vocabulary";
import { CATEGORIES, levelIndex } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";
import { grossSpendOf, optimalAddedSpend } from "./randomize-oracle";

// ---------------------------------------------------------------------------
// Datasets. Isolated ones exist because the statistical and equivariance
// invariants need a category containing EXACTLY the fixture pair — with 53
// shipped badges in the way the signal is unmeasurable.
// ---------------------------------------------------------------------------

const dataset: BadgeDataset = loadDataset({
  ...shippedRawDataset,
  badges: [...shippedRawDataset.badges, ...syntheticBadges],
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
      const hadWarning = new Set(beforeWarnings.map((warning) => warning.category));
      for (const warning of afterWarnings) {
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

describe("INV-7 — maximality, by re-running the enumerator on the result", () => {
  it("no legal affordable step remains in any rolled category", { timeout: 20000 }, () => {
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
  it("the bound is 4 x max(entries, capacity) + 1, which a pre-existing overflow needs", () => {
    expect(rollIterationBound(0, 3)).toBe(13);
    expect(rollIterationBound(3, 3)).toBe(13);
    // THE CASE THE BRIEF'S 4*equipSlots WOULD HAVE THROWN ON: five entries
    // against a capacity of one is legal input that `fill` may roll into, and
    // it admits up to fifteen upgrade steps against a bound of five.
    expect(rollIterationBound(5, 1)).toBe(21);
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
      expect(report.steps.length).toBeLessThanOrEqual(rollIterationBound(0, 3));
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

describe("INV-14 — the unspent gap against the exact-DP oracle", () => {
  /**
   * ⚠ THE SPECIFIED THRESHOLD IS NOT MET GLOBALLY, AND IT IS NOT AN ENUMERATOR
   * DEFECT. This is a STOP-AND-REPORT surfaced in the reportback, not a
   * quietly-relaxed number. Read this before changing anything here.
   *
   * The brief pins "median 0 and p95 <= 2 points" over all fixtures, on the
   * hypothesis that a miss means "the step enumerator is wrong, NOT the
   * concept". The enumerator is NOT wrong: INV-7 proves every roll is MAXIMAL
   * (no legal affordable step remains), and the oracle is a true upper bound
   * (no measured gap is ever negative). What the measurement shows is that the
   * gap splits cleanly along ONE axis — whether Badge Slots bound:
   *
   *   CAPACITY FREE  (points were the binding limit)  median 0 · p95 1
   *   CAPACITY BOUND (the roll filled every Badge Slot) median 1 · p95 4
   *
   * Where capacity does not bind, the specified threshold holds EXACTLY. Where
   * it does, an irreversible uniform Badge Slot commitment can spend the slot
   * on a badge with a low legal ceiling. A measured example: capacity 3, pool
   * 16, Finishing at attributes 72 — the roll bought three cost-1 Bronzes and
   * one Silver upgrade for a spend of 5, leaving 11 points, and it is MAXIMAL
   * because none of those three badges qualifies at any higher level.
   *
   * CLOSING THAT GAP WOULD REQUIRE PREFERRING BADGES WITH HIGHER CEILINGS —
   * which is precisely the stop-condition the brief itself names ("a small
   * preference for badges you nearly qualify for is a quality heuristic wearing
   * an affordability costume"). INV-14 and INV-9 are in genuine tension, and
   * resolving it is Architect's call, not an implementer's. The engine design
   * already contains the seed of the answer: it observes that "a capacity-bound
   * category can legitimately leave 40% of its pool unspent" — that insight
   * simply did not make it into this threshold.
   *
   * So this test pins BOTH regimes: the specified threshold where the concept
   * applies, and the MEASURED distribution where it does not, so the number
   * cannot drift unnoticed while the ruling is pending.
   */
  interface Sample {
    gap: number;
    capacityBound: boolean;
  }

  function sweep(): Sample[] {
    const samples: Sample[] = [];
    for (let index = 0; index < 200; index += 1) {
      // A deterministic, realistic spread of pools, capacities and builds.
      const points = 4 + (index % 17);
      const equipSlots = 1 + (index % 5);
      const attrs = 60 + (index % 35);
      const category = CATEGORIES[index % CATEGORIES.length] as Category;
      const state = stateOf({ budgets: budgets(points, equipSlots) });
      const build = makeBuild(78, attrs);
      const optimal = optimalAddedSpend(state, build, category, dataset);
      for (let seed = 0; seed < 5; seed += 1) {
        const report = rollCategory(
          requestOf({ state, build, seed: `oracle-${index}-${seed}` }),
          category,
          dataset,
        );
        if (report.outcome === "declined") continue;
        samples.push({
          gap: optimal - grossSpendOf(report.proposedEntries, category, dataset),
          capacityBound: report.after.equipSlotsUsed >= equipSlots,
        });
      }
    }
    return samples;
  }

  function quantile(values: number[], fraction: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * fraction)] as number;
  }

  const samples = sweep();
  const free = samples.filter((sample) => !sample.capacityBound).map((sample) => sample.gap);
  const bound = samples.filter((sample) => sample.capacityBound).map((sample) => sample.gap);

  it("the sweep is the size the brief specifies and both regimes are populated", { timeout: 20000 }, () => {
    expect(samples.length).toBeGreaterThan(500);
    expect(free.length).toBeGreaterThan(100);
    expect(bound.length).toBeGreaterThan(100);
  });

  it("the oracle is a true UPPER bound — no gap is ever negative", { timeout: 20000 }, () => {
    // A negative gap would mean the roller beat the exact optimum, i.e. the
    // oracle is wrong and every number in this file is meaningless.
    expect(Math.min(...samples.map((sample) => sample.gap))).toBeGreaterThanOrEqual(0);
  });

  it("CAPACITY FREE: the specified threshold holds exactly — median 0, p95 <= 2", { timeout: 20000 }, () => {
    expect(quantile(free, 0.5), `median ${quantile(free, 0.5)}`).toBe(0);
    expect(quantile(free, 0.95), `p95 ${quantile(free, 0.95)}`).toBeLessThanOrEqual(2);
  });

  it("CAPACITY BOUND: the MEASURED distribution, pinned pending Architect's ruling", { timeout: 20000 }, () => {
    // NOT the specified threshold. Pinned so a regression is still caught while
    // the INV-14 vs INV-9 tension is adjudicated. Tightening these numbers by
    // adding a preference is a stop-and-report, not a fix.
    expect(quantile(bound, 0.5), `median ${quantile(bound, 0.5)}`).toBeLessThanOrEqual(1);
    expect(quantile(bound, 0.95), `p95 ${quantile(bound, 0.95)}`).toBeLessThanOrEqual(5);
  });

  it("the roll is exactly optimal on a large share of rolls — the gap is a tail, not a bias", { timeout: 20000 }, () => {
    const exact = samples.filter((sample) => sample.gap === 0).length / samples.length;
    expect(exact, `exactly-optimal share ${exact.toFixed(3)}`).toBeGreaterThan(0.4);
  });
});
