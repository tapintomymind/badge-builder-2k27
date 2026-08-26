// @vitest-environment jsdom
/**
 * F8-S2 group 4 — the `Purchased` filter chip.
 *
 * The roster's COMPANION, not its substitute: a card is ~298px wide and a
 * roster row is one line. The roster is what you read beside a console; this
 * is what you click when you want to CHANGE something. The shipped four
 * facets (tier / category / legal / affordable-at-≥-X) could not express
 * "show me just my loadout", so the only purchased-only view in the app was
 * scrolling 53 cards looking for four.
 *
 * The bar STILL contains zero filter arithmetic — that is asserted here on
 * the source, not assumed.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { writeAutosave } from "../../src/persist/local-storage";
import {
  activeFilterCount,
  defaultFilterState,
} from "../../src/ui/grid/FilterBar";
import { srcSources, stripComments } from "../helpers/test-utils";
import { f8Rig } from "./f8-fixture";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

function setSwitch(name: string, on: boolean) {
  const control = screen.getByRole("switch", { name }) as HTMLInputElement;
  if (control.checked !== on) fireEvent.click(control);
}

function shownCount(): number {
  const status = screen.getByText(/of \d+ badges shown/);
  return Number.parseInt(/^(\d+) of/.exec(status.textContent ?? "")?.[1] ?? "-1", 10);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("4 — the Purchased facet", () => {
  it("defaults off, counts as one facet, and Clear all resets it", () => {
    expect(defaultFilterState().purchasedOnly).toBe(false);
    expect(activeFilterCount(defaultFilterState())).toBe(0);
    expect(activeFilterCount({ ...defaultFilterState(), purchasedOnly: true })).toBe(1);
    // It composes with the four shipped facets rather than replacing one.
    expect(
      activeFilterCount({
        ...defaultFilterState(),
        purchasedOnly: true,
        legalOnly: true,
        tiers: ["A"],
        affordableAtLeast: "bronze",
      }),
    ).toBe(4);
  });

  it("on → ONLY purchased badges render as cards", SLOW, () => {
    const rig = f8Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    expect(shownCount()).toBe(shippedDataset.badges.length);

    setSwitch("Purchased", true);
    expect(shownCount()).toBe(rig.loadout.length);
    // The count is the engine's loadout, and the NAMES are the loadout's too.
    const purchased = new Set(rig.loadout.map((entry) => entry.badgeId));
    const onScreen = new Set(
      [...document.querySelectorAll(".badge-card .badge-card__name")].map(
        (node) => node.textContent,
      ),
    );
    for (const badge of shippedDataset.badges) {
      expect(onScreen.has(badge.name), badge.name).toBe(purchased.has(badge.id));
    }
    // The bar reads one active facet…
    expect(document.querySelector(".filter-bar__count")?.textContent).toContain("1 filter");

    // …and Clear all puts it back.
    // The BAR's own Clear all — EmptyResults renders one too.
    fireEvent.click(document.querySelector(".filter-bar__clear") as HTMLElement);
    expect(shownCount()).toBe(shippedDataset.badges.length);
  });

  it("composes with a shipped facet rather than overriding it", SLOW, () => {
    const rig = f8Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    setSwitch("Purchased", true);
    const purchasedOnly = shownCount();

    // Tier C ∧ purchased ⊂ purchased. Two of the four fixture purchases are
    // tier C, and the intersection is computed from the dataset, not typed.
    fireEvent.click(screen.getByRole("button", { name: "C" }));
    const expected = rig.loadout.filter(
      (entry) =>
        shippedDataset.badges.find((badge) => badge.id === entry.badgeId)?.tier === "C",
    ).length;
    expect(shownCount()).toBe(expected);
    expect(shownCount()).toBeLessThan(purchasedOnly);
  });

  it("FilterBar still contains ZERO filter arithmetic", () => {
    // The predicate lives in App.tsx's badgeVisible, against engine outputs.
    // If it migrates here the bar starts owning rules, which is the thing
    // §3.4 kept out of it in the first place.
    const bar = stripComments(srcSources["/src/ui/grid/FilterBar.tsx"] as string);
    for (const forbidden of ["loadout", "validateBadge", "whatIf", "remainingPoints", "shippedDataset"]) {
      expect(bar, forbidden).not.toContain(forbidden);
    }
    // …and App.tsx is where the purchased predicate actually is.
    const app = stripComments(srcSources["/src/App.tsx"] as string);
    expect(app).toContain("filters.purchasedOnly");
  });
});
