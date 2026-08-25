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
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { deserializeSavedBuild } from "../../src/engine/serialization";
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

  it("a boot-restored autosave with content is guarded even before any edit this session", () => {
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

  it("ghost pair labels: '… — unsaved changes' vs '… — saved'; passive default stays the work", () => {
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

  it("a failed rename raises the alert banner and never optimistically renames the header", () => {
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

  it("a failed delete raises the alert banner", () => {
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
  it("dismiss → recovery → new failure shows the banner again", () => {
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

  it("duplicating the same build twice yields distinguishable names", () => {
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

  it("save-as-new with a taken name auto-suffixes", () => {
    render(<App />);
    buyFloatGameGold();
    saveAsNew("Twin");
    commitNumber(screen.getByLabelText("Layup"), "70");
    saveAsNew("Twin");
    expect(switcher().options[switcher().selectedIndex]?.textContent).toContain("Twin 2");
  });
});

describe("E — tail-edit flush on pagehide/visibilitychange", () => {
  it("a pending (unblurred) field edit is committed and autosaved on pagehide", () => {
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

  it("visibilitychange → hidden flushes too", () => {
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
