// @vitest-environment jsdom
/**
 * F8-S2 group 2 — H2, the roster's column contract. THE SHIP GATE FOR THIS
 * SLICE, and state 29's engine-side twin.
 *
 * `tests/ui/overlays.test.tsx` (RUN-never-edit) already compares the WHOLE
 * `.summary` subtree across the four overlay combinations. This file is
 * ADDITIONAL, not a replacement: it says WHICH columns and WHY, so a future
 * failure names the defect instead of only reporting that a large string
 * moved.
 *
 * WHY THERE IS NO LABELLED PROJECTION ELEMENT IN THE ROSTER, and it is a
 * finding rather than an omission. §14.6 permits one optional per-row
 * projection. It cannot ship: `overlays.test.tsx` compares `.summary` as ONE
 * node's textContent, not a column list, so ANY overlay-dependent node
 * anywhere inside `.summary` reddens a gate this slice may not edit. The
 * roster therefore consumes `buildSummary` only — a selector with no overlay
 * parameter — and is invariant end to end. Re-cutting the gate's selector
 * list to admit a labelled projection is a design question for a later
 * slice; this file pins the absence so it stays a decision rather than
 * becoming an accident.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { buildSummary } from "../../src/engine/summary";
import { shippedDataset } from "../../src/engine/dataset";
import { writeAutosave } from "../../src/persist/local-storage";
import { F8_BADGES, f8LedgerState, f8Rig } from "./f8-fixture";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

/**
 * State 28's build, with the two overlays wired to genuinely DIFFERENT
 * things — a vacuous invariance test is worse than none:
 *   Synergy Slot 1 is TEMPORARY, so season-reset kills its Fuse boost and,
 *     under `onFuse`, the refund with it — the ledger projection row fires.
 *   Synergy Slot 5 holds the Reaction, so `reactionsActive` moves a card.
 */
function h2Rig() {
  return f8Rig({
    refundTrigger: "onFuse",
    synergyPatches: {
      1: { unlocked: true, magnitude: 1, fuseBadgeId: F8_BADGES.fused },
      5: { unlocked: true, reactionBadgeId: F8_BADGES.reacting },
    },
  });
}

function setSwitch(name: string, on: boolean) {
  const control = screen.getByRole("switch", { name }) as HTMLInputElement;
  if (control.checked !== on) fireEvent.click(control);
}

function textsOf(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map((node) => node.textContent ?? "");
}

/** Everything §14.6 rules overlay-INVARIANT, named column by column. */
function invariantColumns() {
  return {
    purchasedLevel: textsOf(".summary-roster__level"),
    cost: textsOf(".summary-roster__cost"),
    effectiveLevel: textsOf(".summary-roster__effective"),
    rosterFoot: textsOf(".summary-roster__foot"),
    staleDisclosure: textsOf(".summary-roster__stale"),
    legacyTables: textsOf(".summary__table"),
    synergyDigest: textsOf(".synergy-digest"),
    textBlock: [
      (document.querySelector(".summary__copy-text") as HTMLTextAreaElement | null)?.value ?? "",
    ],
    wholeSummary: textsOf(".summary"),
  };
}

const COMBINATIONS = [
  { reactions: false, season: false },
  { reactions: true, season: false },
  { reactions: false, season: true },
  { reactions: true, season: true },
] as const;

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("H2 — the roster is byte-identical under every overlay combination", () => {
  it("purchased level, cost, effective level, both <tfoot>s and both legacy tables never move", SLOW, () => {
    const rig = h2Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);

    const baseline = invariantColumns();
    // The columns exist — an empty selector list would make this vacuous.
    expect(baseline.purchasedLevel.length).toBe(rig.loadout.length);
    expect(baseline.cost.length).toBe(rig.loadout.length);
    expect(baseline.rosterFoot.length).toBeGreaterThanOrEqual(2);
    expect(baseline.legacyTables).toHaveLength(2);
    expect(baseline.textBlock[0]).not.toBe("");

    for (const combination of COMBINATIONS) {
      setSwitch("Reactions activated", combination.reactions);
      setSwitch("Season-reset preview", combination.season);
      expect(invariantColumns(), JSON.stringify(combination)).toEqual(baseline);
    }
  });

  it("PROOF THE TOGGLES DID SOMETHING — the invariance is not vacuous", SLOW, () => {
    const rig = h2Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);

    setSwitch("Reactions activated", true);
    // A card level moved…
    expect(screen.getByText(/Activated:/)).toBeTruthy();
    setSwitch("Reactions activated", false);

    setSwitch("Season-reset preview", true);
    // …and the ledger grew its labelled projection row, OUTSIDE .summary.
    const projections = [...document.querySelectorAll(".category-ledger__projection")];
    expect(projections.length).toBeGreaterThan(0);
    expect(projections[0]?.textContent).toContain("After season reset");
    expect(document.querySelector(".summary")?.contains(projections[0]!)).toBe(false);
  });

  it("the roster renders NO projection element, under any overlay", SLOW, () => {
    const rig = h2Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    for (const combination of COMBINATIONS) {
      setSwitch("Reactions activated", combination.reactions);
      setSwitch("Season-reset preview", combination.season);
      expect(
        document.querySelectorAll(".summary-roster__projection"),
        JSON.stringify(combination),
      ).toHaveLength(0);
      // Nor any of the words a projection would carry, inside .summary.
      const summaryText = document.querySelector(".summary")?.textContent ?? "";
      expect(summaryText).not.toContain("After season reset");
      expect(summaryText).not.toContain("Activated:");
    }
  });

  it("the effective-level column is the NEUTRAL overlay, not `activatesTo`", SLOW, () => {
    // THE REACHABLE BUG, named: consuming synergyProjections()'s
    // `activatesTo` into the roster's eff column looks completely reasonable
    // and reddens the gate. The Reaction holder is the witness — under the
    // neutral overlay it is unboosted, and its cell must say so at all times.
    const rig = h2Rig();
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    const summary = buildSummary(f8LedgerState(rig), rig.build, shippedDataset);
    const reacting = summary.categories
      .flatMap((category) => category.rows)
      .find((row) => row.badgeId === F8_BADGES.reacting)!;
    expect(reacting.synergyRole?.kind).toBe("reaction");
    expect(reacting.committedEffectiveLevel).toBe(reacting.purchasedLevel);

    const table = within(document.querySelector(".summary-roster") as HTMLElement).getByRole(
      "table",
      { name: reacting.category },
    );
    const cell = within(table)
      .getByRole("rowheader", { name: reacting.name })
      .closest("tr")
      ?.querySelector(".summary-roster__effective");
    expect(cell?.textContent).toBe("—");

    setSwitch("Reactions activated", true);
    expect(
      (
        document
          .querySelector(".summary-roster") as HTMLElement
      ).querySelector(".summary-roster__effective")?.parentElement,
    ).not.toBeNull();
    expect(cell?.textContent).toBe("—");
  });
});
