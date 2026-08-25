/**
 * Synergy engine (M2) — seed: Synergy system, scope.md §3 H4/H5.
 *
 * Fuse and Reaction are ROLES regular badges are assigned to via the 8
 * synergy slots, not badge types. Synergy slots 1–4 are temporary (reset at
 * season end); 5–8 are permanent. Per-slot magnitude is DATA, not a constant:
 * which two synergy slots are +2 is unpublished 2K27 data (OQ-A1), so every
 * slot defaults to magnitude 1 and `plusTwoSlotIds` stays null until the user
 * designates exactly two (M4 designator UI). NEVER guessed here.
 *
 * H5 — `effectiveLevel` is EXCLUSIVE, not additive. The seed writes
 * `purchasedLevel + fuseBoost (+ reactionBoost)`, but its own one-role
 * invariant ("a badge holds at most one synergy role") makes at most one term
 * live, so the additive form is unreachable arithmetic. boost() returns the
 * single role's contribution or 0 — never a sum of two roles.
 *
 * H4 — assignSynergy/clearSynergy enforce HARD invariants via TYPED results:
 * never a silent throw, never a partial mutation (both are pure — they return
 * a new synergySlots array or a typed error, and never touch the input).
 * Equip-slot capacity is NOT checked here: overflow is a SOFT violation
 * reported by validateLoadout (scope.md §3 H4 — refusing a synergy role to an
 * over-capacity badge would derive a HARD block from a SOFT violation).
 */

