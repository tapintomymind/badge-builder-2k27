// @vitest-environment jsdom
/**
 * F2.3 FINDING B — THE BOOT WRITE PERSISTED THE DESERIALIZER'S TRANSFORMATION,
 * WITH NO USER ACTION AT ALL.
 *
 * At boot the read applies the H8 drift strip, the F2.1 stranded-ref heal, the
 * ratified-magnitude override and a fixed-field reconstruction that drops
 * unknown top-level fields. The mount effect then wrote that transformed
 * result back over the original. That is F2.2's defect #4 — `renameNamedBuild`
 * persisting a transformation — verbatim, except the triggering gesture is
 * OPENING THE APP. In practice the trigger is a dataset refresh that removes
 * or re-ids a badge: the same trigger as F2.2's F-CORE.
 *
 * THE FIX IS TWO PARTS AND NEEDS BOTH.
 *   Layer 2 alone only DELAYS the loss: suppressing the boot write buys time,
 *   but the user's first edit is the acceptance and that edit writes the
 *   stripped state over the one remaining copy of the dropped row.
 *   So the ORIGINAL BYTES ARE ALSO PRESERVED at boot, under their own key,
 *   and stay readable through the recovery screen's raw export afterwards.
 *
 * FOUR LOSSY CHANNELS, each seeded and asserted separately — a fix verified
 * against only the scenario it was written for is how the previous pass over
 * this code produced two new defects.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  KNOWN_TOP_LEVEL_FIELDS,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "../../src/engine/serialization";
import {
  exportRawPersistedData,
  readPreservedAutosaveOriginal,
  writeAutosave,
} from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";
const PRESERVED_KEY = "badge-builder-2k27:autosave-preserved:v1";
const QUARANTINE_KEY = "badge-builder-2k27:autosave-quarantine:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Counts autosave writes at the storage boundary — the only place a write is
 * observable without trusting the code under test. */
function countAutosaveWrites(): { get: () => number } {
  const real = installed.storage.setItem.bind(installed.storage);
  let writes = 0;
  vi.spyOn(installed.storage, "setItem").mockImplementation((key: string, value: string) => {
    if (key === AUTOSAVE_KEY) writes += 1;
    real(key, value);
  });
  return { get: () => writes };
}

/* ---- the four lossy channels, each seeded as its own stored envelope ---- */

/** 1 — a loadout row whose badge id left the dataset (H8 drift). */
function seedDroppedEntry(): string {
  const rig = makeRig({
    attributes: { close: 41 },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "vanished-badge", purchasedLevel: "hof" },
    ],
  });
  expect(writeAutosave(rig).ok).toBe(true);
  return installed.store.get(AUTOSAVE_KEY) as string;
}

/** 2 — a well-typed synergy reference to a badge that is NOT in the loadout
 * (the pre-F2 app wrote exactly this state; the deserializer heals it). */
function seedStrandedSynergyRef(): string {
  const rig = makeRig({
    attributes: { close: 42 },
    loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
    synergyPatches: { 5: { unlocked: true, fuseBadgeId: "posterizer" } },
  });
  expect(writeAutosave(rig).ok).toBe(true);
  return installed.store.get(AUTOSAVE_KEY) as string;
}

/** 4 — a top-level field the fixed-list reassembly does not carry across. */
function seedUnknownTopLevelField(): string {
  const rig = makeRig({ attributes: { close: 44 } });
  const envelope = JSON.parse(serializeSavedBuild(rig)) as Record<string, unknown>;
  envelope["sourceId"] = "b-from-a-newer-build-of-this-app";
  const text = JSON.stringify(envelope);
  installed.store.set(AUTOSAVE_KEY, text);
  return text;
}

describe("3.0 — the reporting seam itself (R3: lossy, not merely different)", () => {
  it("KNOWN_TOP_LEVEL_FIELDS is exactly what a real round trip carries across", () => {
    // Pins the frozen list against the reassembly literal it describes. A
    // field added to one and not the other would make this seam report a LIVE
    // field as dropped, on every boot, for everyone.
    const text = serializeSavedBuild(makeRig());
    const { saved } = deserializeSavedBuildWithReport(text);
    expect(Object.keys(saved).sort()).toEqual([...KNOWN_TOP_LEVEL_FIELDS].sort());
  });

  it("reports an unknown top-level field, and reports nothing for a clean envelope", () => {
    const clean = serializeSavedBuild(makeRig());
    expect(deserializeSavedBuildWithReport(clean).droppedUnknownFields).toEqual([]);

    const envelope = JSON.parse(clean) as Record<string, unknown>;
    envelope["sourceId"] = "b-1";
    envelope["futureThing"] = { anything: true };
    expect(
      deserializeSavedBuildWithReport(JSON.stringify(envelope)).droppedUnknownFields.sort(),
    ).toEqual(["futureThing", "sourceId"]);
  });
});

