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

  it("L layout uses 248px / fluid / 192px columns", () => {
    // PRE-FIX: 320px / fluid / 340px — 660px of rail left the badge grid
    // (the reason the app exists) 524px, forcing 2-up at 1280 and 1-up at
    // 768 against the spec's 3-up / 2-up.
    expect(css).toContain("grid-template-columns: 248px minmax(0, 1fr) 192px");
    expect(css).not.toContain("grid-template-columns: 320px");
    // M: no rail — the 280px column is gone (single column below 1280).
    expect(css).not.toContain("grid-template-columns: 280px");
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
