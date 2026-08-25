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
import { cssBlock, srcSources } from "../helpers/test-utils";

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

  for (const file of ["src/ui/grid/BadgeCard.tsx", "src/ui/synergy/SynergyPanel.tsx"]) {
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

describe("F5 — §2.7 metallic layer: the worst token pairing holds AA", () => {
  const tokens = read("src/styles/tokens.css");

  /** Resolve a token to its hex, following one `var(--alias)` hop (the §2.7
   * base metals are ALIASES of the §2.1 level tones by design). */
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
