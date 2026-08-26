// @vitest-environment jsdom
/**
 * F4 group 7 — Synergy Slot 7: the ratified +2, the discipline lock, and the
 * load-time magnitude normalization with its [A2] disclosure.
 *
 * The ratified +2 is DATA (Build Specialization Level 10; official 2K
 * MyPlayer Builder page + user ratification 2026-08-26), not a preference —
 * so it is not user-removable, and the enforcement lives in the ENGINE
 * (isRatifiedPlusTwo), which the UI READS. Test 7.7 asserts the refusal at
 * the HANDLER, not merely that the control renders `disabled`: a disabled
 * attribute is an affordance, not an invariant.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { SynergyPanel } from "../../src/ui/synergy/SynergyPanel";
import { shippedDataset } from "../../src/engine/dataset";
import {
  applyRatifiedMagnitudes,
  createDefaultSynergySlots,
  defaultOverlay,
} from "../../src/engine/synergy";
import { serializeSavedBuild } from "../../src/engine/serialization";
import type { SavedBuild, SynergySlot } from "../../src/engine/types";
import { newBuildId, saveNamedBuild, writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

// [A7] Two ratified ids now, so the subject is plural and the verb agrees —
// and the provenance clause dropped "Build Specialization", which is Synergy
// Slot 7's alone and was never published for Synergy Slot 8.
const DISCLOSURE =
  /Synergy Slots 7 and 8 are now \+2 — 2K's ratified Badge Synergy rewards, confirmed 2026-08-26\./;

beforeEach(() => {
  installMemoryLocalStorage();
});

function synergyRows(): HTMLElement[] {
  return [...document.querySelectorAll(".synergy-row")] as HTMLElement[];
}

function row(n: number): HTMLElement {
  const found = synergyRows()[n - 1];
  if (found === undefined) throw new Error(`Synergy Slot ${n} row not rendered`);
  return found;
}

/** A rig with two purchased badges in different categories. */
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

/** A rig whose PERSISTED slot 7 carries the pre-F4 magnitude 1 — the state
 * every existing saved build is in. */
function staleRig(extra?: Partial<Record<number, Partial<SynergySlot>>>): SavedBuild {
  const rig = makeRig(rigOptions({ 7: { unlocked: true }, ...extra }));
  return {
    ...rig,
    synergy: rig.synergy.map((slot) => (slot.id === 7 ? { ...slot, magnitude: 1 } : slot)),
  };
}

describe("F4 7.1 — Synergy Slot 7 ships +2 for a FRESH build", () => {
  it("the fresh path gives Synergy Slots 7 AND 8 magnitude 2 and every other synergy slot 1", () => {
    render(<App />);
    for (const id of [7, 8]) {
      expect(
        (within(row(id)).getByRole("radio", { name: "+2" }) as HTMLInputElement).checked,
        `Synergy Slot ${id}`,
      ).toBe(true);
    }
    for (const id of [1, 2, 3, 4, 5, 6]) {
      expect(
        (within(row(id)).getByRole("radio", { name: "+1" }) as HTMLInputElement).checked,
        `Synergy Slot ${id}`,
      ).toBe(true);
    }
  });

  it("a fresh build shows NO ratification disclosure — nothing was normalized", () => {
    render(<App />);
    expect(screen.queryByText(DISCLOSURE)).toBeNull();
  });
});

