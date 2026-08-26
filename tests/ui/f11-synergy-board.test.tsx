// @vitest-environment jsdom
/**
 * F11 — the Synergy board (cut 1).
 *
 * The board is a READ-PLUS-NAVIGATE surface: it renders state and moves
 * focus, and dispatches no state change at all. So every case here is either
 * "does it show what state says" or "does pressing it land the caret in the
 * right <fieldset>" — there is deliberately no assignment case, because
 * assigning from the board is cut 2 and is not built.
 *
 * The two cases that are really ship gates in disguise:
 *
 *  - THE MAGNITUDE FIXTURE. Synergy Slot 8 has been user-confirmed as the
 *    second +2 but the ratification has not landed, so the app still ships
 *    seven (+1) and one (+2). A board that hardcoded the shipped
 *    distribution would look right today and disagree with a loaded build
 *    the moment the config moves. The fixture designates a second +2 and
 *    asserts the board follows it.
 *  - THE LIVE-REGION COUNT. design-spec §6 budgets the live regions and
 *    .synergy-panel already holds two. The board announces nothing:
 *    aria-pressed on a native <button> carries the selection by itself.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import type { SynergySlot } from "../../src/engine/types";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

const ROW_PREVIEW_NOTE = "⟳ Disabled by season-reset preview";
const BAND_PREVIEW_NOTE = "⟳ Temporary Synergy Slots disabled by season-reset preview";

beforeEach(() => {
  installMemoryLocalStorage();
});

function board(): HTMLElement {
  const found = document.querySelector(".synergy-board");
  if (found === null) throw new Error("the Synergy board did not render");
  return found as HTMLElement;
}

function columnHeads(): HTMLElement[] {
  return [...document.querySelectorAll(".synergy-board__colhead")] as HTMLElement[];
}

function cellFor(synergySlotId: number, roleKind: "fuse" | "reaction"): HTMLElement {
  const found = document.querySelector(
    `.synergy-board__cell[data-column="${synergySlotId}"][data-role="${roleKind}"]`,
  );
  if (found === null) throw new Error(`no ${roleKind} cell for Synergy Slot ${synergySlotId}`);
  return found as HTMLElement;
}

function setSwitch(name: string, on: boolean) {
  const control = screen.getByRole("switch", { name }) as HTMLInputElement;
  if (control.checked !== on) fireEvent.click(control);
}

/** Two purchased badges in two categories, so an OCCUPIED cell has a real
 * name and a real purchased level to render. */
function rigOptions(patches?: Partial<Record<number, Partial<SynergySlot>>>) {
  return {
    attributes: { close: 90, mid: 85 },
    budgets: {
      Finishing: { points: 16, equipSlots: 3 },
      Shooting: { points: 12, equipSlots: 2 },
    },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" as const },
      { badgeId: "deadeye", purchasedLevel: "silver" as const },
    ],
    ...(patches === undefined ? {} : { synergyPatches: patches }),
  };
}

function seed(patches?: Partial<Record<number, Partial<SynergySlot>>>) {
  expect(writeAutosave(makeRig(rigOptions(patches))).ok).toBe(true);
}

describe("F11 1 — shape: eight columns in slot-id order, two labelled rows", () => {
  it("renders eight <th scope=col> in Synergy Slot order, never sorted", () => {
    seed();
    render(<App />);
    const heads = columnHeads();
    expect(heads).toHaveLength(8);
    heads.forEach((head, index) => {
      expect(head.tagName).toBe("TH");
      expect(head.getAttribute("scope")).toBe("col");
      expect(head.getAttribute("data-column")).toBe(String(index + 1));
      expect(head.textContent).toContain(`Synergy Slot ${index + 1}`);
    });
  });

  it("labels the two rows Fuse above Reaction, at <th scope=row>", () => {
    seed();
    render(<App />);
    const primary = [...board().querySelectorAll('th[scope="row"]')] as HTMLElement[];
    expect(primary.map((node) => node.textContent)).toEqual(["Fuse", "Reaction"]);
    // The narrow arrangements repeat the label above each block; the repeats
    // are aria-hidden, so exactly ONE real row header exists per row.
    const repeats = [...board().querySelectorAll(".synergy-board__rowlabel[aria-hidden='true']")];
    expect(repeats).toHaveLength(6);
  });

  it("is a real <table> with its roles declared, because CSS lays it out as a grid", () => {
    seed();
    render(<App />);
    const table = board().querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.getAttribute("role")).toBe("table");
    // A changed `display` strips native table semantics in every engine, so
    // the roles are the load-bearing half at the widths that re-arrange.
    expect(board().querySelectorAll('[role="rowgroup"]')).toHaveLength(2);
    // Four: the band row, the column-header row, Fuse and Reaction.
    expect(board().querySelectorAll('[role="row"]')).toHaveLength(4);
    expect(board().querySelectorAll('[role="cell"]')).toHaveLength(16);
  });

  it("heads the section — the board renders BEFORE the eight shipped rows", () => {
    seed();
    render(<App />);
    const panel = document.querySelector(".synergy-panel") as HTMLElement;
    const firstRow = panel.querySelector(".synergy-row") as HTMLElement;
    expect(
      board().compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // …and the eight rows are untouched: still eight, still working.
    expect(panel.querySelectorAll(".synergy-row")).toHaveLength(8);
  });
});

