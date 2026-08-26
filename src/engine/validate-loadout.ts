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

import { appliedEquipSlotsTotal, appliedPointsTotal } from "./budget";
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
   * synergy slots carrying magnitude 2 is a state the game cannot express.
   *
   * [F4/A1] THIS IS THE SOLE ENFORCEMENT SURFACE FOR THE +2 CAP. The
   * SavedBuild deserializer used to push a duplicate problem for it and no
   * longer does — see the back-reference comment at the now-cap-free
   * `validateSynergyShape` site in src/engine/serialization.ts. The
   * deserializer validates SHAPE; validateLoadout validates RULES. A state
   * F4 is ruled to DISCLOSE (Synergy Slot 7's ratified +2 landing on a build
   * that already designates two others) must never be a state the
   * deserializer REFUSES — that turns a disclosable state into an unloadable
   * file, which is the H8 failure mode and a reproduced data-loss chain. */
  | {
      kind: "tooManyPlusTwoSynergySlots";
      plusTwoSynergySlotIds: SynergySlotId[];
      maxAllowed: number;
    }
  /**
   * F4 RATIFIED invariant (official 2K MyPlayer Builder page + user
   * ratification 2026-08-26; reconciliation row 11, §D.2): a
   * discipline-locked Synergy Slot (Build Specialization) holds only badges
   * of its own discipline. One violation per offending POSITION — fuse and
   * reaction are two separately-locked positions (the reconciliation's
   * ENDORSED READING of §D.2's "each", not page text; §D.3 flags the token
   * as ambiguous).
   *
   * NEVER AUTO-CLEARED. The reachable route is: assign while the lock is
   * null, then set the lock. That is a legitimate user gesture, and H8
   * forbids silently re-validating a plan away — so this is REPORTED and
   * DISCLOSED, never resolved.
   */
  | {
      kind: "badgeCategoryViolatesDisciplineLock";
      synergySlotId: SynergySlotId;
      role: SynergyRoleKind;
      badgeId: string;
      badgeCategory: Category;
      disciplineLock: Category;
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
  | { kind: "pointsOverspend"; category: Category; remainingPoints: number; overBy: number }
  /**
   * [A5] More bonus Badge Slots applied across the six categories than the
   * build has earned. BUILD-LEVEL, so there is ONE of these, never six.
   *
   * THIS IS THE SOLE ENFORCEMENT SURFACE FOR Σ ≤ earned. The SavedBuild
   * deserializer deliberately does NOT check it — see the back-reference
   * comment at the cap-free `validateBonus` site in
   * src/engine/serialization.ts. The deserializer validates SHAPE;
   * validateLoadout validates RULES.
   *
   * Reachable with NO external editing: season-earned rewards expire, so a
   * user who earned 3, applied 3, then edits the total down to 2 at rollover
   * lands here THROUGH THE UI. That is a state to DISCLOSE, not one to refuse
   * at the JSON boundary — refusing it turns a disclosable state into an
   * unloadable file, which is the H8 failure mode and a reproduced data-loss
   * chain.
   *
   * SOFT, and it stays soft: warn in red, NEVER block, never disable a
   * control. Reducing an allocation is legal at any time, including out of
   * overflow (INV-A5-4), and the effective capacity is NEVER clamped to
   * compensate (H8: disclose, never repair).
   */
  | { kind: "bonusEquipSlotsOverApplied"; applied: number; earned: number; overBy: number }
  /** [A5] The Badge Tokens twin of `bonusEquipSlotsOverApplied` — same sole
   *  ownership, same reachability, same SOFT class. */
  | { kind: "bonusPointsOverApplied"; applied: number; earned: number; overBy: number };

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

  // The sealed +2 cap (seed: "2 different +2 slots"). [F4/A1] THIS IS THE
  // SOLE CAP OWNER — src/engine/serialization.ts's validateSynergyShape
  // deliberately does NOT push a problem for it (see the comment there).
  // Reachable now without any external editing: F4's ratified Synergy Slot 7
  // +2 landing on a pre-F4 build that already designated two others. That is
  // a state to DISCLOSE, not one to refuse at the JSON boundary.
  const designatedPlusTwo = plusTwoSynergySlotIds(state.synergySlots);
  if (designatedPlusTwo.length > MAX_PLUS_TWO_SYNERGY_SLOTS) {
    errors.push({
      kind: "tooManyPlusTwoSynergySlots",
      plusTwoSynergySlotIds: designatedPlusTwo,
      maxAllowed: MAX_PLUS_TWO_SYNERGY_SLOTS,
    });
  }

  // --- HARD: the F4 discipline lock, one violation per offending POSITION. ---
  for (const synergySlot of state.synergySlots) {
    const lock = synergySlot.disciplineLock;
    if (lock === null) continue;
    for (const [role, occupantId] of [
      ["fuse", synergySlot.fuseBadgeId],
      ["reaction", synergySlot.reactionBadgeId],
    ] as const) {
      if (occupantId === null) continue;
      // The loud guard above already proved every LOADOUT id is known; a
      // synergy reference to a non-loadout badge is its own violation
      // (synergyTargetNotPurchased), so an unresolvable id is skipped here
      // rather than double-reported.
      const badge = badgeById(dataset, occupantId);
      if (badge === undefined || badge.category === lock) continue;
      errors.push({
        kind: "badgeCategoryViolatesDisciplineLock",
        synergySlotId: synergySlot.id,
        role,
        badgeId: occupantId,
        badgeCategory: badge.category,
        disciplineLock: lock,
      });
    }
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

  // --- SOFT: [A5] the bonus layer's Σ ≤ earned cap, owned HERE and only here
  // (the deserializer's validateBonus is deliberately cap-free — see both
  // comments). BUILD-LEVEL: one violation per kind, not six. `state.bonus` is
  // OPTIONAL, and absent means the caller has no bonus layer to report on —
  // neither violation fires, which is the pre-A5 behaviour exactly.
  const bonus = state.bonus;
  if (bonus !== undefined) {
    const appliedEquipSlots = appliedEquipSlotsTotal(bonus);
    if (appliedEquipSlots > bonus.earnedEquipSlots) {
      warnings.push({
        kind: "bonusEquipSlotsOverApplied",
        applied: appliedEquipSlots,
        earned: bonus.earnedEquipSlots,
        overBy: appliedEquipSlots - bonus.earnedEquipSlots,
      });
    }
    const appliedPoints = appliedPointsTotal(bonus);
    if (appliedPoints > bonus.earnedPoints) {
      warnings.push({
        kind: "bonusPointsOverApplied",
        applied: appliedPoints,
        earned: bonus.earnedPoints,
        overBy: appliedPoints - bonus.earnedPoints,
      });
    }
  }

  return { errors, warnings };
}
