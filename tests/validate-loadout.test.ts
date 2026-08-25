/**
 * validateLoadout tests (M2) — the single enforcement surface (H4), and the
 * M2 item-15 over-capacity pin (H4 × H5, NB-3):
 *
 *   AN OVER-CAPACITY EQUIPPED BADGE MAY HOLD A SYNERGY ROLE, AND ITS REFUND
 *   DOES COUNT IN THE LEDGER. The overflow is a SoftViolation — warned,
 *   never blocked. This test exists so a later implementer does not "fix"
 *   the permissive result into a hard block: that would derive a HARD block
 *   from a SOFT violation, the one thing the three-class taxonomy exists to
 *   prevent (scope.md §3 H4 — the capacity number is typed from memory).
 */

import { describe, expect, it } from "vitest";
import { UnknownBadgeError } from "../src/engine/errors";
import { assignSynergy, createDefaultSynergySlots } from "../src/engine/synergy";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import { validateLoadout } from "../src/engine/validate-loadout";
import type { Budget, LoadoutEntry, SynergySlot, SynergySlotId } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";

function makeBudgets(points: number, equipSlots: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { points, equipSlots }]),
  ) as Record<Category, Budget>;
}

function synergySlotsWith(
  overrides: Partial<Record<SynergySlotId, Partial<SynergySlot>>>,
): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) => ({
    ...synergySlot,
    ...overrides[synergySlot.id],
  }));
}

describe("M2 item 15 — over-capacity synergy (H4/NB-3): permissive, refund counts, overflow is SOFT", () => {
  // Finishing holds 5 equipped badges against equipSlots: 3 — over by 2.
  const loadout: LoadoutEntry[] = [
    { badgeId: "aerial-wizard", purchasedLevel: "bronze" }, // C bronze = 1
    { badgeId: "float-game", purchasedLevel: "silver" }, // A silver = 5
    { badgeId: "ghost-stepper", purchasedLevel: "bronze" }, // C bronze = 1
    { badgeId: "hook-specialist", purchasedLevel: "bronze" }, // C bronze = 1
    { badgeId: "layup-mixmaster", purchasedLevel: "gold" }, // A gold = 6 — the over-capacity badge
  ];
  // Hypothetical +2 on permanent synergy slot 7 (OQ-A1 seam exercise).
  const baseState: SynergyLedgerState = {
    loadout,
    budgets: makeBudgets(16, 3),
    synergySlots: synergySlotsWith({ 7: { unlocked: true, magnitude: 2 } }),
    refundTrigger: "legendByAnyMeans",
  };

  const assignment = assignSynergy(
    { loadout, synergySlots: baseState.synergySlots },
    7,
    "fuse",
    "layup-mixmaster",
  );

  it("assignSynergy SUCCEEDS on the over-capacity badge — no equip-slot check exists in it", () => {
    expect(assignment.ok).toBe(true);
  });

  const assignedState: SynergyLedgerState = {
    ...baseState,
    synergySlots: assignment.ok ? assignment.synergySlots : baseState.synergySlots,
  };

  it("the over-capacity badge's refund APPEARS in the ledger (gold +2 → Legend → full spent cost back)", () => {
    const readout = categoryLedgerAt(assignedState, "current", "Finishing");
    expect(readout.spent).toBe(14); // 1 + 5 + 1 + 1 + 6
    expect(readout.refunded).toBe(6); // layup-mixmaster's A-gold cost
    expect(readout.remainingPoints).toBe(16 - 14 + 6);
    expect(readout.equipSlotsUsed).toBe(5);
  });

  it("validateLoadout reports the overflow as a SoftViolation in the SAME state — and zero HardViolations", () => {
    const validation = validateLoadout(assignedState);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([
      {
        kind: "equipSlotOverflow",
        category: "Finishing",
        equipSlotsUsed: 5,
        equipSlotCapacity: 3,
        overBy: 2,
      },
    ]);
  });
});

