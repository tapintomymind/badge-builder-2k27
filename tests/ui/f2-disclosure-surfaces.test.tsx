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
 * D1 — the rail readout colours PER METRIC with the in-grid ledger's own
 *      "over by N ⚠" strings (PRE-FIX one over metric painted both metrics
 *      --danger with no glyph and no over-by — colour alone, on numbers
 *      that were 68 points UNDER budget). R12: the rail surface is the
 *      TotalsStrip, the Ledger overview's successor — same engine readouts,
 *      same string builders, so the contract moves surface, not substance.
 * D2 — the Build panel auto-collapses once, below 1280, the first time the
 *      build has non-zero values; the latch never overrides the user again.
 * F  — "0 = unset" Badge Slots capacity: NO overflow warning on any surface
 *      while capacity is unset; ONE neutral hint per category instead.
 * E  — the JumpNav panel chips render at the FRONT of the row, below the
 *      workbench gate (R12: at L they are not rendered at all — the panels
 *      they reach are permanently on screen in the build rail).
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { serializeSavedBuild } from "../../src/engine/serialization";
import type { LoadoutValidation } from "../../src/engine/validate-loadout";
import { readUiSectionOpen, writeAutosave, writeUiSectionOpen } from "../../src/persist/local-storage";
import { STORAGE_SCOPE_LINE } from "../../src/ui/builds/BuildManager";
import { SummaryPanel } from "../../src/ui/summary/SummaryPanel";
import { importBuildFile } from "./import-route";
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

/** Shared by D2 and E (R12): jsdom has no matchMedia, so the App renders the
 * L workbench shape by default; stubbing which queries MATCH is how a test
 * chooses its band. `[]` matches nothing → L; `["(max-width: 1279px)"]` → M. */
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
        // The count and the ids come from the HAND-BUILT violation above, not
        // from the ratified set — this fixture never touches the engine. Only
        // the trailing ratified-set sentence moves with [A7].
        "3 Synergy Slots are designated +2 (Synergy Slots 1, 2, 3) — at most 2 allowed. " +
          "Synergy Slots 7 and 8 are 2K's ratified +2, so they are not the ones to clear.",
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
    // The read is driven deterministically (tests/ui/import-route.ts): no
    // wall-clock findByRole poll stands between the change event and the
    // dialog, so CPU contention cannot decide this test.
    const dialog = await importBuildFile(serializeSavedBuild(rig));
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
    // R12 slice 2 shortened the VISIBLE role pill to the mockup's form; the
    // accessible name still says `Fuse · Synergy Slot 5 +1` in full.
    expect(within(card).getByText("Fuse S5")).toBeTruthy();
    // Remove the purchase via the pip control.
    fireEvent.keyDown(within(card).getByRole("radio", { name: /^Gold, current level/ }), {
      key: "Escape",
    });
    expect(within(card).getByText("Not purchased")).toBeTruthy();
    // PRE-FIX: slot 5 still held fuseBadgeId="float-game" — the chip stayed
    // on an unpurchased card, validateLoadout errored invisibly, and a
    // re-purchase silently re-attached the boost.
    expect(within(card).queryByText("Fuse S5")).toBeNull();
    expect(within(card).queryByText(/Fuse · Synergy Slot 5/)).toBeNull();
    expect(screen.queryByText(/Invalid loadout state/)).toBeNull();
    // Re-purchasing at Bronze does NOT resurrect the fuse.
    fireEvent.click(within(card).getByRole("radio", { name: /^Bronze/ }));
    expect(within(card).getByText("Now Bronze")).toBeTruthy();
    expect(within(card).queryByText(/Fused to/)).toBeNull();
  });
});

describe("D1 — rail TotalsStrip: per-metric strings, danger only where genuinely over", () => {
  it("an over-Badge-Slots / under-points category reddens ONLY the capacity metric, with text", () => {
    // Finishing: 99-token pool (deeply under budget), 1 Badge Slot, two
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
    // R12: the rail Ledger overview is retired; the per-metric contract now
    // holds on its successor, the build rail's TotalsStrip — same engine
    // readouts, same overByBadgePoints/overByBadgeSlots builders.
    const cell = document.querySelector('.totals-strip__cell[data-category="Finishing"]');
    if (!(cell instanceof HTMLElement)) throw new Error("Finishing totals-strip cell missing");
    // The strip's fixed metric order: Badge Tokens first, Badge Slots second.
    const [points, capacity] = [...cell.querySelectorAll(".totals-strip__metric")];
    if (!(points instanceof HTMLElement) || !(capacity instanceof HTMLElement)) {
      // PRE-FIX (P0-1's shape): one combined span, `ledger-over` on the whole
      // thing — the per-metric split is the fix under test.
      throw new Error("per-metric spans missing");
    }
    // 7/99 is UNDER budget: never danger, no over-by. (classList, not a
    // substring check — a class NAME containing "ledger-over" as a substring
    // must not pass as the token.)
    expect(points.classList.contains("ledger-over")).toBe(false);
    expect(points.textContent).toBe("7/99");
    // 2/1 IS over: danger + the ⚠ glyph, and the sr-only sentence carries the
    // in-grid ledger's own words — never colour alone. Whole-content equality
    // (whitespace-normalized), so no second phrasing can hide in the node.
    expect(capacity.classList.contains("ledger-over")).toBe(true);
    expect((capacity.textContent ?? "").replace(/\s+/g, " ").trim()).toBe(
      "2/1 ⚠ Badge Slots over by 1 ⚠",
    );
  });
});

