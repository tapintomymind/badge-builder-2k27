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

import type {
  LoadoutEntry,
  OverlayState,
  SynergyRole,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "./types";
import type { Level, PurchasableLevel } from "./vocabulary";
import { LEVELS, levelIndex } from "./vocabulary";

/** All 8 synergy slot ids, in order. */
export const SYNERGY_SLOT_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly SynergySlotId[];

/** Seed permanence table: synergy slots 1–4 temporary, 5–8 permanent. */
export function permanenceForSynergySlot(synergySlotId: SynergySlotId): "temporary" | "permanent" {
  return synergySlotId <= 4 ? "temporary" : "permanent";
}

/**
 * Per-slot magnitude from the `plusTwoSlotIds` config seam (OQ-A1).
 * null designation (the shipped default) ⇒ every synergy slot is +1.
 * Once the user designates two, this equals the seed's 6×(+1) / 2×(+2) at
 * full unlock — the unpublished fact SUPPLIED, never guessed.
 */
export function magnitudeForSynergySlot(
  synergySlotId: SynergySlotId,
  plusTwoSlotIds: readonly [SynergySlotId, SynergySlotId] | null,
): 1 | 2 {
  if (plusTwoSlotIds === null) return 1;
  return plusTwoSlotIds.includes(synergySlotId) ? 2 : 1;
}

/** The 8 default synergy slots: locked, unassigned, magnitudes per the
 * designation seam (all 1 while `plusTwoSlotIds` is null — the default). */
export function createDefaultSynergySlots(
  plusTwoSlotIds: readonly [SynergySlotId, SynergySlotId] | null = null,
): SynergySlot[] {
  return SYNERGY_SLOT_IDS.map((synergySlotId) => ({
    id: synergySlotId,
    unlocked: false,
    permanence: permanenceForSynergySlot(synergySlotId),
    magnitude: magnitudeForSynergySlot(synergySlotId, plusTwoSlotIds),
    fuseBadgeId: null,
    reactionBadgeId: null,
  }));
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
  | { kind: "sameBadgeBothRolesInOneSynergySlot"; synergySlotId: SynergySlotId; badgeId: string };

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
