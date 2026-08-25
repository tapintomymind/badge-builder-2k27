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
 * Rev 6 adds the third way to get this wrong, which is the one that shipped:
 * I8 compared the rail against `RAIL_RIGHT - SECTION_CHROME` and stopped
 * there, so it never saw that the F5 PAINT slice had given .ledger-overview
 * an inset well with 12px sides. 24px of a 142px content box went to a
 * decoration the geometry did not know about, and every ledger row wrapped
 * onto two lines from that commit on — the empty state included. A number a
 * paint slice can spend is geometry, so I8b now PARSES the well's padding
 * and the row's own column gap and re-derives the fit from them.
 *
 * I8b also corrects WHICH demand I8 checked. `LEDGER_ROW_MIN = 137` was a
 * MIN-content number ("Playmaking" + "10/16"): the width below which the
 * text itself breaks, not the width at which the row stops wrapping. The
 * row is a flex line — it wraps at label + gap + metrics MAX-content. The
 * old constant could not have caught this defect even with the well counted.
 *
 * The measured-on-paper constants are MEASURED, not parsed. They are pinned
 * deliberately: if a label, a font size or a field width moves, someone has
 * to come here and move them by hand. That is the point, not a shortcoming.
 * Every one of them was re-measured in headless Chrome at the rev-6 cut.
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

const SPACE_1 = px(tokens, /--space-1:\s*(\d+)px/); //  4 — ledger row padding
const SPACE_2 = px(tokens, /--space-2:\s*(\d+)px/); //  8 — slider row gap
const SPACE_3 = px(tokens, /--space-3:\s*(\d+)px/); // 12 — column gap, card gap, S page padding
const SPACE_4 = px(tokens, /--space-4:\s*(\d+)px/); // 16 — page padding ≥768, section padding

const TIER_COLUMNS = [
  ...app.matchAll(/grid-template-columns:\s*(\d+)px\s+minmax\(0,\s*1fr\)\s+(\d+)px/g),
];
if (TIER_COLUMNS.length !== 2) {
  throw new Error(
    `layout arithmetic: expected exactly 2 fixed-rail tiers (L + XL), found ${TIER_COLUMNS.length}`,
  );
}
/** L (1280–1439) — the tight cut. Source order is the breakpoint order. */
const RAIL_LEFT = Number.parseInt(TIER_COLUMNS[0]![1] as string, 10);
const RAIL_RIGHT = Number.parseInt(TIER_COLUMNS[0]![2] as string, 10);
/** XL (≥1440) — the comfortable cut. */
const XL_RAIL_LEFT = Number.parseInt(TIER_COLUMNS[1]![1] as string, 10);
const XL_RAIL_RIGHT = Number.parseInt(TIER_COLUMNS[1]![2] as string, 10);
/** The breakpoint at which the XL tier takes over. Both tiers declare
 *  `.layout { grid-template-columns: … }` inside a min-width query, so this
 *  takes the WIDER of the two rather than the first one in source order. */