import { badgeById, shippedDataset } from "./dataset";
import type {
  BadgeDataset,
  LoadoutEntry,
  OverlayState,
  SynergyRole,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "./types";
import type { Category, Level, PurchasableLevel } from "./vocabulary";
import { LEVELS, levelIndex } from "./vocabulary";

/** All 8 synergy slot ids, in order. */
export const SYNERGY_SLOT_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly SynergySlotId[];

/** Seed permanence table: synergy slots 1–4 temporary, 5–8 permanent. */
export function permanenceForSynergySlot(synergySlotId: SynergySlotId): "temporary" | "permanent" {
  return synergySlotId <= 4 ? "temporary" : "permanent";
}

/** Build Specialization Level 10 → a permanent +2 Badge Synergy. Synergy
 * Slot 7 IS that unlock (seed: Synergy system). RATIFIED DATA, not a
 * preference: official 2K MyPlayer Builder page + user ratification
 * 2026-08-26. The SECOND +2 is still unpublished — user-designated, never
 * guessed.
 *
 * Placement: this is KNOWN slot data, so it sits beside
 * permanenceForSynergySlot (the identical class — sealed, known, per-slot).
 * src/config/ is the UNPUBLISHED seam; filing confirmed data there would
 * make both meanings unreadable. */
export const RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS = [7] as const satisfies readonly SynergySlotId[];

/** Is this Synergy Slot's +2 RATIFIED data (rather than a user preference)?
 * THE engine predicate for "not user-removable". `src/ui/**` READS this; it
 * never re-computes the membership (seed: Working agreements — every rule
 * lives in the engine). */
export function isRatifiedPlusTwo(synergySlotId: SynergySlotId): boolean {
  return (RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS as readonly SynergySlotId[]).includes(synergySlotId);
}

/**
 * Per-slot magnitude: 2 iff the Synergy Slot is in the RATIFIED set (slot 7)
 * or in the user's `plusTwoSlotIds` designation seam (OQ-A1), else 1.
 *
 * DERIVES FAITHFULLY — it never silently drops a designated id, even when
 * ratified ∪ designated exceeds MAX_PLUS_TWO_SYNERGY_SLOTS. A silent drop
 * would be an auto-mutation of a user designation, which is exactly what the
 * LOAD path refuses (H8); making the fresh path drop while the load path
 * discloses would put the two paths in disagreement, which is worse than
 * either alone. The cap is owned, once, by
 * `validateLoadout`'s tooManyPlusTwoSynergySlots.
 */
export function magnitudeForSynergySlot(
  synergySlotId: SynergySlotId,
  userDesignated: readonly SynergySlotId[] | null,
): 1 | 2 {
  if (isRatifiedPlusTwo(synergySlotId)) return 2;
  if (userDesignated === null) return 1;
  return userDesignated.includes(synergySlotId) ? 2 : 1;
}

/** The 8 default synergy slots: locked, unassigned, interchangeable
 * (disciplineLock null on all eight — Synergy Slot 7's lock is USER-selected,
 * because the planner cannot know which Build Specialization track the player
 * completed), magnitudes per magnitudeForSynergySlot (so Synergy Slot 7 ships
 * +2 even at the default `userDesignated: null`). */
export function createDefaultSynergySlots(
  userDesignated: readonly SynergySlotId[] | null = null,
): SynergySlot[] {
  return SYNERGY_SLOT_IDS.map((synergySlotId) => ({
    id: synergySlotId,
    unlocked: false,
    permanence: permanenceForSynergySlot(synergySlotId),
    magnitude: magnitudeForSynergySlot(synergySlotId, userDesignated),
    disciplineLock: null,
    fuseBadgeId: null,
    reactionBadgeId: null,
  }));
}

/** The result of re-deriving ratified magnitudes over a LOADED Synergy Slot
 * array. (The field is `synergySlots`, not the brief's literal `slots`: the
 * H1 vocabulary lint bans the bare token in identifiers, and the fix for a
 * reddened lint is always the code.) */
export interface RatifiedMagnitudeReport {
  readonly synergySlots: SynergySlot[];
  /** Synergy Slot ids whose persisted magnitude was overridden by ratified
   * data at load. Empty = nothing changed = the disclosure does NOT render. */
  readonly normalizedSynergySlotIds: readonly SynergySlotId[];
}

/**
 * P4 — the read-time projection: a ratified Synergy Slot's magnitude is
 * re-derived from RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS at LOAD, overriding
 * whatever the file says, and the override is REPORTED so the UI can
 * disclose it.
 *
 * This is a DATA REFRESH, not an auto-migration (H8): the user never chose
 * +1 for Synergy Slot 7 — the app defaulted it there while the data was
 * unknown. Correcting it when the data lands is the same class as a threshold
 * moving in badges.json, and H8's answer to that is DISCLOSE.
 *
 * MAPS OVER THE SLOTS ACTUALLY PRESENT. A saved build may legally carry fewer
 * than 8 (validateSynergyShape does not require all 8 ids); a missing slot 7
 * is NOT synthesized, and the report lists nothing for it. Rebuilding the
 * array to "fix" the gap would be the auto-migration this ruling exists to
 * avoid.
 *
 * It lives HERE, not in the deserializer: normalization is on the RULES side
 * of the shape/rules line. Putting it in the deserializer is how the two ends
 * of a round trip start disagreeing.
 */
export function applyRatifiedMagnitudes(
  synergySlots: readonly SynergySlot[],
): RatifiedMagnitudeReport {
  const normalizedSynergySlotIds: SynergySlotId[] = [];
  const normalized = synergySlots.map((synergySlot) => {
    if (!isRatifiedPlusTwo(synergySlot.id) || synergySlot.magnitude === 2) {
      return { ...synergySlot };
    }
    normalizedSynergySlotIds.push(synergySlot.id);
    return { ...synergySlot, magnitude: 2 as const };
  });
  return { synergySlots: normalized, normalizedSynergySlotIds };
}

/** The state the synergy engine reads. A plain value — never mutated here. */
export interface SynergyState {
  loadout: readonly LoadoutEntry[];
  synergySlots: readonly SynergySlot[];
}

/** The neutral display overlay: nothing simulated. M3's card contract renders
 * every card via `effectiveLevel(state, badgeId, defaultOverlay)`. */
export const defaultOverlay: Readonly<OverlayState> = {
  reactionsActive: false,
  seasonReset: false,
};

export function synergySlotById(
  synergySlots: readonly SynergySlot[],
  synergySlotId: SynergySlotId,
): SynergySlot | undefined {
  return synergySlots.find((candidate) => candidate.id === synergySlotId);
}

/**
 * The badge's single synergy role, or null (H5: at most one role, ever).
 * Scans synergy slots in array order, fuse position before reaction; on a
 * state corrupted into multiple roles (unreachable via assignSynergy —
 * validateLoadout reports it as a HardViolation) the first is returned.
 */
export function synergyRoleFor(
  synergySlots: readonly SynergySlot[],
  badgeId: string,
): SynergyRole | null {
  for (const synergySlot of synergySlots) {
    if (synergySlot.fuseBadgeId === badgeId) {
      return { kind: "fuse", synergySlotId: synergySlot.id, magnitude: synergySlot.magnitude };
    }
    if (synergySlot.reactionBadgeId === badgeId) {
      return { kind: "reaction", synergySlotId: synergySlot.id, magnitude: synergySlot.magnitude };
    }
  }
  return null;
}

/**
 * Whether a synergy slot's boost is live under a display overlay (H5):
 * unlocked, and not a temporary slot under the season-reset preview.
 * (Named per H1: the sealed spec calls this `slotActive`; the bare token is
 * banned in identifiers, so the synergy- prefix is carried.)
 */
export function synergySlotActive(synergySlot: SynergySlot, overlay: OverlayState): boolean {
  return synergySlot.unlocked && !(overlay.seasonReset && synergySlot.permanence === "temporary");
}

/**
 * Whether a synergy slot renders as "⟳ Disabled by season-reset preview":
 * unlocked but not active under the overlay — algebraically
 * `unlocked && !synergySlotActive`, which reduces to
 * `seasonReset && temporary && unlocked`. THE canonical predicate for that
 * UI state: components import this rather than hand-negating
 * synergySlotActive, so a future change to the activity rule can never
 * desynchronize the boost math from the "disabled by preview" annotations.
 */
export function synergySlotDisabledByPreview(
  synergySlot: SynergySlot,
  overlay: OverlayState,
): boolean {
  return synergySlot.unlocked && !synergySlotActive(synergySlot, overlay);
}

/**
 * The sealed cap on +2 designations (seed: Synergy system — "6 different +1
 * slots and 2 different +2 slots"): at most TWO synergy slots may carry
 * magnitude 2. WHICH two is unpublished 2K27 data (OQ-A1); the COUNT is
 * sealed. Enforced by validateLoadout (H4 invariant class) and by the
 * SavedBuild deserializer at the JSON boundary.
 */
export const MAX_PLUS_TWO_SYNERGY_SLOTS = 2;

/** The ids of the synergy slots currently designated +2, in array order. */
export function plusTwoSynergySlotIds(
  synergySlots: readonly SynergySlot[],
): SynergySlotId[] {
  return synergySlots
    .filter((synergySlot) => synergySlot.magnitude === 2)
    .map((synergySlot) => synergySlot.id);
}

/**
 * The single-role boost (H5 — EXCLUSIVE, never a sum of two roles):
 *   no role                → 0
 *   fuse                   → slot active ? magnitude : 0
 *   reaction               → (reactionsActive && slot active) ? magnitude : 0
 */
export function boost(state: SynergyState, badgeId: string, overlay: OverlayState): 0 | 1 | 2 {
  const role = synergyRoleFor(state.synergySlots, badgeId);
  if (role === null) return 0;
  const synergySlot = synergySlotById(state.synergySlots, role.synergySlotId);
  // Unreachable: the role was just read off this same array.
  if (synergySlot === undefined) return 0;
  if (!synergySlotActive(synergySlot, overlay)) return 0;
  if (role.kind === "reaction" && !overlay.reactionsActive) return 0;
  return role.magnitude;
}

/** purchased + boost on the 5-level ladder, capped at Legend (HOF+2 → Legend). */
export function clampToLegend(purchasedLevel: PurchasableLevel, boostAmount: number): Level {
  const ladderIndex = Math.min(levelIndex(purchasedLevel) + boostAmount, LEVELS.length - 1);
  // levelIndex is ≥ 0 and the min caps at the last ladder index, so the
  // access is total; the assertion only narrows away noUncheckedIndexedAccess.
  return LEVELS[ladderIndex] as Level;
}

/**
 * The level a badge plays at under a display overlay (H5, exclusive form):
 * `clampToLegend(purchasedLevel + boost)`. null = not purchased (no
 * LoadoutEntry — purchased ≡ equipped, H1 glossary).
 */
export function effectiveLevel(
  state: SynergyState,
  badgeId: string,
  overlay: OverlayState,
): Level | null {
  const entry = state.loadout.find((candidate) => candidate.badgeId === badgeId);
  if (entry === undefined) return null;
  return clampToLegend(entry.purchasedLevel, boost(state, badgeId, overlay));
}

// ---------------------------------------------------------------------------
// assignSynergy / clearSynergy — typed results, pure, never partial (H4).
// ---------------------------------------------------------------------------

export type SynergyAssignmentError =
  /** The synergy slot id is not present in the given synergySlots array. */
  | { kind: "unknownSynergySlot"; synergySlotId: SynergySlotId }
  /** H4 invariant: the synergy slot must be unlocked. */
  | { kind: "synergySlotLocked"; synergySlotId: SynergySlotId }
  /** H4 invariant: fuse/reaction targets must be purchased badges. */
  | { kind: "targetBadgeNotPurchased"; badgeId: string }
  /** H5 invariant: no badge holds two synergy roles — at most one, ever. */
  | { kind: "badgeAlreadyHoldsSynergyRole"; badgeId: string; existingRole: SynergyRole }
  /** H4 invariant: the same badge cannot be both fuse and reaction in one synergy slot. */
  | { kind: "sameBadgeBothRolesInOneSynergySlot"; synergySlotId: SynergySlotId; badgeId: string }
  /**
   * F4 RATIFIED invariant: a discipline-locked Synergy Slot (Build
   * Specialization) holds only badges of its own discipline.
   * `[official 2K MyPlayer Builder page; user ratification 2026-08-26;
   *   reconciliation row 11, §D.2]`
   *
   * BOTH role positions are checked — fuse and reaction count as two
   * separately-locked positions. CITATION STRENGTH: that is the
   * reconciliation's ENDORSED READING (§B's positions-vs-pairs identity plus
   * §D.2's "each"), NOT page text — §D.3 flags "each" as ambiguous. An
   * adopted inference and an invented fact never get the same citation here.
   */
  | {
      kind: "badgeCategoryViolatesDisciplineLock";
      synergySlotId: SynergySlotId;
      badgeId: string;
      badgeCategory: Category;
      disciplineLock: Category;
    };

export type SynergyAssignmentResult =
  | { ok: true; synergySlots: SynergySlot[] }
  | { ok: false; error: SynergyAssignmentError };

function withSynergySlotPosition(
  synergySlots: readonly SynergySlot[],
  synergySlotId: SynergySlotId,
  roleKind: SynergyRoleKind,
  badgeId: string | null,
): SynergySlot[] {
  return synergySlots.map((synergySlot) =>
    synergySlot.id === synergySlotId
      ? {
          ...synergySlot,
          fuseBadgeId: roleKind === "fuse" ? badgeId : synergySlot.fuseBadgeId,
          reactionBadgeId: roleKind === "reaction" ? badgeId : synergySlot.reactionBadgeId,
        }
      : synergySlot,
  );
}

/**
 * Set a synergy slot's fuse or reaction badge ("set" semantics: the position's
 * previous occupant, if any, simply loses its role). Pure — returns a new
 * synergySlots array on success, a typed error otherwise; the input state is
 * NEVER mutated, so failure cannot leave partial state behind.
 *
 * NO equip-slot capacity check happens here — ruled H4 behavior: an
 * over-capacity equipped badge MAY hold a synergy role (the overflow is a
 * SoftViolation from validateLoadout, never a block).
 */
export function assignSynergy(
  state: SynergyState,
  synergySlotId: SynergySlotId,
  roleKind: SynergyRoleKind,
  badgeId: string,
  dataset: BadgeDataset = shippedDataset,
): SynergyAssignmentResult {
  const synergySlot = synergySlotById(state.synergySlots, synergySlotId);
  if (synergySlot === undefined) {
    return { ok: false, error: { kind: "unknownSynergySlot", synergySlotId } };
  }
  if (!synergySlot.unlocked) {
    return { ok: false, error: { kind: "synergySlotLocked", synergySlotId } };
  }
  if (!state.loadout.some((entry) => entry.badgeId === badgeId)) {
    return { ok: false, error: { kind: "targetBadgeNotPurchased", badgeId } };
  }
  const existingRole = synergyRoleFor(state.synergySlots, badgeId);
  if (existingRole !== null) {
    const samePosition =
      existingRole.synergySlotId === synergySlotId && existingRole.kind === roleKind;
    if (!samePosition) {
      if (existingRole.synergySlotId === synergySlotId) {
        // Other role position of the SAME synergy slot — the specific H4 case.
        return { ok: false, error: { kind: "sameBadgeBothRolesInOneSynergySlot", synergySlotId, badgeId } };
      }
      return { ok: false, error: { kind: "badgeAlreadyHoldsSynergyRole", badgeId, existingRole } };
    }
    // Re-assigning the badge to the exact position it already holds is an
    // idempotent success, not a "second role".
  }
  // F4 discipline lock — checked LAST, and only when the lock is set. An
  // unresolvable badge id is not this function's error to raise: validateLoadout
  // throws UnknownBadgeError loudly for that (H6 class).
  if (synergySlot.disciplineLock !== null) {
    const badge = badgeById(dataset, badgeId);
    if (badge !== undefined && badge.category !== synergySlot.disciplineLock) {
      return {
        ok: false,
        error: {
          kind: "badgeCategoryViolatesDisciplineLock",
          synergySlotId,
          badgeId,
          badgeCategory: badge.category,
          disciplineLock: synergySlot.disciplineLock,
        },
      };
    }
  }
  return {
    ok: true,
    synergySlots: withSynergySlotPosition(state.synergySlots, synergySlotId, roleKind, badgeId),
  };
}

/**
 * Clear a synergy slot's fuse or reaction position (idempotent when already
 * empty). Same typed-result contract as assignSynergy; per the M2 contract
 * the slot-unlocked invariant binds clearSynergy too (the UI never offers
 * controls on a locked synergy slot — H4 invariant class).
 */
export function clearSynergy(
  state: SynergyState,
  synergySlotId: SynergySlotId,
  roleKind: SynergyRoleKind,
): SynergyAssignmentResult {
  const synergySlot = synergySlotById(state.synergySlots, synergySlotId);
  if (synergySlot === undefined) {
    return { ok: false, error: { kind: "unknownSynergySlot", synergySlotId } };
  }
  if (!synergySlot.unlocked) {
    return { ok: false, error: { kind: "synergySlotLocked", synergySlotId } };
  }
  return {
    ok: true,
    synergySlots: withSynergySlotPosition(state.synergySlots, synergySlotId, roleKind, null),
  };
}
