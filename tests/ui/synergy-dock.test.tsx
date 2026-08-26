// @vitest-environment jsdom
/**
 * R12 slice 2 — the SYNERGY DOCK, the build rail's pinned foot.
 *
 * The dock is the F11 board's sibling in kind: a READ-PLUS-NAVIGATE surface
 * that renders state and moves focus and dispatches nothing. So every case
 * here is either "does it show what state says" or "does pressing it land the
 * caret in the right <fieldset>".
 *
 * THE CASE THAT IS REALLY A SHIP GATE. `assigns nothing` is not a nice-to-
 * have: the dock sits permanently on screen beside eight chips that look like
 * controls, and a chip that quietly wrote to the build would be the H8
 * failure mode with an audience. It is pinned twice — once behaviourally
 * (press every chip, the build's own surfaces are bit-identical afterwards)
 * and once structurally (the module names no mutator and takes no change
 * callback), because the behavioural half alone would pass a dock that
 * mutates only under a state this fixture does not reach.
 *
 * THE OTHER ONE IS THE BANDING. Temporary/Permanent membership is
 * `synergySlot.permanence` — the ENGINE's field — and an `id <= 4` test in
 * the dock would look right today and disagree with the engine the moment
 * `permanenceForSynergySlot` moves. The fixture asserts the rendered banding
 * against the engine's own answer rather than against a transcribed 1–4/5–8.
 */

import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { permanenceForSynergySlot } from "../../src/engine/synergy";
import type { SynergySlot, SynergySlotId } from "../../src/engine/types";
import { writeAutosave } from "../../src/persist/local-storage";
import { srcSources, stripComments } from "../helpers/test-utils";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

/** The rig every case shares: three purchased badges, Synergy Slot 1 fully
 * paired (Float Game ⇄ Deadeye), Synergy Slot 5 unlocked and empty, the other
 * six locked — so one fixture carries all three chip states at once. */