describe("F11 2 — the bands, and the divider 2K does not have", () => {
  it("renders both band labels, spanning columns 1-4 and 5-8", () => {
    seed();
    render(<App />);
    const bands = [...board().querySelectorAll(".synergy-board__band")] as HTMLElement[];
    expect(bands).toHaveLength(2);
    expect(bands[0]?.getAttribute("data-band")).toBe("temporary");
    expect(bands[0]?.textContent).toContain("Temporary — resets at season end");
    expect(bands[1]?.getAttribute("data-band")).toBe("permanent");
    expect(bands[1]?.textContent).toContain("Permanent — survives the season reset");
  });

  it("puts the divider on the 4/5 seam, read off `permanence` and not off the id", () => {
    seed();
    render(<App />);
    for (const head of columnHeads()) {
      const id = Number(head.getAttribute("data-column"));
      expect(head.getAttribute("data-band")).toBe(id <= 4 ? "temporary" : "permanent");
    }
    // The seam element is the divider's own grid track: one presentational
    // node, so the 1px rule and its breathing room are parseable geometry.
    const seam = board().querySelectorAll(".synergy-board__seam");
    expect(seam).toHaveLength(1);
    expect(seam[0]?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("F11 3 — the headers render the LIVE magnitude", () => {
  it("reads (+1) / (+2) off state, matching the shipped distribution", () => {
    seed();
    render(<App />);
    const boosts = columnHeads().map(
      (head) => head.querySelector(".synergy-board__colhead-boost")?.textContent,
    );
    // [A7] Synergy Slots 7 (Build Specialization Level 10) and 8 are BOTH
    // ratified +2 now, so the shipped distribution is the seed's declared 6/2
    // and scope.md deviation #5 is closed.
    expect(boosts).toEqual(["(+1)", "(+1)", "(+1)", "(+1)", "(+1)", "(+1)", "(+2)", "(+2)"]);
  });

  it("FOLLOWS a designation rather than a hardcoded shape", () => {
    // [A7] RE-POINTED, and it had to be. This canary used to designate
    // Synergy Slot 8 — which is now RATIFIED, so seeding it proves nothing:
    // a board that hardcoded (+2) on columns 7 and 8 would pass both this
    // case and the one above, and the canary would have gone silently
    // vacuous at the exact moment the ratification landed.
    //
    // Designating Synergy Slot 3 restores the property under test: the shape
    // must come from `synergySlot.magnitude`, so a hardcoded 7/8 pair fails
    // here on column 3 while still passing above.
    seed({ 3: { magnitude: 2 } });
    render(<App />);
    const boosts = columnHeads().map(
      (head) => head.querySelector(".synergy-board__colhead-boost")?.textContent,
    );
    expect(boosts).toEqual(["(+1)", "(+1)", "(+2)", "(+1)", "(+1)", "(+1)", "(+2)", "(+2)"]);
    expect(boosts.filter((text) => text === "(+2)")).toHaveLength(3);
  });

  it("carries the full state in the header's accessible name", () => {
    seed({ 5: { unlocked: true } });
    render(<App />);
    expect(
      within(board()).getByRole("button", {
        name: "Synergy Slot 5, Permanent, plus 1, unlocked",
      }),
    ).toBeTruthy();
    expect(
      within(board()).getByRole("button", { name: "Synergy Slot 7, Permanent, plus 2, locked" }),
    ).toBeTruthy();
  });

  it("renders the discipline lock as a short line under its column header", () => {
    seed({ 7: { unlocked: true, disciplineLock: "Finishing" } });
    render(<App />);
    const head = columnHeads()[6] as HTMLElement;
    expect(head.querySelector(".synergy-board__lock-note")?.textContent).toBe("Finishing only");
    // Read off the slot; the RULE stays in assignSynergy and F11 never goes
    // near it. Every other column renders nothing.
    expect(board().querySelectorAll(".synergy-board__lock-note")).toHaveLength(1);
  });
});

describe("F11 4 — cell contents, and the control that is never in one", () => {
  it("renders badge name + purchased-level letter in an occupied cell", () => {
    seed({ 5: { unlocked: true, fuseBadgeId: "float-game" } });
    render(<App />);
    const cell = cellFor(5, "fuse");
    expect(cell.textContent).toBe("Float Game (G)");
    // The level LETTER is the visible carrier; the full word rides the
    // accessible name so nothing depends on decoding an initial.
    expect(
      within(cell).getByRole("button", { name: "Fuse, Synergy Slot 5: Float Game, Gold" }),
    ).toBeTruthy();
  });

  it("renders ⊕ as a button in an empty unlocked cell", () => {
    seed({ 5: { unlocked: true } });
    render(<App />);
    const cell = cellFor(5, "reaction");
    expect(cell.textContent).toBe("⊕");
    const control = within(cell).getByRole("button", {
      name: "Reaction, Synergy Slot 5: empty",
    });
    expect(control.tagName).toBe("BUTTON");
  });

  it("offers NO control at all in a locked column — 🔒 and the WORD Locked", () => {
    seed({ 5: { unlocked: true } });
    render(<App />);
    for (const roleKind of ["fuse", "reaction"] as const) {
      const cell = cellFor(3, roleKind);
      expect(cell.textContent).toBe("🔒 Locked");
      // H4's invariant class: the control is not offered, rather than
      // offered and refused. Nothing here is focusable.
      expect(cell.querySelector("button")).toBeNull();
      expect(cell.className).toContain("synergy-board__cell--locked");
    }
    // NEVER COLOUR ALONE: the glyph AND the word, on every locked column.
    expect(board().querySelectorAll(".synergy-board__cell--locked")).toHaveLength(14);
  });

  it("puts NO picker, segmented control or toggle inside the board", () => {
    // SELECT_FLOOR is 180px against a 93px cell at 1280 — a 1.94x shortfall.
    // The board SELECTS; every control stays the shipped primitive at its
    // shipped size in the rows below, which is what keeps pickerGroups'
    // disable-with-reason discipline untouched.
    seed({ 5: { unlocked: true, fuseBadgeId: "float-game" } });
    render(<App />);
    expect(board().querySelectorAll("select")).toHaveLength(0);
    expect(board().querySelectorAll("input")).toHaveLength(0);
    expect(board().querySelectorAll(".select, .segmented, .toggle")).toHaveLength(0);
    // …and the rows below still have theirs.
    expect(document.querySelectorAll(".synergy-row select").length).toBeGreaterThan(0);
  });
});

describe("F11 5 — pressing a column navigates to its row", () => {
  it("moves focus into #synergy-row-{id} and marks the column pressed", () => {
    seed({ 6: { unlocked: true } });
    render(<App />);
    const head = columnHeads()[5] as HTMLElement;
    const control = within(head).getByRole("button", { name: /^Synergy Slot 6,/ });
    expect(control.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(control);

    const row = document.getElementById("synergy-row-6");
    expect(row).not.toBeNull();
    expect(row?.contains(document.activeElement)).toBe(true);
    // The row anchor is the one attribute F11 adds to SynergySlotRow, and it
    // exists on all eight.
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(document.getElementById(`synergy-row-${id}`)).not.toBeNull();
    }
  });

  it("a cell navigates too, and selection stays a single pressed column", () => {
    seed({ 2: { unlocked: true }, 6: { unlocked: true } });
    render(<App />);
    fireEvent.click(within(cellFor(2, "fuse")).getByRole("button"));
    expect(document.getElementById("synergy-row-2")?.contains(document.activeElement)).toBe(true);
    expect(board().querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(
      (board().querySelector('[aria-pressed="true"]') as HTMLElement).getAttribute("aria-label"),
    ).toContain("Synergy Slot 2,");
  });
});

describe("F11 6 — the season-reset band, and the string that MUST differ", () => {
  it("states it ONCE for the band, and leaves the row statements alone", () => {
    seed({ 1: { unlocked: true }, 3: { unlocked: true }, 6: { unlocked: true } });
    render(<App />);
    expect(screen.queryAllByText(BAND_PREVIEW_NOTE)).toHaveLength(0);
    const rowNotesBefore = document.querySelectorAll(".synergy-row__preview-note").length;
    expect(rowNotesBefore).toBe(0);

    setSwitch("Season-reset preview", true);

    // ONE band label, in the distinct wording. tests/ui/overlays.test.tsx
    // does a global EXACT getByText on the ROW string and getByText throws
    // on a second match — reusing it here would red a RUN-never-edit gate.
    expect(screen.getAllByText(BAND_PREVIEW_NOTE)).toHaveLength(1);
    expect(board().textContent).not.toContain(`preview${ROW_PREVIEW_NOTE}`);
    expect(board().querySelectorAll(`.synergy-board__preview-note`)).toHaveLength(1);

    // Nothing is compacted: the two unlocked TEMPORARY rows still carry their
    // own note, and the board adds none of its own to that count.
    expect(document.querySelectorAll(".synergy-row__preview-note")).toHaveLength(2);
    expect(board().querySelectorAll(".synergy-row__preview-note")).toHaveLength(0);
  });

  it("leaves every control in the band OPERABLE — it is a display overlay", () => {
    seed({ 1: { unlocked: true } });
    render(<App />);
    setSwitch("Season-reset preview", true);
    const cell = cellFor(1, "fuse");
    const control = within(cell).getByRole("button");
    expect(control.hasAttribute("disabled")).toBe(false);
    fireEvent.click(control);
    expect(document.getElementById("synergy-row-1")?.contains(document.activeElement)).toBe(true);
  });

  it("marks only the TEMPORARY band, and only under the preview", () => {
    seed({ 1: { unlocked: true } });
    render(<App />);
    const bands = () => [...board().querySelectorAll(".synergy-board__band")] as HTMLElement[];
    expect(bands().filter((node) => node.hasAttribute("data-preview"))).toHaveLength(0);
    setSwitch("Season-reset preview", true);
    const marked = bands().filter((node) => node.hasAttribute("data-preview"));
    expect(marked).toHaveLength(1);
    expect(marked[0]?.getAttribute("data-band")).toBe("temporary");
  });
});

describe("F11 7 — the board's zero-list, asserted in the DOM", () => {
  it("adds NO live region: the panel's budget is unchanged", () => {
    seed({ 5: { unlocked: true, fuseBadgeId: "float-game" } });
    render(<App />);
    const panel = document.querySelector(".synergy-panel") as HTMLElement;
    // [A7] ONE now, not two: the sr-only announcement region alone. The
    // PlusTwoDesignator's Banner (Banner defaults to role="status") RETIRED
    // when the ratified pair filled the cap — there is no designation left to
    // ask for. The budget went DOWN, which is the safe direction; what this
    // test guards is the board adding one, asserted separately below.
    expect(panel.querySelectorAll('[role="status"],[role="alert"],[aria-live]')).toHaveLength(1);
    // The board contributes ZERO of them. Selection rides on aria-pressed.
    expect(board().querySelectorAll('[role="status"],[role="alert"],[aria-live]')).toHaveLength(0);
  });

  it("emits no data-stale node and no .badge-card, so no count query drifts", () => {
    seed({ 5: { unlocked: true, fuseBadgeId: "float-game" } });
    render(<App />);
    expect(board().querySelectorAll('[data-stale="true"]')).toHaveLength(0);
    expect(board().querySelectorAll(".badge-card")).toHaveLength(0);
    expect(document.querySelectorAll(".badge-card")).toHaveLength(53);
  });

  it("uses NO banned class name — .synergy-row, .category-ledger, .summary", () => {
    // tests/ui/synergy-panel.test.tsx indexes `.synergy-row` positionally and
    // tests/ui/overlays.test.tsx compares node collections keyed on the other
    // two. A board class colliding with any of them re-indexes ~20
    // assertions at once.
    seed();
    render(<App />);
    for (const node of [...board().querySelectorAll("*")]) {
      for (const name of node.classList) {
        expect(name.startsWith("synergy-row"), `board class ${name}`).toBe(false);
        expect(name.startsWith("category-ledger"), `board class ${name}`).toBe(false);
        expect(name.startsWith("ledger-overview"), `board class ${name}`).toBe(false);
        expect(name.startsWith("summary"), `board class ${name}`).toBe(false);
      }
    }
  });

  it("renders NO designation counter, Now-<Level> string or synergy chip text", () => {
    // Every one of these is queried by a global EXACT getByText somewhere in
    // the suite; a second match throws.
    seed({ 5: { unlocked: true, fuseBadgeId: "float-game" } });
    render(<App />);
    const text = board().textContent ?? "";
    expect(text).not.toContain("+2 designated");
    expect(text).not.toContain("Now ");
    expect(text).not.toContain("SS5");
    expect(text).not.toContain("assigned as");
  });
});
