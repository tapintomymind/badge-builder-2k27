/**
 * Canonical vocabulary (H1, H6, H7). Every union in the codebase is defined
 * here, once. See docs/vocabulary.md for the human-readable glossary.
 *
 * H1 note: the bare token "slot" is BANNED in identifiers and user-visible
 * copy. Per-category badge capacity is `equipSlots` ("Badge Slots" in UI);
 * the 8 global fuse/reaction pairs are `synergySlots` ("Synergy Slots" in UI).
 * tests/vocabulary.test.ts lints for violations.
 */

/** The full 5-level ladder. Legend is boost-only — never purchasable. */
export const LEVELS = ["bronze", "silver", "gold", "hof", "legend"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The 4 purchasable levels (H6). `Exclude<Level, "legend">` makes the
 * compiler the first guard against Legend indexing into 4-entry cost arrays.
 */
export type PurchasableLevel = Exclude<Level, "legend">;
export const PURCHASABLE_LEVELS = ["bronze", "silver", "gold", "hof"] as const satisfies readonly PurchasableLevel[];

export const TIERS = ["A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Badge categories (capitalized, 6) — H7. A SEPARATE constant from
 * ATTR_GROUPS, never derived from it: cross-group badges exist (Physical
 * Finisher is category Finishing but requires strength, a Physicals
 * attribute), so any refactor that derives one from the other is wrong.
 */
export const CATEGORIES = [
  "Finishing",
  "Shooting",
  "Playmaking",
  "Defense",
  "Rebounding",
  "Physicals",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Attribute groups (lowercase, 6) — groups ATTRIBUTES, not badges. */
export const ATTR_GROUPS = [
  "finishing",
  "shooting",
  "playmaking",
  "defense",
  "rebounding",
  "physicals",
] as const;
export type AttrGroup = (typeof ATTR_GROUPS)[number];

/** The canonical 20-value attribute union, exactly the seed's `Attr` type. */
export const ATTRS = [
  "close",
  "layup",
  "drivingDunk",
  "standingDunk",
  "postControl",
  "mid",
  "threePt",
  "passAcc",
  "ballHandle",
  "speedWithBall",
  "interiorDef",
  "perimeterDef",
  "steal",
  "block",
  "offReb",
  "defReb",
  "speed",
  "agility",
  "strength",
  "vertical",
] as const;
export type Attr = (typeof ATTRS)[number];

/** Which attribute group each attribute belongs to (from the seed's `Attr`
 * type comments). Used to DOCUMENT cross-group badges, never to derive
 * `Category` from an attribute. */
export const ATTR_GROUP_OF: Record<Attr, AttrGroup> = {
  close: "finishing",
  layup: "finishing",
  drivingDunk: "finishing",
  standingDunk: "finishing",
  postControl: "finishing",
  mid: "shooting",
  threePt: "shooting",
  passAcc: "playmaking",
  ballHandle: "playmaking",
  speedWithBall: "playmaking",
  interiorDef: "defense",
  perimeterDef: "defense",
  steal: "defense",
  block: "defense",
  offReb: "rebounding",
  defReb: "rebounding",
  speed: "physicals",
  agility: "physicals",
  strength: "physicals",
  vertical: "physicals",
};

/**
 * Display labels for attributes — the seed's own short labels, transcribed
 * independently of the generator's ATTR_ALIASES map (scripts/). A test
 * asserts the two maps are mutual inverses, so a transcription slip in either
 * fails loudly instead of shipping.
 */
export const ATTR_LABELS: Record<Attr, string> = {
  close: "Close",
  layup: "Layup",
  drivingDunk: "Dr Dunk",
  standingDunk: "St Dunk",
  postControl: "Post Ctrl",
  mid: "Mid",
  threePt: "3Pt",
  passAcc: "Pass Acc",
  ballHandle: "Ball Hdl",
  speedWithBall: "SWB",
  interiorDef: "Int Def",
  perimeterDef: "Per Def",
  steal: "Steal",
  block: "Block",
  offReb: "Off Reb",
  defReb: "Def Reb",
  speed: "Spd",
  agility: "Aglty",
  strength: "Str",
  vertical: "Vert",
};

/** User-visible level names. */
export const LEVEL_LABELS: Record<Level, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  hof: "HOF",
  legend: "Legend",
};

/** Position of a level on the 5-level ladder (bronze = 0 … legend = 4). */
export function levelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

/** 69 → `5'9"` … 88 → `7'4"`. */
export function formatHeightInches(heightInches: number): string {
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  return `${feet}'${inches}"`;
}
