// @vitest-environment jsdom
/**
 * F2.2 F-C — refuse to clobber an unparseable named-builds envelope; and
 * F2.2 F-F / test 8.1 — the same shape in the UI-prefs writer.
 *
 * `readStore()` returns `{}` when the envelope cannot be read, and every
 * mutator then wrote a ONE-ENTRY object over bytes that held every named
 * build. Structurally identical to F-CORE, with a blast radius of every
 * build.
 *
 * REACHABILITY, honestly: not reachable from the app today — `setItem` is
 * atomic, and a throwing `setItem` provably leaves the prior value
 * byte-identical — so it needs exogenous corruption or a future format
 * change. It is pinned anyway, because "not currently reachable" is exactly
 * what was true of the two earlier instances of this class until a shape
 * change made them reachable.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNamedBuild,
  readUiSectionOpen,
  renameNamedBuild,
  saveNamedBuild,
  writeUiSectionOpen,
} from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const NAMED_BUILDS_KEY = "badge-builder-2k27:named-builds:v1";
const UI_STATE_KEY = "badge-builder-2k27:ui-state:v1";
const CORRUPT_ENVELOPE = '{"b-1": "…truncated mid-write';

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("5.1 — saveNamedBuild refuses rather than clobbering", () => {
  it("returns {ok:false} and leaves the original bytes unchanged", () => {
    installed.store.set(NAMED_BUILDS_KEY, CORRUPT_ENVELOPE);
    const result = saveNamedBuild("b-new", makeRig({ name: "New" }));
    expect(result.ok).toBe(false);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(CORRUPT_ENVELOPE);
  });

  it("a JSON-valid but non-object envelope is refused too", () => {
    installed.store.set(NAMED_BUILDS_KEY, '["not", "a", "store"]');
    expect(saveNamedBuild("b-new", makeRig({ name: "New" })).ok).toBe(false);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe('["not", "a", "store"]');
  });
});

describe("5.2 — the same refusal for deleteNamedBuild and renameNamedBuild", () => {
  it("delete refuses and preserves the bytes", () => {
    installed.store.set(NAMED_BUILDS_KEY, CORRUPT_ENVELOPE);
    // The id is not visible in an unreadable store, so delete short-circuits
    // to ok:true without writing — the bytes are what matter either way.
    expect(deleteNamedBuild("b-1").ok).toBe(true);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(CORRUPT_ENVELOPE);
  });

  it("rename refuses and preserves the bytes", () => {
    installed.store.set(NAMED_BUILDS_KEY, CORRUPT_ENVELOPE);
    expect(renameNamedBuild("b-1", "Renamed").ok).toBe(true);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(CORRUPT_ENVELOPE);
  });

  it("a delete against a READABLE store still works and still writes", () => {
    expect(saveNamedBuild("b-1", makeRig({ name: "One" })).ok).toBe(true);
    expect(saveNamedBuild("b-2", makeRig({ name: "Two" })).ok).toBe(true);
    expect(deleteNamedBuild("b-1").ok).toBe(true);
    const store = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<
      string,
      string
    >;
    expect(Object.keys(store)).toEqual(["b-2"]);
  });
});

describe("5.3 — the guard fires on UNPARSEABLE, never on ABSENT", () => {
  it("saveNamedBuild succeeds normally with no envelope at all", () => {
    expect(installed.store.has(NAMED_BUILDS_KEY)).toBe(false);
    expect(saveNamedBuild("b-new", makeRig({ name: "New" })).ok).toBe(true);
    const store = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<
      string,
      string
    >;
    expect(Object.keys(store)).toEqual(["b-new"]);
  });
});

describe("8.1 — writeUiSectionOpen: F-F, the same shape ruled to the minimum", () => {
  it("does not reset a present-but-unparseable UI-state value", () => {
    installed.store.set(UI_STATE_KEY, "{not json");
    writeUiSectionOpen("badge-grid", true);
    // Silent by design: a layout preference earns no banner, but it does not
    // earn the right to destroy bytes we could not read either.
    expect(installed.store.get(UI_STATE_KEY)).toBe("{not json");
    expect(readUiSectionOpen("badge-grid")).toBeNull();
  });

  it("merges the single key into a readable object, keeping its siblings", () => {
    installed.store.set(UI_STATE_KEY, JSON.stringify({ synergy: false, summary: true }));
    writeUiSectionOpen("badge-grid", true);
    const state = JSON.parse(installed.store.get(UI_STATE_KEY) as string) as Record<
      string,
      unknown
    >;
    expect(state).toEqual({ synergy: false, summary: true, "badge-grid": true });
  });

  it("writes normally when nothing is stored yet", () => {
    writeUiSectionOpen("badge-grid", false);
    expect(readUiSectionOpen("badge-grid")).toBe(false);
  });
});
