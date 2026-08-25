// @vitest-environment jsdom
/**
 * App integration (M3 outcome): enter a real build, watch the grid gate,
 * buy badges, watch the ledger drop, save it, reload, it comes back —
 * plus the two failure surfaces (drift banner, autosave warning).
 *
 * jsdom's real localStorage backs the persistence tests; each test starts
 * from a cleared store.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { defaultAppConfig } from "../../src/config";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { Budget, SavedBuild } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function zeroBudgets(): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 0, points: 0 }]),
  ) as Record<Category, Budget>;
}

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function floatGamePips() {
  return screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
}

function finishingLedger(): HTMLElement {
  const section = document.querySelector("#cat-finishing");
  const ledger = section?.querySelector(".category-ledger");
  if (!(ledger instanceof HTMLElement)) throw new Error("Finishing ledger not found");
  return ledger;
}

describe("zero state (design-spec §5.4)", () => {
  it("renders the full instrument: all 53 cards, no welcome wall", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Badge Builder — 2K27" })).toBeTruthy();
    expect(document.querySelectorAll(".badge-card")).toHaveLength(53);
    // All six category sections with their ledgers at 0 / 0.
    for (const category of CATEGORIES) {
      expect(document.querySelector(`#cat-${category.toLowerCase()}`)).not.toBeNull();
    }
    // No drift banner: the fresh build is stamped with the current dataset.
    expect(screen.queryByText(/Planned against dataset/)).toBeNull();
  });
});

describe("the M3 outcome: build → gate → buy → ledger → save → reload", () => {
  // Generous timeout: this whole-app walk renders App three times and sits
  // near the 5s default when the suite runs fully parallel (the F2 files
  // grew the worker pool's load); alone it runs in ~4s.
  it("walks the whole first-value path", { timeout: 20000 }, () => {
    const { unmount } = render(<App />);

    // Enter a real attribute: Close 90 gates Float Game to Gold (HOF needs 96).
    commitNumber(screen.getByLabelText("Close"), "90");
    // Enter the Finishing budget (manual, behind the deriveBudget seam).
    commitNumber(
      screen.getByLabelText("Finishing Badge Points", { selector: "input" }),
      "16",
    );
    commitNumber(
      screen.getByLabelText("Finishing Badge Slots", { selector: "input" }),
      "3",
    );

    // The pips gate correctly: Gold selectable, HOF locked with the reason.
    const pips = floatGamePips();
    const hof = within(pips).getByRole("radio", { name: /^HOF, locked/ });
    expect(hof.getAttribute("aria-label")).toContain("needs 96 Close or 95 Layup for HOF");

    // Buy Gold (tier A: total-to-own 6).
    fireEvent.click(within(pips).getByRole("radio", { name: /^Gold/ }));
    expect(screen.getByText("Now Gold")).toBeTruthy();

    // The ledger drops: spent 6 of 16, left 10, one Badge Slot of 3 used.
    const ledger = finishingLedger();
    expect(within(ledger).getByText("6 / 16")).toBeTruthy();
    expect(within(ledger).getByText("10")).toBeTruthy();
    expect(within(ledger).getByText("1 / 3")).toBeTruthy();

    // Save as a named build.
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.change(screen.getByLabelText("Name for the new build"), {
      target: { value: "Slasher v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save as new" }));

    // Reload the page (unmount + fresh mount): the build comes back.
    unmount();
    render(<App />);
    expect(screen.getByText("Now Gold")).toBeTruthy();
    expect(within(finishingLedger()).getByText("6 / 16")).toBeTruthy();
    const switcher = screen.getByLabelText("Saved builds") as HTMLSelectElement;
    expect(switcher.options[switcher.selectedIndex]?.textContent).toContain("Slasher v2");
  });

  it("card-body click cycles none → Bronze → … capped at maxPurchasableLevel", () => {
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    const card = floatGamePips().closest(".badge-card");
    if (!(card instanceof HTMLElement)) throw new Error("card not found");
    fireEvent.click(card); // none → Bronze
    expect(within(card).getByText("Now Bronze")).toBeTruthy();
    fireEvent.click(card); // → Silver
    fireEvent.click(card); // → Gold (the cap: HOF locked at Close 90)
    expect(within(card).getByText("Now Gold")).toBeTruthy();
    fireEvent.click(card); // → wraps to none, never HOF
    expect(within(card).getByText("Not purchased")).toBeTruthy();
  });
});

describe("DriftBanner (H8): dataVersion mismatch on load", () => {
  it("renders the non-blocking banner and recomputes on demand", () => {
    const oldPlan: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: "2020-01-01.1",
      savedAt: "2020-01-01T00:00:00.000Z",
      name: "Old plan",
      build: makeBuild(78, 0, { close: 90 }),
      budgets: zeroBudgets(),
      loadout: [{ badgeId: "float-game", purchasedLevel: "hof" }],
      synergy: createDefaultSynergySlots(null),
      config: defaultAppConfig,
    };
    expect(writeAutosave(oldPlan).ok).toBe(true);

    render(<App />);
    expect(
      screen.getByText(/Planned against dataset/, { exact: false }).textContent,
    ).toContain("2020-01-01.1");

    // The action RECOMPUTES against the current dataset (no diff — the old
    // dataset is not retained): planned HOF, Close 90 now caps at Gold.
    fireEvent.click(screen.getByRole("button", { name: "Re-check eligibility" }));
    expect(screen.getByText(/Float Game \(planned HOF, now Gold\)/)).toBeTruthy();

    // Never auto-migrated: the purchased pip still shows the planned HOF.
    const pips = floatGamePips();
    const hof = within(pips).getByRole("radio", { name: /^HOF, current level/ });
    expect((hof as HTMLInputElement).checked).toBe(true);
  });
});

describe("AutosaveWarning (tech-strategy §9): a throwing setItem never crashes", () => {
  it("surfaces the role=alert banner and the app keeps working", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    render(<App />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Couldn't autosave — export your build to JSON.");
    expect(within(alert).getByRole("button", { name: "Export now" })).toBeTruthy();
    // Not crashed: the instrument is still fully rendered and interactive.
    expect(document.querySelectorAll(".badge-card")).toHaveLength(53);
    commitNumber(screen.getByLabelText("Close"), "90");
    fireEvent.click(within(floatGamePips()).getByRole("radio", { name: /^Gold/ }));
    expect(screen.getByText("Now Gold")).toBeTruthy();
  });

  it("is dismissible for the session", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    render(<App />);
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
