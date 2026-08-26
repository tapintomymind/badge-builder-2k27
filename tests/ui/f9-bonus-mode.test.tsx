// @vitest-environment jsdom
/**
 * A5-U — bonus mode (design-spec §17). The five ruled states and the seven
 * mechanical canaries.
 *
 * EVERY CANARY HERE IS WRITTEN AGAINST A PLAUSIBLE WRONG IMPLEMENTATION, not
 * against the code that exists — that is §17.13's own framing, and it is why
 * canary 4 is INVERTED from the composition A5-E shipped. A test that merely
 * described the current behaviour would have passed just as happily against
 * the carve-out that made a bonus Badge Slot permanently inert in a
 * genuinely-zero discipline.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { defaultAppConfig } from "../../src/config";
import { zeroBonus } from "../../src/engine/budget";
import { shippedDataset } from "../../src/engine/dataset";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { BonusBudget, Budget, SavedBuild } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { writeAutosave, writeUiSectionOpen } from "../../src/persist/local-storage";
import { makeBuild, srcSources, stripComments } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

/** Six identical base budgets, with named overrides. */
function baseBudgets(overrides: Partial<Record<Category, Budget>> = {}): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      overrides[category] ?? { equipSlots: 0, points: 0 },
    ]),
  ) as Record<Category, Budget>;
}

function bonusOf(patch: Partial<BonusBudget>): BonusBudget {
  return { ...zeroBonus(), ...patch };
}

function perCategory(overrides: Partial<Record<Category, number>>): Record<Category, number> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, overrides[category] ?? 0]),
  ) as Record<Category, number>;
}

/** Seeds a build through the autosave and mounts App with the setup panel
 * already open. The auto-collapse latch is pre-fired (`auto-collapsed: true`)
 * so a seeded build does not slam the panel shut under the assertions — the
 * latch's own behaviour is F5.4's test, not this file's. */
function mountWith(options: { budgets?: Record<Category, Budget>; bonus?: BonusBudget } = {}) {
  const seeded: SavedBuild = {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: shippedDataset.dataVersion,
    savedAt: "2026-01-01T00:00:00.000Z",
    name: "A5-U fixture",
    build: makeBuild(78, 0),
    budgets: options.budgets ?? baseBudgets(),
    bonus: options.bonus ?? zeroBonus(),
    loadout: [],
    synergy: createDefaultSynergySlots(null),
    config: { ...defaultAppConfig },
  };
  expect(writeAutosave(seeded).ok).toBe(true);
  writeUiSectionOpen("section-build-panel.auto-collapsed", true);
  writeUiSectionOpen("section-build-panel", true);
  writeUiSectionOpen("section-budget", true);
  render(<App />);
}

/** Every element carrying a class TOKEN that begins with `bonus-`. Token-wise
 * on purpose: `.budget-grid__actions` is the always-present entry row and is
 * NOT one of these, which is exactly the distinction canary 1 turns on. */
function bonusNodes(): Element[] {
  return [...document.querySelectorAll("[class]")].filter((element) =>
    [...element.classList].some((token) => token.startsWith("bonus-")),
  );
}

function openBonusMode(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: /^Bonus Badge Tokens & Badge Slots/ }));
  const dialog = document.querySelector("#dialog-bonus");
  if (!(dialog instanceof HTMLElement)) throw new Error("no #dialog-bonus");
  return dialog;
}

/** Each test gets a fresh deterministic store; `remount()` gives a test that
 * needs a SECOND fixture one too, without leaking the first build's autosave
 * into it. */
function remount(options: Parameters<typeof mountWith>[0]) {
  cleanup();
  installMemoryLocalStorage();
  mountWith(options);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  cleanup();
});

// ===========================================================================
// The five ruled states (design-spec §17.7 · §17.12 states 58–63)
// ===========================================================================

