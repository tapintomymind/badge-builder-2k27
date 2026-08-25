/**
 * Per-category points ledger (H2). Every value here is a PURE FUNCTION OF
 * CURRENT STATE — there is no running balance, no accumulator, anywhere in
 * this codebase. That eliminates the refund-then-downgrade double-count class
 * outright: the same state always yields the same numbers.
 *
 * Refund rule (seed): reaching the max level returns the tokens spent on that
 * badge to that badge's CATEGORY pool. The trigger condition is unconfirmed
 * (seed Open item #1) and lives behind the `refundTrigger` config seam.
 *
 * M1 scope note: zero synergy behavior exists yet, so the level a refund
 * trigger inspects comes through the `effectiveLevelFor` seam, which defaults
 * to the purchased level. M2 wires the real synergy-aware effective level
 * through the same seam (including the permanent-only variant for
 * `legendByPermanentBoostOnly`) without changing any signature here.
 */

import { badgeById, shippedDataset } from "./dataset";
import { costForLevel } from "./cost";
import { UnknownBadgeError } from "./errors";
import type { Badge, BadgeDataset, Budget, LoadoutEntry, RefundTrigger } from "./types";
import type { Category, Level } from "./vocabulary";
import { levelIndex } from "./vocabulary";

/** The state the ledger derives from. A plain value — never mutated here. */
export interface LedgerState {
  loadout: readonly LoadoutEntry[];
  budgets: Readonly<Record<Category, Budget>>;
  refundTrigger: RefundTrigger;
  /**
   * Seam for M2's synergy-aware effective level. M1 default: the purchased
   * level (no boost behavior exists yet, so purchased Legend is impossible
   * and legend-based triggers cannot fire — which is honest M1 behavior).
   */
  effectiveLevelFor?: (entry: LoadoutEntry) => Level;
}

function effectiveLevelOf(state: LedgerState, entry: LoadoutEntry): Level {
  return state.effectiveLevelFor === undefined
    ? entry.purchasedLevel
    : state.effectiveLevelFor(entry);
}

function refundTriggered(state: LedgerState, entry: LoadoutEntry): boolean {
  const effective = effectiveLevelOf(state, entry);
  switch (state.refundTrigger) {
    case "legendByAnyMeans":
      return effective === "legend";
    case "legendByPermanentBoostOnly":
      // The permanent-only distinction is expressed by the effective-level
      // function M2 injects for this trigger; the ledger's check is the same.
      return effective === "legend";
    case "hofOrAbove":
      return levelIndex(effective) >= levelIndex("hof");
  }
}

function requireBadge(dataset: BadgeDataset, badgeId: string): Badge {
  const badge = badgeById(dataset, badgeId);
  if (badge === undefined) throw new UnknownBadgeError(badgeId);
  return badge;
}

function entriesInCategory(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset,
): { entry: LoadoutEntry; badge: Badge }[] {
  return state.loadout
    .map((entry) => ({ entry, badge: requireBadge(dataset, entry.badgeId) }))
    .filter(({ badge }) => badge.category === category);
}

/** Gross points spent in a category: Σ total-to-own cost at purchased level. */
export function spent(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): number {
  return entriesInCategory(state, category, dataset).reduce(
    (sum, { entry, badge }) => sum + costForLevel(badge.tier, entry.purchasedLevel, dataset),
    0,
  );
}

/** Points returned to the category pool: Σ cost of entries whose refund
 * trigger currently fires. Derived from state — never accumulated. */
export function refunded(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): number {
  return entriesInCategory(state, category, dataset).reduce(
    (sum, { entry, badge }) =>
      refundTriggered(state, entry)
        ? sum + costForLevel(badge.tier, entry.purchasedLevel, dataset)
        : sum,
    0,
  );
}

/** The seed's formula: remainingPoints(category) = pool − spent + refunds.
 * May go negative — overspend is a SOFT violation (H4), warned, never blocked. */
export function remainingPoints(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): number {
  return (
    state.budgets[category].points -
    spent(state, category, dataset) +
    refunded(state, category, dataset)
  );
}

/** Gross total-to-own cost of the whole loadout (all categories). */
export function totalCost(
  state: LedgerState,
  dataset: BadgeDataset = shippedDataset,
): number {
  return state.loadout.reduce((sum, entry) => {
    const badge = requireBadge(dataset, entry.badgeId);
    return sum + costForLevel(badge.tier, entry.purchasedLevel, dataset);
  }, 0);
}

/** Equipped badges in a category — purchased ≡ equipped (H1 glossary): a
 * badge occupies one of the category's equip slots at ANY level, including
 * Legend; only removal frees it. "Badge Slots" in UI copy. */
export function equipSlotsUsed(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): number {
  return entriesInCategory(state, category, dataset).length;
}

/**
 * Is this category's Badge Slots capacity UNSET? (the ratified "0 = capacity
 * not set" ruling, design-spec §4.7).
 *
 * HOISTED OUT OF `src/ui/grid/CategoryLedger.tsx` in F8-E1. A function that
 * knows what a capacity number MEANS is a rule, whatever it is named, and
 * rules live in the engine [seed: Working agreements #1]. The concrete
 * consequence: `src/engine/` cannot import from `src/ui/`, so while this lived
 * in a component the roll engine literally could not honour the ruling.
 *
 * 0 means "not entered", never "zero capacity": no overflow warning fires
 * anywhere, one neutral per-category hint renders instead, and a generator
 * declines to roll the category rather than treating it as full. A genuinely
 * entered 0 is indistinguishable and acceptable for this planner.
 *
 * NO RE-EXPORT SHIM was left behind in CategoryLedger.tsx — a UI module
 * re-exporting an engine function is the same layering inversion the hoist
 * exists to remove. All three importers were updated instead.
 */
export function badgeSlotsCapacityUnset(budget: Budget): boolean {
  return budget.equipSlots === 0;
}

/** Convenience: the four per-category readouts in one call. */
export function categoryLedger(
  state: LedgerState,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): { spent: number; refunded: number; remainingPoints: number; equipSlotsUsed: number } {
  return {
    spent: spent(state, category, dataset),
    refunded: refunded(state, category, dataset),
    remainingPoints: remainingPoints(state, category, dataset),
    equipSlotsUsed: equipSlotsUsed(state, category, dataset),
  };
}
