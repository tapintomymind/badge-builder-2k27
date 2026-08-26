/**
 * Shared engine types. Pure declarations — no DOM, no React, no I/O.
 *
 * Two families exist deliberately:
 *  - Raw* types mirror src/data/badges.json byte-for-byte: positional
 *    4-arrays exactly as the seed specifies the JSON shape.
 *  - Loaded types are the in-memory representation after src/engine/dataset.ts
 *    keys the arrays by PurchasableLevel (H6). After the loader, NO positional
 *    indexing exists anywhere in the codebase.
 */

import type { Attr, Category, Level, PurchasableLevel, Tier } from "./vocabulary";

/** The user's build — input to eligibility. */
export interface Build {
  /** 69 (5'9") … 88 (7'4"). */
  heightInches: number;
  /** Bounds the build's height range (user-supplied position→height table,
   * validate-build.ts / scope.md §0.1 A2) and still gates NO badges — no
   * badge's eligibility consults position. Unset = "Any": the dataset's own
   * full height range applies. */
  position?: "PG" | "SG" | "SF" | "PF" | "C";
  /** 0–99 per attribute. THE ENTERED VALUE — what the build has from the
   * slider, BEFORE cap breakers. Written by the sliders; never derived. */
  attributes: Record<Attr, number>;
  /**
   * scope.md §0.1 A6 — CAP BREAKERS [official 2K page + user directive
   * 2026-08-26].
   *
   * The ABSOLUTE cap-broken value of an attribute, as the user read it off
   * the 2K builder. NOT a delta, NOT a count of cap breakers spent, NOT
   * derived from anything. Absent key ⇒ that attribute has no cap breaker.
   *
   * The cap-breaker → boost mapping is UNPUBLISHED and is NEVER computed
   * here: 5 breakers took the user's Three-Point 60 → 83, which is neither
   * +1 each nor evenly divided. The user tracks it; the app honours it.
   *
   * OPTIONAL IN TYPESCRIPT TOO, DELIBERATELY, AND IT IS THE MOST LOAD-BEARING
   * LINE IN THE A6 DIFF [A6-R5]. `SavedBuild.build` reaches the typed world
   * through `envelope["build"] as unknown as Build` — a compiler BLIND SPOT
   * on the persisted-read path. Required-in-TS would compile, every in-memory
   * test would pass (they are compiler-forced to supply the field), and only
   * a REAL reload of a pre-A6 autosave would throw. Optional makes that cast
   * honest: absent IS a legal value of the type, so there is no normalizer to
   * forget. There is deliberately NO `normalizeBuild()`.
   *
   * A wire `null` is legal and means absent, so this field can be `null` AT
   * RUNTIME despite the type — read it through `?.`, never a truthiness test.
   *
   * READ IT ONLY THROUGH `effectiveAttribute` (src/engine/attributes.ts).
   * Naming it anywhere else is a lint failure — architecture.test.ts (g).
   */
  capBrokenAttributes?: Partial<Record<Attr, number>>;
}

// ---------------------------------------------------------------------------
// Raw shapes — exactly the badges.json wire format (seed: Data).
// ---------------------------------------------------------------------------

export interface RawAttrLine {
  attr: Attr;
  /** [BRZ, SLV, GLD, HOF] — positional. null = level unreachable via this attribute line (H3). */
  perLevel: (number | null)[];
}

export interface RawBadgeRequirements {
  heightMinInches: number;
  heightMaxInches: number;
  logic: "single" | "and" | "or";
  /** 1 line for single, 2 for and/or (H7 arity invariant). */
  attrs: RawAttrLine[];
}

export interface RawBadge {
  id: string;
  name: string;
  tier: Tier;
  category: Category;
  /** The official page's one-line ability summary (F4). Display only — it
   * gates nothing. Joined by NAME from badges.enrichment.source.txt; the
   * generator throws before an absent value can exist, so this is REQUIRED
   * rather than optional (an optional field would model a state the pipeline
   * forbids). */
  description: string;
  /** The official page's NEW flag (F4). Display only — no filter, no sort,
   * no grouping. */
  isNew: boolean;
  requirements: RawBadgeRequirements;
}

/** The full badges.json document, including H8 provenance. */
export interface RawBadgeDataset {
  dataVersion: string;
  source: string;
  asOf: string;
  /** The 2K27 patch this reflects — null until known. NEVER guessed. */
  gameVersion: string | null;
  confidence: "pre-release" | "launch" | "patched";
  levels: string[];
  /** Positional [BRZ, SLV, GLD, HOF] total-to-own costs per tier. */
  tierCosts: Record<Tier, number[]>;
  badges: RawBadge[];
}

// ---------------------------------------------------------------------------
// Loaded shapes — keyed records, no positional indexing (H6).
// ---------------------------------------------------------------------------

/** Thresholds keyed by purchasable level. null = unreachable via this line. */
export type PerLevelThresholds = Record<PurchasableLevel, number | null>;

export interface AttrLine {
  attr: Attr;
  perLevel: PerLevelThresholds;
}

