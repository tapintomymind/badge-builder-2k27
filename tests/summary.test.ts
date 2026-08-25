/**
 * F8-E1 group 3 — `src/engine/summary.ts`, the pure roster/summary selectors.
 *
 * The highest-value assertion here is 3.1 (INV-15 / H2). `SummaryPanel`'s
 * shipped header pins "the summary reads COMMITTED state only… so NOTHING here
 * can move under a display overlay", and the M4 ship-gate regressions assert
 * ledger DOM is bit-identical across all four overlay combinations. A roster
 * that shows effective levels sits one careless line from reddening both.
 */

import { describe, expect, it } from "vitest";
import { badgeById, shippedDataset } from "../src/engine/dataset";
import { defaultOverlay, createDefaultSynergySlots, effectiveLevel } from "../src/engine/synergy";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import {
  badgeSlotsBaselineText,
  buildSummary,
  synergyProjections,
} from "../src/engine/summary";
import type { Budget, LoadoutEntry, SynergySlot } from "../src/engine/types";
import type { Category, Level } from "../src/engine/vocabulary";
import { CATEGORIES, LEVELS } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

const build = makeBuild(78, 99);

function budgets(
  overrides: Partial<Record<Category, Budget>> = {},
): Record<Category, Budget> {
  const base = Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 3, points: 20 }]),
  ) as Record<Category, Budget>;
  return { ...base, ...overrides };
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

/** Slot 5 (permanent) unlocked with `badgeId` in the FUSE role. */
function fusedSlots(badgeId: string): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) =>
    synergySlot.id === 5 ? { ...synergySlot, unlocked: true, fuseBadgeId: badgeId } : synergySlot,
  );
}

/** Slot 5 unlocked with `badgeId` in the REACTION role. */
function reactionSlots(badgeId: string): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) =>
    synergySlot.id === 5
      ? { ...synergySlot, unlocked: true, reactionBadgeId: badgeId }
      : synergySlot,
  );
}

const LOADOUT: LoadoutEntry[] = [
  { badgeId: "deadeye", purchasedLevel: "gold" },
  { badgeId: "static-middy", purchasedLevel: "bronze" },
  { badgeId: "pogo-stick", purchasedLevel: "hof" },
];

describe("3.1 — INV-15 / H2: buildSummary cannot see an overlay, and its numbers cannot move", () => {
  it("SIGNATURE LEVEL: buildSummary takes (state, build, dataset?) — there is no OverlayState channel", () => {
    // A compile-level control, asserted at runtime too so it cannot rot into a
    // comment. `length` counts parameters before the first default.
    expect(buildSummary.length).toBe(2);
  });

  it("BEHAVIOURAL BACKSTOP: a reaction badge whose effective level DOES move under an overlay does NOT move the summary", () => {
    const state = stateOf(LOADOUT, { synergySlots: reactionSlots("deadeye") });
    const synergyState = { loadout: state.loadout, synergySlots: state.synergySlots };

    // Prove the overlay channel is live for this fixture — otherwise the test
    // below is vacuous.
    const neutral = effectiveLevel(synergyState, "deadeye", defaultOverlay);
    const activated = effectiveLevel(synergyState, "deadeye", {
      reactionsActive: true,
      seasonReset: false,
    });
    expect(neutral).toBe("gold");
    expect(activated).toBe("hof");

    // The summary is a pure function of committed state — same input, same
    // output, no matter what the UI's toggles happen to be doing.
    const summary = buildSummary(state, build);
    const row = summary.categories
      .flatMap((category) => category.rows)
      .find((candidate) => candidate.badgeId === "deadeye");
    expect(row?.committedEffectiveLevel).toBe("gold");
    expect(row?.cost).toBe(6); // A-tier Gold — overlay-invariant by construction
    expect(buildSummary(state, build)).toEqual(summary);
  });

  it("every readout equals categoryLedgerAt on the 'current' basis, never a projection", () => {
    const state = stateOf(LOADOUT);
    for (const category of buildSummary(state, build).categories) {
      expect(category.readout).toEqual(
        categoryLedgerAt(state, "current", category.category, shippedDataset),
      );
    }
  });
});

describe("3.2 — rows are dataset-ordered, per category, purchased-only", () => {
  it("contains exactly the purchased badges, in dataset order", () => {
    const summary = buildSummary(stateOf(LOADOUT), build);
    const shooting = summary.categories.find((category) => category.category === "Shooting");
    const datasetOrder = shippedDataset.badges
      .filter((badge) => badge.category === "Shooting")
      .map((badge) => badge.id)
      .filter((id) => LOADOUT.some((entry) => entry.badgeId === id));
    expect(shooting?.rows.map((row) => row.badgeId)).toEqual(datasetOrder);
    expect(summary.categories.flatMap((category) => category.rows).length).toBe(LOADOUT.length);
  });
});

