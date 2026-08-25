/**
 * A5-E — the bonus layer: the model, its invariants, and the zero-bonus
 * identity gate. [scope.md §0.1 A5-R1 … A5-R5 ·
 * features/bonus-badge-slots-and-points/engine-data-design.md §6 groups 1, 2, 4]
 *
 * THE GATE THIS SLICE IS JUDGED ON IS "NOTHING CHANGED". After A5-E no control
 * in the app can write a non-zero bonus, so every dependent behaviour is
 * unreachable and the whole existing suite must stay green with ZERO assertion
 * edits. Group 2 below is the mechanical statement of that; the rest prove the
 * model is right for when A5-U makes it reachable.
 *
 * ON MUTATION. A5-E ships NO mutation API — applying and unapplying are
 * A5-U's controls. Group 1's reversibility tests therefore drive plain record
 * transforms defined locally here, which is exactly what those controls will
 * reduce to at this layer: the point being proved is that the MODEL cannot
 * refuse or lose a legal gesture, not that a particular button exists.
 */

import { describe, expect, it } from "vitest";
import { loadDataset, shippedRawDataset } from "../src/engine/dataset";
import {
  appliedEquipSlotsTotal,
  appliedPointsTotal,
  baseEquipSlotsOf,
  bonusHasContent,
  effectiveBudgets,
  normalizeBonus,
  unappliedEquipSlots,
  unappliedPoints,
  zeroBonus,
} from "../src/engine/budget";
import { badgeSlotsCapacityUnset } from "../src/engine/ledger";
import { buildSummary, badgeSlotsBaselineText } from "../src/engine/summary";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import { validateLoadout } from "../src/engine/validate-loadout";
import type { BonusBudget, Budget } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { srcSources, stripComments } from "./helpers/test-utils";
import { makeBuild } from "./helpers/test-utils";

const dataset = loadDataset(shippedRawDataset);

function budgetsOf(equipSlots: number, points: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots, points }]),
  ) as Record<Category, Budget>;
}

function bonusOf(patch: {
  earnedEquipSlots?: number;
  earnedPoints?: number;
  appliedEquipSlots?: Partial<Record<Category, number>>;
  appliedPoints?: Partial<Record<Category, number>>;
}): BonusBudget {
  const base = zeroBonus();
  return {
    earnedEquipSlots: patch.earnedEquipSlots ?? 0,
    earnedPoints: patch.earnedPoints ?? 0,
    appliedEquipSlots: { ...base.appliedEquipSlots, ...patch.appliedEquipSlots },
    appliedPoints: { ...base.appliedPoints, ...patch.appliedPoints },
  };
}

/** The transforms A5-U's controls will reduce to. NONE of them may refuse. */
function applyEquipSlot(bonus: BonusBudget, category: Category, delta: number): BonusBudget {
  return {
    ...bonus,
    appliedEquipSlots: {
      ...bonus.appliedEquipSlots,
      [category]: bonus.appliedEquipSlots[category] + delta,
    },
  };
}

function moveEquipSlot(bonus: BonusBudget, from: Category, to: Category): BonusBudget {
  return applyEquipSlot(applyEquipSlot(bonus, from, -1), to, 1);
}

function stateOf(overrides: Partial<SynergyLedgerState> = {}): SynergyLedgerState {
  return {
    loadout: [],
    budgets: budgetsOf(4, 20),
    synergySlots: createDefaultSynergySlots(null),
    refundTrigger: "legendByAnyMeans",
    ...overrides,
  };
}

// ===========================================================================
// Group 1 — the model and its invariants
// ===========================================================================

