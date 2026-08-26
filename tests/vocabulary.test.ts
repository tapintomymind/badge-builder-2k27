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
import { ROLL_REPORT_CLOSING_LINE } from "../src/ui/summary/RollPanel";

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
  // F8-R2, as the class-2 header above always said it would: the roll's own
  // user-facing surface is where "sorted by most points added" or "highlight
  // the best pickup" would actually get written.
  "/src/ui/summary/RollPanel.tsx",
];

/**
 * THE ONE DOCUMENTED CLASS-2 EXEMPTION, and it is a genuine head-on collision
 * rather than a convenience.
 *
 * §14.7 makes the report's closing line MANDATORY and FIXED:
 *
 *     "Chosen at random from what fits. There is no ranking here."
 *
 * That sentence contains the substring `rank`, which class 2 bans. The two
 * requirements are both ratified and they contradict each other literally.
 *
 * THE RESOLUTION IS NOT TO WEAKEN THE PATTERN. The sentence DENIES ranking —
 * it is containment rule 5 said out loud, and it is the single most important
 * string in the feature. A substring lint cannot tell a denial from an
 * endorsement, so the exact literal is excised before matching and everything
 * else in the file is held to the unmodified pattern. Same posture as AJ-4's
 * `import.meta` / `prefers-reduced-motion` collisions: documented here, not
 * discovered later.
 *
 * The canaries below prove the pattern is intact: the sentence itself STILL
 * fails the raw regex, and a second `rank` anywhere in the file would still be
 * caught.
 */
const CLASS_2_EXEMPT_LITERAL = ROLL_REPORT_CLOSING_LINE;