describe("3.3 — countsByLevel EQUALS SummaryPanel's shipped inline computation", () => {
  /** Verbatim copy of the inline block in src/ui/summary/SummaryPanel.tsx.
   *  E1 does NOT delete the original; this pins the equality so S2 can. */
  function shippedInlineCounts(
    loadout: readonly LoadoutEntry[],
    synergySlots: readonly SynergySlot[],
  ): Record<Level, number> {
    const countsByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<
      Level,
      number
    >;
    for (const entry of loadout) {
      const effective = effectiveLevel({ loadout, synergySlots }, entry.badgeId, defaultOverlay);
      if (effective !== null) countsByLevel[effective] += 1;
    }
    return countsByLevel;
  }

  const fixtures: { name: string; loadout: LoadoutEntry[]; synergySlots: SynergySlot[] }[] = [
    { name: "empty", loadout: [], synergySlots: createDefaultSynergySlots() },
    { name: "one bronze", loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }], synergySlots: createDefaultSynergySlots() },
    { name: "three mixed", loadout: LOADOUT, synergySlots: createDefaultSynergySlots() },
    {
      name: "LEGEND BY BOOST — a fused HOF badge",
      loadout: [{ badgeId: "deadeye", purchasedLevel: "hof" }],
      synergySlots: fusedSlots("deadeye"),
    },
    {
      name: "fuse on a locked slot contributes no boost",
      loadout: [{ badgeId: "deadeye", purchasedLevel: "hof" }],
      synergySlots: createDefaultSynergySlots().map((slot) =>
        slot.id === 5 ? { ...slot, fuseBadgeId: "deadeye" } : slot,
      ),
    },
  ];

  for (const fixture of fixtures) {
    it(`matches for: ${fixture.name}`, () => {
      const state = stateOf(fixture.loadout, { synergySlots: fixture.synergySlots });
      expect(buildSummary(state, build).countsByLevel).toEqual(
        shippedInlineCounts(fixture.loadout, fixture.synergySlots),
      );
    });
  }

  it("the Legend-by-boost fixture is genuinely live — otherwise the pin is vacuous", () => {
    const state = stateOf([{ badgeId: "deadeye", purchasedLevel: "hof" }], {
      synergySlots: fusedSlots("deadeye"),
    });
    expect(buildSummary(state, build).countsByLevel.legend).toBe(1);
  });
});

describe("3.4 — §4.7: capacity 0 SUPPRESSES COMPARISONS; it is never 'zero capacity'", () => {
  const state = stateOf(LOADOUT, {
    budgets: budgets({ Shooting: { equipSlots: 0, points: 20 } }),
  });

  it("the unset category is flagged, is never 'over', and kills the build-level comparison", () => {
    const summary = buildSummary(state, build);
    const shooting = summary.categories.find((category) => category.category === "Shooting");
    expect(shooting?.badgeSlotsCapacityUnset).toBe(true);
    expect(shooting?.equipSlotsOverBy).toBe(0); // 2 purchased against "capacity 0" is NOT overflow
    expect(shooting?.readout.equipSlotsUsed).toBe(2);
    expect(summary.equipSlotsBaselineComparable).toBe(false);
    expect(summary.categoriesWithoutCapacity).toBe(1);
  });

  it("a genuinely over-capacity category still reports its overflow", () => {
    const crowded = stateOf(
      [
        { badgeId: "deadeye", purchasedLevel: "bronze" },
        { badgeId: "static-middy", purchasedLevel: "bronze" },
        { badgeId: "set-and-fire", purchasedLevel: "bronze" },
      ],
      { budgets: budgets({ Shooting: { equipSlots: 2, points: 20 } }) },
    );
    const shooting = buildSummary(crowded, build).categories.find(
      (category) => category.category === "Shooting",
    );
    expect(shooting?.equipSlotsOverBy).toBe(1);
  });
});

describe("3.5 — H8: staleness is DISCLOSED and never repaired", () => {
  // limitless-range needs 83 threePt at Bronze; a 60-threePt build no longer
  // qualifies at any level, so a Gold purchase is stale.
  const weak = makeBuild(78, 60);
  const state = stateOf([{ badgeId: "limitless-range", purchasedLevel: "gold" }]);

  it("the row is stale, carries its maxPurchasableLevel and its reason copy", () => {
    const row = buildSummary(state, weak)
      .categories.flatMap((category) => category.rows)
      .find((candidate) => candidate.badgeId === "limitless-range");
    expect(row?.stale).toBe(true);
    expect(row?.maxPurchasableLevel).toBeNull();
    expect(row?.staleReasons.join(" ")).toContain("Three-Point");
  });

  it("the entry is NEVER removed, clamped or repaired by the selector", () => {
    const summary = buildSummary(state, weak);
    const rows = summary.categories.flatMap((category) => category.rows);
    expect(rows.length).toBe(1);
    expect(rows[0]?.purchasedLevel).toBe("gold"); // not clamped down to anything
    expect(summary.totalSpent).toBe(6); // A-tier Gold — still fully charged
  });

  it("a healthy purchase carries no stale copy", () => {
    const row = buildSummary(state, build)
      .categories.flatMap((category) => category.rows)
      .find((candidate) => candidate.badgeId === "limitless-range");
    expect(row?.stale).toBe(false);
    expect(row?.staleReasons).toEqual([]);
  });
});

