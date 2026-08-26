// @vitest-environment jsdom
/**
 * A5-E — the bonus layer's PERSISTED-SHAPE legs, and the runaway-inflation
 * guard. [engine-data-design.md §6 tests 3.9, 3.10, 6.6 · §2's hazard box]
 *
 * These need a real store, so they live here rather than in the node-env
 * serializer file. What they exist to prove is the pair of claims A5-R5 rests
 * on: a bonus written by the app's OWN write path is readable by its OWN read
 * path on the very next boot, and the F2.2 quarantine is never triggered by
 * any bonus state the app can produce.
 *
 * AND 6.6, WHICH IS THE ONE THAT WOULD HAVE INFLATED A USER'S PLAN. The base
 * grid is an ENTRY surface whose commit writes back into the base. Pre-A5 the
 * base and composed records were the same object so passing the derived one
 * was a no-op; post-A5 they are not, and rendering the effective number there
 * compounds it on every blur: 3 renders 4, commits 4, renders 5. Test 6.6
 * blurs ten times and asserts the base never moved.
 *
 * R12 (the workbench re-cut; user ruling 2026-08-26) — jsdom renders the L
 * workbench, where the base entry grid lives inside `#dialog-budgets`,
 * opened from the rail TotalsStrip's `Edit budgets…`. Same BudgetGrid, same
 * shared commit seam (App's `handleBudgetCommit`), so every claim below —
 * base in, base out, never the effective number — holds at its original
 * strength; only the route to the fields changed.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { defaultAppConfig } from "../../src/config";
import { appliedEquipSlotsTotal, zeroBonus } from "../../src/engine/budget";
import { shippedDataset } from "../../src/engine/dataset";
import {
  SAVED_BUILD_SCHEMA_VERSION,
  deserializeSavedBuild,
  serializeSavedBuild,
} from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { BonusBudget, Budget, SavedBuild } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import {
  readAutosave,
  readAutosaveQuarantine,
  readAutosaveResult,
  saveNamedBuild,
  writeAutosave,
} from "../../src/persist/local-storage";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";

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

function bonusWith(patch: Partial<BonusBudget>): BonusBudget {
  return { ...zeroBonus(), ...patch };
}

function seededBuild(overrides: Partial<SavedBuild> = {}): SavedBuild {
  return {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: shippedDataset.dataVersion,
    savedAt: "2026-08-26T12:00:00.000Z",
    name: "A5 fixture",
    build: makeBuild(78, 0, { threePt: 99, mid: 99 }),
    budgets: budgetsWith({ equipSlots: 3, points: 20 }),
    bonus: zeroBonus(),
    loadout: [],
    synergy: createDefaultSynergySlots(null),
    config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
    ...overrides,
  };
}

/** R12 (user ruling 2026-08-26): at L the entry grid renders inside
 * `#dialog-budgets`, behind the rail's `Edit budgets…` button. Select by id,
 * never by tag (the app's own dialog rule). */
function openBudgetsDialog(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: /^Edit budgets/ }));
  const dialog = document.querySelector("#dialog-budgets");
  if (!(dialog instanceof HTMLElement)) throw new Error("no #dialog-budgets");
  return dialog;
}

/** The Badge Slots input for a category, by its (visually hidden) label —
 * scoped to the budgets dialog, the only surface carrying the grid at L. */
function badgeSlotsField(dialog: HTMLElement, category: Category): HTMLInputElement {
  return within(dialog).getByLabelText(`${category} Badge Slots`) as HTMLInputElement;
}

function currentAutosave(): SavedBuild {
  const text = installed.store.get(AUTOSAVE_KEY);
  expect(text, "no autosave was written").toBeDefined();
  return deserializeSavedBuild(text as string);
}

// ===========================================================================