describe("A5 group 1 — the bonus model and its invariants", () => {
  it("1.1 Σ applied ≤ earned holds across an apply/unapply/move sequence that never exceeds the earned total", () => {
    let bonus = bonusOf({ earnedEquipSlots: 2, earnedPoints: 5 });
    bonus = applyEquipSlot(bonus, "Shooting", 1);
    bonus = applyEquipSlot(bonus, "Defense", 1);
    expect(appliedEquipSlotsTotal(bonus)).toBeLessThanOrEqual(bonus.earnedEquipSlots);
    bonus = moveEquipSlot(bonus, "Defense", "Rebounding");
    expect(appliedEquipSlotsTotal(bonus)).toBeLessThanOrEqual(bonus.earnedEquipSlots);
    bonus = applyEquipSlot(bonus, "Shooting", -1);
    expect(appliedEquipSlotsTotal(bonus)).toBeLessThanOrEqual(bonus.earnedEquipSlots);
    expect(unappliedEquipSlots(bonus)).toBe(1);
  });

  it("1.2 every value stays a non-negative integer through the same sequence", () => {
    let bonus = bonusOf({ earnedEquipSlots: 2, earnedPoints: 4 });
    const check = (value: BonusBudget): void => {
      for (const total of [value.earnedEquipSlots, value.earnedPoints]) {
        expect(Number.isInteger(total)).toBe(true);
        expect(total).toBeGreaterThanOrEqual(0);
      }
      for (const category of CATEGORIES) {
        for (const applied of [
          value.appliedEquipSlots[category],
          value.appliedPoints[category],
        ]) {
          expect(Number.isInteger(applied)).toBe(true);
          expect(applied).toBeGreaterThanOrEqual(0);
        }
      }
    };
    check(bonus);
    bonus = applyEquipSlot(bonus, "Finishing", 1);
    check(bonus);
    bonus = moveEquipSlot(bonus, "Finishing", "Playmaking");
    check(bonus);
    bonus = applyEquipSlot(bonus, "Playmaking", -1);
    check(bonus);
  });

  it("1.3 FREE REVERSIBILITY (INV-A5-4) — apply→unapply and move→move-back return the EXACT prior state, and nothing ever refuses", () => {
    const start = bonusOf({ earnedEquipSlots: 1, appliedEquipSlots: { Shooting: 1 } });

    // apply → unapply
    expect(applyEquipSlot(applyEquipSlot(start, "Defense", 1), "Defense", -1)).toEqual(start);
    // move → move back
    expect(moveEquipSlot(moveEquipSlot(start, "Shooting", "Defense"), "Defense", "Shooting")).toEqual(
      start,
    );

    // AND IT STILL HOLDS WHILE THE CATEGORY IS IN OVERFLOW AND OVERSPEND. A
    // lock anywhere is a defect, not a policy choice — reducing an allocation
    // is legal even out of an over-applied state.
    const over = bonusOf({
      earnedEquipSlots: 1,
      earnedPoints: 1,
      appliedEquipSlots: { Shooting: 4 },
      appliedPoints: { Shooting: 9 },
    });
    expect(appliedEquipSlotsTotal(over)).toBeGreaterThan(over.earnedEquipSlots);
    expect(applyEquipSlot(applyEquipSlot(over, "Shooting", -1), "Shooting", 1)).toEqual(over);
    expect(moveEquipSlot(moveEquipSlot(over, "Shooting", "Defense"), "Defense", "Shooting")).toEqual(
      over,
    );
  });

  it("1.4 an OVER-APPLIED bonus is representable: it constructs, composes, summarizes and validates without anything throwing", () => {
    const bonus = bonusOf({
      earnedEquipSlots: 1,
      appliedEquipSlots: { Shooting: 1, Defense: 1, Rebounding: 1 },
    });
    expect(appliedEquipSlotsTotal(bonus)).toBe(3);
    expect(bonus.earnedEquipSlots).toBe(1);

    const base = budgetsOf(4, 20);
    expect(() => effectiveBudgets(base, bonus)).not.toThrow();
    const state = stateOf({ budgets: effectiveBudgets(base, bonus), bonus });
    expect(() => validateLoadout(state, dataset)).not.toThrow();
    expect(() => buildSummary(state, makeBuild(78, 60), dataset)).not.toThrow();
  });

  it("1.5 the ZERO-BASE CARVE-OUT: base 0 + applied 3 ⇒ effective 0; base 1 + applied 3 ⇒ effective 4", () => {
    const bonus = bonusOf({
      earnedEquipSlots: 3,
      earnedPoints: 3,
      appliedEquipSlots: { Shooting: 3, Defense: 3 },
      appliedPoints: { Shooting: 3, Defense: 3 },
    });
    const base = {
      ...budgetsOf(0, 0),
      Shooting: { equipSlots: 0, points: 0 },
      Defense: { equipSlots: 1, points: 1 },
    };
    const effective = effectiveBudgets(base, bonus);

    // unknown + known = unknown. The allocation is recorded and waiting.
    expect(effective.Shooting).toEqual({ equipSlots: 0, points: 0 });
    expect(badgeSlotsCapacityUnset(effective.Shooting)).toBe(true);
    // above zero it simply adds.
    expect(effective.Defense).toEqual({ equipSlots: 4, points: 4 });
    expect(badgeSlotsCapacityUnset(effective.Defense)).toBe(false);
  });

  it("1.6 effectiveBudgets is PURE — neither argument is mutated and the result is a fresh record", () => {
    const base = budgetsOf(2, 10);
    const bonus = bonusOf({ earnedEquipSlots: 1, appliedEquipSlots: { Shooting: 1 } });
    const baseSnapshot = structuredClone(base);
    const bonusSnapshot = structuredClone(bonus);

    const effective = effectiveBudgets(base, bonus);
    expect(base).toEqual(baseSnapshot);
    expect(bonus).toEqual(bonusSnapshot);
    for (const category of CATEGORIES) {
      expect(effective[category]).not.toBe(base[category]);
    }
    expect(effective).not.toBe(base);
  });

  it("1.7 SHIP GATE — no invented cap: zeroBonus() is all-zero and neither observed figure appears as a constant", () => {
    const zero = zeroBonus();
    expect(zero.earnedEquipSlots).toBe(0);
    expect(zero.earnedPoints).toBe(0);
    for (const category of CATEGORIES) {
      expect(zero.appliedEquipSlots[category]).toBe(0);
      expect(zero.appliedPoints[category]).toBe(0);
    }
    expect(Object.keys(zero.appliedEquipSlots).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(zero.appliedPoints).sort()).toEqual([...CATEGORIES].sort());
    expect(bonusHasContent(zero)).toBe(false);

    // The user's "3 extra slots and 12 tokens" is ONE ACCOUNT'S SNAPSHOT,
    // explicitly qualified "you can earn more … so this will be dynamic". It
    // is an OBSERVATION, never a rule, and it may not become a default, a cap
    // or a placeholder. Asserted against the SOURCE of the two files that
    // could plausibly carry such a constant, comments stripped so the prose
    // recording the ruling does not trip its own gate.
    for (const file of ["/src/engine/budget.ts", "/src/config/index.ts"]) {
      const code = stripComments(srcSources[file] as string);
      expect(/\b3\b/.test(code), `${file} must not carry a bare 3`).toBe(false);
      expect(/\b12\b/.test(code), `${file} must not carry a bare 12`).toBe(false);
    }
  });

  it("1.8 unapplied* goes NEGATIVE when over-applied and does not clamp — the negative IS the disclosure figure", () => {
    const bonus = bonusOf({
      earnedEquipSlots: 1,
      earnedPoints: 2,
      appliedEquipSlots: { Shooting: 1, Defense: 1, Rebounding: 1 },
      appliedPoints: { Shooting: 5 },
    });
    expect(unappliedEquipSlots(bonus)).toBe(-2);
    expect(unappliedPoints(bonus)).toBe(-3);
    expect(appliedEquipSlotsTotal(bonus)).toBe(3);
    expect(appliedPointsTotal(bonus)).toBe(5);
  });

  it("1.9 an over-applied bonus is NEVER CLAMPED by the composition (H8: disclose, never repair)", () => {
    const bonus = bonusOf({ earnedEquipSlots: 1, appliedEquipSlots: { Shooting: 4 } });
    const effective = effectiveBudgets(budgetsOf(2, 10), bonus);
    // 2 + 4, not 2 + 1. Clamping would silently rewrite the user's plan.
    expect(effective.Shooting.equipSlots).toBe(6);
  });

  it("1.10 baseEquipSlotsOf inverts the composition exactly, carve-out included", () => {
    for (const [base, applied] of [
      [0, 0],
      [0, 4],
      [1, 0],
      [5, 2],
    ] as const) {
      const effective = base === 0 ? 0 : base + applied;
      expect(baseEquipSlotsOf(effective, applied)).toBe(base);
    }
  });
});