describe("3.1 — a DROPPED LOADOUT ROW: the boot write is withheld and the original preserved", () => {
  it("mount writes NOTHING, and the stored bytes are byte-identical afterwards", { timeout: 20000 }, () => {
    const original = seedDroppedEntry();
    const writes = countAutosaveWrites();

    render(<App />);

    // PRE-FIX the mount effect wrote the stripped build straight over this.
    expect(writes.get()).toBe(0);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);
  });

  it("the ORIGINAL is preserved and still readable after mount", { timeout: 20000 }, () => {
    const original = seedDroppedEntry();
    render(<App />);
    expect(readPreservedAutosaveOriginal()).toBe(original);
    // …and it is reachable through the only export the recovery screen has.
    const exported = JSON.parse(exportRawPersistedData()) as Record<string, unknown>;
    expect(exported[PRESERVED_KEY]).toBe(original);
    // The dropped row is genuinely in there — otherwise this preserves nothing.
    expect(original).toContain("vanished-badge");
  });

  it("the drop is still DISCLOSED — suppression is not silence", { timeout: 20000 }, () => {
    seedDroppedEntry();
    render(<App />);
    expect(
      screen.getByText(
        "1 badge from this build no longer exists in the dataset: vanished-badge — removed from the plan.",
      ),
    ).toBeTruthy();
  });

  it("the FIRST EDIT is the acceptance: it writes, and the preserved original survives it", { timeout: 20000 }, () => {
    const original = seedDroppedEntry();
    render(<App />);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);

    fireEvent.change(screen.getByLabelText("Close, exact value"), { target: { value: "88" } });
    fireEvent.blur(screen.getByLabelText("Close, exact value"));

    const written = installed.store.get(AUTOSAVE_KEY) as string;
    expect(written).not.toBe(original);
    expect(JSON.parse(written).build.attributes.close).toBe(88);
    // THE POINT OF THE PRESERVATION. The accepted write is lossy — the dropped
    // row is gone from the live key — and the row is still recoverable.
    expect(written).not.toContain("vanished-badge");
    expect(readPreservedAutosaveOriginal()).toBe(original);
  });

  it("no autosave key is manufactured while the write is withheld", { timeout: 20000 }, () => {
    // A withheld write must not become a DELETED key: the live autosave is
    // still the user's build, drift and all.
    seedDroppedEntry();
    render(<App />);
    expect(installed.store.has(AUTOSAVE_KEY)).toBe(true);
    expect(installed.store.has(QUARANTINE_KEY)).toBe(false);
  });
});

describe("3.2 — a HEALED SYNERGY REFERENCE is the same class of loss", () => {
  it("withholds the boot write and preserves the original", { timeout: 20000 }, () => {
    const original = seedStrandedSynergyRef();
    const writes = countAutosaveWrites();
    render(<App />);
    expect(writes.get()).toBe(0);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);
    expect(readPreservedAutosaveOriginal()).toBe(original);
  });
});

describe("3.3 — an UNKNOWN TOP-LEVEL FIELD is the same class of loss (R3's new seam)", () => {
  it("withholds the boot write and preserves the original", { timeout: 20000 }, () => {
    const original = seedUnknownTopLevelField();
    const writes = countAutosaveWrites();
    render(<App />);
    expect(writes.get()).toBe(0);
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);
    expect(readPreservedAutosaveOriginal()).toBe(original);
    expect(original).toContain("sourceId");
  });
});

