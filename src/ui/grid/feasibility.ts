/**
 * FeasibilityReadout aggregation (design-spec §3.6, impl-brief M4 #8).
 *
 * COUNTS ONLY. As of F8-E1 this file no longer enumerates anything: it is
 * expressed as counts over `src/engine/steps.ts`'s `legalSteps`, which IS the
 * enumerator this function used to be. Before the hoist there were two
 * enumerators in the tree — this one and the roll engine's — and the drift
 * between them would have surfaced as the UI saying "3 upgrades still
 * affordable" immediately before a roll reported "nothing fits". INV-19's
 * golden table (`tests/feasibility-golden.test.ts`) pins that the
 * re-expression moved zero numbers.
 *
 * Zero tier-cost arithmetic lives here, and no ranking or scoring of any kind:
 * the tool shows what FITS; the user chooses.
 *
 * AFFORDABILITY IS TESTED WITH `grossCost`, DELIBERATELY. `LegalStep` also
 * carries `netCost`, and post-F4 (`onFuse`) `netCost` is the more truthful
 * test — upgrading a fused badge is net-free there, so this readout will
 * UNDER-COUNT affordable upgrades on exactly the badges the user cares most
 * about. That fix is real and is ROUTED TO F4 (f8-00 §4 finding 1): flipping a
 * shipped readout's displayed numbers is a UI behaviour change and does not
 * belong smuggled inside an engine refactor.
 */

import { legalSteps } from "../../engine/steps";
import type { SynergyLedgerState } from "../../engine/synergy-ledger";
import type { BadgeDataset, Build } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";

export interface CategoryFeasibility {
  /** Affordable upgrade pairs across the whole category. */
  affordableUpgrades: number;
  /** The subset on badges already purchased (upgrading an owned badge uses
   * no new Badge Slot — the split message when Badge Slots are exhausted). */
  affordableOwnedUpgrades: number;
}

/** Nothing is pinned or excluded from the GRID's point of view — the readout
 * counts what the user could buy, and pins/exclusions are the roll's session
 * policy, not a property of the build. Shared frozen empties, so the hot path
 * allocates nothing. */
const NOTHING: ReadonlySet<string> = new Set<string>();

export function categoryFeasibility(
  state: SynergyLedgerState,
  build: Build,
  category: Category,
  remainingPoints: number,
  dataset: BadgeDataset,
): CategoryFeasibility {
  const steps = legalSteps(
    { state, build, pinnedBadgeIds: NOTHING, excludedBadgeIds: NOTHING },
    category,
    dataset,
  );
  const affordable = steps.filter((step) => step.grossCost <= remainingPoints);
  return {
    affordableUpgrades: affordable.length,
    affordableOwnedUpgrades: affordable.filter((step) => !step.requiresNewBadgeSlot).length,
  };
}
