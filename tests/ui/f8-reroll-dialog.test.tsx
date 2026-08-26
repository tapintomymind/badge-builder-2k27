// @vitest-environment jsdom
/**
 * F8-R2 group 3 — the FOURTH dialog.
 *
 * §4.6's implementer note is exactly what a fourth dialog springs: anything
 * that reaches for "the dialog" must select BY ID. A review's first pass once
 * reported "import does nothing" purely because `document.querySelector("dialog")`
 * returned the BUILDS dialog. Every lookup in this file is `#dialog-reroll`,
 * and one assertion below deliberately demonstrates the trap rather than just
 * avoiding it.
 *
 * WHERE THIS FILE DIVERGES FROM THE BRIEF, and why: the brief asks for
 * "exactly four <dialog> elements exist in the document". In the shipped app
 * three of the four are MOUNTED ONLY WHILE OPEN (reset, bonus, import — the
 * A5-U comment in App.tsx states that as a deliberate choice, so a closed
 * dialog does not park rows of nodes in the DOM). Only the build manager is
 * permanently mounted. So a flat count of four is never true at any instant,
 * and asserting it would mean changing shipped mounting behaviour to satisfy a
 * test. What the count was PROTECTING is asserted instead: that the re-roll
 * dialog is distinct from the build manager's, and that a bare
 * querySelector("dialog") does not find it.
 */

import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { F8_BADGES, f8Rig } from "./f8-fixture";
import { budgetsWith } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

function mount(): void {
  const rig = f8Rig({
    budgets: budgetsWith({
      Finishing: { equipSlots: 6, points: 30 },
      Shooting: { equipSlots: 5, points: 24 },
      Playmaking: { equipSlots: 5, points: 24 },
      Defense: { equipSlots: 5, points: 24 },
      Rebounding: { equipSlots: 4, points: 16 },
      Physicals: { equipSlots: 4, points: 16 },
    }),
  });
  expect(writeAutosave(rig).ok).toBe(true);
  render(<App />);
}

/** BY ID. Never `querySelector("dialog")`. */
function rerollDialog(): HTMLDialogElement | null {
  return document.querySelector("#dialog-reroll");
}

function panel(): HTMLElement {
  return document.querySelector(".roll-panel") as HTMLElement;
}

function roster(): HTMLElement {
  return document.querySelector(".summary-roster") as HTMLElement;
}

function openReroll(): HTMLDialogElement {
  fireEvent.click(within(panel()).getByRole("button", { name: "Re-roll…" }));
  const dialog = rerollDialog();
  expect(dialog, "#dialog-reroll opened").not.toBeNull();
  return dialog as HTMLDialogElement;
}

/** The roster's pin control for one badge, by accessible name. */
function rosterPin(name: string): HTMLButtonElement {
  return within(roster()).getAllByRole("button", {
    name: new RegExp(`^(?:Un)?[Pp]in ${name}$`),
  })[0] as HTMLButtonElement;
}

