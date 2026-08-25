/**
 * Ledger tests (H2). The structural property under test: every number is a
 * PURE FUNCTION OF CURRENT STATE. No accumulator exists, so the
 * refund-then-downgrade double-count class cannot occur — recomputing from
 * the same state always yields the same numbers.
 */

import { describe, expect, it } from "vitest";
import {
  badgeSlotsCapacityUnset,
  categoryLedger,
  equipSlotsUsed,
  refunded,
  remainingPoints,
  spent,
  totalCost,
} from "../src/engine/ledger";
import { overByBadgePoints, overByBadgeSlots } from "../src/ui/grid/CategoryLedger";
import { srcSources, stripComments } from "./helpers/test-utils";
import type { LedgerState } from "../src/engine/ledger";
import type { Budget, LoadoutEntry } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";

function makeBudgets(points: number, equipSlots: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { points, equipSlots }]),
  ) as Record<Category, Budget>;
}

/** Spot-checked badges with known tiers:
 *  float-game (Finishing, A), posterizer (Finishing, A),
 *  deadeye (Shooting, A), glove (Defense, B), sync-snatcher (Rebounding, C). */
function makeState(loadout: LoadoutEntry[], overrides: Partial<LedgerState> = {}): LedgerState {
  return {
    loadout,
    budgets: makeBudgets(16, 3),
    refundTrigger: "legendByAnyMeans",
    ...overrides,
  };
}

describe("ledger: spent / remainingPoints / totalCost are derived from state", () => {
  const loadout: LoadoutEntry[] = [
    { badgeId: "float-game", purchasedLevel: "gold" }, // A gold = 6
    { badgeId: "posterizer", purchasedLevel: "bronze" }, // A bronze = 3
    { badgeId: "deadeye", purchasedLevel: "hof" }, // A hof = 7
  ];

  it("spent(category) sums total-to-own costs in that category only", () => {
    const state = makeState(loadout);
    expect(spent(state, "Finishing")).toBe(9); // 6 + 3
    expect(spent(state, "Shooting")).toBe(7);
    expect(spent(state, "Defense")).toBe(0);
  });

  it("remainingPoints = pool − spent + refunds (the seed's formula)", () => {
    const state = makeState(loadout);
    expect(remainingPoints(state, "Finishing")).toBe(16 - 9);
    expect(remainingPoints(state, "Shooting")).toBe(16 - 7);
  });

  it("remainingPoints may go NEGATIVE — overspend is a SOFT violation (H4), warned, never blocked", () => {
    const state = makeState(loadout, { budgets: makeBudgets(5, 3) });
    expect(remainingPoints(state, "Finishing")).toBe(5 - 9);
  });

  it("totalCost sums the whole loadout across categories", () => {
    expect(totalCost(makeState(loadout))).toBe(16);
  });

  it("equipSlotsUsed counts loadout entries per category — purchased ≡ equipped (H1)", () => {
    const state = makeState(loadout);
    expect(equipSlotsUsed(state, "Finishing")).toBe(2);
    expect(equipSlotsUsed(state, "Shooting")).toBe(1);
    expect(equipSlotsUsed(state, "Rebounding")).toBe(0);
  });

  it("recomputing from the same state yields identical numbers (pure, no accumulator)", () => {
    const state = makeState(loadout);
    const first = categoryLedger(state, "Finishing");
    const second = categoryLedger(state, "Finishing");
    expect(first).toEqual(second);
  });

  it("a downgrade is a state change, not a transaction: the ledger of the resulting state stands alone (double-count impossible by construction)", () => {
    const before = makeState(loadout);
    const after = makeState([
      { badgeId: "float-game", purchasedLevel: "bronze" }, // gold → bronze
      { badgeId: "posterizer", purchasedLevel: "bronze" },
      { badgeId: "deadeye", purchasedLevel: "hof" },
    ]);
    expect(spent(before, "Finishing")).toBe(9);
    // After state is evaluated from scratch: 3 + 3. No memory of the refund path.
    expect(spent(after, "Finishing")).toBe(6);
    expect(remainingPoints(after, "Finishing")).toBe(16 - 6);
  });
});

