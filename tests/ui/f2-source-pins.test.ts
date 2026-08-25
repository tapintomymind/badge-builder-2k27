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
 * - E: the §5.1 rev-2 rail re-cut (248 / fluid / 192) — rails are the free
 *   variable; 3-up at 1280 and 2-up at 768 follow arithmetically.
 * - F: components import the engine's synergySlotDisabledByPreview rather
 *   than hand-negating synergySlotActive (QE hygiene: a future change to
 *   the activity rule must not desynchronize boost math from the
 *   "disabled by preview" annotations).
 */

import { describe, expect, it } from "vitest";
import { srcSources } from "../helpers/test-utils";

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

/** The css block for one selector heading (naive but stable: from the
 * selector to its closing brace). */
function cssBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
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

describe("E — §5.1 rev-2 rail re-cut: rails are the free variable", () => {
  const css = read("src/styles/app.css");

  it("L layout uses the rev-5 280px / fluid / 176px columns", () => {
    // rev 2 (248/192) sized the columns without sizing their contents and
    // overflowed the left rail; rev 5 re-cut to 280/176. The ARITHMETIC is
    // re-derived in tests/layout-arithmetic.test.ts — this is only the
    // literal-drift guard.
    expect(css).toContain("grid-template-columns: 280px minmax(0, 1fr) 176px");
    expect(css).not.toContain("grid-template-columns: 320px"); // rev 1's rails
    expect(css).not.toContain("grid-template-columns: 248px"); // rev 2's rails
    // M: still no rail — single column below 1280 (§5.2, unchanged by rev 5).
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
