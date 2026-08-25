/**
 * Cost engine (H6). Costs are TOTAL-TO-OWN at a level, not cumulative
 * (seed: Tiers, levels, and costs): upgrading pays the difference, downgrading
 * returns the difference.
 *
 * `costForLevel` THROWS on Legend. Throw is chosen over null-return because a
 * null propagates to NaN or gets silently `?? 0`'d — the exact silent-wrong
 * shape H6 exists to prevent. The one legitimate nullable path is the
 * explicitly-named `costForLevelOrNull` (a cost preview on a locked pip).
 */

import { badgeById, shippedDataset } from "./dataset";
import { LegendNotPurchasableError, UnknownBadgeError } from "./errors";
import type { BadgeDataset, LoadoutEntry } from "./types";
import type { Level, PurchasableLevel, Tier } from "./vocabulary";

/** Total points to own `tier` at `level`. Throws LegendNotPurchasableError on
 * Legend — Legend is boost-only and has no cost. */
export function costForLevel(
  tier: Tier,
  level: Level,
  dataset: BadgeDataset = shippedDataset,
): number {
  if (level === "legend") throw new LegendNotPurchasableError(tier);
  return dataset.tierCosts[tier][level];
}

/** Explicitly-named nullable variant for the ONE legitimate caller: rendering
 * a cost preview on a locked level pip. Everything else uses costForLevel. */
export function costForLevelOrNull(
  tier: Tier,
  level: Level,
  dataset: BadgeDataset = shippedDataset,
): number | null {
  if (level === "legend") return null;
  return dataset.tierCosts[tier][level];
}

/**
 * What-if: the cost delta of moving `badgeId` to `targetLevel`
 * (null = remove). Positive = additional points; negative = points returned.
 * Pure function of the loadout passed in.
 */
export function whatIf(
  loadout: readonly LoadoutEntry[],
  badgeId: string,
  targetLevel: PurchasableLevel | null,
  dataset: BadgeDataset = shippedDataset,
): number {
  const badge = badgeById(dataset, badgeId);
  if (badge === undefined) throw new UnknownBadgeError(badgeId);
  const entry = loadout.find((candidate) => candidate.badgeId === badgeId);
  const currentCost =
    entry === undefined ? 0 : costForLevel(badge.tier, entry.purchasedLevel, dataset);
  const targetCost =
    targetLevel === null ? 0 : costForLevel(badge.tier, targetLevel, dataset);
  return targetCost - currentCost;
}