describe("validateLoadout — SOFT budget class (warn, never block)", () => {
  it("points overspend surfaces as a pointsOverspend warning with the shortfall", () => {
    const state: SynergyLedgerState = {
      loadout: [
        { badgeId: "float-game", purchasedLevel: "hof" }, // A hof = 7
        { badgeId: "posterizer", purchasedLevel: "gold" }, // A gold = 6
      ],
      budgets: makeBudgets(10, 3),
      synergySlots: createDefaultSynergySlots(),
      refundTrigger: "legendByAnyMeans",
    };
    expect(validateLoadout(state).warnings).toEqual([
      { kind: "pointsOverspend", category: "Finishing", remainingPoints: -3, overBy: 3 },
    ]);
  });

  it("a refund can lift a category back OUT of overspend — the warning derives from the committed ledger", () => {
    const state: SynergyLedgerState = {
      loadout: [
        { badgeId: "float-game", purchasedLevel: "hof" }, // 7
        { badgeId: "posterizer", purchasedLevel: "gold" }, // 6
      ],
      budgets: makeBudgets(10, 3),
      synergySlots: synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "float-game" } }),
      refundTrigger: "legendByAnyMeans", // hof +1 → legend → refund 7
    };
    expect(validateLoadout(state).warnings).toEqual([]);
  });

  it("a clean state yields zero errors and zero warnings", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "glove", purchasedLevel: "gold" }],
      budgets: makeBudgets(16, 3),
      synergySlots: createDefaultSynergySlots(),
      refundTrigger: "legendByAnyMeans",
    };
    expect(validateLoadout(state)).toEqual({ errors: [], warnings: [] });
  });
});

describe("validateLoadout — HARD invariant class (externally constructed state)", () => {
  const budgets = makeBudgets(16, 3);

  it("a synergy role on an unpurchased badge is a HardViolation", () => {
    const state: SynergyLedgerState = {
      loadout: [],
      budgets,
      synergySlots: synergySlotsWith({ 5: { unlocked: true, fuseBadgeId: "posterizer" } }),
      refundTrigger: "legendByAnyMeans",
    };
    expect(validateLoadout(state).errors).toEqual([
      { kind: "synergyTargetNotPurchased", synergySlotId: 5, role: "fuse", badgeId: "posterizer" },
    ]);
  });

  it("a badge holding two synergy roles across synergy slots is a HardViolation (H5: at most one, ever)", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      budgets,
      synergySlots: synergySlotsWith({
        5: { unlocked: true, fuseBadgeId: "float-game" },
        6: { unlocked: true, reactionBadgeId: "float-game" },
      }),
      refundTrigger: "legendByAnyMeans",
    };
    expect(validateLoadout(state).errors).toEqual([
      {
        kind: "badgeHoldsMultipleSynergyRoles",
        badgeId: "float-game",
        occurrences: [
          { synergySlotId: 5, role: "fuse", badgeId: "float-game" },
          { synergySlotId: 6, role: "reaction", badgeId: "float-game" },
        ],
      },
    ]);
  });

  it("the same badge as both fuse and reaction in ONE synergy slot reports both violation kinds", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      budgets,
      synergySlots: synergySlotsWith({
        5: { unlocked: true, fuseBadgeId: "float-game", reactionBadgeId: "float-game" },
      }),
      refundTrigger: "legendByAnyMeans",
    };
    const kinds = validateLoadout(state).errors.map((violation) => violation.kind);
    expect(kinds).toContain("sameBadgeBothRolesInOneSynergySlot");
    expect(kinds).toContain("badgeHoldsMultipleSynergyRoles");
  });

  it("an assignment sitting on a LOCKED synergy slot is NOT a violation — legitimate re-locked state; the boost is simply not live", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      budgets,
      synergySlots: synergySlotsWith({ 5: { unlocked: false, fuseBadgeId: "float-game" } }),
      refundTrigger: "legendByAnyMeans",
    };
    expect(validateLoadout(state).errors).toEqual([]);
    expect(categoryLedgerAt(state, "current", "Finishing").refunded).toBe(0);
  });

  it("an unknown badge id in the loadout throws UnknownBadgeError — loud, never skipped (H6 class)", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "not-a-badge", purchasedLevel: "gold" }],
      budgets,
      synergySlots: createDefaultSynergySlots(),
      refundTrigger: "legendByAnyMeans",
    };
    expect(() => validateLoadout(state)).toThrow(UnknownBadgeError);
  });
});
