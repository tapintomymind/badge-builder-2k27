/**
 * THE step enumerator (engine-design R-4). ONE definition of "what moves exist
 * from here", consumed by two policies:
 *
 *  - `src/ui/grid/feasibility.ts` counts them and caps nothing.
 *  - `src/engine/randomize.ts` filters them by affordability and Badge Slots
 *    capacity and picks uniformly.
 *
 * WHY THIS FILE EXISTS. `categoryFeasibility` already WAS this enumerator —
 * same `validateBadge` height gate, same per-level `levelPasses`, same
 * strictly-higher-than-current rule, same `whatIf` affordability probe, same
 * owned-vs-new split. A second copy in the engine would be the same function
 * written twice, and the two would drift: the grid would say "3 upgrades still
 * affordable" immediately before a roll reported "nothing fits". For a tool
 * whose entire acceptance bar is "the numbers reconcile", a self-contradicting
 * UI is worse than a missing feature. So the enumerator was HOISTED, and
 * `categoryFeasibility` is now counts over it (INV-19's golden table proves
 * not one number moved).
 *
 * H3 — THE CARDINAL RULE. Legality is evaluated PER LEVEL, by calling
 * `levelPasses` once for each level. A range is NEVER derived from
 * `maxPurchasableLevel` (`bronze..max`). Gaps are legal: a badge can fail
 * Silver and pass Gold, and that falls straight out of the cost model, where
 * costs are total-to-own rather than cumulative [seed: Tiers, levels, and
 * costs] [scope.md §3 H3]. A step set that offers a gap level — or hides one —
 * is silently-wrong output that looks completely plausible, which is this
 * project's named cardinal failure shape.
 *
 * ZERO RANKING. Steps are emitted in `dataset.badges` order, then
 * `PURCHASABLE_LEVELS` order. Never sorted, never scored, never grouped. That
 * order is an INPUT to a uniform index, not a preference.
 *
 * F8-E3 ADDS A SECOND, SEPARATE ENUMERATOR -- `exchangeSteps`. `legalSteps` is
 * UNCHANGED and that is deliberate: `categoryFeasibility` counts `legalSteps`
 * and renders "N upgrades still affordable", so if the grid's enumerator
 * started counting exchanges the grid would advertise moves it cannot offer.
 * One enumerator per move class, one consumer contract each. INV-19's 504-cell
 * golden table is the mechanical proof that `legalSteps` did not move.
 */

import { costForLevel, whatIf } from "./cost";
import { shippedDataset } from "./dataset";
import { levelPasses, validateBadge } from "./eligibility";
import { categoryLedgerAt } from "./synergy-ledger";
import type { SynergyLedgerState } from "./synergy-ledger";
import type { Badge, BadgeDataset, Build } from "./types";
import type { Category, PurchasableLevel } from "./vocabulary";
import { PURCHASABLE_LEVELS, levelIndex } from "./vocabulary";

/** One legal single move: buy a badge, or raise one a level. */
export interface LegalStep {
  badgeId: string;
  category: Category;
  /** null = the badge is not currently purchased. */
  fromLevel: PurchasableLevel | null;
  toLevel: PurchasableLevel;
  /** Gross total-to-own delta — literally `whatIf(loadout, badgeId, toLevel, dataset)`. */
  grossCost: number;
  /** Refund-aware delta: what `remainingPoints` actually moves by. */
  netCost: number;
  /** true iff applying this step consumes one of the category's Badge Slots. */
  requiresNewBadgeSlot: boolean;
}

export interface StepEnumerationInput {
  state: SynergyLedgerState;
  build: Build;
  /** Entries that may not change level. */
  pinnedBadgeIds: ReadonlySet<string>;
  /** Badges the enumerator may never propose purchasing or upgrading. */
  excludedBadgeIds: ReadonlySet<string>;
}

/**
 * The net cost of OWNING one badge at one level, probed from the SHIPPED
 * ledger with a one-entry state (engine-design §4).
 *
 * `refundOf` is deliberately NOT re-implemented here. The trigger predicate
 * has exactly one definition — `ledger.ts`'s `refundTriggered` — and this
 * probe is how the enumerator consults it rather than copying it. `budgets`,
 * `synergySlots` and `refundTrigger` all carry through, so a fuse role on this
 * badge is seen exactly as the real ledger sees it.
 *
 * INVARIANT R, which is what makes the probe exact: the roll never changes an
 * entry holding a synergy role, never adds or removes an assignment, and never
 * mutates `synergySlots`. Under R an untouched entry's refund status cannot
 * change, and a touched entry's is a pure function of its own new purchased
 * level. `tests/steps.test.ts`'s INV-11 pins the additivity this rests on.
 *
 * HOW LOAD-BEARING IS THIS TODAY? Almost none, and it is worth saying so: an
 * unfused badge has boost 0, so under the Legend-based triggers it refunds
 * nothing, and a fused badge is implicitly pinned so the roll never touches
 * it. The ONE live case is the selectable `hofOrAbove` trigger, where buying
 * HOF on an unfused badge is net-free and gross arithmetic would refuse a
 * purchase that costs nothing. Cheap insurance against one live config value.
 */
