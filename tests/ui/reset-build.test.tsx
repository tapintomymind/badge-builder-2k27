// @vitest-environment jsdom
/**
 * F5.3/C — `Reset build` (design-spec §15.13–§15.18, scope.md §3 H8).
 *
 * THE BEHAVIOURAL HALF. layout-arithmetic.test.ts pins the SHAPE of the reset
 * path (which identifiers it may and may not name); this file drives the real
 * App and asserts what actually survives.
 *
 * H8 — "the tool never destroys the plan silently" — is the whole design
 * constraint here, and the three data-loss defects this project has already
 * shipped are why the ruling is: a counted confirm, no undo, and a durable
 * `Save a copy and reset` as the primary path. An in-memory undo buffer would
 * be THE ONLY COPY of the pre-reset build the instant the autosave commits,
 * which is exactly the shape of those three defects.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { defaultAppConfig } from "../../src/config";
import { shippedDataset } from "../../src/engine/dataset";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { Budget, SavedBuild } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import {
  saveNamedBuild,
  writeAutosave,
  writeUiSectionOpen,
} from "../../src/persist/local-storage";
import { categorySectionStorageKey } from "../../src/ui/grid/anchors";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const NAMED_BUILDS_KEY = "badge-builder-2k27:named-builds:v1";
const UI_STATE_KEY = "badge-builder-2k27:ui-state:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

function budgetsWith(shooting: Budget): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      category === "Shooting" ? shooting : { equipSlots: 0, points: 0 },
    ]),
  ) as Record<Category, Budget>;
}

/**
 * A build with something in EVERY bucket the reset has an opinion about:
 * attributes, a non-default height, a position, a purchase, a Synergy Slot
 * ASSIGNMENT, a Synergy Slot UNLOCK, and budgets. Only some of these may be
 * cleared, which is the entire point of the tests below.
 */
function seedFullBuild(): void {
  const synergy = createDefaultSynergySlots(null).map((slot, index) =>
    index === 0
      ? { ...slot, unlocked: true, fuseBadgeId: "deadeye", reactionBadgeId: null }
      : slot,
  );
  const seeded: SavedBuild = {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: shippedDataset.dataVersion,
    savedAt: "2026-01-01T00:00:00.000Z",
    name: "Reset fixture",
    build: { ...makeBuild(80, 0, { threePt: 99, mid: 99 }), position: "SG" as const },
    budgets: budgetsWith({ equipSlots: 4, points: 20 }),
    loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
    synergy,
    // [F4/A4] refundTrigger passed EXPLICITLY, never inherited from the
    // default — a behavioural fixture that rides the default silently
    // re-bases its arithmetic on every future flip.
    config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
  };
  expect(writeAutosave(seeded).ok).toBe(true);
}

function resetButton(): HTMLButtonElement {
  const button = screen.getByRole("button", { name: "Reset build" });
  if (!(button instanceof HTMLButtonElement)) throw new Error("no Reset build button");
  return button;
}

/**
 * T14: there are THREE <dialog>s in the app after this slice and
 * `querySelector("dialog")` returns the WRONG one — the last time that
 * happened a reviewer reported "import does nothing". Select by id.
 */
function resetDialog(): HTMLDialogElement | null {
  const dialog = document.querySelector("#reset-build-dialog");
  return dialog instanceof HTMLDialogElement ? dialog : null;
}

function openConfirm(): HTMLDialogElement {
  fireEvent.click(resetButton());
  const dialog = resetDialog();
  if (dialog === null) throw new Error("confirm did not open");
  return dialog;
}

/** The working build as the app itself would serialize it. */
async function exportEnvelope(): Promise<Record<string, unknown>> {
  let captured: Blob | null = null;
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn((blob: Blob) => {
      captured = blob;
      return "blob:test";
    }),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function noop() {});
  fireEvent.click(screen.getAllByRole("button", { name: "Export JSON" })[0] as HTMLElement);
  if (captured === null) throw new Error("no export blob");
  const envelope = JSON.parse(await (captured as Blob).text()) as Record<string, unknown>;
  // `savedAt` is stamped at export time, not plan state. Two envelopes taken
  // seconds apart from an unchanged build must compare equal.
  delete envelope.savedAt;
  return envelope;
}

