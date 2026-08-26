// @vitest-environment jsdom
/**
 * F4 group 11 — the 20-Badge-Slot default annotation on BudgetTotalRow.
 * `[official 2K page 2026-08-26 + user-confirmed same date]`
 *
 * This group exists because slice C previously shipped user-visible copy over
 * a cross-field invariant with ZERO test coverage in any of the ten original
 * groups. The four states are the brief's §3.3 C.3 table.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetTotalRow } from "../../src/ui/build/BudgetGrid";
import type { Budget } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";

/** Six equipSlots values in CATEGORIES order; points are irrelevant here. */
function budgetsFrom(equipSlots: readonly number[]): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category, index) => [
      category,
      { equipSlots: equipSlots[index] ?? 0, points: 10 },
    ]),
  ) as Record<Category, Budget>;
}

/** Renders the row and returns the Badge Slots cell — the LAST <td>. */
function badgeSlotsCell(equipSlots: readonly number[]): HTMLElement {
  render(
    <table>
      <tbody>
        <BudgetTotalRow budgets={budgetsFrom(equipSlots)} />
      </tbody>
    </table>,
  );
  const cells = screen.getAllByRole("cell");
  const cell = cells[cells.length - 1];
  if (cell === undefined) throw new Error("BudgetTotalRow rendered no cells");
  return cell;
}

describe("F4 group 11 — the four ruled display states", () => {
  it("11.1 Σ = 20, all six set → the CONFIRMATORY state, ASSERTED PRESENT", () => {
    // 4·3·3·5·2·3 = 20. The pre-amendment spec suppressed the equal case and
    // the natural instinct is to keep suppressing it. It ships: a checksum
    // you only ever see FAILING teaches the user nothing about what it means.
    expect(badgeSlotsCell([4, 3, 3, 5, 2, 3]).textContent).toContain("20 / 20 default");
  });

  it("11.2 Σ > 20, all six set → THE SAME FLAT PHRASING as under. The guess is DELETED", () => {
    // A5-U (design-spec §17.8). Slice C shipped a guess here — "23 / 20
    // default — 3 bonus Badge Slots?" — because bonus Badge Slots were the
    // most likely explanation for an over-20 total and nothing in the app
    // recorded them. The app records them now, in a separate layer that never
    // enters these six fields, so the comparison is base-against-base and
    // EXACT for the first time. The row may not ASK a question the app can now
    // ANSWER, and "3 bonus Badge Slots?" beside a mode where the user declared
    // 2 is the app arguing with the user.
    //
    // Identical treatment on both sides of 20: the disclosure IS the
    // comparison. Still H4 soft — no red, no ⚠, no gate.
    const text = badgeSlotsCell([5, 4, 3, 6, 2, 3]).textContent ?? "";
    expect(text).toContain("23 / 20 default");
    // CANARY 2, both halves. The `?` is gone from this row's output entirely,
    // and the word "bonus" never appears in the Σ-vs-20 annotation.
    expect(text).not.toContain("?");
    expect(text.toLowerCase()).not.toContain("bonus");
    // …and it reads EXACTLY as the under case does, modulo the numbers, so the
    // two cannot drift into two phrasings of one fact.
    const under = badgeSlotsCell([3, 2, 2, 4, 2, 2]).textContent ?? "";
    expect(text.replace("23", "N")).toBe(under.replace("15", "N"));
  });

  it("11.3 Σ < 20, all six set → the FLAT under phrasing, with no bonus/warning language", () => {
    // 3·2·2·4·2·2 = 15. Stated flatly: no verb, no advice. The user may have
    // deliberately entered a partial plan; the tool reports the arithmetic.
    const text = badgeSlotsCell([3, 2, 2, 4, 2, 2]).textContent ?? "";
    expect(text).toContain("15 / 20 default");
    for (const banned of ["bonus", "?", "⚠", "over"]) {
      expect(text.toLowerCase(), banned).not.toContain(banned.toLowerCase());
    }
  });

  it("11.4 at least one category UNSET → SILENT, and Σ STILL RENDERS", () => {
    // 3·2·0·4·2·2 = 13, Playmaking unset. §4.7 suppresses COMPARISONS, never
    // FACTS — so assert BOTH halves: the annotation is gone AND the total is
    // still there.
    const text = badgeSlotsCell([3, 2, 0, 4, 2, 2]).textContent ?? "";
    expect(text).toContain("13");
    for (const banned of ["/ 20", "default", "bonus"]) {
      expect(text, banned).not.toContain(banned);
    }
  });

  it("11.5 the ALL-ZERO zero state → SILENT", () => {
    // Redundant with 11.4 by construction, and asserted anyway: this is the
    // state the user sees for the first minutes of every session, and it is
    // the one a future "simplify the guard to Σ === 0" refactor would
    // silently break.
    const text = badgeSlotsCell([0, 0, 0, 0, 0, 0]).textContent ?? "";
    expect(text).toContain("0");
    expect(text).not.toContain("/ 20");
    expect(text).not.toContain("default");
  });

  it("11.6 ORDER-OF-EVALUATION PIN — the unset guard BEATS a coincidental Σ = 20", () => {
    // 5·5·0·5·5·0 → Σ is exactly 20 and TWO categories are unset. This is the
    // assertion that fails if someone implements the guard as `Σ === 0`, or
    // checks `anyUnset` AFTER the equality branch instead of first. DO NOT DROP IT.
    const text = badgeSlotsCell([5, 5, 0, 5, 5, 0]).textContent ?? "";
    expect(text).toContain("20");
    expect(text).not.toContain("/ 20 default");
  });
});