export function netCostOf(
  state: SynergyLedgerState,
  badge: Badge,
  level: PurchasableLevel,
  dataset: BadgeDataset = shippedDataset,
): number {
  const probe: SynergyLedgerState = {
    loadout: [{ badgeId: badge.id, purchasedLevel: level }],
    budgets: state.budgets,
    synergySlots: state.synergySlots,
    refundTrigger: state.refundTrigger,
  };
  const readout = categoryLedgerAt(probe, "current", badge.category, dataset);
  return readout.spent - readout.refunded;
}

/**
 * Every legal single step in one category, in deterministic order.
 *
 * NO affordability filter and NO Badge Slots filter live here. Each consumer
 * applies its own policy: the roll caps both; `categoryFeasibility` caps
 * neither and splits its message on `requiresNewBadgeSlot`. One enumerator,
 * two policies, both visible in one file.
 */
export function legalSteps(
  input: StepEnumerationInput,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): LegalStep[] {
  const { state, build, pinnedBadgeIds, excludedBadgeIds } = input;
  const steps: LegalStep[] = [];

  for (const badge of dataset.badges) {
    if (badge.category !== category) continue;
    // A height failure blocks the badge entirely — no level is reachable.
    if (!validateBadge(badge, build).allowed) continue;
    if (excludedBadgeIds.has(badge.id)) continue;
    if (pinnedBadgeIds.has(badge.id)) continue;

    const entry = state.loadout.find((candidate) => candidate.badgeId === badge.id);
    const fromLevel = entry === undefined ? null : entry.purchasedLevel;
    // Computed at most once per badge: the "what we already net-spend" base.
    let netAtFrom: number | null = null;

    for (const level of PURCHASABLE_LEVELS) {
      // The roll never downgrades and never re-buys. Byte-for-byte the rule
      // categoryFeasibility applied before the hoist.
      if (fromLevel !== null && levelIndex(level) <= levelIndex(fromLevel)) continue;
      // H3: PER LEVEL. Never a range derived from maxPurchasableLevel.
      if (!levelPasses(badge.requirements, build, level)) continue;

      if (netAtFrom === null) {
        netAtFrom = fromLevel === null ? 0 : netCostOf(state, badge, fromLevel, dataset);
      }
      steps.push({
        badgeId: badge.id,
        category,
        fromLevel,
        toLevel: level,
        grossCost: whatIf(state.loadout, badge.id, level, dataset),
        netCost: netCostOf(state, badge, level, dataset) - netAtFrom,
        requiresNewBadgeSlot: fromLevel === null,
      });
    }
  }

  return steps;
}

/* --------------------------------------------------------------- F8-E3 -- */

/** One legal exchange: drop `outBadgeId`, buy `badgeId` at `toLevel`. */
export interface ExchangeStep {
  kind: "exchange";
  outBadgeId: string;
  outLevel: PurchasableLevel;
  badgeId: string;
  category: Category;
  toLevel: PurchasableLevel;
  /** Refund-aware, probed from the SHIPPED ledger exactly as `netCostOf` does.
   *  ALWAYS > 0 — a non-positive exchange is not emitted. */
  netCost: number;
  /** Always false. An exchange is slot-count-neutral: one out, one in. */
  requiresNewBadgeSlot: false;
}

/** The roll's whole move set: add, upgrade (both `LegalStep`) and exchange. */
export type RollStep = LegalStep | ExchangeStep;

/** `LegalStep` carries no `kind`, so presence of the tag IS the discriminant.
 *  Adding a tag to `LegalStep` would have changed the enumerator the grid
 *  shares, and the grid is not allowed to move. */
export function isExchangeStep(step: RollStep): step is ExchangeStep {
  return "kind" in step && step.kind === "exchange";
}

/**
 * Every legal spend-increasing exchange in one category, in deterministic
 * `dataset.badges` order (outgoing entry, then incoming badge, then level).
 *
 * `exchangeableBadgeIds` is THE SAFETY BOUNDARY: the roll passes only the
 * entries IT created during this walk. Nothing the user placed, and nothing
 * pinned by any of the five pin reasons, can ever appear as `outBadgeId`.
 * This function does not know about pins and must not learn about them —
 * the caller's set is narrower than "unpinned" and that is deliberate.
 *
 * `netCost > 0` IS AN ADMISSIBILITY CONDITION, exactly like the caller's
 * `netCost <= remainingPoints`. It is not "spend more where you can" — it is
 * "do not go backwards", and it is what makes the walk terminate. Two
 * admissible exchanges with different net costs are returned side by side in
 * one flat array with nothing to tell them apart, because the caller picks
 * uniformly and must not be able to see the difference.
 *
 * NO affordability filter lives here, matching `legalSteps`. The roll applies
 * `netCost <= remainingPoints`. `categoryFeasibility` DOES NOT CALL THIS.
 */
