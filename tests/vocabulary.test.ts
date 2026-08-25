/**
 * H1 vocabulary lint. The bare token "slot" is BANNED in identifiers and
 * user-visible copy: per-category capacity is `equipSlots` ("Badge Slots"),
 * the 8 fuse/reaction pairs are `synergySlots` ("Synergy Slots").
 *
 * The lint greps src/**\/*.{ts,tsx} (comments stripped — code and string copy
 * are what ship) for the banned bare identifiers `slot` / `slots` /
 * `slotCount` / `numSlots` standing alone, i.e. not embedded in an
 * equip-/synergy-prefixed compound like `equipSlots` or `SynergySlotId`
 * (word-boundary matching gives compounds a pass; the banned four never have
 * a qualifying prefix by construction).
 *
 * THE CANARY REQUIREMENT: a lint that cannot fail on its own canary is worse
 * than no lint. The positive canaries below are strings that SHOULD fail the
 * regex, asserted to fail.
 */

import { describe, expect, it } from "vitest";
import { srcSources, stripComments } from "./helpers/test-utils";
import { ATTRS, ATTR_LABELS, ATTR_SOURCE_LABELS } from "../src/engine/vocabulary";

/** Bare slot-word identifiers and copy. Word boundaries mean equipSlots /
 * synergySlots / SynergySlotId / plusTwoSlotIds (interior, prefixed
 * compounds) do NOT match; the lookbehinds permit the two CANONICAL
 * user-visible copy forms — "Badge Slots" and "Synergy Slots" (H1 table). */
const BANNED = /(?<!badge )(?<!synergy )\b(?:slots?|slot_?count|num_?slots)\b/i;

describe("H1 vocabulary lint: bare `slot` banned in src/**", () => {
  const files = Object.keys(srcSources);

  it("scans a non-trivial set of source files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} has no bare slot identifiers or copy`, () => {
      const code = stripComments(srcSources[file] as string);
      const match = BANNED.exec(code);
      expect(
        match,
        `bare "${match?.[0]}" found — use equipSlots ("Badge Slots") or synergySlots ("Synergy Slots")`,
      ).toBeNull();
    });
  }

  it("POSITIVE CANARY: strings that SHOULD fail the regex do fail it", () => {
    // If any of these stops matching, the lint has gone self-bypassing and is
    // worse than no lint (memory/lessons-learned.md 2026-05-19).
    expect(BANNED.test("const slotCount = 3;")).toBe(true);
    expect(BANNED.test("const numSlots = 5;")).toBe(true);
    expect(BANNED.test("build.slots = 2")).toBe(true);
    expect(BANNED.test('label = "3 slots remaining"')).toBe(true);
    expect(BANNED.test("interface Slot {}")).toBe(true);
  });

  it("negative canary: the canonical prefixed vocabulary passes", () => {
    expect(BANNED.test("const equipSlots = 3;")).toBe(false);
    expect(BANNED.test("const equipSlotsUsed = 2;")).toBe(false);
    expect(BANNED.test("const synergySlots: SynergySlot[] = [];")).toBe(false);
    expect(BANNED.test("type X = SynergySlotId;")).toBe(false);
    expect(BANNED.test('copy = "Badge Slots 2/3"')).toBe(false);
    expect(BANNED.test('copy = "Synergy Slot 5 · Permanent · +2"')).toBe(false);
  });
});

/* ------------------------------------------------------- F8: label split -- */

describe("F8 — display labels are free of the dataset's parse keys", () => {
  it("every attribute has both a source label and a display label", () => {
    for (const attr of ATTRS) {
      expect(ATTR_SOURCE_LABELS[attr], `source label for ${attr}`).toBeTruthy();
      expect(ATTR_LABELS[attr], `display label for ${attr}`).toBeTruthy();
    }
  });

  it("no display label is still an abbreviation", () => {
    // The point of the split. If someone re-points ATTR_LABELS back at the
    // source strings — or "helpfully" shortens one to fit a rail — the UI
    // silently regresses to "Dr Dunk" and nothing else would notice.
    const ABBREVIATIONS = [
      "Dr Dunk", "St Dunk", "Post Ctrl", "Pass Acc", "Ball Hdl", "SWB",
      "Int Def", "Per Def", "Off Reb", "Def Reb", "Spd", "Aglty", "Str",
      "Vert", "3Pt",
    ];
    for (const attr of ATTRS) {
      expect(ABBREVIATIONS, `${attr} display label`).not.toContain(ATTR_LABELS[attr]);
    }
  });

  it("the source labels still match the dataset's own text character-for-character", () => {
    // These are parse keys. Prettifying one silently breaks generation, and
    // the generator would then fail on text it used to read.
    expect(ATTR_SOURCE_LABELS.drivingDunk).toBe("Dr Dunk");
    expect(ATTR_SOURCE_LABELS.speedWithBall).toBe("SWB");
    expect(ATTR_SOURCE_LABELS.threePt).toBe("3Pt");
  });

  it("the two maps genuinely differ — the split is real, not cosmetic", () => {
    const differing = ATTRS.filter((attr) => ATTR_LABELS[attr] !== ATTR_SOURCE_LABELS[attr]);
    expect(differing.length).toBe(15); // all but Close, Layup, Mid, Steal, Block
  });
});

