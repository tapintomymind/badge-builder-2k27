// @vitest-environment jsdom
/**
 * F8-S2 group 3 — the copy-as-text block, and the panel↔text equality that is
 * the whole reason the builder lives in the engine.
 *
 * THE PRIMARY PATH IS THE ONE WITH NO CLIPBOARD. `navigator.clipboard`
 * requires a secure context; the LAN origin OQ-A4 shipped `server: { host:
 * true }` for is not one. So the undefined-clipboard case is tested FIRST and
 * as the default, and the present-clipboard case is the enhancement.
 *
 * NO GOLDEN STRING APPEARS IN THIS FILE (§14.5.1). Every comparison is
 * against `formatSummaryText`'s own output, computed from the same fixture
 * state the panel renders — so a change to a reason string, a cost, a level
 * word or a footnote flows into both sides at once and cannot be silently
 * reverted at a merge. The only literals are STRUCTURAL: a marker is present,
 * a line is absent, a tally is an identity.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { buildSummary, synergyProjections } from "../../src/engine/summary";
import { formatSummaryText } from "../../src/engine/summary-text";
import type { SavedBuild } from "../../src/engine/types";
import { CATEGORIES, LEVELS, LEVEL_LABELS } from "../../src/engine/vocabulary";
import { writeAutosave } from "../../src/persist/local-storage";
import { capacityFootnote } from "../../src/ui/summary/SummaryPanel";
import { f8LedgerState, f8Rig } from "./f8-fixture";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

/** The LAN case: no clipboard at all. This is the default for every test
 *  here except the one that names the enhancement. */
function withoutClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

function withClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

function mount(rig: SavedBuild) {
  expect(writeAutosave(rig).ok).toBe(true);
  render(<App />);
  const state = f8LedgerState(rig);
  const summary = buildSummary(state, rig.build, shippedDataset);
  const synergy = synergyProjections(state, shippedDataset);
  return {
    summary,
    expected: formatSummaryText(summary, { buildName: rig.name }, synergy),
  };
}

function textarea(): HTMLTextAreaElement {
  return screen.getByRole("textbox", { name: /plain text/i }) as HTMLTextAreaElement;
}

