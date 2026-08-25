/**
 * validateLoadout (M2) — THE single enforcement surface (scope.md §3 H4).
 *
 * Three constraint classes, one rule each:
 *  - Budget (SOFT):     points overspend and equip-slot overflow — warnings.
 *    The UI renders them red-but-permissive, NEVER as blocks: the capacity
 *    numbers are typed from memory (seed Open item #3), and hard-blocking a
 *    plan on a guessed input is actively harmful in a planning tool.
 *  - Invariant (HARD):  synergy-role invariants — errors. The UI renders the
 *    violating controls as unreachable; assignSynergy already refuses to
 *    create these states, so errors here can only come from externally
 *    constructed or deserialized state.
 *  - Eligibility (HARD) is per-badge, surfaced by M1's validateBadge on each
 *    card — not re-aggregated here.
 *
 * The ruled H4 × H5 interaction, pinned by the over-capacity test: an
 * over-capacity equipped badge MAY hold a synergy role and its refund DOES
 * count in the ledger. Equip-slot overflow appears below ONLY as a
 * SoftViolation — deriving a HARD block from a SOFT violation is the one
 * thing the three-class taxonomy exists to prevent.
 *
 * A synergy assignment sitting on a LOCKED slot is NOT a violation: it is
 * representable, legitimate state (assign while unlocked, then re-lock the
 * slot) — the boost simply is not live while the slot is locked. The lock
 * invariant guards the assignment ACTION (assignSynergy), not the state.
 */

import { badgeById, shippedDataset } from "./dataset";
import { UnknownBadgeError } from "./errors";
import { MAX_PLUS_TWO_SYNERGY_SLOTS, plusTwoSynergySlotIds } from "./synergy";
import { categoryLedgerAt } from "./synergy-ledger";
import type { SynergyLedgerState } from "./synergy-ledger";
import type { BadgeDataset, SynergyRoleKind, SynergySlotId } from "./types";
import type { Category } from "./vocabulary";
import { CATEGORIES } from "./vocabulary";

/** One occupied synergy role position (used in violation payloads). */
export interface SynergyRoleOccurrence {
  synergySlotId: SynergySlotId;
  role: SynergyRoleKind;
  badgeId: string;
}

/** HARD — invariant class (H4): states the engine refuses to create. */
export type HardViolation =
  | { kind: "synergyTargetNotPurchased"; synergySlotId: SynergySlotId; role: SynergyRoleKind; badgeId: string }
  | { kind: "badgeHoldsMultipleSynergyRoles"; badgeId: string; occurrences: SynergyRoleOccurrence[] }
  | { kind: "sameBadgeBothRolesInOneSynergySlot"; synergySlotId: SynergySlotId; badgeId: string }
  /** The sealed 2-of-8 cap (seed: "2 different +2 slots"): more than TWO
   * synergy slots carrying magnitude 2 is a state the game cannot express. */
  | {
      kind: "tooManyPlusTwoSynergySlots";
      plusTwoSynergySlotIds: SynergySlotId[];
      maxAllowed: number;
    };

/** SOFT — budget class (H4): warn in red, never block. */
export type SoftViolation =
  | {
      kind: "equipSlotOverflow";
      category: Category;
      equipSlotsUsed: number;
      equipSlotCapacity: number;
      overBy: number;
    }
  | { kind: "pointsOverspend"; category: Category; remainingPoints: number; overBy: number };

export interface LoadoutValidation {
  errors: HardViolation[];
  warnings: SoftViolation[];
}

function synergyRoleOccurrences(state: SynergyLedgerState): SynergyRoleOccurrence[] {
  const occurrences: SynergyRoleOccurrence[] = [];
  for (const synergySlot of state.synergySlots) {
    if (synergySlot.fuseBadgeId !== null) {
      occurrences.push({ synergySlotId: synergySlot.id, role: "fuse", badgeId: synergySlot.fuseBadgeId });
    }
    if (synergySlot.reactionBadgeId !== null) {
      occurrences.push({ synergySlotId: synergySlot.id, role: "reaction", badgeId: synergySlot.reactionBadgeId });
    }
  }
  return occurrences;
}