describe("the control: present, gated on the DEFAULT scope, never resetting directly", () => {
  it("is disabled at the zero state, with a reason and not a tooltip", () => {
    render(<App />);
    expect(resetButton().disabled).toBe(true);
    // H4's "disabled + reason" invariant. This is NOT the H4 forbidden class —
    // H4 forbids disabling BECAUSE OF an overspend; this is a control with no
    // object. The reason is reachable by keyboard and touch; a title tooltip
    // would be neither.
    const reasonId = resetButton().getAttribute("aria-describedby");
    expect(reasonId).not.toBeNull();
    expect(document.getElementById(reasonId as string)?.textContent).toContain("Nothing to reset");
    expect(resetButton().getAttribute("title")).toBeNull();
  });

  it("stays disabled for a BUDGETS-ONLY build — A4's ruled consequence", () => {
    // `workingHasContent` returns TRUE here and it is the wrong question: the
    // default reset does not touch budgets, so an enabled control would open a
    // confirm whose "Will be cleared" list, with zero rows suppressed, is
    // empty. `playerHasContent` answers the right one.
    const seeded: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2026-01-01T00:00:00.000Z",
      name: "Budgets only",
      build: makeBuild(78, 0),
      budgets: budgetsWith({ equipSlots: 4, points: 20 }),
      loadout: [],
      synergy: createDefaultSynergySlots(null),
      config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
    };
    expect(writeAutosave(seeded).ok).toBe(true);
    render(<App />);
    expect(resetButton().disabled).toBe(true);
  });

  it("enables once anything in the default scope is set", () => {
    seedFullBuild();
    render(<App />);
    expect(resetButton().disabled).toBe(false);
  });

  it("18 — the confirm is MANDATORY: the button opens a dialog and resets nothing", async () => {
    seedFullBuild();
    render(<App />);
    const before = await exportEnvelope();
    const dialog = openConfirm();
    expect(dialog).not.toBeNull();
    expect(await exportEnvelope()).toEqual(before);
  });

  it("Cancel changes nothing", async () => {
    seedFullBuild();
    render(<App />);
    const before = await exportEnvelope();
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(resetDialog()).toBeNull();
    expect(await exportEnvelope()).toEqual(before);
  });
});

describe("19 — the confirm names real counts and states the guarantee", () => {
  it("interpolates the blast radius and promises the saved builds", () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    const text = dialog.textContent ?? "";
    // The guarantee is bold, first, and TRUE — the reset path reaches no
    // named-build writer at all.
    expect(text).toContain("saved builds are not touched");
    expect(text).toContain("20 attributes");
    expect(text).toContain("(2 currently set)");
    expect(text).toContain("1 purchased badge");
    expect(text).toContain("1 Synergy Slot assignment");
    // Resetting to a height the user did not pick has to be said out loud.
    expect(text).toContain("Height returns to 6'6\"");
    expect(text).toContain("Position returns to Any");
    expect(text).toContain("Badge Points and Badge Slots for all six categories");
  });

  it("suppresses zero-count rows on a sparse build", () => {
    const seeded: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2026-01-01T00:00:00.000Z",
      name: "Sparse",
      build: makeBuild(78, 0, { threePt: 70 }),
      budgets: budgetsWith({ equipSlots: 0, points: 0 }),
      loadout: [],
      synergy: createDefaultSynergySlots(null),
      config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
    };
    expect(writeAutosave(seeded).ok).toBe(true);
    render(<App />);
    const text = openConfirm().textContent ?? "";
    // A build with no purchases does not get told about zero purchased badges.
    expect(text).not.toContain("0 purchased");
    expect(text).not.toContain("0 Synergy Slot");
    expect(text).toContain("20 attributes");
  });

  it("21 — neither commit action is a gold primary; the durable path is not the danger one", () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    const save = within(dialog).getByRole("button", { name: "Save a copy and reset" });
    const confirm = within(dialog).getByRole("button", { name: "Reset build" });
    // Gold is the app's voice, not a nudge toward deletion.
    expect(save.className).not.toContain("btn--primary");
    expect(confirm.className).not.toContain("btn--primary");
    // The DURABLE alternative to the ruled-out undo is the first-class path.
    expect(save.className).toContain("btn--secondary");
    expect(confirm.className).toContain("btn--danger-ghost");
  });
});

