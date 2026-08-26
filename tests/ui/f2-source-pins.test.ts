/**
 * F2 source-level pins (node env, no DOM): the fixes whose failure mode is
 * a QUIET REGRESSION in a stylesheet or a hand-copied predicate — same
 * spirit as the H1 vocabulary lint (tests/vocabulary.test.ts).
 *
 * - E: `.badge-card--blocked` must never dim the whole container again —
 *   opacity 0.55 composited the reason string to 2.67:1 against AA's 4.5:1
 *   (design-review P1-1). Opacity is allowed ONLY on the non-text pip row.
 * - E: only the CategoryLedger DIGEST is sticky (§5.3 rev 2 budget); the
 *   lede scrolls. PRE-FIX the whole ledger was the sticky layer → 198px of
 *   chrome against the budget.
 * - E: the L layout is TWO columns — one rail beside the grid, at one
 *   breakpoint, with no second fixed-rail tier above it. Successive re-cuts
 *   treated the rails as the free variable and kept re-sizing a third column
 *   that could not hold a ledger row on one line at any width 3-up-at-1280
 *   could afford; §13 removed the column instead. 3-up at 1280 and 2-up at
 *   768 still follow arithmetically.
 * - F: components import the engine's synergySlotDisabledByPreview rather
 *   than hand-negating synergySlotActive (QE hygiene: a future change to
 *   the activity rule must not desynchronize boost math from the
 *   "disabled by preview" annotations).
 */

import { describe, expect, it } from "vitest";
import { cssBlock, srcSources, stripComments } from "../helpers/test-utils";

/** CSS sources via Vite's typed raw glob — same zero-node:fs discipline as
 * tests/helpers/test-utils.ts. */
const cssSources = import.meta.glob("/src/styles/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function read(relativePath: string): string {
  const source = srcSources[`/${relativePath}`] ?? cssSources[`/${relativePath}`];
  if (source === undefined) throw new Error(`source not found: ${relativePath}`);
  return source;
}

describe("E — blocked-card contrast (P1-1): no container opacity", () => {
  const css = read("src/styles/app.css");

  it(".badge-card--blocked carries no opacity; only the pip row is dimmed", () => {
    // PRE-FIX: `.badge-card--blocked { opacity: 0.55; … }` — the reason
    // string (the card's entire informational payload) composited to 2.67:1.
    expect(cssBlock(css, ".badge-card--blocked")).not.toContain("opacity");
    // The dimming moved to the non-text pip glyph row.
    expect(cssBlock(css, ".badge-card--blocked .pip-row")).toContain("opacity");
  });
});

describe("E — sticky chrome budget (§5.3 rev 2): digest sticky, lede scrolls", () => {
  const css = read("src/styles/app.css");

  it(".category-ledger (the digest) is sticky; the lede block exists and is not", () => {
    expect(cssBlock(css, ".category-ledger")).toContain("position: sticky");
    expect(cssBlock(css, ".category-ledger__lede")).not.toContain("sticky");
  });
});

describe("E — the F5.2 L re-cut: one rail, and one tier", () => {
  const css = read("src/styles/app.css");

  it("L layout uses the F5.2 two-column geometry — one rail, not two", () => {
    // Every three-column cut this repo shipped sized a right column that
    // could not hold ONE ledger row on one line at any width 3-up-at-1280
    // could afford (design-spec §13.2). The right rail is gone; the ledger
    // moved into the single rail, which has a 266px content box. The
    // ARITHMETIC is re-derived in tests/layout-arithmetic.test.ts — this is
    // only the literal-drift guard.
    //
    // The trailing `;` below is load-bearing: without it this positive guard
    // is a leading substring of a three-track declaration, and it would pass
    // on the very layout it exists to forbid.
    expect(css).toContain("grid-template-columns: 300px minmax(0, 1fr);");
    // …and for the same reason the negative guards name the FULL three-track
    // declaration. `not.toContain("grid-template-columns: 300px")` is now
    // self-contradictory — the surviving declaration starts with it.
    expect(css).not.toContain("grid-template-columns: 300px minmax(0, 1fr) 268px");
    expect(css).not.toContain("grid-template-columns: 258px minmax(0, 1fr) 204px");
    expect(css).not.toContain("grid-template-columns: 280px"); // the 280 rails
    expect(css).not.toContain("grid-template-columns: 248px"); // the 248 rails
    expect(css).not.toContain("grid-template-columns: 320px"); // the 320 rails
    // M/S: still a single fluid column below 1280 (§5.2, unchanged).
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("cards keep the ≥240px floor", () => {
    expect(css).toContain("repeat(auto-fill, minmax(240px, 1fr))");
  });
});

describe("F — canonical preview predicate adopted (no hand-negation)", () => {
  const handNegated = /permanence === "temporary" && \w+\.unlocked|\w+\.unlocked && .*permanence === "temporary"/;

  for (const file of ["src/ui/grid/BadgeCard.tsx", "src/ui/synergy/SynergyPanel.tsx", "src/ui/synergy/SynergyBoard.tsx"]) {
    it(`${file} imports synergySlotDisabledByPreview and carries no inline copy`, () => {
      const source = read(file);
      // PRE-FIX: both files re-derived `overlay.seasonReset &&
      // synergySlot.permanence === "temporary" && synergySlot.unlocked`.
      expect(source).toContain("synergySlotDisabledByPreview");
      expect(handNegated.test(source)).toBe(false);
    });
  }

  it("POSITIVE CANARY: the banned inline pattern is still detectable", () => {
    expect(
      handNegated.test(
        'const previewDisabled = overlay.seasonReset && synergySlot.permanence === "temporary" && synergySlot.unlocked;',
      ),
    ).toBe(true);
  });
});

const tokens = read("src/styles/tokens.css");

/** Resolve a token to its hex, following one `var(--alias)` hop (the §2.7
 * base metals are ALIASES of the §2.1 level tones by design).
 * F5.3: hoisted OUT of the §2.7 describe unchanged, so the drift-1 and
 * drift-3 pins below can reuse it rather than carry a second copy of a
 * contrast implementation. No `it` body moved. */
function resolveHex(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens);
  if (match === null) throw new Error(`token not declared: ${name}`);
  const value = match[1]!.trim();
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  if (alias !== null) return resolveHex(alias[1]!);
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`not a hex: ${name} = ${value}`);
  return value;
}