export function exchangeSteps(
  input: StepEnumerationInput & { exchangeableBadgeIds: ReadonlySet<string> },
  category: Category,
  dataset: BadgeDataset = shippedDataset,
): ExchangeStep[] {
  const { state, build, pinnedBadgeIds, excludedBadgeIds, exchangeableBadgeIds } = input;

  const ownedLevels = new Map<string, PurchasableLevel>();
  for (const entry of state.loadout) ownedLevels.set(entry.badgeId, entry.purchasedLevel);

  // The outgoing side: dataset order, owned, and created by THIS walk.
  const outgoing: { id: string; level: PurchasableLevel; netCost: number }[] = [];
  for (const badge of dataset.badges) {
    if (badge.category !== category) continue;
    if (!exchangeableBadgeIds.has(badge.id)) continue;
    const level = ownedLevels.get(badge.id);
    if (level === undefined) continue;
    outgoing.push({ id: badge.id, level, netCost: netCostOf(state, badge, level, dataset) });
  }
  if (outgoing.length === 0) return [];

  const steps: ExchangeStep[] = [];
  for (const out of outgoing) {
    for (const badge of dataset.badges) {
      if (badge.category !== category) continue;
      // An exchange BUYS AN UNOWNED BADGE. Raising something already held is an
      // upgrade and `legalSteps` already emits it.
      if (ownedLevels.has(badge.id)) continue;
      if (excludedBadgeIds.has(badge.id)) continue;
      if (pinnedBadgeIds.has(badge.id)) continue;
      if (!validateBadge(badge, build).allowed) continue;

      for (const level of PURCHASABLE_LEVELS) {
        // H3: PER LEVEL, inherited verbatim from legalSteps. Gaps are legal.
        if (!levelPasses(badge.requirements, build, level)) continue;
        const netCost = netCostOf(state, badge, level, dataset) - out.netCost;
        if (netCost <= 0) continue;
        steps.push({
          kind: "exchange",
          outBadgeId: out.id,
          outLevel: out.level,
          badgeId: badge.id,
          category,
          toLevel: level,
          netCost,
          requiresNewBadgeSlot: false,
        });
      }
    }
  }

  return steps;
}

/**
 * The most net spend this category could EVER absorb, capped by its own pool.
 *
 * Feeds the third argument of `rollIterationBound`. It is a LATTICE quantity,
 * not a budget one: `min(pool, ceiling)` keeps the §3.3 argument that a
 * fat-fingered `points: 999` cannot produce a long loop, because the ceiling
 * term stops growing once every height-allowed badge in the category is at its
 * dearest legal level.
 */
export function ceilingSpendFor(
  input: StepEnumerationInput,
  category: Category,
  pointsPool: number,
  dataset: BadgeDataset = shippedDataset,
): number {
  const { state, build } = input;
  let ceiling = 0;
  for (const badge of dataset.badges) {
    if (badge.category !== category) continue;
    if (!validateBadge(badge, build).allowed) continue;
    let dearest = 0;
    for (const level of PURCHASABLE_LEVELS) {
      if (!levelPasses(badge.requirements, build, level)) continue;
      const cost = netCostOf(state, badge, level, dataset);
      if (cost > dearest) dearest = cost;
    }
    ceiling += dearest;
  }
  return Math.min(pointsPool, ceiling);
}

/**
 * The loadout that results from applying one step. Pure — the input array is
 * never mutated, and entry ORDER is preserved (an upgrade replaces in place; a
 * purchase appends), so a roll's output is a stable value.
 */
export function applyStep(
  loadout: readonly LoadoutEntryLike[],
  step: LegalStep,
): LoadoutEntryLike[] {
  if (step.fromLevel === null) {
    return [...loadout, { badgeId: step.badgeId, purchasedLevel: step.toLevel }];
  }
  return loadout.map((entry) =>
    entry.badgeId === step.badgeId
      ? { badgeId: entry.badgeId, purchasedLevel: step.toLevel }
      : entry,
  );
}

/**
 * The loadout that results from applying one exchange. Pure. The outgoing
 * entry is dropped and the incoming one APPENDS, so the result is exactly what
 * "remove then buy" produces and the entry count is unchanged — which is why
 * an exchange can never move `equipSlotsUsed` (INV-22).
 */
export function applyExchange(
  loadout: readonly LoadoutEntryLike[],
  step: ExchangeStep,
): LoadoutEntryLike[] {
  return [
    ...loadout.filter((entry) => entry.badgeId !== step.outBadgeId),
    { badgeId: step.badgeId, purchasedLevel: step.toLevel },
  ];
}

/** Structural alias so `applyStep` needs no import cycle through types.ts. */
interface LoadoutEntryLike {
  badgeId: string;
  purchasedLevel: PurchasableLevel;
}

/** Total-to-own cost of one entry — the roster's `cost` column, and the one
 * place the summary selector reads a tier cost. Re-exported from the cost
 * engine rather than re-derived. */
export function costOfEntry(
  badge: Badge,
  purchasedLevel: PurchasableLevel,
  dataset: BadgeDataset = shippedDataset,
): number {
  return costForLevel(badge.tier, purchasedLevel, dataset);
}
