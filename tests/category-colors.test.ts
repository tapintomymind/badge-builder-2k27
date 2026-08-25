/**
 * Category identity layer — design-spec §2.8 (F7).
 *
 * Node env, no DOM. Like tests/layout-arithmetic.test.ts, this PARSES the
 * shipped stylesheets and re-derives what §2.8 asserts, so a future edit to
 * any single colour or selector fails here rather than in the user's eye.
 *
 * The three things worth protecting, in order of how badly they break:
 *
 *  1. THE CHANNEL RULE. These colours are identity; --danger / --warning are
 *     state. Defense's red and the overspend red are both red on purpose —
 *     that is safe ONLY while they never share a surface. The moment --cat
 *     reaches .category-ledger's left border (which --danger owns on
 *     overspend) or the ledger numerals (§2.7.4's forbidden list), a red
 *     Defense header becomes indistinguishable from "you are over budget".
 *  2. NEVER COLOUR ALONE (§6). Every consuming surface renders the category
 *     NAME as text. This is also the whole mitigation for the colour-vision
 *     collisions in docs/proof/f7-contrast.txt — red/green cannot be told
 *     apart by hue by a deuteranope, and are never asked to be.
 *  3. Contrast. Recomputed here from the shipped hex, not copied from the
 *     proof file, so the two cannot drift.
 */

import { describe, expect, it } from "vitest";
import { ATTR_GROUPS, CATEGORIES } from "../src/engine/vocabulary";