describe("F4 group 11.7 — never an error affordance, in ANY state (H4 SOFT, asserted not assumed)", () => {
  for (const [label, equipSlots] of [
    ["Σ = 20", [4, 3, 3, 5, 2, 3]],
    ["Σ > 20", [5, 4, 3, 6, 2, 3]],
    ["Σ < 20", [3, 2, 2, 4, 2, 2]],
  ] as const) {
    it(`${label}: no ⚠, and the annotation node carries no danger/error/warning class`, () => {
      const cell = badgeSlotsCell(equipSlots);
      expect(cell.textContent).not.toContain("⚠");
      const note = cell.querySelector(".budget-total-row__default-note");
      expect(note, "the annotation should render in this state").not.toBeNull();
      const className = note?.getAttribute("class") ?? "";
      for (const banned of ["danger", "error", "warning"]) {
        expect(className, banned).not.toContain(banned);
      }
      // Never a chip, never a live region.
      expect(cell.querySelector(".chip")).toBeNull();
      expect(cell.querySelector("[role='status'],[role='alert'],[aria-live]")).toBeNull();
    });
  }
});

describe("F4 group 11.8 — H1 vocabulary on the RENDERED strings", () => {
  /**
   * This duplicates tests/vocabulary.test.ts at the rendered-output layer ON
   * PURPOSE: that lint greps SOURCE, and a string assembled from fragments at
   * runtime can pass the source grep and still render a bare "slots".
   */
  const BARE_SLOTS = /(?<!Badge )\bslots?\b/i;

  for (const [label, equipSlots] of [
    ["Σ = 20", [4, 3, 3, 5, 2, 3]],
    ["Σ > 20", [5, 4, 3, 6, 2, 3]],
    ["Σ < 20", [3, 2, 2, 4, 2, 2]],
    ["any unset", [3, 2, 0, 4, 2, 2]],
    ["all zero", [0, 0, 0, 0, 0, 0]],
  ] as const) {
    it(`${label}: the rendered text matches the bare-slot regex ZERO times`, () => {
      const text = badgeSlotsCell(equipSlots).textContent ?? "";
      expect(BARE_SLOTS.exec(text)).toBeNull();
    });
  }

  it("POSITIVE CANARY: the regex DOES fire on a bare 'slots' — a lint that cannot fail is worse than none", () => {
    expect(BARE_SLOTS.test("23 / 20 default — 3 bonus slots?")).toBe(true);
    expect(BARE_SLOTS.test("23 / 20 default — 3 bonus Badge Slots?")).toBe(false);
  });
});
