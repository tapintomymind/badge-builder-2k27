/**
 * Layout arithmetic — design-spec §0.1 invariants I3 / I4 / I8 / I9 / I11 / I12.
 *
 * Node env, no DOM. This test does NOT measure layout; it PARSES the numbers
 * out of the shipped stylesheets and RE-DERIVES the identities the spec
 * asserts, so a future re-cut of any single number fails here instead of in
 * the user's browser.
 *
 * THE CHAIN, and the order it has to be checked in:
 *
 *   I3  — the SUM. Do the columns fit the viewport, and how many cards does
 *         what is left over hold? Checking only this is how rev 2 shipped a
 *         rail narrower than the control inside it.
 *   I8  — the CONTENTS. Is each column wider than the thing it holds? Rev 5
 *         added this and still got it wrong, because of the next two.
 *   I11 — the LAYOUT. Against MAX-content, never min-content. Min-content
 *         only proves the text will not scroll; a row wraps at
 *         label + gap + metrics MAX-content, which is a larger number.
 *         `LEDGER_ROW_MIN = 137` measured the wrong property and passed at
 *         +5px while every row on screen was wrapping.
 *   I12 — the DECORATIONS IN BETWEEN. A number a paint slice can spend is
 *         geometry. F5 gave .ledger-overview an inset well and took 24px out
 *         of a content box the geometry did not know about, so the well's
 *         padding and the label↔metrics gap are PARSED here, never assumed.
 *
 * §13 closes the chain by changing the shape rather than the numbers. The
 * ledger's column was not widened — it was REMOVED, and the ledger moved into
 * the one remaining rail. The reason is arithmetic, not taste: with 3-up at
 * 1280 as a fixed requirement, a column that holds one ledger category per
 * line does not exist at any width the centre can afford to give up
 * (design-spec §13.2). Dropping it returns a whole rail plus a gap, so the
 * single rail can be chosen ABOVE its floor for the first time, and one
 * structure now serves every viewport from 320px to 4K — no second tier.
 *
 * The measured-on-paper constants are MEASURED, not parsed. They are pinned
 * deliberately: if a label, a font size or a field width moves, someone has
 * to come here and move them by hand. That is the point, not a shortcoming.
 */

import { describe, expect, it } from "vitest";
import { cssBlock, srcSources } from "./helpers/test-utils";

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

const SPACE_1 = px(tokens, /--space-1:\s*(\d+)px/); //  4 — the squeeze b22f8ab needed and §13 reverted
const SPACE_2 = px(tokens, /--space-2:\s*(\d+)px/); //  8 — slider row gap, ledger row-gap
const SPACE_3 = px(tokens, /--space-3:\s*(\d+)px/); // 12 — column gap, card gap, S page padding
const SPACE_4 = px(tokens, /--space-4:\s*(\d+)px/); // 16 — page padding ≥768, section padding
const SPACE_6 = px(tokens, /--space-6:\s*(\d+)px/); // 24 — "between major sections" (§2.3)

/* ONE tier, ONE rail, TWO tracks. Note the trailing `;` in the regex: without
 * it this matches the leading substring of a THREE-track declaration and the
 * whole file certifies the layout it exists to forbid. */
const L_COLUMNS = /grid-template-columns:\s*(\d+)px\s+minmax\(0,\s*1fr\)\s*;/.exec(app);
if (L_COLUMNS === null) throw new Error("layout arithmetic: L two-column declaration not found");
/** The single rail. There is no second one, at any width. */
const RAIL = Number.parseInt(L_COLUMNS[1] as string, 10);