const cssSources = import.meta.glob("/src/styles/*.css", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const app = cssSources["/src/styles/app.css"] ?? "";
const tokens = cssSources["/src/styles/tokens.css"] ?? "";

/* ------------------------------------------------------ contrast, in-test -- */

const BG_CANVAS = "#0d1117";
/** AA for normal text. Every identity colour may carry text, so all clear it. */
const AA = 4.5;

function channels(value: string): [number, number, number] {
  const h = value.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(value: string): number {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = channels(value);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------ parsed from source -- */

function tokenValue(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(tokens);
  if (match === null) throw new Error(`category colors: token not declared — --${name}`);
  return (match[1] as string).toLowerCase();
}

const CATEGORY_KEYS = CATEGORIES.map((category) => category.toLowerCase());

/* ------------------------------------------------------------------ §2.8 -- */

describe("§2.8 — the identity layer covers every category, once", () => {
  it("declares one token per category and no orphans", () => {
    for (const key of CATEGORY_KEYS) expect(tokenValue(`cat-${key}`)).toMatch(/^#[0-9a-f]{6}$/);
    const declared = [...tokens.matchAll(/--cat-([a-z]+):/g)].map((m) => m[1] as string);
    expect([...declared].sort()).toEqual([...CATEGORY_KEYS].sort());
  });

  it("every category is mapped at all three entry points", () => {
    // The section anchor (cards + digest inherit), the nav chip, and the
    // attribute fieldset. A category missing one of these loses its colour
    // on exactly one surface — the kind of gap an eye skims past.
    for (const key of CATEGORY_KEYS) {
      expect(app, `#cat-${key}`).toContain(`#cat-${key},`);
      expect(app, `chip ${key}`).toContain(`.jump-nav a[href="#cat-${key}"]`);
      expect(app, `fieldset ${key}`).toContain(`.attr-group[data-attr-group="${key}"]`);
      expect(app, `--cat for ${key}`).toContain(`--cat: var(--cat-${key});`);
    }
  });

  it("the attribute axis and the badge axis are listed separately, not derived", () => {
    // vocabulary.ts: CATEGORIES is "a SEPARATE constant from ATTR_GROUPS,
    // never derived from it". They happen to share names today; the CSS must
    // not encode that coincidence as a rule.
    for (const group of ATTR_GROUPS) {
      expect(app).toContain(`.attr-group[data-attr-group="${group}"]`);
    }
    expect(ATTR_GROUPS.length).toBe(CATEGORIES.length);
  });

  it("a category with no scope degrades to the pre-F7 single accent", () => {
    expect(tokens).toContain("--cat: var(--accent);");
  });
});

/* ---------------------------------------------------------------- §2.8.1 -- */

describe("§2.8.1 — identity never becomes state (the channel rule)", () => {
  /** Every declaration block in `source` whose body mentions var(--cat). */
  function blocksConsumingCat(source: string): string[] {
    const out: string[] = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    for (const match of source.matchAll(re)) {
      const body = match[2] as string;
      if (/var\(--cat[^-)]/.test(body) || /var\(--cat\)/.test(body)) {
        out.push((match[1] as string).trim());
      }
    }
    return out;
  }

  it("--cat is consumed only by the four identity surfaces", () => {
    const consumers = blocksConsumingCat(app).filter(
      (selector) => !selector.startsWith("#cat-") && !selector.includes("@media"),
    );
    for (const selector of consumers) {
      expect(
        /attr-group\[data-attr-group\] legend|category-ledger h2|jump-nav a\[href\^="#cat-"\]|attr-slider__row/.test(
          selector,
        ),
        `unexpected --cat consumer: ${selector}`,
      ).toBe(true);
    }
  });

  it("--cat never touches the digest's left border — --danger owns it", () => {
    // .category-ledger--over { border-left-color: var(--danger) }. Identity
    // on that pixel would make a red Defense header read as "over budget".
    expect(app).toContain("border-left-color: var(--danger);");
    expect(app).not.toMatch(/\.category-ledger[^{]*\{[^}]*border-left-color:\s*var\(--cat\)/);
    expect(app).not.toMatch(/\.category-ledger[^{]*\{[^}]*border-left:[^;]*var\(--cat\)/);
  });

  it("--cat never lands on the §2.7.4 forbidden list (ledger/summary numerals)", () => {
    for (const forbidden of [".ledger-over", ".ledger-overview__metrics", ".meter", ".summary"]) {
      const blocks = [...app.matchAll(new RegExp(`\\${forbidden}[^{}]*\\{([^{}]*)\\}`, "g"))];
      for (const block of blocks) {
        expect((block[1] as string).includes("var(--cat)"), `${forbidden} took --cat`).toBe(false);
      }
    }
  });

  it("the slider fill reads --cat rather than naming a colour", () => {
    expect(app).toContain("var(--cat) 0 calc(var(--val) * 1%)");
    // both engines — a -moz-only or -webkit-only wiring is a half-shipped fix
    expect(app.match(/var\(--cat\) 0 calc\(var\(--val\) \* 1%\)/g)?.length).toBe(2);
  });

  it("ships the §10.6 forced-colors companion", () => {
    expect(app).toContain("@media (forced-colors: active)");
    const companion = app.slice(app.indexOf('.jump-nav a[href^="#cat-"] {\n  border-color: var(--cat);'));
    expect(companion).toContain("border-color: ButtonBorder;");
  });
});

/* -------------------------------------------------------------------- I1 -- */

describe("I1 — every identity colour can carry text", () => {
  it("clears the AA bar on --bg-canvas", () => {
    for (const key of CATEGORY_KEYS) {
      const ratio = contrast(tokenValue(`cat-${key}`), BG_CANVAS);
      expect(ratio, `--cat-${key} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("keeps the six in one register — none shouts louder than the rest", () => {
    // A category that is far brighter than its neighbours reads as selected
    // or as a warning. Yellow sits highest by physics (it cannot go dark
    // without turning olive); the spread is bounded, not eliminated.
    const ratios = CATEGORY_KEYS.map((key) => contrast(tokenValue(`cat-${key}`), BG_CANVAS));
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(3.5);
  });

  it("the calibration the proof file was measured with still reproduces", () => {
    // Same guard f5-contrast.txt used: reproduce a published §2.1 ratio
    // before trusting any number derived by this method.
    expect(contrast("#cd8b47", BG_CANVAS)).toBeCloseTo(6.65, 1);
  });
});