describe("A5 test 3.9 — a bonus survives the autosave boot path, and never quarantines", () => {
  it("writes, reloads and returns the same bonus, with no quarantine and no problems", () => {
    const bonus = bonusWith({
      earnedEquipSlots: 2,
      earnedPoints: 8,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 1 },
      appliedPoints: { ...zeroBonus().appliedPoints, Shooting: 5 },
    });
    expect(writeAutosave(seededBuild({ bonus })).ok).toBe(true);

    const result = readAutosaveResult();
    expect(result.kind).toBe("ok");
    expect(readAutosaveQuarantine()).toBeNull();
    expect(readAutosave()?.bonus).toEqual(bonus);
  });

  it("an OVER-APPLIED bonus — the state the app's own UI can reach — also boots clean and is NOT quarantined", () => {
    // Season rollover: earned 3, applied 3, then the total is edited down.
    // THE F2.2 CHAIN MUST NOT FIRE. A quarantine here means the next mount
    // writes freshWorkingState() over the user's build.
    const bonus = bonusWith({
      earnedEquipSlots: 1,
      appliedEquipSlots: {
        ...zeroBonus().appliedEquipSlots,
        Shooting: 1,
        Defense: 1,
        Rebounding: 1,
      },
    });
    expect(writeAutosave(seededBuild({ bonus })).ok).toBe(true);
    expect(readAutosaveResult().kind).toBe("ok");
    expect(readAutosaveQuarantine()).toBeNull();

    const restored = readAutosave();
    expect(restored?.bonus).toEqual(bonus);
    expect(appliedEquipSlotsTotal(restored?.bonus ?? zeroBonus())).toBe(3);

    // And the App itself boots on it rather than falling back to a fresh state.
    render(<App />);
    // R12: the grid is behind the rail's `Edit budgets…` — open the dialog.
    expect(badgeSlotsField(openBudgetsDialog(), "Shooting").value).toBe("3");
    cleanup();
  });

  it("a PRE-A5 autosave (bonus absent from the stored JSON) boots and normalizes to zeroBonus()", () => {
    // Exactly what is sitting in every existing user's localStorage today.
    const parsed = JSON.parse(serializeSavedBuild(seededBuild())) as Record<string, unknown>;
    delete parsed["bonus"];
    installed.store.set(AUTOSAVE_KEY, JSON.stringify(parsed));

    expect(readAutosaveResult().kind).toBe("ok");
    expect(readAutosaveQuarantine()).toBeNull();
    expect(readAutosave()?.bonus).toEqual(zeroBonus());

    render(<App />);
    // R12: the grid is behind the rail's `Edit budgets…` — open the dialog.
    expect(badgeSlotsField(openBudgetsDialog(), "Shooting").value).toBe("3");
    cleanup();
  });
});

describe("A5 test 3.10 — bonus survives every write route and every reload route", () => {
  it("toEnvelope → serialize → store → deserialize → fromSaved loses nothing, on the autosave route", () => {
    const bonus = bonusWith({
      earnedEquipSlots: 2,
      earnedPoints: 6,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 2 },
      appliedPoints: { ...zeroBonus().appliedPoints, Shooting: 6 },
    });
    expect(writeAutosave(seededBuild({ bonus })).ok).toBe(true);

    // Boot: App reads it, holds it in WorkingState, and writes it back out.
    render(<App />);
    // An ordinary edit, so the app takes its own write path over the bonus.
    // R12: the field is reached through #dialog-budgets; the commit seam
    // behind it (handleBudgetCommit) is the same one the M/S panel uses.
    const field = badgeSlotsField(openBudgetsDialog(), "Defense");
    fireEvent.change(field, { target: { value: "2" } });
    fireEvent.blur(field);

    const written = currentAutosave();
    expect(written.bonus).toEqual(bonus);
    expect(written.budgets.Defense.equipSlots).toBe(2);
    cleanup();
  });

  it("the named-build route carries it too, and re-reads it identically", () => {
    const bonus = bonusWith({
      earnedEquipSlots: 4,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Defense: 4 },
    });
    const saved = seededBuild({ bonus, name: "with bonus" });
    expect(saveNamedBuild("with-bonus", saved).ok).toBe(true);
    expect(deserializeSavedBuild(serializeSavedBuild(saved)).bonus).toEqual(bonus);
  });

  it("the envelope the app writes still DECLARES schemaVersion 1 — a stale worktree degrades, never quarantines", () => {
    expect(writeAutosave(seededBuild({ bonus: bonusWith({ earnedEquipSlots: 1 }) })).ok).toBe(true);
    render(<App />);
    // R12: the field is reached through #dialog-budgets.
    const field = badgeSlotsField(openBudgetsDialog(), "Defense");
    fireEvent.change(field, { target: { value: "1" } });
    fireEvent.blur(field);

    const raw = JSON.parse(installed.store.get(AUTOSAVE_KEY) as string) as Record<string, unknown>;
    expect(raw["schemaVersion"]).toBe(1);
    expect(raw["bonus"]).toBeDefined();
    cleanup();
  });
});

