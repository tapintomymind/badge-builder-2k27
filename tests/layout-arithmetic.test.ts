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
 *
 * F5.4 EXTENDS THE CHAIN TO THE VERTICAL AXIS (I15 · I16, design-spec §16).
 * Every identity above is horizontal, and a green suite therefore said
 * nothing at all about a pane that showed ZERO of twenty attribute sliders
 * at a 700px viewport. The vertical counterpart of I8's 34px horizontal
 * `<Section>` chrome is SECTION_CHROME_Y = 70 — the omission F5.2 found
 * systemically — and slidersVisible() is the identity it feeds: how much of
 * a fixed-height region is visible AT REST, not merely that it scrolls.
 */

import { describe, expect, it } from "vitest";
import { shippedDataset } from "../src/engine/dataset";
import { ATTRS, ATTR_GROUPS, ATTR_GROUP_OF, CATEGORIES } from "../src/engine/vocabulary";
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

/* ------------------------------------ parsed: the VERTICAL axis (F5.4) ----- */

const TEXT_XS = px(tokens, /--text-xs:\s*(\d+)px/); // 12 — slider + legend label
const TEXT_BASE = px(tokens, /--text-base:\s*(\d+)px/); // 16 — <summary> heading
const SPACE_3_5 = px(tokens, /--space-3-5:\s*(\d+)px/); // 14 — the user's py-3.5
/** PARSED, not assumed: every line box below is derived from it. */
const BODY_LH = Number(
  (/body \{[^}]*line-height:\s*([\d.]+)/.exec(app) ??
    (() => {
      throw new Error("layout arithmetic: body line-height not found");
    })())[1] as string,
);
const RANGE_H = px(app, /input\[type="range"\] \{[^}]*height:\s*(\d+)px/); // 24

/** A space token read off ONE declaration inside an already-sliced block.
 *  spaceIn()'s `(?:^|;)` anchor cannot see past a block comment, and the
 *  pane documents each of its declarations in place — so this reads the
 *  declaration directly rather than making the stylesheet less explanatory. */
function tokenIn(block: string, property: string): number {
  const match = new RegExp(`${property}:\\s*var\\(--([a-z0-9-]+)\\)`).exec(block);
  if (match === null) throw new Error(`layout arithmetic: no ${property} in block`);
  return spaceToken(match[1] as string);
}

/** The pane's inline padding — the focus ring's 4px reach, and GEOMETRY: it
 *  comes out of the cell every slider is laid out in. */
const PANE_PAD_X = tokenIn(cssBlock(app, ".attr-pane"), "padding-inline");

const lineBox = (fontPx: number): number => Math.round(fontPx * BODY_LH);

/** I15 — the VERTICAL counterpart of I8's horizontal 34, and the omission
 *  F5.2 found systemically. A <details class="section">'s <summary> is
 *  2 × --space-3-5 of padding around one --text-base line, over a 1px top
 *  border, and .section__body adds --space-4 of padding below it. */
const SECTION_CHROME_Y = 2 + (2 * SPACE_3_5 + lineBox(TEXT_BASE)) + SPACE_4; // 70
/** The half of it that sits ABOVE the first child: one border + the summary. */
const SECTION_LEAD_Y = 1 + (2 * SPACE_3_5 + lineBox(TEXT_BASE)); // 53

/* --------------------------- measured on paper (design-spec §0.1, §13.0.1) -- */

/* DELETED by F5.4: BUDGET_GRID_MIN = 215, and the assertion that spent it.
 * BudgetGrid left the rail for the setup panel (§16.5), so `RAIL −
 * SECTION_CHROME >= 215` graded a surface that is no longer there — it would
 * have passed forever while checking nothing. Tombstoned rather than
 * re-pointed, per §13.7's LEDGER_ROW_MIN precedent: the setup panel's box is
 * 902px at 1280 and 298 at 390, so the demand is not binding anywhere. */

/** Widest category label at --text-sm: "Rebounding". RE-PINNED 76 → 78 by
 *  F5.4 (§16 ③): the measured value is 77.41 and the take-the-larger rule
 *  §13.0.1 applied to SYNERGY_HEADER_MAX applies here too. It changes no
 *  outcome — the ledger now has an 878px grid box — but a pinned measurement
 *  known to be 1.41px LOW is a defect waiting for its next consumer.
 *
 *  §13.0.1's "implied 8.44 px/char monospace advance (76 ÷ 9 chars)" bridge
 *  was unsound and is withdrawn: "Rebounding" is TEN characters and renders
 *  in the proportional --text-sm UI face, not --font-num. The bridge is
 *  restated from the empty-state metrics string instead — "0/0 · 0/—" is
 *  nine --font-num characters at 75.86px = 8.429 px/char, corroborated by
 *  "112/116 · 13/15" at 126.44 / 15 = 8.429. */
const LEDGER_LABEL_MAX = 78;
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
/** .synergy-row's own box: 1px fieldset border + --space-4 padding, both
 *  sides. Numerically equal to SECTION_CHROME and a DIFFERENT thing — the
 *  conversion between the row's border box and the box a size query sees. */
const ROW_CHROME = 2 + 2 * ROW_PAD;
/** Plausible classic-scrollbar widths, plus macOS overlay. Derive at ALL. */
const SCROLLBARS = [0, 15, 17];

/* ------------------- measured on paper: the VERTICAL axis (F5.4, §16) ------ */

/** .number-field input at --text-sm: content + 2 × --space-1 + 2px border.
 *  The label is `hideLabel` → .sr-only, so nothing else is in the box.
 *
 *  RE-MEASURED IN HEADLESS CHROME AT THE CUT (Chrome 151.0.7922.174,
 *  docs/proof/f54-verification.txt), because the attribute stack multiplies it
 *  by 20 and the visible-slider counts move with it:
 *
 *    deviceScaleFactor 1 → offsetHeight 26, rect 26.000
 *    deviceScaleFactor 2 → offsetHeight 27, rect 26.500
 *
 *  PINNED AT THE LARGER, 27, per §13.0.1's take-the-larger rule. A larger
 *  SLIDER_H yields a LOWER derived slider count, so the I15 floor asserted
 *  below is the PESSIMISTIC bound — and the browser meets it at both device
 *  scale factors (6 / 7 / 8 measured at 700 / 800 / 900). Deriving from the
 *  dpr-1 value instead would make the floor optimistic on a Retina display,
 *  which is the wrong direction for a floor. */
const NUMERIC_H = 27;
/** The Ledger overview <Section> as it shipped in the rail: 6 × a --text-sm
 *  line box + 5 row-gaps + the well's 2 × --space-2 + SECTION_CHROME_Y.
 *  Feeds LEAD_TODAY only — the pre-slice canary — so a ±60px error here
 *  cannot change an outcome. */
const LEDGER_H = 252;
/** The Physique <Section> in the rail: Position control + wrapped Hint +
 *  HeightField + chrome. Same canary-only exposure as LEDGER_H. */
const PHYSIQUE_H = 324;

/* DELETED: LEDGER_ROW_MIN = 137. It was a MIN-content figure — the width at
 * which the TEXT breaks, not the width at which the ROW stops wrapping — and
 * it passed at +5px while every row wrapped (I11). Deleted rather than kept
 * alongside: two constants for one row invites checking the easy one. */

/** ONE gap and ONE rail — that is the whole of the §13 re-cut, expressed as
 *  arithmetic. */
function centreColumn(viewport: number, scrollbar: number): number {
  return viewport - scrollbar - 2 * SPACE_4 - SPACE_3 - RAIL;
}
/** What a COLUMN must be for a ledger row to sit on ONE line: the row box it
 *  needs, plus the well it sits in, plus the section around that.
 *
 *  F5.4 re-points this from the rail to the right column (§16.5). The ledger
 *  overview moved out of the pane — it carries no unique information (the six
 *  sticky per-category digests carry every number it shows) and it was 252 of
 *  the 657px of non-attribute content that left the pane showing zero
 *  sliders. It is MOVED, not deleted: §4.5 requires the landmark. */
function ledgerBoxNeeded(gap: number, wellPadX: number): number {
  return LEDGER_LABEL_MAX + gap + LEDGER_METRICS_MAX + 2 * wellPadX + SECTION_CHROME;
}
/** The ledger overview's own GRID box in the right column: the centre
 *  column, less the <Section> chrome, less the inset well's sides. */
function ledgerGridBox(viewport: number, scrollbar: number): number {
  return centreColumn(viewport, scrollbar) - SECTION_CHROME - 2 * WELL_PAD_X;
}
function cardsPerRow(track: number): number {
  return Math.max(1, Math.floor((track + SPACE_3) / (CARD_FLOOR + SPACE_3)));
}
/** The design-spec §11.4 arrangement rule, as a function. */
function sliderTrack(cell: number): number {
  return cell <= STACK_MAX ? cell : cell - SPACE_2 - NUMERIC_W;
}

/* ------------------------------- derived: the attribute stack (F5.4) ------ */

/** One AttributeSlider: a --text-xs label + --space-1, the 24px range input,
 *  then --space-2 of row-gap and the wrapped numeric field. It wraps — and
 *  so costs 81 rather than 49 — because the 258px cell is below I9's derived
 *  arrangement threshold of 287. See §5 of the brief: the 340px rail lever
 *  that would cross it is PRICED (12 visible sliders, −13.3px per card) and
 *  deliberately UNSPENT. An implementer must not take it. */
const SLIDER_H = lineBox(TEXT_XS) + SPACE_1 + RANGE_H + SPACE_2 + NUMERIC_H; // 81
/** <legend> at --text-xs + its --space-2 margin-bottom. */
const GROUP_LEGEND_H = lineBox(TEXT_XS) + SPACE_2; // 26
/** DERIVED FROM THE VOCABULARY, never pinned: a 21st attribute (the live
 *  Free Throw question) has to move the counts below by hand. */
const GROUP_SIZES = ATTR_GROUPS.map(
  (group) => ATTRS.filter((attr) => ATTR_GROUP_OF[attr] === group).length,
);
/** One .attr-group: legend, n sliders with --space-3 grid row-gaps between
 *  them, and the fieldset's own --space-3 margin-bottom. */
const groupH = (n: number): number =>
  GROUP_LEGEND_H + n * SLIDER_H + (n - 1) * SPACE_3 + SPACE_3;
const ATTR_STACK_H = GROUP_SIZES.reduce((sum, n) => sum + groupH(n), 0); // 2016
/** The pane's own height: viewport less `top` and the matching bottom slack. */
const paneH = (viewport: number): number => viewport - 2 * SPACE_3;

/** Non-attribute content ahead of the STACK, as the pane shipped before this
 *  slice. The group legend is INSIDE the stack and slidersVisible adds it —
 *  do NOT fold it in here. 657, not 683: 683 is the pane-top → first-slider-
 *  TOP distance, and passing it as `lead` double-counts GROUP_LEGEND_H. It
 *  happens not to matter at 700 (both give 0) and it is wrong at 800 and 900,
 *  where the true counts are 1 and 2. Pinned separately in assertion 1.
 *
 *  MEASURED AGAINST THE PRE-SLICE TREE AT THE CUT (dev @2e422c2 served
 *  alongside, docs/proof/f54-verification.txt): the real pane-top →
 *  first-slider-top distance was 704.75px, not 683, and the real counts were
 *  0 / 0 / 1 rather than 0 / 1 / 2 — LEDGER_H and PHYSIQUE_H are paper sums
 *  over wrapped Hint and Banner lines and are ~22px light in aggregate.
 *  The canary is therefore CONSERVATIVE: it understates how bad the shipped
 *  tree was, never overstates it, and its load-bearing claim (zero sliders at
 *  700) is exact. The pins are left as briefed rather than re-cut, because
 *  they feed nothing but this canary. */
const LEAD_TODAY = LEDGER_H + SPACE_4 + PHYSIQUE_H + SPACE_3 + SECTION_LEAD_Y; // 657

/** Sliders whose BOTTOM edge is inside the pane at rest, given `lead` px of
 *  non-attribute content ahead of the stack. Walks GROUP_SIZES and
 *  short-circuits at the first slider that does not fit. */
function slidersVisible(viewportH: number, lead: number): number {
  const limit = paneH(viewportH) - lead;
  let count = 0;
  let offset = 0;
  for (const n of GROUP_SIZES) {
    for (let k = 1; k <= n; k += 1) {
      const bottom = offset + GROUP_LEGEND_H + k * SLIDER_H + (k - 1) * SPACE_3;
      if (bottom > limit) return count;
      count += 1;
    }
    offset += groupH(n);
  }
  return count;
}

/* ---------------------- derived: I16's two boxes, one arrangement (F5.4) --- */

/** What the PICKERS need, on the box a size query actually evaluates — the
 *  row's CONTENT box. The row padding is not part of it because the query
 *  never sees the padding. */
const CONTAINER_THRESHOLD = 2 * SELECT_FLOOR + SPACE_3; // 372
/** The same arrangement, expressed on the row's BORDER box.
 *  §13.5's 404 computed `2 × SELECT_FLOOR + SPACE_3 + 2 × ROW_PAD` — padding
 *  only, no border — and was 2px light. The conversion is ROW_CHROME. */
const pickersRowFloor = CONTAINER_THRESHOLD + ROW_CHROME; // 406
/** The grid track floor: the larger of the two border-box demands. The max()
 *  is kept VISIBLE so the day the header shrinks the pickers become the
 *  binding floor mechanically rather than by someone remembering they might. */
const synergyRowFloor = Math.max(pickersRowFloor, SYNERGY_HEADER_MAX); // 426

/** A synergy row's BORDER box in the right column at (viewport, scrollbar).
 *  `− SECTION_CHROME` is the <Section> chrome §13.0.1 omitted, which is T16's
 *  root cause: without it the derivation reads 609.5 at 1280 and hides a
 *  failure that was real at 1440. */
function synergyRowBox(viewport: number, scrollbar: number): number {
  const body = centreColumn(viewport, scrollbar) - SECTION_CHROME;
  const columns = Math.max(1, Math.floor((body + SPACE_3) / (synergyRowFloor + SPACE_3)));
  return (body - (columns - 1) * SPACE_3) / columns;
}
function synergyColumns(viewport: number, scrollbar: number): number {
  const body = centreColumn(viewport, scrollbar) - SECTION_CHROME;
  return Math.max(1, Math.floor((body + SPACE_3) / (synergyRowFloor + SPACE_3)));
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
  /* DELETED by F5.4: "the rail clears BudgetGrid's min-content". BudgetGrid
   * moved to the setup panel (§16.5), so `RAIL − SECTION_CHROME >= 215`
   * became vacuous — 258 ≥ 215 passes while grading a surface that is not in
   * the rail. Tombstoned rather than re-pointed (§13.7's LEDGER_ROW_MIN
   * precedent): in the setup panel the table gets 902px at 1280 and 298 at
   * 390, so the demand is not binding at any width. */

  it("I11 — the ledger row lays out ON ONE LINE with real numbers, well included", () => {
    // The property the user actually reported. Checked against max-content,
    // and with the well counted, because both of those are how the previous
    // two revisions passed while the rows wrapped.
    //
    // RE-POINTED by F5.4: the ledger overview lives in the right column now,
    // so the box is the centre column rather than the rail. It clears by an
    // order of magnitude — which is precisely why A1 (below) is needed: at
    // this width the SHIPPED `1fr auto` stops being a fit problem and starts
    // being a spreading problem.
    const rowMax = LEDGER_LABEL_MAX + ROW_GAP_X + LEDGER_METRICS_MAX;
    for (const scrollbar of SCROLLBARS) {
      expect(ledgerGridBox(1280, scrollbar), `scrollbar ${scrollbar}px`).toBeGreaterThanOrEqual(
        rowMax,
      );
    }
  });

  it("I8b — the ledger well's sides are GEOMETRY: spent, they must be funded", () => {
    // RE-POINTED to the column that now holds it; the identity is unchanged.
    expect(centreColumn(1280, Math.max(...SCROLLBARS))).toBeGreaterThanOrEqual(
      ledgerBoxNeeded(ROW_GAP_X, WELL_PAD_X),
    );

    // b22f8ab's own L cut fails this by 49px. The canary proves the assertion
    // has teeth against a real shipped tree, not only against the old one.
    // KEPT VERBATIM, and re-checked at LEDGER_LABEL_MAX = 78: 162 < 213.
    const shippedBroken = 204 - SECTION_CHROME - 2 * SPACE_1; // 162
    expect(shippedBroken).toBeLessThan(LEDGER_LABEL_MAX + SPACE_2 + LEDGER_METRICS_MAX); // 213
  });

  it("the rail is chosen ABOVE its floor, and the slack is named", () => {
    // b22f8ab asserted that NO slack remained, which was true and was the
    // problem. Same bookkeeping discipline, opposite sign: the next addition
    // is still checked against a number rather than against a vibe.
    //
    // RE-POINTED by F5.4. The ledger left the pane, so the binding demand is
    // no longer a 3-digit ledger row — it is I9's usable slider track, and
    // the cell is 8px narrower because the pane now carries the focus ring's
    // inline padding. 300 − 8 − 34 = 258 against 224 leaves 34 ≥ 24.
    const cell = RAIL - 2 * PANE_PAD_X - SECTION_CHROME; // 258
    expect(cell - USABLE_TRACK).toBeGreaterThanOrEqual(SPACE_6);
  });

  it("the duplicate right-rail Export/Import pair stays deleted (rev 2 §3.6)", () => {
    // ~198px of min-content in a 142px box. The header pair is the only one.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx.match(/<ExportImportControls/g)?.length ?? 0).toBe(1);
  });

  it("the sticky pane is wrapped in a stretching grid item, so it cannot escape the grid", () => {
    // A sticky GRID ITEM is constrained by the grid container's content box,
    // not by its own row. With the panels as separate rows, a sticky pane
    // placed directly in .layout scrolls past the badge grid and paints over
    // them (measured: doc-y 4660 against a grid ending at 4644). The wrapper
    // stretches to row 1 and gives the sticky box a containing block that
    // ends where the grid does.
    //
    // F5.4 RENAMES ONLY. The finding is F5.2's D1 and it is unchanged; four
    // no-new-element candidates were measured and none moved the clamp by a
    // pixel, so the wrapper stays.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toMatch(/className="attr-pane-column">\s*<div className="attr-pane">/);
    expect(cssBlock(app, ".attr-pane-column")).toContain("align-self: stretch");
  });

  it("the pane still surfaces overflow rather than hiding it", () => {
    // overflow-y:auto computes overflow-x to auto — that scrollbar is how the
    // user found this defect. Masking it would hide the next one.
    //
    // The first-occurrence discipline still applies: this reads the FIRST
    // block, which is the sticky one. A second rule declared above it would
    // silently re-point the guard at a box that never had overflow-y.
    const paneBlock = cssBlock(app, ".attr-pane");
    expect(paneBlock).toContain("overflow-y: auto");
    expect(paneBlock).not.toContain("overflow-x: hidden");
    expect(paneBlock).not.toContain("overflow-x: clip");
  });
});

/* --------------------------------------------------------------- §13.5 -- */

