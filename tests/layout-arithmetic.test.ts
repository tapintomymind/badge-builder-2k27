/**
 * Layout arithmetic — design-spec §0.1 invariants I3 / I4 / I8 / I9.
 *
 * Node env, no DOM. This test does NOT measure layout; it PARSES the numbers
 * out of the shipped stylesheets and RE-DERIVES the identities the spec
 * asserts, so a future re-cut of any single number fails here instead of in
 * the user's browser.
 *
 * Provenance: rev 2 re-cut the L rails to 248/192 by checking that the
 * COLUMNS SUM (I3) and never checking that each column could hold its own
 * CONTENTS (I8). F3 then added a sixth Position segment and the left rail
 * grew a horizontal scrollbar, which is how the user found it. Rev 3
 * separately reused the 224px slider CELL floor as the track/numeric
 * ARRANGEMENT threshold (I9), which would have made a wider rail produce a
 * NARROWER track. Both are now derived here.
 *
 * The two content-minimum constants are MEASURED-ON-PAPER numbers, not
 * parsed. They are pinned deliberately: if a label, a font size or a field
 * width moves, someone has to come here and move them by hand. That is the
 * point, not a shortcoming.
 */

import { describe, expect, it } from "vitest";
import { srcSources } from "./helpers/test-utils";