beforeEach(() => {
  installMemoryLocalStorage();
  withoutClipboard();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("3 — the text block", () => {
  it("3.1 — the <textarea> is present, populated and readonly with NO clipboard", SLOW, () => {
    const { expected } = mount(f8Rig());
    const box = textarea();
    expect(box.readOnly).toBe(true);
    expect(box.getAttribute("spellcheck")).toBe("false");
    expect(box.value).toBe(expected);
    expect(box.value.length).toBeGreaterThan(0);
  });

  it("3.2 — with no clipboard, Copy opens the <details> and SELECTS the text", SLOW, () => {
    mount(f8Rig());
    const details = document.querySelector(".summary__copy-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const box = textarea();
    const select = vi.spyOn(box, "select");

    // It must not throw, warn or silently no-op.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Copy as text" }));

    expect(details.open).toBe(true);
    expect(select).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    // No error state, no toast, no banner — there is no failure mode.
    expect(document.querySelector(".summary__copy .banner")).toBeNull();
    // The label does NOT lie about having copied.
    expect(screen.getByRole("button", { name: "Copy as text" })).toBeTruthy();
    // …and the description says what the button actually does.
    const described = screen
      .getByRole("button", { name: "Copy as text" })
      .getAttribute("aria-describedby");
    expect(document.getElementById(described ?? "")?.textContent).toContain(
      "otherwise opens the text below, selected and ready to copy",
    );
  });

  it("3.3 — with a clipboard, it writes ONCE with the exact builder output and relabels", SLOW, () => {
    const writeText = vi.fn(async () => undefined);
    withClipboard(writeText);
    const { expected } = mount(f8Rig());
    fireEvent.click(screen.getByRole("button", { name: "Copy as text" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("3.4 — the text's levels and costs EQUAL the panel's, cell for cell", SLOW, () => {
    const { summary, expected } = mount(f8Rig());
    const roster = document.querySelector(".summary-roster") as HTMLElement;
    for (const category of summary.categories.filter((entry) => entry.rows.length > 0)) {
      const table = within(roster).getByRole("table", { name: category.category });
      for (const row of category.rows) {
        const rendered =
          within(table).getByRole("rowheader", { name: row.name }).closest("tr")?.textContent ??
          "";
        // Purchased level word: in the panel AND in the text.
        expect(rendered).toContain(LEVEL_LABELS[row.purchasedLevel]);
        expect(expected).toContain(
          `- ${row.name} [${row.tier}] ${LEVEL_LABELS[row.purchasedLevel]}`,
        );
        // Cost: same number on both sides.
        expect(rendered).toContain(String(row.cost));
        expect(expected).toContain(`— ${row.cost}`);
        // Effective level: the boosted arrow appears in both, or in neither.
        const boosted = row.committedEffectiveLevel !== row.purchasedLevel;
        const word = LEVEL_LABELS[row.committedEffectiveLevel];
        expect(rendered.includes(`→ ${word}`)).toBe(boosted);
        expect(expected.includes(`${row.name} [${row.tier}] ${LEVEL_LABELS[row.purchasedLevel]} -> ${word}`)).toBe(
          boosted,
        );
      }
      // The spend fraction the panel's <tfoot> shows is the text's too.
      const foot = table.querySelector("tfoot")?.textContent ?? "";
      expect(foot).toContain(`${category.readout.spent} / `);
      expect(expected).toContain(`### ${category.category} — ${category.readout.spent} / `);
    }
  });

  it("3.5 — every honesty marker survives into the text", SLOW, () => {
    const { summary, expected } = mount(f8Rig());
    // Structural literals — the four §14.5.1 leaves hand-written.
    expect(expected).toContain("unverified");
    expect(expected).toContain("no longer qualifies");
    expect(expected).toContain("capacity not set");
    expect(expected).toContain(shippedDataset.dataVersion);
    // The N-of-6 footnote, with its count computed from the engine.
    expect(summary.categoriesWithoutCapacity).toBeGreaterThan(0);
    expect(expected).toContain(
      `${summary.categoriesWithoutCapacity} of ${summary.categories.length} categories`,
    );
    // …and the Σ-vs-20 line is ABSENT while any capacity is unset — the
    // assertion that would have caught §14.5.2 ③.
    expect(summary.equipSlotsBaselineComparable).toBe(false);
    expect(expected).not.toContain("a build starts with");
    // The level tally sums to the purchase count, by construction.
    const total = LEVELS.reduce((sum, level) => sum + summary.countsByLevel[level], 0);
    expect(total).toBe(summary.categories.reduce((sum, c) => sum + c.rows.length, 0));
  });

  it("3.5b — with every capacity entered, the Σ line APPEARS and reads the base spread", SLOW, () => {
    const { summary, expected } = mount(
      f8Rig({
        budgets: Object.fromEntries(
          CATEGORIES.map((category) => [category, { points: 20, equipSlots: 3 }]),
        ),
      }),
    );
    expect(summary.equipSlotsBaselineComparable).toBe(true);
    // Computed from the POST-A5 function: the base Σ, plus a bonus clause
    // only when something was earned. Nothing is earned on this fixture.
    expect(summary.bonus.earnedEquipSlots).toBe(0);
    expect(expected).toContain(
      `${summary.totalBaseEquipSlots} of the ${summary.equipSlotsBaseline} a build starts with`,
    );
    expect(expected).not.toContain("bonus Badge Slots applied");
    // …and it is STILL absent from the panel (AJ-5: one home, and it is not
    // this one).
    const panel = document.querySelector(".summary") as HTMLElement;
    panel.querySelector(".summary__copy")?.remove();
    expect(panel.textContent).not.toContain("a build starts with");
  });

  it("3.6 — the component holds NO string builder: the value IS the engine's", SLOW, () => {
    const { expected } = mount(f8Rig());
    expect(textarea().value).toBe(expected);
    // The footnote the panel renders is the same fact the text carries, and
    // §14.5.2 ⑤ is why it had to be added at all.
    const { summary } = mount(f8Rig());
    expect(capacityFootnote(summary).trim()).not.toBe("");
    expect(
      document.querySelector(".summary__footnote")?.textContent?.trim(),
    ).toBe(capacityFootnote(summary).trim());
  });
});
