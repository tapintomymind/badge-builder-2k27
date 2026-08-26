// @vitest-environment jsdom
/**
 * F2.2 slice A — THE CORE GUARD. This file is the slice's reason to exist.
 *
 * PRE-FIX: `readAutosaveWithReport()` returned `null` for BOTH "there is no
 * autosave" and "there is an autosave and I could not read it". The boot
 * path could not tell them apart, so an unreadable autosave booted a fresh
 * working state — and the mount-time autosave `useEffect` immediately wrote
 * that empty build over the user's real, unreadable-but-recoverable bytes.
 * F1's "Export raw saved data" recovery could never help: it is wired to the
 * RENDER ERROR BOUNDARY, which does not fire on the swallowed path.
 *
 * POST-FIX: the bytes are quarantined verbatim during the boot render, and
 * BOTH autosave writers — the `useEffect([working])` and the
 * pagehide/visibilitychange flush — are gated on the SAME predicate,
 * "the app holds a state worth persisting". That predicate is deliberately
 * NOT `dirty` (see 1.4).
 *
 * Every assertion is against the storage stub's backing Map: `store.get(key)`
 * is how we prove bytes survived.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  SAVED_BUILD_SCHEMA_VERSION,
  serializeSavedBuild,
} from "../../src/engine/serialization";
import { saveNamedBuild, writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";
const QUARANTINE_KEY = "badge-builder-2k27:autosave-quarantine:v1";

/** Not JSON at all — the widest class of unreadable, and the one a user can
 * reproduce by hand in DevTools. */
const CORRUPT = '{not json — the user\'s real build, mangled';

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

function fireTabAway() {
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  fireEvent(window, new Event("pagehide"));
}

describe("1.1 — an unreadable autosave is PRESERVED, quarantined, and never overwritten", () => {
  it("boots without crashing, keeps the original bytes verbatim, and quarantines them", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);

    render(<App />);

    // (a) it renders — the catch still never takes the app down at boot.
    expect(screen.getByRole("banner")).toBeTruthy();
    // (b) THE ONE THAT MATTERS: the original string is still there, verbatim.
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);
    // (c) and it is preserved a second time under the quarantine key.
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);
    // (d) the working state is fresh — an empty loadout, default height.
    expect(screen.getByLabelText("Close")).toHaveProperty("value", "0");
  });
});

describe("1.2 — mount alone never writes, and neither does the flush", () => {
  it("no interaction: the autosave key is unchanged, including on pagehide/visibilitychange", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    render(<App />);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);

    // The second half is the assertion a naive `dirty` guard fails outright:
    // the flush wrote UNCONDITIONALLY pre-fix, so gating only the useEffect
    // returns the whole bug the moment the tab is closed or backgrounded.
    fireTabAway();
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);
  });
});

describe("1.3 — an edit re-arms persistence, and does NOT discard the quarantine", () => {
  it("one user edit writes the autosave; the quarantine survives", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    render(<App />);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);

    commitNumber(screen.getByLabelText("Close"), "90");

    const written = installed.store.get(AUTOSAVE_KEY) as string;
    expect(written).not.toBe(CORRUPT);
    expect(JSON.parse(written).build.attributes.close).toBe(90);
    // An edit is not a discard.
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);
  });
});

describe("1.4 — a load re-arms persistence: the markClean() trap", () => {
  it("loading a named build writes it to the autosave even though the load marks it CLEAN", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    expect(
      saveNamedBuild(
        "b-loadme",
        makeRig({ name: "Loadable", attributes: { close: 77 } }),
      ).ok,
    ).toBe(true);

    render(<App />);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);

    const switcher = screen.getByLabelText("Saved builds") as HTMLSelectElement;
    fireEvent.change(switcher, { target: { value: "b-loadme" } });

    // A dirty-keyed guard fails HERE: loadBuild calls markClean(), so the
    // freshly loaded build would never autosave and the next reload would
    // restore the PREVIOUS autosave — a new data-loss bug for an old one.
    const written = installed.store.get(AUTOSAVE_KEY) as string;
    expect(written).not.toBe(CORRUPT);
    expect(JSON.parse(written).name).toBe("Loadable");
    expect(JSON.parse(written).build.attributes.close).toBe(77);
  });
});

describe("1.5 — NON-REGRESSION: the healthy path is byte-for-byte unchanged", () => {
  it("a valid autosave still triggers the mount write, producing the same bytes as before the slice", { timeout: 20000 }, () => {
    const rig = makeRig({ name: "Healthy", attributes: { close: 61 } });
    expect(writeAutosave(rig).ok).toBe(true);
    const seeded = installed.store.get(AUTOSAVE_KEY) as string;

    render(<App />);

    const written = installed.store.get(AUTOSAVE_KEY) as string;
    // The mount write DID happen (the guard is a no-op on this path)...
    expect(written).not.toBe(seeded); // only savedAt differs
    const parsed = JSON.parse(written) as Record<string, unknown>;

    // ...and the bytes are exactly serializeSavedBuild(toEnvelope(fromSaved(...)))
    // — i.e. the seeded envelope with a fresh savedAt and nothing else moved.
    const expected = serializeSavedBuild({
      ...rig,
      savedAt: parsed["savedAt"] as string,
    });
    expect(written).toBe(expected);
    expect(parsed["schemaVersion"]).toBe(SAVED_BUILD_SCHEMA_VERSION);
    // No quarantine is manufactured on a healthy boot.
    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
  });
});

describe("1.6 — the quarantine is written ONCE", () => {
  it("a second boot against the same unreadable autosave does not overwrite the first bytes", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    const first = render(<App />);
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);
    first.unmount();

    // Simulate a degraded second boot: the live key has since been mangled
    // further. The FIRST quarantine is the one closest to the real data.
    installed.store.set(AUTOSAVE_KEY, "{even worse");
    render(<App />);
    expect(installed.store.get(QUARANTINE_KEY)).toBe(CORRUPT);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe("{even worse");
  });
});

describe("1.7 — a FAILING quarantine write still suppresses autosave", () => {
  it("never trades the user's data for a successful fresh write, and says so on role='alert'", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    const realSetItem = installed.storage.setItem.bind(installed.storage);
    vi.spyOn(installed.storage, "setItem").mockImplementation((key: string, value: string) => {
      if (key === QUARANTINE_KEY) throw new DOMException("quota", "QuotaExceededError");
      realSetItem(key, value);
    });

    render(<App />);

    // A failed quarantine is strictly MORE reason to suppress, not less.
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);
    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("autosave");
    // The flush must not sneak a write in either.
    fireTabAway();
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(CORRUPT);
  });
});

describe("1.8 — 'absent' is not 'unreadable'", () => {
  it("a first-ever boot quarantines nothing, shows no banner, and writes normally", { timeout: 20000 }, () => {
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(false);

    render(<App />);

    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
    expect(
      screen.queryByText(/couldn't be read — it's been preserved, not deleted/i),
    ).toBeNull();
    // The mount write proceeds: a first-ever boot is not a defect.
    const written = installed.store.get(AUTOSAVE_KEY) as string;
    expect(written).toBeDefined();
    expect(JSON.parse(written).loadout).toEqual([]);
  });
});

describe("F-E 7.1/7.2 — the working build's own guard still holds after the slice", () => {
  it("the switcher guard is unchanged for a dirty working build", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, CORRUPT);
    expect(saveNamedBuild("b-other", makeRig({ name: "Other" })).ok).toBe(true);
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    const pips = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    fireEvent.click(within(pips).getByRole("radio", { name: /^Gold/ }));

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Saved builds") as HTMLSelectElement, {
      target: { value: "b-other" },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});