describe("3.4 — WRITE COUNT on a healthy boot: the guard is a no-op everywhere else", () => {
  it("a healthy autosave boots with EXACTLY ONE write, and the flush adds none", { timeout: 20000 }, () => {
    // Predicted from source before measuring: the state-change effect runs
    // once on mount (1), and the unload flush commits nothing and has no
    // failed write to retry (0). A future refactor that reintroduces an
    // unconditional write moves this number.
    expect(writeAutosave(makeRig({ attributes: { close: 61 } })).ok).toBe(true);
    const writes = countAutosaveWrites();

    render(<App />);
    expect(writes.get()).toBe(1);

    fireEvent(window, new Event("pagehide"));
    expect(writes.get()).toBe(1);
  });

  it("a FIRST-EVER boot is one write too — absent is not lossy", { timeout: 20000 }, () => {
    const writes = countAutosaveWrites();
    render(<App />);
    expect(writes.get()).toBe(1);
    expect(installed.store.has(PRESERVED_KEY)).toBe(false);
  });

  it("a healthy boot manufactures NO preservation, and a drifted one writes ZERO times", { timeout: 20000 }, () => {
    expect(writeAutosave(makeRig({ attributes: { close: 61 } })).ok).toBe(true);
    render(<App />);
    expect(readPreservedAutosaveOriginal()).toBeNull();
  });

  it("a lossy boot's first edit is exactly ONE write, not a burst", { timeout: 20000 }, () => {
    seedDroppedEntry();
    const writes = countAutosaveWrites();
    render(<App />);
    expect(writes.get()).toBe(0);

    fireEvent.change(screen.getByLabelText("Close, exact value"), { target: { value: "88" } });
    fireEvent.blur(screen.getByLabelText("Close, exact value"));
    expect(writes.get()).toBe(1);
  });
});

describe("3.5 — the preservation is ONE ENTRY, never overwritten, never a list", () => {
  it("a second lossy boot leaves the FIRST preserved bytes exactly as they are", { timeout: 20000 }, () => {
    const first = seedDroppedEntry();
    const boot1 = render(<App />);
    expect(readPreservedAutosaveOriginal()).toBe(first);
    boot1.unmount();

    // A later, already-degraded state boots lossily too. The FIRST bytes are
    // the ones closest to the user's real data — `quarantineAutosave`'s rule,
    // applied to the second key so the two cannot diverge.
    const second = seedStrandedSynergyRef();
    expect(second).not.toBe(first);
    render(<App />);
    expect(readPreservedAutosaveOriginal()).toBe(first);
    // …and still exactly one entry: two keys at most, never a growing list.
    expect(installed.store.has(PRESERVED_KEY)).toBe(true);
    expect([...installed.store.keys()].filter((key) => key.includes("preserved"))).toHaveLength(1);
  });

  it("a FAILING preservation suppresses the write and says so, exactly like a failing quarantine", { timeout: 20000 }, () => {
    // F2.2's 1.7 rule, restated for the second key: a failed preservation is
    // strictly MORE reason to withhold, never a reason to trade the user's
    // data for a successful fresh write.
    const original = seedDroppedEntry();
    const real = installed.storage.setItem.bind(installed.storage);
    vi.spyOn(installed.storage, "setItem").mockImplementation((key: string, value: string) => {
      if (key === PRESERVED_KEY) throw new DOMException("quota", "QuotaExceededError");
      real(key, value);
    });

    render(<App />);

    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);
    expect(installed.store.has(PRESERVED_KEY)).toBe(false);
    expect(screen.getByRole("alert").textContent).toContain("autosave");
    // The flush must not sneak the stripped state in either.
    fireEvent(window, new Event("pagehide"));
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(original);
  });
});

describe("3.6 — the two preserved-bytes keys are INDEPENDENT", () => {
  it("an unreadable autosave still quarantines, and does not touch the preserved key", { timeout: 20000 }, () => {
    installed.store.set(AUTOSAVE_KEY, "{not json — the real build, mangled");
    render(<App />);
    expect(installed.store.get(QUARANTINE_KEY)).toBe("{not json — the real build, mangled");
    expect(installed.store.has(PRESERVED_KEY)).toBe(false);
  });

  it("a STANDING preservation does not block a later quarantine — the reason for two keys", { timeout: 20000 }, () => {
    // Sharing one entry would have inverted the never-overwrite rule into data
    // loss: a drift preservation would sit there permanently and the strictly
    // more severe unreadable case would never be preserved at all.
    const original = seedDroppedEntry();
    const boot1 = render(<App />);
    expect(readPreservedAutosaveOriginal()).toBe(original);
    boot1.unmount();

    installed.store.set(AUTOSAVE_KEY, "{later, and now unreadable");
    render(<App />);
    expect(installed.store.get(QUARANTINE_KEY)).toBe("{later, and now unreadable");
    expect(readPreservedAutosaveOriginal()).toBe(original);
  });
});
