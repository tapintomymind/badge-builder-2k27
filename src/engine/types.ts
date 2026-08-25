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

/** The user's build — input to eligibility. Position is cosmetic only. */
export interface Build {
  /** 69 (5'9") … 88 (7'4"). */
  heightInches: number;
  /** Display metadata only — gates nothing. */
  position?: "PG" | "SG" | "SF" | "PF" | "C";
  /** 0–99 per attribute. */
  attributes: Record<Attr, number>;
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
  /** +1 or +2. Which two synergy slots are +2 is TBD — config `plusTwoSlotIds`
   * stays null until the user designates them. NEVER guessed. */
  magnitude: 1 | 2;
  fuseBadgeId: string | null;
  reactionBadgeId: string | null;
}

// ---------------------------------------------------------------------------
// Config seams (seed: Open items — implement behind config, don't guess).
// ---------------------------------------------------------------------------

/** Seed Open item #1: the refund trigger condition is unconfirmed. Default is
 * the seed's stated default, `legendByAnyMeans`. */
export type RefundTrigger =
  | "legendByAnyMeans"
  | "legendByPermanentBoostOnly"
  | "hofOrAbove";

/** Seed Open item #3: the attribute → (equipSlots, points) derivation is
 * unpublished. `manual` is active; `derived` throws NotYetPublishedError. */
export type BudgetStrategy = "manual" | "derived";

export interface AppConfig {
  refundTrigger: RefundTrigger;
  /** Seed Open item #2: which two synergy slots carry +2. null until the user
   * designates exactly two. NEVER guessed. */
  plusTwoSlotIds: readonly [SynergySlotId, SynergySlotId] | null;
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
  loadout: LoadoutEntry[];
  /** TYPE-only at M1 — round-tripped opaquely by the serializer. */
  synergy: SynergySlot[];
  config: AppConfig;
}