// ===========================================================================
// Group 2 — the zero-bonus identity gate: why A5-E is provably inert
// ===========================================================================

describe("A5 group 2 — the zero-bonus identity gate", () => {
  it("2.1 effectiveBudgets(base, zeroBonus()) DEEP-EQUALS base across all-zero, mixed and all-positive spreads", () => {
    const spreads: Record<Category, Budget>[] = [
      budgetsOf(0, 0),
      budgetsOf(4, 20),
      { ...budgetsOf(4, 20), Shooting: { equipSlots: 0, points: 0 } },
      { ...budgetsOf(0, 0), Defense: { equipSlots: 7, points: 41 } },
      {
        Shooting: { equipSlots: 5, points: 22 },
        Finishing: { equipSlots: 0, points: 9 },
        Playmaking: { equipSlots: 2, points: 0 },
        Rebounding: { equipSlots: 0, points: 0 },
        Defense: { equipSlots: 9, points: 60 },
        Physicals: { equipSlots: 1, points: 1 },
      },
    ];
    for (const base of spreads) {
      expect(effectiveBudgets(base, zeroBonus())).toEqual(base);
    }
  });

  it("2.2 SHIP GATE (mechanical half) — a zero bonus changes NO engine readout: validation, summary and the baseline sentence are identical with and without the layer", () => {
    // The other half of 2.2 is the whole existing suite staying green with
    // zero assertion edits — that is checked by running it, not from here.
    const base = budgetsOf(4, 20);
    const build = makeBuild(78, 60);
    const loadout = [{ badgeId: "deadeye", purchasedLevel: "gold" as const }];

    const withoutLayer = stateOf({ budgets: base, loadout });
    const withZeroLayer = stateOf({
      budgets: effectiveBudgets(base, zeroBonus()),
      loadout,
      bonus: zeroBonus(),
    });

    expect(validateLoadout(withZeroLayer, dataset)).toEqual(validateLoadout(withoutLayer, dataset));

    const a = buildSummary(withoutLayer, build, dataset);
    const b = buildSummary(withZeroLayer, build, dataset);
    expect(b.totalEquipSlots).toBe(a.totalEquipSlots);
    expect(b.totalBaseEquipSlots).toBe(a.totalBaseEquipSlots);
    expect(b.totalBaseEquipSlots).toBe(a.totalEquipSlots);
    expect(badgeSlotsBaselineText(b)).toBe(badgeSlotsBaselineText(a));
    // And the sentence itself is byte-unchanged from the shipped phrasing.
    expect(badgeSlotsBaselineText(b)).toBe("24 of the 20 a build starts with");
  });

  it("2.3 badgeSlotsBaselineText reads the BASE Σ and appends the bonus clause ONLY when a total is earned", () => {
    const base = { ...budgetsOf(4, 20), Shooting: { equipSlots: 2, points: 20 } };
    const build = makeBuild(78, 60);

    // earned 0, applied 0 → the shipped sentence, base Σ = 22.
    const none = buildSummary(stateOf({ budgets: base, bonus: zeroBonus() }), build, dataset);
    expect(badgeSlotsBaselineText(none)).toBe("22 of the 20 a build starts with");

    // earned 2, one applied → the Σ-vs-20 half STILL reads the BASE 22, and
    // the bonus gets its own clause instead of being folded in.
    const bonus = bonusOf({ earnedEquipSlots: 2, appliedEquipSlots: { Shooting: 1 } });
    const applied = buildSummary(
      stateOf({ budgets: effectiveBudgets(base, bonus), bonus }),
      build,
      dataset,
    );
    expect(applied.totalEquipSlots).toBe(23);
    expect(applied.totalBaseEquipSlots).toBe(22);
    expect(badgeSlotsBaselineText(applied)).toBe(
      "22 of the 20 a build starts with · +1 of 2 bonus Badge Slots applied",
    );
  });

  it("2.4 the base Σ recovery survives the zero-base carve-out — an applied bonus on an unset category moves neither total", () => {
    const base = { ...budgetsOf(4, 20), Shooting: { equipSlots: 0, points: 0 } };
    const bonus = bonusOf({ earnedEquipSlots: 1, appliedEquipSlots: { Shooting: 1 } });
    const summary = buildSummary(
      stateOf({ budgets: effectiveBudgets(base, bonus), bonus }),
      makeBuild(78, 60),
      dataset,
    );
    expect(summary.totalEquipSlots).toBe(20);
    expect(summary.totalBaseEquipSlots).toBe(20);
    // …and §4.7 still suppresses the comparison outright.
    expect(summary.equipSlotsBaselineComparable).toBe(false);
    expect(badgeSlotsBaselineText(summary)).toBeNull();
  });
});

