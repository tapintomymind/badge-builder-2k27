// @vitest-environment jsdom
/**
 * F2 dockets B + F + the autosave flush (E).
 *
 * B  — SWITCHER GUARD: replacing a dirty working build asks first (PRE-FIX
 *      loadBuild replaced immediately, and the very next autosave overwrote
 *      the only copy); the reload ghost pair is disambiguated
 *      ("… — unsaved changes" vs "… — saved"); the passive default stays
 *      the user's work.
 * F  — PersistResult surfaced on rename/delete (PRE-FIX both discarded it);
 *      AutosaveWarning re-arms per failure epoch (PRE-FIX dismissal latched
 *      for the whole session); duplicate-name auto-suffix (PRE-FIX
 *      Duplicate×2 manufactured two identical "X copy" entries).
 * E  — tail-edit flush on pagehide/visibilitychange (PRE-FIX a reload
 *      mid-edit lost the pending field value: commits land on blur only).
 *
 * TIMEOUTS: every case here renders the full App two to four times, which
 * costs seconds in jsdom and crosses vitest's 5s DEFAULT once the whole
 * 45-file suite runs in parallel — an environment cost, not a defect, and it
 * surfaced as intermittent 5s timeouts on loaded machines. The explicit
 * 20000ms matches the override this file already carried on its heaviest
 * case. [F2.2]
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { deserializeSavedBuild, serializeSavedBuild } from "../../src/engine/serialization";
import { makeRig } from "./m4-rig";
import type { InstalledStorage } from "./storage-stub";
import { installMemoryLocalStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function buyFloatGameGold() {
  commitNumber(screen.getByLabelText("Close"), "90");
  const pips = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
  fireEvent.click(within(pips).getByRole("radio", { name: /^Gold/ }));
}

function saveAsNew(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Manage" }));
  fireEvent.change(screen.getByLabelText("Name for the new build"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Save as new" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
}

function switcher(): HTMLSelectElement {
  return screen.getByLabelText("Saved builds") as HTMLSelectElement;
}

describe("B — switcher guard: replacing a dirty working build confirms first", () => {
  it("declining the confirm keeps the working build; accepting replaces it", { timeout: 20000 }, () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Keeper");
    // Edit AFTER saving → the working state is dirty again.
    commitNumber(screen.getByLabelText("Layup"), "80");
    // Make a second build to switch to.
    saveAsNew("Other");
    commitNumber(screen.getByLabelText("Layup"), "85"); // dirty once more

    const keeperOption = [...switcher().options].find((option) =>
      option.textContent?.startsWith("Keeper"),
    );
    if (keeperOption === undefined) throw new Error("Keeper option missing");

    // Decline: confirm consulted, working state untouched.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(switcher(), { target: { value: keeperOption.value } });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("Unsaved changes will be lost");
    expect((screen.getByLabelText("Layup") as HTMLInputElement).value).toBe("85");

    // Accept: the switch happens — Keeper was saved with Layup 0.
    confirmSpy.mockReturnValue(true);
    fireEvent.change(switcher(), { target: { value: keeperOption.value } });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect((screen.getByLabelText("Layup") as HTMLInputElement).value).toBe("0");
  });

  it("a boot-restored autosave with content is guarded even before any edit this session", { timeout: 20000 }, () => {
    const first = render(<App />);
    buyFloatGameGold();
    saveAsNew("Slasher v2");
    // Reload: the autosave comes back WITHOUT a sourceId (no schema change —
    // sourceId stays out of the envelope), so it is the classic ghost.
    first.unmount();
    render(<App />);
    const savedOption = [...switcher().options].find((option) =>
      option.textContent?.includes("— saved"),
    );
    if (savedOption === undefined) throw new Error("saved option missing");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(switcher(), { target: { value: savedOption.value } });
    // PRE-FIX: no confirm, working replaced silently, next autosave
    // overwrote the only copy of the user's working state.
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("ghost pair labels: '… — unsaved changes' vs '… — saved'; passive default stays the work", { timeout: 20000 }, () => {
    const first = render(<App />);
    buyFloatGameGold();
    saveAsNew("Slasher v2");
    first.unmount();
    render(<App />);
    const control = switcher();
    // Default selection = the working state (value ""), labelled honestly.
    expect(control.value).toBe("");
    expect(control.options[control.selectedIndex]?.textContent).toBe(
      "Slasher v2 — unsaved changes",
    );
    const labels = [...control.options].map((option) => option.textContent);
    expect(labels).toContain("Slasher v2 — saved");
  });
});

describe("F — PersistResult surfaced on rename and delete", () => {
  function failNextWrites() {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
  }

  it("a failed rename raises the alert banner and never optimistically renames the header", { timeout: 20000 }, () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Original");
    expect(screen.queryByRole("alert")).toBeNull();

    failNextWrites();
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("New name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // PRE-FIX: the PersistResult was discarded — no banner, and the
    // current build's header name updated over a write that never landed.
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(switcher().options[switcher().selectedIndex]?.textContent).toContain("Original");
  });

  it("a failed delete raises the alert banner", { timeout: 20000 }, () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Doomed");
    failNextWrites();
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("F — AutosaveWarning re-arms on each new failure epoch", () => {
  it("dismiss → recovery → new failure shows the banner again", { timeout: 20000 }, () => {
    const throwing = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    render(<App />);
    // Epoch 1: banner up; dismiss it.
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();

    // Recovery: writes succeed again (quota freed) — a successful autosave
    // ends the epoch and re-arms the banner.
    throwing.mockRestore();
    commitNumber(screen.getByLabelText("Close"), "50");
    expect(screen.queryByRole("alert")).toBeNull();

    // Epoch 2: failure returns. PRE-FIX the session-long dismissal latch
    // kept this SILENT — a sealed-requirement violation (never a silent
    // autosave failure).
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    commitNumber(screen.getByLabelText("Close"), "60");
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("F — duplicate-name handling: auto-suffix on collision", () => {
  function rowFor(name: string): HTMLElement {
    const rowName = [...document.querySelectorAll(".build-manager__row-name")].find(
      (el) => el.textContent === name,
    );
    const li = rowName?.closest("li");
    if (!(li instanceof HTMLElement)) throw new Error(`row for "${name}" not found`);
    return li;
  }

  it("duplicating the same build twice yields distinguishable names", { timeout: 20000 }, () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Wing");
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    // Duplicate the ORIGINAL twice — the blessed variations mechanism.
    fireEvent.click(within(rowFor("Wing")).getByRole("button", { name: "Duplicate" }));
    fireEvent.click(within(rowFor("Wing")).getByRole("button", { name: "Duplicate" }));
    const names = [...document.querySelectorAll(".build-manager__row-name")].map(
      (el) => el.textContent,
    );
    // PRE-FIX: two identical "Wing copy" rows — indistinguishable in the
    // switcher, manufactured by the blessed variations mechanism.
    expect(names).toContain("Wing");
    expect(names).toContain("Wing copy");
    expect(names).toContain("Wing copy 2");
    expect(new Set(names).size).toBe(names.length);
  });

  it("save-as-new with a taken name auto-suffixes", { timeout: 20000 }, () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Twin");
    commitNumber(screen.getByLabelText("Layup"), "70");
    saveAsNew("Twin");
    expect(switcher().options[switcher().selectedIndex]?.textContent).toContain("Twin 2");
  });
});

describe("E — tail-edit flush on pagehide/visibilitychange", () => {
  it("a pending (unblurred) field edit is committed and autosaved on pagehide", { timeout: 20000 }, () => {
    render(<App />);
    const close = screen.getByLabelText("Close") as HTMLInputElement;
    close.focus();
    fireEvent.change(close, { target: { value: "77" } });
    // NO blur — the edit is pending. PRE-FIX a reload here lost it: the
    // commit only ran on blur and nothing flushed on the way out.
    window.dispatchEvent(new Event("pagehide"));
    const text = installed.store.get(AUTOSAVE_KEY);
    if (text === undefined) throw new Error("no autosave written");
    expect(deserializeSavedBuild(text).build.attributes.close).toBe(77);
  });

  it("visibilitychange → hidden flushes too", { timeout: 20000 }, () => {
    render(<App />);
    const layup = screen.getByLabelText("Layup") as HTMLInputElement;
    layup.focus();
    fireEvent.change(layup, { target: { value: "66" } });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    const text = installed.store.get(AUTOSAVE_KEY);
    if (text === undefined) throw new Error("no autosave written");
    expect(deserializeSavedBuild(text).build.attributes.layup).toBe(66);
  });
});

/* ------------------------------- A6 SHIP GATE 4.2: the data-destruction hazard -- */