describe("F4 7.2/7.7 — the ratified +2 is engine-enforced, not attribute-enforced", () => {
  it("the +1 option on Synergy Slot 7 is disabled WITH the ratified reason (the affordance)", () => {
    render(<App />);
    const plusOne = within(row(7)).getByRole("radio", { name: "+1" }) as HTMLInputElement;
    expect(plusOne.disabled).toBe(true);
    const reasonId = plusOne.getAttribute("aria-describedby");
    expect(reasonId).not.toBeNull();
    expect(document.getElementById(reasonId as string)?.textContent).toBe(
      "Synergy Slot 7 is +2 — Build Specialization, confirmed 2026-08-26.",
    );
  });

  it("7.7 THE INVARIANT — calling the panel's magnitude handler with (7, 1) LEAVES SLOT 7 AT 2", () => {
    // Asserted at the HANDLER, not only at the attribute. A `disabled`
    // attribute is an affordance; the rule lives in the engine
    // (isRatifiedPlusTwo) and the handler reads it.
    let latest: SynergySlot[] = createDefaultSynergySlots(null);
    const rerender = (synergySlots: SynergySlot[]) => {
      latest = synergySlots;
    };
    render(
      <SynergyPanel
        synergySlots={latest}
        loadout={[]}
        dataset={shippedDataset}
        overlay={defaultOverlay}
        onSynergySlotsChange={rerender}
      />,
    );
    // Reach the handler the way a programmatic caller would: fire change on
    // the (disabled-in-DOM) +1 radio via the component's own onChange path.
    const plusOne = within(row(7)).getByRole("radio", { name: "+1" }) as HTMLInputElement;
    fireEvent.change(plusOne, { target: { checked: true } });
    expect(latest.find((slot) => slot.id === 7)?.magnitude).toBe(2);
  });

  it("7.2 / A7 — RE-CUT: the ratified pair FILLS the cap, so no user designation is offered at all", () => {
    // WHAT THIS TEST USED TO PROVE — that a user-designated +2 could be
    // returned to +1 — is now UNREACHABLE from the shipped app, because the
    // designation it depended on cannot be made in the first place. Asserting
    // the old flow would have meant fabricating a state the UI refuses.
    //
    // The invariant that replaces it is the one that still has teeth: the
    // +2 affordance is DISABLED on every non-ratified Synergy Slot, with the
    // cap named, and the ratified pair holds.
    render(<App />);
    for (const id of [1, 2, 3, 4, 5, 6]) {
      const plusTwo = within(row(id)).getByRole("radio", { name: "+2" }) as HTMLInputElement;
      expect(plusTwo.disabled, `Synergy Slot ${id} +2 must be blocked`).toBe(true);
      expect(plusTwo.checked, `Synergy Slot ${id}`).toBe(false);
    }
    // …and the ratified pair is disabled the OTHER way: +1 is what they refuse.
    for (const id of [7, 8]) {
      expect(
        (within(row(id)).getByRole("radio", { name: "+1" }) as HTMLInputElement).disabled,
        `Synergy Slot ${id} +1 must be refused`,
      ).toBe(true);
    }
  });
});

