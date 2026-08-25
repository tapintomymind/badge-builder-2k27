/**
 * Synergy-aware refund ledger (M2) — the H2 ledger/overlay separation.
 *
 * THE STRUCTURAL CONTROL: `ledger(state, basis)` takes a LedgerBasis — a
 * string union that is a DIFFERENT TYPE from OverlayState. The ledger's
 * signature literally cannot accept `reactionsActive`. "Reactions activated"
 * is an in-game transient and NEVER touches the ledger — not the primary one,
 * not the projection (H2(b)); treating it as a persistent refund would be
 * inventing 2K27 behavior.
 *
 * H2(a) — refund basis, ratified 2026-08-25: the ledger is computed from
 * COMMITTED state = purchased levels + fuse-role boosts from EVERY synergy
 * slot the user has marked unlocked (temporary ones included), evaluated with
 * reactionsActive: false and seasonReset: false. Season reset does not
 * un-refund the primary ledger — it is reachable only through the parallel
 * "postSeasonReset" basis, which M4 renders as a second, LABELLED row.
 *
 * `overlayForBasis` is the ONE place the basis channel and the overlay
 * channel can re-couple. It is total over its 2 cases and `reactionsActive`
 * is a literal `false` in both — pinned by the totality test.
 *
 * Derived, never accumulated: everything below delegates to the M1 ledger,
 * whose numbers are pure functions of current state (no running balance
 * exists anywhere), through the `effectiveLevelFor` seam M1 shipped for
 * exactly this wiring.
 */

import { shippedDataset } from "./dataset";
import { categoryLedger } from "./ledger";
import type { LedgerState } from "./ledger";
import { boost, clampToLegend } from "./synergy";
import type {
  Budget,
  LedgerBasis,
  LoadoutEntry,
  OverlayState,
  RefundTrigger,
  SynergySlot,
} from "./types";
import type { BadgeDataset } from "./types";
import type { Category, Level } from "./vocabulary";
import { CATEGORIES } from "./vocabulary";

/** Both members of the LedgerBasis union, for exhaustive tests/UI rows. */
export const LEDGER_BASES = ["current", "postSeasonReset"] as const satisfies readonly LedgerBasis[];

/**
 * The internal basis → OverlayState mapping — total over its 2 cases, with
 * `reactionsActive` a LITERAL false in both. This is the single place the
 * ledger channel and the display-overlay channel re-couple (H2); the
 * totality test pins it.
 */
export function overlayForBasis(basis: LedgerBasis): OverlayState {
  switch (basis) {
    case "current":
      return { reactionsActive: false, seasonReset: false };
    case "postSeasonReset":
      return { reactionsActive: false, seasonReset: true };
  }
}

/** The full state the synergy-aware ledger derives from. A plain value. */
export interface SynergyLedgerState {
  loadout: readonly LoadoutEntry[];
  budgets: Readonly<Record<Category, Budget>>;
  synergySlots: readonly SynergySlot[];
  refundTrigger: RefundTrigger;
}

/**
 * The committed effective level of one loadout entry under a basis: purchased
 * level + the badge's fuse boost (reaction boosts are structurally excluded —
 * `overlayForBasis` never sets reactionsActive, so a reaction role contributes
 * 0 here by construction). For the pre-wired `legendByPermanentBoostOnly`
 * trigger, only PERMANENT synergy slots' boosts count — expressed by
 * filtering the slots the boost computation may see, exactly the seam M1's
 * ledger documented for M2.
 */
export function ledgerEffectiveLevel(
  state: SynergyLedgerState,
  entry: LoadoutEntry,
  basis: LedgerBasis,
): Level {
  const consideredSynergySlots =
    state.refundTrigger === "legendByPermanentBoostOnly"
      ? state.synergySlots.filter((synergySlot) => synergySlot.permanence === "permanent")
      : state.synergySlots;
  const boostAmount = boost(
    { loadout: state.loadout, synergySlots: consideredSynergySlots },
    entry.badgeId,
    overlayForBasis(basis),
  );
  return clampToLegend(entry.purchasedLevel, boostAmount);
}

/** The M1 LedgerState for a basis — the synergy-aware effective level wired
 * through the seam M1 shipped, with no M1 signature change. */
function toLedgerState(state: SynergyLedgerState, basis: LedgerBasis): LedgerState {
  return {
    loadout: state.loadout,
    budgets: state.budgets,
    refundTrigger: state.refundTrigger,
    effectiveLevelFor: (entry) => ledgerEffectiveLevel(state, entry, basis),
  };
}

/** The four per-category readouts the status bars render. */
export interface CategoryLedgerReadout {
  spent: number;
  refunded: number;
  remainingPoints: number;
  equipSlotsUsed: number;
}

/**
 * One category's committed ledger under a basis. The signature is the H2
 * control: `basis` is a LedgerBasis — there is no parameter through which
 * `reactionsActive` (or any OverlayState) can arrive.
 */
export function categoryLedgerAt(
  state: SynergyLedgerState,
  basis: LedgerBasis,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): CategoryLedgerReadout {
  return categoryLedger(toLedgerState(state, basis), category, dataset);
}

/**
 * The whole ledger under a basis, all 6 categories. Same H2 signature
 * control as categoryLedgerAt: no overlay can reach this function.
 */
export function ledger(
  state: SynergyLedgerState,
  basis: LedgerBasis,
  dataset: BadgeDataset = shippedDataset,
): Record<Category, CategoryLedgerReadout> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, categoryLedgerAt(state, basis, category, dataset)]),
  ) as Record<Category, CategoryLedgerReadout>;
}