const cssSources = import.meta.glob("/src/styles/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const app = cssSources["/src/styles/app.css"] ?? "";
const tokens = cssSources["/src/styles/tokens.css"] ?? "";

function px(source: string, pattern: RegExp): number {
  const match = pattern.exec(source);
  if (match === null) throw new Error(`layout arithmetic: not found — ${String(pattern)}`);
  return Number.parseInt(match[1] as string, 10);
}

/* ---------------------------------------------------- parsed from source -- */

const SPACE_2 = px(tokens, /--space-2:\s*(\d+)px/); //  8 — slider row gap
const SPACE_3 = px(tokens, /--space-3:\s*(\d+)px/); // 12 — column gap, card gap, S page padding
const SPACE_4 = px(tokens, /--space-4:\s*(\d+)px/); // 16 — page padding ≥768, section padding

const L_COLUMNS = /grid-template-columns:\s*(\d+)px\s+minmax\(0,\s*1fr\)\s+(\d+)px/.exec(app);
if (L_COLUMNS === null) throw new Error("layout arithmetic: L three-column declaration not found");
const RAIL_LEFT = Number.parseInt(L_COLUMNS[1] as string, 10);
const RAIL_RIGHT = Number.parseInt(L_COLUMNS[2] as string, 10);

const CARD_FLOOR = px(app, /repeat\(auto-fill,\s*minmax\((\d+)px,\s*1fr\)\)/);
const ATTR_CELL_FLOOR = px(app, /repeat\(auto-fill,\s*minmax\(min\((\d+)px,\s*100%\),\s*1fr\)\)/);
const STACK_MAX = px(app, /@container \(max-width:\s*(\d+)px\)/);
const NUMERIC_W = px(app, /\.number-field input \{[^}]*width:\s*(\d+)px/);

/* --------------------------- measured on paper (design-spec §0.1, rev 5) -- */

/** BudgetGrid <table> min-content: "Playmaking" ~79 + 8 cell padding, then
 *  two NumberField cells of 56 + 8. The binding demand in the LEFT rail. */
const BUDGET_GRID_MIN = 215;
/** .ledger-overview__row min-content: "Playmaking" ~79 + 16 gap + the
 *  metrics span's own min-content ("10/16" ~42). Binding in the RIGHT rail. */
const LEDGER_ROW_MIN = 137;
/** A 0–99 slider narrower than this is not a control (design-spec §3.1). */
const USABLE_TRACK = 224;
/** <details class="section">: 1px border + --space-4 padding, both sides. */
const SECTION_CHROME = 2 + 2 * SPACE_4;
/** Plausible classic-scrollbar widths, plus macOS overlay. Derive at ALL. */
const SCROLLBARS = [0, 15, 17];

function centreColumn(viewport: number, scrollbar: number): number {
  return viewport - scrollbar - 2 * SPACE_4 - 2 * SPACE_3 - RAIL_LEFT - RAIL_RIGHT;
}
function cardsPerRow(track: number): number {
  return Math.max(1, Math.floor((track + SPACE_3) / (CARD_FLOOR + SPACE_3)));
}
/** The design-spec §11.4 arrangement rule, as a function. */
function sliderTrack(cell: number): number {
  return cell <= STACK_MAX ? cell : cell - SPACE_2 - NUMERIC_W;
}

/* ------------------------------------------------------------------ I3 -- */

describe("I3 — the L columns sum, and the card count that follows", () => {
  it("is 3-up at 1280 at every plausible scrollbar width", () => {
    for (const scrollbar of SCROLLBARS) {
      expect(cardsPerRow(centreColumn(1280, scrollbar)), `scrollbar ${scrollbar}px`).toBe(3);
    }
  });

  it("keeps a non-zero margin over the 3-up minimum at the worst-case scrollbar", () => {
    const needed = 3 * CARD_FLOOR + 2 * SPACE_3; // 744
    expect(centreColumn(1280, Math.max(...SCROLLBARS))).toBeGreaterThan(needed);
  });

  it("has not let the rails eat the centre column again", () => {
    // rev 1 shipped 320/340 and left the badge grid — the reason the app
    // exists — the smallest region on screen (design-review D1).
    const ceiling =
      1280 - Math.max(...SCROLLBARS) - 2 * SPACE_4 - 2 * SPACE_3 - (3 * CARD_FLOOR + 2 * SPACE_3);
    expect(RAIL_LEFT + RAIL_RIGHT).toBeLessThanOrEqual(ceiling);
  });
});

/* ------------------------------------------------------------------ I8 -- */

describe("I8 — each rail is wider than its own contents", () => {
  it("the LEFT rail clears BudgetGrid's min-content", () => {
    expect(RAIL_LEFT - SECTION_CHROME).toBeGreaterThanOrEqual(BUDGET_GRID_MIN);
  });

  it("the RIGHT rail clears the ledger row's min-content", () => {
    expect(RAIL_RIGHT - SECTION_CHROME).toBeGreaterThanOrEqual(LEDGER_ROW_MIN);
  });

  it("the duplicate right-rail Export/Import pair stays deleted (rev 2 §3.6)", () => {
    // ~198px of min-content in a 142px box. The header pair is the only one.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx.match(/<ExportImportControls/g)?.length ?? 0).toBe(1);
  });

  it("the left rail still surfaces overflow rather than hiding it", () => {
    // overflow-y:auto computes overflow-x to auto — that scrollbar is how the
    // user found this defect. Masking it would hide the next one.
    const railBlock = app.slice(app.indexOf(".rail-left {"));
    expect(railBlock.slice(0, 200)).not.toContain("overflow-x: hidden");
    expect(railBlock.slice(0, 200)).not.toContain("overflow-x: clip");
  });
});

/* ------------------------------------------------------------------ I9 -- */

describe("I9 — the arrangement threshold is derived, not borrowed", () => {
  it("the stack threshold equals usableTrack + gap + numeric, minus one", () => {
    expect(STACK_MAX).toBe(USABLE_TRACK + SPACE_2 + NUMERIC_W - 1); // 287
  });

  it("widening the left rail improves the track instead of halving it", () => {
    const cell = RAIL_LEFT - SECTION_CHROME;
    expect(sliderTrack(cell)).toBeGreaterThanOrEqual(USABLE_TRACK);
    // Regression canary: the pre-rev-5 threshold would have failed this.
    expect(cell > 223 && cell <= STACK_MAX).toBe(true);
  });

  it("the cell floor still admits one sub-floor column (the min() idiom)", () => {
    expect(ATTR_CELL_FLOOR).toBe(USABLE_TRACK);
    expect(app).toContain("minmax(min(224px, 100%), 1fr)");
  });
});

/* ------------------------------------------------------------------ I4 -- */

describe("I4 — the sub-L layouts F2 fixed are untouched", () => {
  it("is 2-up at 768 and single-column below it", () => {
    expect(cardsPerRow(768 - 15 - 2 * SPACE_4)).toBe(2);
    expect(app).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("leaves the M/S slider arrangement bit-identical under the new threshold", () => {
    // 768: the build panel nests two <details> (outer Build, inner
    // Attributes), so the attribute grid sees 768 − 15 − 32 − 2×34 = 653px,
    // which auto-fills to 2 cells of ~320px.
    const panel768 = 768 - 15 - 2 * SPACE_4 - 2 * SECTION_CHROME;
    const cell768 = (panel768 - SPACE_3) / 2;
    expect(cell768).toBeGreaterThan(STACK_MAX); // still side-by-side

    // 390: page padding is --space-3 below 768; one cell.
    const panel390 = 390 - 2 * SPACE_3 - 2 * SECTION_CHROME;
    expect(panel390).toBeGreaterThan(STACK_MAX); // still side-by-side
  });
});