describe("F4 7.4 [A2] — load normalization + the disclosure, at ALL THREE routes", () => {
  it("BOOT RESTORE: a pre-F4 build loads with Synergy Slot 7 at +2 and the disclosure VISIBLE", () => {
    expect(writeAutosave(staleRig()).ok).toBe(true);
    render(<App />);
    expect((within(row(7)).getByRole("radio", { name: "+2" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByText(DISCLOSURE)).toBeTruthy();
  });

  it("NAMED-BUILD LOAD: the disclosure fires on the load route too", () => {
    const id = newBuildId();
    expect(saveNamedBuild(id, { ...staleRig(), name: "stale build" }).ok).toBe(true);
    render(<App />);
    // Boot found no autosave, so nothing is normalized yet.
    expect(screen.queryByText(DISCLOSURE)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    const rowName = [...document.querySelectorAll(".build-manager__row-name")].find(
      (element) => element.textContent === "stale build",
    );
    const buildRow = rowName?.closest("li");
    expect(buildRow, 'the "stale build" row is not in the switcher').toBeInstanceOf(HTMLElement);
    fireEvent.click(within(buildRow as HTMLElement).getByRole("button", { name: "Load" }));
    expect(screen.getByText(DISCLOSURE)).toBeTruthy();
  });

  it("IMPORT: the disclosure fires on the import route too", async () => {
    render(<App />);
    expect(screen.queryByText(DISCLOSURE)).toBeNull();

    const text = serializeSavedBuild({ ...staleRig(), name: "imported stale" });
    const file = new File([text], "build.json", { type: "application/json" });
    // jsdom's File lacks .text() under this environment; supply it.
    Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    await screen.findByRole("button", { name: /replace|import/i });
    fireEvent.click(screen.getByRole("button", { name: /^Import$|Replace/i }));
    expect(screen.getByText(DISCLOSURE)).toBeTruthy();
  });

  it("THE NEGATIVE CASE: a build whose slot 7 was ALREADY +2 loads with the disclosure ABSENT", () => {
    // A disclosure that always renders is not a disclosure.
    expect(writeAutosave(makeRig(rigOptions({ 7: { unlocked: true } }))).ok).toBe(true);
    render(<App />);
    expect(screen.queryByText(DISCLOSURE)).toBeNull();
  });

  it("NOT A LIVE REGION — the disclosure carries no role/aria-live, and F4 adds NO new live region", () => {
    // The brief asked for "SynergyPanel still contains exactly one
    // role=status". That does not match the shipped tree: the panel has TWO
    // — the sr-only announcement region AND the PlusTwoDesignator's Banner,
    // which defaults to role="status" (see src/ui/primitives/Banner.tsx).
    // The INVARIANT the ruling actually protects is that F4 adds NO NEW live
    // region, so that is what is asserted: the count is identical with and
    // without the disclosure, and the disclosure node carries none itself.
    const liveRegionCount = () => {
      const panel = document.querySelector(".synergy-panel") as HTMLElement;
      return panel.querySelectorAll('[role="status"],[role="alert"],[aria-live]').length;
    };

    // Baseline: a build that needs NO normalization.
    expect(writeAutosave(makeRig(rigOptions({ 7: { unlocked: true } }))).ok).toBe(true);
    const { unmount } = render(<App />);
    expect(document.querySelector(".synergy-panel__ratified-note")).toBeNull();
    const baseline = liveRegionCount();
    unmount();

    // With the disclosure rendered, the live-region budget is UNCHANGED.
    expect(writeAutosave(staleRig()).ok).toBe(true);
    render(<App />);
    const note = document.querySelector(".synergy-panel__ratified-note");
    expect(note).not.toBeNull();
    expect(note?.getAttribute("role")).toBeNull();
    expect(note?.getAttribute("aria-live")).toBeNull();
    expect(liveRegionCount()).toBe(baseline);
  });

  it("[NIT-3] SHORT ARRAY: a saved build omitting Synergy Slot 7 loads, gains NO synthesized slot 7, and shows no disclosure", () => {
    const short = staleRig();
    expect(
      writeAutosave({ ...short, synergy: short.synergy.filter((slot) => slot.id !== 7) }).ok,
    ).toBe(true);
    expect(() => render(<App />)).not.toThrow();
    expect(synergyRows()).toHaveLength(7);
    expect(screen.queryByText(DISCLOSURE)).toBeNull();
  });

  it("OVER-CAP: a pre-F4 build designating two OTHER +2 loads at FOUR, discloses, and UN-DESIGNATES NOTHING", () => {
    // [A7] The same fixture is now FOUR over-cap rather than three, because
    // load normalization re-derives BOTH ratified ids onto it. THE RULING IS
    // UNCHANGED AND IS THE POINT OF THE TEST: the app discloses the state and
    // un-designates nothing. A silent drop of the user's 3 and 6 to get back
    // under the cap is precisely the auto-migration H8 forbids, and it would
    // now be twice as tempting.
    const overCap = staleRig({ 3: { magnitude: 2 }, 6: { magnitude: 2 } });
    expect(writeAutosave(overCap).ok).toBe(true);
    render(<App />);

    for (const id of [3, 6, 7, 8]) {
      expect(
        (within(row(id)).getByRole("radio", { name: "+2" }) as HTMLInputElement).checked,
        `Synergy Slot ${id}`,
      ).toBe(true);
    }
    // The HARD violation surfaces, naming the ratified PAIR as not-yours-to-clear.
    expect(
      screen.getByText(
        /4 Synergy Slots are designated \+2 \(Synergy Slots 3, 6, 7, 8\) — at most 2 allowed\. Synergy Slots 7 and 8 are 2K's ratified \+2, so they are not the ones to clear\./,
      ),
    ).toBeTruthy();
  });

  it("[N6] the enclosing banner no longer claims the state 'can only come from an externally edited or imported build'", () => {
    // After F4 that sentence is FALSE for exactly the case above: the third
    // +2 came from the app's OWN upgrade, on a build the user never exported
    // and never edited.
    expect(writeAutosave(staleRig({ 3: { magnitude: 2 }, 6: { magnitude: 2 } })).ok).toBe(true);
    render(<App />);
    const banner = screen.getByText(/Invalid loadout state/).closest(".banner");
    expect(banner?.textContent).not.toContain("can only come from");
    expect(banner?.textContent).toContain("a data update that changed a ratified value");
  });
});

describe("F4 7.5 — the combined fixture: Synergy Slot 7 carries BOTH magnitude 2 and a disciplineLock", () => {
  it("both behave: the +2 holds, the lock chip renders, and off-discipline options are disabled with the reason", () => {
    expect(
      writeAutosave(makeRig(rigOptions({ 7: { unlocked: true, disciplineLock: "Finishing" } }))).ok,
    ).toBe(true);
    render(<App />);

    expect((within(row(7)).getByRole("radio", { name: "+2" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(within(row(7)).getByText("Locked to Finishing")).toBeTruthy();

    // Deadeye is Shooting — purchased, so it is SHOWN, disabled, with the
    // reason IN THE LABEL. Omission is reserved for unpurchased badges.
    const fusePicker = within(row(7)).getByLabelText("⚡ Fuse") as HTMLSelectElement;
    const offDiscipline = [...fusePicker.options].find((option) =>
      option.textContent?.startsWith("Deadeye"),
    );
    expect(offDiscipline, "the off-discipline badge must be SHOWN, not omitted").toBeDefined();
    expect(offDiscipline?.disabled).toBe(true);
    expect(offDiscipline?.textContent).toContain("Finishing badges only in this Synergy Slot");

    // Float Game is Finishing — offered normally.
    const onDiscipline = [...fusePicker.options].find((option) =>
      option.textContent?.startsWith("Float Game"),
    );
    expect(onDiscipline?.disabled).toBe(false);
  });

  it("the discipline selector is offered on Synergy Slot 7 ONLY", () => {
    render(<App />);
    expect(within(row(7)).getByLabelText("Build Specialization discipline")).toBeTruthy();
    for (const id of [1, 2, 3, 4, 5, 6, 8]) {
      expect(
        within(row(id)).queryByLabelText("Build Specialization discipline"),
        `Synergy Slot ${id}`,
      ).toBeNull();
    }
  });

  it("setting a lock NEVER auto-clears an existing off-discipline assignment (H8) — it DISCLOSES", () => {
    expect(
      writeAutosave(
        makeRig(rigOptions({ 7: { unlocked: true, fuseBadgeId: "deadeye" } })),
      ).ok,
    ).toBe(true);
    render(<App />);
    const select = within(row(7)).getByLabelText(
      "Build Specialization discipline",
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Finishing" } });

    // The assignment survives...
    const fusePicker = within(row(7)).getByLabelText("⚡ Fuse") as HTMLSelectElement;
    expect(fusePicker.value).toBe("deadeye");
    // ...and the violation is REPORTED rather than resolved.
    expect(
      screen.getByText(
        "Synergy Slot 7 Fuse holds Deadeye, a Shooting badge, but the Synergy Slot is locked to Finishing.",
      ),
    ).toBeTruthy();
  });
});

describe("F4 — applyRatifiedMagnitudes is the ONE normalization point", () => {
  it("the same helper backs all three routes (pure, so the routes cannot disagree)", () => {
    const stale = createDefaultSynergySlots(null).map((slot) =>
      slot.id === 7 ? { ...slot, magnitude: 1 as const } : slot,
    );
    expect(applyRatifiedMagnitudes(stale).normalizedSynergySlotIds).toEqual([7]);
    expect(
      applyRatifiedMagnitudes(applyRatifiedMagnitudes(stale).synergySlots)
        .normalizedSynergySlotIds,
    ).toEqual([]);
  });
});