describe("17 — the scope: the player is cleared, the plan container survives", () => {
  it("clears attributes, loadout and Synergy Slot ASSIGNMENTS; keeps budgets and unlocks", async () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    const after = await exportEnvelope();

    const build = after.build as { heightInches: number; attributes: Record<string, number>; position?: string };
    expect(Object.values(build.attributes).every((value) => value === 0)).toBe(true);
    expect(build.heightInches).toBe(78); // the app's own documented zero-state default
    expect(build.position).toBeUndefined(); // Any — restores the full 69–88 range
    expect(after.loadout).toEqual([]);

    const synergy = after.synergy as { unlocked: boolean; fuseBadgeId: string | null; reactionBadgeId: string | null }[];
    // FORCED, not chosen: the assignment referenced a badge that is no longer
    // in the loadout, which is `synergyTargetNotPurchased` — a HardViolation
    // the engine refuses to create.
    expect(synergy.every((slot) => slot.fuseBadgeId === null && slot.reactionBadgeId === null)).toBe(true);
    // But NOT createDefaultSynergySlots(): `unlocked` is an account-progression
    // fact, not a property of an attribute spread. Eight toggles the user would
    // otherwise re-enter for no reason.
    expect(synergy[0]?.unlocked).toBe(true);

    // The plan container: budgets, name, dataVersion, config all survive.
    const budgets = after.budgets as Record<Category, Budget>;
    expect(budgets.Shooting).toEqual({ equipSlots: 4, points: 20 });
    expect(after.name).toBe("Reset fixture");
    expect(after.dataVersion).toBe(shippedDataset.dataVersion);
  });

  it("the checkbox branch — and ONLY it — also clears the budgets", async () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /Also clear Badge Points and Badge Slots/ }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    const after = await exportEnvelope();
    const budgets = after.budgets as Record<Category, Budget>;
    expect(budgets.Shooting).toEqual({ equipSlots: 0, points: 0 });
    // Still opt-in only: the unlocks are untouched on this branch too.
    const synergy = after.synergy as { unlocked: boolean }[];
    expect(synergy[0]?.unlocked).toBe(true);
  });

  it("THE AVALANCHE ASSERTION — no stale purchase can survive a reset", async () => {
    // §15.14's whole point, as a test. Every purchase was gated on attributes
    // that are now zero, so clearing the attributes WITHOUT clearing the
    // loadout would turn every purchased badge stale at once. The stale
    // treatment exists for drift, not for demolition.
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    expect(document.querySelectorAll('[data-stale="true"]')).toHaveLength(0);
    expect(document.querySelectorAll(".badge-card__eligibility--stale")).toHaveLength(0);
    expect((await exportEnvelope()).loadout).toEqual([]);
  });

  it("announces the result on the EXISTING role=status region — no fourth live region", () => {
    seedFullBuild();
    render(<App />);
    const before = document.querySelectorAll('[role="status"]').length;
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    const regions = [...document.querySelectorAll('[role="status"]')];
    expect(regions).toHaveLength(before);
    expect(regions.map((node) => node.textContent).join(" ")).toContain("Build reset.");
    expect(regions.map((node) => node.textContent).join(" ")).toContain("Height 6'6\", Position Any.");
  });
});

describe("15 + 16 — what the reset must NOT be able to reach", () => {
  it("15 — the named-builds store is BYTE-unchanged across a reset", async () => {
    // The F2.2 defect class, and no reset in this app has that reach.
    seedFullBuild();
    const other: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2025-01-01T00:00:00.000Z",
      name: "Precious",
      build: makeBuild(75, 42),
      budgets: budgetsWith({ equipSlots: 2, points: 9 }),
      loadout: [{ badgeId: "deadeye", purchasedLevel: "silver" }],
      synergy: createDefaultSynergySlots(null),
      config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
    };
    expect(saveNamedBuild("keep-me", other).ok).toBe(true);
    const before = installed.store.get(NAMED_BUILDS_KEY);
    expect(before).toBeDefined();

    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    expect(installed.store.get(NAMED_BUILDS_KEY)).toBe(before);
  });

  it("16 — every UI preference survives: the six collapse keys AND the Build panel latch", () => {
    seedFullBuild();
    writeUiSectionOpen(categorySectionStorageKey("Shooting"), false);
    writeUiSectionOpen(categorySectionStorageKey("Finishing"), false);
    writeUiSectionOpen("section-build-panel.auto-collapsed", true);
    const before = installed.store.get(UI_STATE_KEY);

    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset build" }));
    // Collapse state is a VIEW preference; a reset is a plan operation. The
    // latch is in the same blob and survives for the same reason — re-arming
    // it would need `writeUiSectionOpen` in the reset path, which is exactly
    // what this assertion forbids.
    expect(installed.store.get(UI_STATE_KEY)).toBe(before);
  });
});

describe("`Save a copy and reset` — the durable alternative to the ruled-out undo", () => {
  it("writes a NEW named entry and then resets; nothing is overwritten", async () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save a copy and reset" }));

    // The copy is durable, named, and survives a reload — strictly more than
    // an in-memory undo buffer, for one extra click at the moment of
    // hesitation.
    const stored = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<string, string>;
    const entries = Object.values(stored).map((text) => JSON.parse(text) as SavedBuild);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.loadout).toEqual([{ badgeId: "deadeye", purchasedLevel: "bronze" }]);
    expect(entries[0]?.name).toBe("Reset fixture");

    // …and the working build really is reset.
    const after = await exportEnvelope();
    expect(after.loadout).toEqual([]);
  });

  it("survives a reload — which an undo buffer could not", () => {
    seedFullBuild();
    render(<App />);
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save a copy and reset" }));
    cleanup();
    render(<App />);
    const stored = JSON.parse(installed.store.get(NAMED_BUILDS_KEY) as string) as Record<string, string>;
    expect(Object.keys(stored)).toHaveLength(1);
  });
});
