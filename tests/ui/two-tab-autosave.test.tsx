// @vitest-environment jsdom
/**
 * F2.3 — TWO WRITERS AGAINST ONE STORE. Nothing in tests/ referenced a second
 * tab, a foreign write or a concurrent writer before this file existed, which
 * is why the defect it pins survived every previous pass over this code.
 *
 * THE DEFECT. Both autosave writers serialized a LONG-LIVED in-memory copy and
 * `setItem` over the key without ever reading what was there. Both were gated
 * on `persistableRef`, which asks a purely LOCAL question — "does this
 * instance hold a state worth persisting?" — and never the relational one:
 * "is what I am about to write derived from the bytes currently in storage?"
 * A tab opened an hour ago answers the local question `true` forever, so
 * closing it reverted a newer tab's work, with no edit and no intent.
 *
 * TWO REAL `App` INSTANCES, one shared storage stub, separate containers.
 * `useId` is per-root in this React version (verified: the two roots produce
 * distinct ids), so label queries scoped with `within` reach the right tab.
 */

import { fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { deserializeSavedBuild } from "../../src/engine/serialization";
import { writeAutosave } from "../../src/persist/local-storage";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";
import { makeRig } from "./m4-rig";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function newTab(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

/** The attribute value currently in storage — the single number every
 * assertion in this file turns on. */
function storedClose(): number {
  const text = installed.store.get(AUTOSAVE_KEY);
  if (text === undefined) throw new Error("no autosave in storage");
  return deserializeSavedBuild(text).build.attributes.close;
}

function commit(input: Element, value: string): void {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

/** A pending edit: typed, NOT blurred. This is the ONLY thing the unload
 * flush exists to capture. */
function typeWithoutCommitting(input: Element, value: string): void {
  (input as HTMLInputElement).focus();
  fireEvent.change(input, { target: { value } });
}

function closeFieldIn(container: HTMLElement): HTMLInputElement {
  return within(container).getByLabelText("Close, exact value") as HTMLInputElement;
}

/**
 * `fireEvent` wraps in `act()`, so React's own work — including the
 * state-change writer reacting to the commit the flush's blur just made —
 * runs to completion before the assertion. That is the STRICTER model: it
 * gives the unguarded writer every chance to undo the guarded one, which is
 * exactly what `flushSettledWorkingRef` exists to prevent on the trigger that
 * leaves the tab alive.
 */
function fireUnload(): void {
  fireEvent(window, new Event("pagehide"));
}

/** The other trigger. Same flush, but the tab keeps running afterwards, so
 * React really does re-render and the state-change writer really does fire. */
function fireTabHidden(): void {
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  fireEvent(document, new Event("visibilitychange"));
}

describe("2.1 — THE HEADLINE: a stale tab's unload does NOT revert a newer tab's work", () => {
  it("tab A edits, tab B is closed, and A's bytes survive", { timeout: 20000 }, () => {
    const tabA = newTab();
    const instanceA = render(<App />, { container: tabA });
    // A does the first edit. Only A is mounted, so a bare screen query is
    // unambiguous — and this is the state B is about to boot from.
    commit(closeFieldIn(tabA), "30");
    expect(storedClose()).toBe(30);

    // ---- B opens here, and everything after this point is invisible to it.
    const tabB = newTab();
    render(<App />, { container: tabB });
    expect(closeFieldIn(tabB).value).toBe("30");

    // ---- A keeps working. Two more commits, exactly as the two-tab
    // reproduction does (PG → C → PF becomes 30 → 60 → 90 here).
    commit(closeFieldIn(tabA), "60");
    commit(closeFieldIn(tabA), "90");
    expect(storedClose()).toBe(90);

    // B still holds the hour-old copy. THIS is what makes the test non-vacuous:
    // if B had somehow re-read storage, the flush writing would be harmless.
    expect(closeFieldIn(tabB).value).toBe("30");

    // A's window is not B's window: A's unload listeners are not on B's
    // unload, and A cannot blur B's focused field. Both roots share one jsdom
    // `window` here, so A is genuinely UNMOUNTED to model that — merely
    // detaching its container would leave A's flush handler live, and it would
    // blur B's field out from under B's own flush.
    instanceA.unmount();
    fireUnload();

    // PRE-FIX: B serialized its stale in-memory build and setItem'd over the
    // key, and this read 30 — the newer tab's two commits, gone, with no way
    // back.
    expect(storedClose()).toBe(90);
  });
});

describe("2.2 — LAYER 3: a stale tab holding a REAL mid-edit field still does not overwrite", () => {
  it("the blur commits, the flush has something to add, and the write is refused anyway", { timeout: 20000 }, () => {
    const tabA = newTab();
    const instanceA = render(<App />, { container: tabA });
    commit(closeFieldIn(tabA), "30");

    const tabB = newTab();
    render(<App />, { container: tabB });

    commit(closeFieldIn(tabA), "90");
    expect(storedClose()).toBe(90);
    instanceA.unmount(); // see 2.1 — one window, two roots


    // B has a genuine pending edit — layer 1 will NOT skip this flush. Only
    // the concurrency check stands between it and the newer bytes.
    typeWithoutCommitting(closeFieldIn(tabB), "55");
    fireUnload();

    // The blur DID commit inside B (its own state moved)…
    expect(closeFieldIn(tabB).value).toBe("55");
    // …and the newer tab's bytes are still the ones in storage. Preserved by
    // writing nothing: never adopted, never merged, never overwritten.
    expect(storedClose()).toBe(90);
  });

  it("a foreign write is detected against what THIS instance last wrote, not just its boot read", { timeout: 20000 }, () => {
    // The single-tab form of the same property, and the one that pins the ref
    // being updated on every write rather than only at boot.
    const tab = newTab();
    render(<App />, { container: tab });
    commit(closeFieldIn(tab), "30");
    expect(storedClose()).toBe(30);

    // Another tab writes. `writeAutosave` is the app's own writer, so these
    // are real bytes from a real writer, not a hand-mangled string.
    expect(writeAutosave(makeRig({ attributes: { close: 71 } })).ok).toBe(true);

    typeWithoutCommitting(closeFieldIn(tab), "44");
    fireUnload();
    expect(storedClose()).toBe(71);
  });
});

describe("2.7 — the OTHER trigger: a backgrounded tab that keeps running", () => {
  it("visibilitychange -> hidden refuses too, and the state-change writer does not undo it", { timeout: 20000 }, () => {
    // pagehide destroys the document, so the guarded writer is trivially the
    // last word. visibilitychange does not: React re-renders, the UNGUARDED
    // state-change writer fires for the commit the flush's own blur made, and
    // without `flushSettledWorkingRef` it would land exactly the stale
    // envelope the guarded writer had just declined. Layer 3 would be
    // decorative on the one trigger that leaves a tab alive.
    const tabA = newTab();
    const instanceA = render(<App />, { container: tabA });
    commit(closeFieldIn(tabA), "30");

    const tabB = newTab();
    render(<App />, { container: tabB });

    commit(closeFieldIn(tabA), "90");
    instanceA.unmount(); // see 2.1 — one window, two roots

    typeWithoutCommitting(closeFieldIn(tabB), "55");
    fireTabHidden();

    expect(closeFieldIn(tabB).value).toBe("55");
    expect(storedClose()).toBe(90);
  });

  it("a backgrounded tab with NO foreign writer still saves its tail edit", { timeout: 20000 }, () => {
    // The non-regression half: suppressing the duplicate write must not
    // suppress the only write.
    const tab = newTab();
    render(<App />, { container: tab });
    typeWithoutCommitting(closeFieldIn(tab), "63");
    fireTabHidden();
    expect(storedClose()).toBe(63);
  });
});

describe("2.3 — R6: a read FAILURE is not a foreign write, and it fails OPEN", () => {
  it("a throwing getItem still lets the tail edit through", { timeout: 20000 }, () => {
    // THE MOST LIKELY WAY THIS BECOMES THE NEXT DEFECT. `getItem` returns null
    // both on absence and on a thrown error; reading a transient failure as
    // "someone changed it" and suppressing the write converts a hiccup into
    // total autosave loss.
    const tab = newTab();
    render(<App />, { container: tab });
    commit(closeFieldIn(tab), "30");

    const realGetItem = installed.storage.getItem.bind(installed.storage);
    vi.spyOn(installed.storage, "getItem").mockImplementation((key: string) => {
      if (key === AUTOSAVE_KEY) throw new DOMException("nope", "SecurityError");
      return realGetItem(key);
    });

    typeWithoutCommitting(closeFieldIn(tab), "82");
    fireUnload();

    vi.restoreAllMocks();
    expect(storedClose()).toBe(82);
  });

  it("an ABSENT key is not a foreign write either — a removal never disables autosave", { timeout: 20000 }, () => {
    const tab = newTab();
    render(<App />, { container: tab });
    commit(closeFieldIn(tab), "30");

    // "Clear just the autosave" on the recovery screen does exactly this.
    installed.store.delete(AUTOSAVE_KEY);

    typeWithoutCommitting(closeFieldIn(tab), "64");
    fireUnload();
    expect(storedClose()).toBe(64);
  });
});

describe("2.4 — R2: the flush is still the retry for a failed write", () => {
  it("writes on unload with NO blur commit at all, when the last write failed", { timeout: 20000 }, () => {
    // Layer 1 skips a flush that committed nothing. The flush has always
    // doubled as the de facto retry after a throwing setItem (quota, Safari
    // private mode), and dropping that would trade one data loss for another.
    const realSetItem = installed.storage.setItem.bind(installed.storage);
    const failing = vi
      .spyOn(installed.storage, "setItem")
      .mockImplementation((key: string, value: string) => {
        if (key === AUTOSAVE_KEY) throw new DOMException("quota", "QuotaExceededError");
        realSetItem(key, value);
      });

    const tab = newTab();
    render(<App />, { container: tab });
    // The mount write failed, and it said so.
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(false);
    expect(within(tab).getByRole("alert").textContent).toContain("autosave");

    // Storage recovers. No edit, no blur, nothing for layer 1 to notice.
    failing.mockRestore();
    fireUnload();

    expect(installed.store.has(AUTOSAVE_KEY)).toBe(true);
  });
});

describe("2.5 — LAYER 1 NON-REGRESSION: the flush still does the one job it exists for", () => {
  it("a pending unblurred edit in the only open tab is committed and written", { timeout: 20000 }, () => {
    const tab = newTab();
    render(<App />, { container: tab });
    typeWithoutCommitting(closeFieldIn(tab), "77");
    fireUnload();
    expect(storedClose()).toBe(77);
  });

  it("a flush that commits nothing writes nothing — the bytes are untouched, not rewritten", { timeout: 20000 }, () => {
    const tab = newTab();
    render(<App />, { container: tab });
    commit(closeFieldIn(tab), "30");
    const before = installed.store.get(AUTOSAVE_KEY) as string;

    fireUnload();

    // Byte-identical, not merely equivalent: a rewrite would differ in
    // `savedAt` alone and would still be the unconditional write that caused
    // the defect.
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(before);
  });
});

describe("2.6 — THE DOCUMENTED RESIDUAL: an intentional edit in a stale tab still wins", () => {
  it("writer 1 is deliberately UNGUARDED, and that is a decision rather than an oversight", { timeout: 20000 }, () => {
    // tech-strategy.md §9's last-write-wins bargain is about EDITS, and it
    // stands. Refusing an intentional edit's write would silently stop
    // autosaving for someone actively working — the other tab's loss traded
    // for this tab's total loss. Pinned so the next reader sees it was ruled
    // on, and so a change of ruling has to change a test.
    const tabA = newTab();
    const instanceA = render(<App />, { container: tabA });
    commit(closeFieldIn(tabA), "30");

    const tabB = newTab();
    render(<App />, { container: tabB });

    commit(closeFieldIn(tabA), "90");
    expect(storedClose()).toBe(90);
    instanceA.unmount(); // see 2.1 — one window, two roots


    commit(closeFieldIn(tabB), "12");
    expect(storedClose()).toBe(12);
  });
});
