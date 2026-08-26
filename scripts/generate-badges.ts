/**
 * generate-badges.ts — parses `src/data/badges.source.txt` (the seed's 53-badge
 * prose listing, checked in verbatim) PLUS `src/data/badges.enrichment.source.txt`
 * (F4: the official 2K MyPlayer Builder page's one-line descriptions and NEW
 * flags, transcribed) into `src/data/badges.json`.
 *
 * TWO SOURCE FILES, ONE ENTRY POINT: `generate(sourceText, enrichmentText)`.
 * The badge listing is parsed FIRST, enrichment SECOND, then the two are
 * joined BY NAME. There is deliberately no second exported entry point — two
 * generators is exactly how a dataset drifts from its own regen test.
 *
 * `badges.source.txt` is SEALED-VERBATIM (see src/data/README.md) and a
 * byte-equality test rides on it; descriptions therefore live in a SECOND
 * file, never as an edit to the first.
 *
 * PROVENANCE NOTE: `positionDataVersion` in `src/data/position-heights.ts`
 * (F3) is a SEPARATE provenance line. Bumping DATA_VERSION here does not
 * touch it, and bumping it there does not touch this (scope.md §0.1).
 *
 * Build-time only. This script is the SOLE `fs` consumer in the repo
 * (tech-strategy.md §9); nothing under `src/` may touch the filesystem.
 *
 * Run:  npm run generate:badges     (node executes the .ts directly — no deps)
 *
 * This module is the PURE parser (string in, dataset object out) so the test
 * suite can import it under the repo's browser-typed tsconfig. The filesystem
 * shell lives in scripts/generate-badges-cli.ts — the repo's SOLE fs consumer.
 *
 * Data-refresh workflow: when 2K publishes or patches thresholds, edit
 * `badges.source.txt` (the ONE file where a number may be typed), bump
 * DATA_VERSION / AS_OF / GAME_VERSION / CONFIDENCE below, re-run this script,
 * and review the badges.json diff. A test asserts generate(source) reproduces
 * the checked-in badges.json, so the two can never drift silently.
 *
 * PARSER HAZARD (named in the M1 brief — read before editing):
 * In the source text, U+2014 "—" (em dash) is BOTH the name/attr separator AND
 * the null-threshold token (`Post Ctrl 65/86/96/—`), while heights use
 * U+2013 "–" (en dash). A naive split on every em dash breaks exactly one
 * badge — Unpluckable. The split below is max-split-1 (indexOf + slice; JS
 * String.split with a limit TRUNCATES rather than splitting once).
 *
 * NEVER INVENT 2K27 DATA: this parser throws on anything it does not
 * recognize — an unknown attribute label, a malformed threshold, an unexpected
 * line. Unknown values are never guessed, rounded, or defaulted.
 */

import type { RawAttrLine, RawBadge, RawBadgeDataset } from "../src/engine/types.ts";

/** U+2014 — the name/attr separator AND the null token. */
const EM_DASH = "—";
/** U+2013 — the height-range separator. */
const EN_DASH = "–";

/**
 * Source-label → canonical Attr map, transcribed from the seed's 53-badge
 * listing (the 20 labels that appear in the source text). A bijection onto the
 * 20-value Attr union — `tests/alias-bijection.test.ts` asserts it, because a
 * single wrong entry here would produce a self-consistent, fully-green,
 * systematically WRONG dataset (scope.md §3 H7).
 */
export const ATTR_ALIASES = {
  "3Pt": "threePt",
  "Aglty": "agility",
  "Ball Hdl": "ballHandle",
  "Block": "block",
  "Close": "close",
  "Def Reb": "defReb",
  "Dr Dunk": "drivingDunk",
  "Int Def": "interiorDef",
  "Layup": "layup",
  "Mid": "mid",
  "Off Reb": "offReb",
  "Pass Acc": "passAcc",
  "Per Def": "perimeterDef",
  "Post Ctrl": "postControl",
  "SWB": "speedWithBall",
  "Spd": "speed",
  "St Dunk": "standingDunk",
  "Steal": "steal",
  "Str": "strength",
  "Vert": "vertical",
} as const;

/** Provenance (H8). gameVersion is null until 2K publishes — NEVER guessed. */
const DATA_VERSION = "2026-08-26.1";
const SOURCE =
  "Official 2K material + NBA2KLab, as transcribed in the sealed project seed 2026-08-25" +
  "; badge descriptions + NEW flags from the official 2K MyPlayer Builder page, accessed 2026-08-26";
const AS_OF = "2026-08-26";
const GAME_VERSION: string | null = null;
const CONFIDENCE = "pre-release";