describe("F8-E2 containment lint, class 2: no ranking vocabulary in the roll engine", () => {
  for (const file of CLASS_2_SCOPE) {
    it(`${file} contains no ranking, scoring or quality token`, () => {
      const source = srcSources[file];
      expect(source, `${file} is missing — the class-2 scope drifted`).toBeDefined();
      // The ONE exemption, excised by EXACT LITERAL — never by relaxing the
      // regex. Everything else in the file faces the unmodified pattern.
      const code = stripComments(source as string).split(CLASS_2_EXEMPT_LITERAL).join(" ");
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

  it("THE EXEMPTION'S CANARY: the ratified sentence still fails the RAW pattern", () => {
    // An exemption without a canary is how a guard goes structurally blind.
    // These three assertions are what keep the class-2 carve-out honest:
    //
    // 1. The exempt sentence genuinely WOULD fail the unmodified pattern — so
    //    the pattern was not quietly relaxed to let it through.
    expect(CLASS_2.test(CLASS_2_EXEMPT_LITERAL)).toBe(true);
    expect(CLASS_2.exec(CLASS_2_EXEMPT_LITERAL)?.[0]?.toLowerCase()).toBe("rank");
    // 2. The exemption is an EXACT LITERAL, not a pattern. A near-miss is not
    //    covered by it, so nobody can widen the hole by paraphrasing.
    const paraphrase = "Chosen at random. There is no ranking of any kind here.";
    expect(paraphrase).not.toBe(CLASS_2_EXEMPT_LITERAL);
    expect(CLASS_2.test(paraphrase.split(CLASS_2_EXEMPT_LITERAL).join(" "))).toBe(true);
    // 3. A SECOND ranking token in the exempted file is still caught — excising
    //    the sentence removes that sentence, not the whole file's coverage.
    const withExtra = `const x = "${CLASS_2_EXEMPT_LITERAL}"; const bestStep = y;`;
    expect(CLASS_2.test(withExtra.split(CLASS_2_EXEMPT_LITERAL).join(" "))).toBe(true);
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

/* --------------------------------------------- F8-R2: vocabulary class 3 -- */

/**
 * CLASS 3 — the Pin/Lock collision lint (design-spec §14.1, AJ-3).
 *
 * §14.1's vocabulary ruling is a BUG FIX, not a preference, and without this
 * lint it is unenforceable. `lock` is already taken TWICE in this app:
 * §10.1's `Locked by attributes` pip state, carried by a 🔒 glyph on up to 53
 * cards, and §3.5's `Locked — unlock to assign badges` Synergy Slot state with
 * its `unlock` Toggle. A `Pin` control labelled `Lock`, sitting on a card that
 * renders 🔒-locked pips six pixels away, is the H1 failure mode exactly — one
 * word for two things — one level up from the bare-`slot` case H1 was written
 * for.
 *
 * THE FAILURE MODE IS QUIET: an implementer writes `Lock`, every other test
 * stays green, and H1's doctrine is broken by a synonym. Hence a lint.
 *
 * Canonical instead: Pin · Pinned · Unpin · Exclude · Excluded.
 */
const CLASS_3 = /\b(?:locks?|locked|freeze|frozen)\b/i;

const CLASS_3_SCOPE = [
  "/src/engine/steps.ts",
  "/src/engine/randomize.ts",
  "/src/engine/random.ts",
  "/src/engine/summary.ts",
  "/src/engine/summary-text.ts",
  "/src/ui/summary/LoadoutRoster.tsx",
  "/src/ui/summary/SynergyDigest.tsx",
  "/src/ui/summary/SummaryTextBlock.tsx",
  "/src/ui/summary/RollPanel.tsx",
  "/src/ui/primitives/PinControl.tsx",
];

/**
 * DELIBERATELY OUT OF SCOPE, and naming them here is the point — an allowlist
 * whose exclusions are undocumented rots into "whatever was passing that day".
 *
 *   src/ui/grid/BadgeCard.tsx       §10.1's "Locked by attributes" pip state
 *                                   is CORRECT and must keep saying `Locked`.
 *   src/ui/synergy/SynergyPanel.tsx §3.5's "Locked — unlock to assign badges"
 *                                   is CORRECT for the same reason.
 *
 * Both are the ORIGINAL meanings of the word. The rename moved the NEW concept
 * off the collision; it did not evict the incumbents.
 */
const CLASS_3_OUT_OF_SCOPE = ["/src/ui/grid/BadgeCard.tsx", "/src/ui/synergy/SynergyPanel.tsx"];

describe("F8-R2 vocabulary lint, class 3: the pin is never called a lock", () => {
  for (const file of CLASS_3_SCOPE) {
    it(`${file} carries no lock/freeze vocabulary`, () => {
      const source = srcSources[file];
      expect(source, `${file} is missing — the class-3 scope drifted`).toBeDefined();
      const code = stripComments(source as string);
      const match = CLASS_3.exec(code);
      expect(
        match,
        `"${match?.[0]}" found in ${file} — §14.1 renamed this concept to Pin ` +
          "precisely because `lock` already means two other things in this app",
      ).toBeNull();
    });
  }

  it("POSITIVE CANARY: strings that SHOULD fail class 3 do fail it", () => {
    // A lint that cannot fail on its own canary is worse than no lint. Do NOT
    // weaken the pattern to make these pass.
    expect(CLASS_3.test("<button>Lock</button>")).toBe(true);
    expect(CLASS_3.test('label = "Locked"')).toBe(true);
    expect(CLASS_3.test("const locked = true;")).toBe(true);
    expect(CLASS_3.test("function freeze() {}")).toBe(true);
    expect(CLASS_3.test("const frozen = new Set();")).toBe(true);
    expect(CLASS_3.test('copy = "Lock this badge"')).toBe(true);
    expect(CLASS_3.test('<PinControl label="Lock" />')).toBe(true);
  });

  it("the boundary form is REQUIRED by AJ-4, and its blind spot is the price", () => {
    // Class 3 is WORD-BOUNDED, unlike class 2 which is substring-matched. That
    // is forced, not chosen: `unlock` and `unlocked` CONTAIN `lock`, and both
    // are ratified shipped vocabulary (SynergySlot.unlocked, "N of 8 Synergy
    // Slots unlocked"). A substring class 3 would fire on correct code on day
    // one, and a lint that fires on correct code gets weakened — which is the
    // failure this whole family of tests exists to prevent.
    //
    // THE COST, stated so it is a known hole rather than a surprise: compound
    // identifiers escape. `freezeEntry` and `lockedBy` do NOT match.
    expect(CLASS_3.test("function freezeEntry() {}")).toBe(false);
    expect(CLASS_3.test("const lockedBy = user;")).toBe(false);
    // This is acceptable HERE and would not be in class 2, because the target
    // is USER-VISIBLE COPY on a control — `Lock`, `Locked` — which is a
    // standalone word by construction. Class 2's targets (`bestStep`,
    // `rankedSteps`) are compounds by construction, which is exactly why that
    // class is substring-matched and this one is not.
  });

  it("AJ-4: `unlock` is deliberately ABSENT from the pattern", () => {
    // SynergySlot.unlocked is a SHIPPED FIELD and "N of 8 Synergy Slots
    // unlocked" is ratified copy (§3.5, §14.4). Adding `unlock` to the pattern
    // would fire on correct, ratified vocabulary — and a lint that fires on
    // correct code gets weakened, which is worse than no lint.
    //
    // The failure this class targets is A PIN LABELLED `Lock`, and `lock` +
    // `locked` catch it. That is the whole job.
    expect(CLASS_3.test("synergySlot.unlocked")).toBe(false);
    expect(CLASS_3.test('aria-label="Unlock badge"')).toBe(false);
    expect(CLASS_3.test('copy = "3 of 8 Synergy Slots unlocked"')).toBe(false);
    expect(CLASS_3.test("unlock to assign badges")).toBe(false);
  });

  it("negative canary: the canonical pin vocabulary passes", () => {
    for (const word of ["Pin", "Pinned", "Unpin", "Exclude", "Excluded"]) {
      expect(CLASS_3.test(`<button>${word}</button>`), word).toBe(false);
    }
    expect(CLASS_3.test('"Pinned — holds the Fuse role in Synergy Slot 5."')).toBe(false);
  });

  it("the two out-of-scope files still use `Locked` — the exclusion is LIVE, not vestigial", () => {
    // If §10.1's pip state or §3.5's Synergy Slot state ever stops saying
    // `Locked`, this exclusion is dead weight and should be deleted rather than
    // left as a permanent hole in the lint.
    for (const file of CLASS_3_OUT_OF_SCOPE) {
      const source = srcSources[file];
      expect(source, `${file} is missing`).toBeDefined();
      expect(
        CLASS_3.test(stripComments(source as string)),
        `${file} no longer uses Locked — retire its class-3 exclusion`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------- 2026-08-26: vocabulary class 4 -- */

/**
 * CLASS 4 — the badge currency is "Badge Tokens", and never "Badge Points".
 *
 * "Badge Tokens" is 2K's own term, printed on the official 2K MyPlayer Builder
 * page. The app shipped "Badge Points" through its early milestones and
 * adopted 2K's word app-wide on 2026-08-26. This lint is what stops the old
 * word creeping back one string at a time.
 *
 * WHAT IT ENFORCES, AND DELIBERATELY NOTHING MORE: the phrase "Badge Points"
 * (or its singular) must not appear in shipped code or copy. It does NOT
 * mandate the full term everywhere. Bare "token" / "tokens" is permitted in
 * exactly the places bare "point" / "points" was permitted before the sweep —
 * the preview strip, the re-roll dialog's blast radius, BadgeCard's aria
 * labels — and in no new places.
 *
 * NARROWER THAN CLASS 1 ON PURPOSE. Bare `slot` is banned because it COLLIDES:
 * "slot" means both Badge Slots and Synergy Slots, so a bare use is genuinely
 * ambiguous. There is only one token currency, so no such collision exists,
 * the analogy does not carry, and it is not extended. Expanding bare "tokens"
 * into the full term everywhere would invent a copy standard mid-ship, which
 * is more risk than the inconsistency it would fix.
 *
 * IDENTIFIERS ARE OUT OF REACH BY CONSTRUCTION, which is the whole trick. Every
 * field name, every persisted localStorage key and every serialized SavedBuild
 * field still says `points`: `serializeSavedBuild` is a bare `JSON.stringify`
 * with no translation boundary, so renaming one would strand every build a user
 * has already saved (see the storage note on `BonusBudget` in
 * src/engine/types.ts). The pattern REQUIRES WHITESPACE between the two words,
 * so `overByBadgePoints`, `earnedPoints` and `remainingPoints` can never match
 * it however this file evolves.
 *
 * COMMENTS ARE STRIPPED, exactly as class 1 does — code and string copy are
 * what ship. That is also what lets the seam comment in types.ts name the old
 * word in order to explain the divergence.
 */
const CLASS_4 = /badge\s+points?/i;

describe("vocabulary lint, class 4: the currency is Badge Tokens, never Badge Points", () => {
  const files = Object.keys(srcSources);

  it("scans a non-trivial set of source files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} does not say "Badge Points"`, () => {
      const code = stripComments(srcSources[file] as string);
      const match = CLASS_4.exec(code);
      expect(
        match,
        `"${match?.[0]}" found in ${file} — the currency is "Badge Tokens" ` +
          "(2K's own term, adopted app-wide 2026-08-26). Identifiers and " +
          "serialized fields keep `points` and cannot match this pattern.",
      ).toBeNull();
    });
  }

  it("POSITIVE CANARY: strings that SHOULD fail class 4 do fail it", () => {
    // A lint that cannot fail on its own canary is worse than no lint
    // [memory/lessons-learned.md 2026-05-19]. Do NOT weaken the pattern to
    // make these pass.
    expect(CLASS_4.test('<th scope="col">Badge Points</th>')).toBe(true);
    expect(CLASS_4.test('label = "Bonus Badge Points earned in total"')).toBe(true);
    expect(CLASS_4.test("copy = `Badge Points ${spent} / ${pool}`")).toBe(true);
    expect(CLASS_4.test('noun = "Badge Point"')).toBe(true);
    expect(CLASS_4.test('<td data-pool="Badge Points">')).toBe(true);
    // Casing and whitespace variants are all the same violation.
    expect(CLASS_4.test("badge points")).toBe(true);
    expect(CLASS_4.test("BADGE POINTS")).toBe(true);
    expect(CLASS_4.test("Badge  Points")).toBe(true);
    expect(CLASS_4.test("Badge\n          Points")).toBe(true); // wrapped JSX text
  });

  it("THE REGRESSION CANARY: the lint fails on a REAL source file when the old word returns", () => {
    // The canary that actually matters, and the one this codebase has three
    // times lacked: not "does the regex match a literal" but "does the LINT
    // MECHANISM — stripComments + exec, over genuine file contents — go red
    // when someone reintroduces the old vocabulary?" Watched failing here so
    // nobody has to discover it in production copy.
    const real = srcSources["/src/ui/grid/CategoryLedger.tsx"] as string;
    expect(real, "CategoryLedger.tsx is missing — the class-4 canary drifted").toBeDefined();

    // As it ships today: clean. Comments are stripped FIRST, so what remains
    // is exactly the code and copy that reaches a user.
    const shipped = stripComments(real);
    expect(CLASS_4.exec(shipped)).toBeNull();

    // Reintroduce the old word exactly as a careless revert would — in the
    // rendered ledger lede. Replacing inside the STRIPPED text guarantees the
    // regression lands in shipped copy rather than in prose the lint ignores.
    const regressed = shipped.replace("Badge Tokens", "Badge Points");
    expect(regressed, "the replace found nothing — the fixture drifted").not.toBe(shipped);
    const caught = CLASS_4.exec(regressed);
    expect(caught, "class 4 did NOT catch a reintroduced 'Badge Points'").not.toBeNull();
    expect(caught?.[0]).toBe("Badge Points");

    // And a comment-only mention stays legal — that is what lets types.ts
    // explain the display/storage divergence by naming the old word.
    const commentOnly = `// the 2026-08-26 "Badge Points" -> "Badge Tokens" sweep\nconst x = 1;`;
    expect(CLASS_4.exec(stripComments(commentOnly))).toBeNull();
  });

  it("negative canary: the new vocabulary and the surviving identifiers pass", () => {
    expect(CLASS_4.test('<th scope="col">Badge Tokens</th>')).toBe(false);
    expect(CLASS_4.test('copy = "Badge Tokens 12 base + 4 bonus"')).toBe(false);
    expect(CLASS_4.test('copy = "Tokens are unchanged."')).toBe(false);
    // THE IMPORTANT HALF: every persisted / serialized name must stay legal,
    // because every one of them still says `points` and must keep doing so.
    expect(CLASS_4.test("const overByBadgePoints = x;")).toBe(false);
    expect(CLASS_4.test("bonus.earnedPoints")).toBe(false);
    expect(CLASS_4.test("bonus.appliedPoints[category]")).toBe(false);
    expect(CLASS_4.test("const { spent, remainingPoints } = readout;")).toBe(false);
    expect(CLASS_4.test("budgets: Record<Category, Budget> // { equipSlots, points }")).toBe(false);
    expect(CLASS_4.test('onEarnedCommit("points", value)')).toBe(false);
    // Badge Slots and Synergy Slots are untouched by this rename.
    expect(CLASS_4.test('copy = "Badge Slots 2/3"')).toBe(false);
    expect(CLASS_4.test('copy = "Synergy Slot 5 · Permanent · +2"')).toBe(false);
  });
});