export interface BadgeRequirements {
  heightMinInches: number;
  heightMaxInches: number;
  logic: "single" | "and" | "or";
  attrs: AttrLine[];
}

export interface Badge {
  id: string;
  name: string;
  tier: Tier;
  category: Category;
  /** See RawBadge.description — required, display only. */
  description: string;
  /** See RawBadge.isNew — required, display only. */
  isNew: boolean;
  requirements: BadgeRequirements;
}

/** Total-to-own cost per tier per purchasable level. Legend has NO entry —
 * the type makes Legend indexing a compile error (H6). */
export type TierCosts = Record<Tier, Record<PurchasableLevel, number>>;

export interface BadgeDataset {
  dataVersion: string;
  source: string;
  asOf: string;
  gameVersion: string | null;
  confidence: "pre-release" | "launch" | "patched";
  levels: readonly Level[];
  tierCosts: TierCosts;
  badges: Badge[];
}

// ---------------------------------------------------------------------------
// Eligibility (H3).
// ---------------------------------------------------------------------------

export interface BadgeEligibility {
  /** Height in range. A height failure blocks the badge entirely. */
  allowed: boolean;
  /** Highest level that passes, each level evaluated INDEPENDENTLY (gaps are
   * legal — costs are total-to-own, not cumulative). null = none passes. */
  maxPurchasableLevel: PurchasableLevel | null;
  /** Human-readable failing requirements, e.g. `needs 83 3Pt for Gold`. */
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Loadout, budget, ledger inputs.
// ---------------------------------------------------------------------------

/** Purchased ≡ equipped (H1 glossary): a badge is equipped iff it has a
 * LoadoutEntry. There is no benched state. Effective level is DERIVED (M2),
 * never stored. */
export interface LoadoutEntry {
  badgeId: string;
  purchasedLevel: PurchasableLevel;
}

/** Per-category capacity + points — "Badge Slots" in UI copy (H1). Values are
 * manual user inputs until 2K publishes the derivation (seed Open item #3). */
export interface Budget {
  equipSlots: number;
  points: number;
}

/**
 * Build-level bonus Badge Slots and Badge Points earned BEYOND the 20-Badge-Slot
 * baseline, plus how the user has currently applied them across the six
 * categories.
 *
 * OFFICIAL 2K27 MECHANIC, not an app invention. Bonus Slots and Tokens are
 * earned through Build Specialization, Seasons and Crew rewards; bonus tokens
 * are versatile (spendable in any discipline); and they can be reassigned at
 * any time — apply a Bonus Slot to Finishing, change your mind, apply it to
 * Defense. NOTHING HERE EVER LOCKS.
 * [official 2K page + user observation 2026-08-26]
 *
 * THERE IS NO PUBLISHED CAP ON EITHER TOTAL and none is modelled. Both are
 * user-entered and grow as the user earns more. A constant here would be
 * invented 2K27 data — the one thing the seed forbids outright.
 *
 * A SEPARATE LAYER, NEVER MERGED INTO `budgets`. The effective per-category
 * capacity/pool is composed in exactly one place — `effectiveBudgets` in
 * src/engine/budget.ts (scope.md §0.1 A5-R1, A5-R4).
 */
export interface BonusBudget {
  /** TOTAL bonus Badge Slots earned. User-entered, growable. Default 0. */
  earnedEquipSlots: number;
  /** TOTAL bonus Badge Points earned. 2K's page calls these "Badge Tokens";
   *  this app has said "Badge Points" since M1 and keeps doing so (H1).
   *  User-entered, growable. Default 0. */
  earnedPoints: number;
  /** How many of `earnedEquipSlots` are applied to each category right now.
   *  Σ ≤ earnedEquipSlots is SOFT (validateLoadout), never enforced here and
   *  NEVER at the JSON boundary. Freely reversible; nothing locks. */
  appliedEquipSlots: Record<Category, number>;
  /** How many of `earnedPoints` are applied to each category right now.
   *  Same rules. */
  appliedPoints: Record<Category, number>;
}

// ---------------------------------------------------------------------------
// Synergy — TYPE ONLY at M1 (scope.md §2 M1 carve-out). The serializer
// round-trips `SavedBuild.synergy` opaquely; ZERO synergy behavior ships
// before M2.
// ---------------------------------------------------------------------------

export type SynergySlotId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** One of the 8 synergy slots (seed: Synergy system). */
export interface SynergySlot {
  id: SynergySlotId;
  unlocked: boolean;
  /** Synergy slots 1–4 are temporary (season reset); 5–8 permanent. */
  permanence: "temporary" | "permanent";
  /** +1 or +2. [A7] Synergy Slots 7 AND 8 are RATIFIED +2 (7 = Build
   * Specialization Level 10; 8 ratified 2026-08-26 — see
   * RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS). The pair fills the sealed cap, so
   * the config `plusTwoSlotIds` designation seam has nothing left to add.
   * Still NEVER guessed — both landed on ratifications. */
  magnitude: 1 | 2;
  /**
   * F4 (RATIFIED, official 2K MyPlayer Builder page + user ratification
   * 2026-08-26): Build Specialization Synergy Slots hold only badges of
   * their own discipline; every other Synergy Slot is interchangeable.
   * null = interchangeable — the correct and PERMANENT value for Synergy
   * Slots 1-6 and 8, and the pre-selection value for Synergy Slot 7 (whose
   * discipline the planner cannot know, so the user picks it). [A7] Synergy
   * Slot 8 stays in the null set even though it is now a ratified +2: the
   * lock rides Build Specialization, which is Synergy Slot 7's reward alone
   * (see offersDisciplineLock, deliberately NOT isRatifiedPlusTwo).
   * Enforced HARD in assignSynergy + validateLoadout; never auto-cleared.
   */
  disciplineLock: Category | null;
  fuseBadgeId: string | null;
  reactionBadgeId: string | null;
}

/** The two synergy role positions a SynergySlot pairs (seed: Synergy system). */
export type SynergyRoleKind = "fuse" | "reaction";

/**
 * The single synergy role a badge holds — AT MOST ONE, EVER (H5). Enforced by
 * assignSynergy (H4 invariant class) and read back via synergyRoleFor.
 * Magnitude is the holding synergy slot's magnitude — data, not a constant.
 */
export interface SynergyRole {
  kind: SynergyRoleKind;
  synergySlotId: SynergySlotId;
  magnitude: 1 | 2;
}

/**
 * The two DISPLAY-ONLY simulation toggles (H2). This type is an input to
 * boost / effectiveLevel rendering paths ONLY. It is — by design — a
 * different type from LedgerBasis, so no ledger function can accept it.
 */
export interface OverlayState {
  reactionsActive: boolean;
  seasonReset: boolean;
}

/**
 * The LEDGER-ONLY basis channel (H2). The refund ledger is computed from
 * committed state; season reset is reachable only through the parallel
 * "postSeasonReset" value (rendered by M4 as a second, labelled row).
 * `reactionsActive` has no representation here — structurally, the ledger's
 * signature cannot accept it. That is the control; tests are the backstop.
 */
export type LedgerBasis = "current" | "postSeasonReset";

// ---------------------------------------------------------------------------
// Config seams (seed: Open items — implement behind config, don't guess).
// ---------------------------------------------------------------------------

/**
 * Seed Open item #1 is RESOLVED (F4). The official 2K MyPlayer Builder page
 * states that placing a badge in a Fuse position "entirely frees up the Badge
 * Tokens" spent on it; the user ratified it 2026-08-26. `onFuse` is therefore
 * the DEFAULT. The three Legend/HOF variants remain selectable alternates.
 */
export type RefundTrigger =
  | "onFuse"
  | "legendByAnyMeans"
  | "legendByPermanentBoostOnly"
  | "hofOrAbove";

/** Seed Open item #3: the attribute → (equipSlots, points) derivation is
 * unpublished. `manual` is active; `derived` throws NotYetPublishedError. */
export type BudgetStrategy = "manual" | "derived";

export interface AppConfig {
  refundTrigger: RefundTrigger;
  /**
   * Seed Open item #2, RESOLVED as of [A7]: Synergy Slots 7 and 8 are both
   * +2 (7 = Build Specialization Level 10 — RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS
   * in src/engine/synergy.ts). This seam designates Synergy Slots the user
   * picked as +2 BEYOND the ratified set, and the ratified set now fills the
   * cap on its own. Retyped from the old 2-tuple to a
   * plain readonly array for shape only — see src/config/index.ts for why
   * NOTHING writes it today.
   */
  plusTwoSlotIds: readonly SynergySlotId[] | null;
  budgetStrategy: BudgetStrategy;
}

// ---------------------------------------------------------------------------
// Persistence envelope (H8). Pure shape — serialization is pure string↔object;
// the localStorage adapter is M3's src/persist/, NOT the engine.
// ---------------------------------------------------------------------------

export interface SavedBuild {
  /** localStorage envelope version — the migration seam (one-way door). */
  schemaVersion: 1;
  /** The badges.json dataVersion this plan was made against (H8 drift). */
  dataVersion: string;
  savedAt: string;
  name: string;
  build: Build;
  budgets: Record<Category, Budget>;
  /**
   * [A5] The bonus layer. ADDITIVE-OPTIONAL ON THE WIRE, REQUIRED HERE.
   *
   * Optionality exists in the JSON only: a pre-A5 file has no `bonus` key and
   * the deserializer normalizes the absence to `zeroBonus()` at its ONE
   * normalization point. In memory, absence would model a state the pipeline
   * cannot produce — so this is required and `tsc` forces every literal to say
   * so (the F4 `description` / `isNew` precedent, in the safe direction).
   *
   * NOT merged into `budgets`: `budgets` stays the BASE six, and the effective
   * capacity/pool is composed by `effectiveBudgets`. schemaVersion stays 1 —
   * the change is a strict superset with nothing to migrate (A5-R5).
   */
  bonus: BonusBudget;
  loadout: LoadoutEntry[];
  /** TYPE-only at M1 — round-tripped opaquely by the serializer. */
  synergy: SynergySlot[];
  config: AppConfig;
}
