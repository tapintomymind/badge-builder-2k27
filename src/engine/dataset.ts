/**
 * Dataset loader (H6). Converts the seed's positional 4-arrays into keyed
 * records at the boundary. After this loader, NO positional indexing exists
 * anywhere in the codebase.
 *
 * THE LOADER'S GUARDS ARE ARITY ONLY (`length === 4`). It must NOT enforce
 * suffix-only nulls (assertion 11) or non-decreasing thresholds (assertion
 * 12) — those are dataset tests over badges.json. Enforcing them here would
 * make the H3 mid-array-null fixture unloadable and kill the only proof of
 * independent-per-level evaluation (scope.md §3 H3, critic-review §NB-5).
 */

import rawJson from "../data/badges.json";
import { DatasetArityError } from "./errors";
import type {
  AttrLine,
  Badge,
  BadgeDataset,
  PerLevelThresholds,
  RawAttrLine,
  RawBadge,
  RawBadgeDataset,
  TierCosts,
} from "./types";
import type { Level } from "./vocabulary";
import { TIERS } from "./vocabulary";

/** Positional element access with the arity guard folded in. */
function elementAt(
  values: readonly (number | null)[],
  index: number,
  context: string,
): number | null {
  const value = values[index];
  if (value === undefined) throw new DatasetArityError(context, values.length);
  return value;
}

/** [BRZ, SLV, GLD, HOF] → keyed record. Arity guard ONLY. */
export function keyPerLevel(
  perLevel: readonly (number | null)[],
  context: string,
): PerLevelThresholds {
  if (perLevel.length !== 4) throw new DatasetArityError(context, perLevel.length);
  return {
    bronze: elementAt(perLevel, 0, context),
    silver: elementAt(perLevel, 1, context),
    gold: elementAt(perLevel, 2, context),
    hof: elementAt(perLevel, 3, context),
  };
}

function keyCosts(costs: readonly number[], context: string): Record<
  "bronze" | "silver" | "gold" | "hof",
  number
> {
  if (costs.length !== 4) throw new DatasetArityError(context, costs.length);
  const keyed = keyPerLevel(costs, context);
  // Cost arrays carry no nulls by type; the cast records that fact.
  return keyed as Record<"bronze" | "silver" | "gold" | "hof", number>;
}

export function loadAttrLine(raw: RawAttrLine, badgeId: string): AttrLine {
  return {
    attr: raw.attr,
    perLevel: keyPerLevel(raw.perLevel, `badge ${badgeId} / ${raw.attr} perLevel`),
  };
}

export function loadBadge(raw: RawBadge): Badge {
  return {
    id: raw.id,
    name: raw.name,
    tier: raw.tier,
    category: raw.category,
    requirements: {
      heightMinInches: raw.requirements.heightMinInches,
      heightMaxInches: raw.requirements.heightMaxInches,
      logic: raw.requirements.logic,
      attrs: raw.requirements.attrs.map((line) => loadAttrLine(line, raw.id)),
    },
  };
}

export function loadDataset(raw: RawBadgeDataset): BadgeDataset {
  const tierCosts = {} as TierCosts;
  for (const tier of TIERS) {
    tierCosts[tier] = keyCosts(raw.tierCosts[tier], `tierCosts.${tier}`);
  }
  return {
    dataVersion: raw.dataVersion,
    source: raw.source,
    asOf: raw.asOf,
    gameVersion: raw.gameVersion,
    confidence: raw.confidence,
    // Membership of `levels` in the canonical 5-tuple is dataset assertion 14,
    // not a loader guard.
    levels: raw.levels as Level[],
    tierCosts,
    badges: raw.badges.map(loadBadge),
  };
}

/** The shipped dataset, raw (exactly badges.json). The wide-union cast is
 * validated by dataset assertions 9/10/13/14 rather than by the loader. */
export const shippedRawDataset = rawJson as unknown as RawBadgeDataset;

/** The shipped dataset, loaded and keyed — what the engine consumes. */
export const shippedDataset: BadgeDataset = loadDataset(shippedRawDataset);

export function badgeById(dataset: BadgeDataset, badgeId: string): Badge | undefined {
  return dataset.badges.find((badge) => badge.id === badgeId);
}