/**
 * errors = HARD invariant violations; warnings = SOFT budget violations.
 * Pure function of the state passed in. Unknown badge ids in the loadout
 * throw UnknownBadgeError loudly (H6 class — never silently skipped).
 */
export function validateLoadout(
  state: SynergyLedgerState,
  dataset: BadgeDataset = shippedDataset,
): LoadoutValidation {
  const errors: HardViolation[] = [];
  const warnings: SoftViolation[] = [];

  // Loud guard: every loadout entry must reference a known badge.
  for (const entry of state.loadout) {
    if (badgeById(dataset, entry.badgeId) === undefined) throw new UnknownBadgeError(entry.badgeId);
  }

  // --- HARD: synergy-role invariants over the (possibly external) state. ---
  const occurrences = synergyRoleOccurrences(state);
  const purchasedIds = new Set(state.loadout.map((entry) => entry.badgeId));

  for (const occurrence of occurrences) {
    if (!purchasedIds.has(occurrence.badgeId)) {
      errors.push({
        kind: "synergyTargetNotPurchased",
        synergySlotId: occurrence.synergySlotId,
        role: occurrence.role,
        badgeId: occurrence.badgeId,
      });
    }
  }

  for (const synergySlot of state.synergySlots) {
    if (synergySlot.fuseBadgeId !== null && synergySlot.fuseBadgeId === synergySlot.reactionBadgeId) {
      errors.push({
        kind: "sameBadgeBothRolesInOneSynergySlot",
        synergySlotId: synergySlot.id,
        badgeId: synergySlot.fuseBadgeId,
      });
    }
  }

  const occurrencesByBadge = new Map<string, SynergyRoleOccurrence[]>();
  for (const occurrence of occurrences) {
    const list = occurrencesByBadge.get(occurrence.badgeId) ?? [];
    list.push(occurrence);
    occurrencesByBadge.set(occurrence.badgeId, list);
  }
  for (const [badgeId, badgeOccurrences] of occurrencesByBadge) {
    if (badgeOccurrences.length > 1) {
      errors.push({ kind: "badgeHoldsMultipleSynergyRoles", badgeId, occurrences: badgeOccurrences });
    }
  }

  // The sealed +2 cap (seed: "2 different +2 slots"). The SynergyPanel's
  // designator refuses to create a third +2, so this — like every other HARD
  // violation — can only arrive via externally constructed or deserialized
  // state; the single enforcement surface still names it.
  const designatedPlusTwo = plusTwoSynergySlotIds(state.synergySlots);
  if (designatedPlusTwo.length > MAX_PLUS_TWO_SYNERGY_SLOTS) {
    errors.push({
      kind: "tooManyPlusTwoSynergySlots",
      plusTwoSynergySlotIds: designatedPlusTwo,
      maxAllowed: MAX_PLUS_TWO_SYNERGY_SLOTS,
    });
  }

  // --- SOFT: budget class, computed from the COMMITTED ("current") basis. ---
  for (const category of CATEGORIES) {
    const readout = categoryLedgerAt(state, "current", category, dataset);
    const equipSlotCapacity = state.budgets[category].equipSlots;
    if (readout.equipSlotsUsed > equipSlotCapacity) {
      warnings.push({
        kind: "equipSlotOverflow",
        category,
        equipSlotsUsed: readout.equipSlotsUsed,
        equipSlotCapacity,
        overBy: readout.equipSlotsUsed - equipSlotCapacity,
      });
    }
    if (readout.remainingPoints < 0) {
      warnings.push({
        kind: "pointsOverspend",
        category,
        remainingPoints: readout.remainingPoints,
        overBy: -readout.remainingPoints,
      });
    }
  }

  return { errors, warnings };
}
