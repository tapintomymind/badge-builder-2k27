// @vitest-environment jsdom
/**
 * FilterBar + EmptyResults (design-spec §3.4, impl-brief M4 #7).
 *
 * Pins: full chrome at zero state (`0 filters` + result count always
 * rendered), the affordability filter ELEVATED as the second control, the
 * pinned affordability semantics (∃ L ≥ X: L ≤ maxPurchasableLevel ∧
 * whatIf ≤ remaining), per-category EmptyResults keeping the ledger header,
 * and the all-empty state keeping the FilterBar and rails live.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

function cardCount(): number {
  return document.querySelectorAll(".badge-card").length;
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("zero state — full chrome", () => {
  it("shows 0 filters, Clear all, and the result count at rest", () => {
    render(<App />);
    expect(screen.getByText(/0/, { selector: ".filter-bar__count .num" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeTruthy();
    expect(screen.getByText("53 of 53 badges shown")).toBeTruthy();
    expect(cardCount()).toBe(53);
  });

  it("the affordability filter is the SECOND control in the bar", () => {
    render(<App />);
    const controls = document.querySelector(".filter-bar__controls");
    expect(controls).not.toBeNull();
    const second = controls?.children[1];
    expect(second?.textContent).toContain("Affordable at ≥");
  });
});

describe("tier filter", () => {
  it("tier chips are aria-pressed toggles that narrow the grid (22 A badges)", () => {
    render(<App />);
    const chipA = screen.getByRole("button", { name: "A", pressed: false });
    fireEvent.click(chipA);
    expect(screen.getByRole("button", { name: "A", pressed: true })).toBeTruthy();
    expect(screen.getByText("22 of 53 badges shown")).toBeTruthy();
    expect(cardCount()).toBe(22);
    const count = document.querySelector(".filter-bar__count");
    expect(count?.textContent).toContain("1 filter ·");
  });
});

describe("affordability filter (pinned semantics: whatIf ≤ remaining)", () => {
  it("with a zero budget NOTHING is affordable — all-empty keeps full chrome", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Affordable at ≥"), { target: { value: "bronze" } });
    expect(screen.getByText("0 of 53 badges shown")).toBeTruthy();
    expect(cardCount()).toBe(0);
    // The single centered message replaces the grid; FilterBar stays live.
    expect(document.querySelector(".empty-results--all")).not.toBeNull();
    expect(screen.getByText("No badges match the current filters.")).toBeTruthy();
    expect(screen.getByLabelText("Affordable at ≥")).toBeTruthy();
    // Clear all restores everything.
    fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0] as HTMLElement);
    expect(cardCount()).toBe(53);
  });

  it("with points entered, shows exactly the badges with an affordable level ≥ X", () => {
    // Close 90 → Float Game caps at Gold (A tier: Gold total 6 ≤ 16). Bail
    // Out needs 85 Pass Acc — nothing affordable there at any level.
    expect(
      writeAutosave(
        makeRig({
          attributes: { close: 90 },
          budgets: { Finishing: { points: 16, equipSlots: 3 } },
        }),
      ).ok,
    ).toBe(true);
    render(<App />);
    fireEvent.change(screen.getByLabelText("Affordable at ≥"), { target: { value: "gold" } });
    const shown = [...document.querySelectorAll(".badge-card__name")].map(
      (node) => node.textContent,
    );
    expect(shown).toContain("Float Game");
    expect(shown).not.toContain("Bail Out");
    // The status line agrees with the DOM.
    expect(screen.getByText(`${shown.length} of 53 badges shown`)).toBeTruthy();
  });
});

describe("legal-for-my-build filter", () => {
  it("hides height-blocked badges and badges with no purchasable level", () => {
    // 78in build, only Close 90: Float Game legal; Bail Out (Pass Acc) has
    // no reachable level; Mini Marksman (5'9–6'4) is height-blocked.
    expect(writeAutosave(makeRig({ attributes: { close: 90 } })).ok).toBe(true);
    render(<App />);
    fireEvent.click(screen.getByRole("switch", { name: "Legal for my build" }));
    const shown = [...document.querySelectorAll(".badge-card__name")].map(
      (node) => node.textContent,
    );
    expect(shown).toContain("Float Game");
    expect(shown).not.toContain("Bail Out");
    expect(shown).not.toContain("Mini Marksman");
    expect(screen.getByText(`${shown.length} of 53 badges shown`)).toBeTruthy();
  });
});

describe("category filter + per-category EmptyResults", () => {
  it("unchecking a category keeps its section header (the ledger is still true) with the empty body", () => {
    render(<App />);
    fireEvent.click(screen.getByText(/^Category · 6$/));
    fireEvent.click(screen.getByRole("checkbox", { name: "Finishing" }));
    expect(screen.getByText("Category · 5 of 6")).toBeTruthy();
    expect(screen.getByText("42 of 53 badges shown")).toBeTruthy(); // 53 − 11

    // The Finishing section still renders its ledger header…
    const section = document.querySelector("#cat-finishing");
    expect(section?.querySelector(".category-ledger")).not.toBeNull();
    // …with the EmptyResults body instead of cards.
    expect(section?.querySelector(".empty-results")).not.toBeNull();
    expect(section?.querySelectorAll(".badge-card")).toHaveLength(0);
  });
});