function seed(patches: Partial<Record<number, Partial<SynergySlot>>> = {}) {
  const rig = makeRig({
    attributes: { close: 90, mid: 85, drivingDunk: 80 },
    budgets: {
      Finishing: { points: 16, equipSlots: 3 },
      Shooting: { points: 12, equipSlots: 2 },
    },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "deadeye", purchasedLevel: "silver" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    ],
    synergyPatches: {
      1: { unlocked: true, fuseBadgeId: "float-game", reactionBadgeId: "deadeye" },
      5: { unlocked: true },
      ...patches,
    },
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

function dock(): HTMLElement {
  const found = document.querySelector(".synergy-dock");
  if (found === null) throw new Error("the Synergy dock did not render");
  return found as HTMLElement;
}

function chips(): HTMLElement[] {
  return [...dock().querySelectorAll(".synergy-dock__chip")] as HTMLElement[];
}

/** The chip for one Synergy Slot, found by its own aria-label rather than by
 *  index — an index would keep passing if the grid silently re-ordered. */
function chip(synergySlotId: number): HTMLElement {
  return within(dock()).getByRole("button", {
    name: new RegExp(`^Synergy Slot ${synergySlotId},`),
  });
}

function badgeName(badgeId: string): string {
  const badge = shippedDataset.badges.find((candidate) => candidate.id === badgeId);
  if (badge === undefined) throw new Error(`${badgeId} left the dataset — re-cut the fixture`);
  return badge.name;
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("R12 dock 1 — eight chips, banded by the ENGINE's permanence", () => {
  it("renders one chip per Synergy Slot, in id order, under two band labels", () => {
    seed();
    render(<App />);
    expect(chips()).toHaveLength(8);
    // The mockup's two labels, and they are the dock's own copy — the pairing
    // board's Permanent line reads "survives the season reset" and this one
    // reads "survives the reset", deliberately, so the two surfaces in one
    // scroll column never repeat a sentence verbatim.
    const bands = [...dock().querySelectorAll(".synergy-dock__bandlabel")].map(
      (node) => node.textContent,
    );
    expect(bands).toEqual([
      "Temporary — resets at season end",
      "Permanent — survives the reset",
    ]);
  });

  it("every chip sits under the band the ENGINE assigns it, not under an id test", () => {
    seed();
    render(<App />);
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8] as SynergySlotId[]) {
      expect(chip(id).getAttribute("data-band"), `Synergy Slot ${id}`).toBe(
        permanenceForSynergySlot(id),
      );
    }
    // …and the DOM order is id order within each band: the first four chips
    // follow the Temporary label, the last four follow the Permanent one.
    const ids = chips().map((node) => node.querySelector(".synergy-dock__id")?.textContent);
    expect(ids).toEqual(["S1 +1", "S2 +1", "S3 +1", "S4 +1", "S5 +1", "S6 +1", "S7 +2", "S8 +2"]);
  });

  it("the boost is READ off magnitude — a designation moves the chip", () => {
    // The F11 fixture's lesson, restated: a dock that hardcoded the shipped
    // six-(+1)/two-(+2) distribution would look right today and disagree with
    // a loaded build. Synergy Slots 7 and 8 are the RATIFIED pair, so a rig
    // that designates a third is normalised back on load — which is exactly
    // what makes the +2 pair worth reading off state rather than typing.
    seed();
    render(<App />);
    expect(chip(7).textContent).toContain("+2");
    expect(chip(8).textContent).toContain("+2");
    expect(chip(1).textContent).toContain("+1");
  });
});

describe("R12 dock 2 — the three chip states, each with a non-colour carrier", () => {
  it("an assigned Synergy Slot names BOTH badges, not ids and not one of them", () => {
    seed();
    render(<App />);
    const pair = chip(1).querySelector(".synergy-dock__pair")?.textContent;
    expect(pair).toBe(`${badgeName("float-game")} ⇄ ${badgeName("deadeye")}`);
    // The names, spelled out, so a dataset rename fails here rather than in
    // the browser.
    expect(pair).toBe("Float Game ⇄ Deadeye");
    expect(chip(1).getAttribute("data-state")).toBe("assigned");
    // The screen-reader line says the same thing without the glyph.
    expect(chip(1).getAttribute("aria-label")).toBe(
      "Synergy Slot 1, Temporary, plus 1, Fuse Float Game, Reaction Deadeye. Opens its controls.",
    );
    // THE TRUNCATION'S SECOND CARRIER. The chip is 79.5px wide and the pair
    // is clamped to two lines, so a real pair often renders as "Layup
    // Mixmaster …". Nothing is lost — the aria-label above spells it out for
    // a screen reader and the title does for everyone else. Asserted because
    // the title is invisible until someone hovers, which is exactly the kind
    // of attribute a later refactor drops without noticing.
    expect(chip(1).getAttribute("title")).toBe("Float Game ⇄ Deadeye");
    expect(chip(2).getAttribute("title")).toBe("🔒 locked");
  });

  it("a HALF-assigned Synergy Slot still names the badge it has", () => {
    seed({ 5: { unlocked: true, fuseBadgeId: "aerial-wizard" } });
    render(<App />);
    expect(chip(5).querySelector(".synergy-dock__pair")?.textContent).toBe(
      `${badgeName("aerial-wizard")} ⇄ ⊕`,
    );
    expect(chip(5).getAttribute("data-state")).toBe("assigned");
    expect(chip(5).getAttribute("aria-label")).toContain("Reaction empty");
  });

  it("an unlocked-but-empty Synergy Slot says so, and a locked one says LOCKED", () => {
    seed();
    render(<App />);
    // Unlocked, nothing assigned.
    expect(chip(5).querySelector(".synergy-dock__pair")?.textContent).toBe("⊕ empty");
    expect(chip(5).getAttribute("data-state")).toBe("empty");
    // Locked: the glyph AND the word, never the glyph alone (§6).
    expect(chip(2).querySelector(".synergy-dock__pair")?.textContent).toBe("🔒 locked");
    expect(chip(2).getAttribute("data-state")).toBe("locked");
    expect(chip(2).getAttribute("aria-label")).toBe(
      "Synergy Slot 2, Temporary, plus 1, locked. Opens its controls.",
    );
  });

  it("the count header reports assigned and unlocked, both off state", () => {
    seed();
    render(<App />);
    // "Assigned" is SynergyDigest's own predicate — BOTH positions filled —
    // restated rather than reinvented, so the two surfaces cannot disagree
    // about the word on one screen. Synergy Slot 1 is the only pair; 1 and 5
    // are the only unlocked.
    expect(dock().querySelector(".synergy-dock__count")?.textContent).toBe(
      "1/8 assigned · 2 unlocked",
    );
  });

  it("a HALF-assigned Synergy Slot is not counted, and a second pair is", () => {
    // The half of the predicate that a `fuseBadgeId !== null` shortcut would
    // get wrong: a lone Fuse boosts nothing, so it is not an assignment.
    seed({ 5: { unlocked: true, fuseBadgeId: "aerial-wizard" } });
    render(<App />);
    expect(dock().querySelector(".synergy-dock__count")?.textContent).toBe(
      "1/8 assigned · 2 unlocked",
    );
  });

  it("the total is the array's LENGTH, never a typed 8", () => {
    seed({ 5: { unlocked: true, fuseBadgeId: "aerial-wizard", reactionBadgeId: "deadeye" } });
    render(<App />);
    expect(dock().querySelector(".synergy-dock__count")?.textContent).toBe(
      "2/8 assigned · 2 unlocked",
    );
  });
});

describe("R12 dock 3 — a chip is a DOOR: it scrolls and focuses, and nothing else", () => {
  it("pressing a chip moves focus into that Synergy Slot's row in the panel", () => {
    seed();
    render(<App />);
    fireEvent.click(chip(5));
    const row = document.getElementById("synergy-row-5");
    expect(row).not.toBeNull();
    expect(row?.contains(document.activeElement)).toBe(true);
    // …and the row it landed in is inside the Synergy Slots section, i.e. the
    // rail's SCROLLER — the dock hands off into the scrolling column rather
    // than opening a surface of its own.
    expect(document.querySelector("#panel-synergy")?.contains(row as Node)).toBe(true);
    expect(document.querySelector(".col-build__scroll")?.contains(row as Node)).toBe(true);
  });

  it("a LOCKED Synergy Slot's chip is a door too — that is where you unlock it", () => {
    seed();
    render(<App />);
    fireEvent.click(chip(3));
    expect(document.getElementById("synergy-row-3")?.contains(document.activeElement)).toBe(true);
  });

  it("CONTRACT — pressing every chip changes NOTHING about the build", () => {
    seed();
    render(<App />);
    // `.synergy-panel` is the DIRECT readout of `working.synergy` — the eight
    // rows with their pickers' selected values — so it is the surface a
    // silent assignment would move first. The roster and the strip are the
    // downstream ledger surfaces a refund would move second.
    const before = {
      panel: document.querySelector(".synergy-panel")?.textContent,
      selected: [...document.querySelectorAll(".synergy-row select")].map(
        (node) => (node as HTMLSelectElement).value,
      ),
      roster: document.querySelector(".summary-roster")?.textContent,
      strip: [...document.querySelectorAll(".totals-strip__nums")].map((n) => n.textContent),
      dockText: dock().textContent,
    };
    expect(before.selected.length).toBeGreaterThan(0);
    for (const node of chips()) fireEvent.click(node);
    expect(document.querySelector(".synergy-panel")?.textContent).toBe(before.panel);
    expect(
      [...document.querySelectorAll(".synergy-row select")].map(
        (node) => (node as HTMLSelectElement).value,
      ),
    ).toEqual(before.selected);
    expect(document.querySelector(".summary-roster")?.textContent).toBe(before.roster);
    expect([...document.querySelectorAll(".totals-strip__nums")].map((n) => n.textContent)).toEqual(
      before.strip,
    );
    expect(dock().textContent).toBe(before.dockText);
  });

  it("STRUCTURAL — the module names no mutator and takes no change callback", () => {
    // The behavioural case above would pass a dock that mutates only under a
    // state this fixture does not reach. This one cannot: the assignment
    // vocabulary is simply absent from the file.
    const source = srcSources["/src/ui/rail/SynergyDock.tsx"];
    expect(source, "SynergyDock.tsx is missing — the dock's scope drifted").toBeDefined();
    const code = stripComments(source as string);
    for (const banned of [
      "assignSynergy",
      "clearSynergy",
      "onSynergySlotsChange",
      "applyEdit",
      "setState",
      "useState",
      "writeAutosave",
    ]) {
      expect(code, `SynergyDock names ${banned}`).not.toContain(banned);
    }
    // Its whole prop surface is two READS. A third prop that is a function is
    // the shape a later slice would add a write through.
    expect(code).toContain("synergySlots: readonly SynergySlot[]");
    expect(code).toContain("dataset: BadgeDataset");
    expect(code).not.toMatch(/on[A-Z][A-Za-z]*:\s*\(/);
    // The navigation is the board's, IMPORTED rather than re-implemented, so
    // "go to this Synergy Slot" has one definition.
    expect(code).toContain("goToSynergySlotRow");
    expect(code).not.toContain("getElementById");
  });
});

describe("R12 dock 4 — the mount: the rail's THIRD child, and L-only", () => {
  it("is the last flex child of .col-build, after the scroller", () => {
    seed();
    render(<App />);
    const rail = document.querySelector(".col-build");
    expect(rail).not.toBeNull();
    const children = [...(rail as HTMLElement).children].map((node) => node.className);
    expect(children).toEqual(["totals-strip", "col-build__scroll", "synergy-dock"]);
  });

  it("carries its own landmark label, which names what it holds", () => {
    seed();
    render(<App />);
    // §4.5's rule over the workbench's new set: Physique and Attributes in
    // the body column, Build totals at the rail's head, this at its foot.
    expect(dock().getAttribute("aria-label")).toBe("Synergy Slots dock");
    // (The dock's own box — that it opens no scrollport and no sticky layer,
    // and that its fixed demand fits the 768 gate's rail — is geometry, and
    // is derived in tests/layout-arithmetic.test.ts's R12 build-rail block.)
  });

  it("announces nothing: §6's live-region budget is untouched", () => {
    seed();
    render(<App />);
    expect(dock().querySelectorAll('[role="status"], [aria-live]')).toHaveLength(0);
  });

  it("the eight chips are the only interactive things in it", () => {
    seed();
    render(<App />);
    expect(dock().querySelectorAll("button, input, select, textarea, a[href]")).toHaveLength(8);
  });
});
