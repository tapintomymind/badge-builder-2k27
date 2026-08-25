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
import { cssBlock, srcSources, stripComments } from "./helpers/test-utils";

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


/* ------------------------------------------------ I11 + I12 + I13 (F5.3) -- */

/**
 * F5.3 — the badge card's INTERNAL geometry.
 *
 * §13.0.1 gave the card a width. This section asks the next question: does
 * what is inside the card FIT that width, and do the boxes in a row end at
 * the same pixel. Both were reported broken by the user, and the second one
 * has a cause nobody had measured: the grid stretches its <li> children
 * perfectly, and always did — the dead space is INSIDE each cell, below a
 * .badge-card that is a content-height flex column and never fills its <li>.
 *
 * Same discipline as everything above it: parse the numbers out of the
 * shipped stylesheet, re-derive the identity, and give each assertion a
 * canary that is red against the arrangement it replaced.
 */

/* --------------------------------------------------------- parsed (F5.3) -- */

const CARD_PAD = spaceIn(app, ".badge-card", "padding", 0);
const CARD_GAP_Y = spaceIn(app, ".badge-card", "gap", 0);
/** T6/T7: `.pip { width }` exists TWICE after F5.3 (base + the S touch
 *  floor), so `spaceIn` would throw "expected exactly 1, found 2"; and both
 *  are LITERAL px, which `spaceIn` rejects on principle. Index the blocks and
 *  parse with px(). */
const PIP_BLOCKS = blocksFor(app, ".pip");
const PIP_W = px(PIP_BLOCKS[0] as string, /width:\s*(\d+)px/);
const PIP_W_S = px(PIP_BLOCKS[1] as string, /width:\s*(\d+)px/);
const PIP_GAP = spaceIn(app, ".pip-row", "gap", 0);
const PIP_DOT = px(cssBlock(app, ".pip__dot"), /width:\s*(\d+)px/);
/** The Legend indicator's floor. `.pip--legend {` has TWO blocks (F5's
 *  `cursor: default` and F5.3's box), so cssBlock — which returns the FIRST —
 *  would read the wrong one. Take the block that declares the property. */
const LEGEND_PIP_BOX = blocksFor(app, ".pip--legend").find((block) =>
  block.includes("min-width"),
) as string;
const LEGEND_PIP_MIN = px(LEGEND_PIP_BOX, /min-width:\s*(\d+)px/);
/** The largest tier medallion (tier A). Levels are embossed metal, tiers are
 *  debossed wells; rank varies by SIZE, so the biggest is the binding one. */
const TIER_MEDALLION_MAX = px(
  cssBlock(app, '.badge-card[data-tier="A"] .chip--tier'),
  /width:\s*(\d+)px/,
);
/** The 3px synergy left border — I12. `.badge-card--fuse` is the carrier, and
 *  the cards that lose those 2px are exactly the ones carrying the extra
 *  chip, so this is parsed and never assumed. */
const SYNERGY_BORDER = px(cssBlock(app, ".badge-card--fuse"), /border-left:\s*(\d+)px/);

/* --------------------------------- measured on paper (design-spec §15) ---- */

/** "Versatile Visionary" at --text-base/600 — the widest of the 53 names. */
const BADGE_NAME_MAX = 160;
/** "Powerhouse" — the longest UNBREAKABLE word. A name cannot compress below
 *  its longest word, so this is the true floor, not the max-content. */
const BADGE_NAME_MIN = 92;
/** "+7⚠" — tierCosts top out at A:[3,5,6,7], so whatIf is bounded to ±7 and
 *  every cost string on a purchasable pip is single-digit. Post-F5.3: the
 *  space before the glyph is deleted, 34 -> 28. */
const PIP_COST_MAX = 28;
/** "boost" on the Legend indicator. */
const LEGEND_COST_MAX = 36;
/** '6'3"–7'4"' — the height range, all that is left of the meta line's own
 *  text after the category prefix went .sr-only. Was 122 with it. */
const META_MAX = 47;
/** "⚡ Fuse · SS7 +2" in a bordered pill — the synergy role chip. */
const SYNERGY_CHIP_MAX = 130;
/** F4's "NEW" chip: ~22px of --text-xs plus 2 x --space-2 padding and a 1px
 *  border each side. NEW PIN — F4 landed after §15 was written and this is
 *  the number that decides where the chip lives. */