/* --------------------------------------------- F8-E2: containment class 2 -- */

/**
 * CLASS 2 — the roll's containment lint (design-spec §14.8, containment rule 3).
 *
 * The randomizer ships under a NARROW carve-out from a ratified "Never":
 * scope.md §1 cuts ranking / scoring / "best loadout" / "recommended" /
 * "optimal" outright. The carve-out is for a roll that is quality-blind, and
 * the price of the carve-out is that the containment stays MECHANICAL rather
 * than cultural. A helpful comment, a variable named `bestStep`, or a
 * "recommended" in a decline string is how a ratified Never erodes.
 *
 * SUBSTRING-MATCHED, DELIBERATELY UNLIKE CLASS 1. Class 1 uses word boundaries
 * because there the compounds are the SANCTIONED form — `equipSlots` must pass
 * while a bare `slots` must fail. Class 2 is the MIRROR IMAGE: the compounds
 * ARE the violation. `bestStep`, `scoreCandidate` and `rankedSteps` are exactly
 * the identifiers a well-meaning implementer reaches for, and every one of them
 * walks straight through a boundary-anchored pattern.
 *
 * SCOPED to the roll's own modules. A repo-wide class 2 would be nonsense —
 * "quality" and "better" are ordinary English everywhere else — and a lint that
 * fires on correct code gets weakened, which is worse than no lint. F8-R2 adds
 * `src/ui/summary/RollPanel.tsx` to this list when that file exists.
 *
 * F8-E3 adds `src/engine/steps.ts`: the exchange enumerator is where "prefer
 * the trade with the biggest delta" would actually be written, so the file that
 * enumerates the roll's moves now carries the same lint as the file that picks
 * between them. The pattern is UNCHANGED and every canary below is intact.
 */
const CLASS_2 = /scor(?:e|ing)|rank|weight|quality|meta|best|optimal|recommend|suggest|prefer|better/i;

const CLASS_2_SCOPE = [
  "/src/engine/randomize.ts",
  "/src/engine/random.ts",
  "/src/engine/steps.ts",
];

