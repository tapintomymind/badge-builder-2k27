/**
 * Per-category points ledger (H2). Every value here is a PURE FUNCTION OF
 * CURRENT STATE — there is no running balance, no accumulator, anywhere in
 * this codebase. That eliminates the refund-then-downgrade double-count class
 * outright: the same state always yields the same numbers.
 *
 * Refund rule (seed): tokens spent on a badge return to that badge's CATEGORY
 * pool. The TRIGGER lives behind the `refundTrigger` config seam. F4 resolved
 * seed Open item #1: the default is `onFuse` (official 2K MyPlayer Builder
 * page + user ratification 2026-08-26) — placing a badge in a Fuse position
 * frees its tokens. The three Legend/HOF triggers remain selectable.
 * The AMOUNT and DESTINATION are unchanged by that flip.
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
  /**
   * F4 seam for the `onFuse` trigger: does this entry's badge hold a LIVE
   * FUSE role under the basis being computed? Injected by
   * synergy-ledger.ts's `toLedgerState`, exactly like `effectiveLevelFor`.
   *
   * M1 default: `() => false` — honest M1 behaviour, because no synergy
   * exists at M1 and a badge cannot be fused.
   */
  isFusedFor?: (entry: LoadoutEntry) => boolean;
}

function effectiveLevelOf(state: LedgerState, entry: LoadoutEntry): Level {
  return state.effectiveLevelFor === undefined
    ? entry.purchasedLevel
    : state.effectiveLevelFor(entry);
}

function isFusedOf(state: LedgerState, entry: LoadoutEntry): boolean {
  return state.isFusedFor === undefined ? false : state.isFusedFor(entry);
}

function refundTriggered(state: LedgerState, entry: LoadoutEntry): boolean {
  const effective = effectiveLevelOf(state, entry);
  switch (state.refundTrigger) {
    case "onFuse":
      // ROLE-KEYED, not level-keyed (F4): the official page's only
      // token-return mechanic is the Fuse placement. Magnitude and purchased
      // level do not enter it.
      return isFusedOf(state, entry);
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
 * May go negative — overspend is a SOFT violation (H4), warned, never blocked.
 *
 * [A5] `state.budgets[category].points` is the EFFECTIVE pool — base plus any
 * applied bonus Badge Tokens, already composed by `effectiveBudgets` at the
 * App seam. This function is CORRECT UNCHANGED and needs no bonus awareness:
 * composing ONCE, upstream, is exactly what makes every reader in this file
 * right with no edit and no possibility of a missed one. Do not reach for the
 * bonus layer here — `LedgerState` deliberately does not carry it. */
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
 *
 * [A5-U] THIS PREDICATE IS CORRECT UNCHANGED, AND THE REASON CHANGED.
 * DO NOT "FIX" IT — in particular, do not re-point it at a base-only field.
 *
 * It receives the COMPOSED record, and `effectiveBudgets` is now PLAIN
 * ADDITION (design-spec §17.9 Ruling ②, superseding scope.md A5-R4's
 * absorbing-at-zero carve-out). Both contributors are non-negative, so
 *
 *     budget.equipSlots === 0   ⟺   base === 0 && applied === 0
 *
 * which is EXACTLY §17.9's ruled predicate: unset-ness is a property of the
 * ENTRY ACT, not of the base number, and the app has two observable entry acts
 * — a non-zero base, and a placed bonus. Nobody allocates a bonus Badge Slot
 * to a discipline by accident; it costs a trip into a modal, a field and a
 * keystroke.
 *
 * WHAT THIS CHANGES IN BEHAVIOUR, stated so nobody reads "unchanged" as
 * "inert": a category with base 0 and a placed bonus is now ENTERED. Its
 * digest renders a real fraction, its Meter renders, overspend fires against
 * the bonus capacity, and the roll engine will fill it. That is the point —
 * the user confirmed a build can genuinely have 0 Badge Slots in a discipline
 * when its attributes are low enough [user 2026-08-26], which made the
 * carve-out's "it counts once a base is entered" escape unreachable and a
 * bonus slot there permanently inert.
 *
 * The zero state is untouched: base 0 + bonus 0 is still UNSET, so every §4.7
 * consequence fires at boot exactly as before (design-spec §17.13 canary 4b).
 * [design-spec §17.9 · src/engine/budget.ts]
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