/** The 5-level ladder and per-tier total-to-own costs, transcribed from the
 * seed's "Tiers, levels, and costs" table. Costs cover the 4 PURCHASABLE
 * levels only — Legend is boost-only and has no cost entry, by design (H6). */
const LEVELS = ["bronze", "silver", "gold", "hof", "legend"];
const TIER_COSTS: Record<string, number[]> = {
  A: [3, 5, 6, 7],
  B: [2, 4, 5, 6],
  C: [1, 3, 4, 5],
};

function fail(message: string, line?: string): never {
  throw new Error(
    `generate-badges: ${message}${line === undefined ? "" : `\n  offending line: ${line}`}\n` +
      "Never guess — if the source text changed shape, ask the user.",
  );
}

/** `5'9` → 69 … `7'4` → 88. */
function heightToInches(text: string, line: string): number {
  const match = /^(\d)'(\d{1,2})$/.exec(text);
  if (!match) fail(`unparseable height "${text}"`, line);
  const feet = Number(match[1]);
  const inches = Number(match[2]);
  if (inches > 11) fail(`impossible inches in height "${text}"`, line);
  return feet * 12 + inches;
}

/** Badge name → id, e.g. "High-Flying Denier" → "high-flying-denier". */
export function kebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** One threshold token: an integer, or the em-dash null token. */
function parseThreshold(token: string, line: string): number | null {
  if (token === EM_DASH) return null;
  if (!/^\d+$/.test(token)) fail(`unparseable threshold token "${token}"`, line);
  return Number(token);
}

/** `Dr Dunk 60/70/80/94` → { attr: "drivingDunk", perLevel: [60,70,80,94] }. */
function parseAttrLine(chunk: string, line: string): RawAttrLine {
  const trimmed = chunk.trim();
  const splitAt = trimmed.lastIndexOf(" ");
  if (splitAt === -1) fail(`unparseable attribute chunk "${chunk}"`, line);
  const alias = trimmed.slice(0, splitAt).trim();
  const thresholdText = trimmed.slice(splitAt + 1);
  const attr = (ATTR_ALIASES as Record<string, string>)[alias];
  if (attr === undefined) fail(`unknown attribute label "${alias}"`, line);
  const tokens = thresholdText.split("/");
  if (tokens.length !== 4) {
    fail(`expected 4 thresholds (BRZ/SLV/GLD/HOF), got ${tokens.length}`, line);
  }
  const perLevel = tokens.map((token) => parseThreshold(token, line));
  return { attr, perLevel } as RawAttrLine;
}

/** A roster badge before the enrichment join — everything the SEALED source
 * text supplies. `description` / `isNew` arrive only from the second file. */
type RosterBadge = Omit<RawBadge, "description" | "isNew">;

function parseBadgeLine(line: string, category: string): RosterBadge {
  const body = line.slice(2); // strip "- "

  // MAX-SPLIT-1 on the em dash: everything after the FIRST em dash is the attr
  // spec, which may itself contain em-dash null tokens (Unpluckable).
  const sepAt = body.indexOf(EM_DASH);
  if (sepAt === -1) fail("no em-dash name/attr separator found", line);
  const head = body.slice(0, sepAt).trim();
  const attrSpec = body.slice(sepAt + EM_DASH.length).trim();

  const headMatch = /^(.+) \[([ABC])\] (\S+)$/.exec(head);
  if (!headMatch) fail(`unparseable badge head "${head}"`, line);
  const name = headMatch[1] as string;
  const tier = headMatch[2] as RawBadge["tier"];
  const heightRange = headMatch[3] as string;

  const heights = heightRange.split(EN_DASH);
  if (heights.length !== 2) fail(`unparseable height range "${heightRange}"`, line);
  const heightMinInches = heightToInches(heights[0] as string, line);
  const heightMaxInches = heightToInches(heights[1] as string, line);

  const hasOr = attrSpec.includes(" OR ");
  const hasAnd = attrSpec.includes(" AND ");
  if (hasOr && hasAnd) fail("attribute spec contains both OR and AND", line);
  const logic: RawBadge["requirements"]["logic"] = hasOr ? "or" : hasAnd ? "and" : "single";
  const chunks = hasOr
    ? attrSpec.split(" OR ")
    : hasAnd
      ? attrSpec.split(" AND ")
      : [attrSpec];
  if (logic === "single" ? chunks.length !== 1 : chunks.length !== 2) {
    fail(`unexpected attribute-line arity ${chunks.length} for logic "${logic}"`, line);
  }
  const attrs = chunks.map((chunk) => parseAttrLine(chunk, line));

  return {
    id: kebabCase(name),
    name,
    tier,
    category: category as RawBadge["category"],
    requirements: { heightMinInches, heightMaxInches, logic, attrs },
  };
}