const TIER_BREAKPOINTS = [
  ...app.matchAll(
    /@media \(min-width:\s*(\d+)px\)\s*\{\s*\.layout\s*\{\s*grid-template-columns:\s*\d+px\s+minmax\(0,\s*1fr\)\s+\d+px/g,
  ),
].map((match) => Number.parseInt(match[1] as string, 10));
if (TIER_BREAKPOINTS.length !== 2) {
  throw new Error(
    `layout arithmetic: expected 2 fixed-rail breakpoints, found ${TIER_BREAKPOINTS.length}`,
  );
}
const L_BREAKPOINT = Math.min(...TIER_BREAKPOINTS);
const XL_BREAKPOINT = Math.max(...TIER_BREAKPOINTS);

/** The ledger well's own sides, and the row's label↔metrics gap — BOTH
 *  tiers. These are rail geometry (see the header note), so they are parsed
 *  from source rather than assumed. */
function spaceToken(name: string): number {
  return px(tokens, new RegExp(`--${name}:\\s*(\\d+)px`));
}

/** Every `{ … }` body declared for `selector` in `source`, in source order.
 *  A selector legitimately appears more than once (the layout cut, then the
 *  F5 paint block, then the XL relaxation) — the caller says which
 *  DECLARATION it wants, not which occurrence, so a re-ordered stylesheet
 *  does not silently change the answer. */
function blocksFor(source: string, selector: string): string[] {
  const out: string[] = [];
  const needle = `${selector} {`;
  for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) {
    const open = at + needle.length;
    const close = source.indexOf("}", open);
    if (close === -1) continue;
    out.push(source.slice(open, close));
  }
  if (out.length === 0) throw new Error(`layout arithmetic: no block for ${selector}`);
  return out;
}

/** The `index`-th space token in the one block of `selector` that declares
 *  `property`. Throws if two blocks declare it — an ambiguous cascade here
 *  means the derivation below is guessing, and it must not guess. */
function spaceIn(source: string, selector: string, property: string, index: number): number {
  const decls = blocksFor(source, selector)
    .map((block) => new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`).exec(block))
    .filter((match): match is RegExpExecArray => match !== null);
  if (decls.length !== 1) {
    throw new Error(
      `layout arithmetic: expected exactly 1 "${selector} { ${property} }", found ${decls.length}`,
    );
  }
  const parts = (decls[0]![1] as string).trim().split(/\s+/);
  const chosen = parts[Math.min(index, parts.length - 1)] as string;
  const token = /var\(--([a-z0-9-]+)\)/.exec(chosen);
  if (token === null) {
    throw new Error(`layout arithmetic: ${selector} ${property} is a literal, not a token`);
  }
  return spaceToken(token[1] as string);
}

/** Split the stylesheet into what applies at L and what only applies at XL.
 *  The XL relaxations are spread over more than one @media block, so this
 *  walks braces rather than assuming a single contiguous region. */
function splitAtBreakpoint(source: string, breakpoint: number): { below: string; atOrAbove: string } {
  const needle = `@media (min-width: ${breakpoint}px)`;
  let below = "";
  const atOrAbove: string[] = [];
  let cursor = 0;
  for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, cursor)) {
    below += source.slice(cursor, at);
    let depth = 0;
    let scan = source.indexOf("{", at);
    do {
      if (source[scan] === "{") depth += 1;
      else if (source[scan] === "}") depth -= 1;
      scan += 1;
    } while (depth > 0 && scan < source.length);
    atOrAbove.push(source.slice(at, scan));
    cursor = scan;
  }
  return { below: below + source.slice(cursor), atOrAbove: atOrAbove.join("\n") };
}

const { below: L_SOURCE, atOrAbove: XL_SOURCE } = splitAtBreakpoint(app, XL_BREAKPOINT);

/** L: `.ledger-overview { padding: <y> <x> }` — the x half. */
const WELL_PAD_X = spaceIn(L_SOURCE, ".ledger-overview", "padding", 1);
/** L: `.ledger-overview__row { gap: <row> <column> }` — the column half. */
const ROW_GAP_X = spaceIn(L_SOURCE, ".ledger-overview__row", "gap", 1);
/** XL restores both. */
const XL_WELL_PAD_X = spaceIn(XL_SOURCE, ".ledger-overview", "padding", 1);
const XL_ROW_GAP_X = spaceIn(XL_SOURCE, ".ledger-overview__row", "column-gap", 0);

const CARD_FLOOR = px(app, /repeat\(auto-fill,\s*minmax\((\d+)px,\s*1fr\)\)/);
const ATTR_CELL_FLOOR = px(app, /repeat\(auto-fill,\s*minmax\(min\((\d+)px,\s*100%\),\s*1fr\)\)/);
const STACK_MAX = px(app, /@container \(max-width:\s*(\d+)px\)/);
const NUMERIC_W = px(app, /\.number-field input \{[^}]*width:\s*(\d+)px/);

/* --------------------------- measured on paper (design-spec §0.1, rev 6) -- */

/** BudgetGrid <table> min-content: "Playmaking" ~79 + 8 cell padding, then
 *  two NumberField cells of 56 + 8. The binding demand in the LEFT rail. */
const BUDGET_GRID_MIN = 215;
/** Widest category label at --text-sm: "Rebounding". MAX-content, because a
 *  single word has no break opportunity — its min and max are the same. */
const LEDGER_LABEL_MAX = 76;
/** .ledger-overview__metrics MAX-content in the EMPTY state, "0/0 · 0/—".
 *
 *  The empty state is the floor the rail must clear, not the ceiling: real
 *  numbers ("112/116 · 13/15") and the over-budget strings ("12/5 over by
 *  1 ⚠ · …") are wider than any rail this layout can afford, and wrap by
 *  design (§11.5 ④). What I8b forbids is a rail so narrow that a ledger with
 *  NOTHING in it already wraps — which is exactly what rev 5 + F5 shipped. */
const LEDGER_METRICS_MAX = 76;
/** A 0–99 slider narrower than this is not a control (design-spec §3.1). */
const USABLE_TRACK = 224;
/** <details class="section">: 1px border + --space-4 padding, both sides. */
const SECTION_CHROME = 2 + 2 * SPACE_4;
/** Plausible classic-scrollbar widths, plus macOS overlay. Derive at ALL. */
const SCROLLBARS = [0, 15, 17];

function centreColumn(viewport: number, scrollbar: number, left = RAIL_LEFT, right = RAIL_RIGHT): number {
  return viewport - scrollbar - 2 * SPACE_4 - 2 * SPACE_3 - left - right;
}
/** What the right rail must be for a ledger row to sit on ONE line: the row
 *  box it needs, plus the well it sits in, plus the section around that. */
function ledgerRailNeeded(gap: number, wellPadX: number): number {
  return LEDGER_LABEL_MAX + gap + LEDGER_METRICS_MAX + 2 * wellPadX + SECTION_CHROME;
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

  it("the L cut spends the ceiling it is allowed, and no more", () => {
    // rev 6 sits ON the I3 ceiling on purpose: the right rail could not
    // clear I8b otherwise, and the left rail is already at its I9 floor.
    // Documented so the next re-cut knows there is nothing left to take at
    // 1280 — the only way to widen a rail there is to move a floor.
    const ceiling =
      1280 - Math.max(...SCROLLBARS) - 2 * SPACE_4 - 2 * SPACE_3 - (3 * CARD_FLOOR + 2 * SPACE_3);
    expect(ceiling - (RAIL_LEFT + RAIL_RIGHT)).toBeLessThanOrEqual(SPACE_1);
    expect(RAIL_LEFT - SECTION_CHROME).toBe(USABLE_TRACK); // the I9 floor, exactly
  });
});

/* ----------------------------------------------------------------- I3-XL -- */

describe("I3 at XL — the second tier buys width without costing cards", () => {
  it("is still 3-up at its own breakpoint, at every scrollbar width", () => {
    for (const scrollbar of SCROLLBARS) {
      expect(
        cardsPerRow(centreColumn(XL_BREAKPOINT, scrollbar, XL_RAIL_LEFT, XL_RAIL_RIGHT)),
        `scrollbar ${scrollbar}px`,
      ).toBe(3);
    }
  });

  it("both rails are wider at XL than at L — that is the whole point", () => {
    expect(XL_RAIL_LEFT).toBeGreaterThan(RAIL_LEFT);
    expect(XL_RAIL_RIGHT).toBeGreaterThan(RAIL_RIGHT);
  });

  it("XL cannot start below the width its own rails can afford", () => {
    // The centre column DOES step down when the rails take their cut — that
    // is what buying width means, and it is fine while 3-up survives. What
    // must not happen is XL engaging at a viewport too narrow to fund it.
    // Stated as a floor on the BREAKPOINT rather than on the rails, because
    // raising the breakpoint is the cheap fix and shrinking the rails is not.
    const needed = 3 * CARD_FLOOR + 2 * SPACE_3;
    const earliest =
      needed + Math.max(...SCROLLBARS) + 2 * SPACE_4 + 2 * SPACE_3 + XL_RAIL_LEFT + XL_RAIL_RIGHT;
    expect(XL_BREAKPOINT).toBeGreaterThan(earliest);
  });

  it("L stops exactly where XL starts — no gap, no overlap", () => {
    expect(L_BREAKPOINT).toBeLessThan(XL_BREAKPOINT);
    expect(app).toContain(`@media (min-width: ${XL_BREAKPOINT}px)`);
  });
});

/* ------------------------------------------------------------------ I8 -- */

describe("I8 — each rail is wider than its own contents", () => {
  it("the LEFT rail clears BudgetGrid's min-content", () => {
    expect(RAIL_LEFT - SECTION_CHROME).toBeGreaterThanOrEqual(BUDGET_GRID_MIN);
  });

  it("the RIGHT rail clears the ledger row's MAX-content, well included", () => {
    // rev 6. Three things this replaces, all of which rev 5 got wrong:
    //   · it checked min-content, so it measured "does the text break",
    //     not "does the row wrap" — the row is a flex line and wraps first;
    //   · it stopped at SECTION_CHROME, so the well's 12px sides were free;
    //   · it therefore passed at 142px while the rows had 118px.
    expect(RAIL_RIGHT).toBeGreaterThanOrEqual(ledgerRailNeeded(ROW_GAP_X, WELL_PAD_X));
  });

  it("I8b — the ledger well's sides are GEOMETRY: spent, they must be funded", () => {
    // The regression this test exists for. F5 added the well's padding as a
    // paint decision; nothing re-derived the rail, and the rows lost 24px.
    // Whatever the well takes, the rail has to have handed it over first.
    const rowBox = RAIL_RIGHT - SECTION_CHROME - 2 * WELL_PAD_X;
    expect(rowBox).toBeGreaterThanOrEqual(LEDGER_LABEL_MAX + ROW_GAP_X + LEDGER_METRICS_MAX);

    // And the pre-rev-6 tree must NOT satisfy it — the canary that proves
    // this assertion has teeth rather than merely being true today.
    const shippedBroken = 176 - SECTION_CHROME - 2 * SPACE_3;
    expect(shippedBroken).toBeLessThan(LEDGER_LABEL_MAX + SPACE_4 + LEDGER_METRICS_MAX);
  });

  it("I8b — XL funds the well and the gap it restores", () => {
    const rowBox = XL_RAIL_RIGHT - SECTION_CHROME - 2 * XL_WELL_PAD_X;
    expect(rowBox).toBeGreaterThanOrEqual(LEDGER_LABEL_MAX + XL_ROW_GAP_X + LEDGER_METRICS_MAX);
    // XL is the COMFORTABLE tier: it is not allowed to be as tight as L.
    expect(XL_RAIL_RIGHT - ledgerRailNeeded(XL_ROW_GAP_X, XL_WELL_PAD_X)).toBeGreaterThan(
      RAIL_RIGHT - ledgerRailNeeded(ROW_GAP_X, WELL_PAD_X),
    );
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
