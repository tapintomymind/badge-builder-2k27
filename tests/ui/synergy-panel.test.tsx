// @vitest-environment jsdom
/**
 * SynergyPanel + PlusTwoDesignator + SynergySlotRow (design-spec §3.5,
 * impl-brief M4 #1–#3).
 *
 * Pins: the designator is the FIRST control with its exact banner copy and
 * live counter, the 2-of-8 cap disables further +2 radios WITH a reason
 * (H4 invariant class), locked rows offer no pickers, picker options follow
 * the H5 one-role rules with reasons in the option labels, assignment flows
 * through the engine and announces via the status region, and the
 * season-reset preview marks temporary rows without disabling their
 * controls (H2: display overlay, not a state change).
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

/** Two purchased badges in different categories: Float Game (Finishing,
 * Gold) and Deadeye (Shooting, Silver). */
function seedPurchasedRig() {
  const rig = makeRig({
    attributes: { close: 90, mid: 85 },
    budgets: { Finishing: { points: 16, equipSlots: 3 }, Shooting: { points: 12, equipSlots: 2 } },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "deadeye", purchasedLevel: "silver" },
    ],
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

function synergyRows(): HTMLElement[] {
  return [...document.querySelectorAll(".synergy-row")] as HTMLElement[];
}

function row(n: number): HTMLElement {
  const found = synergyRows()[n - 1];
  if (found === undefined) throw new Error(`Synergy Slot ${n} row not rendered`);
  return found;
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("panel shape and the PlusTwoDesignator (first control)", () => {
  it("A7 — the designator banner has RETIRED, and the 8 rows are unchanged", () => {
    seedPurchasedRig();
    render(<App />);
    const panel = document.querySelector(".synergy-panel");
    expect(panel).not.toBeNull();
    // [A7] THE DESIGNATOR BANNER IS GONE, and its own F4 ruling is why: it
    // "retires only when the second +2 is published". Synergy Slot 8 was
    // ratified, the cap is full, and there is nothing left to designate — so
    // the banner renders null rather than standing there asking for an
    // action the app now refuses.
    expect(panel?.querySelector(".banner--warning")).toBeNull();
    expect(screen.queryByText(/more Synergy Slot/)).toBeNull();
    expect(screen.queryByText(/\+2 designated:/)).toBeNull();
    expect(synergyRows()).toHaveLength(8);
    // Permanence chips: 1–4 Temporary, 5–8 Permanent (seed table).
    expect(within(row(1)).getByText("Temporary")).toBeTruthy();
    expect(within(row(4)).getByText("Temporary")).toBeTruthy();
    expect(within(row(5)).getByText("Permanent")).toBeTruthy();
    expect(within(row(8)).getByText("Permanent")).toBeTruthy();
  });

  it("A7 — the cap is filled by the RATIFIED pair alone: ZERO user designations are offered", () => {
    seedPurchasedRig();
    render(<App />);
    // [A7] Synergy Slots 7 and 8 are both ratified, so the cap is reached
    // before the user touches anything. Every other row's +2 is disabled on
    // arrival — with the reason wired via aria-describedby, exactly as it was
    // when the block happened one designation later.
    for (const id of [1, 2, 3, 4, 5, 6]) {
      const blocked = within(row(id)).getByRole("radio", { name: "+2" }) as HTMLInputElement;
      expect(blocked.disabled, `Synergy Slot ${id}`).toBe(true);
      const reasonId = blocked.getAttribute("aria-describedby");
      expect(reasonId, `Synergy Slot ${id} reason`).not.toBeNull();
      expect(document.getElementById(reasonId as string)?.textContent).toBe(
        "Only 2 Synergy Slots can be +2. Clear another first.",
      );
    }
    // The ratified pair is blocked the OTHER way — +1 is what they refuse,
    // and the reason names the ratification rather than the cap.
    for (const id of [7, 8]) {
      const refused = within(row(id)).getByRole("radio", { name: "+1" }) as HTMLInputElement;
      expect(refused.disabled, `Synergy Slot ${id}`).toBe(true);
    }
    // A blocked control is an AFFORDANCE, never the invariant: clicking it
    // still changes nothing, which is handleMagnitudeChange's job.
    fireEvent.click(within(row(5)).getByRole("radio", { name: "+2" }));
    expect((within(row(5)).getByRole("radio", { name: "+1" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("locked vs unlocked rows (H4 invariant class: control not offered)", () => {
  it("a locked row renders NO pickers, with the locked line", () => {
    seedPurchasedRig();
    render(<App />);
    expect(within(row(5)).queryByLabelText("⚡ Fuse")).toBeNull();
    expect(within(row(5)).queryByLabelText("↺ Reaction")).toBeNull();
    expect(within(row(5)).getByText("Locked — unlock to assign badges")).toBeTruthy();
  });

  it("unlocking reveals the two pickers; empty loadout shows the placeholder", () => {
    expect(writeAutosave(makeRig()).ok).toBe(true); // nothing purchased
    render(<App />);
    fireEvent.click(within(row(5)).getByRole("switch", { name: "Unlocked" }));
    const fusePicker = within(row(5)).getByLabelText("⚡ Fuse");
    expect(
      within(fusePicker).getByRole("option", { name: "No purchased badges yet" }),
    ).toBeTruthy();
  });
});

describe("assignment through the engine (H5 one-role rules in option labels)", () => {
  it("assigns a fuse, updates the card, and announces via the status region", () => {
    seedPurchasedRig();
    render(<App />);
    fireEvent.click(within(row(5)).getByRole("switch", { name: "Unlocked" }));
    const fusePicker = within(row(5)).getByLabelText("⚡ Fuse");
    // Options are grouped by Category and labelled `name — level`.
    expect(within(fusePicker).getByRole("group", { name: "Finishing" })).toBeTruthy();
    fireEvent.change(fusePicker, { target: { value: "float-game" } });

    // Card synergy state (magnitude 1: Gold → HOF).
    expect(screen.getByText("Now Gold · Fused to HOF")).toBeTruthy();
    // Effect line on the row.
    expect(within(row(5)).getByText("Float Game → HOF")).toBeTruthy();
    // The shared status region announced it.
    expect(
      screen.getByText("Float Game assigned as Fuse in Synergy Slot 5. Effective level HOF."),
    ).toBeTruthy();
  });

  it("a badge holding a role elsewhere is disabled with the reason in its label; same-row cross-role too", () => {
    seedPurchasedRig();
    render(<App />);
    fireEvent.click(within(row(5)).getByRole("switch", { name: "Unlocked" }));
    fireEvent.change(within(row(5)).getByLabelText("⚡ Fuse"), {
      target: { value: "float-game" },
    });

    // Another row's picker: Float Game is disabled, reason in the label.
    fireEvent.click(within(row(6)).getByRole("switch", { name: "Unlocked" }));
    const otherFuse = within(row(6)).getByLabelText("⚡ Fuse");
    const blocked = within(otherFuse).getByRole("option", {
      name: "Float Game — Gold — already Fuse in Synergy Slot 5",
    }) as HTMLOptionElement;
    expect(blocked.disabled).toBe(true);

    // The SAME row's Reaction picker: the row's own Fuse is disabled.
    const sameRowReaction = within(row(5)).getByLabelText("↺ Reaction");
    const sameBlocked = within(sameRowReaction).getByRole("option", {
      name: "Float Game — Gold — already this Synergy Slot's Fuse",
    }) as HTMLOptionElement;
    expect(sameBlocked.disabled).toBe(true);
    // Deadeye is still freely assignable there.
    fireEvent.change(sameRowReaction, { target: { value: "deadeye" } });
    expect(within(row(5)).getByText(/Deadeye → Gold when activated/)).toBeTruthy();
    // Reaction card shows base + "activates to".
    expect(screen.getByText("Now Silver — activates to Gold")).toBeTruthy();
  });

  it("selecting None clears the role via clearSynergy", () => {
    seedPurchasedRig();
    render(<App />);
    fireEvent.click(within(row(5)).getByRole("switch", { name: "Unlocked" }));
    const fusePicker = within(row(5)).getByLabelText("⚡ Fuse");
    fireEvent.change(fusePicker, { target: { value: "float-game" } });
    fireEvent.change(fusePicker, { target: { value: "" } });
    expect(screen.getByText("Fuse cleared in Synergy Slot 5.")).toBeTruthy();
    expect(screen.getByText("Now Gold")).toBeTruthy();
  });
});

describe("season-reset preview on temporary rows (H2: display-only)", () => {
  it("marks unlocked temporary rows, leaves controls OPERABLE", () => {
    seedPurchasedRig();
    render(<App />);
    fireEvent.click(within(row(1)).getByRole("switch", { name: "Unlocked" }));
    fireEvent.click(screen.getByRole("switch", { name: "Season-reset preview" }));

    expect(within(row(1)).getByText("⟳ Disabled by season-reset preview")).toBeTruthy();
    // Permanent rows carry no such note.
    expect(within(row(5)).queryByText("⟳ Disabled by season-reset preview")).toBeNull();
    // The preview is NOT a state change: the picker still works.
    fireEvent.change(within(row(1)).getByLabelText("⚡ Fuse"), {
      target: { value: "float-game" },
    });
    // Assigned — but not live under the preview, and the card says exactly that.
    expect(screen.getByText("Now Gold · Synergy Slot 1 disabled by preview")).toBeTruthy();
  });
});
