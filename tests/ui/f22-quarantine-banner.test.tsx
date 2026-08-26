// @vitest-environment jsdom
/**
 * F2.2 slice B — the quarantine disclosure.
 *
 * The banner is the surface that turns "preserved" into something the user
 * can act on. It describes a STANDING CONDITION, not an event, so it is not
 * dismissible while the quarantine exists — dismissing it would hide the only
 * pointer to the preserved data.
 *
 * `Export raw saved data` sits FIRST, deliberately, mirroring the recovery
 * screen in src/main.tsx: "'Export raw saved data' exists precisely so
 * clearing is never the only way out."
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";
const QUARANTINE_KEY = "badge-builder-2k27:autosave-quarantine:v1";
const COPY = "A saved build couldn't be read — it's been preserved, not deleted.";
const CORRUPT = "{not json";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("2.1 — renders after an unreadable boot, absent after a valid one", () => {
  it("shows the exact copy when a quarantine stands", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    render(<App />);
    expect(screen.getByText(COPY)).toBeTruthy();
  });

  it("renders nothing on a healthy boot", { timeout: 20000 }, () => {
    expect(writeAutosave(makeRig({ name: "Healthy" })).ok).toBe(true);
    render(<App />);
    expect(screen.queryByText(COPY)).toBeNull();
  });
});

describe("2.2 — 'Export raw saved data' ships the quarantined bytes", () => {
  it("the Blob's JSON carries the quarantine key with the ORIGINAL string", { timeout: 20000 }, async () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    let capturedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:test";
    });
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function noop() {});

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Export raw saved data" }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(capturedBlob).not.toBeNull();
    const parsed = JSON.parse(await (capturedBlob as unknown as Blob).text()) as Record<
      string,
      unknown
    >;
    expect(parsed[QUARANTINE_KEY]).toBe(CORRUPT);
  });
});

describe("2.3 — 'Discard' is the ONLY deleting path, and it re-arms autosave", () => {
  it("removes the quarantine key, hides the banner, and the next write lands", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    render(<App />);
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
    expect(screen.queryByText(COPY)).toBeNull();
    // Autosave resumes normally — no further interaction required.
    const written = installed.store.get(AUTOSAVE_KEY) as string;
    expect(written).not.toBe(CORRUPT);
    expect(JSON.parse(written).loadout).toEqual([]);
  });
});

describe("2.1b — a STANDING quarantine discloses itself even when this boot read fine", () => {
  it("shows the banner when the quarantine key survives an autosave-only clear", { timeout: 20000 }, () => {
    // "Clear just the unreadable autosave" removes the autosave key and
    // leaves the preserved bytes. The next boot reads "absent" — the banner
    // must still point at them, or they sit in storage unreachable.
    installed.store.set(QUARANTINE_KEY, CORRUPT);
    render(<App />);
    expect(screen.getByText(COPY)).toBeTruthy();
  });

  it("a standing quarantine does NOT suppress autosave for a healthy build", { timeout: 20000 }, () => {
    installed.store.set(QUARANTINE_KEY, CORRUPT);
    expect(writeAutosave(makeRig({ name: "Healthy" })).ok).toBe(true);
    render(<App />);
    // persistableRef is seeded from the BOOT OUTCOME, not the quarantine.
    expect(JSON.parse(installed.store.get(AUTOSAVE_KEY) as string).name).toBe("Healthy");
    expect(screen.getByText(COPY)).toBeTruthy();
  });
});

describe("2.4 — not dismissible while the quarantine exists", () => {
  it("offers Export and Discard, and no Dismiss control", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    render(<App />);
    const banner = screen.getByText(COPY).closest(".banner") as HTMLElement;
    expect(banner).toBeTruthy();
    expect(within_(banner, "Export raw saved data")).toBeTruthy();
    expect(within_(banner, "Discard")).toBeTruthy();
    expect(within_(banner, "Dismiss")).toBeNull();
  });
});

function within_(root: HTMLElement, name: string): HTMLElement | null {
  return (
    [...root.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === name,
    ) ?? null
  );
}
