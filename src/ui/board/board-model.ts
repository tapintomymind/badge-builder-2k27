/**
 * The Loadout board's projection (F16) — purchased badges, grouped by
 * discipline, with everything a tile renders already read out of the engine.
 *
 * A SEPARATE MODULE RATHER THAN A COMPONENT BODY, deliberately, and on the
 * precedent `src/ui/grid/feasibility.ts` already set: a derived value belongs
 * in a selector, never inline in JSX. That is what keeps the board's
 * components rendering props and nothing else, and it is what makes the
 * projection unit-testable without a DOM.
 *
 * ZERO RULES LIVE HERE. Every judgement is an existing engine export called
 * by name — `costForLevelOrNull` prices, `synergyRoleFor` decides the role,
 * `entryIsStale` decides staleness, and the capacity rules
 * (`badgeSlotsCapacityUnset`, the over-by builders) are asked for by the
 * panel. What this file does is a projection: look up each purchased entry's
 * badge, bucket it under that badge's category, and keep DATASET ORDER.
 *
 * NO RANKING, NO SCORING, NO "RECOMMENDED" — the ordering is the dataset's
 * own and nothing else. A board is exactly the surface someone will want to
 * add a suggester to; the working agreement forbids it, and the order is
 * therefore a property of the data rather than of the build.
 *
 * `Category` IS NOT `AttrGroup`. The six panels are BADGE CATEGORIES
 * (capitalised), not attribute groups: a `Physical Finisher` tile appears in
 * the Finishing panel even though it gates on Strength.
 */

import { costForLevelOrNull } from "../../engine/cost";
import { badgeById } from "../../engine/dataset";
import { entryIsStale } from "../../engine/eligibility";
import { synergyRoleFor } from "../../engine/synergy";
import type {
  BadgeDataset,
  Build,
  LoadoutEntry,
  SynergySlot,
} from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import type { BoardTileData } from "./DisciplinePanel";

/** The in-page anchor for a badge's card in the grid. ONE definition, used
 * both by the tile that links to it and by the `<li>` that carries it, so the
 * two can never disagree about the id. */
export function badgeAnchorId(badgeId: string): string {
  return `badge-${badgeId}`;
}

export interface BoardModelInput {
  loadout: readonly LoadoutEntry[];
  synergySlots: readonly SynergySlot[];
  build: Build;
  dataset: BadgeDataset;
}

/**
 * One `BoardTileData[]` per category, keyed by category.
 *
 * DATASET ORDER, NOT LOADOUT ORDER. The loadout is append-ordered by when the
 * user bought things, so ordering by it would make tiles jump around as the
 * plan is edited — the board's whole value is that it is a stable picture. An
 * entry whose badge id is absent from the current dataset is DROPPED from the
 * board rather than rendered as a placeholder: it has no name, no tier and no
 * cost to show, and the drift banner is the surface that discloses it.
 */
export function boardTilesByCategory(
  input: BoardModelInput,
): Record<Category, BoardTileData[]> {
  const { loadout, synergySlots, build, dataset } = input;

  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category, [] as BoardTileData[]]),
  ) as Record<Category, BoardTileData[]>;

  const levelByBadgeId = new Map<string, LoadoutEntry>();
  for (const entry of loadout) levelByBadgeId.set(entry.badgeId, entry);

  for (const badge of dataset.badges) {
    const entry = levelByBadgeId.get(badge.id);
    if (entry === undefined) continue;
    // Defensive only: the id came out of the dataset we are iterating, so
    // this cannot miss. Kept because `badgeById` is the one lookup route and
    // hand-rolling a second one is how two lookups drift.
    if (badgeById(dataset, badge.id) === undefined) continue;
    byCategory[badge.category].push({
      badge,
      entry,
      cost: costForLevelOrNull(badge.tier, entry.purchasedLevel, dataset),
      role: synergyRoleFor(synergySlots, badge.id),
      stale: entryIsStale(badge, build, entry.purchasedLevel),
      href: `#${badgeAnchorId(badge.id)}`,
    });
  }

  return byCategory;
}
