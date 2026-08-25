// @vitest-environment jsdom
/**
 * F2 dockets C + D + F(0 = unset) + E(panel chips).
 *
 * C  — validateLoadout's HardViolations render in the SummaryPanel (PRE-FIX
 *      `validation.errors` reached no UI surface at all); the deserializer's
 *      droppedEntries report reaches the DriftBanner path on the IMPORT
 *      route (boot route pinned in boot-drift.test.tsx); removing a
 *      purchase clears its synergy role instead of stranding an
 *      engine-forbidden state.
 * D1 — the rail Ledger overview colours PER METRIC with the in-grid
 *      ledger's own "over by N ⚠" strings (PRE-FIX one over metric painted
 *      both metrics --danger with no glyph and no over-by — colour alone,
 *      on numbers that were 68 points UNDER budget).
 * D2 — the Build panel auto-collapses once, below 1280, the first time the
 *      build has non-zero values; the latch never overrides the user again.
 * F  — "0 = unset" Badge Slots capacity: NO overflow warning on any of the
 *      four surfaces while capacity is unset; ONE neutral hint instead.
 * E  — the JumpNav panel chips render at the FRONT of the row.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { serializeSavedBuild } from "../../src/engine/serialization";
import type { LoadoutValidation } from "../../src/engine/validate-loadout";
import { readUiSectionOpen, writeAutosave, writeUiSectionOpen } from "../../src/persist/local-storage";
import { SummaryPanel } from "../../src/ui/summary/SummaryPanel";
import { makeRig, budgetsWith } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function readoutsFor() {
  // A minimal, engine-shaped readouts record for direct SummaryPanel mounts.
  return Object.fromEntries(
    ["Finishing", "Shooting", "Playmaking", "Defense", "Rebounding", "Physicals"].map(
      (category) => [
        category,
        { spent: 0, refunded: 0, remainingPoints: 0, equipSlotsUsed: 0 },
      ],
    ),
  ) as Parameters<typeof SummaryPanel>[0]["readouts"];
}

describe("C — HardViolations render in the validation surface", () => {
  it("every HardViolation kind has a human-readable rendering", () => {
    const validation: LoadoutValidation = {
      errors: [
        { kind: "synergyTargetNotPurchased", synergySlotId: 5, role: "fuse", badgeId: "float-game" },
        {
          kind: "badgeHoldsMultipleSynergyRoles",
          badgeId: "float-game",
          occurrences: [
            { synergySlotId: 2, role: "reaction", badgeId: "float-game" },
            { synergySlotId: 5, role: "fuse", badgeId: "float-game" },
          ],
        },
        { kind: "sameBadgeBothRolesInOneSynergySlot", synergySlotId: 3, badgeId: "deadeye" },
        {
          kind: "tooManyPlusTwoSynergySlots",
          plusTwoSynergySlotIds: [1, 2, 3],
          maxAllowed: 2,
        },
      ],
      warnings: [],
    };
    render(
      <SummaryPanel
        loadout={[]}
        synergySlots={[]}
        budgets={budgetsWith({})}
        readouts={readoutsFor()}
        validation={validation}
        dataset={shippedDataset}
      />,
    );
    // PRE-FIX: none of these rendered anywhere — the invariant breach was
    // silent, autosaved, and exportable.
    expect(screen.getByText(/Invalid loadout state/)).toBeTruthy();
    expect(
      screen.getByText("Synergy Slot 5 Fuse references Float Game, which is not purchased."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Float Game holds 2 synergy roles: Reaction in Synergy Slot 2, Fuse in Synergy Slot 5. A badge holds at most one.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Deadeye is both Fuse and Reaction in Synergy Slot 3."),
    ).toBeTruthy();
    // [F4] The copy is EXTENDED to name Synergy Slot 7 as the ratified one and
    // therefore NOT the one to clear — the over-cap state can now come from
    // the app's own upgrade, so telling the user which +2 is not theirs to
    // move is the difference between a disclosure and a riddle.
    expect(
      screen.getByText(
        "3 Synergy Slots are designated +2 (Synergy Slots 1, 2, 3) — at most 2 allowed. " +
          "Synergy Slot 7 is 2K's ratified +2 (Build Specialization), so it is not the one to clear.",
      ),
    ).toBeTruthy();
  });

  it("no errors → no invalid-state banner", () => {
    render(
      <SummaryPanel
        loadout={[]}
        synergySlots={[]}
        budgets={budgetsWith({})}
        readouts={readoutsFor()}
        validation={{ errors: [], warnings: [] }}
        dataset={shippedDataset}
      />,
    );
    expect(screen.queryByText(/Invalid loadout state/)).toBeNull();
  });
});

describe("C — import route wires droppedEntries into the disclosure banner", () => {
  it("a same-dataVersion import with a vanished badge id discloses the strip after confirm", async () => {
    render(<App />);
    const rig = makeRig({
      attributes: { close: 90 },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "vanished-badge", purchasedLevel: "hof" },
      ],
      // SAME dataVersion — PRE-FIX the DriftBanner only fired on a
      // dataVersion mismatch, so this strip was fully silent.
    });
    const input = screen.getAllByLabelText("Import JSON")[0] as HTMLInputElement;
    const file = new File([serializeSavedBuild(rig)], "import.json", {
      type: "application/json",
    });
    fireEvent.change(input, { target: { files: [file] } });
    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));
    expect(
      screen.getByText(
        "1 badge from this build no longer exists in the dataset: vanished-badge — removed from the plan.",
      ),
    ).toBeTruthy();
    // The surviving purchase is live; the vanished one is out of the plan.
    expect(screen.getByText("Now Gold")).toBeTruthy();
  });
});

describe("C — removing a purchase clears its synergy role (no stranded HardViolation)", () => {
  it("Escape-clearing a fused badge empties the synergy position and shows no role chip", () => {
    const rig = makeRig({
      attributes: { close: 90 },
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergyPatches: { 5: { unlocked: true, fuseBadgeId: "float-game" } },
    });
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    const pips = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    const card = pips.closest(".badge-card");
    if (!(card instanceof HTMLElement)) throw new Error("Float Game card missing");
    expect(within(card).getByText(/⚡ Fuse · SS5/)).toBeTruthy();
    // Remove the purchase via the pip control.
    fireEvent.keyDown(within(card).getByRole("radio", { name: /^Gold, current level/ }), {
      key: "Escape",
    });
    expect(within(card).getByText("Not purchased")).toBeTruthy();
    // PRE-FIX: slot 5 still held fuseBadgeId="float-game" — the chip stayed
    // on an unpurchased card, validateLoadout errored invisibly, and a
    // re-purchase silently re-attached the boost.
    expect(within(card).queryByText(/⚡ Fuse · SS5/)).toBeNull();
    expect(screen.queryByText(/Invalid loadout state/)).toBeNull();
    // Re-purchasing at Bronze does NOT resurrect the fuse.
    fireEvent.click(within(card).getByRole("radio", { name: /^Bronze/ }));
    expect(within(card).getByText("Now Bronze")).toBeTruthy();
    expect(within(card).queryByText(/Fused to/)).toBeNull();
  });
});

describe("D1 — rail Ledger overview: per-metric strings, danger only where genuinely over", () => {
  it("an over-Badge-Slots / under-points category reddens ONLY the capacity metric, with text", () => {
    // Finishing: 99-point pool (deeply under budget), 1 Badge Slot, two
    // badges bought → points fine, capacity over by 1.
    const rig = makeRig({
      attributes: { close: 90, drivingDunk: 80 },
      budgets: { Finishing: { points: 99, equipSlots: 1 } },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
      ],
    });
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    const row = [...document.querySelectorAll(".ledger-overview__row")].find((candidate) =>
      candidate.textContent?.startsWith("Finishing"),
    );
    if (!(row instanceof HTMLElement)) throw new Error("Finishing overview row missing");
    const points = row.querySelector(".ledger-overview__points");
    const capacity = row.querySelector(".ledger-overview__capacity");
    if (!(points instanceof HTMLElement) || !(capacity instanceof HTMLElement)) {
      // PRE-FIX: one combined span, `ledger-over` on the whole thing.
      throw new Error("per-metric spans missing");
    }
    // 7/99 is UNDER budget: never danger, no over-by. (classList, not a
    // substring check — "ledger-overview__points" contains "ledger-over"
    // as a substring but not as a class token.)
    expect(points.classList.contains("ledger-over")).toBe(false);
    expect(points.textContent).toBe("7/99");
    // 2/1 IS over: danger + the in-grid ledger's own words — never colour alone.
    expect(capacity.classList.contains("ledger-over")).toBe(true);
    expect(capacity.textContent).toBe("2/1 over by 1 ⚠");
  });
});

describe("D2 — Build panel auto-collapse below 1280 (one-shot latch)", () => {
  function stubMatchMedia(matching: string[]) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: matching.includes(query),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  function buildDetails(): HTMLDetailsElement {
    const summaryHeading = screen.getByRole("heading", { name: "Build" });
    const details = summaryHeading.closest("details");
    if (!(details instanceof HTMLDetailsElement)) throw new Error("Build details missing");
    return details;
  }

  it("open at zero state; collapses exactly once on the first non-zero commit; latch persists", () => {
    stubMatchMedia(["(max-width: 1279px)"]);
    render(<App />);
    // Zero state: default-open (§5.4 — the full instrument, no welcome wall).
    expect(buildDetails().open).toBe(true);

    // First non-zero COMMIT (fields commit on blur — never mid-keystroke).
    commitNumber(screen.getByLabelText("Close"), "90");

    // PRE-FIX: open forever — the grid started ~2,000px down an 844px
    // viewport on the one device the requirement was written for.
    expect(buildDetails().open).toBe(false);
    expect(readUiSectionOpen("section-build-panel")).toBe(false);
    expect(readUiSectionOpen("section-build-panel.auto-collapsed")).toBe(true);

    // The user re-opens; further edits never override the choice again.
    writeUiSectionOpen("section-build-panel", true);
    commitNumber(screen.getByLabelText("Layup"), "70");
    expect(readUiSectionOpen("section-build-panel")).toBe(true);
  });

  it("an attribute commit does not collapse the setup panel, because the attributes are not in it", () => {
    // F5.4 (§16.5): THE ASSERTION IS UNCHANGED and it is now the mechanical
    // guard for the `hasValues` scoping. The old reason ("the panel lives in
    // the rail there") is false — the latch's `compact` term is gone and the
    // latch fires at every width now.
    //
    // The new reason is scoping. No query matches → isLarge = true →
    // withAttributes = false → the 20 sliders live in the PANE, so the
    // panel's own hasValues ignores them and the latch never arms. Drop the
    // scoping and the user drags a slider on the left while a panel collapses
    // on the right — and this line goes red immediately.
    stubMatchMedia([]); // no query matches → desktop shape
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    expect(readUiSectionOpen("section-build-panel.auto-collapsed")).toBeNull();
  });
});

describe("F — '0 = unset' Badge Slots capacity, uniform across all four surfaces", () => {
  it("unset capacity: no overflow warning anywhere; one neutral hint per category", () => {
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    // A real points pool so the only candidate warning is the capacity one;
    // Badge Slots capacity stays 0 (fresh boot uses zeroBudgets).
    commitNumber(
      screen.getByLabelText("Finishing Badge Points", { selector: "input" }),
      "99",
    );
    const pips = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    fireEvent.click(within(pips).getByRole("radio", { name: /^Gold/ }));

    const section = document.querySelector("#cat-finishing");
    if (!(section instanceof HTMLElement)) throw new Error("Finishing section missing");
    // (1) In-grid ledger: NO "over by" — PRE-FIX it rendered
    // "Badge Slots 1 / 0 · over by 1 ⚠" in danger red…
    expect(section.querySelector(".category-ledger")?.textContent).not.toContain("over by");
    // …and the ONE neutral hint renders instead.
    expect(within(section).getByText("Badge Slots capacity not set")).toBeTruthy();
    // (2) Rail overview: capacity shows an em-dash, never a red over-state.
    const row = [...document.querySelectorAll(".ledger-overview__row")].find((candidate) =>
      candidate.textContent?.startsWith("Finishing"),
    );
    expect(row?.querySelector(".ledger-overview__capacity")?.textContent).toBe("1/—");
    expect(row?.querySelector(".ledger-over")).toBeNull();
    // (3) Card chip: no "Would go over Badge Slots" on unpurchased cards.
    expect(screen.queryByText("Would go over Badge Slots")).toBeNull();
    // (4) Summary chip: nothing fires (validateLoadout's warning is
    // filtered UI-side; the engine is frozen and still reports it).
    expect(document.querySelector(".summary__warning")).toBeNull();
  });

  it("summary chip suppressed for an unset-capacity category even with a synergy-role holder", () => {
    const rig = makeRig({
      attributes: { close: 90 },
      // Capacity UNSET (0) but a badge purchased AND holding a fuse role —
      // the engine reports equipSlotOverflow; the UI must not chip it.
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergyPatches: { 5: { unlocked: true, fuseBadgeId: "float-game" } },
    });
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    expect(document.querySelector(".summary__warning")).toBeNull();
    // The neutral hint still renders in the category ledger.
    const section = document.querySelector("#cat-finishing");
    if (!(section instanceof HTMLElement)) throw new Error("Finishing section missing");
    expect(within(section).getByText("Badge Slots capacity not set")).toBeTruthy();
  });

  it("an ENTERED capacity still warns (the ruling changes unset only)", () => {
    const rig = makeRig({
      attributes: { close: 90, drivingDunk: 80 },
      budgets: { Finishing: { points: 16, equipSlots: 1 } },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
      ],
    });
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    const section = document.querySelector("#cat-finishing");
    expect(section?.querySelector(".category-ledger")?.textContent).toContain("over by 1 ⚠");
    expect(section?.textContent).not.toContain("Badge Slots capacity not set");
  });
});

describe("E — JumpNav panel chips render at the FRONT of the row", () => {
  it("Synergy and Summary are the first two links", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const links = [...nav.querySelectorAll("a")].map((anchor) => anchor.textContent);
    // PRE-FIX: they rendered LAST — at 768 that put them at x=946+ inside a
    // 768px viewport, off-screen in an unafforded h-scroll, while being the
    // only route to Synergy/Summary below L.
    expect(links.slice(0, 2)).toEqual(["Synergy", "Summary"]);
  });
});
