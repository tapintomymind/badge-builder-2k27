// @vitest-environment jsdom
/**
 * F2.2 F-A (P0) + F-D — rename changes the NAME and nothing else; duplicate
 * copies BYTES, not a transformation.
 *
 * PRE-FIX `renameNamedBuild` read through the full deserializer — which
 * applies the H8 drift strip AND the F2.1 stranded-ref heal, and rebuilds
 * the envelope from a fixed field list — discarded the report, and wrote the
 * TRANSFORMED result back over the original. A rename silently rewrote the
 * loadout. `duplicateBuild` had the same shape, one severity lower: the
 * original survived but the copy differed from its source with no
 * disclosure.
 *
 * The fixture below is deliberately BOTH kinds of drifted at once: a loadout
 * row for a badge that is absent from the current dataset, a stranded fuse
 * ref, and an unknown top-level field. Every one of the three is something
 * the deserializer would rewrite. All three must survive.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import {
  duplicateNamedBuild,
  listNamedBuilds,
  renameNamedBuild,
  saveNamedBuild,
} from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const NAMED_BUILDS_KEY = "badge-builder-2k27:named-builds:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * A stored entry the deserializer READS (so it reaches rename/duplicate in
 * the UI) but would REWRITE on the way through:
 *  - `ghost-badge-9000` is absent from the shipped dataset  → H8 strip
 *  - Synergy Slot 5's fuse points at a badge not in the loadout → F2.1 heal
 *  - `x-unknown-top-level` is outside validateBody's field list → dropped
 */
function driftedEntryText(name = "Drifted"): string {
  const rig = makeRig({ name, attributes: { close: 90 } });
  const raw = JSON.parse(JSON.stringify(rig)) as Record<string, unknown>;
  raw["loadout"] = [
    { badgeId: "float-game", purchasedLevel: "gold" },
    { badgeId: "ghost-badge-9000", purchasedLevel: "silver" },
  ];
  (raw["synergy"] as Record<string, unknown>[])[4] = {
    ...((raw["synergy"] as Record<string, unknown>[])[4] as Record<string, unknown>),
    unlocked: true,
    fuseBadgeId: "deadeye", // NOT in the loadout above → stranded
  };
  raw["x-unknown-top-level"] = { keepMe: true };
  return JSON.stringify(raw);
}

function seed(id: string, text: string): void {
  installed.store.set(NAMED_BUILDS_KEY, JSON.stringify({ [id]: text }));
}

function storedEntry(id: string): Record<string, unknown> {
  const store = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<
    string,
    string
  >;
  return JSON.parse(store[id] as string) as Record<string, unknown>;
}

describe("3.1 — a rename differs from the original ONLY in `name`", () => {
  it("the drifted loadout row, the stranded fuse ref and everything else survive", () => {
    const original = driftedEntryText();
    seed("b-1", original);
    // Sanity: the fixture IS readable, so it reaches rename in the UI.
    expect(listNamedBuilds().summaries.map((s) => s.id)).toEqual(["b-1"]);

    expect(renameNamedBuild("b-1", "Renamed").ok).toBe(true);

    const before = JSON.parse(original) as Record<string, unknown>;
    const after = storedEntry("b-1");

    // Field-by-field diff — not just a `name` check.
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    for (const key of Object.keys(before)) {
      if (key === "name") continue;
      expect(after[key], `field "${key}" was rewritten by a rename`).toEqual(before[key]);
    }
    expect(after["name"]).toBe("Renamed");

    // Named explicitly, because these two are what the deserializer rewrites.
    expect(after["loadout"]).toEqual([
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "ghost-badge-9000", purchasedLevel: "silver" },
    ]);
    expect((after["synergy"] as Record<string, unknown>[])[4]?.["fuseBadgeId"]).toBe("deadeye");
    expect(after["schemaVersion"]).toBe(SAVED_BUILD_SCHEMA_VERSION);
  });
});

describe("3.2 — an unknown top-level field survives a rename", () => {
  it("keeps a field validateBody's fixed list would have dropped", () => {
    seed("b-1", driftedEntryText());
    expect(renameNamedBuild("b-1", "Renamed").ok).toBe(true);
    expect(storedEntry("b-1")["x-unknown-top-level"]).toEqual({ keepMe: true });
  });
});

describe("3.3 — renaming an unparseable entry writes NOTHING", () => {
  it("returns ok and leaves the stored bytes exactly as they were", () => {
    seed("b-1", "{not json at all");
    const before = installed.store.get(NAMED_BUILDS_KEY) as string;
    expect(renameNamedBuild("b-1", "Renamed").ok).toBe(true);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(before);
  });

  it("renaming an id that does not exist writes nothing either", () => {
    seed("b-1", driftedEntryText());
    const before = installed.store.get(NAMED_BUILDS_KEY) as string;
    expect(renameNamedBuild("b-nope", "Renamed").ok).toBe(true);
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(before);
  });
});

describe("6.1 — a duplicate differs from its source ONLY in `name` and `savedAt`", () => {
  it("the copy is byte-faithful: drifted row and stranded ref both present", () => {
    const original = driftedEntryText();
    seed("b-1", original);

    expect(
      duplicateNamedBuild("b-1", "b-2", "Drifted copy", "2026-08-25T23:59:59.000Z").ok,
    ).toBe(true);

    const before = JSON.parse(original) as Record<string, unknown>;
    const copy = storedEntry("b-2");

    expect(Object.keys(copy).sort()).toEqual(Object.keys(before).sort());
    for (const key of Object.keys(before)) {
      if (key === "name" || key === "savedAt") continue;
      expect(copy[key], `field "${key}" differs in a duplicate`).toEqual(before[key]);
    }
    expect(copy["name"]).toBe("Drifted copy");
    expect(copy["savedAt"]).toBe("2026-08-25T23:59:59.000Z");
    expect(copy["x-unknown-top-level"]).toEqual({ keepMe: true });

    // And the source is untouched.
    expect(storedEntry("b-1")).toEqual(before);
  });

  it("duplicating a missing or unparseable source writes nothing", () => {
    seed("b-1", "{not json at all");
    const before = installed.store.get(NAMED_BUILDS_KEY) as string;
    expect(duplicateNamedBuild("b-1", "b-2", "Copy", "2026-08-25T00:00:00.000Z").ok).toBe(true);
    expect(duplicateNamedBuild("b-nope", "b-3", "Copy", "2026-08-25T00:00:00.000Z").ok).toBe(
      true,
    );
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(before);
  });
});

describe("listNamedBuilds discloses unreadable entries instead of hiding them", () => {
  it("counts the entries it skips", () => {
    expect(saveNamedBuild("b-good", makeRig({ name: "Good" })).ok).toBe(true);
    const store = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<
      string,
      string
    >;
    store["b-bad"] = "{not json";
    store["b-bad-2"] = "{also not json";
    installed.store.set(NAMED_BUILDS_KEY, JSON.stringify(store));

    const listing = listNamedBuilds();
    expect(listing.summaries.map((summary) => summary.id)).toEqual(["b-good"]);
    expect(listing.unreadableCount).toBe(2);
    // Skipped, never deleted.
    expect(
      (JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<string, string>)[
        "b-bad"
      ],
    ).toBe("{not json");
  });
});