describe("D2 — Build panel auto-collapse below 1280 (one-shot latch)", () => {
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
    // Badge Slots capacity stays 0 (fresh boot uses zeroBudgets). R12: at
    // the jsdom-L workbench shape the base-budget grid lives behind the
    // rail's `Edit budgets…` (BudgetsDialog), so entry goes through it —
    // the same BudgetGrid, the same commit seam.
    fireEvent.click(screen.getByRole("button", { name: "Edit budgets…" }));
    commitNumber(
      screen.getByLabelText("Finishing Badge Tokens", { selector: "input" }),
      "99",
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    const pips = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    fireEvent.click(within(pips).getByRole("radio", { name: /^Gold/ }));

    const section = document.querySelector("#cat-finishing");
    if (!(section instanceof HTMLElement)) throw new Error("Finishing section missing");
    // (1) In-grid ledger: NO "over by" — PRE-FIX it rendered
    // "Badge Slots 1 / 0 · over by 1 ⚠" in danger red…
    expect(section.querySelector(".category-ledger")?.textContent).not.toContain("over by");
    // …and the ONE neutral hint renders instead.
    expect(within(section).getByText("Badge Slots capacity not set")).toBeTruthy();
    // (2) Rail TotalsStrip (R12: the Ledger overview's successor): capacity
    // shows an em-dash, never a red over-state — and with every capacity
    // unset the whole strip carries NO overflow warning of any kind.
    const cell = document.querySelector('.totals-strip__cell[data-category="Finishing"]');
    if (!(cell instanceof HTMLElement)) throw new Error("Finishing totals-strip cell missing");
    expect(cell.querySelectorAll(".totals-strip__metric")[1]?.textContent).toBe("1/—");
    const strip = document.querySelector(".totals-strip");
    expect(strip?.querySelector(".ledger-over")).toBeNull();
    expect(strip?.textContent).not.toContain("over by");
    expect(strip?.textContent).not.toContain("⚠");
    // The neutral-hint census, re-derived against the R12 DOM: ONE lede hint
    // per category (all six capacities are unset) and the strip contributes
    // none — it renders the em-dash, never a seventh sentence. (The Loadout
    // board's own six hints are pinned in f16-loadout-board.test.tsx.)
    const hints = [...document.querySelectorAll(".category-ledger__hint")];
    expect(hints).toHaveLength(6);
    for (const hint of hints) {
      expect(hint.textContent).toBe("Badge Slots capacity not set");
    }
    expect(document.querySelectorAll(".totals-strip .category-ledger__hint")).toHaveLength(0);
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

describe("E — JumpNav panel chips render at the FRONT of the row (below the gate)", () => {
  it("below the gate, the panel chips are the FIRST links, in page order", () => {
    // R12: the chips exist to REACH panels that live below the grid — the
    // M/S document flow. At L the panels are permanently on screen in the
    // build rail and App passes `panelAnchors={[]}` (asserted in the next
    // case), so the front-of-row contract is exercised where the chips
    // exist: the gate is stubbed to the M band and the REAL App wiring —
    // anchor list, order, front-loading — is what renders, not a lookalike
    // component mount.
    stubMatchMedia(["(max-width: 1279px)"]);
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const links = [...nav.querySelectorAll("a")].map((anchor) => anchor.textContent);
    // PRE-FIX: they rendered LAST — at 768 that put them at x=946+ inside a
    // 768px viewport, off-screen in an unafforded h-scroll, while being the
    // only route to Synergy/Summary below L.
    //
    // F16 added a THIRD panel — the Loadout board — between the grid and the
    // Synergy Slots panel, so the group is three chips long. What this case
    // has always been about is that the group is front-loaded and that its
    // order matches the page's, and both are still asserted; the count is
    // read off the group rather than pinned, so a fourth panel amends one
    // list here instead of failing for the wrong reason.
    const panels = ["Board", "Synergy", "Summary"];
    expect(links.slice(0, panels.length)).toEqual(panels);
    // …and the six category chips follow, none of them displaced.
    expect(links).toHaveLength(panels.length + 6);
  });

  it("at L the panel chips are NOT rendered — the six category chips stand alone (R12)", () => {
    // The workbench keeps Synergy/Summary (and the board) permanently on
    // screen, so a chip whose only job is to reach them would be a dead
    // control at exactly the width where it renders. The category chips
    // remain — the catalog column is still the one tall scroller.
    stubMatchMedia([]); // no query matches → the L workbench shape
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Categories" });
    const links = [...nav.querySelectorAll("a")].map((anchor) => anchor.textContent);
    expect(links).toHaveLength(6);
    for (const label of ["Board", "Synergy", "Summary"]) {
      expect(links).not.toContain(label);
    }
  });
});

/* ---------------------------------------------------------------------------
 * The storage-scope disclosure (STORAGE_SCOPE_LINE).
 *
 * Two facts decided this block's existence: localStorage is per-browser and
 * per-device, and a browsing-data clear destroys the build. Before this slice
 * the running app stated NEITHER — both lived only in README.md, which the
 * person who loses a build has by construction not read.
 *
 * WHAT IS PINNED, and why each one is not redundant:
 *  1. It reaches a first-time visitor with no saved builds and no dialog
 *     opened. If it only appeared once you already had something to lose, it
 *     would arrive after the moment it exists to prevent.
 *  2. It reaches the build manager, where Delete lives.
 *  3. It is the SAME string in both — the `unreadableBuildsLine` doctrine.
 *     Two surfaces stating one fact in two wordings is how the fact quietly
 *     stops being true in one of them.
 *  4. It is OUTSIDE `.summary`. That subtree is what
 *     tests/ui/overlays.test.tsx compares across all four overlay
 *     combinations, and that gate is RUN-never-edit. Static copy could not
 *     break a bit-identical comparison — but the placement is deliberate and
 *     an accidental move inside would be invisible without this assertion.
 * ------------------------------------------------------------------------ */
describe("storage-scope disclosure — stated in the app, not only in the README", () => {
  it("reaches a first visit: rendered at zero state, with no saved builds and no dialog", () => {
    render(<App />);
    const notes = screen.getAllByText(STORAGE_SCOPE_LINE);
    expect(notes.length).toBeGreaterThanOrEqual(1);
  });

  it("says both facts a user can lose work to, and names the way out", () => {
    // Asserted as CLAIMS, not as a copy snapshot: the wording may be edited,
    // but a rewrite that drops the per-device scope, the clear-destroys-it
    // consequence, or the pointer to Export has removed the reason the line
    // exists and must fail here.
    expect(STORAGE_SCOPE_LINE).toMatch(/this browser only/i);
    expect(STORAGE_SCOPE_LINE).toMatch(/another device/i);
    expect(STORAGE_SCOPE_LINE).toMatch(/clearing your browsing data/i);
    expect(STORAGE_SCOPE_LINE).toMatch(/export/i);
  });

  it("reaches the build manager, where Delete lives", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    const dialog = screen.getByRole("dialog", { name: "Manage builds" });
    // OPEN, not merely mounted: BuildManagerDialog always renders its
    // <dialog> element and toggles `open`, so a node found inside it proves
    // nothing on its own — a test that skipped this would have passed
    // against copy the user could never actually reach.
    expect(dialog.hasAttribute("open")).toBe(true);
    const note = within(dialog).getByText(STORAGE_SCOPE_LINE);
    expect(note).toBeTruthy();
    // ABOVE the list. The two facts that decide what to keep have to land
    // before the row of Delete buttons, not after them.
    const list = within(dialog).getByRole("list");
    expect(note.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("both surfaces carry ONE string — no second wording to drift", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    const rendered = screen.getAllByText(STORAGE_SCOPE_LINE);
    expect(rendered.length).toBe(2);
    for (const node of rendered) {
      expect(node.textContent).toBe(STORAGE_SCOPE_LINE);
    }
  });

  it("the Summary instance sits OUTSIDE `.summary` — the overlays gate's subtree", () => {
    const { container } = render(<App />);
    const summary = container.querySelector(".summary");
    expect(summary).not.toBeNull();
    expect(summary?.textContent ?? "").not.toContain(STORAGE_SCOPE_LINE);
    // …and it really is in the Summary section, not somewhere incidental.
    const panel = container.querySelector("#panel-summary");
    expect(panel?.textContent ?? "").toContain(STORAGE_SCOPE_LINE);
  });
});
