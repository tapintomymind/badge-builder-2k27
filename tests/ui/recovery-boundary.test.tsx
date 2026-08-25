// @vitest-environment jsdom
/**
 * F1 item 2 backstop — the render error boundary exported by src/main.tsx.
 * PRE-FIX this file failed at import: src/main.tsx exported no boundary and a
 * render throw white-screened the whole app.
 *
 * The load-bearing assertion: the boundary NEVER clears storage by itself —
 * clearing happens only on the explicit "Clear saved data" click, and
 * "Export raw saved data" ships the verbatim raw strings so clearing is
 * never the only way out.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportRawPersistedData } from "../../src/persist/local-storage";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";
const NAMED_BUILDS_KEY = "badge-builder-2k27:named-builds:v1";
const UI_STATE_KEY = "badge-builder-2k27:ui-state:v1";
const QUARANTINE_KEY = "badge-builder-2k27:autosave-quarantine:v1";

/** F2.2 slice D re-cut the nuclear button's copy to state its blast radius. */
const CLEAR_ALL =
  "Clear ALL saved data — the autosave, every named build, and layout preferences";
const CLEAR_AUTOSAVE_ONLY = "Clear just the unreadable autosave";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
  // React logs every boundary-caught error; keep test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb(): never {
  throw new Error("boom: poisoned render");
}

/** src/main.tsx mounts the real app at import time — give it its #root. */
async function loadRecoveryBoundary() {
  if (document.getElementById("root") === null) {
    const rootEl = document.createElement("div");
    rootEl.id = "root";
    document.body.appendChild(rootEl);
  }
  const mod = await import("../../src/main");
  return mod.RecoveryBoundary;
}

describe("RecoveryBoundary — minimal recovery screen instead of a white screen", () => {
  it("renders children untouched when nothing throws", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    render(
      <RecoveryBoundary>
        <p>healthy subtree</p>
      </RecoveryBoundary>,
    );
    expect(screen.getByText("healthy subtree")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("catches a render throw: message + both recovery actions — and storage is NOT auto-cleared", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "{poisoned-but-precious}");
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/rendering error/i)).toBeTruthy();
    expect(screen.getByText(/boom: poisoned render/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export raw saved data" })).toBeTruthy();
    expect(screen.getByRole("button", { name: CLEAR_AUTOSAVE_ONLY })).toBeTruthy();
    expect(screen.getByRole("button", { name: CLEAR_ALL })).toBeTruthy();
    // NEVER auto-clears: the stored string survives the crash, verbatim.
    expect(installed.store.get(AUTOSAVE_KEY)).toBe("{poisoned-but-precious}");
  });

  /** F2.2 test 4.3 — the nuclear action, once confirmed, takes EVERYTHING
   * including the quarantine key ("clear everything" must not silently leave
   * data behind). */
  it("clears every app key ONLY on the explicit nuclear click, and only after the confirm", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "a");
    installed.store.set(NAMED_BUILDS_KEY, "b");
    installed.store.set(UI_STATE_KEY, "c");
    installed.store.set(QUARANTINE_KEY, "d");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    expect(installed.store.size).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: CLEAR_ALL }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(false);
    expect(installed.store.has(NAMED_BUILDS_KEY)).toBe(false);
    expect(installed.store.has(UI_STATE_KEY)).toBe(false);
    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
  });

  /** F2.2 test 4.2 — PRE-FIX this destroyed every named build on ONE
   * unconfirmed click, while deleting a SINGLE build required an in-row
   * confirm. Declining must leave everything exactly where it was. */
  it("F-B 4.2: declining the nuclear confirm leaves EVERYTHING in place", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "a");
    installed.store.set(NAMED_BUILDS_KEY, "b");
    installed.store.set(UI_STATE_KEY, "c");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: CLEAR_ALL }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe("a");
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe("b");
    expect(installed.store.get(UI_STATE_KEY)).toBe("c");
  });

  /** F2.2 test 4.2b — the confirm NAMES the blast radius. Pre-fix the copy
   * said "clear it" while the function took every named build too. */
  it("F-B 4.2b: the nuclear confirm names the named-build count", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "a");
    installed.store.set(
      NAMED_BUILDS_KEY,
      JSON.stringify({ "b-1": "{oops", "b-2": "{oops-too" }),
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: CLEAR_ALL }));
    const message = confirmSpy.mock.calls[0]?.[0] as string;
    // Unreadable entries are still the user's builds — they count.
    expect(message).toContain("2 named builds");
    expect(message).toContain("the autosave");
    expect(message).toContain("cannot be undone");
  });

  /** F2.2 test 4.1 — the surgical action. `clearAutosave()` shipped with
   * ZERO callers, so the only exit from an unreadable autosave was the one
   * that also destroyed every named build. */
  it("F-B 4.1: 'Clear just the unreadable autosave' removes the autosave and leaves named builds intact", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "{not json");
    installed.store.set(NAMED_BUILDS_KEY, "b");
    installed.store.set(UI_STATE_KEY, "c");
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: CLEAR_AUTOSAVE_ONLY }));
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(false);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe("b");
    expect(installed.store.get(UI_STATE_KEY)).toBe("c");
  });

  it("'Export raw saved data' downloads the verbatim raw strings (Blob + <a download>, no network)", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "{raw-verbatim-autosave}");
    let capturedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:test";
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function noop() {});

    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export raw saved data" }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(capturedBlob).not.toBeNull();
    const text = await (capturedBlob as unknown as Blob).text();
    expect(text).toContain("{raw-verbatim-autosave}");
    // F2.2 test 8.2 (structural): on THIS screen the export is the user's
    // only copy — the revoke must not race the browser's read of the URL.
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe("persist recovery surface (consumed only by the boundary)", () => {
  /** F2.2 test 4.4 — the key set is RE-PINNED: the quarantine key must ride
   * along, or the preserved bytes are unreachable by the only export we
   * have, which would make the quarantine pointless. */
  it("exportRawPersistedData returns every app key's raw string verbatim, null when absent", () => {
    installed.store.set(AUTOSAVE_KEY, "{not-even-json");
    installed.store.set(QUARANTINE_KEY, "{quarantined-verbatim");
    const parsed = JSON.parse(exportRawPersistedData()) as Record<string, unknown>;
    expect(parsed[AUTOSAVE_KEY]).toBe("{not-even-json");
    expect(parsed[NAMED_BUILDS_KEY]).toBeNull();
    expect(parsed[UI_STATE_KEY]).toBeNull();
    expect(parsed[QUARANTINE_KEY]).toBe("{quarantined-verbatim");
    expect(Object.keys(parsed).sort()).toEqual(
      [AUTOSAVE_KEY, NAMED_BUILDS_KEY, UI_STATE_KEY, QUARANTINE_KEY].sort(),
    );
  });
});