/** One parsed enrichment row: the display payload F4 joins onto a badge. */
interface BadgeEnrichment {
  name: string;
  isNew: boolean;
  description: string;
}

/**
 * Parses `badges.enrichment.source.txt`: 53 pipe-delimited rows,
 * `Name | NEW? | description`. The NEW field is the exact literal `NEW` or
 * empty — nothing else. Row ORDER does not matter (the join is by name); the
 * checked-in file keeps the capture doc's category order for reviewability.
 *
 * Throws — never defaults — on a field count other than 3, a NEW token that
 * is neither `NEW` nor empty, an empty description, an empty name, or a
 * duplicate name.
 */
function parseEnrichment(enrichmentText: string): Map<string, BadgeEnrichment> {
  const rows = new Map<string, BadgeEnrichment>();
  for (const rawLine of enrichmentText.split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") continue;

    const fields = line.split("|");
    if (fields.length !== 3) {
      fail(`enrichment row must have 3 pipe-delimited fields, got ${fields.length}`, line);
    }
    const name = (fields[0] as string).trim();
    const newToken = (fields[1] as string).trim();
    const description = (fields[2] as string).trim();

    if (name === "") fail("enrichment row has an empty badge name", line);
    if (newToken !== "NEW" && newToken !== "") {
      fail(`enrichment NEW token must be "NEW" or empty, got "${newToken}"`, line);
    }
    if (description === "") fail(`enrichment row for "${name}" has an empty description`, line);
    if (rows.has(name)) fail(`enrichment has a duplicate row for "${name}"`, line);

    rows.set(name, { name, isNew: newToken === "NEW", description });
  }
  return rows;
}

/**
 * Joins the enrichment onto the parsed roster BY NAME. Throws on any
 * mismatch in either direction — a name in the enrichment that is not in the
 * roster, a roster name absent from the enrichment, or a row-count mismatch.
 * A name disagreement means the two SOURCES disagree: ask, never adjust.
 */
function joinEnrichment(
  badges: RosterBadge[],
  enrichment: Map<string, BadgeEnrichment>,
): RawBadge[] {
  if (enrichment.size !== badges.length) {
    fail(
      `enrichment row count ${enrichment.size} does not match badge count ${badges.length}`,
    );
  }
  const rosterNames = new Set(badges.map((badge) => badge.name));
  for (const name of enrichment.keys()) {
    if (!rosterNames.has(name)) {
      fail(`enrichment names "${name}", which is not a badge in the roster`);
    }
  }
  return badges.map((badge) => {
    const row = enrichment.get(badge.name);
    if (row === undefined) {
      fail(`badge "${badge.name}" has no row in the enrichment source`);
    }
    return {
      id: badge.id,
      name: badge.name,
      tier: badge.tier,
      category: badge.category,
      description: row.description,
      isNew: row.isNew,
      requirements: badge.requirements,
    };
  });
}

/**
 * Parses the verbatim source listing + the F4 enrichment into the badges.json
 * dataset object. THE single entry point. Order is pinned: roster first (so
 * an unknown attribute label throws ITS OWN error, never a join error), then
 * enrichment, then the name join.
 */
export function generate(sourceText: string, enrichmentText: string): RawBadgeDataset {
  const badges: RosterBadge[] = [];
  let category: string | null = null;
  let expectedInCategory = 0;
  let seenInCategory = 0;

  const closeCategory = (): void => {
    if (category !== null && seenInCategory !== expectedInCategory) {
      fail(
        `category "${category}" header promises ${expectedInCategory} badges but ${seenInCategory} were listed`,
      );
    }
  };

  for (const rawLine of sourceText.split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") continue;

    const header = /^\*\*([A-Za-z]+) \((\d+)\):\*\*$/.exec(line);
    if (header) {
      closeCategory();
      category = header[1] as string;
      expectedInCategory = Number(header[2]);
      seenInCategory = 0;
      continue;
    }

    if (line.startsWith("- ")) {
      if (category === null) fail("badge line before any category header", line);
      badges.push(parseBadgeLine(line, category));
      seenInCategory += 1;
      continue;
    }

    fail("unrecognized line in source text", line);
  }
  closeCategory();

  const enriched = joinEnrichment(badges, parseEnrichment(enrichmentText));

  return {
    dataVersion: DATA_VERSION,
    source: SOURCE,
    asOf: AS_OF,
    gameVersion: GAME_VERSION,
    confidence: CONFIDENCE,
    levels: LEVELS,
    tierCosts: TIER_COSTS,
    badges: enriched,
  } as RawBadgeDataset;
}

/** Canonical serialized form — the exact bytes of src/data/badges.json. */
export function serializeDataset(dataset: RawBadgeDataset): string {
  return `${JSON.stringify(dataset, null, 2)}\n`;
}