const NEW_CHIP_MAX = 40;
/** "Would go over Badge Slots" — the BINDING chip, and the reason compaction
 *  was never on the table. */
const OVER_SLOTS_CHIP_MAX = 173;

/**
 * I12 — the binding content box. 240px floor, minus a 1px right border AND a
 * 3px synergy LEFT border, minus two card paddings. The 3px is not a detail:
 * it is exactly the cards that carry the extra chip that pay it.
 */
const CARD_CONTENT_MIN = CARD_FLOOR - (1 + SYNERGY_BORDER) - 2 * CARD_PAD;

describe("I12 + I13 — the badge card's own geometry (F5.3)", () => {
  it("1 — CARD_CONTENT_MIN counts the 3px synergy border, so it is 204 and not 206", () => {
    expect(SYNERGY_BORDER).toBe(3);
    expect(CARD_CONTENT_MIN).toBe(204);
    // The canary: computing it with 1px borders on both sides — the natural
    // mistake, and the one §15 shipped — gives 206 and quietly certifies a
    // 2px overdraft on exactly the cards carrying the extra chip.
    const naive = CARD_FLOOR - 2 - 2 * CARD_PAD;
    expect(naive).toBe(206);
    expect(CARD_CONTENT_MIN).toBeLessThan(naive);
  });

  it("2 — I11 title: the row is NAME + TIER MEDALLION and it fits on one line", () => {
    expect(BADGE_NAME_MAX + SPACE_2 + TIER_MEDALLION_MAX).toBeLessThanOrEqual(CARD_CONTENT_MIN);
    // The canary, and the reason the chips had to leave: with the synergy
    // chip still on the line the name gets 34px, well under the 92px its
    // longest unbreakable word needs. And the BINDING chip is the 173px
    // over-Badge-Slots warning, which leaves the name −1px at zero
    // synergy-chip width — compaction could never have paid for this.
    const withSynergyChip =
      CARD_CONTENT_MIN - SYNERGY_CHIP_MAX - SPACE_2 - SPACE_2 - TIER_MEDALLION_MAX;
    expect(withSynergyChip).toBeLessThan(BADGE_NAME_MIN);
    const withWarningChip =
      CARD_CONTENT_MIN - OVER_SLOTS_CHIP_MAX - SPACE_2 - TIER_MEDALLION_MAX;
    expect(withWarningChip).toBeLessThan(0);
  });

  it("2b — F4's NEW chip CANNOT go back on the title line", () => {
    // 19 of the 53 badges are isNew, including "Arc Cadence" (§15's worked
    // example) and "Post Spin Catalyst" (the widest of them). This assertion
    // exists so a future pass cannot quietly put the chip back.
    expect(
      BADGE_NAME_MAX + SPACE_2 + NEW_CHIP_MAX + SPACE_2 + TIER_MEDALLION_MAX,
    ).toBeGreaterThan(CARD_CONTENT_MIN);
    // stripComments first: this slice sits between two long rationale
    // comments that legitimately NAME the chips they evict, and an assertion
    // that reads its own prose is checking nothing.
    const badgeCard = stripComments(srcSources["/src/ui/grid/BadgeCard.tsx"] as string);
    const titleRow = badgeCard.slice(
      badgeCard.indexOf('className="badge-card__title-row"'),
      badgeCard.indexOf('className="badge-card__meta"'),
    );
    expect(titleRow).not.toContain("isNew");
    expect(titleRow).not.toContain("Would go over Badge Slots");
    expect(titleRow).not.toContain("LEGEND");
  });

  it("3 — I11 meta, the common case: height range + synergy chip on one line", () => {
    expect(META_MAX + SPACE_2 + SYNERGY_CHIP_MAX).toBeLessThanOrEqual(CARD_CONTENT_MIN);
    // The canary: with the category name still rendered (122px of max-content
    // across all 53 cards) the same row is 260 against 204 and wraps. Dropping
    // it to an .sr-only prefix is what pays for the chips with no new band.
    const withVisibleCategory = 122 + SPACE_2 + SYNERGY_CHIP_MAX;
    expect(withVisibleCategory).toBeGreaterThan(CARD_CONTENT_MIN);
  });

  it("3b — I11 meta, worst declared: it wraps BY DESIGN, and the wrap is declared", () => {
    expect(
      META_MAX + SPACE_2 + NEW_CHIP_MAX + SPACE_2 + SYNERGY_CHIP_MAX,
    ).toBeGreaterThan(CARD_CONTENT_MIN);
    // Declared by intent, never exempted by omission: the second line is only
    // legitimate because the row is a wrapping flex rail and A1 absorbs it.
    // Two `.badge-card__meta {` blocks after F5.3 (F5's type + this slice's
    // box), so cssBlock — which returns the FIRST — reads the wrong one.
    const meta = blocksFor(app, ".badge-card__meta").find((block) =>
      block.includes("display: flex"),
    ) as string;
    expect(meta).toContain("flex-wrap: wrap");
    expect(meta).toContain("align-items: center");
  });

  it("4 — the FOUR purchase pips never wrap among themselves", () => {
    // PURCHASABLE_LEVELS has four entries; the fifth mark is the
    // non-interactive Legend indicator. That difference is 44px of a 204px
    // box, and it is why the wrap grant is taken ONLY at that seam.
    expect(4 * PIP_W + 3 * PIP_GAP).toBeLessThanOrEqual(CARD_CONTENT_MIN);
    expect(CARD_CONTENT_MIN - (4 * PIP_W + 3 * PIP_GAP)).toBe(48);
  });

  it("5 — THE USER'S COMPLAINT, as an inequality: the gaps read NARROWER than the dots", () => {
    // whitespace between adjacent dots = (pipW − dotW) + pipGap
    expect(PIP_W - PIP_DOT + PIP_GAP).toBeLessThan(PIP_DOT); // 18 < 22
    // THE CANARY, and it is the one that was actually seen red against the
    // unmodified tree before a byte of src/ changed: `.pip { flex: 1 }` made
    // five pips share the 264px content box of a 298px card at 1280, giving
    // 49.6px each and 31.6px of whitespace between 22px dots — the gaps read
    // LARGER than the pips, which is exactly what was reported.
    const shippedBroken = (264 - 4 * SPACE_1) / 5;
    expect(shippedBroken - PIP_DOT + SPACE_1).toBeGreaterThan(PIP_DOT); // 31.6 > 22
  });

  it("6 — every cost string fits the box that carries it", () => {
    expect(PIP_COST_MAX).toBeLessThanOrEqual(PIP_W); // 28 <= 36
    // Exact, and safe BECAUSE it is exact only as a floor: .pip--legend is
    // `width: auto` with min-width as the floor, so the box grows with the
    // string and can never overflow it.
    expect(LEGEND_COST_MAX + 2 * SPACE_1).toBeLessThanOrEqual(LEGEND_PIP_MIN); // 44 <= 44
    expect(LEGEND_PIP_BOX).toContain("width: auto");
  });

  it("7 — nothing stretches the pips, and the ways to re-break it are named", () => {
    // stripComments: S2's rationale block legitimately QUOTES `flex: 1` as
    // the cause it removed. Grepping the prose would make this permanently
    // red for the most honest possible reason.
    expect(stripComments(PIP_BLOCKS[0] as string)).not.toContain("flex: 1");
    expect(PIP_BLOCKS[0]).toContain("flex: 0 0 auto");
    // blocksFor(".pip-row") also matches `.badge-card--blocked .pip-row {` —
    // check EVERY block that declares the selector, not the first one.
    for (const block of blocksFor(app, ".pip-row").map(stripComments)) {
      expect(block).not.toContain("space-between");
      expect(block).not.toContain("space-around");
      expect(block).not.toContain("justify-content: center");
      expect(block).not.toContain("1fr");
    }
    // The banned literals are still DETECTABLE — an assertion that cannot
    // see what it forbids is not an assertion.
    expect("justify-content: space-between").toContain("space-between");
  });

  it("8 — the S touch floor is intact and the base pip clears SC 2.5.8", () => {
    expect(PIP_W_S).toBeGreaterThanOrEqual(44); // I6, FROZEN
    expect(app).toMatch(/@media \(max-width: 767px\) \{\s*\.pip \{\s*width: 44px;/);
    expect(PIP_W).toBeGreaterThanOrEqual(24); // WCAG 2.2 SC 2.5.8 AA, +12
    // At S the 44px target flips the inequality back (26 vs 22) and that is
    // CORRECT: a target the thumb can hit outranks the optical ordering.
    expect(PIP_W_S - PIP_DOT + PIP_GAP).toBeGreaterThan(PIP_DOT);
  });

  it("9 — I13: equal card heights come from the <li>, and nothing clamps", () => {
    expect(cssBlock(app, ".grid-section__cards > li")).toContain("display: grid");
    // The four forbidden repairs, by name.
    for (const block of blocksFor(app, ".grid-section__cards")) {
      expect(block).not.toContain("grid-auto-rows");
    }
    // Strip the stylesheet's comments BEFORE splitting into blocks: A1's
    // rationale names the rejected `.badge-card { height: 100% }` verbatim,
    // and blocksFor would happily return the inside of that sentence.
    for (const card of blocksFor(stripComments(app), ".badge-card")) {
      for (const banned of ["height:", "max-height", "overflow", "justify-content"]) {
        expect(card).not.toContain(banned);
      }
    }
    // I14 stated as the rule it is: the eligibility reason is a disclosure
    // with NO control and it is never truncated. (F4's description clamp is a
    // different object — a disclosure WITH a control, whose full string is
    // always in the DOM.)
    const elig = cssBlock(app, ".badge-card__eligibility");
    expect(elig).not.toContain("line-clamp");
    expect(elig).not.toContain("overflow");
    // CARD_GAP_Y is parsed, not assumed — it is geometry the row spends.
    expect(CARD_GAP_Y).toBe(SPACE_2);
  });

  it("10 — I12 reclamation: the ' stale' suffix and the pip-cost space are gone", () => {
    expect(app).not.toContain('content: " stale"');
    const badgeCard = srcSources["/src/ui/grid/BadgeCard.tsx"] as string;
    expect(badgeCard).not.toContain("${deltaText} ⚠");
    expect(badgeCard).toContain("${deltaText}⚠");
    // §10.4 named FOUR carriers for a stale purchase; deleting the textual
    // suffix leaves three, one of them textual (the eligibility line in
    // WORDS), so WCAG 1.4.1 is satisfied with margin. `.pip__cost` is
    // aria-hidden and the pip's accessible name already says it, so AT loses
    // nothing at all.
    expect(badgeCard).toContain("no longer meets requirements");
    expect(app).toContain(".pip--stale .pip__dot");
  });
});

describe("F5.3/B — collapsible categories, checked structurally", () => {
  // Every grep below is against STRIPPED source. These three files carry long
  // rationale comments that name, by design, the exact anti-patterns they
  // forbid — `aria-expanded`, `section-`, the sticky-killing properties. An
  // assertion that reads that prose is red for the most honest possible
  // reason and teaches the next author to delete the explanation.
  const gridSection = stripComments(srcSources["/src/ui/grid/BadgeGridSection.tsx"] as string);
  const ledger = stripComments(srcSources["/src/ui/grid/CategoryLedger.tsx"] as string);
  const anchors = stripComments(srcSources["/src/ui/grid/anchors.ts"] as string);

  it("11 — the --cat chain: the id never left .grid-section, and <details> has none", () => {
    // The line is UNCHANGED CONTEXT in the diff, verbatim, so a reviewer can
    // see at a glance that the id never moved.
    expect(gridSection).toMatch(
      /<section\s+className="grid-section"\s+id=\{categoryAnchorId\(category\)\}/,
    );
    // The <details> carries no id of its own. A fixture with the id moved
    // there must FAIL this regex, or the check is decorative.
    const detailsBlock = gridSection.slice(gridSection.indexOf("<details"));
    expect(detailsBlock.slice(0, detailsBlock.indexOf(">"))).not.toContain("id=");
    const badFixture =
      '<details className="grid-section__disclosure" id={categoryAnchorId(category)}>';
    expect(badFixture.slice(0, badFixture.indexOf(">"))).toContain("id=");
    // All six --cat blocks still present.
    for (const category of ["finishing", "shooting", "playmaking", "rebounding", "defense"]) {
      expect(app).toContain(`#cat-${category}`);
    }
  });

  it("12 — the sticky digest survives, and nothing on the wrapper can kill it", () => {
    // A17: cssBlock returns the FIRST `.category-ledger {` block, which stays
    // the sticky one. Moving the sticky declaration into the appended F5.3
    // block is how this pin would silently stop checking anything.
    const sticky = cssBlock(app, ".category-ledger");
    expect(sticky).toContain("position: sticky");
    expect(sticky).toContain("top: 44px");
    // The wrapper declares nothing that creates a containing block or a clip.
    // Every one of these would make the <details> the sticky element's
    // containing block and the header would die with this file still green —
    // which is why §4.3's browser scroll is a required companion, not a nicety.
    const disclosure = stripComments(cssBlock(app, ".grid-section__disclosure"));
    for (const banned of ["overflow", "contain", "transform", "filter", "height"]) {
      expect(disclosure).not.toContain(banned);
    }
    // aria-expanded is NATIVE. Hand-authoring it is redundant and can conflict.
    expect(gridSection).not.toContain("aria-expanded");
    expect(ledger).not.toContain("aria-expanded");
    // And the digest IS the <summary> — not a <div> nested inside one, which
    // is the arrangement that kills sticky (T3) while every pin stays green.
    expect(ledger).toMatch(/<summary className=\{`category-ledger/);
    // §15.8 ③: <summary>'s content model admits phrasing + heading content,
    // so the digest's row is a <span>, never a <div>.
    const digest = ledger.slice(ledger.indexOf("export function CategoryLedgerDigest"));
    const digestBody = digest.slice(0, digest.indexOf("export function CategoryLedgerLede"));
    expect(digestBody).toContain('<span className="category-ledger__row">');
    expect(digestBody).not.toContain('<div className="category-ledger__row">');
  });

  it("13 — the collapse keys are namespaced away from the section-* keys", () => {
    expect(anchors).toContain("export function categorySectionStorageKey");
    expect(anchors).toMatch(/return `category-\$\{category\.toLowerCase\(\)\}`/);
    // The prefix is `category-`, NEVER `section-`, precisely so a future reset
    // of one class cannot reach the other.
    expect(anchors).not.toContain("`section-");
  });

  it("14 — collapse is DISPLAY-ONLY: it cannot reach a computation", () => {
    // A TYPE import is erased at compile time and reaches no computation; a
    // VALUE import from src/engine/ would mean collapse had grown a rule.
    for (const line of gridSection.split("\n")) {
      if (!line.includes("../../engine/")) continue;
      expect(line.trimStart().startsWith("import type")).toBe(true);
    }
    expect(gridSection).toContain('import type { Category } from "../../engine/vocabulary"');
    // The App's ledger memo must not depend on any collapse/ui-state value.
    const appTsx = srcSources["/src/App.tsx"] as string;
    const memo = appTsx.slice(appTsx.indexOf("const readouts"), appTsx.indexOf("const readouts") + 1200);
    for (const banned of ["categorySectionStorageKey", "UiSectionOpen", "collapse"]) {
      expect(memo).not.toContain(banned);
    }
  });

  it("19b — the string builders are STILL REACHABLE (SummaryPanel is denied)", () => {
    // P0-1: one builder, four consumers. SummaryPanel.tsx imports
    // badgeSlotsCapacityUnset and is outside this slice's edit surface, so a
    // dropped export is a reachable-but-denied break.
    for (const builder of ["overByBadgePoints", "overByBadgeSlots", "projectionDiffers"]) {
      expect(ledger).toContain(`export function ${builder}`);
    }
    // `badgeSlotsCapacityUnset` was HOISTED to src/engine/ledger.ts by F8-E1.
    // The check FOLLOWS THE SYMBOL rather than being deleted.
    const engineLedger = srcSources["/src/engine/ledger.ts"] as string;
    expect(engineLedger).toContain("export function badgeSlotsCapacityUnset");
    expect(ledger).not.toContain("export function badgeSlotsCapacityUnset");
    expect(ledger).toContain('from "../../engine/ledger"');
    const summary = srcSources["/src/ui/summary/SummaryPanel.tsx"] as string;
    expect(summary).toContain("badgeSlotsCapacityUnset");
  });
});

describe("F5.3/C — `Reset build`: the scope, pinned where it is written", () => {
  // Stripped, for the same reason as the collapse block above: handleReset's
  // rationale comment NAMES every writer it must not call, which is the point
  // of the comment and would be the death of the assertion.
  const appTsx = stripComments(srcSources["/src/App.tsx"] as string);
  const buildPanel = stripComments(srcSources["/src/ui/build/BuildPanel.tsx"] as string);
  const dialog = srcSources["/src/ui/build/ResetBuildDialog.tsx"] as string;

  /** The reset handler's body — `handleReset` only. `handleSaveCopyAndReset`
   *  is a DIFFERENT path and is allowed exactly one thing this one is not. */
  const handleReset = appTsx.slice(
    appTsx.indexOf("const handleReset = useCallback("),
    appTsx.indexOf("const handleSaveCopyAndReset"),
  );
  const saveCopy = appTsx.slice(
    appTsx.indexOf("const handleSaveCopyAndReset"),
    appTsx.indexOf("const duplicateBuild"),
  );

  const NAMED_BUILD_WRITERS = [
    "saveNamedBuild",
    "deleteNamedBuild",
    "renameNamedBuild",
    "duplicateNamedBuild",
    "clearAllPersistedData",
    "clearAutosave",
  ];

  it("15 — the reset path cannot reach the named-builds store, the quarantine, or the autosave", () => {
    expect(handleReset).not.toBe("");
    for (const writer of [...NAMED_BUILD_WRITERS, "saveAsNew"]) {
      expect(handleReset).not.toContain(writer);
    }
    // `saveAsNew` is reachable from EXACTLY ONE place: the durable
    // `Save a copy and reset` action, where it MINTS A NEW ENTRY and
    // overwrites nothing.
    expect(saveCopy).toContain("saveAsNew");
    for (const writer of NAMED_BUILD_WRITERS) {
      expect(saveCopy).not.toContain(writer);
    }
    // POSITIVE CANARY: the banned identifiers are still detectable, so this
    // assertion cannot pass by looking at the wrong string.
    expect("clearAllPersistedData();").toContain("clearAllPersistedData");
  });

  it("16 — the reset path touches NO UI preference: collapse state and the latch both survive", () => {
    expect(handleReset).not.toContain("writeUiSectionOpen");
    expect(saveCopy).not.toContain("writeUiSectionOpen");
    // A2: re-arming the Build panel's auto-collapse latch WOULD need exactly
    // that call, which is why the latch is out of this slice's scope entirely
    // rather than "handled". It is also persisted in the same ui-state blob,
    // so the two rulings are one ruling.
    expect(buildPanel).toContain("writeUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY, true)");
    expect(handleReset).not.toContain("fireLatch");
    expect(handleReset).not.toContain("autoCollapsed");
  });

  it("17 — the handler clears the PLAYER and writes neither unlock nor +2 designation", () => {
    expect(handleReset).toContain("loadout: []");
    expect(handleReset).toContain("fuseBadgeId: null");
    expect(handleReset).toContain("reactionBadgeId: null");
    expect(handleReset).toContain("zeroAttributes()");
    expect(handleReset).toContain("DEFAULT_HEIGHT_INCHES");
    // T15: createDefaultSynergySlots() looks like the way to clear the
    // assignments and is not — it also resets `unlocked` and the +2
    // designation, eight toggles the user would re-enter for nothing.
    expect(handleReset).not.toContain("createDefaultSynergySlots");
    expect(handleReset).not.toContain("unlocked");
    expect(handleReset).not.toContain("plusTwoSlotIds");
    // The budgets are written ONLY on the checkbox branch.
    expect(handleReset).toContain("alsoBudgets ? { budgets: zeroBudgets() } : {}");
    // A fixture that writes `unlocked` must FAIL the check above.
    expect("synergy: createDefaultSynergySlots(null)").toContain("createDefaultSynergySlots");
    // T16: never through handlePositionChange — it would announce a clamp
    // that did not happen (Position → Any restores 69–88 and 78 sits inside).
    expect(handleReset).not.toContain("handlePositionChange");
    expect(handleReset).toContain("setClampNotice(null)");
    // A reset is not a load ROUTE, so the route-scoped disclosures stay put.
    for (const routeOnly of [
      "setDroppedEntries",
      "setClearedSynergyRefs",
      "setDisclosureEpoch",
      "setRatifiedMagnitudeNormalized",
    ]) {
      expect(handleReset).not.toContain(routeOnly);
    }
  });

  it("18 — the button opens the confirm and never resets directly", () => {
    expect(buildPanel).toContain("onClick={onResetRequest}");
    expect(buildPanel).not.toContain("handleReset");
    expect(buildPanel).not.toContain("zeroAttributes");
    // …and `canReset` is the NEW predicate over the default reset's own
    // scope, not F2.2's switcher guard (A4).
    expect(appTsx).toContain("canReset={playerHasContent(working)}");
    expect(appTsx).toContain("function playerHasContent");
    // `workingHasContent` is NOT modified — it is a shipped data-loss guard,
    // and one predicate answering two questions breaks silently the moment
    // either question's scope moves.
    expect(appTsx).toContain("function workingHasContent");
    expect(appTsx).not.toContain("canReset={workingHasContent");
  });

  it("19 — the confirm names real counts and carries the guarantee verbatim", () => {
    expect(dialog).toContain("saved builds are not touched");
    for (const count of [
      "counts.attributesTotal",
      "counts.attributesSet",
      "counts.purchased",
      "counts.synergyAssigned",
      "counts.budgetFieldsSet",
    ]) {
      expect(dialog).toContain(count);
    }
    // T14: the id convention this slice introduces. There are three <dialog>s
    // now and `querySelector("dialog")` returns the wrong one.
    expect(dialog).toContain('id="reset-build-dialog"');
    // No undo, by ruling. The file EXPLAINS the ruling at length, so the
    // check is against the rendered surface, not the prose: no control and no
    // copy offers one.
    expect(stripComments(dialog).toLowerCase()).not.toContain("undo");
  });

  it("20 — the control clears the I6 touch floor at S", () => {
    // SCOPED here on purpose: the app-wide `.btn--sm` 28 / `.btn--md` 36
    // defect is F9's, because raising it reflows six surfaces this slice does
    // not own. C must simply not arrive below the floor itself.
    expect(app).toMatch(
      /@media \(max-width: 767px\) \{\s*\.build-panel__reset \{\s*min-height: 44px;/,
    );
  });

  it("21 — it is a danger-ghost, never a gold primary", () => {
    expect(buildPanel).toContain("btn--danger-ghost");
    expect(buildPanel).toContain("build-panel__reset");
    const buttonTag = buildPanel.slice(
      buildPanel.indexOf('className="btn btn--danger-ghost'),
    );
    expect(buttonTag.slice(0, buttonTag.indexOf(">"))).not.toContain("btn--primary");
    // Text only — `↺` already means *Reaction* on the badge cards, and
    // re-using a glyph that means something else is H1 broken by a symbol.
    expect(buildPanel).not.toContain("↺ Reset");
  });

  it("22 — no token, no --cat, no metal, and tokens.css gained nothing", () => {
    const surfaces = [
      cssBlock(app, ".build-panel__reset"),
      cssBlock(app, ".reset-dialog"),
      cssBlock(app, ".reset-dialog__list"),
      cssBlock(app, ".reset-dialog__opt-in"),
    ];
    for (const block of surfaces) {
      expect(block).not.toContain("var(--cat");
      expect(block).not.toContain("--metal");
      expect(block).not.toContain("--bevel");
      // Consume, never define: no literal colour anywhere in the new chrome.
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    }
    // §12.5/§12.12's placement law permits FOUR --cat surfaces and this is
    // none of them; the four are pinned by tests/category-colors.test.ts.
    // tokens.css defines no F5.3 token — the slice consumes the existing
    // scale end to end. (The byte-identity of the file itself is checked by
    // hand with `git diff --stat src/styles/tokens.css`, which cannot be
    // expressed here without filesystem access.)
    expect(tokens).not.toContain("F5.3");
    expect(tokens).not.toContain("--reset");
    // The reset dialog does not duplicate .import-dialog's recipe — it JOINS
    // its selector lists, so the two can never drift apart.
    expect(app).toContain(".import-dialog,\n.reset-dialog {");
    expect(app).toContain(".import-dialog__actions,\n.reset-dialog__actions {");
  });
});
