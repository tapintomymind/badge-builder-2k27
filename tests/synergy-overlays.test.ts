/**
 * M2 exhaustive overlay property test (brief item 10) + ledger invariance
 * (item 11).
 *
 * All 53 badges × all 4 overlay combinations: boost ∈ {0, 1, 2} and NEVER a
 * sum of two roles (H5 exclusive form). The expected value is computed by an
 * independent oracle in this file from the assignment table alone.
 *
 * Magnitude-2 designation below is TEST-LOCAL HYPOTHETICAL data exercising
 * the per-slot-data seam (OQ-A1); the shipped default remains all-1/null.
 */

import { describe, expect, it } from "vitest";
import { shippedDataset } from "../src/engine/dataset";
import { assignSynergy, boost, clampToLegend, createDefaultSynergySlots, effectiveLevel } from "../src/engine/synergy";
import type { SynergyState } from "../src/engine/synergy";
import { ledger } from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import type {
  Budget,
  LoadoutEntry,
  OverlayState,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";

const ALL_OVERLAYS: OverlayState[] = [
  { reactionsActive: false, seasonReset: false },
  { reactionsActive: false, seasonReset: true },
  { reactionsActive: true, seasonReset: false },
  { reactionsActive: true, seasonReset: true },
];

/** Every badge purchased at gold — boosts then span hof (+1) and legend (+2). */
const loadout: LoadoutEntry[] = shippedDataset.badges.map((badge) => ({
  badgeId: badge.id,
  purchasedLevel: "gold",
}));

/** 8 unlocked synergy slots; hypothetical designation [2, 7] — one temporary,
 * one permanent, so both magnitude × permanence combinations are exercised.
 * [A7] The RATIFIED pair (7, 8) rides on top, so the magnitude-2 set is
 * {2, 7, 8}: still one temporary and now two permanent. Over the sealed cap,
 * which is deliberate and inert here — this file exercises `boost` alone, and
 * the cap is validateLoadout's to disclose, not the derivation's to enforce. */
const unlockedSynergySlots: SynergySlot[] = createDefaultSynergySlots([2, 7]).map(
  (synergySlot) => ({ ...synergySlot, unlocked: true }),
);

/** The assignment table: 8 fuse + 8 reaction = 16 different boosted badges
 * (seed: fully unlocked). Chosen deterministically from dataset order. */
const fuseBadgeIds = shippedDataset.badges.slice(0, 8).map((badge) => badge.id);
const reactionBadgeIds = shippedDataset.badges.slice(8, 16).map((badge) => badge.id);

interface AssignmentRow {
  badgeId: string;
  kind: SynergyRoleKind;
  synergySlotId: SynergySlotId;
}

const assignmentTable: AssignmentRow[] = [
  ...fuseBadgeIds.map((badgeId, index) => ({
    badgeId,
    kind: "fuse" as const,
    synergySlotId: (index + 1) as SynergySlotId,
  })),
  ...reactionBadgeIds.map((badgeId, index) => ({
    badgeId,
    kind: "reaction" as const,
    synergySlotId: (index + 1) as SynergySlotId,
  })),
];

/** Build the full 16-role state THROUGH the engine API — every assignment
 * must succeed (16 different badges, one role each). */
function buildAssignedState(): SynergyState {
  let state: SynergyState = { loadout, synergySlots: unlockedSynergySlots };
  for (const row of assignmentTable) {
    const result = assignSynergy(state, row.synergySlotId, row.kind, row.badgeId);
    expect(result.ok, `assign ${row.kind} ${row.badgeId} → synergy slot ${row.synergySlotId}`).toBe(
      true,
    );
    if (result.ok) state = { loadout, synergySlots: result.synergySlots };
  }
  return state;
}

/** INDEPENDENT ORACLE: expected boost from the assignment table alone. */
function expectedBoost(badgeId: string, overlay: OverlayState): 0 | 1 | 2 {
  const row = assignmentTable.find((candidate) => candidate.badgeId === badgeId);
  if (row === undefined) return 0;
  // [A7] STAYS AN INDEPENDENT ORACLE: the magnitude-2 set is written out by
  // hand rather than read from the engine, because a test that derives its
  // expectation from the code under test proves nothing. Synergy Slot 8 was
  // added here because it is RATIFIED now — the same reason 7 was already in
  // this list — and this line is the one place the old bound was spelled as
  // a comparison rather than an array literal.
  const plusTwoSynergySlotIds: readonly SynergySlotId[] = [2, 7, 8];
  const magnitude = plusTwoSynergySlotIds.includes(row.synergySlotId) ? 2 : 1;
  const temporary = row.synergySlotId <= 4;
  if (overlay.seasonReset && temporary) return 0;
  if (row.kind === "reaction" && !overlay.reactionsActive) return 0;
  return magnitude;
}

describe("M2 item 10 — exhaustive property: all badges × all 4 overlay combinations", () => {
  const state = buildAssignedState();

  it("covers all 53 badges and exactly 16 boosted ones", () => {
    expect(loadout).toHaveLength(53);
    expect(new Set(assignmentTable.map((row) => row.badgeId)).size).toBe(16);
  });

  for (const overlay of ALL_OVERLAYS) {
    const label = `reactionsActive=${overlay.reactionsActive} seasonReset=${overlay.seasonReset}`;
    it(`boost ∈ {0,1,2} and equals the single role's contribution — never a sum (${label})`, () => {
      for (const badge of shippedDataset.badges) {
        const actual = boost(state, badge.id, overlay);
        expect([0, 1, 2]).toContain(actual);
        expect(actual, `boost(${badge.id}) under ${label}`).toBe(expectedBoost(badge.id, overlay));
      }
    });

    it(`effectiveLevel = clampToLegend(purchased + boost) for every badge (${label})`, () => {
      for (const badge of shippedDataset.badges) {
        expect(effectiveLevel(state, badge.id, overlay), badge.id).toBe(
          clampToLegend("gold", expectedBoost(badge.id, overlay)),
        );
      }
    });
  }

  it("the maximum boost across every badge × overlay is 2 — a two-role sum (e.g. 3 or 4) is unrepresentable", () => {
    const seen = new Set<number>();
    for (const overlay of ALL_OVERLAYS) {
      for (const badge of shippedDataset.badges) {
        seen.add(boost(state, badge.id, overlay));
      }
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });
});

describe("M2 item 11 — ledger('current') is bit-identical across all 4 overlay combinations", () => {
  // Read this honestly (scope.md §3 H2): near-tautological — ledger() cannot
  // receive an overlay, so this proves the type signature the compiler
  // already proves. Kept as a cheap guard against someone widening the
  // signature later. The REAL control for this risk is the M4 primary-row
  // invariance regression.
  const budgets = Object.fromEntries(
    CATEGORIES.map((category) => [category, { points: 20, equipSlots: 5 }]),
  ) as Record<Category, Budget>;
  const state: SynergyLedgerState = {
    loadout,
    budgets,
    synergySlots: buildAssignedState().synergySlots,
    refundTrigger: "legendByAnyMeans",
  };

  it("varying the display overlay cannot vary the committed ledger — it has no channel in", () => {
    const baseline = ledger(state, "current");
    for (const overlay of ALL_OVERLAYS) {
      // The overlay is deliberately unused: there is no way to pass it.
      void overlay;
      expect(ledger(state, "current")).toEqual(baseline);
    }
  });
});