describe("A5-U states — the five rulings, rendered", () => {
  it("58 ZERO EARNED — one secondary Button and nothing else", () => {
    mountWith();
    expect(
      screen.getByRole("button", { name: /^Bonus Badge Tokens & Badge Slots/ }),
    ).toBeTruthy();
    // The whole zero-state cost. No readout, no columns, no lede line, no
    // extra tab stop beyond the button.
    expect(document.querySelector(".bonus-readout")).toBeNull();
    expect(document.querySelector("#dialog-bonus")).toBeNull();
    expect(screen.queryByText(/not yet placed/)).toBeNull();
  });

  it("59 EARNED, UNPLACED — the count is named, NEUTRAL, and effective equals base everywhere", () => {
    mountWith({
      budgets: baseBudgets({ Finishing: { equipSlots: 5, points: 20 } }),
      bonus: bonusOf({ earnedEquipSlots: 3 }),
    });
    const readout = document.querySelector(".bonus-readout");
    expect(readout?.textContent).toContain("3 bonus Badge Slots earned");
    expect(readout?.textContent).toContain("3 Badge Slots not yet placed.");
    // NEVER RED. Unplaced bonus is a completely legitimate resting state, and
    // an alarm on a legal state is the H4 failure mode §4.7 exists to prevent.
    expect(readout?.querySelector(".bonus-readout__over")).toBeNull();
    expect(readout?.textContent).not.toContain("⚠");

    // Unplaced bonus grants NOTHING — which is exactly why the count renders.
    const digest = document.querySelector("#cat-finishing .category-ledger");
    expect(digest?.textContent).toContain("0 / 5");

    // …and the mode agrees: total placed 0 of 3.
    const dialog = openBonusMode();
    expect(within(dialog).getByText("0 / 3")).toBeTruthy();
  });

  it("60 FULLY PLACED — `base → effective` only on rows with bonus, and no `all placed` token", () => {
    mountWith({
      budgets: baseBudgets({
        Finishing: { equipSlots: 3, points: 16 },
        Shooting: { equipSlots: 2, points: 12 },
      }),
      bonus: bonusOf({
        earnedEquipSlots: 1,
        earnedPoints: 4,
        appliedEquipSlots: perCategory({ Finishing: 1 }),
        appliedPoints: perCategory({ Finishing: 4 }),
      }),
    });
    expect(document.querySelector(".bonus-readout")?.textContent).toBe(
      "4 bonus Badge Tokens and 1 bonus Badge Slot placed.",
    );
    // Two equal numbers ARE the all-clear; there is no zero-valued advisory.
    expect(screen.queryByText(/not placed/)).toBeNull();

    const dialog = openBonusMode();
    expect(within(dialog).getByText("4 / 4")).toBeTruthy();
    expect(within(dialog).getByText("1 / 1")).toBeTruthy();
    // Finishing composes; Shooting is bare, and Rebounding — base 0, no bonus
    // — is the em dash, never a `0`.
    const cells = [...dialog.querySelectorAll(".bonus-dialog__effective")].map(
      (cell) => cell.textContent,
    );
    expect(cells).toContain("16 → 20");
    expect(cells).toContain("3 → 4");
    expect(cells).toContain("12");
    expect(cells).toContain("—");
  });

  it("61 COMPOSITION ON THE LEDGER — the digest is EFFECTIVE-ONLY, the lede carries the split", () => {
    mountWith({
      budgets: baseBudgets({ Finishing: { equipSlots: 3, points: 16 } }),
      bonus: bonusOf({
        earnedEquipSlots: 1,
        earnedPoints: 4,
        appliedEquipSlots: perCategory({ Finishing: 1 }),
        appliedPoints: perCategory({ Finishing: 4 }),
      }),
    });
    const digest = document.querySelector("#cat-finishing .category-ledger");
    // `3 / 6`-shaped: the effective total, and NEVER `3 / 5 +1`. The digest is
    // the reconciliation surface — 2K's own screen shows a discipline's TOTAL.
    expect(digest?.textContent).toContain("0 / 4");
    expect(digest?.textContent).toContain("0 / 20");
    expect(digest?.textContent).not.toContain("+");
    expect(digest?.textContent).not.toContain("base");

    // The composition lives one line down, in the lede.
    const lede = document.querySelector("#cat-finishing .category-ledger__composition");
    expect(lede?.textContent).toBe("Badge Tokens 16 base + 4 bonus · Badge Slots 3 base + 1 bonus");
  });

  it("62 OVER-ALLOCATED — reduce the earned total below what is placed: disclosed, per-metric, and NOTHING is discarded", () => {
    // Place 4, then declare only 3 earned. Reachable with no external editing:
    // earn 3, apply 3, then edit the total down at season rollover.
    const bonus = bonusOf({
      earnedEquipSlots: 3,
      earnedPoints: 4,
      appliedEquipSlots: perCategory({ Finishing: 2, Shooting: 1, Defense: 1 }),
      appliedPoints: perCategory({ Finishing: 4 }),
    });
    mountWith({
      budgets: baseBudgets({
        Finishing: { equipSlots: 3, points: 16 },
        Shooting: { equipSlots: 2, points: 12 },
        Defense: { equipSlots: 4, points: 18 },
      }),
      bonus,
    });
    const readout = document.querySelector(".bonus-readout");
    expect(readout?.querySelector(".bonus-readout__over")?.textContent).toBe(
      "4 bonus Badge Slots placed against 3 earned ⚠",
    );
    // PER-METRIC (design-review P0-1): the points pool is level and stays
    // neutral in the same readout.
    expect(readout?.textContent).toContain("4 bonus Badge Tokens placed.");

    const dialog = openBonusMode();
    expect(within(dialog).getByText("4 / 3")).toBeTruthy();
    expect(dialog.querySelector(".bonus-dialog__over")?.textContent).toBe("over by 1 ⚠");
    // …and only ONE cell reddened.
    expect(dialog.querySelectorAll(".bonus-dialog__over")).toHaveLength(1);

    // EVERY PLACEMENT IS EXACTLY WHERE THE USER PUT IT. Nothing dropped,
    // nothing capped, nothing redistributed (§17.6).
    expect(
      (dialog.querySelector("input[aria-hidden]") ?? null) === null,
      "sanity: inputs are real",
    ).toBe(true);
    for (const [category, expected] of [
      ["Finishing", "2"],
      ["Shooting", "1"],
      ["Defense", "1"],
    ] as const) {
      const field = within(dialog).getByLabelText(`${category} bonus Badge Slots`);
      expect((field as HTMLInputElement).value).toBe(expected);
    }
  });

  it("63 ZERO BASE WITH BONUS — the deadlock frame: real capacity, and the all-bonus lede", () => {
    mountWith({
      budgets: baseBudgets({ Finishing: { equipSlots: 4, points: 20 } }),
      bonus: bonusOf({
        earnedEquipSlots: 1,
        earnedPoints: 5,
        appliedEquipSlots: perCategory({ Rebounding: 1 }),
        appliedPoints: perCategory({ Rebounding: 5 }),
      }),
    });
    const digest = document.querySelector("#cat-rebounding .category-ledger");
    // A REAL FRACTION, not the suppressed bare count.
    expect(digest?.textContent).toContain("0 / 1");

    const lede = document.querySelector("#cat-rebounding .category-ledger__lede");
    expect(lede?.textContent).toContain(
      "Badge Slots capacity here is 1 bonus. No base capacity is recorded for this discipline.",
    );
    // NEVER BOTH (§17.9 consequence 4).
    expect(lede?.textContent).not.toContain("Badge Slots capacity not set");

    const dialog = openBonusMode();
    const cells = [...dialog.querySelectorAll(".bonus-dialog__effective")].map(
      (cell) => cell.textContent,
    );
    expect(cells).toContain("0 → 1");
    expect(cells).toContain("0 → 5");
  });
});