describe("F8-E2 containment lint, class 2: no ranking vocabulary in the roll engine", () => {
  for (const file of CLASS_2_SCOPE) {
    it(`${file} contains no ranking, scoring or quality token`, () => {
      const source = srcSources[file];
      expect(source, `${file} is missing — the class-2 scope drifted`).toBeDefined();
      const code = stripComments(source as string);
      const match = CLASS_2.exec(code);
      expect(
        match,
        `"${match?.[0]}" found in ${file} — the randomizer ships under a narrow ` +
          "carve-out from a ratified Never, and this lint IS the price of it",
      ).toBeNull();
    });
  }

  it("POSITIVE CANARY: strings that SHOULD fail class 2 do fail it", () => {
    // A lint that cannot fail on its own canary is worse than no lint
    // [memory/lessons-learned.md 2026-05-19 "Self-bypassing regex on its own canary"].
    expect(CLASS_2.test("const bestStep = candidates[0];")).toBe(true);
    expect(CLASS_2.test("function scoreCandidate() {}")).toBe(true);
    expect(CLASS_2.test("const rankedSteps = steps.sort();")).toBe(true);
    expect(CLASS_2.test("const stepWeights = [1, 2, 3];")).toBe(true);
    expect(CLASS_2.test('return "recommended for your build";')).toBe(true);
    expect(CLASS_2.test('label = "the optimal loadout"')).toBe(true);
    expect(CLASS_2.test("const suggestion = pick();")).toBe(true);
    expect(CLASS_2.test("const preferred = cheap;")).toBe(true);
    expect(CLASS_2.test('copy = "a better fit"')).toBe(true);
    expect(CLASS_2.test("const badgeQuality = 3;")).toBe(true);
    expect(CLASS_2.test("const metaTier = 1;")).toBe(true);
    // F8-E3's own temptations, named so they cannot arrive by accident.
    expect(CLASS_2.test("const bestExchange = trades[0];")).toBe(true);
    expect(CLASS_2.test("candidates.sort(byHeadroomScore)")).toBe(true);
    expect(CLASS_2.test("const preferHigherCeiling = true;")).toBe(true);
    expect(CLASS_2.test("const deltaWeights = trades.map(t => t.netCost);")).toBe(true);
  });

  it("the substring form closes a miss the boundary form would have shipped", () => {
    const BOUNDED = /\b(?:best|scor(?:e|ing)|rank)\b/i;
    expect(BOUNDED.test("const bestStep = x;")).toBe(false); // the miss, demonstrated
    expect(CLASS_2.test("const bestStep = x;")).toBe(true); // and closed
  });

  it("negative canary: the roll engine's OWN legitimate vocabulary passes", () => {
    expect(CLASS_2.test("const candidates = legalSteps(input, category);")).toBe(false);
    expect(CLASS_2.test("const trades = exchangeSteps(input, category, dataset);")).toBe(false);
    expect(CLASS_2.test("if (netCost <= 0) continue;")).toBe(false);
    expect(CLASS_2.test("const ceiling = ceilingSpendFor(input, category, pool);")).toBe(false);
    expect(CLASS_2.test("exchangeableBadgeIds: rollCreatedIds")).toBe(false);
    expect(CLASS_2.test("const chosen = pickUniform(rng, candidates);")).toBe(false);
    expect(CLASS_2.test("maximal by construction")).toBe(false);
    expect(CLASS_2.test("const bound = rollIterationBound(used, equipSlots);")).toBe(false);
    expect(CLASS_2.test("const applied: LegalStep[] = [];")).toBe(false);
    expect(CLASS_2.test("newBadgesBlockedByBadgeSlots")).toBe(false);
  });

  it("AJ-4: the two KNOWN collisions are documented here, not discovered later", () => {
    // `meta` matches Vite's `import.meta`, and `prefer` matches
    // `prefers-reduced-motion`. Substring matching makes BOTH live rather than
    // theoretical — the right trade for a two-file scope. NEITHER appears in
    // the class-2 scope today, and when one is genuinely needed it must surface
    // as a LOUD FAILURE and a deliberate scope decision, never as a quiet
    // weakening of the pattern.
    expect(CLASS_2.test("import.meta.glob('/src/**')")).toBe(true);
    expect(CLASS_2.test("@media (prefers-reduced-motion: reduce)")).toBe(true);
    for (const file of CLASS_2_SCOPE) {
      const code = stripComments(srcSources[file] as string);
      expect(code.includes("import.meta"), `${file} now uses import.meta`).toBe(false);
      expect(code.includes("prefers-reduced-motion")).toBe(false);
    }
  });

  it("the ONE selection primitive: no sort, no comparator, no extremum over candidates", () => {
    // The structural half of the containment. Class 2 catches the vocabulary;
    // this catches the MECHANISM, which is what actually ranks things.
    const code = stripComments(srcSources["/src/engine/randomize.ts"] as string);
    expect(code).not.toMatch(/\.sort\s*\(/);
    expect(code).not.toMatch(/\.reduce\s*\(/);
    // `badge.name` is NEVER read — the equivariance argument depends on it.
    expect(code).not.toMatch(/\.name\b/);
    // pickUniform is the only selection, and it appears exactly once.
    expect(code.match(/pickUniform\s*\(/g)?.length).toBe(1);
    // EXACTLY ONE extremum is permitted, and it is the LATTICE BOUND rather
    // than a choice between candidates. Pinned by its arguments, so a future
    // `Math.max` over steps cannot hide behind the exemption.
    expect(code.match(/Math\.(?:max|min)\s*\([^)]*\)/g) ?? []).toEqual([
      "Math.max(entriesAtStart, equipSlots)",
    ]);
  });

  it("the SAME structural containment now holds for the exchange enumerator", () => {
    // F8-E3. `steps.ts` is where a comparator over trades would actually be
    // written, so it is held to the same mechanism check — not just the
    // vocabulary one. The single permitted extremum is the LATTICE CEILING,
    // pinned by its arguments so a future extremum over candidates cannot hide
    // behind the exemption.
    const code = stripComments(srcSources["/src/engine/steps.ts"] as string);
    expect(code).not.toMatch(/\.sort\s*\(/);
    expect(code).not.toMatch(/\.reduce\s*\(/);
    expect(code).not.toMatch(/\.name\b/);
    expect(code).not.toMatch(/pickUniform/);
    expect(code.match(/Math\.(?:max|min)\s*\([^)]*\)/g) ?? []).toEqual([
      "Math.min(pointsPool, ceiling)",
    ]);
  });
});