describe("ledger: refunds behind the refundTrigger config seam (seed Open item #1)", () => {
  it("default legendByAnyMeans: no refund fires in M1 — purchased levels cannot reach Legend and no synergy behavior exists yet", () => {
    const state = makeState([{ badgeId: "deadeye", purchasedLevel: "hof" }]);
    expect(refunded(state, "Shooting")).toBe(0);
    expect(remainingPoints(state, "Shooting")).toBe(16 - 7);
  });

  it("hofOrAbove: a purchased-HOF badge refunds its full spent cost to its OWN category pool", () => {
    const state = makeState(
      [
        { badgeId: "deadeye", purchasedLevel: "hof" }, // Shooting, A hof = 7
        { badgeId: "glove", purchasedLevel: "gold" }, // Defense, B gold = 5 — below trigger
      ],
      { refundTrigger: "hofOrAbove" },
    );
    expect(refunded(state, "Shooting")).toBe(7);
    expect(refunded(state, "Defense")).toBe(0);
    // Refund returns to the pool for re-spending: pool − spent + refunded.
    expect(remainingPoints(state, "Shooting")).toBe(16 - 7 + 7);
  });

  it("the effectiveLevelFor seam lets M2 wire synergy-boosted Legend without changing the ledger: injected legend fires legendByAnyMeans", () => {
    const state = makeState([{ badgeId: "sync-snatcher", purchasedLevel: "gold" }], {
      effectiveLevelFor: () => "legend",
    });
    // sync-snatcher: Rebounding, C gold = 4 — refund equals what was SPENT.
    expect(refunded(state, "Rebounding")).toBe(4);
    expect(remainingPoints(state, "Rebounding")).toBe(16 - 4 + 4);
  });

  it("the seam defaults to the purchased level when absent", () => {
    const state = makeState([{ badgeId: "sync-snatcher", purchasedLevel: "gold" }]);
    expect(refunded(state, "Rebounding")).toBe(0);
  });
});

/* ---------------------------------------- F8-E1: the badgeSlotsCapacityUnset hoist -- */

describe("badgeSlotsCapacityUnset — hoisted out of CategoryLedger.tsx, behaviour identical", () => {
  it("0 is UNSET; every positive capacity is set", () => {
    expect(badgeSlotsCapacityUnset({ equipSlots: 0, points: 10 })).toBe(true);
    for (let capacity = 1; capacity <= 8; capacity += 1) {
      expect(badgeSlotsCapacityUnset({ equipSlots: capacity, points: 10 })).toBe(false);
    }
  });

  it("it reads the capacity ONLY — the points pool is irrelevant to the ruling", () => {
    expect(badgeSlotsCapacityUnset({ equipSlots: 0, points: 0 })).toBe(true);
    expect(badgeSlotsCapacityUnset({ equipSlots: 3, points: 0 })).toBe(false);
  });

  it("the UI's shipped over-by strings still behave identically post-hoist", () => {
    const readout = { spent: 9, refunded: 0, remainingPoints: -2, equipSlotsUsed: 4 };
    // Unset capacity: NO overflow string, ever (0 = unset, never zero capacity).
    expect(overByBadgeSlots(readout, { equipSlots: 0, points: 7 })).toBeNull();
    // Genuine overflow still reports.
    expect(overByBadgeSlots(readout, { equipSlots: 3, points: 7 })).toBe("over by 1 ⚠");
    // Within capacity reports nothing.
    expect(overByBadgeSlots(readout, { equipSlots: 4, points: 7 })).toBeNull();
    // Points over-by is untouched by the hoist.
    expect(overByBadgePoints(readout)).toBe("over by 2 ⚠");
  });

  it("NO re-export shim survives in the UI module — the layering inversion is gone", () => {
    const source = srcSources["/src/ui/grid/CategoryLedger.tsx"] as string;
    expect(stripComments(source)).not.toContain("export function badgeSlotsCapacityUnset");
    expect(source).toContain('from "../../engine/ledger"');
  });
});