// ===========================================================================
// The interaction rulings
// ===========================================================================

describe("A5-U interaction — free reversibility, and the three exits", () => {
  it("G2 — one keystroke takes a bonus back off a category, and it commits immediately", () => {
    mountWith({
      budgets: baseBudgets({ Defense: { equipSlots: 4, points: 18 } }),
      bonus: bonusOf({
        earnedEquipSlots: 2,
        appliedEquipSlots: perCategory({ Defense: 1 }),
      }),
    });
    const dialog = openBonusMode();
    const field = within(dialog).getByLabelText("Defense bonus Badge Slots") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "0" } });
    fireEvent.blur(field);
    // The effective cell drops in the same frame — nothing locks, ever
    // (INV-A5-4: the official text is explicit that reassignment is expected).
    expect(document.querySelector("#cat-defense .category-ledger")?.textContent).toContain(
      "0 / 4",
    );
    expect(document.querySelector(".bonus-readout")?.textContent).toContain(
      "2 Badge Slots not yet placed.",
    );
  });

  it("there is NO Cancel, and Done / Escape both close without a rollback", () => {
    mountWith({ bonus: bonusOf({ earnedEquipSlots: 1 }) });
    const dialog = openBonusMode();
    // A Cancel would be this app's first draft-state surface (§4.2, §17.3).
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);

    const field = within(dialog).getByLabelText(
      "Bonus Badge Slots earned in total",
    ) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "5" } });
    fireEvent.blur(field);
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(document.querySelector("#dialog-bonus")).toBeNull();
    // Closing did not save, because the keystroke already did.
    expect(document.querySelector(".bonus-readout")?.textContent).toContain(
      "5 bonus Badge Slots earned",
    );
  });

  it("the earned totals GATE NOTHING — the placements alone compose effective capacity", () => {
    // §17.6's safety argument, asserted rather than asserted-about: an
    // over-allocated build is still coherent because no engine rule reads the
    // earned totals. Same placements, wildly different totals, identical
    // ledger.
    mountWith({
      budgets: baseBudgets({ Finishing: { equipSlots: 3, points: 16 } }),
      bonus: bonusOf({
        earnedEquipSlots: 99,
        appliedEquipSlots: perCategory({ Finishing: 1 }),
      }),
    });
    const generous = document.querySelector("#cat-finishing .category-ledger")?.textContent;
    remount({
      budgets: baseBudgets({ Finishing: { equipSlots: 3, points: 16 } }),
      bonus: bonusOf({
        earnedEquipSlots: 0,
        appliedEquipSlots: perCategory({ Finishing: 1 }),
      }),
    });
    expect(document.querySelector("#cat-finishing .category-ledger")?.textContent).toBe(generous);
  });
});

