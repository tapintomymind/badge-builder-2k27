/**
 * INV-14's EXACT-DP ORACLE. TEST-ONLY — never shipped, never collected
 * (vitest's `include` is `*.test.ts`, and this file is deliberately not one).
 *
 * WHY AN ORACLE AT ALL. The feature brief's ship threshold was ">20% of a
 * category's pool left unspent", and that MEASURES THE WRONG DENOMINATOR: a
 * capacity-bound category can legitimately leave 40% of its pool unspent
 * because there is nothing left to buy. The question that actually matters is
 * how far the randomized-greedy result sits from the ACHIEVABLE optimum, and
 * answering it needs the optimum.
 *
 * WHY THE DP IS NOT THE SHIPPED ALGORITHM. Four reasons, and none of them is
 * "it is too slow": maximum spend is not the objective (the user asked to
 * randomize the remainder, not to solve it); the recurrence hard-codes the
 * constraint set, so every future constraint is a re-derivation rather than
 * one more filter clause; the argmax set can be a SINGLETON, which turns
 * re-roll into a constant function in exactly the tight categories where
 * variety matters most; and it leans on netCost additivity where greedy
 * re-validates against the shipped ledger every iteration.
 *
 * SCOPE, STATED HONESTLY. This oracle maximizes GROSS spend and is therefore
 * only exact where no refund fires — no synergy assignment and a Legend-based
 * refund trigger, which is the configuration the INV-14 fixtures use. Under
 * `hofOrAbove` a step can be net-free or net-negative and "maximum spend"
 * stops being the right objective, so that configuration is covered by the
 * termination and legality invariants instead.
 */

import { costForLevel } from "../src/engine/cost";
import { legalSteps } from "../src/engine/steps";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import { categoryLedgerAt } from "../src/engine/synergy-ledger";
import type { BadgeDataset, Build } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";

const NONE: ReadonlySet<string> = new Set<string>();

interface Choice {
  cost: number;
  usesBadgeSlot: boolean;
}

/**
 * The maximum ADDITIONAL gross spend reachable in one category from `state`,
 * subject to the points pool and the Badge Slots capacity. Exact, by DP over
 * (points remaining, Badge Slots remaining) with one decision per badge.
 */
export function optimalAddedSpend(
  state: SynergyLedgerState,
  build: Build,
  category: Category,
  dataset: BadgeDataset,
): number {
  const budget = state.budgets[category];
  const readout = categoryLedgerAt(state, "current", category, dataset);
  const pointsLeft = Math.max(0, readout.remainingPoints);
  const badgeSlotsLeft = Math.max(0, budget.equipSlots - readout.equipSlotsUsed);

  // One group of mutually exclusive choices per badge: a badge ends at ONE
  // level, so at most one of its steps is taken.
  const groups = new Map<string, Choice[]>();
  for (const step of legalSteps(
    { state, build, pinnedBadgeIds: NONE, excludedBadgeIds: NONE },
    category,
    dataset,
  )) {
    const list = groups.get(step.badgeId) ?? [];
    list.push({ cost: step.grossCost, usesBadgeSlot: step.requiresNewBadgeSlot });
    groups.set(step.badgeId, list);
  }

  // dp[p][k] = the best added spend using at most p points and k Badge Slots.
  let dp: number[][] = Array.from({ length: pointsLeft + 1 }, () =>
    new Array<number>(badgeSlotsLeft + 1).fill(0),
  );

  for (const choices of groups.values()) {
    const next = dp.map((row) => [...row]);
    for (let p = 0; p <= pointsLeft; p += 1) {
      for (let k = 0; k <= badgeSlotsLeft; k += 1) {
        for (const choice of choices) {
          const usedBadgeSlots = choice.usesBadgeSlot ? 1 : 0;
          if (choice.cost > p || usedBadgeSlots > k) continue;
          const candidate =
            (dp[p - choice.cost] as number[])[k - usedBadgeSlots] as number;
          const withChoice = candidate + choice.cost;
          if (withChoice > ((next[p] as number[])[k] as number)) {
            (next[p] as number[])[k] = withChoice;
          }
        }
      }
    }
    dp = next;
  }

  return (dp[pointsLeft] as number[])[badgeSlotsLeft] as number;
}

/** Total-to-own gross spend of one category, straight from the cost engine. */
export function grossSpendOf(
  loadout: readonly { badgeId: string; purchasedLevel: "bronze" | "silver" | "gold" | "hof" }[],
  category: Category,
  dataset: BadgeDataset,
): number {
  return loadout.reduce((sum, entry) => {
    const badge = dataset.badges.find((candidate) => candidate.id === entry.badgeId);
    if (badge === undefined || badge.category !== category) return sum;
    return sum + costForLevel(badge.tier, entry.purchasedLevel, dataset);
  }, 0);
}