// ===========================================================================
// Group 4 — the rules layer
// ===========================================================================

describe("A5 group 4 — the rules layer owns Σ ≤ earned, as a WARNING", () => {
  it("4.1 both new kinds land in warnings, NEVER in errors, and are build-level (one each, not six)", () => {
    const bonus = bonusOf({
      earnedEquipSlots: 1,
      earnedPoints: 2,
      appliedEquipSlots: { Shooting: 2, Defense: 1 },
      appliedPoints: { Shooting: 4 },
    });
    const validation = validateLoadout(
      stateOf({ budgets: effectiveBudgets(budgetsOf(4, 20), bonus), bonus }),
      dataset,
    );

    const equipSlotWarnings = validation.warnings.filter(
      (warning) => warning.kind === "bonusEquipSlotsOverApplied",
    );
    const pointWarnings = validation.warnings.filter(
      (warning) => warning.kind === "bonusPointsOverApplied",
    );
    expect(equipSlotWarnings).toEqual([
      { kind: "bonusEquipSlotsOverApplied", applied: 3, earned: 1, overBy: 2 },
    ]);
    expect(pointWarnings).toEqual([
      { kind: "bonusPointsOverApplied", applied: 4, earned: 2, overBy: 2 },
    ]);
    for (const error of validation.errors) {
      expect(error.kind).not.toMatch(/^bonus/);
    }
  });

  it("4.2 an over-applied bonus does NOT clamp effective capacity — the warning fires AND the capacity grows", () => {
    const bonus = bonusOf({ earnedEquipSlots: 1, appliedEquipSlots: { Shooting: 3 } });
    const effective = effectiveBudgets(budgetsOf(4, 20), bonus);
    expect(effective.Shooting.equipSlots).toBe(7);
    const validation = validateLoadout(stateOf({ budgets: effective, bonus }), dataset);
    expect(
      validation.warnings.some((warning) => warning.kind === "bonusEquipSlotsOverApplied"),
    ).toBe(true);
  });

  it("4.3 state.bonus ABSENT ⇒ neither violation fires (the pre-A5 caller's behaviour, byte for byte)", () => {
    const validation = validateLoadout(stateOf({ budgets: budgetsOf(4, 20) }), dataset);
    expect(
      validation.warnings.some((warning) => warning.kind.startsWith("bonus")),
    ).toBe(false);
  });

  it("4.4 exactly-at-the-total is NOT a violation — Σ applied === earned is the ordinary fully-allocated state", () => {
    const bonus = bonusOf({
      earnedEquipSlots: 2,
      earnedPoints: 2,
      appliedEquipSlots: { Shooting: 1, Defense: 1 },
      appliedPoints: { Rebounding: 2 },
    });
    const validation = validateLoadout(
      stateOf({ budgets: effectiveBudgets(budgetsOf(4, 20), bonus), bonus }),
      dataset,
    );
    expect(
      validation.warnings.some((warning) => warning.kind.startsWith("bonus")),
    ).toBe(false);
    expect(unappliedEquipSlots(bonus)).toBe(0);
  });
});