const L_BREAKPOINT = px(
  app,
  /@media \(min-width:\s*(\d+)px\)\s*\{\s*\.layout\s*\{\s*grid-template-columns:\s*\d+px\s+minmax\(0,\s*1fr\)\s*;/,
);

function spaceToken(name: string): number {
  return px(tokens, new RegExp(`--${name}:\\s*(\\d+)px`));
}

/** Every `{ … }` body declared for `selector` in `source`, in source order.
 *  A selector legitimately appears more than once (the layout grid, then the
 *  F5 paint well) — the caller says which DECLARATION it wants, not which
 *  occurrence, so a re-ordered stylesheet does not silently change the answer. */
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

/** The F5 inset well's sides — I12: a number a paint slice can spend is
 *  geometry, so it is PARSED, never assumed. The well is the SECOND
 *  `.ledger-overview {` block; the first (the grid) declares no padding, so
 *  spaceIn's exactly-one-declaration rule resolves it unambiguously.
 *
 *  b22f8ab squeezed these sides to --space-1 because a 204px rail could not
 *  fund --space-3. At a 266px content box it can, and §10.5's --bevel-inset
 *  instrument well reads wrong at 4px sides, so the squeeze is reverted —
 *  uniformly, with no tier left to restore it in. */
const WELL_PAD_X = spaceIn(app, ".ledger-overview", "padding", 1);
/** The label↔metrics gap. It USED to live on .ledger-overview__row; §13.4
 *  replaced that row with `display: contents`, so the gap is now the GRID's
 *  own column-gap, declared on the FIRST .ledger-overview block. */
const ROW_GAP_X = spaceIn(app, ".ledger-overview", "column-gap", 0);

const CARD_FLOOR = px(app, /repeat\(auto-fill,\s*minmax\((\d+)px,\s*1fr\)\)/);
/** Read out of the attribute grid's OWN block, not out of the first match in
 *  the file. Two rules now use the `min(Npx, 100%)` sub-floor idiom — this
 *  one and .synergy-panel — and .synergy-panel is declared ABOVE it, so a
 *  whole-file first-match would silently return the synergy floor and every
 *  I9 assertion below would be checking the wrong surface while staying
 *  green-ish. Same class of trap as CARD_FLOOR's, caught by anchoring. */
const ATTR_CELL_FLOOR = px(
  cssBlock(app, ".attr-group__fields--sliders"),
  /repeat\(auto-fill,\s*minmax\(min\((\d+)px,\s*100%\),\s*1fr\)\)/,
);
const STACK_MAX = px(app, /@container \(max-width:\s*(\d+)px\)/);
const NUMERIC_W = px(app, /\.number-field input \{[^}]*width:\s*(\d+)px/);

/* --------------------------- measured on paper (design-spec §0.1, §13.0.1) -- */

/** BudgetGrid <table> min-content: "Playmaking" ~79 + 8 cell padding, then
 *  two NumberField cells of 56 + 8. A table genuinely cannot compress below
 *  this — it overflows instead. */
const BUDGET_GRID_MIN = 215;
/** Widest category label at --text-sm: "Rebounding". MEASURED in headless
 *  Chrome by b22f8ab; kept verbatim (§13.0.1). A single word has no break
 *  opportunity, so its min- and max-content are the same. */
const LEDGER_LABEL_MAX = 76;
/** .ledger-overview__metrics MAX-content for a REAL 3-digit build,
 *  "112/116 · 13/15" — 15 --font-num chars.
 *
 *  RAISED 76 -> 127 (§13.0.1). The 76 was the EMPTY state, "0/0 · 0/—": it
 *  certified a ledger the user does not have, while b22f8ab's own reportback
 *  recorded 2 of 6 rows still wrapping with real numbers. The user's
 *  complaint was about a POPULATED ledger. Moving a pinned measurement is a
 *  deliberate act (§11.7) and this is it. */
const LEDGER_METRICS_MAX = 127;
/** The four Synergy Slot row-header controls: title 98 + Permanent chip 75 +
 *  the +1/+2 SegmentedControl 81 + the Unlocked Toggle 104 + 3 gaps 36 + 2
 *  row paddings 32. b22f8ab measured ~420 and refused to fix it with
 *  geometry at a 204px rail (correctly — a 3x shortfall). §13.0.1 takes the
 *  larger of the two figures: an under-pinned floor is the failure mode this
 *  whole section is about. */
const SYNERGY_HEADER_MAX = 426;
/** A <select> needs this much to show a badge name before the native ellipsis. */
const SELECT_FLOOR = 180;
/** .synergy-row padding is --space-4 each side. */
const ROW_PAD = SPACE_4;
/** A 0–99 slider narrower than this is not a control (design-spec §3.1). */
const USABLE_TRACK = 224;
/** <details class="section">: 1px border + --space-4 padding, both sides. */
const SECTION_CHROME = 2 + 2 * SPACE_4;
/** Plausible classic-scrollbar widths, plus macOS overlay. Derive at ALL. */
const SCROLLBARS = [0, 15, 17];

/* DELETED: LEDGER_ROW_MIN = 137. It was a MIN-content figure — the width at
 * which the TEXT breaks, not the width at which the ROW stops wrapping — and
 * it passed at +5px while every row wrapped (I11). Deleted rather than kept
 * alongside: two constants for one row invites checking the easy one. */

/** ONE gap and ONE rail — that is the whole of the §13 re-cut, expressed as
 *  arithmetic. */
function centreColumn(viewport: number, scrollbar: number): number {
  return viewport - scrollbar - 2 * SPACE_4 - SPACE_3 - RAIL;
}
/** What the rail must be for a ledger row to sit on ONE line: the row box it
 *  needs, plus the well it sits in, plus the section around that. */
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

describe("I3 — two columns, and the card count that follows", () => {
  it("is 3-up at 1280 at every plausible scrollbar width", () => {
    for (const scrollbar of SCROLLBARS) {
      expect(cardsPerRow(centreColumn(1280, scrollbar)), `scrollbar ${scrollbar}px`).toBe(3);
    }
  });

  it("3-up at 1280 is no longer a knife edge", () => {
    // b22f8ab's three-column cut cleared the 3-up minimum by ONE pixel at the
    // worst-case scrollbar, and said so in its own reportback. Returning the
    // third column's width to the centre turns that 1px into 175.
    expect(centreColumn(1280, 17) - (3 * CARD_FLOOR + 2 * SPACE_3)).toBeGreaterThan(150);
  });

  it("4-up arrives at a DERIVED width, and the seam is exact", () => {
    const v4 = 4 * CARD_FLOOR + 3 * SPACE_3 + RAIL + SPACE_3 + 2 * SPACE_4 + 17;
    expect(cardsPerRow(centreColumn(v4, 17))).toBe(4);
    expect(cardsPerRow(centreColumn(v4 - 1, 17))).toBe(3);
  });

  it("has not let the rail eat the centre column again", () => {
    // rev 1 shipped 320/340 and left the badge grid — the reason the app
    // exists — the smallest region on screen (design-review D1).
    const ceiling =
      1280 - Math.max(...SCROLLBARS) - 2 * SPACE_4 - SPACE_3 - (3 * CARD_FLOOR + 2 * SPACE_3);
    expect(RAIL).toBeLessThanOrEqual(ceiling);
  });

  it("the third column is GONE — no rail may reappear by accident", () => {
    // Guarded as FULL declarations, never prefixes: the surviving two-track
    // declaration BEGINS with the same characters as the three-track XL one,
    // so a prefix guard would make this file unable to be both green and
    // honest. The 320/248/280 guards below stay prefix-shaped only because
    // no surviving declaration begins with any of them.
    expect(app).not.toContain("grid-template-columns: 258px minmax(0, 1fr) 204px"); // b22f8ab L
    expect(app).not.toContain("grid-template-columns: 300px minmax(0, 1fr) 268px"); // b22f8ab XL
    expect(app).not.toContain("minmax(0, 1fr) 176px"); // F5.0's right rail
    expect(app).not.toContain(".rail-right");
    expect(app).not.toContain("@media (min-width: 1440px)"); // no XL tier at all
  });

  it("there is exactly ONE fixed-rail breakpoint, and it is L", () => {
    expect(L_BREAKPOINT).toBe(1280);
    expect(
      [...app.matchAll(/grid-template-columns:\s*\d+px\s+minmax\(0,\s*1fr\)/g)],
    ).toHaveLength(1);
  });
});

/* ------------------------------------------------------------- I8 + I11 -- */

describe("I8 + I11 — the single rail clears its contents' MAX-content, not min", () => {
  it("the rail clears BudgetGrid's min-content", () => {
    expect(RAIL - SECTION_CHROME).toBeGreaterThanOrEqual(BUDGET_GRID_MIN);
  });

  it("I11 — the ledger row lays out ON ONE LINE with real numbers, well included", () => {
    // The property the user actually reported. Checked against max-content,
    // and with the well counted, because both of those are how the previous
    // two revisions passed while the rows wrapped.
    const content = RAIL - SECTION_CHROME;
    const rowMax = LEDGER_LABEL_MAX + ROW_GAP_X + LEDGER_METRICS_MAX;
    expect(content - 2 * WELL_PAD_X).toBeGreaterThanOrEqual(rowMax);
  });

  it("I8b — the ledger well's sides are GEOMETRY: spent, they must be funded", () => {
    expect(RAIL).toBeGreaterThanOrEqual(ledgerRailNeeded(ROW_GAP_X, WELL_PAD_X));

    // b22f8ab's own L cut fails this by 49px. The canary proves the assertion
    // has teeth against the JUST-SHIPPED tree, not only against the old one.
    const shippedBroken = 204 - SECTION_CHROME - 2 * SPACE_1; // 162
    expect(shippedBroken).toBeLessThan(LEDGER_LABEL_MAX + SPACE_2 + LEDGER_METRICS_MAX); // 211
  });

  it("the rail is chosen ABOVE its floor, and the slack is named", () => {
    // b22f8ab asserted that NO slack remained, which was true and was the
    // problem. Same bookkeeping discipline, opposite sign: the next addition
    // is still checked against a number rather than against a vibe.
    const content = RAIL - SECTION_CHROME;
    // The binding demand, named: a real 3-digit ledger row inside its well.
    const maxDemand = LEDGER_LABEL_MAX + ROW_GAP_X + LEDGER_METRICS_MAX + 2 * WELL_PAD_X; // 239
    expect(content - maxDemand).toBeGreaterThanOrEqual(SPACE_6); // 266 − 239 = 27 ≥ 24
  });

  it("the duplicate right-rail Export/Import pair stays deleted (rev 2 §3.6)", () => {
    // ~198px of min-content in a 142px box. The header pair is the only one.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx.match(/<ExportImportControls/g)?.length ?? 0).toBe(1);
  });

  it("the sticky rail is wrapped in a stretching grid item, so it cannot escape the grid", () => {
    // A sticky GRID ITEM is constrained by the grid container's content box,
    // not by its own row. With the two panels in rows 2 and 3, a sticky
    // .rail-left placed directly in .layout scrolls past the badge grid and
    // paints over them (measured: doc-y 4660 against a grid ending at 4644).
    // .rail-column stretches to row 1 and gives the sticky box a containing
    // block that ends where the grid does.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toMatch(/className="rail-column">\s*<div className="rail-left">/);
    expect(cssBlock(app, ".rail-column")).toContain("align-self: stretch");
  });

  it("the rail still surfaces overflow rather than hiding it", () => {
    // overflow-y:auto computes overflow-x to auto — that scrollbar is how the
    // user found this defect. Masking it would hide the next one.
    const railBlock = app.slice(app.indexOf(".rail-left {"));
    expect(railBlock.slice(0, 200)).not.toContain("overflow-x: hidden");
    expect(railBlock.slice(0, 200)).not.toContain("overflow-x: clip");
  });
});

/* --------------------------------------------------------------- §13.5 -- */

describe("§13.5 — Synergy and Summary live below the grid at EVERY breakpoint", () => {
  it("both panels span the full layout width", () => {
    expect(cssBlock(app, ".panel-below")).toContain("grid-column: 1 / -1");
  });

  it("the synergy row floor is DERIVED, and the header binds", () => {
    const pickersRowFloor = 2 * SELECT_FLOOR + SPACE_3 + 2 * ROW_PAD; // 404
    const synergyRowFloor = Math.max(pickersRowFloor, SYNERGY_HEADER_MAX); // 426
    // The max() is kept VISIBLE so the day the header shrinks, the pickers
    // become the binding floor mechanically rather than by someone
    // remembering that they might.
    expect(synergyRowFloor).toBe(SYNERGY_HEADER_MAX);
    // One number, used twice: the grid track floor AND the container-query
    // threshold, so a row can never be narrower than what it must arrange.
    //
    // The floor carries §11.5 ③'s min() sub-floor idiom. A bare 426px floor
    // is ABSOLUTE and would hold the single S column at 426px inside a 366px
    // box — a horizontal scrollbar on the whole document, at the one
    // breakpoint where §13.5 explicitly expects the row to be 366 and the
    // pickers to stack.
    expect(app).toContain(
      `repeat(auto-fill, minmax(min(${synergyRowFloor}px, 100%), 1fr))`,
    );
    expect(app).toContain(`@container (min-width: ${synergyRowFloor}px)`);
  });

  it("the container query sits BELOW the rule it overrides", () => {
    // A container query adds no specificity. Declared above
    // `.synergy-row__pickers`'s base `flex-direction: column`, the query
    // evaluates true at 1280 and changes nothing — the pickers stay stacked
    // in a 601px row, and every assertion in this file still passes.
    expect(app.indexOf("@container (min-width: 426px)")).toBeGreaterThan(
      app.indexOf(".synergy-row__pickers {"),
    );
  });

  it("a synergy row is never narrower than the arrangement it asks for, at 1280", () => {
    const pickersRowFloor = 2 * SELECT_FLOOR + SPACE_3 + 2 * ROW_PAD;
    const synergyRowFloor = Math.max(pickersRowFloor, SYNERGY_HEADER_MAX);
    const belowGrid = 1280 - 17 - 2 * SPACE_4; // 1231
    const columns = Math.max(
      1,
      Math.floor((belowGrid + SPACE_3) / (synergyRowFloor + SPACE_3)),
    );
    const rowWidth = (belowGrid - (columns - 1) * SPACE_3) / columns; // 609.5
    expect(columns).toBe(2);
    expect(rowWidth).toBeGreaterThanOrEqual(synergyRowFloor);
  });

  it("the summary tables are capped rather than stretched", () => {
    // width:100% across a 1231px below-grid box puts the label at the far
    // left and the figure at the far right — unreadable in a different way
    // from a 142px rail. The track cap tames it; the table rule is untouched.
    expect(cssBlock(app, ".summary")).toMatch(/repeat\(auto-fit, minmax\(\d+px, \d+px\)\)/);
  });

  it("the jump-nav panel chips are no longer hidden at L", () => {
    // §13.6: the premise ("at ≥1280 the rail is visible") is false at every
    // breakpoint now, because the panels live below the grid at every one.
    expect(app).not.toMatch(/\.jump-nav__panel\s*\{[^}]*display:\s*none/s);
  });

  it("the zigzag mechanism is gone, and a shared grid replaced it", () => {
    // Cause, not symptom. flex + wrap + space-between + margin-left:auto put
    // the label alone on line 1 and the metrics alone flush-right on line 2,
    // six times over, with no column alignment anywhere.
    expect(cssBlock(app, ".ledger-overview")).toContain("display: grid");
    const row = cssBlock(app, ".ledger-overview__row");
    expect(row).toContain("display: contents");
    expect(row).not.toContain("flex-wrap");
    expect(row).not.toContain("space-between");
    // Left-aligned in an auto column aligns the FIRST number — the one being
    // reconciled — across all six rows. Right-aligning aligned the last.
    expect(cssBlock(app, ".ledger-overview__metrics")).not.toContain("margin-left: auto");
    expect(cssBlock(app, ".ledger-overview__metrics")).not.toContain("text-align: right");
  });

  it("the §4.5 landmarks are restored — two asides, each named what it holds", () => {
    // The shipped code drifted to ONE <aside aria-label="Ledger and synergy">
    // because that aside held three unrelated things. Nothing in the suite
    // observed the drift, which is why it survived five revisions.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toContain('aria-label="Build"');
    expect(appTsx).toContain('aria-label="Ledger overview"');
    expect(appTsx).not.toContain('aria-label="Ledger and synergy"');
  });

  it("the jump-nav targets and the section storage keys survived the move", () => {
    // The two ids move from inside the deleted right rail onto .panel-below.
    // A dropped id is a dead chip at EVERY breakpoint (P1-3) and no DOM test
    // asserts the target EXISTS — only the link text.
    //
    // The three storageKeys are the slice's one persisted-reload reader. A
    // silent rename resets every user's collapsed/expanded preference on
    // their next load, and nothing else in the suite would notice.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toContain('id="panel-synergy"');
    expect(appTsx).toContain('id="panel-summary"');
    expect(appTsx).toContain('storageKey="section-ledger-overview"');
    expect(appTsx).toContain('storageKey="section-synergy"');
    expect(appTsx).toContain('storageKey="section-summary"');
  });
});

/* ------------------------------------------------------------------ I9 -- */

describe("I9 — the arrangement threshold is derived, not borrowed", () => {
  it("the stack threshold equals usableTrack + gap + numeric, minus one", () => {
    expect(STACK_MAX).toBe(USABLE_TRACK + SPACE_2 + NUMERIC_W - 1); // 287
  });

  it("widening the rail improves the track instead of halving it", () => {
    const cell = RAIL - SECTION_CHROME;
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