describe("3.6 — synergyProjections: activatesTo is labelled, freesPoints is READ FROM THE LEDGER", () => {
  it("a reaction row carries activatesTo, and it is NOT the committed level", () => {
    const state = stateOf(LOADOUT, { synergySlots: reactionSlots("deadeye") });
    const row = synergyProjections(state).find((candidate) => candidate.synergySlotId === 5);
    expect(row?.reaction?.committedEffectiveLevel).toBe("gold");
    expect(row?.reaction?.activatesTo).toBe("hof");
  });

  it("BOTH refund arms: a fused GOLD badge frees 0 under legendByAnyMeans and its FULL spend under a HOF-based trigger", () => {
    const loadout: LoadoutEntry[] = [{ badgeId: "deadeye", purchasedLevel: "gold" }];
    const synergySlots = fusedSlots("deadeye");
    const goldCost = 6; // A-tier Gold

    const legendBased = synergyProjections(
      stateOf(loadout, { synergySlots, refundTrigger: "legendByAnyMeans" }),
    ).find((row) => row.synergySlotId === 5);
    expect(legendBased?.freesPointsToCategory).toBe(0);

    // The pre-F4 stand-in for `onFuse`: a trigger under which the fuse boost
    // DOES cross the refund line. When F4 lands onFuse this arm is the one to
    // extend — the assertion shape is already correct.
    const hofBased = synergyProjections(
      stateOf(loadout, { synergySlots, refundTrigger: "hofOrAbove" }),
    ).find((row) => row.synergySlotId === 5);
    expect(hofBased?.freesPointsToCategory).toBe(goldCost);
  });

  it("the figure matches the LEDGER's own refunded number for that category", () => {
    const loadout: LoadoutEntry[] = [{ badgeId: "deadeye", purchasedLevel: "hof" }];
    const state = stateOf(loadout, { synergySlots: fusedSlots("deadeye") });
    const row = synergyProjections(state).find((candidate) => candidate.synergySlotId === 5);
    expect(row?.freesPointsToCategory).toBe(
      categoryLedgerAt(state, "current", "Shooting", shippedDataset).refunded,
    );
  });

  it("an unassigned unlocked slot renders as a row with null roles and frees nothing", () => {
    const state = stateOf(LOADOUT);
    const rows = synergyProjections(state);
    expect(rows.length).toBe(8);
    expect(rows.every((row) => row.fuse === null && row.reaction === null)).toBe(true);
    expect(rows.every((row) => row.freesPointsToCategory === 0)).toBe(true);
  });
});

describe("3.7 — badgeSlotsBaselineText: the unset guard is evaluated FIRST", () => {
  it("returns null while ANY category is unset — even when the Σ coincidentally equals 20", () => {
    // 5 × 4 + 0 = 20. A Σ-first implementation would happily print "20 of the 20".
    const contrived = budgets({
      Finishing: { equipSlots: 4, points: 20 },
      Shooting: { equipSlots: 4, points: 20 },
      Playmaking: { equipSlots: 4, points: 20 },
      Defense: { equipSlots: 4, points: 20 },
      Rebounding: { equipSlots: 4, points: 20 },
      Physicals: { equipSlots: 0, points: 20 },
    });
    const summary = buildSummary(stateOf(LOADOUT, { budgets: contrived }), build);
    expect(summary.totalEquipSlots).toBe(20);
    expect(badgeSlotsBaselineText(summary)).toBeNull();
  });

  it("returns the ONE phrasing of the A3 fact once every capacity is entered", () => {
    const summary = buildSummary(stateOf(LOADOUT), build); // 6 × 3 = 18
    expect(badgeSlotsBaselineText(summary)).toBe("18 of the 20 a build starts with");
  });

  it("A3 is a DISCLOSURE, never a constraint — a Σ over 20 still renders, unwarned", () => {
    const roomy = budgets(
      Object.fromEntries(
        CATEGORIES.map((category) => [category, { equipSlots: 5, points: 20 }]),
      ) as Record<Category, Budget>,
    );
    const summary = buildSummary(stateOf(LOADOUT, { budgets: roomy }), build);
    expect(badgeSlotsBaselineText(summary)).toBe("30 of the 20 a build starts with");
    expect(summary.validation.errors).toEqual([]);
  });
});

describe("selector hygiene", () => {
  it("an unknown badge id in the loadout fails LOUDLY, never silently", () => {
    expect(() => buildSummary(stateOf([{ badgeId: "nope", purchasedLevel: "gold" }]), build)).toThrow();
  });

  it("every row's cost is the badge's total-to-own price at its purchased level", () => {
    for (const row of buildSummary(stateOf(LOADOUT), build).categories.flatMap((c) => c.rows)) {
      const badge = badgeById(shippedDataset, row.badgeId);
      expect(row.tier).toBe(badge?.tier);
      expect(row.cost).toBe(shippedDataset.tierCosts[row.tier][row.purchasedLevel]);
    }
  });
});