// ===========================================================================
// The seven canaries (design-spec §17.13)
// ===========================================================================

describe("A5-U canaries — each one fails a plausible wrong implementation", () => {
  it("1 — ZERO STATE: three columns, and ZERO `.bonus-*` nodes in the DOM", () => {
    mountWith();
    // A canary asserting "looks the same" would pass against a
    // hidden-with-CSS implementation. This one does not.
    expect(bonusNodes()).toHaveLength(0);
    const table = document.querySelector(".budget-grid table");
    expect(table?.querySelectorAll("thead th")).toHaveLength(3);
    expect(table?.querySelectorAll("tbody tr:first-child td")).toHaveLength(3);
    // POSITIVE CANARY: the selector really does find `bonus-` nodes when they
    // exist, so a green result above cannot be a broken query.
    remount({ bonus: bonusOf({ earnedEquipSlots: 1 }) });
    expect(bonusNodes().length).toBeGreaterThan(0);
  });

  it("2 — `?` never appears in BudgetTotalRow's output, and `bonus` never in the Σ-vs-20 annotation", () => {
    for (const spread of [
      { Finishing: 5, Shooting: 4, Playmaking: 3, Defense: 6, Rebounding: 2, Physicals: 3 }, // Σ 23
      { Finishing: 4, Shooting: 3, Playmaking: 3, Defense: 5, Rebounding: 2, Physicals: 3 }, // Σ 20
      { Finishing: 3, Shooting: 2, Playmaking: 2, Defense: 4, Rebounding: 2, Physicals: 2 }, // Σ 15
    ] as const) {
      remount({
        budgets: Object.fromEntries(
          CATEGORIES.map((category) => [
            category,
            { equipSlots: spread[category], points: 10 },
          ]),
        ) as Record<Category, Budget>,
      });
      const row = document.querySelector(".budget-total-row");
      expect(row).not.toBeNull();
      expect(row?.textContent).not.toContain("?");
      const annotation = row?.querySelector(".budget-total-row__default-note");
      expect(annotation?.textContent).toMatch(/^\/ 20 default$/);
    }
  });

  it("3 — `equipSlots === 0` appears ONLY at the two sites that are allowed to ask it", () => {
    /**
     * TWO SITES, NOT ONE, AND THE SECOND IS A RULING RATHER THAN A LEAK
     * (design-spec §17.9 consequence 6):
     *
     *  - `badgeSlotsCapacityUnset` (src/engine/ledger.ts) asks the CAPACITY
     *    question, on the COMPOSED record, so a placed bonus counts as an
     *    entry act.
     *  - `BudgetTotalRow`'s `anyUnset` (src/ui/build/BudgetGrid.tsx) asks the
     *    Σ-vs-20 question, on the BASE record, where a placed bonus must NOT
     *    count — it is not a base value and may never enter a sum measured
     *    against the 20 a build starts with.
     *
     * An allowlist, in the shape this repo already uses for `Math.random`, so
     * a third site has to be added here on purpose.
     */
    const ALLOWED = ["/src/engine/ledger.ts", "/src/ui/build/BudgetGrid.tsx"];
    for (const [path, source] of Object.entries(srcSources)) {
      const code = stripComments(source);
      if (!code.includes("equipSlots === 0")) continue;
      expect(ALLOWED, `${path} asks the capacity question outside the allowlist`).toContain(path);
    }
    // …and both allowlist entries still carry it, so the list cannot rot into
    // a list of files that no longer matter.
    for (const path of ALLOWED) {
      expect(stripComments(srcSources[path] as string), path).toContain("equipSlots === 0");
    }
  });

  it("4 — THE DEADLOCK CANARY: base 0 + bonus 1 is REAL capacity, with the Meter and the all-bonus lede", () => {
    // THIS ASSERTION IS INVERTED FROM A5-E's SHIPPED COMPOSITION, on purpose.
    // `base === 0 ? 0 : base + applied` passes every other test in this file
    // and makes a bonus Badge Slot in a genuinely-zero discipline permanently
    // inert — now the LIKELY case, not the hypothetical one, because low
    // attributes in a discipline is exactly when a player reaches for a
    // reassignable bonus slot. If this ever reads the other way round, that
    // composition has been restored.
    mountWith({
      bonus: bonusOf({
        earnedEquipSlots: 1,
        earnedPoints: 7,
        appliedEquipSlots: perCategory({ Rebounding: 1 }),
        appliedPoints: perCategory({ Rebounding: 7 }),
      }),
    });
    const section = document.querySelector("#cat-rebounding");
    expect(section?.querySelector(".category-ledger")?.textContent).toContain("0 / 1");
    const meter = section?.querySelector("[role='meter']");
    expect(meter?.getAttribute("aria-valuemax")).toBe("7");
    expect(section?.textContent).toContain(
      "Badge Slots capacity here is 1 bonus. No base capacity is recorded for this discipline.",
    );
    expect(section?.textContent).not.toContain("Badge Slots capacity not set");
  });

  it("4b — the zero state is NOT disturbed by 4: base 0 + bonus 0 is still UNSET, on all six", () => {
    // The mirror failure: a predicate over-loosened onto the composite would
    // switch §4.7 off for every category at boot.
    mountWith();
    for (const category of CATEGORIES) {
      const section = document.querySelector(`#cat-${category.toLowerCase()}`);
      expect(section?.textContent, category).toContain("Badge Slots capacity not set");
      // The Badge Slots metric renders as a BARE COUNT, not a fraction —
      // §4.7 suppresses the COMPARISON while never suppressing the FACT. (The
      // Badge Tokens metric keeps its own `0 / 0`; it is a different pool with
      // its own rule.)
      const digest = section?.querySelector(".category-ledger")?.textContent ?? "";
      expect(digest, category).toContain("Badge Slots 0");
      expect(digest, category).not.toContain("Badge Slots 0 /");
    }
    expect(document.querySelector(".budget-total-row__default-note")).toBeNull();
  });

  it("4c — the app NEVER claims a fact it does not have: no `this build has no X` copy ships", () => {
    // §17.9 Ruling ①. Saying "capacity not set" about a genuine zero
    // UNDER-claims — the app admits ignorance it does not have, and nothing
    // false is displayed. Saying "this build has no Badge Slots here" about an
    // un-entered category OVER-claims, and at boot it would assert it six
    // times about every build ever created. Under-claiming is recoverable;
    // over-claiming trains the user to distrust the one channel this tool
    // depends on. The claim becomes available when the `entered` channel
    // lands, and not before.
    for (const [path, source] of Object.entries(srcSources)) {
      const code = stripComments(source);
      expect(code, path).not.toContain("This build has no");
      for (const category of CATEGORIES) {
        expect(code, `${path} claims a fact about ${category}`).not.toContain(
          `has no ${category}`,
        );
      }
    }
  });

  it("6 — neither `3` nor `12` is frozen into the slice as a default, a max or a copy literal", () => {
    // The user's "3 extra Badge Slots and 12 Badge Tokens" is an OBSERVATION,
    // explicitly qualified by "you can earn more … so this will be dynamic".
    // The per-category maxima are taken BY REFERENCE from their base twins, so
    // the bonus fields inherit an app convention that predates the observation
    // instead of accidentally canonising it.
    const dialog = stripComments(srcSources["/src/ui/build/BonusDialog.tsx"] as string);
    expect(dialog).not.toMatch(/\b3\b/);
    expect(dialog).not.toMatch(/\b12\b/);
    expect(dialog).toContain("BUDGET_POINTS_MAX");
    expect(dialog).toContain("BUDGET_EQUIP_SLOTS_MAX");
    // POSITIVE CANARY: the patterns really do catch what they claim to.
    expect("max={12}").toMatch(/\b12\b/);
    expect("earnedEquipSlots: 3").toMatch(/\b3\b/);
  });

  it("7 — OVER-ALLOCATION PRESERVES PLACEMENTS, and disables nothing anywhere", () => {
    // The two rejected options both pass a naive "shows a warning" test:
    // clamping the total to >= placed, and auto-unallocating. This asserts
    // neither happened — the placements are byte-unchanged and the total is
    // exactly what the user typed.
    mountWith({
      budgets: baseBudgets({ Finishing: { equipSlots: 3, points: 16 } }),
      bonus: bonusOf({
        earnedEquipSlots: 3,
        appliedEquipSlots: perCategory({ Finishing: 1, Shooting: 1, Defense: 1 }),
      }),
    });
    const dialog = openBonusMode();
    // The disabled set BEFORE the edit. Asserting an absolute zero would be
    // wrong: `Reset build` is legitimately disabled on a fixture with nothing
    // to reset, and that is a control with no object rather than the H4 class.
    // What §4.3 forbids is a control becoming disabled BECAUSE OF a budget
    // state, so the before/after comparison is the assertion.
    const disabledBefore = document.querySelectorAll("input:disabled, button:disabled").length;
    const total = within(dialog).getByLabelText(
      "Bonus Badge Slots earned in total",
    ) as HTMLInputElement;
    fireEvent.change(total, { target: { value: "2" } });
    fireEvent.blur(total);

    // NOT clamped back up to 3.
    expect(
      (within(dialog).getByLabelText("Bonus Badge Slots earned in total") as HTMLInputElement)
        .value,
    ).toBe("2");
    // NOT auto-unallocated: all three placements intact and editable.
    for (const category of ["Finishing", "Shooting", "Defense"] as const) {
      const field = within(dialog).getByLabelText(
        `${category} bonus Badge Slots`,
      ) as HTMLInputElement;
      expect(field.value, category).toBe("1");
      expect(field.disabled, category).toBe(false);
    }
    // Disclosed instead.
    expect(dialog.querySelector(".bonus-dialog__over")?.textContent).toBe("over by 1 ⚠");
    // NOTHING, ANYWHERE, GAINED `disabled` BECAUSE OF IT (§4.3, H4).
    expect(document.querySelectorAll("input:disabled, button:disabled")).toHaveLength(
      disabledBefore,
    );
    // …and not one control inside the mode is disabled at all, over-allocated
    // or not: both exits (raise the total, or lower a category) stay live.
    expect(dialog.querySelectorAll("input:disabled, button:disabled")).toHaveLength(0);
  });
});
