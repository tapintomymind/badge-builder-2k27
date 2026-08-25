// @vitest-environment jsdom
/**
 * CategoryLedger (design-spec §3.4, scope.md §3 H4). The numbers rendered
 * are ENGINE readouts (categoryLedgerAt) — these tests feed real loadouts
 * through the engine and assert the rendering, including the soft-red
 * overflow treatment that never disables anything.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import { categoryLedgerAt } from "../../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../../src/engine/synergy-ledger";
import type { Budget } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { CategoryLedger } from "../../src/ui/grid/CategoryLedger";

function makeBudgets(finishing: Budget): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      category === "Finishing" ? finishing : { equipSlots: 0, points: 0 },
    ]),
  ) as Record<Category, Budget>;
}

/** Two Finishing badges: Float Game (A, gold = 6) + Aerial Wizard (C,
 * bronze = 1) → spent 7, Badge Slots used 2. All engine-computed. */
function makeState(finishingBudget: Budget): SynergyLedgerState {
  return {
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    ],
    budgets: makeBudgets(finishingBudget),
    synergySlots: createDefaultSynergySlots(null),
    refundTrigger: "legendByAnyMeans",
  };
}

function renderLedger(finishingBudget: Budget) {
  const state = makeState(finishingBudget);
  const readout = categoryLedgerAt(state, "current", "Finishing");
  render(
    <CategoryLedger
      category="Finishing"
      readout={readout}
      budget={finishingBudget}
      headingId="h-fin"
    />,
  );
  return readout;
}

describe("CategoryLedger — engine readouts rendered", () => {
  it("renders spent / pool, left, refunded, and Badge Slots used", () => {
    renderLedger({ points: 16, equipSlots: 3 });
    expect(screen.getByRole("heading", { name: "Finishing" })).toBeTruthy();
    expect(screen.getByText("7 / 16")).toBeTruthy(); // spent / pool
    expect(screen.getByText("9")).toBeTruthy(); // left = 16 − 7 + 0
    expect(screen.getByText("0")).toBeTruthy(); // refunded
    expect(screen.getByText("2 / 3")).toBeTruthy(); // Badge Slots
    expect(document.querySelector(".category-ledger--over")).toBeNull();
  });

  it("meter reflects spent against the pool", () => {
    renderLedger({ points: 16, equipSlots: 3 });
    const meter = screen.getByRole("meter", { name: "Finishing Badge Points" });
    expect(meter.getAttribute("aria-valuenow")).toBe("7");
    expect(meter.getAttribute("aria-valuemax")).toBe("16");
  });
});

describe("CategoryLedger — H4 soft overflow: red warning, no blocking", () => {
  it("points overspend renders `over by N ⚠` soft-red, never a disabled control", () => {
    // Pool 5 < spent 7 → over by 2; capacity 1 < used 2 → over by 1.
    renderLedger({ points: 5, equipSlots: 1 });
    expect(screen.getByText("over by 2 ⚠")).toBeTruthy();
    expect(screen.getByText("over by 1 ⚠")).toBeTruthy();
    expect(document.querySelector(".category-ledger--over")).not.toBeNull();
    // The over-by texts carry the danger class (soft-red), and there is no
    // disabled control anywhere in the ledger — it is a status bar, and the
    // H4 ruling forbids the Budget class from ever disabling anything.
    for (const el of document.querySelectorAll(".ledger-over")) {
      expect(el.className).toContain("ledger-over");
    }
    expect(document.querySelector("[disabled]")).toBeNull();
    // Overflow is shape too: the meter grows its hatched over-bar.
    expect(document.querySelector(".meter__overflow")).not.toBeNull();
  });
});