/**
 * THE ONE CLOSED LOOP in the app where a DISPLAYED attribute becomes a
 * WRITTEN one: `BuildPanel` passes `build.attributes` down, `AttributeGrid`'s
 * slider renders what it is given, and on commit it calls back with the value
 * it is showing — which `handleAttributeCommit` writes straight into
 * `build.attributes[attr]`.
 *
 * So if an EFFECTIVE value ever reaches that component, the user's entered 60
 * is silently overwritten by the cap-broken 95 on the next nudge of any
 * touched slider. No error, no banner, no undo, and a green suite. The four
 * data-destruction defects before it REFUSED data; this one REWRITES it.
 *
 * This is the third of §3.4's three independent binders (the other two are
 * the engine/UI layering rule and the `.tsx` containment lint), and it is the
 * only one that exercises the real loop end to end.
 *
 * [scope.md §0.1 A6-R9 test 4.2 · engine-data-design §3.4]
 */
describe("A6 4.2 SHIP GATE — the slider owns the ENTERED value, always", () => {
  function seedCapBrokenAutosave() {
    const rig = makeRig({ attributes: { close: 60, layup: 40 } });
    const parsed = JSON.parse(serializeSavedBuild(rig)) as Record<string, unknown>;
    (parsed["build"] as Record<string, unknown>)["capBrokenAttributes"] = {
      close: 95,
      layup: 88,
    };
    installed.store.set(AUTOSAVE_KEY, JSON.stringify(parsed));
  }

  function currentAutosave() {
    const text = installed.store.get(AUTOSAVE_KEY);
    if (text === undefined) throw new Error("no autosave written");
    return deserializeSavedBuild(text);
  }

  it("renders the ENTERED value beside a live cap breaker, never the effective one", () => {
    seedCapBrokenAutosave();
    render(<App />);
    // Hand-seeded, because nothing in A6-E can write a cap breaker yet — the
    // guard lands before the writer, exactly as intended.
    expect(currentAutosave().build.capBrokenAttributes).toEqual({ close: 95, layup: 88 });
    expect((screen.getByLabelText("Close") as HTMLInputElement).value).toBe("60");
    expect((screen.getByLabelText("Layup") as HTMLInputElement).value).toBe("40");
  });

  it(
    "committing the slider stores the SLIDER's value — not the cap-broken one",
    { timeout: 20000 },
    () => {
      seedCapBrokenAutosave();
      render(<App />);
      commitNumber(screen.getByLabelText("Close"), "70");

      const saved = currentAutosave();
      // PRE-FIX SHAPE THIS GUARDS: 95, silently, with the user's 60 gone.
      expect(saved.build.attributes.close).toBe(70);
      // …and the declaration itself is untouched by an attribute commit.
      expect(saved.build.capBrokenAttributes?.close).toBe(95);
      expect(saved.build.capBrokenAttributes?.layup).toBe(88);
    },
  );

  it(
    "committing an UNRELATED slider clobbers neither the entered nor the declared value",
    { timeout: 20000 },
    () => {
      seedCapBrokenAutosave();
      render(<App />);
      commitNumber(screen.getByLabelText("Mid"), "55");

      const saved = currentAutosave();
      expect(saved.build.attributes.close).toBe(60);
      expect(saved.build.attributes.mid).toBe(55);
      expect(saved.build.capBrokenAttributes).toEqual({ close: 95, layup: 88 });
    },
  );
});
