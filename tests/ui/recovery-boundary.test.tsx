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
    expect(screen.getByRole("button", { name: "Clear saved data" })).toBeTruthy();
    // NEVER auto-clears: the stored string survives the crash, verbatim.
    expect(installed.store.get(AUTOSAVE_KEY)).toBe("{poisoned-but-precious}");
  });

  it("clears every app key ONLY on the explicit 'Clear saved data' click", async () => {
    const RecoveryBoundary = await loadRecoveryBoundary();
    installed.store.set(AUTOSAVE_KEY, "a");
    installed.store.set(NAMED_BUILDS_KEY, "b");
    installed.store.set(UI_STATE_KEY, "c");
    render(
      <RecoveryBoundary>
        <Bomb />
      </RecoveryBoundary>,
    );
    expect(installed.store.size).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Clear saved data" }));
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(false);
    expect(installed.store.has(NAMED_BUILDS_KEY)).toBe(false);
    expect(installed.store.has(UI_STATE_KEY)).toBe(false);
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
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("persist recovery surface (consumed only by the boundary)", () => {
  it("exportRawPersistedData returns every app key's raw string verbatim, null when absent", () => {
    installed.store.set(AUTOSAVE_KEY, "{not-even-json");
    const parsed = JSON.parse(exportRawPersistedData()) as Record<string, unknown>;
    expect(parsed[AUTOSAVE_KEY]).toBe("{not-even-json");
    expect(parsed[NAMED_BUILDS_KEY]).toBeNull();
    expect(parsed[UI_STATE_KEY]).toBeNull();
  });
});