/** WCAG 2.1 relative-luminance contrast ratio. */
function ratio(hexA: string, hexB: string): number {
  const luminance = (hex: string): number => {
    const channel = (offset: number): number => {
      const srgb = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  };
  const [lighter, darker] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return ((lighter as number) + 0.05) / ((darker as number) + 0.05);
}

/** A colour composited over an opaque backdrop at `alpha` — what a container
 * `opacity` ACTUALLY does to every ratio beneath it (invariant I2). */
function composite(fgHex: string, bgHex: string, alpha: number): string {
  const mix = (offset: number): string => {
    const fg = parseInt(fgHex.slice(offset, offset + 2), 16);
    const bg = parseInt(bgHex.slice(offset, offset + 2), 16);
    return Math.round(alpha * fg + (1 - alpha) * bg)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

describe("F5 — §2.7 metallic layer: the worst token pairing holds AA", () => {
  it("the layer's worst pairing — --fg-on-accent on --metal-hof base — is ≥ 4.5:1 (spec: 5.64:1)", () => {
    // Method calibration (design-spec §2.7.1 / invariant I1): the same
    // arithmetic must reproduce §2.1's published bronze figure first.
    expect(ratio(resolveHex("--lvl-bronze"), resolveHex("--bg-canvas"))).toBeCloseTo(6.65, 1);
    // The single worst pairing in the §2.7 layer: dark text on the HOF base
    // face. Every other face stop is ≥ this base tone (faces are hi → base
    // only; -lo never sits under a glyph — §2.7.2's load-bearing rule).
    const worst = ratio(resolveHex("--fg-on-accent"), resolveHex("--metal-hof"));
    expect(worst).toBeGreaterThanOrEqual(4.5);
    expect(worst).toBeCloseTo(5.64, 1);
  });
});

describe("F5.3 — card internals and collapse, pinned at the source", () => {
  const css = read("src/styles/app.css");

  it("I13 — the <li> is the equal-height carrier, and the four repairs stay forbidden", () => {
    // The reported defect's ACTUAL cause: the grid always stretched its <li>
    // children correctly; `.badge-card` is a content-height flex column that
    // never filled its cell, so the dead space sat INSIDE each cell. One
    // declaration fixes it without the card knowing about its wrapper.
    expect(cssBlock(css, ".grid-section__cards > li")).toContain("display: grid");
    // Stripped: A1's rationale FORBIDS these four by name, in prose, and an
    // assertion that greps its own explanation is red for the most honest
    // possible reason.
    const code = stripComments(css);
    expect(code).not.toContain("grid-auto-rows");
    // PRE-FIX there was no `li` rule at all, no height and no height: 100%.
    expect(cssBlock(code, ".badge-card")).not.toContain("height");
  });

  it("the digest IS the <summary>, so position: sticky survives the collapse", () => {
    // T3, and it is the failure this pin exists for: nesting .category-ledger
    // INSIDE a <summary> makes the summary the sticky element's containing
    // block — a box its own size — and the sticky header dies with every
    // CSS-text pin in this file still green.
    const ledger = read("src/ui/grid/CategoryLedger.tsx");
    expect(ledger).toMatch(/<summary className=\{`category-ledger/);
    expect(ledger).not.toMatch(/<summary[^>]*>\s*<div className="category-ledger/);
    // The sticky declaration stays in its ORIGINAL block. cssBlock returns
    // the first match, so moving it into F5.3's appended block is exactly how
    // the pin above would stop checking anything (A17).
    expect(cssBlock(css, ".category-ledger")).toContain("position: sticky");
  });

  it("A14/T5 — the <summary> keeps a visible focus ring (nothing else can give it one)", () => {
    // `:focus-visible { box-shadow: var(--ring-focus) }` (0,1,0, line ~51) is
    // OVERRIDDEN by `.category-ledger { box-shadow: var(--shadow-raised) }`
    // (0,1,0, later). Equal specificity, later wins — so a <summary> carrying
    // this class ships with NO focus ring, and no test in the suite can see a
    // focus ring. The composed rule is required, not stylistic.
    const focus = cssBlock(css, ".category-ledger:focus-visible");
    expect(focus).toContain("var(--ring-focus)");
    expect(focus).toContain("var(--shadow-raised)");
    // forced-colors drops box-shadow entirely; the transparent outline is
    // what survives there.
    expect(focus).toContain("outline: 2px solid transparent");
  });

  it("T4 — the caret is --fg-muted, NOT a fifth --cat surface", () => {
    // category-colors.test.ts CANNOT catch this: its allowlist regex already
    // matches `category-ledger h2`, so a --cat-coloured caret is pre-approved
    // by the very test that polices the palette. The explicit colour is the
    // only guard, and this is it.
    const caret = cssBlock(css, ".category-ledger h2::before");
    expect(caret).toContain("color: var(--fg-muted)");
    expect(caret).not.toContain("var(--cat)");
    // F5 owns .category-ledger::before for the gold hairline — the caret must
    // not have been hung there.
    expect(cssBlock(css, ".category-ledger::before")).toContain("var(--rule-gold)");
  });

  it("DRIFT 1 — .chip--accent has a rule at last, and it clears AA on the binding backdrop", () => {
    // Shipped state: `Chip` accepts variant="accent", BadgeCard passes it for
    // the Fuse role chip, and app.css declared --tier/--level/--warning/
    // --info/--muted and NOT --accent. The Fuse chip rendered with no border
    // and an inherited colour while its Reaction sibling got 1px solid.
    const chip = cssBlock(css, ".chip--accent");
    expect(chip).toContain("border: 1px solid var(--accent)");
    expect(chip).toContain("color: var(--accent)");
    // The BINDING backdrop is --bg-raised: a purchased card, and ANY hovered
    // card (`.badge-card:hover { background: var(--bg-raised) }`). Quoting the
    // --bg-canvas figure against a surface-class background is an I1 violation
    // in miniature, so the number is pinned against the right one.
    const onRaised = ratio(resolveHex("--accent"), resolveHex("--bg-raised"));
    expect(onRaised).toBeCloseTo(4.97, 1);
    expect(onRaised).toBeGreaterThanOrEqual(4.5); // AA text
    expect(onRaised).toBeGreaterThanOrEqual(3.0); // SC 1.4.11 non-text
    // No new hue and no new token: it consumes the existing --accent.
    expect(chip).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it("DRIFT 3 — .btn:disabled ships the RATIFIED 0.6, not the drifted 0.45", () => {
    const disabled = cssBlock(css, ".btn:disabled");
    expect(disabled).toContain("opacity: 0.6");
    expect(disabled).not.toContain("opacity: 0.45");
    // Not cosmetic — invariant I2: a container opacity silently invalidates
    // every ratio beneath it. Disabled controls are formally EXEMPT from
    // SC 1.4.3, so this is not an AA failure; it is the spec's own invariant
    // and the spec's own ratification both saying .6, while at .45 two of the
    // three common label tokens sat below the bar the document holds itself
    // to everywhere else.
    const surface = resolveHex("--bg-surface");
    const primaryAt45 = ratio(composite(resolveHex("--fg-primary"), surface, 0.45), surface);
    const primaryAt60 = ratio(composite(resolveHex("--fg-primary"), surface, 0.6), surface);
    expect(primaryAt45).toBeCloseTo(3.99, 1);
    expect(primaryAt60).toBeCloseTo(6.01, 1);
    const secondaryAt45 = ratio(composite(resolveHex("--fg-secondary"), surface, 0.45), surface);
    const secondaryAt60 = ratio(composite(resolveHex("--fg-secondary"), surface, 0.6), surface);
    expect(secondaryAt45).toBeCloseTo(3.31, 1);
    expect(secondaryAt60).toBeCloseTo(4.83, 1);
  });
});