function purchasedNames(): string[] {
  return [...roster().querySelectorAll(".summary-roster__name")].map(
    (cell) => cell.textContent ?? "",
  );
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("3 — the re-roll confirm", () => {
  it("3.1 — `Re-roll…` opens #dialog-reroll and it is NOT what querySelector finds", SLOW, () => {
    mount();
    expect(rerollDialog()).toBeNull();
    const dialog = openReroll();

    // THE TRAP, DEMONSTRATED. The build manager's dialog is permanently
    // mounted and comes first in document order, so the bare selector returns
    // the WRONG element — which is the whole reason §4.6 mandates ids.
    const bare = document.querySelector("dialog");
    expect(bare).not.toBe(dialog);
    expect(bare?.id).not.toBe("dialog-reroll");
    expect(dialog.id).toBe("dialog-reroll");
  });

  it("3.2 — the body NAMES the counts, and Cancel is default-focused", SLOW, () => {
    mount();
    const dialog = openReroll();
    const text = dialog.textContent ?? "";
    // Four purchases in the fixture; three are implicitly pinned (the Fuse
    // holder, the Reaction holder and the stale one), leaving one unpinned.
    expect(text).toContain("unpinned");
    expect(text).toContain("pinned");
    expect(text).toMatch(/\d+ unpinned/);
    // The blast radius is stated in points, not just in counts.
    expect(text).toMatch(/\(\d+ points?\)/);

    // React's autoFocus FOCUSES the element rather than reflecting an
    // attribute, so the attribute is the wrong thing to assert — what matters
    // is that the safe action is where the keyboard already is.
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
  });

  it("3.3 — Escape and a backdrop click both route to Cancel", SLOW, () => {
    mount();
    const dialog = openReroll();
    // Escape on a native <dialog> fires `close`; jsdom does not implement the
    // key handling, so the CONTRACT under test is that `close` routes to
    // Cancel — which is the wiring Escape depends on.
    fireEvent(dialog, new Event("close"));
    expect(rerollDialog()).toBeNull();

    // Backdrop: the <dialog> element itself is the backdrop, and a click whose
    // target is the dialog (not its body) cancels.
    const reopened = openReroll();
    fireEvent.click(reopened);
    expect(rerollDialog()).toBeNull();

    // A click INSIDE the body must NOT cancel.
    const again = openReroll();
    fireEvent.click(again.querySelector(".reset-dialog__body") as HTMLElement);
    expect(rerollDialog()).not.toBeNull();
  });

  it("3.4 — `Pin everything instead` pins the unpinned and closes WITHOUT rolling", SLOW, () => {
    mount();
    const before = purchasedNames();
    expect(rosterPin("Dimer").getAttribute("aria-pressed")).toBe("false");

    const dialog = openReroll();
    fireEvent.click(within(dialog).getByRole("button", { name: "Pin everything instead" }));

    // Closed, nothing rolled, and the previously-unpinned entry is now pinned.
    expect(rerollDialog()).toBeNull();
    expect(document.querySelector(".roll-report")).toBeNull();
    expect(purchasedNames()).toEqual(before);
    expect(rosterPin("Dimer").getAttribute("aria-pressed")).toBe("true");
  });

  it("3.5 — `Clear and re-roll` rolls, and EVERY pinned entry survives", SLOW, () => {
    mount();
    // Pin the one free entry, so all four purchases are pinned — three
    // implicitly and one by the user.
    fireEvent.click(rosterPin("Dimer"));
    const pinnedBefore = purchasedNames();
    expect(pinnedBefore.length).toBeGreaterThanOrEqual(4);

    const dialog = openReroll();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear and re-roll" }));

    expect(rerollDialog()).toBeNull();
    // The roll ran...
    expect(document.querySelector(".roll-report")).not.toBeNull();
    // ...and A PIN IS NEVER DESTROYED BY ANY PATH. This is the one outcome the
    // feature may never produce.
    const after = purchasedNames();
    for (const name of pinnedBefore) {
      expect(after, `${name} survived the re-roll`).toContain(name);
    }
  });

  it("3.6 — an IMPLICIT pin survives a re-roll even with nothing pinned by hand", SLOW, () => {
    mount();
    const dialog = openReroll();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear and re-roll" }));

    const after = purchasedNames();
    // The synergy-role holders must still be there: clearing one strands a
    // fuseBadgeId, which is the F2.1 defect class that cost real autosaves.
    const fused = within(roster()).queryAllByRole("button", {
      name: new RegExp(`^(?:Un)?[Pp]in `),
    });
    expect(fused.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(0);
    for (const badgeId of [F8_BADGES.fused, F8_BADGES.reacting]) {
      expect(badgeId).toBeTruthy();
    }
    // Named rather than counted: the two role holders are Posterizer and Rise
    // Up in the shipped dataset, and the roster shows display names.
    expect(after).toContain("Posterizer");
    expect(after).toContain("Rise Up");
  });

  it("3.7 — the per-category re-roll in the roster <tfoot> opens the same dialog", SLOW, () => {
    mount();
    const perCategory = within(roster()).getAllByRole("button", { name: /^Re-roll \w+…$/ });
    expect(perCategory.length).toBeGreaterThan(0);
    fireEvent.click(perCategory[0] as HTMLElement);
    const dialog = rerollDialog();
    expect(dialog).not.toBeNull();
    // Scoped: the title names the category, not "every category".
    expect(dialog?.querySelector("h2")?.textContent).toMatch(/^Re-roll \w+\?$/);
    expect(dialog?.querySelector("h2")?.textContent).not.toContain("every category");
  });
});