// ===========================================================================
// normalizeBonus — the wire-shape half lives in tests/serialization.test.ts
// group 3; these pin the helper's own contract.
// ===========================================================================

describe("A5 — normalizeBonus fills every field and drops nothing the model needs", () => {
  it("absent and null both normalize to zeroBonus()", () => {
    expect(normalizeBonus(undefined)).toEqual(zeroBonus());
    expect(normalizeBonus(null)).toEqual(zeroBonus());
  });

  it("a partial record fills every other field with 0 and carries exactly the six category keys", () => {
    const normalized = normalizeBonus({ earnedEquipSlots: 2 });
    expect(normalized.earnedEquipSlots).toBe(2);
    expect(normalized.earnedPoints).toBe(0);
    expect(Object.keys(normalized.appliedEquipSlots).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(normalized.appliedPoints).sort()).toEqual([...CATEGORIES].sort());
  });

  it("an unknown key inside an applied record is DROPPED, never carried and never fatal", () => {
    const normalized = normalizeBonus({
      appliedEquipSlots: { Shooting: 1, Telekinesis: 9 },
    });
    expect(normalized.appliedEquipSlots.Shooting).toBe(1);
    expect(Object.keys(normalized.appliedEquipSlots)).not.toContain("Telekinesis");
  });

  it("it NEVER clamps Σ ≤ earned — an over-applied wire value survives normalization intact", () => {
    const normalized = normalizeBonus({
      earnedEquipSlots: 1,
      appliedEquipSlots: { Shooting: 2, Defense: 2 },
    });
    expect(normalized.earnedEquipSlots).toBe(1);
    expect(appliedEquipSlotsTotal(normalized)).toBe(4);
  });
});
