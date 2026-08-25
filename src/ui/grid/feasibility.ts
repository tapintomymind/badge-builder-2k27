/**
 * FeasibilityReadout aggregation (design-spec §3.6, impl-brief M4 #8).
 *
 * COUNTS AND COMPARISONS ONLY, over engine outputs the grid already computes:
 * levelPasses (the per-pip gate), whatIf (the per-pip cost delta), and the
 * category's remainingPoints readout. ZERO tier-cost arithmetic lives here —
 * no `tierCosts` read, no engine selector, and no ranking/scoring of any
 * kind: the tool shows what FITS; the user chooses.
 *
 * An "upgrade" is a (badge, level) pair the grid renders as an upgrade pip:
 * the badge's height gate passes, the level passes its attribute logic, and
 * the level is above the current purchase (or the badge is unpurchased). It
 * is AFFORDABLE when its whatIf delta is within the category's remaining
 * points.
 */

import { validateBadge, levelPasses } from "../../engine/eligibility";
import { whatIf } from "../../engine/cost";
import type { Badge, BadgeDataset, Build, LoadoutEntry } from "../../engine/types";
import { PURCHASABLE_LEVELS, levelIndex } from "../../engine/vocabulary";

export interface CategoryFeasibility {
  /** Affordable upgrade pairs across the whole category. */
  affordableUpgrades: number;
  /** The subset on badges already purchased (upgrading an owned badge uses
   * no new Badge Slot — the split message when Badge Slots are exhausted). */
  affordableOwnedUpgrades: number;
}

export function categoryFeasibility(
  badges: readonly Badge[],
  build: Build,
  loadout: readonly LoadoutEntry[],
  remainingPoints: number,
  dataset: BadgeDataset,
): CategoryFeasibility {
  let affordableUpgrades = 0;
  let affordableOwnedUpgrades = 0;
  for (const badge of badges) {
    const eligibility = validateBadge(badge, build);
    if (!eligibility.allowed) continue; // height-blocked: no purchasable pips
    const entry = loadout.find((candidate) => candidate.badgeId === badge.id);
    for (const level of PURCHASABLE_LEVELS) {
      if (entry !== undefined && levelIndex(level) <= levelIndex(entry.purchasedLevel)) {
        continue; // owned or current — not an upgrade pip
      }
      if (!levelPasses(badge.requirements, build, level)) continue; // locked pip
      if (whatIf(loadout, badge.id, level, dataset) > remainingPoints) continue;
      affordableUpgrades += 1;
      if (entry !== undefined) affordableOwnedUpgrades += 1;
    }
  }
  return { affordableUpgrades, affordableOwnedUpgrades };
}