describe("A5 test 6.6 — SHIP GATE: the base grid never renders, and never commits, the effective number", () => {
  it("with base 3 + applied 1, the field reads 3, ten blur cycles leave it 3, and the ledger reads 4 throughout", () => {
    const bonus = bonusWith({
      earnedEquipSlots: 1,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 1 },
    });
    expect(
      writeAutosave(
        seededBuild({ bonus, budgets: budgetsWith({ equipSlots: 3, points: 20 }) }),
      ).ok,
    ).toBe(true);

    render(<App />);
    // R12: the entry surface under test lives inside #dialog-budgets — the
    // same BudgetGrid, fed the same base record through the same commit seam.
    const dialog = openBudgetsDialog();

    // The ENTRY surface shows the BASE. Not 4.
    expect(badgeSlotsField(dialog, "Shooting").value).toBe("3");
    // The LEDGER shows the EFFECTIVE capacity. The two disagree on purpose.
    expect(screen.getAllByText("0 / 4").length).toBeGreaterThan(0);

    // Ten no-change blur cycles — the exact gesture that compounds if the
    // grid is wired to the composed record (3 → 4 → 5 → 6 …).
    for (let cycle = 0; cycle < 10; cycle += 1) {
      const field = badgeSlotsField(dialog, "Shooting");
      fireEvent.focus(field);
      fireEvent.blur(field);
      expect(field.value, `base inflated on blur cycle ${cycle}`).toBe("3");
    }

    // The rendered field, the persisted base and the applied bonus all held.
    expect(badgeSlotsField(dialog, "Shooting").value).toBe("3");
    expect(screen.getAllByText("0 / 4").length).toBeGreaterThan(0);

    const persisted = readAutosave();
    if (persisted !== null) {
      expect(persisted.budgets.Shooting.equipSlots).toBe(3);
      expect(persisted.bonus.appliedEquipSlots.Shooting).toBe(1);
    }
    cleanup();
  });

  it("a REAL edit still commits a base value, not an effective one", () => {
    const bonus = bonusWith({
      earnedEquipSlots: 1,
      appliedEquipSlots: { ...zeroBonus().appliedEquipSlots, Shooting: 1 },
    });
    expect(writeAutosave(seededBuild({ bonus })).ok).toBe(true);
    render(<App />);
    // R12: the field is reached through #dialog-budgets.
    const dialog = openBudgetsDialog();

    const field = badgeSlotsField(dialog, "Shooting");
    fireEvent.change(field, { target: { value: "5" } });
    fireEvent.blur(field);

    // The user typed 5, so the BASE is 5 and the ledger reads 5 + 1.
    expect(badgeSlotsField(dialog, "Shooting").value).toBe("5");
    expect(screen.getAllByText("0 / 6").length).toBeGreaterThan(0);
    expect(currentAutosave().budgets.Shooting.equipSlots).toBe(5);
    cleanup();
  });
});