describe("§16.7 — Synergy and Summary live in the RIGHT COLUMN, beside the pane", () => {
  it("the right column carries the gap the grid used to supply", () => {
    // REPLACES "both panels span the full layout width". `.panel-below`'s
    // `grid-column: 1 / -1` is DELETED: it ran the two panels UNDERNEATH the
    // pane, which is what made the pane's sticky containing block grid row 1
    // instead of the whole document. .layout is exactly two grid items now.
    //
    // .layout's own `gap: var(--space-6)` supplied the 24px between main and
    // the two panels while they were grid items. Once they stop being grid
    // items that gap evaporates, so .col-right must re-declare it.
    expect(cssBlock(app, ".col-right")).toContain("gap: var(--space-6)");
    expect(app).not.toContain(".panel-below");

    const appTsx = srcSources["/src/App.tsx"] as string;
    const colRight = appTsx.indexOf('className="col-right"');
    expect(colRight).toBeGreaterThan(-1);
    // The ids are what the jump nav targets and they stay; only the wrapper
    // class went.
    expect(appTsx.indexOf('id="panel-synergy"')).toBeGreaterThan(colRight);
    expect(appTsx.indexOf('id="panel-summary"')).toBeGreaterThan(colRight);
  });

  it("8 — I16: the synergy row floor is DERIVED on TWO boxes, conversion written down", () => {
    // T16, closed. The threshold and the track floor describe ONE
    // arrangement on two different boxes, and 426 is a BORDER-box figure:
    // its own derivation ends in "+ 2 × --space-4 row padding".
    expect(CONTAINER_THRESHOLD).toBe(2 * SELECT_FLOOR + SPACE_3); // 372, CONTENT
    expect(pickersRowFloor).toBe(CONTAINER_THRESHOLD + ROW_CHROME); // 406, BORDER
    expect(synergyRowFloor).toBe(Math.max(pickersRowFloor, SYNERGY_HEADER_MAX));
    // The max() is kept VISIBLE so the day the header shrinks, the pickers
    // become the binding floor mechanically rather than by someone
    // remembering that they might.
    expect(synergyRowFloor).toBe(SYNERGY_HEADER_MAX); // 426

    // §13.5's 404 was `2 × SELECT_FLOOR + SPACE_3 + 2 × ROW_PAD` — padding
    // only, no border. The outcome does not move (max(…, 426) is still 426)
    // but I16's whole point is that the conversion is visible.
    expect(2 * SELECT_FLOOR + SPACE_3 + 2 * ROW_PAD).toBe(pickersRowFloor - 2);

    // CANARY, and it is T16 as arithmetic: the SHIPPED threshold asked for a
    // 426px CONTENT box, i.e. a 460px border box — LARGER than the row's own
    // 426px track floor. A row could satisfy its floor and still stack its
    // pickers. That is self-contradictory, and F5.2 measured exactly it.
    expect(SYNERGY_HEADER_MAX + ROW_CHROME).toBe(460);
    expect(SYNERGY_HEADER_MAX + ROW_CHROME).toBeGreaterThan(synergyRowFloor);

    // The floor carries §11.5 ③'s min() sub-floor idiom. A bare 426px floor
    // is ABSOLUTE and would hold the single S column at 426px inside a 366px
    // box — a horizontal scrollbar on the whole document, at the one
    // breakpoint where the row is expected to be 366 and the pickers stack.
    // F5.2's D3 fix stands verbatim and F5.4 does not touch it.
    expect(app).toContain(
      `repeat(auto-fill, minmax(min(${synergyRowFloor}px, 100%), 1fr))`,
    );
    expect(app).toContain(`@container (min-width: ${CONTAINER_THRESHOLD}px)`);
  });

  it("9 — the container query sits BELOW the rule it overrides", () => {
    // A container query adds no specificity. Declared above
    // `.synergy-row__pickers`'s base `flex-direction: column`, the query
    // evaluates true at 1280 and changes nothing — the pickers stay stacked
    // and every assertion in this file still passes. F5.2's D4 ordering rule,
    // unchanged in spirit and updated in literal.
    expect(app.indexOf(`@container (min-width: ${CONTAINER_THRESHOLD}px)`)).toBeGreaterThan(
      app.indexOf(".synergy-row__pickers {"),
    );
  });

  it("10 — a synergy row is never narrower than the arrangement it asks for, at 1280", () => {
    // REWRITTEN. The old version computed `belowGrid = 1280 − 17 − 2·SPACE_4`
    // and OMITTED the <Section> chrome the panel sits inside — precisely
    // T16's root cause. It read 609.5 and hid an error that was real at 1440.
    for (const scrollbar of SCROLLBARS) {
      expect(synergyColumns(1280, scrollbar), `scrollbar ${scrollbar}px`).toBe(2);
      expect(
        synergyRowBox(1280, scrollbar),
        `scrollbar ${scrollbar}px`,
      ).toBeGreaterThanOrEqual(synergyRowFloor);
    }
    // The binding case, named: 1280 with a 17px classic scrollbar. +10.5px is
    // the margin the NEXT addition to the synergy row header is checked
    // against.
    expect(synergyRowBox(1280, 17)).toBe(436.5);
    expect(synergyRowBox(1280, 17) - synergyRowFloor).toBe(10.5);

    // CANARY: dropping SECTION_CHROME — the omission — reads 609.5 and hides
    // the error. Assert the corrected figure is NOT that.
    const uncorrected = (1280 - 17 - 2 * SPACE_4 - SPACE_3) / 2;
    expect(uncorrected).toBe(609.5);
    expect(synergyRowBox(1280, 17)).toBeLessThan(uncorrected);
  });

  it("11 — the pickers go SIDE BY SIDE at 1440, T16's failing case", () => {
    // The row's CONTENT box is what a size query evaluates.
    expect(synergyRowBox(1440, 17) - ROW_CHROME).toBeGreaterThanOrEqual(CONTAINER_THRESHOLD);

    // CANARY — the OLD pair, and it is the defect the user would have seen:
    // the below-grid box at 1440 resolved to THREE columns, each a 450px
    // border box, i.e. 416px of content — less than the shipped 426px
    // threshold, so the pickers stacked. At 1280 the same pair resolved to
    // two columns of 601 → 567 content and PASSED, which is exactly why T16
    // only ever fired at 1440.
    const oldBody = 1440 - 0 - 2 * SPACE_4 - SECTION_CHROME; // 1374
    const oldCols = Math.floor((oldBody + SPACE_3) / (SYNERGY_HEADER_MAX + SPACE_3)); // 3
    const oldRow = (oldBody - (oldCols - 1) * SPACE_3) / oldCols; // 450
    expect(oldCols).toBe(3);
    expect(oldRow - ROW_CHROME).toBe(416);
    expect(oldRow - ROW_CHROME).toBeLessThan(SYNERGY_HEADER_MAX);
  });

  it("the summary tables are capped rather than stretched", () => {
    // width:100% across a wide box puts the label at the far left and the
    // figure at the far right — unreadable in a different way from a 142px
    // rail. The track cap tames it; the table rule is untouched.
    //
    // F5.4 does NOT touch .summary. Its BOX changed (885 in the right column
    // at 1280/s=17, not 1231 below the grid), so its column count resolves to
    // 2 rather than 3 — the relay to F8-S2, which must re-derive §14.2's five
    // constants and the 1428/1429 seam against the new box before it lands.
    //
    // F8-S2 ANSWERED THE RELAY, and the answer moved this SELECTOR without
    // moving one character of the DECLARATION. §14.2 splits .summary into two
    // regions because §13.5's cap was measured against these tables' 196px
    // max-content and a roster row is 412: the cap was not widened, it was
    // re-homed onto the region it was measured for. So the assertion below is
    // the same assertion, re-pointed — and .summary itself must now carry NO
    // cap of its own, which is the other half of the split.
    expect(cssBlock(app, ".summary__tables")).toMatch(
      /repeat\(auto-fit, minmax\(\d+px, \d+px\)\)/,
    );
    expect(cssBlock(app, ".summary__tables")).toContain("justify-content: start");
    expect(cssBlock(app, ".summary")).not.toContain("auto-fit");
    expect(cssBlock(app, ".summary")).toContain("grid-template-columns: minmax(0, 1fr)");
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

  it("the §4.5 landmarks are restored — THREE asides, each named what it holds", () => {
    // The shipped code drifted to ONE <aside aria-label="Ledger and synergy">
    // because that aside held three unrelated things. Nothing in the suite
    // observed the drift, which is why it survived five revisions.
    //
    // F5.4 amends §4.5 from two asides to three: splitting the content splits
    // the landmark, which is the same finding read forwards. A landmark must
    // name what it holds.
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toContain('aria-label="Attributes"');
    expect(appTsx).toContain('aria-label="Build"');
    expect(appTsx).toContain('aria-label="Ledger overview"');
    expect(appTsx).not.toContain('aria-label="Ledger and synergy"');
  });

  it("the jump-nav targets and the section storage keys survived the move", () => {
    // A dropped id is a dead chip at EVERY breakpoint (P1-3) and no DOM test
    // asserts the target EXISTS — only the link text. F5.4 drops the
    // .panel-below wrapper class and KEEPS both ids.
    //
    // The storageKeys are the slice's persisted-reload readers. A silent
    // rename resets every user's collapsed/expanded preference on their next
    // load, and nothing else in the suite would notice. F5.4 renames NONE of
    // them — section-attributes now belongs to a <Section> in the pane and
    // section-build-panel is now read at L as well as M/S, but the keys
    // themselves are untouched, so no preference resets.
    const appTsx = srcSources["/src/App.tsx"] as string;
    const buildPanel = srcSources["/src/ui/build/BuildPanel.tsx"] as string;
    expect(appTsx).toContain('id="panel-synergy"');
    expect(appTsx).toContain('id="panel-summary"');
    expect(appTsx).toContain('storageKey="section-ledger-overview"');
    expect(appTsx).toContain('storageKey="section-synergy"');
    expect(appTsx).toContain('storageKey="section-summary"');
    expect(buildPanel).toContain('storageKey="section-attributes"');
    expect(buildPanel).toContain('storageKey="section-budget"');
    expect(buildPanel).toContain('"section-build-panel"');
  });

  /* NESTED HERE RATHER THAN APPENDED AT THE FOOT OF THE FILE, deliberately.
   * §16.7 is the describe that MADE the summary's box 885 and left the relay
   * to F8-S2 in the assertion above, so this is where the answer belongs —
   * and the foot of this file is where every slice appends, which makes it
   * the one place two in-flight branches are guaranteed to collide. */

  /* ======================================================================== *
   * F8-S2 — §14.2's two-region summary, RE-DERIVED against the post-F5.4 box  *
   * ======================================================================== */

  /**
   * WHY THIS SECTION EXISTS AT ALL. §14.2 derived every one of its five
   * constants, its track table and its "2-up at 1428, 3-up at 1429" seam
   * against a below-grid box of `v − 17 − 32` — the FULL-PAGE box the summary
   * had before F5.4. F5.4 nested `#panel-summary` inside `.col-right`, so the
   * panel now pays for the 300px attributes pane, the `.layout` column gap AND
   * the `<Section>` chrome that §13.0.1 had already been caught omitting once
   * (T16). Every number downstream of the box moves. The CONSTANTS do not —
   * they are properties of a roster row, not of a viewport — so this section
   * keeps §14.2's five, re-derives the geometry they feed, and states the
   * seams that actually result.
   *
   * Per §11.7: parse and re-derive. Nothing below is a pinned literal that a
   * token edit could invalidate silently.
   */

  /* -------- the five §14.2 constants, with their derivations in place ------ */

  /** `--font-ui` at `--text-sm`, mixed-case: §14.2's paper convention,
   *  calibrated against §11's "Playmaking" (79px / 10ch = 7.9) and §13.1's
   *  "Legend (boost)" (96px / 14ch = 6.9). */
  const UI_SM_ADVANCE = 7.6;
  /** `--text-xs`, same convention. */
  const UI_XS_ADVANCE = 6.5;

  /** The longest badge NAME in the shipped dataset, read from the dataset
   *  rather than transcribed — "Versatile Visionary" today, 19 characters.
   *  A longer name arriving in a future dataset raises the floor here and the
   *  seams below move with it, which is the entire point of deriving it. */
  const LONGEST_BADGE_NAME = [...shippedDataset.badges].map((badge) => badge.name).reduce(
    (longest, name) => (name.length > longest.length ? name : longest),
    "",
  );

  /** F8-R2's Pin chip: "Pinned" 6ch at --text-xs + --space-1/--space-2 padding
   *  + a 2px rim = 57, rounded to 60.
   *
   *  IT IS IN THE FLOOR AND NOT IN THE DOM, deliberately. F8-S2 renders no pin
   *  column at all (no stub, no reserved <td>, no disabled chip), so the
   *  shipped floor is CONSERVATIVE by exactly this much — which is what lets
   *  R2 add the column without moving a constant or re-deriving a seam. */
  const PIN_CHIP_RAW = Math.round("Pinned".length * UI_XS_ADVANCE) + SPACE_1 + SPACE_2 + SPACE_1 + 2;
  const PIN_CHIP_MAX = 60;

  const ROSTER_NAME_MAX = Math.floor(LONGEST_BADGE_NAME.length * UI_SM_ADVANCE); // 144
  /** §10.2's largest medallion (tier A) is ALREADY parsed off the stylesheet
   *  above as TIER_MEDALLION_MAX = 24, and this section reuses that parse
   *  rather than restating the number — §14.2's third constant is the same
   *  24px F5 pinned, not a second measurement of it. */
  /** Purchased word "Silver" 6ch → 48, + --space-2, + "→ Legend" 8ch → 64. */
  const ROSTER_LEVEL_MAX = 48 + SPACE_2 + 64; // 120
  /** HEADER-bound, not value-bound: "cost" 4ch × 7.6 = 30 → 32. The value is
   *  one digit — total-to-own costs are 1–7 [seed: Tiers, levels, and costs]. */
  const ROSTER_COST_MAX = 32;

  /** Four --space-2 gutters between the five columns. */
  const ROSTER_ROW_MAX =
    PIN_CHIP_MAX +
    SPACE_2 +
    ROSTER_NAME_MAX +
    SPACE_2 +
    TIER_MEDALLION_MAX +
    SPACE_2 +
    ROSTER_LEVEL_MAX +
    SPACE_2 +
    ROSTER_COST_MAX;
  /** + the group's own --space-4 sides (§2.3's list-row horizontal padding). */
  const ROSTER_GROUP_FLOOR = ROSTER_ROW_MAX + 2 * SPACE_4;
  /** The 76px of slack is a BOUND, not a leftover: it caps eye travel between
   *  the name and its level cell. Uncapped, §14.2's own 603px track puts them
   *  191px apart — §13.5's far-left/far-right defect through a wider door. */
  const ROSTER_TABLE_MAX = ROSTER_GROUP_FLOOR + 76;

  /* ---------------- parsed back off the shipped stylesheet ---------------- */

  /** SCOPED TO THE BLOCK, not grepped off the file: §15's synergy grid uses
   *  the very same `minmax(min(Npx, 100%), 1fr)` idiom with a 426px floor and
   *  sits earlier in the stylesheet, so an unscoped match reads ITS number and
   *  passes while asserting nothing about the roster. */
  const ROSTER_FLOOR_CSS = px(
    cssBlock(app, ".summary-roster"),
    /minmax\(min\((\d+)px, 100%\), 1fr\)/,
  );
  const ROSTER_TABLE_MAX_CSS = px(
    app,
    /\.summary-roster__table \{[^}]*max-width:\s*(\d+)px/,
  );
  /** Region B's floor and cap, unchanged from §13.5 and re-parsed to prove it. */
  const TABLES_FLOOR_CSS = px(
    app,
    /\.summary__tables \{[^}]*minmax\((\d+)px,\s*\d+px\)/,
  );
  const TABLES_CAP_CSS = px(
    app,
    /\.summary__tables \{[^}]*minmax\(\d+px,\s*(\d+)px\)/,
  );
  /** Both regions use `gap: var(--space-4) var(--space-6)` — the COLUMN gap is
   *  the second value. */
  const ROSTER_COL_GAP = spaceIn(app, ".summary-roster", "gap", 1);
  const TABLES_COL_GAP = spaceIn(app, ".summary__tables", "gap", 1);

  /* -------------------------------- the box ------------------------------- */

  /**
   * `.summary`'s own content box at L (≥1280), where the attributes pane
   * exists. `centreColumn` is `.col-right`'s track; `SECTION_CHROME` is the
   * 1px border + --space-4 padding of the <Section> the panel sits inside,
   * both sides — the omission T16 was caused by, applied here on purpose.
   *
   *   1280 − 17 = 1263 ICB
   *        − 32  (.layout padding)          = 1231   ← the PRE-F5.4 box
   *        − 300 (attributes pane) − 12 gap =  919   ← .col-right
   *        − 34  (<Section> chrome)         =  885   ← .summary
   */
  function summaryBoxAtL(viewport: number, scrollbar: number): number {
    return centreColumn(viewport, scrollbar) - SECTION_CHROME;
  }
  /** Below 1280 there is no pane and no column gap; `.layout` padding is
   *  --space-4 at ≥768 and --space-3 below it. */
  function summaryBoxBelowL(viewport: number, scrollbar: number): number {
    const padding = viewport >= 768 ? SPACE_4 : SPACE_3;
    return viewport - scrollbar - 2 * padding - SECTION_CHROME;
  }
  /** `repeat(auto-fill|auto-fit, minmax(FLOOR, …))` resolves to the largest N
   *  with `N × floor + (N − 1) × gap ≤ box`, and never fewer than one. */
  function tracks(box: number, floor: number, gap: number): number {
    return Math.max(1, Math.floor((box + gap) / (floor + gap)));
  }
  /** The viewport at which N tracks first fit, at L. */
  function seamForTracks(n: number, floor: number, gap: number, scrollbar: number): number {
    // Everything the viewport pays before `.summary` sees a pixel: the
    // scrollbar, `.layout`'s padding, the pane, the column gap and the
    // <Section> chrome. Measured off the box function rather than restated,
    // so the two can never disagree.
    const overhead = 1280 - summaryBoxAtL(1280, scrollbar);
    return n * floor + (n - 1) * gap + overhead;
  }

  /** The BALANCED body of an at-rule, brace-counted rather than sliced to
   *  end-of-file. `cssBlock` cannot see into a media query at all, and a
   *  slice-to-EOF silently absorbs every rule a later slice appends — which
   *  would turn "the print block declares no grid-template-columns" into
   *  "no rule after it does either", an assertion that reddens on somebody
   *  else's unrelated commit. */
  function atRuleBody(source: string, header: string): string {
    const start = source.indexOf(header);
    if (start === -1) throw new Error(`layout arithmetic: at-rule not found — ${header}`);
    let depth = 0;
    for (let at = start; at < source.length; at += 1) {
      const char = source[at];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) return source.slice(start, at + 1);
      }
    }
    throw new Error(`layout arithmetic: unbalanced at-rule — ${header}`);
  }

  describe("§14.2 — the roster's five constants, and the row they build", () => {
    it("the name floor is measured off the DATASET's longest name, not typed", () => {
      expect(LONGEST_BADGE_NAME).toBe("Versatile Visionary");
      expect(LONGEST_BADGE_NAME.length).toBe(19);
      expect(ROSTER_NAME_MAX).toBe(144);
      // The runners-up are 18ch, so the floor has ~8px of headroom against the
      // next-longest name rather than against nothing.
      const runnerUp = [...shippedDataset.badges]
        .map((badge) => badge.name.length)
        .filter((length) => length < LONGEST_BADGE_NAME.length)
        .reduce((max, length) => Math.max(max, length), 0);
      expect(runnerUp).toBe(18);
    });

    it("the row, the group floor and the table cap are DERIVED from the five", () => {
      expect(PIN_CHIP_RAW).toBeLessThanOrEqual(PIN_CHIP_MAX);
      expect(ROSTER_ROW_MAX).toBe(412);
      expect(ROSTER_GROUP_FLOOR).toBe(444);
      expect(ROSTER_TABLE_MAX).toBe(520);
      // …and the stylesheet carries exactly what the derivation produced.
      expect(ROSTER_FLOOR_CSS).toBe(ROSTER_GROUP_FLOOR);
      expect(ROSTER_TABLE_MAX_CSS).toBe(ROSTER_TABLE_MAX);
    });

    it("region B's derivation is UNTOUCHED — that is the point of the split", () => {
      // §13.5 measured 280/380 against the two legacy tables' ~196px
      // max-content and was CORRECT for them. The two-region cut exists so
      // that stays true while the roster gets its own, larger floor.
      expect(TABLES_FLOOR_CSS).toBe(280);
      expect(TABLES_CAP_CSS).toBe(380);
      expect(TABLES_COL_GAP).toBe(SPACE_6);
      expect(ROSTER_COL_GAP).toBe(SPACE_6);
    });
  });

  describe("§14.2 — the box moved, so the seams moved. Re-derived, not pinned.", () => {
    it("`.summary` is 885 at 1280/s=17 — 1231 was the PRE-F5.4 box", () => {
      expect(centreColumn(1280, 17)).toBe(919);
      expect(summaryBoxAtL(1280, 17)).toBe(885);
      // The figure §14.2's whole table was built on, and what it omits: the
      // pane + its gap (312) and the <Section> chrome (34) = 346px of box the
      // spec's arithmetic still assumes the roster has.
      const preF54 = 1280 - 17 - 2 * SPACE_4;
      expect(preF54).toBe(1231);
      expect(preF54 - summaryBoxAtL(1280, 17)).toBe(RAIL + SPACE_3 + SECTION_CHROME);
    });

    it("REGION B RESOLVES TO 2 TRACKS AT 1280/s=17, AND IT IS 3px FROM 3", () => {
      // THE KNIFE EDGE, pinned because nothing pinned it before: the shipped
      // test asserted only the minmax() SHAPE, never the resolved count. Three
      // tracks need 3 × 280 + 2 × 24 = 888 and the box is 885.
      //
      // Four slices are in flight that can each move a term of that box — the
      // rail width, `.layout` padding, the column gap, the <Section> chrome. A
      // 3px gain anywhere reflows the summary from two columns to three, and
      // before this assertion existed it would have done so silently.
      expect(tracks(summaryBoxAtL(1280, 17), TABLES_FLOOR_CSS, TABLES_COL_GAP)).toBe(2);
      const threeUpNeeds = 3 * TABLES_FLOOR_CSS + 2 * TABLES_COL_GAP;
      expect(threeUpNeeds).toBe(888);
      expect(threeUpNeeds - summaryBoxAtL(1280, 17)).toBe(3);
      // Two tracks are capped at 380 each, so 101px trails as free space under
      // `justify-content: start` — left-aligned, which is the shipped intent.
      expect(summaryBoxAtL(1280, 17) - (2 * TABLES_CAP_CSS + TABLES_COL_GAP)).toBe(101);
      // AND THE EDGE IS ALREADY BEING CROSSED IN THE FIELD. With macOS overlay
      // scrollbars the box is 902 — 14px past the 888 threshold — so the SAME
      // build renders region B 3-up on macOS and 2-up wherever a classic
      // scrollbar takes 15 or 17px. That is not introduced here and it is not
      // a defect (the tables are capped at 380 either way, and the third track
      // simply stops the 101px of trailing free space existing); it is pinned
      // because it was previously unobserved, and because it means anyone
      // moving one of the box's terms by ±3px flips the LAYOUT ON EVERY
      // PLATFORM rather than on one.
      expect(tracks(summaryBoxAtL(1280, 15), TABLES_FLOOR_CSS, TABLES_COL_GAP)).toBe(2);
      expect(summaryBoxAtL(1280, 0)).toBe(902);
      expect(tracks(summaryBoxAtL(1280, 0), TABLES_FLOOR_CSS, TABLES_COL_GAP)).toBe(3);
      // The boundary, derived: a scrollbar of 14px or less buys the third
      // track. 15 and 17 are the two classic widths this repo derives against.
      const widestScrollbarThatFitsThree = 1280 - (1280 - summaryBoxAtL(1280, 0)) - threeUpNeeds;
      expect(widestScrollbarThatFitsThree).toBe(14);
    });

    it("THE ROSTER IS 1-UP AT 1280 AND 2-UP AT 1440 — §14.2's 1428/1429 seam is void", () => {
      // §14.2 read "2-up at 1428, 3-up at 1429" off `v − 17 − 32`. Against the
      // real box those seams are 346px too generous. Re-derived here from the
      // SAME constants, per §11.7 — and if the measured advance of
      // "Versatile Visionary" ever comes in above 144, ROSTER_GROUP_FLOOR
      // rises, every seam below moves right, and the wider viewports fall back
      // a column. THAT IS THE DESIGN'S BASELINE AND NOT A DEFECT: a group is
      // capped at 520px regardless, so a 1-up roster is a 520px table in an
      // 885px box, not a stretched one.
      expect(tracks(summaryBoxAtL(1280, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(1);
      expect(tracks(summaryBoxAtL(1440, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(2);
      expect(summaryBoxAtL(1440, 17)).toBe(1045);

      // The seams themselves, derived rather than chosen.
      const twoUp = seamForTracks(2, ROSTER_GROUP_FLOOR, ROSTER_COL_GAP, 17);
      const threeUp = seamForTracks(3, ROSTER_GROUP_FLOOR, ROSTER_COL_GAP, 17);
      expect(twoUp).toBe(1307);
      expect(threeUp).toBe(1775);
      expect(tracks(summaryBoxAtL(twoUp - 1, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(1);
      expect(tracks(summaryBoxAtL(twoUp, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(2);
      // 3-up is unreachable on any target width in §5.2's tier list.
      expect(threeUp).toBeGreaterThan(1600);
    });

    it("the pane makes 1279 WIDER than 1280 for this panel, and that is disclosed", () => {
      // The attributes pane arrives at exactly 1280 and takes 312px with it,
      // so the roster genuinely goes 2-up → 1-up as the viewport GROWS by one
      // pixel. It is a consequence of §16's own ratified arithmetic, not a bug
      // in this slice, and it is stated here so the next reader does not
      // rediscover it as one.
      expect(summaryBoxBelowL(1279, 17)).toBe(1196);
      expect(tracks(summaryBoxBelowL(1279, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(2);
      expect(tracks(summaryBoxAtL(1280, 17), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(1);
      expect(summaryBoxBelowL(1279, 17)).toBeGreaterThan(summaryBoxAtL(1280, 17));
    });

    it("I11 — at 768 and 390 the row wraps INSIDE its columns, and nothing scrolls", () => {
      // One track at both, and the min() idiom is what stops a 444px floor
      // overflowing a 332px container.
      expect(app).toContain("minmax(min(444px, 100%), 1fr)");
      expect(tracks(summaryBoxBelowL(768, 15), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(1);
      expect(tracks(summaryBoxBelowL(390, 0), ROSTER_GROUP_FLOOR, ROSTER_COL_GAP)).toBe(1);

      // §14.2's min-content row: PIN 60 + "Visionary" 68 + TIER 24 + "Gold" 30
      // + cost 32, four gutters. WITHOUT the pin column — which this slice does
      // not render — it is 60 + 8 smaller again.
      const rowMinWithPin = PIN_CHIP_MAX + SPACE_2 + 68 + SPACE_2 + TIER_MEDALLION_MAX + SPACE_2 + 30 + SPACE_2 + ROSTER_COST_MAX;
      expect(rowMinWithPin).toBe(246);
      const rowMinShipped = rowMinWithPin - PIN_CHIP_MAX - SPACE_2;
      expect(rowMinShipped).toBe(178);

      // The S content box, re-derived. §14.2 reads 334/366 because it omits the
      // <Section> chrome; the corrected figure is 332 — and the headroom is
      // +86 with R2's pin column and +154 without it, so nothing overflows in
      // either world.
      const sBox = summaryBoxBelowL(390, 0) - 2 * SPACE_4; // the group's own padding
      expect(summaryBoxBelowL(390, 0)).toBe(332);
      expect(sBox).toBe(300);
      expect(sBox - rowMinShipped).toBe(122);
      expect(summaryBoxBelowL(390, 0) - rowMinWithPin).toBe(86);
    });
  });

  describe("§14.2 — the two BANS, asserted by absence", () => {
    it("no @container rule and no display:block on any roster <tr>/<td>", () => {
      // THE A11Y-TREE BAN, and it is silent when violated: flipping table rows
      // to blocks strips the table role in every target engine, and
      // <caption> + <th scope> + row/column association is the roster's whole
      // screen-reader value. A table wraps its cells natively.
      const css = stripComments(app);
      expect(css).not.toMatch(/@container[^{]*\{[^{}]*\.summary-roster/s);
      for (const block of blocksFor(app, ".summary-roster")) {
        expect(block).not.toContain("display: block");
      }
      expect(css).not.toMatch(/\.summary-roster[^{]*(tr|td)[^{]*\{[^}]*display:\s*block/);
    });

    it("the roster adds NO media query — auto-fill is continuous in the viewport", () => {
      // §13.3's rule, reused: a seam produced by auto-fill arithmetic needs no
      // breakpoint, and a fourth breakpoint is a stop-and-report.
      const queries = [...stripComments(app).matchAll(/@media \(min-width:\s*(\d+)px\)/g)].map(
        (match) => Number.parseInt(match[1] as string, 10),
      );
      expect([...new Set(queries)].sort((a, b) => a - b)).toEqual([768, 1280]);
    });

    it("the print block is LEGIBILITY, not a fourth layout", () => {
      const print = atRuleBody(app, "@media print {");
      // A dark theme on white paper is invisible text — that is the defect.
      expect(print).toContain("color: #000 !important;");
      expect(print).toContain("background: #fff !important;");
      // Nothing collapsed: a printed page cannot be expanded.
      expect(print).toContain("details:not([open]) > *:not(summary)");
      // …and NONE of the things that would make it a layout.
      expect(print).not.toContain("@page");
      expect(print).not.toContain("grid-template-columns");
      expect(print).not.toContain("font-family");
      expect(print).not.toContain("font-size");
    });
  });
});

/* ------------------------------------------------------------------ I9 -- */

describe("I9 — the arrangement threshold is derived, not borrowed", () => {
  it("the stack threshold equals usableTrack + gap + numeric, minus one", () => {
    expect(STACK_MAX).toBe(USABLE_TRACK + SPACE_2 + NUMERIC_W - 1); // 287
  });

  it("widening the rail improves the track instead of halving it", () => {
    // F5.4 UPDATES THE EXPRESSION, NOT THE EXPECTATION. The pane carries 4px
    // of inline padding each side now (the focus ring's reach), so the cell
    // is `RAIL − 2·PANE_PAD_X − SECTION_CHROME` = 258, not the 266 the
    // pre-slice expression gave. The arrangement is unchanged: 258 ≤ 287, so
    // the numeric field stacks below the track and the track is the full cell.
    const cell = RAIL - 2 * PANE_PAD_X - SECTION_CHROME;
    expect(cell).toBe(258);
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
    // F14 HOISTED THE OFFSET. It used to be a hard-coded 44 here, matched by a
    // second 44 living in prose in the jump nav's comment; the shell added a
    // third and a fourth consumer (scroll-margin-top on .grid-section,
    // scroll-padding-top on .col-right) so the number now has exactly ONE home.
    // Assertion 28 proves that home carries the nav's actual composed height,
    // which is what lets this pin check the wiring alone.
    expect(sticky).toContain("top: var(--sticky-jumpnav-h)");
    expect(sticky).not.toMatch(/top:\s*\d/);
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
    // The budgets are written ONLY on the checkbox branch — and A5-U put the
    // bonus layer on that same branch, because bonus totals and placements ARE
    // budgets (design-spec §17.13/5). A confirm whose checkbox says "Also
    // clear Badge Tokens and Badge Slots" while fourteen bonus fields survive
    // would be telling a half-truth.
    expect(handleReset).toContain(
      "alsoBudgets ? { budgets: zeroBudgets(), bonus: zeroBonus() } : {}",
    );
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
    // [A7] The handler is no longer the bare `onClick={onResetRequest}` it was
    // at the panel foot: riding a <summary> means it must ALSO stop
    // propagation, or pressing Reset collapses the Attributes Section under
    // it. The INVARIANT is unchanged and is what is asserted — the click
    // reaches `onResetRequest` and NOTHING else resets anything.
    expect(buildPanel).toContain("onResetRequest()");
    expect(buildPanel).toContain("event.stopPropagation()");
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

  it("20 — the control clears the I6 touch floor at S, FROM THE TOKEN", () => {
    // SCOPED here on purpose: the app-wide `.btn--sm` 28 / `.btn--md` 36
    // defect is F9's, because raising it reflows six surfaces this slice does
    // not own. C must simply not arrive below the floor itself.
    //
    // [A7] The value is now `var(--tap-target)`, not a literal. F5.3's
    // scoping decision is unchanged and still pinned right here — what
    // changed is that the census (assertion 27) can now SEE the rule, which
    // it could not while the rule spelled the number out. Derived, so a
    // future move of the floor carries this control with it.
    const rule = sRule(".build-panel__reset");
    expect(rule).toHaveLength(1);
    expect(rule[0]).toContain("min-height: var(--tap-target)");
    expect(TAP).toBeGreaterThanOrEqual(WCAG_TARGET_SIZE);
    // …and the literal is GONE, which is the half a substring check misses.
    expect(stripComments(app)).not.toMatch(/\.build-panel__reset \{[^}]*min-height:\s*44px/);
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

/* ------------------------------------------------------- I15 + I16 (F5.4) -- */

/** The vertical axis, and the structure that makes it reachable (design-spec
 *  §16). Seventeen of the slice's twenty-one numbered assertions live here;
 *  8 · 9 · 10 · 11 are rewrites of existing §13.5 tests and stayed in the
 *  §16.7 describe above, marked with their numbers.
 *
 *  SIX OF THESE CANARIES FAIL AGAINST THE PRE-F5.4 TREE ON PURPOSE — 1, 3, 6,
 *  8, 10 and 11. An assertion whose canary passes on the broken tree is not
 *  checking anything, and that is exactly how a pane showing zero of twenty
 *  sliders shipped under a green suite. */
describe("I15 + I16 — the attributes pane, parse-and-re-derive on the vertical axis", () => {
  it("1 — I15: >=6 sliders visible at 700, >=7 at 800, >=8 at 900", () => {
    // The pane's only lead is its own <Section>'s summary. This is the whole
    // point of the slice, stated as a number.
    expect(slidersVisible(700, SECTION_LEAD_Y)).toBeGreaterThanOrEqual(6);
    expect(slidersVisible(800, SECTION_LEAD_Y)).toBeGreaterThanOrEqual(7);
    expect(slidersVisible(900, SECTION_LEAD_Y)).toBeGreaterThanOrEqual(8);

    // §16.2's prose figure — the pane-top → first-slider-TOP distance — pinned
    // HERE rather than passed as `lead`, because slidersVisible adds
    // GROUP_LEGEND_H itself and passing 683 double-counts it.
    expect(LEAD_TODAY).toBe(657);
    expect(LEAD_TODAY + GROUP_LEGEND_H).toBe(683);

    // CANARY — THE USER'S COMPLAINT AS ARITHMETIC. With the ledger, Physique
    // and the budgets still ahead of the stack, a 700px viewport showed ZERO
    // of twenty sliders when the pane was scrolled to its own top.
    expect(slidersVisible(700, LEAD_TODAY)).toBe(0);
    expect(slidersVisible(800, LEAD_TODAY)).toBe(1);
    expect(slidersVisible(900, LEAD_TODAY)).toBe(2);
  });

  it("2 — GROUP_SIZES is DERIVED from the vocabulary, never pinned", () => {
    expect(GROUP_SIZES.reduce((sum, n) => sum + n, 0)).toBe(ATTRS.length);
    expect(GROUP_SIZES).toHaveLength(ATTR_GROUPS.length);
    // A 21st attribute (the live Free Throw question) changes the stack and
    // must move assertion 1's counts BY HAND. Pinned so it cannot drift
    // silently under a green suite.
    expect(SLIDER_H).toBe(81);
    expect(GROUP_LEGEND_H).toBe(26);
    expect(ATTR_STACK_H).toBe(2016);
  });

  it("3 — SECTION_CHROME_Y is PARSED from tokens, not pinned", () => {
    expect(SECTION_CHROME_Y).toBe(70);
    expect(SECTION_LEAD_Y).toBe(53);
    expect(SECTION_CHROME_Y).toBe(SECTION_LEAD_Y + 1 + SPACE_4);
    // CANARY — T16's omission, on the vertical axis: counting only the border
    // and the body padding and FORGETTING THE <summary> gives 18. That class
    // of omission is what put a 426px content demand on a 601px border box.
    expect(2 + SPACE_4).toBe(18);
    expect(2 + SPACE_4).not.toBe(SECTION_CHROME_Y);
  });

  it("4 — the pane is sticky, capped and scrollable, with dvh AFTER vh", () => {
    const pane = cssBlock(app, ".attr-pane");
    expect(pane).toContain("position: sticky");
    expect(pane).toContain("overflow-y: auto");
    expect(pane).toContain("max-height: calc(100vh - var(--space-6))");
    expect(pane).toContain("max-height: calc(100dvh - var(--space-6))");
    // A fallback declared SECOND is not a fallback.
    expect(pane.indexOf("calc(100dvh")).toBeGreaterThan(pane.indexOf("calc(100vh"));
    // max-height, never height: a pane forced to full height with 300px of
    // content draws an empty box the day a user collapses the Section.
    expect(pane).not.toMatch(/\n\s*height:\s/);
    // The focus ring reaches 4px outside the box and overflow-y clips.
    expect(pane).toContain("padding-inline: var(--space-1)");
    expect(pane).toContain("scroll-padding-block: var(--space-3)");
  });

  it("5 — the pane holds the attributes and NOTHING ELSE", () => {
    const appTsx = srcSources["/src/App.tsx"] as string;
    const start = appTsx.indexOf('<div className="attr-pane">');
    expect(start).toBeGreaterThan(-1);
    const subtree = appTsx.slice(start, appTsx.indexOf("</aside>", start));
    expect(subtree).toContain('aria-label="Attributes"');
    expect(subtree).toContain("<AttributesSection");
    // Everything the arithmetic evicted, checked by name. F13 renamed
    // PhysiqueSection to PhysiqueStrip, so this checks the STEM — a rename
    // must not be able to walk the surface back into the pane unnoticed.
    expect(subtree).not.toContain("Physique");
    expect(subtree).not.toContain("BudgetGrid");
    expect(subtree).not.toContain("ledger-overview");
    expect(subtree).not.toContain("ExportImportControls");
  });

  it("6 — I8 re-derived: the pane funds the focus ring's inline padding", () => {
    const cell = RAIL - 2 * PANE_PAD_X - SECTION_CHROME;
    expect(PANE_PAD_X).toBe(4); // exactly --ring-focus's 4px reach
    expect(cell).toBe(258);
    expect(cell - USABLE_TRACK).toBeGreaterThanOrEqual(SPACE_6); // 34 >= 24

    // CANARY — the horizontal consequence of a vertical decision. While the
    // ledger was still in the pane its 3-digit row was the binding demand,
    // and the 4px of padding was NOT affordable: the slack fell below
    // --space-6. Evicting the ledger is what paid for the ring.
    const ledgerDemand = LEDGER_LABEL_MAX + ROW_GAP_X + LEDGER_METRICS_MAX + 2 * WELL_PAD_X;
    expect(cell - ledgerDemand).toBeLessThan(SPACE_6); // 17 < 24
  });

  it("7 — I9 unchanged in KIND: the cell still stacks and the track is usable", () => {
    const cell = RAIL - 2 * PANE_PAD_X - SECTION_CHROME;
    expect(cell).toBeLessThanOrEqual(STACK_MAX); // stacked, so SLIDER_H is 81
    expect(sliderTrack(cell)).toBeGreaterThanOrEqual(USABLE_TRACK);
    // The pre-slice EXPRESSION gave 266. The expectation did not move; the
    // expression did — the pane's padding is geometry.
    expect(RAIL - SECTION_CHROME).toBe(266);
    expect(cell).toBe(258);
  });

  it("12 — the CSS and TSX breakpoints are complements, and 1279 appears once", () => {
    const appCode = stripComments(srcSources["/src/App.tsx"] as string);
    const tsxBreakpoint = px(appCode, /\(max-width:\s*(\d+)px\)/);
    expect(tsxBreakpoint + 1).toBe(L_BREAKPOINT); // 1279 + 1 === 1280

    // A JS/CSS breakpoint pair is a classic desync, so the TSX literal is
    // allowed exactly one home across the whole of src/**.
    const occurrences = Object.values(srcSources).reduce(
      (sum, source) => sum + (stripComments(source).match(/1279/g)?.length ?? 0),
      0,
    );
    expect(occurrences).toBe(1);

    // CANARY: an off-by-one fixture must fail the complement check.
    const fixture = px('useMediaQuery("(max-width: 1280px)")', /\(max-width:\s*(\d+)px\)/);
    expect(fixture + 1).not.toBe(L_BREAKPOINT);
  });

  it("13 — the jsdom desktop default is preserved by the NEGATION's direction", () => {
    const appCode = stripComments(srcSources["/src/App.tsx"] as string);
    // useMediaQuery returns false where matchMedia is absent, so this form
    // yields isLarge = true in jsdom and every component test keeps rendering
    // the desktop shape.
    expect(appCode).toContain('!useMediaQuery("(max-width: 1279px)")');
    // The tidier-looking form inverts that default to MOBILE and silently
    // flips a large, hard-to-attribute set of tests.
    expect(appCode).not.toContain('useMediaQuery("(min-width: 1280px)")');
    // ONE owner: the panel does not ask the question itself any more.
    expect(stripComments(srcSources["/src/ui/build/BuildPanel.tsx"] as string)).not.toContain(
      "useMediaQuery",
    );
  });

  it("14 — the --cat chain survives the re-parenting", () => {
    // All four carriers are id / attribute / href selectors on the very
    // element that sets --cat, so no amount of re-parenting can sever them.
    expect(srcSources["/src/ui/build/AttributeGrid.tsx"]).toContain("data-attr-group={group}");
    expect(srcSources["/src/ui/grid/BadgeGridSection.tsx"]).toContain(
      "id={categoryAnchorId(category)}",
    );
    for (const category of [
      "finishing",
      "shooting",
      "playmaking",
      "defense",
      "rebounding",
      "physicals",
    ]) {
      expect(app, category).toContain(`#cat-${category}`);
      expect(app, category).toContain(`[data-attr-group="${category}"]`);
    }
    // The wiring file names no hue and no custom property. If a category goes
    // neutral, the id moved — put it back on .grid-section, never elsewhere.
    const appCode = stripComments(srcSources["/src/App.tsx"] as string);
    expect(appCode).not.toContain("--cat");
    expect(appCode).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it("15 — three landmarks at L, and every storage key survives", () => {
    const appTsx = srcSources["/src/App.tsx"] as string;
    const buildPanel = srcSources["/src/ui/build/BuildPanel.tsx"] as string;
    expect(appTsx).toContain('aria-label="Attributes"');
    expect(appTsx).toContain('aria-label="Build"');
    expect(appTsx).toContain('aria-label="Ledger overview"');
    expect(appTsx).not.toContain('aria-label="Ledger and synergy"');
    // No key renamed → no user's collapsed/expanded preference resets.
    expect(buildPanel).toContain('storageKey="section-attributes"');
    expect(buildPanel).toContain('"section-build-panel"');
    expect(buildPanel).toContain('storageKey="section-budget"');
    expect(appTsx).toContain('storageKey="section-ledger-overview"');
  });

  it("16 — the skip target still follows the moved panels and stays outside <main>", () => {
    // <a href="#badge-grid"> is the first focusable element. Putting the
    // moved panels INSIDE <main> would silently park ~40 controls behind the
    // skip target and undo the affordance §4.5 calls "not optional".
    function skipTargetIsClear(source: string): boolean {
      const grid = source.indexOf('id="badge-grid"');
      const ledger = source.indexOf('aria-label="Ledger overview"');
      const build = source.indexOf('aria-label="Build"');
      return ledger > -1 && build > -1 && grid > ledger && grid > build;
    }
    const appTsx = srcSources["/src/App.tsx"] as string;
    expect(appTsx).toContain('href="#badge-grid"');
    expect(skipTargetIsClear(appTsx)).toBe(true);

    // FAILING FIXTURE: the asides inside <main>.
    expect(
      skipTargetIsClear(
        '<main id="badge-grid">' +
          '<aside aria-label="Ledger overview" /><aside aria-label="Build" />' +
          "</main>",
      ),
    ).toBe(false);
  });

  it("17 — §5.3's two-sticky-layer cap still holds in the card column", () => {
    function declaresSticky(selector: string): boolean {
      try {
        return blocksFor(app, selector).some((block) => block.includes("position: sticky"));
      } catch {
        return false; // no rule at all
      }
    }
    // The two moved panels are ABOVE <main> and non-sticky, so they scroll
    // away and never occupy the viewport permanently. A third layer would
    // break I5.
    expect(declaresSticky(".col-right")).toBe(false);
    expect(declaresSticky(".ledger-panel")).toBe(false);
    expect(declaresSticky(".setup-panel")).toBe(false);
    // The two that ARE the cap, unchanged: jump nav (top 0) and the
    // per-category digest (top 44).
    expect(declaresSticky(".jump-nav")).toBe(true);
    expect(declaresSticky(".category-ledger")).toBe(true);
  });

  it("18 — nothing INSIDE the pane is sticky", () => {
    // The pane owns its own scrollport, which is why it does not spend the
    // §5.3 cap. Sticky group legends were considered and rejected: <legend>'s
    // box is UA-special, and a sticky header eats the budget exactly where §4
    // shows it is scarcest.
    const descendants = [
      ...stripComments(app).matchAll(/\.attr-pane\s+[^{}\s][^{}]*\{([^}]*)\}/g),
    ];
    for (const rule of descendants) {
      expect(rule[1]).not.toContain("position: sticky");
    }
  });

  it("19 — the renames are complete, in the stylesheet AND in src/**", () => {
    // A half-done rename leaves a dead rule that reads as live. Checked
    // without the leading dot too: App.tsx writes className="panel-below".
    for (const dead of ["rail-left", "rail-column", "rail-ledger", "rail-build", "panel-below"]) {
      expect(app, `app.css still names ${dead}`).not.toContain(dead);
      for (const [path, source] of Object.entries(srcSources)) {
        expect(source, `${path} still names ${dead}`).not.toContain(dead);
      }
    }
    // The new names exist, so the loop above cannot pass by deleting the layout.
    expect(app).toContain(".attr-pane {");
    expect(app).toContain(".attr-pane-column {");
    expect(app).toContain(".ledger-panel {");
    expect(app).toContain(".col-right {");
    expect(srcSources["/src/App.tsx"]).toContain('className="setup-panel"');
  });

  it("20 — the L-scoped .segmented__track override is GONE, in both spellings", () => {
    // Its surface left the rail: F5.4 put the 6-option Position control in
    // the setup panel and F13 put it in the full-bleed strip, where it gets
    // 1248px at 1280 and 358 at 390. MEASURED in headless Chrome on the F13
    // tree: the track is 256.73px at BOTH widths — one inline-flex row
    // everywhere, so no width-scoped override may come back. A rule renamed
    // to .attr-pane would grid nothing while reading as live; one left
    // un-renamed would be a dead selector.
    expect(stripComments(app)).not.toMatch(/\.segmented__track\s*\{[^}]*display:\s*grid/);
    expect(stripComments(app)).not.toMatch(/\.attr-pane\s+\.segmented/);
    expect(stripComments(app)).not.toMatch(/\.rail-left\s+\.segmented/);
  });

  it("21 — A1: the ledger's track override exists, is SCOPED, and the base is untouched", () => {
    expect(app).toContain(".ledger-panel .ledger-overview {");
    const scoped = cssBlock(app, ".ledger-panel .ledger-overview");
    expect(scoped).toContain("grid-template-columns: max-content minmax(0, auto)");
    // Without this the default `normal` behaves as `stretch` and the auto-max
    // track eats the leftover space again.
    expect(scoped).toContain("justify-content: start");

    // The FROZEN base blocks are not touched, and I12's two parsed numbers
    // still resolve unambiguously (the scoped rule declares neither).
    expect(cssBlock(app, ".ledger-overview")).toContain("grid-template-columns: 1fr auto");
    expect(spaceIn(app, ".ledger-overview", "padding", 1)).toBe(WELL_PAD_X);
    expect(spaceIn(app, ".ledger-overview", "column-gap", 0)).toBe(ROW_GAP_X);

    // CANARY — why the move needed the override. §16.5's "4-up on two lines"
    // is unbuildable (repeat(auto-fit, …) forbids intrinsic track sizes), and
    // left alone the `1fr` absorbs 739 of the 878px grid box: label at the far
    // left, numbers at the far right, six times over. That is verbatim the
    // defect .summary's cap exists to prevent.
    const box = ledgerGridBox(1280, 0);
    expect(box).toBe(878);
    const absorbedByFr = box - ROW_GAP_X - LEDGER_METRICS_MAX;
    expect(absorbedByFr).toBe(739);
    expect(absorbedByFr).toBeGreaterThan(SPACE_6 * 10);
  });
});

/* ------------------------------------------------------------ I6 (F9) ----- */

/** THE TOUCH FLOOR, on the same parse-and-re-derive footing as everything
 *  above it. §5.3's "every interactive target >= 44x44px" is invariant I6, and
 *  for the whole of M3/M4/F2–F8 it was true of exactly three classes: `.pip`
 *  (F5.3, frozen), `input[type="range"]` (F3) and `.build-panel__reset`
 *  (F5.3, scoped to its own new control). Seventeen others were between 14px
 *  and 42px at 390, and §3.1 rev 2's ratified S override — the one that was
 *  supposed to prevent exactly this — never shipped a single declaration.
 *
 *  WHY A PARSE TEST AND NOT A MEASUREMENT. vitest runs in jsdom, which has no
 *  layout engine: every getBoundingClientRect() in this repo's DOM tests
 *  returns zeros, so a test that "measures" a touch target here would pass
 *  against 0x0. What CAN be checked mechanically is that each control DECLARES
 *  the floor at S and that the floor itself is one parsed token, so a future
 *  density pass that shrinks `--tap-target` fails HERE — in one place, loudly —
 *  instead of in the user's thumb. The empirical counterpart is a headless-
 *  Chrome census at 390 recorded in docs/proof/f9-verification.txt: 80 hit
 *  targets under the floor before, 0 after.
 *
 *  THE THREE cssBlock TRAPS THIS BLOCK HAD TO AVOID, all live in this file:
 *  cssBlock() returns the FIRST matching block, it stops at the FIRST `}`, and
 *  it therefore CANNOT SEE INSIDE A MEDIA QUERY AT ALL — every rule below is
 *  inside one. `.category-ledger` now has five blocks and `.btn` two contexts.
 *  Hence sMediaBodies() + sRule(), which brace-match and search every S block
 *  by name rather than by ordinal. */

/** CSS comments only — NOT the shared stripComments(), whose `//` arm would
 *  eat the rest of a line at the first protocol-relative anything. Stripping
 *  is mandatory before any brace counting here: this stylesheet's rationale
 *  comments quote `{ … }` and `@media (max-width: 767px)` verbatim, and an
 *  unstripped scan finds six S blocks where five exist. */
const cssPlain = app.replace(/\/\*[\s\S]*?\*\//g, " ");

/** Every `@media <query>` BODY, brace-matched. */
function mediaBodies(source: string, query: string): string[] {
  const out: string[] = [];
  const needle = `@media ${query} {`;
  for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) {
    let depth = 1;
    let i = at + needle.length;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
    }
    out.push(source.slice(at + needle.length, i - 1));
  }
  if (out.length === 0) throw new Error(`layout arithmetic: no @media ${query} block`);
  return out;
}

const S_BODIES = mediaBodies(cssPlain, "(max-width: 767px)");

/** Every declaration block declared for `selector` ANYWHERE below 768px,
 *  across every S media block, matching grouped selector lists exactly (so
 *  `.import-dialog__actions, .reset-dialog__actions {` answers for both and a
 *  substring like `.toggle--overlay` never answers for `.toggle`). */
function sRule(selector: string): string[] {
  const out: string[] = [];
  for (const body of S_BODIES) {
    for (const rule of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = (rule[1] as string).split(",").map((s) => s.trim().replace(/\s+/g, " "));
      if (selectors.includes(selector)) out.push(rule[2] as string);
    }
  }
  return out;
}

/** Every selector inside `bodies` whose rule takes `property` FROM THE TOKEN.
 *
 *  Hoisted out of assertion 27 VERBATIM so the height census read-back, its
 *  new width counterpart and the canaries in assertion 32 all run the SAME
 *  scanner. A canary that re-implements the check it is meant to falsify
 *  proves nothing about the check that ships — it only proves the copy works.
 *  `bodies` is a parameter for exactly that reason: 32 feeds it a synthetic
 *  stylesheet and watches this function fail. */
function floorSelectors(bodies: string[], property: "min-height" | "min-width"): Set<string> {
  const out = new Set<string>();
  for (const body of bodies) {
    for (const rule of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!(rule[2] as string).includes(`${property}: var(--tap-target)`)) continue;
      for (const selector of (rule[1] as string).split(",")) {
        out.add(selector.trim().replace(/\s+/g, " "));
      }
    }
  }
  return out;
}

/** Every `selector { <size-property>: <n>px }` inside `bodies` — a size spelled
 *  as a NUMBER rather than taken from the token. Same parameterisation and the
 *  same reason: 31 runs it over the shipped S blocks, 32 over a canary. */
function literalSizes(bodies: string[]): { selector: string; property: string; value: number }[] {
  const out: { selector: string; property: string; value: number }[] = [];
  for (const body of bodies) {
    for (const rule of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = (rule[1] as string).split(",").map((s) => s.trim().replace(/\s+/g, " "));
      for (const decl of (rule[2] as string).matchAll(
        /(?:^|;)\s*((?:min-|max-)?(?:width|height))\s*:\s*(\d+)px/g,
      )) {
        for (const selector of selectors) {
          out.push({
            selector,
            property: decl[1] as string,
            value: Number.parseInt(decl[2] as string, 10),
          });
        }
      }
    }
  }
  return out;
}

/** The one number the pass turns on, PARSED from tokens.css. */
const TAP = px(tokens, /--tap-target:\s*(\d+)px/);

/** WCAG 2.2 SC 2.5.5 / design-spec §5.3. A literal on purpose, and it is the
 *  STANDARD rather than a measurement — it is what `--tap-target` is graded
 *  against, so it may not be parsed from the thing under test. */
const WCAG_TARGET_SIZE = 44;

/** §5.3's re-cut sticky budget, as three declared caps. Also the spec's own
 *  numbers, so also pinned; what gets DERIVED below is whether the
 *  composition still fits them once layer 1's chips take the touch floor. */
const STICKY_LAYER_1_MAX = 48; // jump nav — "44px chips + 2px padding each side"
const STICKY_LAYER_2_MAX = 88; // the per-category digest
const STICKY_TOTAL_MAX = 136; // two layers, at every breakpoint

/* ------------------------------------- F14: the sticky stack, PARSED ------ */

/** F14 hoisted the two sticky heights into `:root` so ONE number owns each.
 *  PARSED, never restated — assertion 28 proves layer 1 equals the nav's own
 *  composition, F14's own block proves layer 2 clears §5.3's cap and that the
 *  pair is what `.col-right`'s scroll-padding-top reserves.
 *
 *  THESE ARE THE L/M PAIR (44 + 76 = 120). The S pair is 48 + 59 = 107 and the
 *  two must not be swapped: 107 is what the shell's own design document
 *  carried for L, and using it would under-reserve the tab-into-a-card fix by
 *  13px and put MIN_SHELL_H 32px low. */
const JUMPNAV_H = px(app, /--sticky-jumpnav-h:\s*(\d+)px/);
const DIGEST_H = px(app, /--sticky-digest-h:\s*(\d+)px/);
const STICKY_STACK_H = JUMPNAV_H + DIGEST_H;

/** Every control class F9 raises, with the class of surface it belongs to.
 *  This census is the test's contract: assertion 27 proves it is neither short
 *  (a rule in the stylesheet with no census entry) nor long (a census entry
 *  with no rule), so it cannot rot in either direction. */
const S_TOUCH_FLOOR_CENSUS = [
  // the six surfaces F9 was opened for
  ".btn", // AppHeader row · BuildManager footer · Banner actions · Export/Import · all 3 dialog action rows
  ".select__control",
  ".build-switcher__select",
  ".toggle",
  ".filter-chip",
  ".filter-bar__categories > summary",
  ".filter-bar__category-option",
  ".filter-bar__clear",
  ".provenance summary",
  ".build-manager__name-input",
  ".reset-dialog__opt-in",
  // …and the three the app-wide census turned up beyond them
  ".number-field input",
  ".segmented label",
  ".jump-nav a",
  ".badge-card__desc-summary",
  ".skip-link",
  // …and the one FOLDED IN AT INTEGRATION. F11 was cut before this pass
  // existed and shipped the identical floor as a literal `44px` in its own
  // block, which assertion 27 could not see — 27 reads the stylesheet back by
  // matching the TOKEN, so a hard-coded value is exactly the rot it is meant
  // to catch and is the one shape that escapes it. Re-pointed at
  // `--tap-target`, F11's standalone rule deleted, and registered here.
  ".synergy-board__button",
  // …and the SECOND escape of the same shape, folded in by [A7]. F5.3 shipped
  // `.build-panel__reset { min-height: 44px }` as a LITERAL — deliberately
  // scoped, correctly valued, and structurally invisible to assertion 27,
  // which matches on the token. It sat outside the census for two slices.
  // Re-pointed at `--tap-target` when the control moved onto the Attributes
  // summary, and registered here so it can never silently drop below the
  // floor again.
  ".build-panel__reset",
  // …and F16's two. The tile is a LINK, which SC 2.5.8 sizes exactly as it
  // sizes a button; `.board-tile--empty` carries `.board-tile` too, so one
  // rule answers for both variants.
  ".board-tile",
  ".board-panel__browse",
] as const;

describe("I6 — the S touch floor, parsed from one token and re-derived per control", () => {
  it("23 — the floor is a TOKEN, defined once, and it clears the standard", () => {
    expect(TAP).toBeGreaterThanOrEqual(WCAG_TARGET_SIZE);
    // Consume, never define: app.css uses `--tap-target`, tokens.css owns it.
    expect(tokens.match(/--tap-target:/g)).toHaveLength(1);
    expect(cssPlain).not.toMatch(/--tap-target:\s*\d/);
    expect(cssPlain).toContain("var(--tap-target)");
    // CANARY. A floor below the standard must fail — if this file could not
    // tell 40 from 44 it would certify the defect it exists to close.
    expect(40).toBeLessThan(WCAG_TARGET_SIZE);
  });

  it("24 — every control in the census declares the floor at S, from the token", () => {
    for (const selector of S_TOUCH_FLOOR_CENSUS) {
      const rules = sRule(selector);
      expect(rules, `no S rule for ${selector}`).toHaveLength(1);
      const rule = rules[0] as string;
      expect(rule, `${selector} does not take the floor`).toContain(
        "min-height: var(--tap-target)",
      );
      // min-height, NOT height. `height: 44px` on a control whose content is
      // taller clips it; min-height also beats a smaller `height` on the used
      // value regardless of source order, which is what lets these rules sit
      // at the foot of the file without out-specifying `.btn--sm`.
      expect(rule, `${selector} sets a fixed height`).not.toMatch(/(?:^|;)\s*height:/);
    }
    // The tier chips are the ONLY targets narrower than they are tall — a 26px
    // `A` fails 44x44 on the width axis first — so they take the floor twice.
    expect(sRule(".filter-chip")[0]).toContain("min-width: var(--tap-target)");
  });

  it("25 — the canary: the shipped base heights are STILL under the floor", () => {
    // If a later slice raises `.btn--sm` at every width, these two go green-by-
    // accident and the S block above stops being load-bearing. That is a fact
    // worth failing on, so it is asserted rather than assumed.
    const smBase = px(app, /\.btn--sm \{[^}]*height:\s*(\d+)px/);
    const mdBase = px(app, /\.btn--md \{[^}]*height:\s*(\d+)px/);
    expect(smBase).toBe(28);
    expect(mdBase).toBe(36);
    expect(smBase).toBeLessThan(TAP);
    expect(mdBase).toBeLessThan(TAP);
    // §3.1 rev 2 ratified `sm` -> 36 at S on the premise that "`md` is the one
    // used for every header and dialog action". Not one `md` button renders in
    // this app — every call site passes size="sm" — so 36 would have left the
    // whole named set below §5.3's own invariant. Both sizes clear 44 here and
    // §3.1's size bullet needs a rev. Pinned so the divergence is not silent.
    for (const call of Object.entries(srcSources)) {
      const [path, source] = call as [string, string];
      if (!path.startsWith("/src/ui/")) continue;
      expect(stripComments(source), `${path} ships an md Button`).not.toContain('size="md"');
    }
  });

  it("26 — the raise is not masked: no clip anywhere below 768px", () => {
    // The shipped guard this mirrors is §16's `.attr-pane` pair. A reflow that
    // is hidden instead of fixed passes every height assertion above it.
    for (const body of S_BODIES) {
      expect(body).not.toContain("overflow-x: hidden");
      expect(body).not.toContain("overflow-x: clip");
      expect(body).not.toContain("overflow: hidden");
    }
    // The four rows that could not hold their contents at 390 once the
    // controls grew are WRAPPED, not clipped. `.banner` gets SHORTER doing it
    // (measured 143.95 -> 138.78 at 390): its actions rail was `flex: none` at
    // 232px inside a 368px box, so the body had 120px and broke over five
    // lines.
    for (const selector of [
      ".banner",
      ".reset-dialog__actions",
      ".import-dialog__actions",
      ".build-manager__list li",
      ".build-manager__row-actions",
    ]) {
      expect(sRule(selector)[0], `${selector} does not wrap`).toContain("flex-wrap: wrap");
    }
    // POSITIVE CANARY: the banned literals are detectable, so this cannot pass
    // by grepping for a string that never occurs.
    expect("  overflow-x: hidden;").toContain("overflow-x: hidden");
  });

  it("27 — the census is exactly the stylesheet: not short, and not long", () => {
    // Every selector that takes the floor below 768px, read back OUT of the
    // stylesheet. A new control raised without a census entry fails here, and
    // so does a census entry whose rule was deleted — which is the failure mode
    // an allowlist normally rots into.
    // The scan is floorSelectors() — the SAME function assertion 32's canaries
    // are fired through, so a canary red is evidence about this line.
    const declared = floorSelectors(S_BODIES, "min-height");
    expect([...declared].sort()).toEqual([...S_TOUCH_FLOOR_CENSUS].sort());
    // The three that already cleared it are NOT in the census and must not be
    // — each is pinned where its own slice wrote it, and duplicating them here
    // would let one be deleted while the other stayed green.
    expect(PIP_W_S).toBeGreaterThanOrEqual(TAP); // .pip, F5.3 assertion 8
    expect(px(app, /input\[type="range"\] \{\s*height:\s*(\d+)px/)).toBeGreaterThanOrEqual(TAP);
    // [A7] `.build-panel__reset` LEFT this trio and joined the census above —
    // it stopped being "pinned where its own slice wrote it" the moment its
    // rule started naming the token. Assertion 20 still owns the scoping
    // claim; the census now owns the floor claim, and 27 proves the two lists
    // do not overlap by construction.
  });

  it("28 — §5.3's sticky budget is re-derived, not re-typed, now layer 1 grew", () => {
    // Layer 1 is the jump nav, and §5.3's table gives its composition
    // literally: "44px chips + 2px padding each side". The chips are now the
    // floor, so the padding is what the budget actually funds.
    const navPadS = px(sRule(".jump-nav")[0] as string, /padding:\s*(\d+)px\s+0/);
    const JUMP_NAV_H_S = 2 * navPadS + TAP;
    expect(JUMP_NAV_H_S).toBe(48);
    expect(JUMP_NAV_H_S).toBeLessThanOrEqual(STICKY_LAYER_1_MAX);
    // Layer 2 is untouched — the digest measures 59 at 390 against its ≤88.
    expect(JUMP_NAV_H_S + STICKY_LAYER_2_MAX).toBeLessThanOrEqual(STICKY_TOTAL_MAX);

    // …and the offset the digest sits at. The base rule's `top: 44px` is the
    // nav's height at M and L, where the chips stay 28px; at S a 44px offset
    // would slide the digest 4px UNDER the nav. Derived from the same token.
    const ledgerTopS = sRule(".category-ledger").find((rule) => rule.includes("top:")) as string;
    const offset = /top:\s*calc\(var\(--tap-target\)\s*\+\s*(\d+)px\)/.exec(ledgerTopS);
    expect(offset, "the S sticky offset is not derived from --tap-target").not.toBeNull();
    expect(TAP + Number.parseInt((offset as RegExpExecArray)[1] as string, 10)).toBe(JUMP_NAV_H_S);
    // The M/L offset is UNCHANGED and still equals the nav's height there:
    // 2 x --space-2 of padding around a 28px chip.
    // DISAMBIGUATED, and it has to be: `.jump-nav` now declares `padding` in
    // TWO blocks, so spaceIn()'s exactly-one rule throws here by design. The
    // base block is the one that declares the sticky, and the S block is the
    // one that does not — named by a declaration, never by an ordinal.
    const navBase = blocksFor(app, ".jump-nav").find((block) =>
      block.includes("position: sticky"),
    ) as string;
    const navPadBase = spaceToken(
      (/padding:\s*var\(--([a-z0-9-]+)\)\s+0/.exec(navBase) as RegExpExecArray)[1] as string,
    );
    const navComposedML = 2 * navPadBase + px(app, /\.btn--sm \{[^}]*height:\s*(\d+)px/);
    expect(navComposedML).toBe(44);
    // …AND F14's hoisted token IS that composition, not a number that happens
    // to agree with it today. This is the assertion that gives the token teeth:
    // resize the chip and --sticky-jumpnav-h has to move with it, or the digest
    // slides under the nav and .col-right's scroll-padding-top under-reserves.
    expect(JUMPNAV_H).toBe(navComposedML);
    expect(cssBlock(app, ".category-ledger")).toContain("top: var(--sticky-jumpnav-h)");
  });

  it("29 — the pass is S-ONLY: no F9 rule can reach 768 and above", () => {
    // Bit-identical geometry at 768 / 1280 / 1440 is proved in the browser
    // (docs/proof/f9-verification.txt: 2678 and 2681 elements, zero differing).
    // What this file can prove is the reason it holds — every declaration is
    // inside a max-width block, and none of the four horizontal knobs that
    // would move the L layout was touched.
    // EVERY occurrence of the token in the stylesheet is inside an S block.
    // Subtracting the S bodies from the file must leave none behind — that is
    // the whole claim, checked by counting rather than by reading.
    const total = (cssPlain.match(/var\(--tap-target\)/g) ?? []).length;
    const insideS = S_BODIES.reduce(
      (sum, body) => sum + (body.match(/var\(--tap-target\)/g) ?? []).length,
      0,
    );
    expect(total).toBeGreaterThan(0);
    expect(insideS).toBe(total);
    // …and no OTHER media query carries it either — a `min-width` block would
    // satisfy the count above while moving the desktop layout.
    for (const query of ["(min-width: 768px)", "(min-width: 1280px)"]) {
      for (const body of mediaBodies(cssPlain, query)) {
        expect(body).not.toContain("--tap-target");
      }
    }
    // The four knobs the §16.5 right column's arithmetic rests on. A 3px move
    // in any of them flips `.summary` between two and three tracks, so they are
    // pinned by value here as well as measured in the browser.
    expect(SPACE_4).toBe(16); // page padding at >=768
    expect(SPACE_3).toBe(12); // the single column gap
    expect(RAIL).toBe(300); // the one rail
    expect(SECTION_CHROME).toBe(34); // 1px border + --space-4, both sides
  });
});

/* --------------------------------------------- I6, THE OTHER AXIS (§5.3) -- */

/** §5.3's floor is 44 x 44. Everything above grades ONE of those numbers.
 *
 *  `min-height` is half an invariant, and the census was structurally blind in
 *  two directions at once — to a control that is tall enough and TOO NARROW,
 *  and to a floor spelled as a `44px` LITERAL, which no `var(--tap-target)`
 *  probe can ever see. Three escapes came through those two holes:
 *
 *    1. `.synergy-board__button` — a literal `44px`. F11 predates the pass;
 *       assertion 27 matches the TOKEN, so the rule was invisible to it.
 *       Re-pointed and censused at integration.
 *    2. `.build-panel__reset` — the same shape again, deliberately scoped and
 *       correctly valued, and outside the census for two slices ([A7]).
 *    3. `.pin-control` + `.roll-seed__regen` — 36px and 34px WIDE at S while
 *       clearing the height floor for free by carrying `.btn`. Measured in
 *       Chrome, not parseable: their width is content-driven, so no assertion
 *       in this file could have seen it. The roll slice fixed it with a
 *       `min-width` — and that fix was then held by NOTHING. Its own comment
 *       says why, in as many words: "a min-width does not match its probe and
 *       the census stays exact." Deleting the rule kept every test green.
 *
 *  Three escapes of one class is a guard problem, not three authoring
 *  mistakes. So the width axis gets exactly what the height axis already has —
 *  a NAMED census, read back OUT of the stylesheet so it can rot in neither
 *  direction — plus a literal sweep that closes the hole shapes 1 and 2 came
 *  through, plus canaries (assertion 32) that prove both actually go RED.
 *
 *  WHAT THIS STILL CANNOT SEE, stated so the next slice does not over-trust
 *  it: a control whose width is content-driven and merely SMALL declares
 *  nothing, so nothing can be parsed. Escape 3 was found in the browser and
 *  the empirical census in docs/proof/f9-verification.txt is keyed on height
 *  (`h=`) with one hand-noted width. This block locks the FIX in place and
 *  makes the next one impossible to delete silently; it does not replace the
 *  measurement that finds them. */

/** The width-axis counterpart of S_TOUCH_FLOOR_CENSUS, on the same contract:
 *  assertion 31 proves it is neither short nor long against the stylesheet. */
const S_TOUCH_FLOOR_WIDTH_CENSUS = [
  // The shipped precedent. The tier chips are narrower than they are tall — a
  // 26px `A` fails 44x44 on the width axis first — so they take the floor
  // twice. Assertion 24 has always spot-checked this one; it is censused here
  // so it is covered by the read-back rather than by a single toContain.
  ".filter-chip",
  // Escape 3, now held. `Pin` measured 36px and the single-glyph regen `⟳`
  // 34px at S, both already 44 tall through `.btn`.
  ".pin-control",
  ".roll-seed__regen",
] as const;

/** The four rules permitted to spell a size as a NUMBER inside an S block.
 *  Each is frozen by an assertion that names the literal, which is why it may
 *  not be re-pointed at the token here: doing so would redden the very
 *  assertion that pins it. Anything NOT on this list must use the token. */
const S_LITERAL_SIZE_EXEMPT = new Set([
  ".pip", // F5.3, frozen — assertion 8 matches `width: 44px` verbatim
  '.attr-slider__row input[type="range"]', // F3 — assertion 27 pins the height
  '.attr-slider__row input[type="range"]::-webkit-slider-thumb', // F3, same rule
  '.attr-slider__row input[type="range"]::-moz-range-thumb', // F3, same rule
]);

describe("I6 — the S touch floor on the WIDTH axis, and the literal blind spot", () => {
  it("30 — every width-census control declares the floor at S, from the token", () => {
    for (const selector of S_TOUCH_FLOOR_WIDTH_CENSUS) {
      const rules = sRule(selector);
      expect(rules, `no S rule for ${selector}`).toHaveLength(1);
      const rule = rules[0] as string;
      expect(rule, `${selector} does not take the WIDTH floor`).toContain(
        "min-width: var(--tap-target)",
      );
      // The same reasoning assertion 24 applies to height: a fixed `width`
      // clips, and a `max-width` under the floor silently defeats min-width on
      // the used value no matter what order the rules land in.
      expect(rule, `${selector} sets a fixed width`).not.toMatch(/(?:^|;)\s*width:/);
      expect(rule, `${selector} caps its own width`).not.toMatch(/(?:^|;)\s*max-width:/);
    }
    // …and the floor they take is the one that clears the standard. TAP is
    // graded in 23; this ties the width axis to the same number rather than
    // letting it ride on a token that only the height axis checks.
    expect(TAP).toBeGreaterThanOrEqual(WCAG_TARGET_SIZE);
  });

  it("31 — the width census is exactly the stylesheet: not short, and not long", () => {
    // The direct analogue of 27, through the same scanner. A control given a
    // min-width without a census entry fails here; so does a census entry
    // whose rule was deleted — which is precisely how escape 3's fix was
    // unprotected before this assertion existed.
    const declared = floorSelectors(S_BODIES, "min-width");
    expect([...declared].sort()).toEqual([...S_TOUCH_FLOOR_WIDTH_CENSUS].sort());

    // THE LITERAL SWEEP — the hole escapes 1 and 2 came through. A floor
    // property spelled as a number is invisible to both read-backs, so it is
    // banned outright: there is no legitimate `min-height: 44px` or
    // `min-width: 44px` in this stylesheet and there are zero today.
    for (const { selector, property, value } of literalSizes(S_BODIES)) {
      if (property === "min-height" || property === "min-width") {
        expect.fail(
          `${selector} spells ${property} as ${value}px — use var(--tap-target) ` +
            `so the census can see it (this is the F11 / [A7] escape shape)`,
        );
      }
      // A hard `height`/`width` number is allowed only for the frozen four,
      // each pinned by an assertion that matches the literal itself.
      expect(
        S_LITERAL_SIZE_EXEMPT.has(selector),
        `${selector} hard-codes ${property}: ${value}px at S and is not a frozen rule`,
      ).toBe(true);
    }
  });

  it("32 — THE CANARIES: both new checks are red against the defects they name", () => {
    // A guard without a canary is how this became a recurring class rather
    // than a one-off, so each check below is fired at a stylesheet that
    // CONTAINS the defect, through the same functions the shipped assertions
    // use. If a refactor guts floorSelectors() or literalSizes(), these fail.

    // (a) DELETE ESCAPE 3'S FIX. The exact regression 31 exists to catch: the
    //     `min-width` rule goes away, every height assertion stays green, and
    //     the two controls are 36 / 34 wide again.
    const withoutFix = cssPlain.replace(
      /\.pin-control,\s*\.roll-seed__regen \{\s*min-width: var\(--tap-target\);\s*\}/,
      ".pin-control, .roll-seed__regen { color: inherit; }",
    );
    expect(withoutFix, "the canary did not actually remove the rule").not.toBe(cssPlain);
    const afterDeletion = floorSelectors(mediaBodies(withoutFix, "(max-width: 767px)"), "min-width");
    expect([...afterDeletion].sort()).not.toEqual([...S_TOUCH_FLOOR_WIDTH_CENSUS].sort());
    expect(afterDeletion.has(".pin-control")).toBe(false);
    expect(afterDeletion.has(".roll-seed__regen")).toBe(false);

    // (b) A NEW TOO-NARROW CONTROL. Tall enough, 34px wide, and declaring it —
    //     the shape a future slice adds. The width read-back is LONG and fails.
    const narrowSheet = `@media (max-width: 767px) {
      .canary-narrow { min-height: var(--tap-target); min-width: 34px; }
    }`;
    const narrowBodies = mediaBodies(narrowSheet, "(max-width: 767px)");
    // It clears the HEIGHT read-back — that is the whole point, and why the
    // height census alone certified escape 3.
    expect(floorSelectors(narrowBodies, "min-height").has(".canary-narrow")).toBe(true);
    // …and the literal sweep is what catches it.
    const narrowHits = literalSizes(narrowBodies).filter(
      (hit) => hit.property === "min-width" && hit.value < WCAG_TARGET_SIZE,
    );
    expect(narrowHits).toHaveLength(1);
    expect(narrowHits[0]?.selector).toBe(".canary-narrow");

    // (c) A HARD-CODED FLOOR — escapes 1 and 2 verbatim. Correct VALUE, wrong
    //     spelling, invisible to both token read-backs and caught by the sweep.
    const literalSheet = `@media (max-width: 767px) {
      .canary-literal { min-height: 44px; }
    }`;
    const literalBodies = mediaBodies(literalSheet, "(max-width: 767px)");
    expect(floorSelectors(literalBodies, "min-height").size).toBe(0); // invisible, as it was
    const literalHits = literalSizes(literalBodies);
    expect(literalHits).toHaveLength(1);
    expect(literalHits[0]).toEqual({ selector: ".canary-literal", property: "min-height", value: 44 });
    expect(S_LITERAL_SIZE_EXEMPT.has(".canary-literal")).toBe(false);

    // (d) …and the sweep is not vacuous on the SHIPPED sheet: it really does
    //     parse the frozen four, rather than returning nothing and passing.
    const shipped = literalSizes(S_BODIES).map((hit) => hit.selector);
    expect(shipped).toContain(".pip");
    expect(new Set(shipped)).toEqual(S_LITERAL_SIZE_EXEMPT);
  });
});

/* ------------------------------------------- F11: the Synergy board (§5) -- */

/**
 * F11 — the 2 x 8 Synergy board that heads the Synergy Slots <Section>.
 *
 * Same discipline as everything above: PARSE the numbers out of the shipped
 * stylesheet and RE-DERIVE the identity, with a canary for each that is red
 * against the arrangement it replaces. Nothing here pastes a threshold.
 *
 * The design's own §4.6 table (119.3 / 99.3 / 106.5 / 74.5 / 30.1) is wrong
 * by a uniform +6.25px per cell, and the binding margin at 1280 is +4.00px
 * rather than the +13.3 the design quoted. Two corrections compose to get
 * there and both ran optimistic: the cell arithmetic was 6.25px generous,
 * and NAME_MIN_CONTENT was pinned 3px light until it was measured. +4.00 is
 * now the number the next addition to a Synergy Slot column is checked
 * against — less than half of the +10.5 F5.4 flagged as binding on the
 * adjacent synergy-row question.
 *
 * RE-PINNED 2026-08-25 on ratification: NAME_MIN_CONTENT 68 -> 71 (the
 * ceiling of the measurement), CELL_FLOOR 86 -> 89, and the two container
 * thresholds 829 -> 853 and 440 -> 452. See NAME_MIN_CONTENT below and case
 * 1b for what the move buys.
 */

const BOARD_START = "/* ==== F11 board — start ==== */";
const BOARD_END = "/* ==== F11 board — end ==== */";

/** The board's own appended block, sliced between its delimiters. Slicing
 *  from AFTER the start marker matters: begin mid-comment and stripComments
 *  leaves the tail of that comment behind as pseudo-declarations, and every
 *  zero-list assertion below would be grading prose. */
const boardCssRaw = (() => {
  const start = app.indexOf(BOARD_START);
  const end = app.indexOf(BOARD_END);
  if (start === -1 || end === -1) {
    throw new Error("layout arithmetic: the F11 board block is not delimited in app.css");
  }
  return app.slice(start + BOARD_START.length, end);
})();
/** Declarations only. The block documents each ruling in prose beside the
 *  rule it governs, so the zero-list greps must not read the prose. */
const boardCss = stripComments(boardCssRaw);

const boardTableBlocks = blocksFor(boardCssRaw, ".synergy-board__table");
const boardTableBase = boardTableBlocks[0] as string;
const boardButtonBase = blocksFor(boardCssRaw, ".synergy-board__button")[0] as string;

/** The row-label column, INCLUDING the grid gutter that follows it — the
 *  track is declared `calc(72px - var(--space-2))` precisely so this literal
 *  appears as itself and the label-to-column junction is not a second gap. */
const ROW_LABEL_W = px(boardTableBase, /calc\((\d+)px - var\(--space-2\)\)/);
/** The grid's own column-gap. */
const CELL_GAP = spaceToken(
  (/column-gap:\s*var\(--([a-z0-9-]+)\)/.exec(boardTableBase) ??
    (() => {
      throw new Error("layout arithmetic: the board declares no column-gap");
    })())[1] as string,
);
/** PARSED FROM THE IMPLEMENTED RULE, never pinned. The seam is its own grid
 *  track, so it costs the box the track PLUS one extra gutter — and that sum
 *  is what BAND_DIVIDER means. Put --space-3 on both sides instead and this
 *  reads 25, the floor moves to 841, and the container query moves with it
 *  BY CONSTRUCTION rather than by someone remembering to. */
const SEAM_TRACK = (() => {
  const match = /calc\((\d+)px \+ var\(--([a-z0-9-]+)\) - var\(--([a-z0-9-]+)\)\)/.exec(
    boardTableBase,
  );
  if (match === null) throw new Error("layout arithmetic: the board declares no seam track");
  return (
    Number.parseInt(match[1] as string, 10) +
    spaceToken(match[2] as string) -
    spaceToken(match[3] as string)
  );
})();
const BAND_DIVIDER = SEAM_TRACK + CELL_GAP; // 13 = a 1px rule + --space-3

/** The cell's own chrome, parsed off the one button every interactive thing
 *  on the board is. */
const CELL_PAD = spaceIn(boardCssRaw, ".synergy-board__button", "padding", 0);
const CELL_BORDER = px(boardButtonBase, /border:\s*(\d+)px solid/);

/** RE-MEASURED IN HEADLESS CHROME AT THE CUT and RE-PINNED 68 -> 71 on the
 *  ratification of 2026-08-25: the min-content width of the dataset's longest
 *  single word at --text-xs. The word is verified — "Unpluckable", 11
 *  characters, tied with "Interceptor"; "High-Flying" is 11 but carries a
 *  hyphen break, so it breaks earlier and is not the binding case.
 *
 *  Chrome/151.0.7922.174 --headless=new over CDP, a width:min-content probe
 *  inside a real .synergy-board__button at viewport 1280
 *  (docs/proof/f11-verification.txt):
 *
 *    "Unpluckable"        70.156   <- binding
 *    "Interceptor"        62.563
 *    "High-Flying Denier" 36.969   (the hyphen breaks it early)
 *
 *  PINNED AT THE CEILING OF THE MEASUREMENT, 71, per §13.0.1's
 *  take-the-larger rule — the same rule that kept F5.4's NUMERIC_H at 27
 *  over a measured 26. A floor derived from a constant known to be LOW is
 *  optimistic, and an optimistic floor is not a floor.
 *
 *  WHAT THE RE-PIN BOUGHT, because "no visible change at any coverage width"
 *  invites someone to revert it. The paper 68 put the eight-column floor at
 *  829, and at box 829 a cell offers 68px of content against the 70.156 the
 *  longest badge name wants: the board went eight-wide into a band where its
 *  own longest name did not fit. At 853 the cell offers exactly 71 and the
 *  word fits AT the floor by construction. */
const NAME_MIN_CONTENT = 71;
/** The raw measurement the pin above is the ceiling of. Kept as its own
 *  constant so a future re-measure has something to disagree WITH. */
const NAME_MIN_MEASURED = 70.156;
const CELL_FLOOR = NAME_MIN_CONTENT + 2 * CELL_PAD + 2 * CELL_BORDER; // 86

/** The two container thresholds, parsed. Range syntax is used so the number
 *  in the stylesheet IS the derived demand — `max-width: 828px` would be the
 *  same seam expressed one pixel off, and the off-by-one is exactly the kind
 *  of thing a re-derivation should not have to know about. */
function containerThreshold(index: number): number {
  const all = [...boardCssRaw.matchAll(/@container \(width < (\d+)px\)/g)];
  const found = all[index];
  if (found === undefined) throw new Error(`layout arithmetic: no board @container #${index}`);
  return Number.parseInt(found[1] as string, 10);
}
const SPLIT_THRESHOLD = containerThreshold(0); // 8-wide floor
const PAIRS_THRESHOLD = containerThreshold(1); // 4-wide floor

/** The <Section> body the board sits in. REUSES F5.4's derivation rather
 *  than writing a fourth copy of `centre − SECTION_CHROME`: at L the box is
 *  the centre column less the <Section> chrome; below L the grid is one
 *  column and the page padding is all that is taken off first. */
function boardBox(viewport: number, scrollbar: number): number {
  if (viewport >= L_BREAKPOINT) return centreColumn(viewport, scrollbar) - SECTION_CHROME;
  return viewport - scrollbar - 2 * (viewport >= 768 ? SPACE_4 : SPACE_3) - SECTION_CHROME;
}
function cellW(box: number): number {
  return (box - ROW_LABEL_W - 7 * CELL_GAP - BAND_DIVIDER) / 8;
}
/** The narrow arrangements carry no divider — the split IS the divider — so
 *  they are one row label, n cells and n−1 gaps. */
function splitCellW(box: number, perBlock: number): number {
  return (box - ROW_LABEL_W - (perBlock - 1) * CELL_GAP) / perBlock;
}

const boardTsx = srcSources["/src/ui/synergy/SynergyBoard.tsx"] as string;
/** Code and user-visible copy, without the prose. The board's own docblock
 *  QUOTES both the banned string and the engine helpers it deliberately does
 *  not call, so every "must not contain" below has to read the code. */
const boardCode = stripComments(boardTsx);

describe("F11 — the Synergy board's geometry, re-derived", () => {
  it("1 — CELL_FLOOR composes from PARSED tokens, and 86 is nowhere in the stylesheet", () => {
    expect(CELL_PAD).toBe(SPACE_2);
    expect(CELL_BORDER).toBe(1);
    expect(CELL_FLOOR).toBe(NAME_MIN_CONTENT + 2 * SPACE_2 + 2);
    expect(CELL_FLOOR).toBe(89);
    // CANARY: the floor is a COMPOSITION. A hardcoded 89px in the block
    // would satisfy the arrangement while decoupling it from --space-2, so
    // re-tuning the token would silently stop moving the floor. The old 86
    // is checked too — a stale literal left behind by the re-pin is the
    // likeliest way this decouples in practice.
    expect(boardCss).not.toContain("89px");
    expect(boardCss).not.toContain("86px");
    expect(boardButtonBase).toContain("padding: var(--space-2)");
  });

  it("1b — the pin IS the ceiling of the measurement, and the word fits AT the floor", () => {
    // RATIFIED 2026-08-25: take-the-larger, 68 -> 71, floor 829 -> 853. This
    // case exists so a future re-measure REDS rather than annotates. If the
    // font stack, --text-xs or the dataset's longest word moves, the equality
    // below breaks and someone has to come here and re-derive the threshold
    // — which is the whole point of a pinned measurement.
    expect(NAME_MIN_CONTENT).toBe(Math.ceil(NAME_MIN_MEASURED));
    expect(NAME_MIN_CONTENT).toBeGreaterThanOrEqual(NAME_MIN_MEASURED);
    expect(CELL_FLOOR).toBe(89);

    // THE PROPERTY THE RE-PIN BUYS: at the eight-column floor the cell's own
    // CONTENT box is at least as wide as the longest single word. That was
    // FALSE at the old pin, and it is the defect, not the bookkeeping.
    const contentAtFloor = (box: number) => cellW(box) - 2 * CELL_PAD - 2 * CELL_BORDER;
    expect(contentAtFloor(SPLIT_THRESHOLD)).toBe(NAME_MIN_CONTENT);
    expect(contentAtFloor(SPLIT_THRESHOLD)).toBeGreaterThanOrEqual(NAME_MIN_MEASURED);

    // CANARY — the arrangement this replaced. The paper 68 put the floor at
    // 829, where the cell offered 68 against the 70.156 the word wants: the
    // board went eight-wide into a band its own longest name did not fit.
    const paperFloor = 68 + 2 * CELL_PAD + 2 * CELL_BORDER; // 86
    const paperSplit = 8 * paperFloor + ROW_LABEL_W + 7 * CELL_GAP + BAND_DIVIDER;
    expect(paperSplit).toBe(829);
    expect(contentAtFloor(paperSplit)).toBeLessThan(NAME_MIN_MEASURED);
    expect(SPLIT_THRESHOLD - paperSplit).toBe(24);

    // …and the same property holds at the four-wide and two-wide floors, so
    // the re-pin is not eight-wide-only.
    expect(splitCellW(PAIRS_THRESHOLD, 4) - 2 * CELL_PAD - 2 * CELL_BORDER).toBe(
      NAME_MIN_CONTENT,
    );
  });

  it("2 — the split threshold IS the derived demand, on the box the query evaluates", () => {
    expect(SPLIT_THRESHOLD).toBe(
      8 * CELL_FLOOR + ROW_LABEL_W + 7 * CELL_GAP + BAND_DIVIDER,
    );
    expect(SPLIT_THRESHOLD).toBe(853);
    // Self-consistent by construction: at the threshold the cell IS the floor.
    expect(cellW(SPLIT_THRESHOLD)).toBe(CELL_FLOOR);

    // The divider is PARSED, not pinned. --space-3 on BOTH sides costs 25 and
    // moves the floor to 841; this equality moves with it rather than lying.
    expect(BAND_DIVIDER).toBe(1 + SPACE_3);
    expect(SEAM_TRACK).toBe(1 + SPACE_3 - SPACE_2);

    // I16 — 829 is a CONTENT-box figure and the query evaluates the content
    // box. The two are the same number only because the board carries no
    // padding of its own; assert that, so a later slice that adds padding
    // fails here instead of shipping a threshold 2 x pad too small.
    expect(blocksFor(boardCssRaw, ".synergy-board")[0]).not.toContain("padding");

    // The second step is DERIVED too, not the design's undecided "~560".
    expect(PAIRS_THRESHOLD).toBe(4 * CELL_FLOOR + ROW_LABEL_W + 3 * CELL_GAP);
    expect(PAIRS_THRESHOLD).toBe(452);
    expect(splitCellW(PAIRS_THRESHOLD, 4)).toBe(CELL_FLOOR);
  });

  it("3 — eight columns fit at 1280 at every scrollbar, and CANNOT at 768", () => {
    for (const scrollbar of SCROLLBARS) {
      expect(cellW(boardBox(1280, scrollbar)), `scrollbar ${scrollbar}px`).toBeGreaterThanOrEqual(
        CELL_FLOOR,
      );
      expect(boardBox(1280, scrollbar)).toBeGreaterThanOrEqual(SPLIT_THRESHOLD);
    }
    // THE BINDING MARGIN, named at its true size, and it has been named wrong
    // twice. The design said +13.3 against a cell it computed 6.25px too
    // wide; the first cut of this file said +7.00 against a CELL_FLOOR built
    // on a NAME_MIN_CONTENT 3px light. Both errors ran the same direction —
    // optimistic — which is how a margin gets quoted to the next slice as
    // roomier than it is. It is +4.00.
    expect(boardBox(1280, 17)).toBe(885);
    expect(cellW(boardBox(1280, 17))).toBe(93);
    expect(cellW(boardBox(1280, 17)) - CELL_FLOOR).toBe(4);

    // 1440 is comfortable; the other two coverage widths are foreclosed and
    // that is what FORCES the split. Asserting the failure is the point.
    expect(boardBox(1440, 17)).toBe(1045);
    expect(cellW(boardBox(1440, 17))).toBe(113);
    expect(boardBox(768, 15)).toBe(687);
    expect(cellW(boardBox(768, 15))).toBeLessThan(CELL_FLOOR);
    expect(cellW(boardBox(768, 15))).toBe(68.25);
    expect(boardBox(390, 0)).toBe(332);
    expect(cellW(boardBox(390, 0))).toBeLessThan(CELL_FLOOR);

    // …and what the split actually renders there, on the semantic seam.
    expect(boardBox(768, 15)).toBeLessThan(SPLIT_THRESHOLD);
    expect(boardBox(768, 15)).toBeGreaterThanOrEqual(PAIRS_THRESHOLD);
    expect(splitCellW(boardBox(768, 15), 4)).toBe(147.75);
    expect(boardBox(390, 0)).toBeLessThan(PAIRS_THRESHOLD);
    expect(splitCellW(boardBox(390, 0), 2)).toBe(126);
    expect(splitCellW(boardBox(390, 0), 2)).toBeGreaterThan(CELL_FLOOR);
  });

  it("4 — the header renders slot.magnitude, and NO distribution is hardcoded", () => {
    // Synergy Slot 8 has been user-confirmed as the second +2. When that
    // ratification lands the shape becomes the seed's 6/2 and this component
    // must need NO edit — which reading `magnitude` gives for free, because
    // magnitudeForSynergySlot already derives from ratified ∪ user-designated
    // and `magnitude` is a persisted field on SynergySlot.
    expect(boardCode).toContain("(+{synergySlot.magnitude})");
    // CANARY: a hardcoded (+2) on columns 7 and 8 would silently disagree
    // with a loaded build. No literal boost appears in the board's markup.
    expect(boardCode).not.toMatch(/\(\+[12]\)/);
    // …and the board never re-derives the membership it should be reading.
    expect(boardCode).not.toContain("RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS");
    expect(boardCode).not.toContain("magnitudeForSynergySlot");
  });

  it("5 — BOARD_BOX reuses F5.4's derivation, chrome and all", () => {
    expect(centreColumn(1280, 17) - boardBox(1280, 17)).toBe(SECTION_CHROME);
    // CANARY: dropping the 34 — T16's root cause — reads 919 and hides a
    // −34px error at every width the board is derived at.
    expect(centreColumn(1280, 17)).toBe(919);
    expect(cellW(919)).toBeGreaterThan(cellW(885));
  });

  it("6 — the board adds NO third sticky layer in the card column (I5)", () => {
    expect(boardCss).not.toContain("position: sticky");
  });

  it("7 — the board opens NO third scrollport (§16.4)", () => {
    // A third one re-breaks find-in-page, scrollRestoration and every #cat-*
    // anchor. The board never needs one: below its floor it re-arranges.
    expect(boardCss).not.toContain("overflow");
  });

  it("8 — the board carries NO container transparency (I2 / design-spec §6)", () => {
    // The locked recipe is a canvas fill plus the muted token spelled out ON
    // the text — 6.15:1 — rather than a container the browser composites
    // into unreadability. `.synergy-row--dimmed` is a known live violation of
    // the same rule and is deliberately NOT touched by this slice.
    expect(boardCss).not.toContain("opacity");
    expect(app).toContain(".synergy-row--dimmed");
  });

  it("9 — the board DEFINES no token (src/styles/tokens.css is denied)", () => {
    expect(boardCss).not.toMatch(/--[a-z0-9-]+\s*:/);
    // …while genuinely consuming them, so the assertion above cannot pass by
    // the block having no colours at all.
    expect(boardCss).toContain("var(--fg-muted)");
    expect(boardCss).toContain("var(--info)");
    expect(boardCss).toContain("var(--bg-inset)");
  });

  it("10 — the board is not a --cat surface (§2.8.1's placement law)", () => {
    expect(boardCss).not.toContain("--cat");
  });

  it("11 — the board SPANS .synergy-panel's tracks", () => {
    expect(blocksFor(boardCssRaw, ".synergy-board")[0]).toContain("grid-column: 1 / -1");
    // The shipped precedent, eight lines from .synergy-panel's declaration.
    expect(cssBlock(app, ".synergy-panel > .banner")).toContain("grid-column: 1 / -1");
    // CANARY: without the span the board lands in ONE auto-fill track —
    // 436.5px at 1280 against an 829px floor, i.e. permanently four-wide.
    expect(synergyRowBox(1280, 17)).toBe(436.5);
    expect(synergyRowBox(1280, 17)).toBeLessThan(SPLIT_THRESHOLD);
  });

  it("12 — every board button clears the 44px touch floor at S (I6)", () => {
    // RE-POINTED AT INTEGRATION, same property, one source. As sealed, this
    // asserted F11's own block carried
    // `@media (max-width: 767px) { .synergy-board__button { min-height: 44px } }`
    // — correct on the branch, which was cut from `a5fe8e1` before F9's pass
    // existed. F9 landed `--tap-target` plus a census that reads the
    // stylesheet back, so the board's floor is now entry 12 of F9's S block
    // and is graded there by assertions 24 (declares the floor, from the
    // token, exactly once, and not as a fixed `height`) and 27 (the census is
    // the stylesheet, in both directions). Keeping the literal here would have
    // held a SECOND rule at the same value that assertion 27 is structurally
    // blind to, since it matches on the token.
    expect(S_TOUCH_FLOOR_CENSUS).toContain(".synergy-board__button");
    const boardTouch = sRule(".synergy-board__button");
    expect(boardTouch).toHaveLength(1);
    expect(boardTouch[0]).toContain("min-height: var(--tap-target)");
    expect(TAP).toBeGreaterThanOrEqual(44);
    // …and the board's own block no longer carries a floor of its own, so
    // there is exactly ONE place the number comes from. CANARY for the fold-in
    // itself: if a later slice re-adds a scoped literal here, this reds.
    expect(boardCss).not.toContain("min-height: 44px");
    // …and there is exactly ONE button class, so the rule above is total.
    // A second one would be a control the rule silently does not reach.
    const classNames = [...boardCode.matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map(
      (match) => match[1] as string,
    );
    const buttonClasses = classNames.filter((name) => name.includes("__button"));
    expect(buttonClasses.length).toBeGreaterThan(0);
    for (const name of buttonClasses) {
      expect(name, `board button class: ${name}`).toContain("synergy-board__button ");
    }
  });

  it("13 — the band's season-reset string DIFFERS from the row's", () => {
    // tests/ui/overlays.test.tsx does a global exact
    // getByText("⟳ Disabled by season-reset preview"), and getByText THROWS
    // on a second match. Asserted here, at source level, so a re-worded band
    // reds in this file first rather than in a RUN-never-edit ship gate.
    const ROW_STRING = "⟳ Disabled by season-reset preview";
    expect(boardCode).not.toContain(`"${ROW_STRING}"`);
    expect(boardCode).toContain("⟳ Temporary Synergy Slots disabled by season-reset preview");
    // The row's own string is untouched — four row statements become one BAND
    // statement, and nothing is compacted away.
    expect(srcSources["/src/ui/synergy/SynergyPanel.tsx"]).toContain(ROW_STRING);
  });
});

/* ------------------------------------------ F16: the Loadout board (§3) -- */

/**
 * F16 — six discipline panels of name cells: what you hold, and how full each
 * discipline is.
 *
 * Same discipline as every block above: PARSE the numbers out of the shipped
 * stylesheet and RE-DERIVE the identity, with a canary for each that is red
 * against the arrangement it replaces. Nothing here pastes a threshold.
 *
 * THE ONE MEASUREMENT IS BORROWED, NOT RETAKEN. A board tile and a Synergy
 * board cell pose the identical typographic problem — the dataset's longest
 * single word at --text-xs inside a padded, bordered box — so F16 consumes
 * F11's headless-Chrome NAME_MIN_CONTENT rather than measuring a second time
 * and inviting the two to drift. Assertion 1 pins that they are the same
 * number for the same reason.
 */

const F16_START = "/* ==== F16 Loadout board — start ==== */";
const F16_END = "/* ==== F16 Loadout board — end ==== */";

const loadoutCssRaw = (() => {
  const start = app.indexOf(F16_START);
  const end = app.indexOf(F16_END);
  if (start === -1 || end === -1) {
    throw new Error("layout arithmetic: the F16 board block is not delimited in app.css");
  }
  return app.slice(start + F16_START.length, end);
})();
/** Declarations only — the block documents each ruling in prose beside the
 *  rule it governs, so the zero-list greps must not read the prose. */
const loadoutCss = stripComments(loadoutCssRaw);

/** One declaration block from inside the F16 slice, by exact selector. */
function cssBlockIn(source: string, selector: string): string {
  const block = blocksFor(source, selector)[0];
  if (block === undefined) {
    throw new Error(`layout arithmetic: no ${selector} block in the F16 css`);
  }
  return block;
}

/** Both auto-fill floors, parsed off the rules that declare them. */
function autoFillFloor(block: string): number {
  return px(block, /repeat\(auto-fill,\s*minmax\((\d+)px,\s*1fr\)\)/);
}
const PANEL_TRACK = autoFillFloor(cssBlockIn(loadoutCssRaw, ".loadout-board"));
const TILE_TRACK = autoFillFloor(cssBlockIn(loadoutCssRaw, ".board-panel__tiles"));

const PANEL_GAP = spaceIn(loadoutCssRaw, ".loadout-board", "gap", 0);
const PANEL_PAD = spaceIn(loadoutCssRaw, ".board-panel", "padding", 0);
const PANEL_BORDER = px(cssBlockIn(loadoutCssRaw, ".board-panel"), /border:\s*(\d+)px solid/);
const TILE_PAD = spaceIn(loadoutCssRaw, ".board-tile", "padding", 0);
const TILE_BORDER = px(cssBlockIn(loadoutCssRaw, ".board-tile"), /border:\s*(\d+)px solid/);
const TILE_GAP = spaceIn(loadoutCssRaw, ".board-panel__tiles", "gap", 0);

/** The tile's meta line, which the design never costed and which turns out to
 *  be the BINDING driver rather than the name: a 20px level disc, an optional
 *  synergy glyph and the cost with its unit, gap-separated.
 *
 *  `UI_XS_ADVANCE` 6.5 is the same per-character figure the summary roster's
 *  own derivation uses at --text-xs. The synergy glyph is priced at TWO
 *  advances rather than one — emoji-class glyphs render wider than a Latin
 *  character in every system stack, and §13.0.1's take-the-larger rule says a
 *  floor derived from a constant known to be low is not a floor. */
const XS_ADVANCE = 6.5;
const LEVEL_DISC = px(cssBlockIn(loadoutCssRaw, ".board-tile__level"), /width:\s*(\d+)px/);
const ROLE_GLYPH_MAX = Math.ceil(2 * XS_ADVANCE); // 13
/** The dearest badge in the shipped table is one digit, so "7 pts" is the
 *  widest cost string the dataset can produce. Asserted against the DATA in
 *  case 2 rather than assumed here. */
const TILE_COST_MAX = Math.ceil("7 pts".length * XS_ADVANCE); // 33
const TILE_META_MAX =
  LEVEL_DISC + SPACE_1 + ROLE_GLYPH_MAX + SPACE_1 + TILE_COST_MAX; // 74

/** F11'S COMPOSITION, over the WIDER of the two drivers. F11's cell carries a
 *  name and nothing else, so its floor is the name's; a board tile carries a
 *  name AND a meta row, and the meta row is 3px wider. Same formula, one more
 *  term inside the max — not a second, independent measurement. */
const TILE_FLOOR = Math.max(NAME_MIN_CONTENT, TILE_META_MAX) + 2 * TILE_PAD + 2 * TILE_BORDER; // 92

/** Two cells with NO slack — the OVERFLOW floor, i.e. the width below which a
 *  panel cannot hold two cells at all. */
const PANEL_OVERFLOW_FLOOR =
  2 * TILE_FLOOR + TILE_GAP + 2 * PANEL_PAD + 2 * PANEL_BORDER; // 218
/** …and the DESIGN floor: the same two cells with a full --space-6 of comfort
 *  each. The gap between the two is the slack a panel derived to its floor
 *  would not have. */
const PANEL_TRACK_DERIVED =
  2 * (TILE_FLOOR + SPACE_6) + TILE_GAP + 2 * PANEL_PAD + 2 * PANEL_BORDER; // 266

/** auto-fill's own arithmetic, written once: the most tracks of at least
 *  `floor` that fit `box`, and the width each of them then gets. */
function autoFillTracks(box: number, floor: number, gap: number): number {
  return Math.max(1, Math.floor((box + gap) / (floor + gap)));
}
function autoFillWidth(box: number, floor: number, gap: number): number {
  const n = autoFillTracks(box, floor, gap);
  return (box - (n - 1) * gap) / n;
}
/** A panel's own content box, inside its border and padding. */
function panelContent(track: number): number {
  return track - 2 * PANEL_PAD - 2 * PANEL_BORDER;
}
/** The narrowest tile the board produces at a viewport. */
function boardTileW(viewport: number, scrollbar: number): number {
  const track = autoFillWidth(boardBox(viewport, scrollbar), PANEL_TRACK, PANEL_GAP);
  return autoFillWidth(panelContent(track), TILE_TRACK, TILE_GAP);
}

const boardSrc = stripComments(srcSources["/src/ui/board/LoadoutBoard.tsx"] as string);
const panelSrc = stripComments(srcSources["/src/ui/board/DisciplinePanel.tsx"] as string);
const tileSrc = stripComments(srcSources["/src/ui/board/BadgeTile.tsx"] as string);
const modelSrc = stripComments(srcSources["/src/ui/board/board-model.ts"] as string);
const F16_SOURCES = { boardSrc, panelSrc, tileSrc, modelSrc };

describe("F16 — the Loadout board's geometry, re-derived", () => {
  it("1 — TILE_FLOOR is F11's measurement, composed from PARSED tokens", () => {
    expect(TILE_PAD).toBe(SPACE_2);
    expect(TILE_BORDER).toBe(1);
    expect(TILE_FLOOR).toBe(Math.max(NAME_MIN_CONTENT, TILE_META_MAX) + 2 * SPACE_2 + 2);
    expect(TILE_FLOOR).toBe(92);
    // ONE measurement, TWO consumers. A board tile and a Synergy board cell
    // are the same typographic box for the NAME; taking a second measurement
    // of the same word is how two floors that must agree come to disagree.
    // The board's floor is 3px above F11's for a named reason and no other:
    // the tile carries a meta row that a Synergy cell does not.
    expect(NAME_MIN_CONTENT).toBe(CELL_FLOOR - 2 * SPACE_2 - 2);
    expect(TILE_FLOOR - CELL_FLOOR).toBe(TILE_META_MAX - NAME_MIN_CONTENT);
    // …and it is the CEILING of a real measurement, not a paper figure.
    expect(NAME_MIN_CONTENT).toBe(Math.ceil(NAME_MIN_MEASURED));
    // CANARY. The design's paper 86 must NOT be the answer — at 86 the cell
    // offers 68px of content against the 70.156 the longest badge name wants,
    // i.e. a floor its own binding word does not fit inside, before the meta
    // row is priced at all.
    const paperFloor = 68 + 2 * SPACE_2 + 2;
    expect(paperFloor).toBe(86);
    expect(paperFloor).toBeLessThan(TILE_FLOOR);
    expect(paperFloor - 2 * SPACE_2 - 2).toBeLessThan(NAME_MIN_MEASURED);
  });

  it("2 — the META ROW is the binding driver, which the design never costed", () => {
    expect(LEVEL_DISC).toBe(20);
    // The dearest badge in the shipped table is a single digit, so "7 pts" is
    // the widest cost string the DATA can produce. Read off the dataset, not
    // assumed — a future tier table with a two-digit cost widens this row and
    // must move the floor with it.
    const dearest = Math.max(
      ...Object.values(shippedDataset.tierCosts).flatMap((costs) => Object.values(costs)),
    );
    expect(String(dearest)).toHaveLength(1);
    expect(TILE_COST_MAX).toBe(Math.ceil(`${String(dearest)} pts`.length * XS_ADVANCE));
    // AND IT IS WIDER THAN THE NAME. design.md §3.6 derived its cell floor
    // from the longest badge name alone and never priced the meta row; on a
    // tile that also carries a level disc, a synergy glyph and a cost, the
    // meta row wins by 3px. Recorded as the reason the two floors differ.
    expect(TILE_META_MAX).toBeGreaterThan(NAME_MIN_CONTENT);
    expect(TILE_META_MAX - NAME_MIN_CONTENT).toBe(3);
  });

  it("3 — PANEL_TRACK is DERIVED as the two-cell floor plus --space-6 per cell", () => {
    expect(PANEL_PAD).toBe(SPACE_3);
    expect(PANEL_BORDER).toBe(1);
    expect(TILE_GAP).toBe(SPACE_2);
    expect(PANEL_GAP).toBe(SPACE_3);
    expect(PANEL_OVERFLOW_FLOOR).toBe(218);
    expect(PANEL_TRACK_DERIVED).toBe(266);
    expect(PANEL_TRACK).toBe(PANEL_TRACK_DERIVED);
    expect(PANEL_TRACK - PANEL_OVERFLOW_FLOOR).toBe(2 * SPACE_6);
    // …and the tile grid's own floor IS the tile floor, not a rounder number.
    expect(TILE_TRACK).toBe(TILE_FLOOR);
    // CANARY. A panel derived to its OVERFLOW floor is the knife edge the rail
    // derivation already refused once — two cells that fit and nothing more.
    expect(panelContent(PANEL_OVERFLOW_FLOOR)).toBe(2 * TILE_FLOOR + TILE_GAP);
    expect(autoFillWidth(panelContent(PANEL_OVERFLOW_FLOOR), TILE_TRACK, TILE_GAP)).toBe(
      TILE_FLOOR,
    );
    // …while the chosen track gives each cell a full --space-6 above it.
    expect(autoFillWidth(panelContent(PANEL_TRACK), TILE_TRACK, TILE_GAP)).toBe(
      TILE_FLOOR + SPACE_6,
    );
  });

  it("3b — 266 AND NOT the design's 258, for TWO named corrections", () => {
    // design.md §3.6 derived 258 from a cell floor of 86, and 86 from a paper
    // NAME_MIN_CONTENT of 68. Two things moved it, both upward, and neither
    // is a preference:
    //   (i)  F11 MEASURED the word in headless Chrome: 68 -> 71.
    //   (ii) the meta row, never costed by the design, is wider still: 71 -> 74.
    // Recorded as arithmetic so nobody "restores" the design's figure.
    const designFloor = 68 + 2 * SPACE_2 + 2; // 86
    const designTrack =
      2 * (designFloor + SPACE_6) + TILE_GAP + 2 * PANEL_PAD + 2 * PANEL_BORDER;
    expect(designTrack).toBe(254);
    expect(PANEL_TRACK - designTrack).toBe(2 * (TILE_META_MAX - 68));
    expect(TILE_META_MAX - 68).toBe(6); // 3 measured + 3 never costed
  });

  it("4 — the coverage table: no tile is ever narrower than its floor", () => {
    // auto-fill makes this STRUCTURAL rather than lucky: the browser takes the
    // most tracks of at least `floor` that fit, so each resulting track is
    // >= floor by construction. The table is here to show the arrangement, and
    // the inequality is asserted at every plausible scrollbar because that is
    // the term the board does not control.
    const coverage: Array<[number, number, number, number]> = [
      // viewport, scrollbar, panels per row, tiles per row
      [1440, 17, 3, 3],
      [1280, 17, 3, 2],
      [768, 15, 2, 3],
      [390, 0, 1, 3],
    ];
    for (const [viewport, scrollbar, panels, tiles] of coverage) {
      const box = boardBox(viewport, scrollbar);
      expect(autoFillTracks(box, PANEL_TRACK, PANEL_GAP), `panels at ${viewport}`).toBe(panels);
      const track = autoFillWidth(box, PANEL_TRACK, PANEL_GAP);
      expect(
        autoFillTracks(panelContent(track), TILE_TRACK, TILE_GAP),
        `tiles at ${viewport}`,
      ).toBe(tiles);
    }
    for (const viewport of [1440, 1280, 768, 390]) {
      for (const scrollbar of SCROLLBARS) {
        expect(
          boardTileW(viewport, scrollbar),
          `tile at ${viewport}/s=${scrollbar}`,
        ).toBeGreaterThanOrEqual(TILE_FLOOR);
      }
    }
    // The narrowest tile in the coverage set is at 390, not at 1280 — below
    // 1280 the 300px attributes pane does not exist and the board gets the
    // whole width, so the SMALL viewport is where the cells are tightest.
    const at390 = Math.min(...SCROLLBARS.map((s) => boardTileW(390, s)));
    const at1280 = Math.min(...SCROLLBARS.map((s) => boardTileW(1280, s)));
    expect(at390).toBeLessThan(at1280);
    // CANARY: a floor that could not tell a sub-floor cell from a legal one
    // would certify anything. A 300px tile track cannot fit two cells in the
    // 261px panel content at 1280.
    expect(autoFillTracks(panelContent(autoFillWidth(boardBox(1280, 17), PANEL_TRACK, PANEL_GAP)), 300, TILE_GAP)).toBe(1);
  });

  it("5 — three panel columns at 1280, because there is NO detail region", () => {
    // design.md §5.5 put the panels at TWO columns at 1280. That figure was
    // derived against a 312px BoardDetail track beside them, which this cut
    // does not build — so the panels take the whole 885 and fit three. Stated
    // rather than discovered, because a later slice that adds the detail
    // region takes the third column back.
    const box = boardBox(1280, 17);
    expect(box).toBe(885);
    expect(autoFillTracks(box, PANEL_TRACK, PANEL_GAP)).toBe(3);
    const DETAIL_TRACK = 312;
    expect(autoFillTracks(box - DETAIL_TRACK - SPACE_6, PANEL_TRACK, PANEL_GAP)).toBe(2);
  });
});

describe("F16 — the board's bans, asserted by absence", () => {
  it("6 — NO scrollport and NO sticky layer", () => {
    // A third scrollport re-breaks find-in-page, scroll restoration and every
    // #cat-* anchor; a third sticky layer in the card column breaks the
    // two-layer cap the whole sticky stack is derived against.
    // `overflow-wrap` is legal and load-bearing — it is what keeps a long
    // badge name inside its cell — so the ban is on the SCROLL properties,
    // named exactly rather than by the shared prefix.
    for (const banned of ["overflow:", "overflow-x:", "overflow-y:", "overflow-block"]) {
      expect(loadoutCss, `the board declares ${banned}`).not.toContain(banned);
    }
    expect(loadoutCss).not.toContain("position: sticky");
    expect(loadoutCss).not.toContain("position: fixed");
    // POSITIVE CANARY: the pattern really does catch a scrollport.
    expect("  overflow-y: auto;").toContain("overflow-y:");
    expect("  overflow-wrap: anywhere;").not.toContain("overflow:");
  });

  it("7 — NO new breakpoint, NO container query, NO new token, NO opacity", () => {
    // Every arrangement is an auto-fill outcome, which is continuous in the
    // viewport. The ONE media query is the shipped S touch floor.
    const queries = [...loadoutCss.matchAll(/@media \(([^)]+)\)/g)].map((m) => m[1] as string);
    expect(queries.sort()).toEqual(["forced-colors: active", "max-width: 767px"]);
    expect(loadoutCss).not.toContain("@container");
    expect(loadoutCss).not.toMatch(/^\s*--[a-z0-9-]+:/m);
    expect(loadoutCss).not.toContain("opacity");
    // …and no bare touch-floor literal. A hard-coded 44px is invisible to the
    // census assertion, which reads the stylesheet back by matching the TOKEN
    // — exactly how F11's floor escaped it once.
    expect(loadoutCss).not.toContain("44px");
    expect(loadoutCss).toContain("min-height: var(--tap-target)");
  });

  it("8 — the board CANNOT be seen by the H2 overlay guardrail or the row helper", () => {
    // overlays.test.tsx compares node collections selected by
    // `.category-ledger*`, `.ledger-overview*` and `.summary` across all four
    // overlay combinations, and synergy-panel.test.tsx indexes rows by
    // `.synergy-row`. The board's cells legitimately change under
    // reactionsActive and its markup sits inside neither region, so it must
    // not borrow any of those namespaces — one shared class re-indexes ~20
    // assertions at once.
    for (const banned of [
      "category-ledger",
      "ledger-overview",
      ".summary",
      "synergy-row",
      "synergy-board",
      "badge-card",
    ]) {
      expect(loadoutCss, `the F16 block reaches ${banned}`).not.toContain(banned);
      for (const [name, source] of Object.entries(F16_SOURCES)) {
        expect(source, `${name} reaches ${banned}`).not.toContain(banned);
      }
    }
  });

  it("9 — the board DISPATCHES NOTHING: no write path to the build exists", () => {
    // The single strongest safety property of this cut, and it is structural
    // rather than promised. A project that has shipped four data-destruction
    // defects gains ZERO new write paths from this view: Remove and synergy
    // assignment were designed for a detail region this cut does not build,
    // and both stay where they already ship.
    for (const [name, source] of Object.entries(F16_SOURCES)) {
      for (const banned of [
        "onSetLevel",
        "assignSynergy",
        "clearSynergy",
        "onSynergySlotsChange",
        "setSynergySlots",
        "clearSynergyReferencesTo",
        "localStorage",
      ]) {
        expect(source, `${name} calls ${banned}`).not.toContain(banned);
      }
    }
    // The ONE thing it writes is FILTER state, and it writes it from App.tsx.
    expect(appTsxF14).toContain("const browseCategoryInGrid = (category: Category)");
    expect(boardSrc).toContain("onBrowseCategory");
  });

  it("10 — it builds no over-by string and re-derives no capacity rule", () => {
    // P0-1: one builder, N consumers. The panel is the THIRD production
    // consumer of the shared over-by strings — after the in-grid digest and
    // the rail Ledger overview — and it authors neither.
    expect(panelSrc).toContain("overByBadgePoints");
    expect(panelSrc).toContain("overByBadgeSlots");
    expect(panelSrc).toContain('from "../grid/CategoryLedger"');
    for (const [name, source] of Object.entries(F16_SOURCES)) {
      expect(source, `${name} authors an over-by string`).not.toMatch(/over by/i);
    }
    // The 0 = capacity not set ruling comes from the ENGINE predicate, never
    // from a local comparison. A function that knows what a capacity number
    // MEANS is a rule.
    expect(panelSrc).toContain("badgeSlotsCapacityUnset");
    expect(panelSrc).toContain('from "../../engine/ledger"');
    for (const [name, source] of Object.entries(F16_SOURCES)) {
      expect(source, `${name} re-derives the unset predicate`).not.toMatch(
        /equipSlots\s*===?\s*0/,
      );
    }
    // POSITIVE CANARY: the two patterns really do catch what they claim to.
    expect(/over by/i.test('const s = `over by ${n} ⚠`;')).toBe(true);
    expect(/equipSlots\s*===?\s*0/.test("budget.equipSlots === 0")).toBe(true);
  });

  it("11 — no ranking, no scoring, no recommendation, and no invented mechanic", () => {
    // A board is exactly the surface someone will want to add a suggester to.
    // The working agreement forbids it: the tool shows what FITS, the user
    // chooses. The order is the DATASET's, which is a property of the data
    // rather than of the build.
    for (const [name, source] of Object.entries(F16_SOURCES)) {
      for (const banned of [
        ".sort(",
        "recommend",
        "optimal",
        "best",
        "score",
        "rank",
        "suggest",
      ]) {
        expect(source, `${name} contains ${banned}`).not.toContain(banned);
      }
    }
    expect(modelSrc).toContain("for (const badge of dataset.badges)");
  });
});

describe("F16 — the --cat identity surface the board adds", () => {
  /** The six explicit rules, read back OUT of the stylesheet. Written the way
   *  the summary roster's caption is written — a `[data-category]` attribute
   *  selector naming its own token — rather than by consuming the inherited
   *  `var(--cat)`, because the board is not inside a `#cat-*` element and has
   *  no --cat to inherit. */
  const titleRules = [
    ...loadoutCssRaw.matchAll(
      /\.board-panel\[data-category="([a-z]+)"\] \.board-panel__title \{\s*color:\s*var\(--cat-([a-z]+)\);/g,
    ),
  ].map((match) => ({ category: match[1] as string, token: match[2] as string }));

  it("(a) all six disciplines resolve, and each pairs with its OWN token", () => {
    expect(titleRules).toHaveLength(CATEGORIES.length);
    // The category and the token are compared to each other, not to a list —
    // a copy-paste that pairs `defense` with `--cat-rebounding` is invisible
    // to a list check and fatal to the identity channel.
    for (const rule of titleRules) {
      expect(rule.token, `${rule.category} takes the wrong token`).toBe(rule.category);
    }
    expect(titleRules.map((rule) => rule.category).sort()).toEqual(
      CATEGORIES.map((category) => category.toLowerCase()).sort(),
    );
  });

  it("(b) NO other board selector references a --cat token at all", () => {
    // Read off the STYLESHEET rather than off the list above, so a selector
    // invented later is caught too. Identity stops at the title: not the
    // numerals, not the fence, not a tile, not the over-by.
    for (const block of loadoutCssRaw.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/var\(--cat/.test(block[2] as string)) continue;
      const selector = (block[1] as string).trim().replace(/\s+/g, " ");
      expect(selector, `unexpected --cat consumer: ${selector}`).toMatch(
        /^\.board-panel\[data-category="[a-z]+"\] \.board-panel__title$/,
      );
    }
  });

  it("(c) --danger never overrides --cat on the title (identity is not state)", () => {
    // A title that flips hue to red when the panel is over capacity makes a
    // red Defense heading indistinguishable from "you are over budget". State
    // lives on the fence, on the metric that is genuinely over, on the
    // warning glyph and on the words.
    for (const block of loadoutCssRaw.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = (block[1] as string).trim();
      if (!selector.includes("board-panel__title")) continue;
      expect((block[2] as string).includes("--danger"), `${selector} took --danger`).toBe(false);
    }
    // …and --danger really is on the two state surfaces, so this is not
    // passing by the absence of the token from the whole block.
    expect(cssBlockIn(loadoutCssRaw, ".board-panel__fence")).toContain("var(--danger)");
    expect(loadoutCss).toContain(".board-panel__metric--over");
  });

  it("(d) colour is never the only carrier of any board state", () => {
    // Every state has a second, non-colour channel, and each is asserted in
    // the place that renders it rather than promised in prose.
    expect(tileSrc).toContain("levelLetter"); // purchase level: the LETTER
    expect(tileSrc).toContain('"⚡"'); // Fuse: a glyph…
    expect(loadoutCss).toContain("border-left: 3px solid var(--accent)"); // …and a SOLID edge
    expect(tileSrc).toContain('"↺"'); // Reaction: a glyph…
    expect(loadoutCss).toContain("border-left: 3px dashed var(--info)"); // …and a DASHED edge
    expect(tileSrc).toContain("＋"); // empty: a glyph…
    expect(tileSrc).toContain("Badge Slot"); // …and the words
    expect(cssBlockIn(loadoutCssRaw, ".board-tile--empty")).toContain("border: 1px dashed"); // …and a dashed rim
    expect(tileSrc).toContain("⚠"); // stale: a glyph…
    expect(tileSrc).toContain("no longer qualifies at this level"); // …and the words
    // …and the tarnish is the ABSENCE of the specular highlight, not a hue.
    expect(loadoutCssRaw).toContain('.board-tile[data-stale="true"] .board-tile__level {');
    expect(
      cssBlockIn(loadoutCssRaw, '.board-tile[data-stale="true"] .board-tile__level'),
    ).toContain("box-shadow: none");
    // the fence: tiles below a RULE, plus the shipped words and glyph
    expect(loadoutCssRaw).toContain(".board-panel__fence::before");
    // the panel title: the category's own NAME, as text
    expect(panelSrc).toContain("{category}");
  });
});

describe("F16 — the mount, the anchors and the landing position", () => {
  it("12 — the board is a SECTION in the page flow: no route, no tab, no toggle", () => {
    // Two <Section>s in one document is what makes "switching cannot mutate
    // the plan" true by CONSTRUCTION — there is no switch to prove innocent.
    expect(appTsxF14).toContain('id="panel-board"');
    expect(appTsxF14).toContain('<Section title="Loadout board" storageKey="section-board">');
    // A view state must never share a namespace with the build envelope.
    expect(appTsxF14).toContain('storageKey="section-board"');
    for (const banned of ["aria-selected", 'role="tab"', "createBrowserRouter", "history.push"]) {
      expect(appTsxF14, `the board introduced ${banned}`).not.toContain(banned);
    }
  });

  it("13 — it sits BETWEEN the grid and the Synergy Slots panel, inside .col-right", () => {
    const colRight = appTsxF14.indexOf('className="col-right"');
    const grid = appTsxF14.indexOf('<main id="badge-grid"');
    const board = appTsxF14.indexOf('id="panel-board"');
    const synergy = appTsxF14.indexOf('id="panel-synergy"');
    const summary = appTsxF14.indexOf('id="panel-summary"');
    expect(colRight).toBeLessThan(grid);
    expect(grid).toBeLessThan(board);
    expect(board).toBeLessThan(synergy);
    expect(synergy).toBeLessThan(summary);
    // NOTHING IS RE-PARENTED. All three panels are still .col-right siblings,
    // the grid is still the <main>, and the shell's permanent band is
    // untouched — the board is scrollable content, not chrome.
    expect(permanentBand()).toBe(HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H);
    expect(MIN_SHELL_H).toBe(768);
  });

  it("14 — the jump nav gains ONE chip and the panel group stays front-loaded", () => {
    const nav = appTsxF14.slice(
      appTsxF14.indexOf("panelAnchors={["),
      appTsxF14.indexOf("]}", appTsxF14.indexOf("panelAnchors={[")),
    );
    expect(nav).toContain('{ id: "panel-board", label: "Board" }');
    // Board before Synergy before Summary — the chip order is the page order.
    expect(nav.indexOf("panel-board")).toBeLessThan(nav.indexOf("panel-synergy"));
    expect(nav.indexOf("panel-synergy")).toBeLessThan(nav.indexOf("panel-summary"));
    // The chip row scrolls rather than wrapping, so a fourth chip needs no
    // width budget — but the nav's HEIGHT is a sticky-stack term and must not
    // have moved.
    expect(cssBlock(app, ".jump-nav")).toContain("overflow-x: auto");
    expect(JUMPNAV_H).toBe(44);
  });

  it("15 — a #badge-* landing is DERIVED from the reserve, not typed", () => {
    // The first anchors that point INTO a category section. A card sits under
    // BOTH sticky layers, so the whole stack is reserved — unlike
    // .grid-section, which lands under layer 1 alone.
    const li = cssBlockIn(loadoutCssRaw, ".grid-section__cards > li");
    expect(li).toContain(
      "scroll-margin-top: calc(var(--sticky-stack-h) - var(--scroll-reserve))",
    );
    // ONE landing position, both modes. The two properties ADD, so what the
    // element lands at is `scroll-margin-top + scroll-padding-top`, i.e.
    // `(want − reserve) + reserve`. The reserve cancels, by construction.
    const reserveDoc = px(app, /--scroll-reserve:\s*(\d+)px/);
    expect(reserveDoc).toBe(0); // the document scroller declares none
    const landing = (want: number, reserve: number): number => want - reserve + reserve;
    expect(landing(STICKY_STACK_H, reserveDoc)).toBe(STICKY_STACK_H); // document scroller
    expect(landing(STICKY_STACK_H, STICKY_STACK_H)).toBe(STICKY_STACK_H); // .col-right
    expect(STICKY_STACK_H).toBe(120);
    // CANARY: a naive `scroll-margin-top: 120px` would land at 240 under the
    // shell — the whole reserve of overshoot, invisible on the document
    // scroller and wrong in the mode the app actually runs in.
    const naive = (want: number, reserve: number): number => want + reserve;
    expect(naive(STICKY_STACK_H, STICKY_STACK_H)).toBe(240);
    expect(naive(STICKY_STACK_H, STICKY_STACK_H)).not.toBe(landing(STICKY_STACK_H, STICKY_STACK_H));
    // The id itself is built in ONE place and consumed by both ends.
    expect(modelSrc).toContain("export function badgeAnchorId");
    expect(appTsxF14).toContain("id={badgeAnchorId(badge.id)}");
    expect(modelSrc).toContain("href: `#${badgeAnchorId(badge.id)}`");
  });
});

/* ============================ F13 — the physique strip ==================== */

/** MEASURED in headless Chrome (Chrome/151, --headless=new, driven over CDP
 *  against the production `vite build` output loaded from file://, dpr 1) on
 *  the tree this slice replaces. `.section` box + the `.build-panel`
 *  --space-3 flex gap that went with it — what the setup panel gave back
 *  when Physique left it.
 *
 *  Same canary-only exposure as LEDGER_H and PHYSIQUE_H above: these feed the
 *  before/after identity at the foot of this file and nothing else. */
const PHYSIQUE_BLOCK_1280 = 290.56 + SPACE_3; // 302.56
const PHYSIQUE_BLOCK_390 = 309.75 + SPACE_3; // 321.75

/** The strip that replaced it, measured the same way at rest (no clamp
 *  standing, no drift banner). At 1280 it is ONE row: the tallest of the
 *  Position fieldset, the Height fieldset and the wrapped Position hint,
 *  plus the strip's own --space-3 padding-block. At 390 the three-track row
 *  cannot fit (see the media query) and it stacks. */
const STRIP_H_1280 = 92.19;
const STRIP_H_390 = 199.56;

/** Top of the page → top of the first badge card, measured on both trees in
 *  the same session at the zero state (setup panel default-open, which is
 *  what a first load renders and what the reported defect was a picture of). */
const LEAD_BEFORE_1280 = 1596.7;
const LEAD_AFTER_1280 = 1386.33;

/** THE PHONE CARVE-OUT (user ruling). Below 768 the strip is not rendered and
 *  Physique is the <Section> it was pre-F13, so 390 is UNCHANGED — in every
 *  state, not just the two headline ones. All four re-measured after the
 *  carve-out, pre-F13 tree vs this one, same session, same driver. */
const LEAD_390_REST = 3396.86; // zero state, panel open
const LEAD_390_CLAMP = 3384.86; // a clamp standing (Any -> C)
const LEAD_390_LATCHED = 656; // the steady state, panel collapsed
const LEAD_767 = 2405.7; // the last width below the seam

describe("F13 — Physique as a full-bleed strip, not a block in the setup panel", () => {
  it("1 — the strip is a SIBLING of the banner region, after it, and outside .layout", () => {
    const appTsx = srcSources["/src/App.tsx"] as string;
    const banners = appTsx.indexOf('className="app-banners"');
    const strip = appTsx.indexOf("<PhysiqueStrip");
    const layout = appTsx.indexOf('<div className="layout">');
    const grid = appTsx.indexOf('id="badge-grid"');
    expect(banners).toBeGreaterThan(-1);
    expect(strip).toBeGreaterThan(banners); // AFTER the banners …
    expect(strip).toBeLessThan(layout); // … and before the layout grid.
    expect(strip).toBeLessThan(grid); // §4.5's skip target still clears it.

    // F13 CARVE-OUT: the strip is GATED on the M query, and App owns that
    // query with the SAME negation direction as the L one — jsdom has no
    // matchMedia, so both must default to the desktop shape or a large,
    // hard-to-attribute set of component tests silently flips to mobile.
    expect(appTsx).toContain('const isWide = !useMediaQuery("(max-width: 767px)")');
    expect(appTsx).toContain("{isWide ? <PhysiqueStrip");
    // MUTUALLY EXCLUSIVE, expressed once: the panel gets the bundle exactly
    // when the strip does not.
    expect(appTsx).toContain("physique={isWide ? null : physiqueProps}");

    // NOT NESTED IN THE BANNER. The banner renders only on a dataVersion
    // mismatch or a deserializer strip/heal report; the strip is
    // unconditional. Nesting would tie the lifetime of a control surface to
    // a conditional disclosure. Checked from the banner's side too, so a
    // future edit to either file trips it.
    expect(srcSources["/src/ui/shell/DriftBanner.tsx"]).not.toContain("Physique");
    const bannerBlock = appTsx.slice(banners, layout);
    expect(bannerBlock).toContain("<DriftBanner");
    expect(bannerBlock.indexOf("</div>")).toBeLessThan(bannerBlock.indexOf("<PhysiqueStrip"));
  });

  it("2 — the arrangement CAPS and never stretches", () => {
    const row = cssBlock(app, ".physique-strip__row");
    // Two intrinsic tracks for the two controls, ONE `1fr` for the prose.
    expect(row).toContain("grid-template-columns: max-content max-content minmax(0, 1fr)");
    expect(row).toContain("display: grid");

    // THE DEFECT THIS EXISTS TO PREVENT, checked at its own source. Every
    // width cap in this repo — .summary's track cap, F5.4/A1's ledger
    // override — was written because a control in a box far wider than its
    // content got stretched to fill it. A full-width Physique row would put
    // each number input at ~434px. It cannot: the base rule is untouched and
    // no rule in the strip re-declares the field's width.
    expect(cssBlock(app, ".number-field input")).toContain("width: 56px");
    for (const block of blocksFor(app, ".physique-strip .number-field")) {
      expect(block).not.toMatch(/(?:^|;)\s*width:/);
    }
    expect(stripComments(app)).not.toMatch(/\.physique-strip[^{]*\{[^}]*width:\s*100%/);
    expect(stripComments(app)).not.toMatch(/\.physique-strip[^{]*input[^{]*\{[^}]*width:/);

    // CANARY — the number the cap is worth, derived rather than quoted. At
    // 1280 the strip's content box is 1248px. Hand the two number inputs a
    // `1fr` track each instead of leaving them at their own width and they
    // resolve to 600px apiece — an order of magnitude over 56, and the same
    // failure F5.4's addendum measured at ~434 in the narrower setup panel.
    const contentBox = 1280 - 2 * SPACE_4;
    expect(contentBox).toBe(1248);
    const ifStretched = (contentBox - 2 * SPACE_6) / 2;
    expect(ifStretched).toBe(600);
    expect(ifStretched / 56).toBeGreaterThan(10);
  });

  it("3 — the clamp notice owns a ROW, so it can appear without moving a control", () => {
    const notice = cssBlock(app, ".physique-strip .height-field__notice");
    expect(notice).toContain("grid-column: 1 / -1");
    expect(notice).toContain("grid-row: 2");

    // The Position hint is placed by NAMED EXCLUSION, not by source order.
    // The notice carries `class="hint height-field__notice"` and is a direct
    // child of the same row, so a bare `> .hint` selects both and the
    // notice's placement then depends on which rule comes last in the file.
    expect(app).toContain(".physique-strip__row > .hint:not(.height-field__notice) {");
    expect(stripComments(app)).not.toMatch(/\.physique-strip__row\s*>\s*\.hint\s*\{/);

    // MEASURED, both widths: the notice's arrival grows the strip by exactly
    // one --text-xs line box plus one row-gap, and the Position fieldset and
    // the Height fieldset do not move at all.
    // `.hint` overrides the body line-height to 1.6, so lineBox() (which is
    // derived from BODY_LH) is the wrong ruler here. Parsed from the rule
    // that actually governs the notice.
    const hintLh = Number(
      (/line-height:\s*([\d.]+)/.exec(cssBlock(app, ".hint")) ??
        (() => {
          throw new Error("no .hint line-height");
        })())[1] as string,
    );
    expect(hintLh).toBe(1.6);
    const noticeCost = TEXT_XS * hintLh + SPACE_2;
    expect(noticeCost).toBeCloseTo(119.38 - STRIP_H_1280, 1);
    expect(noticeCost).toBeCloseTo(226.75 - STRIP_H_390, 1);
  });

  it("4 — Physique is out of the panel AND out of the pane, and the latch followed it", () => {
    const buildPanel = srcSources["/src/ui/build/BuildPanel.tsx"] as string;
    const body = buildPanel.slice(buildPanel.indexOf("export function BuildPanel"));
    // The panel's own subtree names Budgets, never Physique.
    expect(body).not.toContain("<PhysiqueStrip");
    expect(body).toContain("<BudgetGrid");
    // [A7] …and no longer Reset. The control moved OUT of the panel's own
    // subtree and onto the Attributes <Section>'s summary, which is declared
    // above `export function BuildPanel` in this file — so it must be absent
    // here and present there. Asserted BOTH ways: a one-sided check would go
    // green if the control were simply deleted.
    expect(body).not.toContain("build-panel__reset");
    const attrSection = buildPanel.slice(
      buildPanel.indexOf("export function AttributesSection"),
      buildPanel.indexOf("export function BuildPanel"),
    );
    expect(attrSection).toContain("build-panel__reset");

    // THE LATCH IS SCOPED TO WHAT THE PANEL RENDERS — the same §16.5 rule
    // F5.4 wrote, applied to the surface F13 moved. With Physique in the
    // strip, `build.position` is a control on the other side of the layout,
    // and F5.4's own addendum flagged the consequence: picking a position
    // collapsed the panel the user was working in.
    const latch = body.slice(body.indexOf("const hasValues"), body.indexOf("const latchArmed"));
    expect(latch).toContain("hasBudgetValues");
    expect(latch).not.toContain("build.position");
    // M/S is bit-identical: that branch never carried the position term.
    expect(latch).toContain("build.attributes");

    // The digest stopped reciting height and position, because the strip
    // renders both permanently and a collapsed panel is not hiding them.
    //
    // F13 CARVE-OUT: below 768 Physique is back inside this panel, so the
    // panel's own children are width-dependent again — but through the ONE
    // seam prop, never a query asked here.
    expect(body).toContain("physique !== null ? <PhysiqueSection");
    // …and it still asks NO media query of its own (§16.10's one-owner rule).
    // Matched on the CALL, not the word: the F5.4 docblock says "no longer
    // calls useMediaQuery at all" in prose, and a bare substring check would
    // fail on the very comment that documents the rule.
    expect(buildPanel).not.toContain("useMediaQuery(");

    // THE DIGEST FOLLOWS THE SURFACE. It exists to say what a COLLAPSED
    // panel is hiding: at >=768 that is the budget totals only, because the
    // strip shows height and position permanently; below 768 the panel
    // hides Physique too, so the pre-F13 digest comes back with it. Both
    // halves are guarded — an unconditional digest in either direction is
    // the defect.
    const digest = body.slice(body.indexOf("const digest"), body.indexOf("return (", body.indexOf("const digest")));
    expect(digest).toContain("pts");
    expect(digest).toContain("Badge Slots");
    expect(digest).toContain("physique !== null");
    expect(digest).toContain("formatHeightInches");
    expect(digest).toContain("build.position");
  });

  it("5 — keys, landmarks and the two-sticky-layer cap all survive", () => {
    const appTsx = srcSources["/src/App.tsx"] as string;
    const buildPanel = srcSources["/src/ui/build/BuildPanel.tsx"] as string;
    // The four keys assertion 15 pins are untouched — no preference resets.
    expect(buildPanel).toContain('storageKey="section-attributes"');
    expect(buildPanel).toContain('"section-build-panel"');
    expect(buildPanel).toContain('storageKey="section-budget"');
    expect(appTsx).toContain('storageKey="section-ledger-overview"');
    // `section-physique` SURVIVES, and after the F13 carve-out that is the
    // correct answer rather than a leftover: the <Section> it keys still
    // renders below 768. A phone user's collapsed-Physique preference is
    // still honoured, exactly as it was pre-F13.
    expect(buildPanel).toContain('storageKey="section-physique"');

    // Both landmarks the slice had to keep, plus the strip's own name.
    expect(appTsx).toContain('aria-label="Build"');
    expect(appTsx).toContain('aria-label="Ledger overview"');
    expect(appTsx).toContain('aria-label="Attributes"');
    // The strip's landmark exists at >=768. Below 768 there is no strip and
    // Physique is inside `aria-label="Build"`, which is where it was
    // pre-F13 — so no width leaves those two controls outside a landmark.
    expect(buildPanel).toContain('aria-label="Physique"');

    // I5: the strip is in normal flow above <main>, so it scrolls away. A
    // third sticky layer would break the cap §5.3 sets at two.
    for (const block of blocksFor(app, ".physique-strip")) {
      expect(block).not.toContain("position: sticky");
    }
  });

  it("6 — below 768 the strip is NOT RENDERED, and its stacking CSS is GONE", () => {
    // THE ARITHMETIC BEHIND THE CARVE-OUT. Grid tracks sized to
    // `max-content` do not wrap — they overflow. Measured, the two controls
    // demand this much before the prose column gets a pixel:
    const positionTrack = 256.73; // identical at 390 and 1280
    const heightTrack = 214.02; // ft + in + the `= NN in` echo
    const demand = positionTrack + SPACE_6 + heightTrack;
    expect(demand).toBeCloseTo(494.75, 2);

    // At 390 that does not fit, so the bar is not a bar — it stacks, which
    // is the same vertical block the slice set out to remove, minus the
    // ability to collapse it. The user ruled: don't render it there.
    const contentBox390 = 390 - 2 * SPACE_4;
    expect(contentBox390).toBe(358);
    expect(demand).toBeGreaterThan(contentBox390);

    // At 768 — the narrowest width the strip ever lays out at — it clears by
    // 241px, and still clears with a 17px classic scrollbar.
    const contentBox768 = 768 - 2 * SPACE_4;
    expect(contentBox768).toBe(736);
    expect(contentBox768 - demand).toBeGreaterThan(SPACE_6 * 10);
    expect(contentBox768 - 17 - demand).toBeGreaterThan(0);

    // AND THE STACKING RULES ARE DELETED, not left behind reading as live.
    // A media query for a surface that never renders at that width is dead
    // CSS that a later reader will trust.
    expect(stripComments(app)).not.toMatch(/@media \(max-width: 767px\)\s*\{\s*\.physique-strip/);
    expect(stripComments(app)).not.toMatch(/\.physique-strip[^{]*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    // Exactly ONE .physique-strip__row block survives — the base one. Two
    // would mean a width-scoped variant came back.
    expect(blocksFor(app, ".physique-strip__row")).toHaveLength(1);
  });

  it("7 — the lead at >=768: what the strip bought, and what it costs", () => {
    // Physique's block cost at 1280, and the strip that replaced it.
    expect(PHYSIQUE_BLOCK_1280 - STRIP_H_1280).toBeCloseTo(210.37, 2);

    // …and that difference IS the whole of the change in lead, to the pixel.
    // Nothing else in the document moved: the strip is additive above
    // `.layout` and the panel shrank by exactly the block it lost.
    expect(LEAD_BEFORE_1280 - LEAD_AFTER_1280).toBeCloseTo(PHYSIQUE_BLOCK_1280 - STRIP_H_1280, 2);

    // THE COST, RECORDED RATHER THAN OMITTED. Once the one-shot latch has
    // fired, the pre-F13 panel collapsed to a 53px digest and took Physique
    // down with it, out of sight. The strip does not collapse, so in the
    // LATCHED state it is pure additive lead — measured 753 -> 845.19 at
    // 1280, exactly the strip's own height. That is what permanent access to
    // the two controls costs at a width where the bar is one row.
    expect(845.19 - 753).toBeCloseTo(STRIP_H_1280, 2);
  });

  it("8 — the phone carve-out: 390 is UNCHANGED, in every state", () => {
    // WHY THE CARVE-OUT EXISTS, as the arithmetic the user ruled on. At 390
    // the strip stacked to 199.56px and could not collapse, so the latched
    // lead went 656 -> 855.56 — +199.56px on EVERY visit, against a -122.19
    // zero-state gain seen once, on the device this app is used on.
    expect(PHYSIQUE_BLOCK_390 - STRIP_H_390).toBeCloseTo(122.19, 2);
    expect(855.56 - LEAD_390_LATCHED).toBeCloseTo(STRIP_H_390, 2);
    expect(STRIP_H_390).toBeGreaterThan(PHYSIQUE_BLOCK_390 - STRIP_H_390);

    // AND THE RESULT: with the strip not rendered below 768, all four
    // measured 390 states are byte-identical to the pre-F13 tree. Pinned as
    // exact equalities, because "unchanged" is the whole claim.
    expect(LEAD_390_REST).toBe(3396.86);
    expect(LEAD_390_CLAMP).toBe(3384.86);
    expect(LEAD_390_LATCHED).toBe(656);
    expect(LEAD_767).toBe(2405.7);

    // THE ONE THING THAT HAD TO BE PUT BACK BY HAND, and it is not the one
    // it looked like. HeightField's notice is a SIBLING of the fieldset now,
    // so inside a <Section> it is a FOURTH child of `.section__body` — which
    // is a flex column with a --space-3 gap. The notice therefore bought an
    // extra gap it never used to cost, and the clamp state measured +12.
    // (`.attr-group`'s bottom margin is also 12px and sits between the same
    // two elements; it was the first suspect and it was not the cause.)
    expect(spaceIn(app, ".section__body", "gap", 0)).toBe(SPACE_3);
    const zeroed = cssBlock(app, ".build-panel .height-field:has(+ .height-field__notice)");
    expect(zeroed).toContain("margin-bottom: 0");
    const notice = cssBlock(app, ".build-panel .height-field__notice");
    expect(notice).toContain("margin-top: calc(-1 * var(--space-3))"); // cancels the gap
    expect(notice).toContain("margin-bottom: var(--space-3)"); // …below it, where it was
    // Scoped to the panel: the strip lays the notice out as a grid row and
    // never had a flex gap to cancel.
    expect(stripComments(app)).not.toMatch(/\.physique-strip[^{]*__notice[^{]*\{[^}]*margin-top/);
  });

  it("9 — the copy consolidation and the latch fix hold at BOTH widths", () => {
    // These two are NOT part of the carve-out. The strip reverts below 768;
    // the copy and the latch do not, because neither depends on the
    // arrangement. One shared body is what makes that structural rather
    // than a promise: `PhysiqueControls` is authored once and both
    // `PhysiqueStrip` and `PhysiqueSection` render it.
    const buildPanel = srcSources["/src/ui/build/BuildPanel.tsx"] as string;
    expect(buildPanel).toContain("function PhysiqueControls(");
    expect(buildPanel.match(/<PhysiqueControls \{\.\.\.props\} \/>/g)).toHaveLength(2);
    // The dropped recitation is dropped once, in the shared body, so it
    // cannot come back at one width only.
    expect(buildPanel.match(/Sets the available height range\./g)).toHaveLength(1);
    expect(buildPanel).not.toContain("Sets the available height range (");
  });
});

/* =========================================================== F14 — the shell */

/**
 * The app shell: 100dvh, two scrollports, no document scroll.
 * features/app-shell/design.md §8.2, re-derived against the MEASURED tree.
 *
 * FOUR OF THE DESIGN'S SEVEN VERTICAL INPUTS MOVED WHEN THEY WERE MEASURED, and
 * the gate literal moved 108px with them. That is why every assertion below
 * derives rather than pins: the numbers this slice turns on are browser
 * measurements of surfaces three other slices own, and any of them can move
 * again. What is pinned here is the FORMULA and the OUTCOME RULE.
 */

/** The shell's own at-rule header, and every assertion resolves through it so
 *  a moved gate cannot leave a stale copy behind in one of them. */
const SHELL_HEADER = (() => {
  const match = /@media \(min-width: (\d+)px\) and \(min-height: (\d+)px\) \{/.exec(app);
  if (match === null) throw new Error("layout arithmetic: no F14 shell media query");
  return { text: match[0], width: Number(match[1]), height: Number(match[2]) };
})();

/** Brace-matched body of an at-rule, by header text. A slice-to-EOF would
 *  absorb the @supports fallback and make every "the shell declares X"
 *  assertion answerable by the block that UNDOES X. */
function balancedBody(source: string, header: string, from = 0): string {
  const start = source.indexOf(header, from);
  if (start === -1) throw new Error(`layout arithmetic: at-rule not found — ${header}`);
  let depth = 0;
  for (let at = start + header.length - 1; at < source.length; at += 1) {
    if (source[at] === "{") depth += 1;
    else if (source[at] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, at + 1);
    }
  }
  throw new Error(`layout arithmetic: unbalanced at-rule — ${header}`);
}

const SHELL_BLOCK = balancedBody(app, SHELL_HEADER.text);
const SUPPORTS_BLOCK = balancedBody(app, "@supports not (height: 100dvh) {");
const shellPlain = stripComments(SHELL_BLOCK);

/** One rule's declarations out of the shell block, by exact selector list. */
function shellRule(selector: string): string {
  for (const rule of shellPlain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (rule[1] as string).split(",").map((s) => s.trim().replace(/\s+/g, " "));
    if (selectors.includes(selector)) return rule[2] as string;
  }
  throw new Error(`layout arithmetic: the shell block declares no "${selector}"`);
}

/* ---- the vertical inputs, MEASURED in headless Chrome at the cut ---------- */

/** Chrome/151.0.7922.174 --headless=new over CDP at 1280 x 900, zero state,
 *  docs/proof/f14-verification.txt. Every one of these is a getBoundingClientRect
 *  height off the SHIPPED tree, not a paper sum, because the shell makes each of
 *  them a permanent subtraction from the card region rather than something the
 *  user can scroll past.
 *
 *  HEADER_H IS THE BIG ONE and it is measured AT 1280 on purpose, because the
 *  gate is a single literal that must hold at the NARROWEST shelled viewport.
 *  F14 measured 102 there and was right to: the header FLEX-WRAPPED to two rows
 *  at 1280 and was one row only at 1440. F15 removed the wrap rather than paying
 *  for it (see the F15 block below for the horizontal derivation), so 1280 and
 *  1440 now agree at 62 and the binding case costs 40px less.
 *
 *  STRIP_H is F13's full-bleed Physique strip at 92.19, pinned at its CEILING per
 *  §13.0.1's take-the-larger rule — a low chrome figure yields an optimistic gate,
 *  and an optimistic gate is not a gate. */
const HEADER_H = 62;
const STRIP_H = 93;
const HEADER_H_MEASURED = 62;
const HEADER_H_WRAPPED = 102;
const STRIP_H_MEASURED = 92.19;
/** `.layout { padding-block: var(--space-4) }`, both edges. The shell overrides
 *  padding-INLINE only, so this term is parsed rather than measured. */
const PAGE_PAD_Y = 2 * SPACE_4;
/** design-spec §5.3's outcome rule, as the fraction NOT available to cards. */
const CARDS_FLOOR_FRACTION = 0.6;

/** I18, as one function. Everything the viewport owes before a badge card can
 *  have a pixel, under a layout that cannot grow. */
const permanentBand = (): number => HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H;
const MIN_SHELL_H = Math.ceil(permanentBand() / (1 - CARDS_FLOOR_FRACTION));

/** Both scrollports get the SAME height — they are siblings in one flex row. */
const scrollerH = (viewport: number): number => viewport - HEADER_H - STRIP_H - PAGE_PAD_Y;
const cardsBand = (viewport: number): number => scrollerH(viewport) - STICKY_STACK_H;
/** `slidersVisible` takes the pane's box; under the shell that box is the flex
 *  row rather than `viewport − 2 × --space-3`. */
const shellSlidersVisible = (viewport: number): number =>
  slidersVisible(scrollerH(viewport) + 2 * SPACE_3, SECTION_LEAD_Y);

/* ---- the horizontal identity: the shell must move NOTHING ---------------- */

/** `.col-right`'s CONTENT box under the shell. The document scrollbar is gone,
 *  so the OS width is charged inside the grid track by `scrollbar-gutter`
 *  instead of outside `.layout` — and the page padding drops 16 → 12 to fund
 *  the 4px focus-ring gutter that the move makes necessary. */
function colRightContentShell(viewport: number, scrollbar: number): number {
  return viewport - 2 * SPACE_3 - SPACE_3 - RAIL - scrollbar - 2 * SPACE_1;
}
/** The same box WITHOUT the compensation pair — the canary. */
function colRightContentUncompensated(viewport: number, scrollbar: number): number {
  return viewport - 2 * SPACE_4 - SPACE_3 - RAIL - scrollbar;
}

const scrollMemory = srcSources["/src/ui/shell/scroll-memory.ts"] as string;
const appTsxF14 = srcSources["/src/App.tsx"] as string;

describe("F14 — the app shell, derived rather than pinned", () => {
  it("1 — min-height: 0 exists on every box the shell asks to shrink", () => {
    // A flex or grid item's AUTOMATIC MINIMUM SIZE refuses to shrink below its
    // content. Omit this on .layout and the shell simply does not scroll — the
    // whole layout turns on one invisible declaration, which is this slice's
    // F5.2-D1. Named individually so a failure says WHICH box lost it.
    expect(shellRule(".app-shell")).toContain("min-height: 0");
    // OUT OF FLOW, and it is not a stylistic choice. The root element's
    // overflow propagates to the VIEWPORT and the root's own used overflow
    // becomes `visible`, so `html, body { overflow: hidden }` leaves the
    // viewport a scroll container the browser can still drive — measured at an
    // 8584px scrolling area, and an anchor click moved it 365px and took the
    // header off screen. Taking the shell out of flow leaves nothing to move.
    expect(shellRule(".app-shell")).toContain("position: fixed");
    expect(stripComments(SUPPORTS_BLOCK)).toContain("position: static");
    expect(shellRule(".app-shell > .layout")).toContain("min-height: 0");
    expect(shellRule(".attr-pane-column")).toContain("min-height: 0");
    expect(shellRule(".attr-pane")).toContain("min-height: 0");
    expect(shellRule(".col-right")).toContain("min-height: 0");
    // …and .layout is the one that gets forgotten, so it also carries the grow.
    expect(shellRule(".app-shell > .layout")).toContain("flex: 1 1 auto");
    expect(shellRule(".app-shell > *")).toContain("flex: 0 0 auto");

    // CANARY: a shell block missing it on the growing item must not read as
    // compliant just because the other four have it.
    const fixture = ".app-shell > .layout { flex: 1 1 auto; }";
    expect(fixture).not.toContain("min-height: 0");
  });

  it("2 — the shell block is the LAST 1280px block in the file", () => {
    // Reversed, F5.4's block wins and silently restores `position: sticky` and
    // a max-height on the pane — a layout that looks nearly right and scrolls
    // the document underneath a pane that no longer clamps.
    const f54 = app.lastIndexOf("@media (min-width: 1280px) {");
    expect(f54).toBeGreaterThan(-1);
    expect(app.indexOf(SHELL_HEADER.text)).toBeGreaterThan(f54);
    // …and F5.4's own block is untouched: still sticky, still the vh/dvh pair.
    const paneBase = cssBlock(app, ".attr-pane");
    expect(paneBase).toContain("position: sticky");
    expect(paneBase).toContain("max-height: calc(100vh - var(--space-6))");
    expect(paneBase).toContain("max-height: calc(100dvh - var(--space-6))");
  });

  it("3 — THE GATE IS DERIVED, and the CSS literal is >= the derivation", () => {
    expect(SHELL_HEADER.width).toBe(L_BREAKPOINT);
    expect(MIN_SHELL_H).toBe(768);
    expect(SHELL_HEADER.height).toBeGreaterThanOrEqual(MIN_SHELL_H);

    // WHAT MOVED, and why this assertion is the one that matters. The design
    // document was written with no search tooling and derived 753 → 760 from
    // HEADER_H 70 and a sticky stack of 107. Measured, the header is 102 at
    // 1280 and the L stack is 120, so the gate is 868. Both deltas are recorded
    // so a re-measure can disagree with a number rather than with a memory.
    const asDesigned = Math.ceil((70 + 92 + PAGE_PAD_Y + 107) / (1 - CARDS_FLOOR_FRACTION));
    expect(asDesigned).toBe(753);
    expect(MIN_SHELL_H - asDesigned).toBe(15);

    // …AND WHY THE GATE THEN FELL 100px. F14's 868 was honest arithmetic over a
    // header that wrapped; it was also a gate no ordinary laptop could reach —
    // a 1440x900 display leaves roughly 810 CSS px after browser chrome, so the
    // shell was dead code for its whole audience. F15 unwrapped the header
    // instead of accepting the 40px, and ONLY HEADER_H moved. Both figures are
    // kept so the fall is auditable rather than remembered.
    const wrapped = Math.ceil(
      (HEADER_H_WRAPPED + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H) / (1 - CARDS_FLOOR_FRACTION),
    );
    expect(wrapped).toBe(868);
    expect(wrapped - MIN_SHELL_H).toBe(100);
    expect(HEADER_H_WRAPPED - HEADER_H).toBe(40);
    // 810 is the laptop the slice exists for: excluded at 868, shelled at 768.
    expect(810).toBeLessThan(wrapped);
    expect(810).toBeGreaterThanOrEqual(MIN_SHELL_H);

    // CANARY, and it is the whole point of the formula being in the suite: a
    // future slice that adds 40px of always-visible chrome and leaves the
    // literal alone must FAIL here rather than shrink the cards in silence.
    const withMoreChrome = Math.ceil(
      (HEADER_H + STRIP_H + 40 + PAGE_PAD_Y + STICKY_STACK_H) / (1 - CARDS_FLOOR_FRACTION),
    );
    expect(withMoreChrome).toBe(868);
    expect(SHELL_HEADER.height).toBeLessThan(withMoreChrome);
  });

  it("4 — the >= 60% outcome rule holds AT the gate, and the margin is reported", () => {
    const atGate = cardsBand(SHELL_HEADER.height) / SHELL_HEADER.height;
    expect(atGate).toBeGreaterThanOrEqual(CARDS_FLOOR_FRACTION);
    // 60.03% — the gate is AT THE LIMIT by construction, which is the honest
    // place for it. Reported rather than merely passed so the next reader sees
    // that there is 0.03pp of room, not "plenty". F15 bought the cards 100px of
    // GATE, not of margin: the ratio at the gate is the same knife-edge it was
    // at 868, because the formula is what sets it.
    expect(Number((atGate * 100).toFixed(2))).toBe(60.03);
    expect(Number(((cardsBand(900) / 900) * 100).toFixed(1))).toBe(65.9);
    // …and the laptop the slice exists for, which 868 excluded outright.
    expect(Number(((cardsBand(810) / 810) * 100).toFixed(1))).toBe(62.1);

    // …and one pixel below the gate the rule FAILS, which is why the gate is a
    // media condition instead of a hope.
    expect(cardsBand(SHELL_HEADER.height - 1) / (SHELL_HEADER.height - 1)).toBeLessThan(
      CARDS_FLOOR_FRACTION,
    );
    expect(cardsBand(767) / 767).toBeLessThan(CARDS_FLOOR_FRACTION);
    // The shape the gate exists for: a 1366x768 laptop is ~648 CSS px tall.
    expect(Number(((cardsBand(648) / 648) * 100).toFixed(1))).toBe(52.6);
  });

  it("5 — I15 under the shell: the floor moved, and the OLD floor now fails", () => {
    // §16.12 state 50 asserted >= 6 / 7 / 8 at 700 / 800 / 900 against the
    // sticky pane. The shell takes the header, the strip and the page padding
    // out of the pane's box permanently, so the floor is re-cut — and the
    // regression has to be VISIBLE in the suite, not only in a document.
    expect(shellSlidersVisible(900)).toBe(6);
    expect(shellSlidersVisible(SHELL_HEADER.height)).toBe(5);
    // The sticky tree's own counts at the same viewports, for the delta.
    expect(slidersVisible(900, SECTION_LEAD_Y)).toBe(8);
    expect(slidersVisible(SHELL_HEADER.height, SECTION_LEAD_Y)).toBe(7);
    // −2 at every shelled viewport. That is the shell's headline cost.
    expect(slidersVisible(900, SECTION_LEAD_Y) - shellSlidersVisible(900)).toBe(2);

    // CANARY: the old floor must not still pass under the shell.
    expect(shellSlidersVisible(900) >= 8).toBe(false);

    // …and below the gate there IS no shell, so the sticky counts stand.
    // 700, NOT 800: F15 dropped the gate to 768, so 800 is now SHELLED and the
    // sticky count there is no longer the behaviour. That flip is the slice in
    // one line, so it is asserted rather than quietly re-based.
    expect(700).toBeLessThan(SHELL_HEADER.height);
    expect(slidersVisible(700, SECTION_LEAD_Y)).toBe(6);
    expect(800).toBeGreaterThanOrEqual(SHELL_HEADER.height);
    expect(shellSlidersVisible(800)).toBe(5);
  });

  it("6 — the scrollbar compensation is a PAIR, and neither half stands alone", () => {
    expect(shellRule(".layout")).toContain("padding-inline: var(--space-3)");
    expect(shellRule(".col-right")).toContain("padding-inline: var(--space-1)");
    expect(shellRule(".col-right")).toContain("scrollbar-gutter: stable");
    // The pair is exact: 2 x (16 − 12) given back to the grid == 2 x 4 taken by
    // the column. Not "about the same" — the same.
    expect(2 * (SPACE_4 - SPACE_3)).toBe(2 * SPACE_1);
    // padding-BLOCK is untouched; it is a term of MIN_SHELL_H.
    expect(shellRule(".layout")).not.toContain("padding-block");
    expect(shellRule(".layout")).not.toContain("padding:");
  });

  it("7 — the right column reproduces TODAY's geometry, to the pixel", () => {
    // The claim the whole compensation exists to make: the shell moves the
    // scrollbar from outside .layout to inside the grid track and the content
    // box does not move. 885 / 902 are §14.2's pinned outcomes and F11's board
    // box, so a 3px error here reflows two other slices.
    expect(colRightContentShell(1280, 17)).toBe(919);
    expect(colRightContentShell(1280, 0)).toBe(936);
    expect(colRightContentShell(1280, 17) - SECTION_CHROME).toBe(885);
    expect(colRightContentShell(1280, 0) - SECTION_CHROME).toBe(902);
    // …identical to the shipped derivation, which is the actual assertion.
    for (const scrollbar of SCROLLBARS) {
      expect(colRightContentShell(1280, scrollbar), `scrollbar ${scrollbar}px`).toBe(
        centreColumn(1280, scrollbar),
      );
      expect(colRightContentShell(1440, scrollbar)).toBe(centreColumn(1440, scrollbar));
    }

    // CANARY: drop the page-padding half and the box moves 8px, which is enough
    // to change nothing visible and everything derived.
    expect(colRightContentUncompensated(1280, 17) - 2 * SPACE_1).toBe(911);
    expect(colRightContentUncompensated(1280, 17) - 2 * SPACE_1).not.toBe(919);
  });

  it("8 — §16.8's and §14.2's margins survive the shell untouched", () => {
    // Every downstream consumer of the box, re-run against the shell's own
    // derivation rather than against a promise that it is the same.
    const shellBody = (scrollbar: number) => colRightContentShell(1280, scrollbar) - SECTION_CHROME;
    expect(shellBody(17)).toBe(885);
    expect(synergyRowBox(1280, 17)).toBe(436.5);
    expect(synergyRowBox(1280, 17) - synergyRowFloor).toBe(10.5);
    expect(synergyRowBox(1280, 17) - ROW_CHROME - CONTAINER_THRESHOLD).toBe(30.5);
    expect(synergyColumns(1280, 17)).toBe(2);
    // The pane's own cell, and the badge grid's count.
    expect(RAIL - 2 * PANE_PAD_X - SECTION_CHROME).toBe(258);
    expect(cardsPerRow(centreColumn(1280, 17))).toBe(3);
  });

  it("9 — dvh comes AFTER vh, and the whole shell has a no-dvh fallback", () => {
    // `vh` resolves against the LARGE viewport, so a 100vh shell with browser
    // chrome showing extends UNDER it — and with no document scroll there is
    // nothing to recover the lost band. Order is the fix and order is the
    // assertion, scoped to the block: a file-wide indexOf is ambiguous now that
    // F5.4's pane declares the same pair.
    const shell = cssBlock(app, ".app-shell");
    expect(shell.indexOf("100vh")).toBeGreaterThan(-1);
    expect(shell.indexOf("100dvh")).toBeGreaterThan(shell.indexOf("100vh"));

    // The fallback degrades the WHOLE shell rather than clipping it.
    expect(SUPPORTS_BLOCK).toContain(SHELL_HEADER.text);
    const fallback = stripComments(SUPPORTS_BLOCK);
    expect(fallback).toContain("overflow: visible");
    expect(fallback).toContain("position: sticky");
    expect(fallback).toContain("display: block");
  });

  it("10 — ONE number owns each sticky layer, and no bare literal remains", () => {
    expect(JUMPNAV_H).toBe(44);
    expect(DIGEST_H).toBe(76);
    expect(STICKY_STACK_H).toBe(120);
    // Declared exactly once each — a second home is how the pair drifts.
    expect(app.match(/--sticky-jumpnav-h:\s/g)).toHaveLength(1);
    expect(app.match(/--sticky-digest-h:\s/g)).toHaveLength(1);
    expect(app).toContain(
      "--sticky-stack-h: calc(var(--sticky-jumpnav-h) + var(--sticky-digest-h))",
    );
    // Both consumers read the token, never the number.
    expect(cssBlock(app, ".category-ledger")).toContain("top: var(--sticky-jumpnav-h)");
    expect(shellRule(".col-right")).toContain("--scroll-reserve: var(--sticky-stack-h)");
    expect(shellRule(".col-right")).toContain("scroll-padding-top: var(--scroll-reserve)");

    // §5.3's caps still hold at L, on the MEASURED pair rather than the S one.
    expect(JUMPNAV_H).toBeLessThanOrEqual(STICKY_LAYER_1_MAX);
    expect(DIGEST_H).toBeLessThanOrEqual(STICKY_LAYER_2_MAX);
    expect(STICKY_STACK_H).toBeLessThanOrEqual(STICKY_TOTAL_MAX);
    // 107 IS THE S PAIR. It is what the design document carried for L, and
    // using it would under-reserve scroll-padding-top by 13px.
    expect(STICKY_LAYER_1_MAX + 59).toBe(107);
    expect(STICKY_STACK_H).not.toBe(107);

    // No bare offset survives on any sticky or scroll-padding declaration.
    for (const match of stripComments(app).matchAll(/(scroll-padding-top|scroll-margin-top):\s*([^;]+)/g)) {
      expect(match[2], `${match[0]} is a literal`).toContain("var(");
    }
  });

  it("11 — scroll-margin-top is DERIVED and SPLIT: layer 1, not the stack", () => {
    // The digest pins ITSELF under the nav, so a #cat-* jump only has to clear
    // layer 1. Reserving the whole stack leaves a 76px hole above the section.
    expect(cssBlock(app, ".grid-section")).toContain(
      "scroll-margin-top: calc(var(--sticky-jumpnav-h) - var(--scroll-reserve))",
    );
    const panels = cssBlock(app, "#panel-synergy,\n#panel-summary,\nmain#badge-grid");
    expect(panels).toContain("scroll-margin-top: calc(var(--space-3) - var(--scroll-reserve))");

    // THE SUBTRACTION IS NOT DECORATION, and it was found in the browser rather
    // than on paper: scroll-padding-top and scroll-margin-top ADD. With 120 on
    // the scrollport and a plain 44 on the section, a #cat-* jump landed the
    // section 164px down and left 120px of the PREVIOUS category showing under
    // the nav. The landing position is what is asserted, at both reserves.
    const RESERVE_DOC = px(app, /--scroll-reserve:\s*(\d+)px/);
    expect(RESERVE_DOC).toBe(0);
    expect(shellRule(".col-right")).toContain("--scroll-reserve: var(--sticky-stack-h)");
    expect(shellRule(".col-right")).toContain("scroll-padding-top: var(--scroll-reserve)");

    const landing = (want: number, reserve: number): number => reserve + (want - reserve);
    expect(landing(JUMPNAV_H, RESERVE_DOC)).toBe(44); // document scroller
    expect(landing(JUMPNAV_H, STICKY_STACK_H)).toBe(44); // .col-right, under the shell
    expect(landing(SPACE_3, STICKY_STACK_H)).toBe(SPACE_3);
    // …and the shell's own subtraction is genuinely negative, which is the bit
    // a reader will assume is a typo.
    expect(JUMPNAV_H - STICKY_STACK_H).toBe(-76);
    expect(SPACE_3 - STICKY_STACK_H).toBe(-108);

    // CANARY: the un-subtracted form, i.e. the bug that shipped for an hour.
    expect(STICKY_STACK_H + JUMPNAV_H).toBe(164);
  });

  it("12 — I5 re-scoped: the shell opens no third sticky layer", () => {
    function declaresSticky(selector: string): boolean {
      try {
        return blocksFor(app, selector).some((block) => block.includes("position: sticky"));
      } catch {
        return false;
      }
    }
    for (const selector of [".app-shell", ".col-right", ".ledger-panel", ".setup-panel"]) {
      expect(declaresSticky(selector), `${selector} is sticky`).toBe(false);
    }
    // The two that ARE the cap survive.
    expect(declaresSticky(".jump-nav")).toBe(true);
    expect(declaresSticky(".category-ledger")).toBe(true);
    // Nothing inside the pane, including in the shell block.
    for (const rule of stripComments(app).matchAll(/\.attr-pane\s+[^{}\s][^{}]*\{([^}]*)\}/g)) {
      expect(rule[1]).not.toContain("position: sticky");
    }
    // …and the pane itself is STATIC under the shell, which is the credit: the
    // F5.2-D1 clamp problem becomes structurally inapplicable.
    expect(shellRule(".attr-pane")).toContain("position: static");
    expect(shellRule(".attr-pane")).toContain("max-height: none");
  });

  it("13 — no overflow on .layout or <main>, anywhere in the file", () => {
    // An overflow on .layout re-points the two sticky layers' containing block
    // at the wrong box AND nests .col-right's scroller inside a second one; an
    // overflow on <main> re-parents the six digests' scrollport. Both are
    // silent — the layout still looks plausible.
    for (const block of blocksFor(app, ".layout")) {
      expect(stripComments(block), ".layout declares an overflow").not.toMatch(/overflow[-a-z]*:/);
    }
    const css = stripComments(app);
    expect(css).not.toMatch(/main#badge-grid[^{]*\{[^}]*overflow/);
    expect(css).not.toMatch(/#badge-grid[^{]*\{[^}]*overflow/);
    // …and .col-right's is auto, never hidden: hidden kills all eight anchors.
    expect(shellRule(".col-right")).toContain("overflow-y: auto");
    expect(shellRule(".col-right")).not.toContain("overflow: hidden");
  });

  it("14 — the scroll module is QUARANTINED from every persistence path", () => {
    // This is the assertion the four shipped data-loss defects paid for. All
    // four lived in the persisted-READ path and all four failed OPEN into a
    // write; a scroll offset must be structurally unable to reach that path.
    expect(scrollMemory).toBeDefined();
    const code = stripComments(scrollMemory);
    expect(code).toContain("sessionStorage");
    expect(code).not.toContain("localStorage");
    for (const banned of [
      "SavedBuild",
      "schemaVersion",
      "JSON.parse",
      "JSON.stringify",
      "autosave",
      "writeStore",
      "deserialize",
    ]) {
      expect(code, `scroll-memory names ${banned}`).not.toContain(banned);
    }
    // Physical separation, both directions.
    for (const specifier of [
      ...code.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g),
    ].map((m) => m[1] as string)) {
      expect(specifier, `scroll-memory imports ${specifier}`).toBe("");
    }
    for (const [path, source] of Object.entries(srcSources)) {
      if (!path.startsWith("/src/persist/") && !path.startsWith("/src/engine/")) continue;
      expect(source, `${path} imports scroll-memory`).not.toContain("scroll-memory");
    }
    // The key is namespaced ui, and it is the only one.
    expect(code).toContain('"bb2k27.ui.scrollTop.colRight"');
    expect(code.match(/sessionStorage\./g)).toHaveLength(2);
  });

  it("15 — the READ path contains no write, and no throw", () => {
    // The exact shape of the shipped defects: a read that heals, clears or
    // falls back into a write. The reader's body is inspected on its own.
    const read = /export function readColRightScrollTop\(\)[\s\S]*?\n}/.exec(
      stripComments(scrollMemory),
    );
    expect(read).not.toBeNull();
    const body = (read as RegExpExecArray)[0];
    for (const banned of ["setItem", "removeItem", "clear(", "throw"]) {
      expect(body, `the read path contains ${banned}`).not.toContain(banned);
    }
    expect(body).toContain("catch");
    expect(body).toContain("return null");
    // The restore clamps rather than trusting, and the hash beats memory.
    const code = stripComments(scrollMemory);
    expect(code).toContain("Math.min(saved, travel)");
    expect(code).toContain("window.location.hash");
    // The write is coalesced and swallowing.
    expect(code).toContain("requestAnimationFrame");
    expect(code).toContain("pagehide");
    expect(code).toContain("event.persisted");
  });

  it("16 — the skip target is focusable, and still last of the three", () => {
    // A skip link to a non-focusable target moves the next TAB STOP in most
    // engines but does not move FOCUS in all — and under a shell a focus move
    // is what drives the scrollport, so the difference is now visible.
    expect(appTsxF14).toContain('<main id="badge-grid" tabIndex={-1}>');
    const grid = appTsxF14.indexOf('id="badge-grid" tabIndex');
    expect(appTsxF14.indexOf('aria-label="Ledger overview"')).toBeLessThan(grid);
    expect(appTsxF14.indexOf('aria-label="Build"')).toBeLessThan(grid);
  });

  it("17 — .app-shell is PRESENTATION, and it added no element", () => {
    // `.col-right`'s precedent exactly: no landmark, no id, no aria, no state.
    expect(appTsxF14).toContain('<div className="app app-shell">');
    expect(appTsxF14).not.toMatch(/className="app app-shell"[^>]*\b(id|role|aria-)/);
    // It rides the EXISTING root, so no wrapper was introduced.
    expect(appTsxF14.match(/className="app app-shell"/g)).toHaveLength(1);
    expect(stripComments(app)).not.toContain("#root");
  });

  it("18 — the gate literal is one value, repeated verbatim in both places", () => {
    // A drifted pair silently shells a viewport the gate excluded, or leaves a
    // dvh-less browser on a clipped shell.
    const gates = [...app.matchAll(/\(min-height:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
    expect(gates).toHaveLength(2);
    expect(new Set(gates).size).toBe(1);
    expect(gates[0]).toBe(SHELL_HEADER.height);
    // …and no NEW width breakpoint came with it.
    expect(SHELL_HEADER.width).toBe(L_BREAKPOINT);
  });

  it("19 — the footer left the chrome, and the shell's chrome list is closed", () => {
    // Outside .layout the footer is a direct child of .app-shell, which under
    // the shell means 69px of dataset provenance pinned to every viewport and
    // added to MIN_SHELL_H. It is a citation, not a control.
    const colRight = appTsxF14.indexOf('className="col-right"');
    const footer = appTsxF14.indexOf('<footer className="app-footer">');
    const layoutClose = appTsxF14.indexOf("<BuildManagerDialog");
    expect(colRight).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(colRight);
    expect(footer).toBeLessThan(layoutClose);
    expect(appTsxF14.indexOf('id="panel-summary"')).toBeLessThan(footer);
    // The permanent band is exactly four terms. If a fifth ever arrives it has
    // to move MIN_SHELL_H, and assertion 3's canary is what makes it.
    expect(permanentBand()).toBe(HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H);
    expect(permanentBand()).toBe(307);
    // The measured values the two pins are ceilings of, kept so a re-measure
    // has something to disagree WITH.
    expect(HEADER_H).toBe(Math.ceil(HEADER_H_MEASURED));
    expect(STRIP_H).toBe(Math.ceil(STRIP_H_MEASURED));
  });

  it("20 — the transient chrome is named, not folded into the gate", () => {
    // §5.3's cap counted the two sticky layers and excluded banners, and the
    // gate keeps that scope. The preview strip and up to three banners are
    // real, they are self-clearing, and under the shell they take from the
    // cards instead of pushing them down — so the worst frame is stated here
    // rather than discovered by a user.
    const PREVIEW_STRIP_H = 47;
    const BANNER_H = 51;
    const withChrome = (viewport: number, extra: number): number =>
      (cardsBand(viewport) - extra) / viewport;
    expect(Number((withChrome(900, PREVIEW_STRIP_H) * 100).toFixed(1))).toBe(60.7);
    expect(Number((withChrome(900, PREVIEW_STRIP_H + BANNER_H) * 100).toFixed(1))).toBe(55);
    expect(Number((withChrome(900, PREVIEW_STRIP_H + 3 * BANNER_H) * 100).toFixed(1))).toBe(43.7);
    // The worst frame at the GATE itself, which is the one a laptop meets.
    expect(Number((withChrome(768, PREVIEW_STRIP_H + 3 * BANNER_H) * 100).toFixed(1))).toBe(34);
    // Banners STAY in the chrome. They are role="alert"-class disclosures whose
    // whole value is that they cannot be scrolled past.
    expect(appTsxF14).toContain('<div className="app-banners">');
  });
});

/* =============================================================== F15 — the
 * header fits ONE ROW at 1280, and that is what the gate rests on
 * (design-spec §3.2 · invariant I18) =========================================
 *
 * WHY THIS BLOCK EXISTS AT ALL. F14's gate is `ceil((HEADER_H + STRIP_H +
 * PAGE_PAD_Y + STICKY_STACK_H) / 0.40)` and HEADER_H is the dominant term. But
 * HEADER_H is a VERTICAL number produced by a HORIZONTAL fact: the header is a
 * `flex-wrap: wrap` row, so its height is 62 when its children fit on one line
 * and 102 when they do not. F14 measured 102 and derived 868 — correct, and a
 * gate no ordinary laptop could reach, because a 1440x900 display leaves
 * roughly 810 CSS px after browser chrome. The shell was dead code for its
 * entire audience.
 *
 * Nothing in the suite could see that, because nothing in the suite knew WHY
 * HEADER_H was 102. So the fix and its guard arrive together: the wrap is
 * removed, and the horizontal budget that removed it is re-derived here. The
 * next slice that lengthens a header label fails THIS assertion, loudly, at
 * the line that explains itself — instead of silently re-wrapping the header
 * and leaving a 768 gate reserving 40px it no longer has.
 *
 * EVERY WIDTH IS A getBoundingClientRect OFF THE SHIPPED TREE at 1280, zero
 * state, headless Chrome 151.0.7922.174 over CDP against a production build
 * (docs/proof/f15-verification.txt). None is a paper sum: the two action
 * buttons' widths in particular are text metrics, and a text metric is exactly
 * the kind of number that cannot be reasoned to. */

/** The five `.app-header` children at 1280, in DOM order. `actions` is the
 *  post-F15 pair; ACTIONS_W_SUFFIXED below is the same box before the labels
 *  were restored, kept because it is the canary. */
const HEADER_TITLE_W = 203.14;
const HEADER_SWITCHER_W = 299.78;
const HEADER_PROVENANCE_W = 160.3;
const HEADER_OVERLAYS_W = 367.8;
const HEADER_ACTIONS_W = 136.19;
/** The same block carrying `Export JSON` / `Import JSON` — i.e. what shipped
 *  through F14. The delta is the whole slice. */
const HEADER_ACTIONS_W_SUFFIXED = 208.42;

/** Row 1's own height, and the second row's full cost. Measured: the tallest
 *  row-1 child is the BuildSwitcher's 37px select; the wrapped tree added a
 *  --space-3 row gap plus the 28px actions block underneath it. */
const HEADER_ROW1_H = 37;
const HEADER_ACTIONS_H = 28;
const HEADER_BORDER_B = 1;

/** Parsed, never typed: if either token moves, the budget below moves with it
 *  rather than certifying an arrangement the stylesheet no longer describes. */
const HEADER_PAD_X = spaceToken(
  (/\.app-header \{[^}]*padding:\s*var\(--[a-z0-9-]+\)\s+var\(--([a-z0-9-]+)\)/.exec(
    stripComments(app),
  ) as RegExpExecArray)[1] as string,
);
const HEADER_PAD_Y = spaceToken(
  (/\.app-header \{[^}]*padding:\s*var\(--([a-z0-9-]+)\)/.exec(
    stripComments(app),
  ) as RegExpExecArray)[1] as string,
);
const HEADER_GAP = spaceToken(
  (/\.app-header \{[^}]*gap:\s*var\(--([a-z0-9-]+)\)\s*;/.exec(
    stripComments(app),
  ) as RegExpExecArray)[1] as string,
);

const HEADER_CHILDREN = [
  HEADER_TITLE_W,
  HEADER_SWITCHER_W,
  HEADER_PROVENANCE_W,
  HEADER_OVERLAYS_W,
  HEADER_ACTIONS_W,
];

/** What the header has to spend at a given viewport, content box. */
const headerCapacity = (viewport: number): number => viewport - 2 * HEADER_PAD_X;
/** What its children demand on ONE line: their widths plus the gaps between
 *  them. Auto margins are excluded deliberately — `margin-right: auto` on the
 *  title resolves AFTER line breaking and is treated as zero while the browser
 *  decides where to break, so counting it here would forecast a wrap that
 *  never happens. */
const headerDemand = (widths: readonly number[]): number =>
  widths.reduce((sum, w) => sum + w, 0) + HEADER_GAP * (widths.length - 1);

const summaryPanelSrc = srcSources["/src/ui/summary/SummaryPanel.tsx"] as string;

describe("F15 — the header is one row at 1280, and the gate rests on it", () => {
  it("1 — the one-row fit is DERIVED, and the clearance is reported", () => {
    // 1232.00 of box against 1215.20 of demand. Reported rather than merely
    // passed: 16.80px is 1.4% of the box, which is a margin and not a comfort.
    expect(headerCapacity(L_BREAKPOINT)).toBe(1232);
    // 1215.21 summing the 2dp constants above; the browser, summing the
    // unrounded rects, reports 1215.20. The 0.01px is rounding in THIS file,
    // not disagreement with the tree — pinned at 1dp so it cannot be mistaken
    // for a measurement that drifted.
    expect(Number(headerDemand(HEADER_CHILDREN).toFixed(1))).toBe(1215.2);
    expect(headerDemand(HEADER_CHILDREN)).toBeLessThan(headerCapacity(L_BREAKPOINT));
    expect(headerCapacity(L_BREAKPOINT) - headerDemand(HEADER_CHILDREN)).toBeCloseTo(16.8, 1);
    // …and at 1440, where F14 already measured one row, it is not close.
    expect(headerCapacity(1440) - headerDemand(HEADER_CHILDREN)).toBeGreaterThan(160);
  });

  it("2 — CANARY: the shipped-through-F14 header genuinely did NOT fit", () => {
    // The assertion that makes assertion 1 mean something. If this file cannot
    // tell the wrapping arrangement from the fitting one, it certifies nothing.
    const suffixed = [...HEADER_CHILDREN.slice(0, 4), HEADER_ACTIONS_W_SUFFIXED];
    // The pre-F15 tree also had a --space-4 column gap, so the canary carries
    // BOTH halves of what changed rather than only the labels.
    const suffixedDemand = suffixed.reduce((s, w) => s + w, 0) + SPACE_4 * (suffixed.length - 1);
    expect(Number(suffixedDemand.toFixed(2))).toBe(1303.44);
    expect(suffixedDemand).toBeGreaterThan(headerCapacity(L_BREAKPOINT));
    expect(Number((suffixedDemand - headerCapacity(L_BREAKPOINT)).toFixed(2))).toBe(71.44);
  });

  it("3 — the labels were the wrap, and the gap is only the margin", () => {
    // WHAT ACTUALLY CAUSED IT. `Export JSON` / `Import JSON` cost 72.24px more
    // than the names design-spec §3.2 item 5 gives those buttons — 101% of the
    // 71.44px overflow, on their own. Every copy-free lever available (the
    // column gap at 16, the header's 24px inline padding, and the switcher's
    // 220px select cap at 180) sums to 72px and clears by 0.56px while
    // truncating build names, so the suffix was not one option among several:
    // it was the only 71px in the header that cost nothing to give up.
    const suffixCost = HEADER_ACTIONS_W_SUFFIXED - HEADER_ACTIONS_W;
    expect(Number(suffixCost.toFixed(2))).toBe(72.23);
    expect(suffixCost).toBeGreaterThan(71.44);
    // The gap change is the MARGIN, and it is worth exactly four gaps of 4px.
    const gapSaving = (SPACE_4 - HEADER_GAP) * (HEADER_CHILDREN.length - 1);
    expect(gapSaving).toBe(16);
    expect(HEADER_GAP).toBe(SPACE_3);
    // Labels alone would have cleared by 0.80px, which is not a clearance —
    // pinned so nobody later "simplifies" the gap back and calls it equivalent.
    expect(Number((72.23 - 71.44).toFixed(2))).toBe(0.79);
  });

  it("4 — HEADER_H is the one-row composition, and the wrapped one is +40", () => {
    // 12 + 37 + 12 + 1. The border-bottom is IN, because the gate subtracts a
    // border-box height from the viewport.
    expect(2 * HEADER_PAD_Y + HEADER_ROW1_H + HEADER_BORDER_B).toBe(HEADER_H);
    expect(HEADER_H).toBe(62);
    expect(HEADER_H).toBe(Math.ceil(HEADER_H_MEASURED));
    // The second row cost a --space-3 row gap plus the actions block, and that
    // 40px is precisely the 100px the gate fell divided by 0.40.
    expect(SPACE_3 + HEADER_ACTIONS_H).toBe(40);
    expect(HEADER_H + SPACE_3 + HEADER_ACTIONS_H).toBe(HEADER_H_WRAPPED);
    expect((HEADER_H_WRAPPED - HEADER_H) / (1 - CARDS_FLOOR_FRACTION)).toBe(100);
  });

  it("5 — the gate is what the formula says, and 810 now clears it", () => {
    // Re-stated HERE, next to the horizontal fact it depends on, because the
    // dependency is the thing a reader will otherwise miss.
    expect(MIN_SHELL_H).toBe(Math.ceil(permanentBand() / (1 - CARDS_FLOOR_FRACTION)));
    expect(MIN_SHELL_H).toBe(768);
    expect(SHELL_HEADER.height).toBe(MIN_SHELL_H);
    // The whole point of the slice, as one comparison: a 1440x900 laptop.
    const LAPTOP_VIEWPORT_H = 810;
    expect(LAPTOP_VIEWPORT_H).toBeGreaterThanOrEqual(MIN_SHELL_H);
    expect(LAPTOP_VIEWPORT_H).toBeLessThan(868);
  });

  it("6 — the source carries the spec's labels, and no bare 44 came with it", () => {
    // The copy, read back out of the component rather than trusted.
    const plain = stripComments(summaryPanelSrc);
    expect(plain).not.toContain("Export JSON");
    expect(plain).not.toContain("Import JSON");
    expect(plain).toMatch(/>\s*Export\s*</);
    expect(plain).toMatch(/Import\s*\n\s*<\/label>/);
    // F9's floor is untouched by this slice, and it must not be reintroduced as
    // a literal — the one shape assertion 27's census is structurally blind to.
    const headerBlock = cssBlock(app, ".app-header");
    expect(headerBlock).not.toContain("44px");
    expect(headerBlock).not.toContain("--tap-target");
    expect(headerBlock).not.toContain("min-height");
    // …and the header's own height is still content-driven, never declared.
    expect(headerBlock).not.toMatch(/(?:^|;)\s*height:/);
  });

  it("7 — the row gap survived: S and M still wrap, and that is correct", () => {
    // Only the COLUMN gap moved. Below 1280 there is no shell, the header is
    // free to wrap, and it does — measured 102 at 768 and 276 at 390. A
    // shorthand collapse to a single value would have taken the row gap too,
    // which is invisible at L and reflows both narrow layouts.
    const headerBlock = stripComments(cssBlock(app, ".app-header"));
    expect(headerBlock).toContain("flex-wrap: wrap");
    expect(headerBlock).toContain("gap: var(--space-3)");
    // One `gap`, one value: row and column are the same token by intent.
    expect(headerBlock.match(/gap:/g)).toHaveLength(1);
    // The gate is a MIN-height, so the wrapped narrow headers can never reach
    // the shell and their extra rows are scrolled past, exactly as before.
    expect(768).toBeLessThan(L_BREAKPOINT);
    expect(390).toBeLessThan(L_BREAKPOINT);
  });
});

/* ============================================================== A5-U — the
 * bonus mode's dialog geometry, and the one string that must NOT have widened
 * (design-spec §17.4 · §17.13/⑧) ============================================
 *
 * WHY THIS BLOCK IS SHORT. The mode is a `<dialog>`, so it has its own width
 * and NO rail arithmetic enters the feature at all — which is why §17.4's
 * "what gives?" answer is "nothing". Two things are still worth deriving: the
 * threshold at which the two pool groups stack, and the claim that the rail's
 * metrics string did not widen even though the pools it prints can now reach
 * three digits for the first time.
 */

/** `.bonus-dialog`'s own width function, from the shipped declaration rather
 *  than from the design note: min(680, v - 2 x --space-8). */
const BONUS_DIALOG_MAX_W = px(app, /\.bonus-dialog \{[^}]*width:\s*min\((\d+)px/);
const BONUS_DIALOG_GUTTERS = 2 * px(tokens, /--space-8:\s*(\d+)px/);
const bonusDialogW = (viewport: number) =>
  Math.min(BONUS_DIALOG_MAX_W, viewport - BONUS_DIALOG_GUTTERS);
/** The table's containing box: the dialog less `.bonus-dialog__body`'s padding
 *  on both sides. This is the CONTENT box, which is what a size query reads
 *  (invariant I16) — hence the threshold below is written as one too. */
const bonusContentW = (viewport: number) => bonusDialogW(viewport) - 2 * SPACE_4;

/** MEASURED ON PAPER, pinned deliberately (§0.1's "budget with slack, name the
 *  measurement"), and each one named so a later pass moves it by hand:
 *   - LABEL   79 — "Playmaking" at --text-sm, the widest of the six.
 *   - PAD      8 — --space-2, the cell padding this block declares.
 *   - NUMERIC 56 — PARSED, because `.number-field input` owns it and F13's
 *                  comment pins it twice already.
 *   - EFFECT  67 — "99 → 198" at the §16.11 monospace bridge of 8.429 px/char.
 *                  It affects ONLY the stacking threshold, which clears by
 *                  68px, so a +/-10px error cannot move the arrangement. */
const BONUS_LABEL_MAX = 79;
const BONUS_CELL_PAD = SPACE_2;
const BONUS_NUMERIC_W = px(app, /\.number-field input \{[^}]*width:\s*(\d+)px/);
const BONUS_EFFECTIVE_W = 67;

/** The four-column arrangement's min-content demand: category + (bonus,
 *  effective) x 2 pools. */
const BONUS_FOUR_COL =
  BONUS_LABEL_MAX +
  BONUS_CELL_PAD +
  2 * (BONUS_NUMERIC_W + BONUS_CELL_PAD + BONUS_EFFECTIVE_W + BONUS_CELL_PAD);
/** …and the stacked one: category + ONE pool group. */
const BONUS_TWO_GROUP =
  BONUS_LABEL_MAX + BONUS_CELL_PAD + BONUS_NUMERIC_W + BONUS_CELL_PAD + BONUS_EFFECTIVE_W +
  BONUS_CELL_PAD;

/** The A5-U block, taken from its OPENING `/*` so comment-stripping works —
 *  slicing from the marker text leaves an unterminated opener behind. */
const bonusBlock = (() => {
  const marker = app.indexOf("A5-U — bonus mode");
  if (marker === -1) return "";
  return app.slice(app.lastIndexOf("/*", marker), app.indexOf("==== end A5-U — bonus mode ===="));
})();
const bonusBlockPlain = bonusBlock.replace(/\/\*[\s\S]*?\*\//g, " ");

describe("A5-U — the bonus dialog's geometry, derived from what it protects", () => {
  it("30 — the dialog's own width, and the content box the table is sized against", () => {
    expect(BONUS_DIALOG_MAX_W).toBe(680);
    expect(bonusDialogW(1280)).toBe(680);
    expect(bonusDialogW(768)).toBe(680);
    expect(bonusDialogW(390)).toBe(326);
    expect(bonusContentW(1280)).toBe(648);
    expect(bonusContentW(768)).toBe(648);
    expect(bonusContentW(390)).toBe(294);
  });

  it("31 — the STACKING THRESHOLD is derived from the four-column demand, not pasted", () => {
    expect(BONUS_FOUR_COL).toBe(365);
    expect(BONUS_TWO_GROUP).toBe(226);
    // Side by side at L and M, with room to spare.
    expect(bonusContentW(1280) - BONUS_FOUR_COL).toBe(283);
    expect(bonusContentW(768) - BONUS_FOUR_COL).toBe(283);
    // Short at S — by 71px — so the two pool groups stack, and the stacked
    // demand clears by 68.
    expect(bonusContentW(390)).toBeLessThan(BONUS_FOUR_COL);
    expect(BONUS_FOUR_COL - bonusContentW(390)).toBe(71);
    expect(bonusContentW(390) - BONUS_TWO_GROUP).toBe(68);

    // …and the shipped query says exactly that. `max-width: N` is "< N+1"
    // written the way a size query spells it, so the declared figure must be
    // the demand minus one — not a breakpoint borrowed from a neighbour.
    const declared = /@container bonus \(max-width:\s*(\d+)px\)/.exec(cssPlain);
    expect(declared, "no @container query for the bonus dialog table").not.toBeNull();
    expect(Number.parseInt((declared as RegExpExecArray)[1] as string, 10)).toBe(
      BONUS_FOUR_COL - 1,
    );
    // It is a CONTAINER query, not a media query: the dialog's width is a
    // function of the viewport but the table is sized against the dialog, and
    // a media query would re-derive that relationship in a second place.
    expect(cssPlain).toContain("container-type: inline-size");
  });

  it("32 — CANARY 5: the rail metrics string did NOT widen, re-derived from the shipped maxima", () => {
    // The bound that changed. Before A5-U a category pool could not exceed the
    // base field's max; now it is base + bonus, and "112/116" — a THREE-digit
    // pool §13.0.1 pinned one digit more generous than reality — became
    // REACHABLE for the first time. LEDGER_METRICS_MAX goes from conservative
    // to EXACTLY RIGHT, with 0.56px of margin and no slack left.
    //
    // Parsed, never pinned: a future `max` change must fail HERE.
    const grid = stripComments(srcSources["/src/ui/build/BudgetGrid.tsx"] as string);
    const pointsMax = px(grid, /BUDGET_POINTS_MAX = (\d+)/);
    const equipSlotsMax = px(grid, /BUDGET_EQUIP_SLOTS_MAX = (\d+)/);
    const digits = (value: number) => String(value).length;

    // Each per-category bonus field takes its BASE TWIN'S max (§17.4), so the
    // effective ceiling is twice the base ceiling.
    const effectivePointsDigits = digits(2 * pointsMax); // 198 -> 3
    const effectiveEquipSlotsDigits = digits(2 * equipSlotsMax); // 24 -> 2
    // `spent` is unchanged by A5-U and cannot exceed the pool it is spent
    // from; `equipSlotsUsed` is bounded by the badges in the largest category.
    const largestCategory = Math.max(
      ...[...new Set(shippedDataset.badges.map((badge) => badge.category))].map(
        (category) => shippedDataset.badges.filter((badge) => badge.category === category).length,
      ),
    );
    const usedDigits = digits(largestCategory); // 12 -> 2

    // "NNN/NNN · NN/NN" — the widest EFFECTIVE-ONLY metrics string.
    const widestChars =
      effectivePointsDigits + 1 + effectivePointsDigits + 3 + usedDigits + 1 +
      effectiveEquipSlotsDigits;
    expect(widestChars).toBe(15);
    // The §16.11 monospace bridge, restated rather than re-measured.
    const CHAR_W = 8.429;
    expect(widestChars * CHAR_W).toBeLessThanOrEqual(LEDGER_METRICS_MAX);
    expect(LEDGER_METRICS_MAX - widestChars * CHAR_W).toBeCloseTo(0.56, 1);
    // …and LEDGER_LABEL_MAX measures a CATEGORY NAME, which A5-U does not
    // touch. Both constants stand unchanged; I8 and I11 need no re-derivation.
    expect(LEDGER_METRICS_MAX).toBe(127);
    expect(LEDGER_LABEL_MAX).toBe(78);

    // THE COMPOSITION WOULD NOT FIT, and that is the fourth reason §17.4 keeps
    // it out of the digest. "112/116 +12 · 13/15 +3" is 22 chars.
    expect(22 * CHAR_W).toBeGreaterThan(LEDGER_METRICS_MAX);
  });

  it("33 — the mode adds NO new touch-floor control: the census is unchanged and still exact", () => {
    // Every interactive control in the dialog is a `.number-field input` or a
    // `.btn`, and both were already in S_TOUCH_FLOOR_CENSUS — so the floor
    // arrives through the token with no new rule, and assertion 27's
    // exactly-the-stylesheet check still passes untouched.
    //
    // A HARD-CODED `44px` HERE WOULD BE INVISIBLE TO 27, which reads the
    // stylesheet back by matching `var(--tap-target)`. That is precisely how
    // F11's synergy board floor escaped the census. So: the A5-U block
    // declares no min-height at all, and this asserts it.
    // Comments stripped, and the block is taken from its OPENING `/*` — this
    // file's own rationale quotes the very literals it bans, and a scan that
    // starts mid-comment leaves an unterminated opener the stripper cannot see.
    expect(bonusBlock, "the A5-U css block is missing").not.toBe("");
    expect(bonusBlockPlain).not.toMatch(/min-height:/);
    expect(bonusBlockPlain).not.toMatch(/\b44px\b/);
    expect(bonusBlockPlain).not.toContain("--tap-target");
    expect(S_TOUCH_FLOOR_CENSUS).toContain(".number-field input");
    expect(S_TOUCH_FLOOR_CENSUS).toContain(".btn");
  });

  it("34 — the A5-U block is SELF-CONTAINED: it defines no token and touches no layout selector", () => {
    // The merge contract with the app-shell slice running in parallel. A
    // dialog renders in the TOP LAYER and has no stake in the page grid, so
    // every rule in the block is either `.bonus-*`, `.budget-grid__actions` or
    // inside the block's own container query.
    for (const forbidden of [
      ".layout",
      ".col-right",
      ".attr-pane",
      ".rail-column",
      ".setup-panel",
    ]) {
      expect(bonusBlockPlain, `the A5-U block reaches ${forbidden}`).not.toContain(forbidden);
    }
    // ZERO TOKENS ADDED OR CHANGED (§17.13's denied paths include tokens.css).
    expect(bonusBlockPlain).not.toMatch(/^\s*--[a-z0-9-]+:/m);
    // …and it really is the last thing in the file, so the shell slice's
    // rewrite lands above it.
    expect(app.trimEnd().endsWith("/* ==== end A5-U — bonus mode ==== */")).toBe(true);
  });
});

/* ============================================================ ROSTER-OVERFLOW
 *
 * THE DEFECT THIS SECTION EXISTS FOR, and it is a user report, not a
 * hypothetical. At a wide viewport the roster goes 3-up on 498px tracks, which
 * gives each group a 464px content box. Measured in Chrome against that box,
 * BEFORE the fix:
 *
 *   .summary-roster__pin min-content        286.7px   (PIN_CHIP_MAX budgets 60)
 *   .summary-roster__table width            571.2 / 643.1 / 557.2px
 *   past the group's content box            107.2 / 179.1 /  93.2px
 *
 * and at 375 the same row needed 342.2px against a 283px box with 20px of
 * DOCUMENT horizontal scroll behind it.
 *
 * THE OBVIOUS CULPRITS WERE ALL WRONG, which is why this block asserts the
 * mechanism rather than the symptom:
 *   - not a fixed-column grid. The row is an auto-layout <table> and every
 *     other column sat at its natural width (77 / 43 / 61 / 85 / 16).
 *   - not a positioned annotation. `.pin-control__reason` is `display: block`,
 *     `position: static`, fully in flow — which is exactly WHY it could size a
 *     column.
 *   - not a negative offset and not an `overflow` that should have clipped.
 *     `.summary-roster__group` is `overflow: visible` by design, and the
 *     "truncated mid-sentence" symptom was the NEXT group's opaque
 *     --bg-surface painting over the overflow, not a clip and not an ellipsis.
 *   - `.summary-roster__table { max-width: 520px }` LOOKED like the guard and
 *     was inoperative: a table is never laid out narrower than its
 *     min-content.
 *
 * jsdom cannot see any of that, so every assertion below grades the STYLESHEET
 * RULES that produce it, each with a canary fired at a sheet that still
 * carries the defect. The measurements themselves live in the browser proof.
 * ========================================================================= */

describe("§14.2 — the roster row cannot leave its card", () => {
  const ROSTER_BODY_CELLS = [
    ".summary-roster__name",
    ".summary-roster__tier",
    ".summary-roster__level",
    ".summary-roster__effective",
    ".summary-roster__cost",
  ] as const;

  /** The left+right padding a rule declares, in px, resolving space tokens.
   *  `0` is legal here and a bare number anywhere else is not — the row
   *  arithmetic is denominated in tokens. */
  function inlinePadding(block: string): number {
    const decl = /(?:^|;)\s*padding:\s*([^;]+)/.exec(block);
    if (decl === null) throw new Error("no padding shorthand");
    const parts = (decl[1] as string).trim().split(/\s+/);
    const [top, right = top, , left = right] = parts as string[];
    return [right, left].reduce((total, part) => {
      if (part === "0") return total;
      const token = /var\(--([a-z0-9-]+)\)/.exec(part as string);
      if (token === null) throw new Error(`padding part is a literal: ${String(part)}`);
      return total + spaceToken(token[1] as string);
    }, 0);
  }

  it("R0 — no comment inside a roster rule carries a brace", () => {
    // blocksFor() — which every assertion below and several shipped ones use —
    // scans to the next `}`. A brace inside a comment INSIDE a block therefore
    // truncates the block silently and the declarations after it stop being
    // graded. This cost a green run during the fix and is cheap to hold.
    for (const selector of [
      ".summary-roster",
      ".summary-roster__group",
      ".summary-roster__reason td",
      ".pin-control__reason",
      ...ROSTER_BODY_CELLS,
    ]) {
      for (const block of blocksFor(app, selector)) {
        for (const comment of block.matchAll(/\/\*[\s\S]*?\*\//g)) {
          expect(comment[0], `${selector} has a brace inside a comment`).not.toMatch(/[{}]/);
        }
        // …and the block really did reach its closing brace: every rule here
        // ends in a declaration, so a truncated read shows up as a dangling
        // comment opener.
        expect(block.split("/*").length, `${selector} block looks truncated`).toBe(
          block.split("*/").length,
        );
      }
    }
  });

  it("R1 — the row spends FOUR --space-2 gutters, which is what ROSTER_ROW_MAX prices", () => {
    // §14.2 derives the 412px row over "four --space-2 gutters". The header
    // row has always padded on ONE side; the BODY cells padded on both, so
    // every seam was 16px against a budget of 8 — 66px across the row rather
    // than 33, and the header columns did not sit over the body columns they
    // label. Summed off the shipped rules so the CSS and the derivation cannot
    // drift again.
    const spent = ROSTER_BODY_CELLS.reduce(
      (total, selector) => total + inlinePadding(blocksFor(app, selector)[0] as string),
      0,
    );
    expect(spent).toBe(4 * SPACE_2);
    // The header is the precedent this now matches, not a second convention.
    expect(inlinePadding(blocksFor(app, ".summary-roster__head th")[0] as string)).toBe(SPACE_2);

    // CANARY — the pre-fix shape. Padding on BOTH inline sides doubles the
    // spend, and R1 must go red against it.
    expect(inlinePadding("padding: var(--space-1) var(--space-2);")).toBe(2 * SPACE_2);
    expect(2 * SPACE_2).not.toBe(SPACE_2);
  });

  it("R2 — the pin column is sized by the CONTROL; the sentence gets its own row", () => {
    // The <td> keeps `nowrap` — it is right for a button label and was never
    // the mistake. The mistake was that the sentence lived in the same box and
    // inherited it, making the column's min-content 286.7px.
    expect(blocksFor(app, ".summary-roster__pin")[0]).toContain("white-space: nowrap");
    // The reason DECLARES its own wrapping, so no host's box can turn it back
    // into one long line.
    const reason = blocksFor(app, ".pin-control__reason")[0] as string;
    expect(reason).toContain("white-space: normal");
    expect(reason).toContain("overflow-wrap: break-word");
    // …and the row it now lives in exists, spanning, with a measure cap that
    // matches the stale disclosure directly above it.
    const reasonRow = blocksFor(app, ".summary-roster__reason td")[0] as string;
    expect(reasonRow).toMatch(/max-width:\s*\d+ch/);
    expect(reasonRow).toContain("padding: 0 0 var(--space-2)");
    // It is SESSION control, like the pin cell and the pin-mode row, so it
    // leaves the printed page with them rather than ruling an empty band
    // across the table.
    const printStart = app.indexOf("@media print {");
    expect(printStart).toBeGreaterThan(-1);
    expect(app.slice(printStart)).toContain(".summary-roster__reason");
  });

  it("R3 — NOTHING in the roster truncates: the sentence wraps or it is lost", () => {
    // "Which Synergy Slot does this badge hold" appears NOWHERE else on this
    // surface. A one-line treatment of it is a lost fact, so the three shapes
    // that would produce one are banned by name across every roster rule and
    // over the reason itself.
    const rosterRules = [
      ...stripComments(app).matchAll(/([^{}]*\.(?:summary-roster|pin-control)[^{}]*)\{([^{}]*)\}/g),
    ];
    expect(rosterRules.length).toBeGreaterThan(10);
    for (const rule of rosterRules) {
      const selector = (rule[1] as string).trim();
      const body = rule[2] as string;
      expect(body, `${selector} truncates`).not.toContain("text-overflow");
      expect(body, `${selector} clamps`).not.toContain("line-clamp");
      // A group that clips is a group that hides an overflow instead of not
      // having one — assertion 26's rule, applied to this surface.
      expect(body, `${selector} clips`).not.toMatch(/overflow(-x)?:\s*(hidden|clip)/);
    }
  });

  it("R4 — the effective cell wraps, and the arrow is never parted from its level", () => {
    // `white-space: nowrap` made "→ HOF ⚡2" one 85.2px token and is the second
    // half of the S overflow. §14.2's own stated mechanism is that a table
    // wraps its cells natively; this cell had it switched off.
    const cell = blocksFor(app, ".summary-roster__effective")[0] as string;
    expect(cell).toContain("white-space: normal");
    expect(cell).not.toContain("white-space: nowrap");
    // …but letting it wrap unheld strands "→" on a 12.5px line of its own
    // (measured). The pair span is the wrapping boundary, and it is the ONLY
    // thing in the cell allowed to be nowrap.
    expect(blocksFor(app, ".summary-roster__effective-pair")[0]).toContain(
      "white-space: nowrap",
    );
  });

  it("R5 — I13: a group fills its cell, and the columns hold when a name wraps", () => {
    // Ragged heights measured before the fix, one 3-up row:
    // 346.1 / 256.1 / 248.9 against 316.3 / 214.1 / 214.1. `align-items: start`
    // was the cause; `stretch` is the ruling `.badge-card` already took.
    const roster = blocksFor(app, ".summary-roster")[0] as string;
    expect(roster).toContain("align-items: stretch");
    expect(roster).not.toContain("align-items: start");
    // REJECTED, and asserted so it stays rejected: a percentage height makes
    // the group depend on its cell having a definite one.
    expect(blocksFor(app, ".summary-roster__group")[0]).not.toMatch(/height:\s*100%/);

    // A <td>'s used vertical-align is `middle`, which is invisible until a
    // name wraps — then the single-line cells re-centre in the taller row and
    // the cost digit floats between the name's two lines (measured 10.3px
    // below the first, 10.4px above the second). Every data cell takes the
    // first baseline instead.
    for (const selector of [...ROSTER_BODY_CELLS, ".summary-roster__pin"]) {
      expect(
        blocksFor(app, selector)[0],
        `${selector} does not take the row's first baseline`,
      ).toContain("vertical-align: baseline");
    }
  });

  it("R6 — the fix adds NO touch-floor rule, NO literal, and NO roster breakpoint", () => {
    // The census is exact in both axes (assertions 24 / 31) and this slice
    // must not have moved it. `44` may appear nowhere as a size in any of the
    // rules touched here — the F11 / [A7] escape shape.
    for (const selector of [
      ".summary-roster",
      ".summary-roster__reason td",
      ".summary-roster__effective-pair",
      ".pin-control__reason",
      ...ROSTER_BODY_CELLS,
    ]) {
      for (const block of blocksFor(app, selector)) {
        expect(block, `${selector} spells a size as a literal`).not.toMatch(/:\s*\d+px/);
      }
    }
    // …and §13.3's rule holds: auto-fill is continuous, so nothing here needed
    // a breakpoint of its own.
    const queries = [...stripComments(app).matchAll(/@media \(min-width:\s*(\d+)px\)/g)].map(
      (match) => Number.parseInt(match[1] as string, 10),
    );
    expect([...new Set(queries)].sort((a, b) => a - b)).toEqual([768, 1280]);
  });
});
