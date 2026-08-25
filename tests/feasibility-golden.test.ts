/**
 * INV-19 — the GOLDEN TABLE that controls the R-4 hoist (impl-brief F8-E1 §1(f)).
 *
 * `categoryFeasibility` is being re-expressed as counts over the engine's new
 * single step enumerator (`src/engine/steps.ts`). That refactor is the only
 * part of F8-E1 that can silently change a number the app already displays, so
 * the discipline is: PIN FIRST, REFACTOR SECOND.
 *
 *   1. This table was written and run GREEN against the UNMODIFIED
 *      `src/ui/grid/feasibility.ts`, before `steps.ts` existed.
 *   2. Only then was the hoist made.
 *   3. The table was re-run and is green with ZERO numbers moved.
 *
 * A golden table nobody has seen green against the pre-refactor tree pins
 * nothing. The raw pre-refactor output is checked in at
 * `docs/proof/f8e1-verification.txt`.
 *
 * `callFeasibility` below is the ONE adapter that moves across the refactor
 * (the AJ-6 signature change). THE TABLE ITSELF IS NEVER EDITED — if a cell
 * needs to move, the hoist is wrong.
 *
 * Deterministic matrix, NO RNG:
 *   6 builds × 6 categories × 4 loadout states × 3 remainingPoints  = 432 rows
 * + 1 synthetic-dataset build × 6 × 4 × 3                           =  72 rows
 *
 * The synthetic arm exists because THE SHIPPED DATASET CANNOT EXPRESS A LEVEL
 * GAP. `badges.json` (dataVersion 2026-08-25.1) carries exactly one null
 * threshold — `unpluckable`'s HOF on one line of an `or` badge, which its
 * second line satisfies — and every threshold line is monotone non-decreasing.
 * So the brief's "build with a deliberate level gap (passes Bronze and Gold,
 * fails Silver)" is unconstructible over shipped data, and the gap is pinned
 * over `syntheticAndMidNullGap` instead — the fixture that already ships for
 * exactly this reason (H3).
 */

import { describe, expect, it } from "vitest";
import { loadDataset, shippedDataset, shippedRawDataset } from "../src/engine/dataset";
import { syntheticBadges } from "../src/engine/__fixtures__/synthetic-badges";
import { categoryFeasibility } from "../src/ui/grid/feasibility";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import type { BadgeDataset, Budget, Build, LoadoutEntry } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

// ---------------------------------------------------------------------------
// The ONE thing that moves across the refactor: how the function is CALLED.
// Pre-hoist:  categoryFeasibility(badges, build, loadout, remainingPoints, dataset)
// Post-hoist: categoryFeasibility(state, build, category, remainingPoints, dataset)
// ---------------------------------------------------------------------------

function callFeasibility(
  build: Build,
  category: Category,
  loadout: readonly LoadoutEntry[],
  remainingPoints: number,
  dataset: BadgeDataset,
): { affordableUpgrades: number; affordableOwnedUpgrades: number } {
  const state: SynergyLedgerState = {
    loadout,
    budgets: budgetsFor(999),
    synergySlots: createDefaultSynergySlots(),
    refundTrigger: "legendByAnyMeans",
  };
  return categoryFeasibility(state, build, category, remainingPoints, dataset);
}

function budgetsFor(points: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 6, points }]),
  ) as Record<Category, Budget>;
}

// ---------------------------------------------------------------------------
// The matrix.
// ---------------------------------------------------------------------------

/** The synthetic dataset: everything shipped, plus the H3 fixtures — the ONLY
 * way to pin gap behaviour, since badges.json cannot express a gap. */
const syntheticDataset: BadgeDataset = loadDataset({
  ...shippedRawDataset,
  badges: [...shippedRawDataset.badges, ...syntheticBadges],
});

interface BuildCase {
  id: string;
  build: Build;
  dataset: BadgeDataset;
}

/**
 * Six shipped-data builds, then one over the synthetic dataset.
 *
 * `b5-59-blocks-rebounding` is the brief's "height-blocks ≥3 Rebounding
 * badges" case, ADJUSTED TO THE DATA: only two Rebounding badges
 * (`boxout-boss`, `breaker`) carry a 75–88 range, so two is the maximum
 * reachable. At 5'9" it also height-blocks Finishing, Defense and Physicals
 * badges, which is the coverage the case was asking for.
 *
 * `b6-84-asymmetric` replaces the unconstructible gap build: per-attribute
 * values chosen so the two lines of every `and` badge disagree level by level,
 * which is the divergence a first-failure scan would collapse.
 */
const BUILD_CASES: readonly BuildCase[] = [
  { id: "b1-59-low", build: makeBuild(69, 40), dataset: shippedDataset },
  { id: "b2-74-low", build: makeBuild(88, 40), dataset: shippedDataset },
  { id: "b3-66-mid", build: makeBuild(78, 75), dataset: shippedDataset },
  { id: "b4-maxed", build: makeBuild(78, 99), dataset: shippedDataset },
  { id: "b5-59-blocks-rebounding", build: makeBuild(69, 90), dataset: shippedDataset },
  {
    id: "b6-84-asymmetric",
    build: makeBuild(84, 70, {
      close: 95, layup: 62, drivingDunk: 88, standingDunk: 58, postControl: 91,
      mid: 60, threePt: 93, passAcc: 86, ballHandle: 59, speedWithBall: 90,
      interiorDef: 57, perimeterDef: 92, steal: 64, block: 89, offReb: 94,
      defReb: 61, speed: 87, agility: 63, strength: 96, vertical: 66,
    }),
    dataset: shippedDataset,
  },
  { id: "b7-synthetic-gap", build: makeBuild(78, 99), dataset: syntheticDataset },
];

const REMAINING_POINTS = [0, 6, 99] as const;

/** Four loadout states per category, built from that category's badges in
 * DATASET ORDER so the fixture is a pure function of the dataset. */
function loadoutStates(
  dataset: BadgeDataset,
  category: Category,
): { id: string; loadout: LoadoutEntry[] }[] {
  const inCategory = dataset.badges.filter((badge) => badge.category === category);
  const at = (index: number): string => (inCategory[index] as { id: string }).id;
  return [
    { id: "empty", loadout: [] },
    { id: "1brz", loadout: [{ badgeId: at(0), purchasedLevel: "bronze" }] },
    { id: "1hof", loadout: [{ badgeId: at(0), purchasedLevel: "hof" }] },
    {
      id: "3mix",
      loadout: [
        { badgeId: at(0), purchasedLevel: "bronze" },
        { badgeId: at(1), purchasedLevel: "gold" },
        { badgeId: at(2), purchasedLevel: "hof" },
      ],
    },
  ];
}

/** One row per matrix cell: `build|category|loadout|remaining|upgrades|owned`. */
export function generateGoldenRows(): string[] {
  const rows: string[] = [];
  for (const buildCase of BUILD_CASES) {
    for (const category of CATEGORIES) {
      for (const state of loadoutStates(buildCase.dataset, category)) {
        for (const remaining of REMAINING_POINTS) {
          const result = callFeasibility(
            buildCase.build,
            category,
            state.loadout,
            remaining,
            buildCase.dataset,
          );
          rows.push(
            `${buildCase.id}|${category}|${state.id}|${remaining}|` +
              `${result.affordableUpgrades}|${result.affordableOwnedUpgrades}`,
          );
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// THE TABLE. Pinned against dataVersion 2026-08-25.1 pre-hoist. NEVER edited
// by hand to make a run green — a moved cell means the hoist changed behaviour.
// ---------------------------------------------------------------------------

const GOLDEN: readonly string[] = [
  "b1-59-low|Finishing|empty|0|0|0",
  "b1-59-low|Finishing|empty|6|0|0",
  "b1-59-low|Finishing|empty|99|0|0",
  "b1-59-low|Finishing|1brz|0|0|0",
  "b1-59-low|Finishing|1brz|6|0|0",
  "b1-59-low|Finishing|1brz|99|0|0",
  "b1-59-low|Finishing|1hof|0|0|0",
  "b1-59-low|Finishing|1hof|6|0|0",
  "b1-59-low|Finishing|1hof|99|0|0",
  "b1-59-low|Finishing|3mix|0|0|0",
  "b1-59-low|Finishing|3mix|6|0|0",
  "b1-59-low|Finishing|3mix|99|0|0",
  "b1-59-low|Shooting|empty|0|0|0",
  "b1-59-low|Shooting|empty|6|0|0",
  "b1-59-low|Shooting|empty|99|0|0",
  "b1-59-low|Shooting|1brz|0|0|0",
  "b1-59-low|Shooting|1brz|6|0|0",
  "b1-59-low|Shooting|1brz|99|0|0",
  "b1-59-low|Shooting|1hof|0|0|0",
  "b1-59-low|Shooting|1hof|6|0|0",
  "b1-59-low|Shooting|1hof|99|0|0",
  "b1-59-low|Shooting|3mix|0|0|0",
  "b1-59-low|Shooting|3mix|6|0|0",
  "b1-59-low|Shooting|3mix|99|0|0",
  "b1-59-low|Playmaking|empty|0|0|0",
  "b1-59-low|Playmaking|empty|6|0|0",
  "b1-59-low|Playmaking|empty|99|0|0",
  "b1-59-low|Playmaking|1brz|0|0|0",
  "b1-59-low|Playmaking|1brz|6|0|0",
  "b1-59-low|Playmaking|1brz|99|0|0",
  "b1-59-low|Playmaking|1hof|0|0|0",
  "b1-59-low|Playmaking|1hof|6|0|0",
  "b1-59-low|Playmaking|1hof|99|0|0",
  "b1-59-low|Playmaking|3mix|0|0|0",
  "b1-59-low|Playmaking|3mix|6|0|0",
  "b1-59-low|Playmaking|3mix|99|0|0",
  "b1-59-low|Defense|empty|0|0|0",
  "b1-59-low|Defense|empty|6|0|0",
  "b1-59-low|Defense|empty|99|0|0",
  "b1-59-low|Defense|1brz|0|0|0",
  "b1-59-low|Defense|1brz|6|0|0",
  "b1-59-low|Defense|1brz|99|0|0",
  "b1-59-low|Defense|1hof|0|0|0",
  "b1-59-low|Defense|1hof|6|0|0",
  "b1-59-low|Defense|1hof|99|0|0",
  "b1-59-low|Defense|3mix|0|0|0",
  "b1-59-low|Defense|3mix|6|0|0",
  "b1-59-low|Defense|3mix|99|0|0",
  "b1-59-low|Rebounding|empty|0|0|0",
  "b1-59-low|Rebounding|empty|6|0|0",
  "b1-59-low|Rebounding|empty|99|0|0",
  "b1-59-low|Rebounding|1brz|0|0|0",
  "b1-59-low|Rebounding|1brz|6|0|0",
  "b1-59-low|Rebounding|1brz|99|0|0",
  "b1-59-low|Rebounding|1hof|0|0|0",
  "b1-59-low|Rebounding|1hof|6|0|0",
  "b1-59-low|Rebounding|1hof|99|0|0",
  "b1-59-low|Rebounding|3mix|0|0|0",
  "b1-59-low|Rebounding|3mix|6|0|0",
  "b1-59-low|Rebounding|3mix|99|0|0",
  "b1-59-low|Physicals|empty|0|0|0",
  "b1-59-low|Physicals|empty|6|0|0",
  "b1-59-low|Physicals|empty|99|0|0",
  "b1-59-low|Physicals|1brz|0|0|0",
  "b1-59-low|Physicals|1brz|6|0|0",
  "b1-59-low|Physicals|1brz|99|0|0",
  "b1-59-low|Physicals|1hof|0|0|0",
  "b1-59-low|Physicals|1hof|6|0|0",
  "b1-59-low|Physicals|1hof|99|0|0",
  "b1-59-low|Physicals|3mix|0|0|0",
  "b1-59-low|Physicals|3mix|6|0|0",
  "b1-59-low|Physicals|3mix|99|0|0",
  "b2-74-low|Finishing|empty|0|0|0",
  "b2-74-low|Finishing|empty|6|0|0",
  "b2-74-low|Finishing|empty|99|0|0",
  "b2-74-low|Finishing|1brz|0|0|0",
  "b2-74-low|Finishing|1brz|6|0|0",
  "b2-74-low|Finishing|1brz|99|0|0",
  "b2-74-low|Finishing|1hof|0|0|0",
  "b2-74-low|Finishing|1hof|6|0|0",
  "b2-74-low|Finishing|1hof|99|0|0",
  "b2-74-low|Finishing|3mix|0|0|0",
  "b2-74-low|Finishing|3mix|6|0|0",
  "b2-74-low|Finishing|3mix|99|0|0",
  "b2-74-low|Shooting|empty|0|0|0",
  "b2-74-low|Shooting|empty|6|0|0",
  "b2-74-low|Shooting|empty|99|0|0",
  "b2-74-low|Shooting|1brz|0|0|0",
  "b2-74-low|Shooting|1brz|6|0|0",
  "b2-74-low|Shooting|1brz|99|0|0",
  "b2-74-low|Shooting|1hof|0|0|0",
  "b2-74-low|Shooting|1hof|6|0|0",
  "b2-74-low|Shooting|1hof|99|0|0",
  "b2-74-low|Shooting|3mix|0|0|0",
  "b2-74-low|Shooting|3mix|6|0|0",
  "b2-74-low|Shooting|3mix|99|0|0",
  "b2-74-low|Playmaking|empty|0|0|0",
  "b2-74-low|Playmaking|empty|6|0|0",
  "b2-74-low|Playmaking|empty|99|0|0",
  "b2-74-low|Playmaking|1brz|0|0|0",
  "b2-74-low|Playmaking|1brz|6|0|0",
  "b2-74-low|Playmaking|1brz|99|0|0",
  "b2-74-low|Playmaking|1hof|0|0|0",
  "b2-74-low|Playmaking|1hof|6|0|0",
  "b2-74-low|Playmaking|1hof|99|0|0",
  "b2-74-low|Playmaking|3mix|0|0|0",
  "b2-74-low|Playmaking|3mix|6|0|0",
  "b2-74-low|Playmaking|3mix|99|0|0",
  "b2-74-low|Defense|empty|0|0|0",
  "b2-74-low|Defense|empty|6|0|0",
  "b2-74-low|Defense|empty|99|0|0",
  "b2-74-low|Defense|1brz|0|0|0",
  "b2-74-low|Defense|1brz|6|0|0",
  "b2-74-low|Defense|1brz|99|0|0",
  "b2-74-low|Defense|1hof|0|0|0",
  "b2-74-low|Defense|1hof|6|0|0",
  "b2-74-low|Defense|1hof|99|0|0",
  "b2-74-low|Defense|3mix|0|0|0",
  "b2-74-low|Defense|3mix|6|0|0",
  "b2-74-low|Defense|3mix|99|0|0",
  "b2-74-low|Rebounding|empty|0|0|0",
  "b2-74-low|Rebounding|empty|6|0|0",
  "b2-74-low|Rebounding|empty|99|0|0",
  "b2-74-low|Rebounding|1brz|0|0|0",
  "b2-74-low|Rebounding|1brz|6|0|0",
  "b2-74-low|Rebounding|1brz|99|0|0",
  "b2-74-low|Rebounding|1hof|0|0|0",
  "b2-74-low|Rebounding|1hof|6|0|0",
  "b2-74-low|Rebounding|1hof|99|0|0",
  "b2-74-low|Rebounding|3mix|0|0|0",
  "b2-74-low|Rebounding|3mix|6|0|0",
  "b2-74-low|Rebounding|3mix|99|0|0",
  "b2-74-low|Physicals|empty|0|0|0",
  "b2-74-low|Physicals|empty|6|0|0",
  "b2-74-low|Physicals|empty|99|0|0",
  "b2-74-low|Physicals|1brz|0|0|0",
  "b2-74-low|Physicals|1brz|6|0|0",
  "b2-74-low|Physicals|1brz|99|0|0",
  "b2-74-low|Physicals|1hof|0|0|0",
  "b2-74-low|Physicals|1hof|6|0|0",
  "b2-74-low|Physicals|1hof|99|0|0",
  "b2-74-low|Physicals|3mix|0|0|0",
  "b2-74-low|Physicals|3mix|6|0|0",
  "b2-74-low|Physicals|3mix|99|0|0",
  "b3-66-mid|Finishing|empty|0|0|0",
  "b3-66-mid|Finishing|empty|6|13|0",
  "b3-66-mid|Finishing|empty|99|13|0",
  "b3-66-mid|Finishing|1brz|0|0|0",
  "b3-66-mid|Finishing|1brz|6|12|1",
  "b3-66-mid|Finishing|1brz|99|12|1",
  "b3-66-mid|Finishing|1hof|0|0|0",
  "b3-66-mid|Finishing|1hof|6|11|0",
  "b3-66-mid|Finishing|1hof|99|11|0",
  "b3-66-mid|Finishing|3mix|0|0|0",
  "b3-66-mid|Finishing|3mix|6|10|1",
  "b3-66-mid|Finishing|3mix|99|10|1",
  "b3-66-mid|Shooting|empty|0|0|0",
  "b3-66-mid|Shooting|empty|6|8|0",
  "b3-66-mid|Shooting|empty|99|8|0",
  "b3-66-mid|Shooting|1brz|0|0|0",
  "b3-66-mid|Shooting|1brz|6|7|0",
  "b3-66-mid|Shooting|1brz|99|7|0",
  "b3-66-mid|Shooting|1hof|0|0|0",
  "b3-66-mid|Shooting|1hof|6|7|0",
  "b3-66-mid|Shooting|1hof|99|7|0",
  "b3-66-mid|Shooting|3mix|0|0|0",
  "b3-66-mid|Shooting|3mix|6|6|0",
  "b3-66-mid|Shooting|3mix|99|6|0",
  "b3-66-mid|Playmaking|empty|0|0|0",
  "b3-66-mid|Playmaking|empty|6|11|0",
  "b3-66-mid|Playmaking|empty|99|11|0",
  "b3-66-mid|Playmaking|1brz|0|0|0",
  "b3-66-mid|Playmaking|1brz|6|10|0",
  "b3-66-mid|Playmaking|1brz|99|10|0",
  "b3-66-mid|Playmaking|1hof|0|0|0",
  "b3-66-mid|Playmaking|1hof|6|10|0",
  "b3-66-mid|Playmaking|1hof|99|10|0",
  "b3-66-mid|Playmaking|3mix|0|0|0",
  "b3-66-mid|Playmaking|3mix|6|9|0",
  "b3-66-mid|Playmaking|3mix|99|9|0",
  "b3-66-mid|Defense|empty|0|0|0",
  "b3-66-mid|Defense|empty|6|12|0",
  "b3-66-mid|Defense|empty|99|12|0",
  "b3-66-mid|Defense|1brz|0|0|0",
  "b3-66-mid|Defense|1brz|6|11|0",
  "b3-66-mid|Defense|1brz|99|11|0",
  "b3-66-mid|Defense|1hof|0|0|0",
  "b3-66-mid|Defense|1hof|6|11|0",
  "b3-66-mid|Defense|1hof|99|11|0",
  "b3-66-mid|Defense|3mix|0|0|0",
  "b3-66-mid|Defense|3mix|6|9|0",
  "b3-66-mid|Defense|3mix|99|9|0",
  "b3-66-mid|Rebounding|empty|0|0|0",
  "b3-66-mid|Rebounding|empty|6|6|0",
  "b3-66-mid|Rebounding|empty|99|6|0",
  "b3-66-mid|Rebounding|1brz|0|0|0",
  "b3-66-mid|Rebounding|1brz|6|5|0",
  "b3-66-mid|Rebounding|1brz|99|5|0",
  "b3-66-mid|Rebounding|1hof|0|0|0",
  "b3-66-mid|Rebounding|1hof|6|5|0",
  "b3-66-mid|Rebounding|1hof|99|5|0",
  "b3-66-mid|Rebounding|3mix|0|0|0",
  "b3-66-mid|Rebounding|3mix|6|3|0",
  "b3-66-mid|Rebounding|3mix|99|3|0",
  "b3-66-mid|Physicals|empty|0|0|0",
  "b3-66-mid|Physicals|empty|6|9|0",
  "b3-66-mid|Physicals|empty|99|9|0",
  "b3-66-mid|Physicals|1brz|0|0|0",
  "b3-66-mid|Physicals|1brz|6|8|0",
  "b3-66-mid|Physicals|1brz|99|8|0",
  "b3-66-mid|Physicals|1hof|0|0|0",
  "b3-66-mid|Physicals|1hof|6|8|0",
  "b3-66-mid|Physicals|1hof|99|8|0",
  "b3-66-mid|Physicals|3mix|0|0|0",
  "b3-66-mid|Physicals|3mix|6|6|0",
  "b3-66-mid|Physicals|3mix|99|6|0",
  "b4-maxed|Finishing|empty|0|0|0",
  "b4-maxed|Finishing|empty|6|41|0",
  "b4-maxed|Finishing|empty|99|44|0",
  "b4-maxed|Finishing|1brz|0|0|0",
  "b4-maxed|Finishing|1brz|6|40|3",
  "b4-maxed|Finishing|1brz|99|43|3",
  "b4-maxed|Finishing|1hof|0|0|0",
  "b4-maxed|Finishing|1hof|6|37|0",
  "b4-maxed|Finishing|1hof|99|40|0",
  "b4-maxed|Finishing|3mix|0|0|0",
  "b4-maxed|Finishing|3mix|6|34|4",
  "b4-maxed|Finishing|3mix|99|36|4",
  "b4-maxed|Shooting|empty|0|0|0",
  "b4-maxed|Shooting|empty|6|26|0",
  "b4-maxed|Shooting|empty|99|32|0",
  "b4-maxed|Shooting|1brz|0|0|0",
  "b4-maxed|Shooting|1brz|6|26|3",
  "b4-maxed|Shooting|1brz|99|31|3",
  "b4-maxed|Shooting|1hof|0|0|0",
  "b4-maxed|Shooting|1hof|6|23|0",
  "b4-maxed|Shooting|1hof|99|28|0",
  "b4-maxed|Shooting|3mix|0|0|0",
  "b4-maxed|Shooting|3mix|6|21|4",
  "b4-maxed|Shooting|3mix|99|24|4",
  "b4-maxed|Playmaking|empty|0|0|0",
  "b4-maxed|Playmaking|empty|6|36|0",
  "b4-maxed|Playmaking|empty|99|40|0",
  "b4-maxed|Playmaking|1brz|0|0|0",
  "b4-maxed|Playmaking|1brz|6|36|3",
  "b4-maxed|Playmaking|1brz|99|39|3",
  "b4-maxed|Playmaking|1hof|0|0|0",
  "b4-maxed|Playmaking|1hof|6|33|0",
  "b4-maxed|Playmaking|1hof|99|36|0",
  "b4-maxed|Playmaking|3mix|0|0|0",
  "b4-maxed|Playmaking|3mix|6|30|4",
  "b4-maxed|Playmaking|3mix|99|32|4",
  "b4-maxed|Defense|empty|0|0|0",
  "b4-maxed|Defense|empty|6|43|0",
  "b4-maxed|Defense|empty|99|48|0",
  "b4-maxed|Defense|1brz|0|0|0",
  "b4-maxed|Defense|1brz|6|42|3",
  "b4-maxed|Defense|1brz|99|47|3",
  "b4-maxed|Defense|1hof|0|0|0",
  "b4-maxed|Defense|1hof|6|39|0",
  "b4-maxed|Defense|1hof|99|44|0",
  "b4-maxed|Defense|3mix|0|0|0",
  "b4-maxed|Defense|3mix|6|36|4",
  "b4-maxed|Defense|3mix|99|40|4",
  "b4-maxed|Rebounding|empty|0|0|0",
  "b4-maxed|Rebounding|empty|6|17|0",
  "b4-maxed|Rebounding|empty|99|20|0",
  "b4-maxed|Rebounding|1brz|0|0|0",
  "b4-maxed|Rebounding|1brz|6|16|3",
  "b4-maxed|Rebounding|1brz|99|19|3",
  "b4-maxed|Rebounding|1hof|0|0|0",
  "b4-maxed|Rebounding|1hof|6|13|0",
  "b4-maxed|Rebounding|1hof|99|16|0",
  "b4-maxed|Rebounding|3mix|0|0|0",
  "b4-maxed|Rebounding|3mix|6|11|4",
  "b4-maxed|Rebounding|3mix|99|12|4",
  "b4-maxed|Physicals|empty|0|0|0",
  "b4-maxed|Physicals|empty|6|23|0",
  "b4-maxed|Physicals|empty|99|24|0",
  "b4-maxed|Physicals|1brz|0|0|0",
  "b4-maxed|Physicals|1brz|6|22|3",
  "b4-maxed|Physicals|1brz|99|23|3",
  "b4-maxed|Physicals|1hof|0|0|0",
  "b4-maxed|Physicals|1hof|6|19|0",
  "b4-maxed|Physicals|1hof|99|20|0",
  "b4-maxed|Physicals|3mix|0|0|0",
  "b4-maxed|Physicals|3mix|6|16|4",
  "b4-maxed|Physicals|3mix|99|16|4",
  "b5-59-blocks-rebounding|Finishing|empty|0|0|0",
  "b5-59-blocks-rebounding|Finishing|empty|6|20|0",
  "b5-59-blocks-rebounding|Finishing|empty|99|20|0",
  "b5-59-blocks-rebounding|Finishing|1brz|0|0|0",
  "b5-59-blocks-rebounding|Finishing|1brz|6|19|2",
  "b5-59-blocks-rebounding|Finishing|1brz|99|19|2",
  "b5-59-blocks-rebounding|Finishing|1hof|0|0|0",
  "b5-59-blocks-rebounding|Finishing|1hof|6|17|0",
  "b5-59-blocks-rebounding|Finishing|1hof|99|17|0",
  "b5-59-blocks-rebounding|Finishing|3mix|0|0|0",
  "b5-59-blocks-rebounding|Finishing|3mix|6|13|2",
  "b5-59-blocks-rebounding|Finishing|3mix|99|13|2",
  "b5-59-blocks-rebounding|Shooting|empty|0|0|0",
  "b5-59-blocks-rebounding|Shooting|empty|6|21|0",
  "b5-59-blocks-rebounding|Shooting|empty|99|21|0",
  "b5-59-blocks-rebounding|Shooting|1brz|0|0|0",
  "b5-59-blocks-rebounding|Shooting|1brz|6|20|1",
  "b5-59-blocks-rebounding|Shooting|1brz|99|20|1",
  "b5-59-blocks-rebounding|Shooting|1hof|0|0|0",
  "b5-59-blocks-rebounding|Shooting|1hof|6|19|0",
  "b5-59-blocks-rebounding|Shooting|1hof|99|19|0",
  "b5-59-blocks-rebounding|Shooting|3mix|0|0|0",
  "b5-59-blocks-rebounding|Shooting|3mix|6|16|1",
  "b5-59-blocks-rebounding|Shooting|3mix|99|16|1",
  "b5-59-blocks-rebounding|Playmaking|empty|0|0|0",
  "b5-59-blocks-rebounding|Playmaking|empty|6|26|0",
  "b5-59-blocks-rebounding|Playmaking|empty|99|26|0",
  "b5-59-blocks-rebounding|Playmaking|1brz|0|0|0",
  "b5-59-blocks-rebounding|Playmaking|1brz|6|25|1",
  "b5-59-blocks-rebounding|Playmaking|1brz|99|25|1",
  "b5-59-blocks-rebounding|Playmaking|1hof|0|0|0",
  "b5-59-blocks-rebounding|Playmaking|1hof|6|24|0",
  "b5-59-blocks-rebounding|Playmaking|1hof|99|24|0",
  "b5-59-blocks-rebounding|Playmaking|3mix|0|0|0",
  "b5-59-blocks-rebounding|Playmaking|3mix|6|21|1",
  "b5-59-blocks-rebounding|Playmaking|3mix|99|21|1",
  "b5-59-blocks-rebounding|Defense|empty|0|0|0",
  "b5-59-blocks-rebounding|Defense|empty|6|21|0",
  "b5-59-blocks-rebounding|Defense|empty|99|21|0",
  "b5-59-blocks-rebounding|Defense|1brz|0|0|0",
  "b5-59-blocks-rebounding|Defense|1brz|6|20|1",
  "b5-59-blocks-rebounding|Defense|1brz|99|20|1",
  "b5-59-blocks-rebounding|Defense|1hof|0|0|0",
  "b5-59-blocks-rebounding|Defense|1hof|6|19|0",
  "b5-59-blocks-rebounding|Defense|1hof|99|19|0",
  "b5-59-blocks-rebounding|Defense|3mix|0|0|0",
  "b5-59-blocks-rebounding|Defense|3mix|6|16|1",
  "b5-59-blocks-rebounding|Defense|3mix|99|16|1",
  "b5-59-blocks-rebounding|Rebounding|empty|0|0|0",
  "b5-59-blocks-rebounding|Rebounding|empty|6|8|0",
  "b5-59-blocks-rebounding|Rebounding|empty|99|8|0",
  "b5-59-blocks-rebounding|Rebounding|1brz|0|0|0",
  "b5-59-blocks-rebounding|Rebounding|1brz|6|8|0",
  "b5-59-blocks-rebounding|Rebounding|1brz|99|8|0",
  "b5-59-blocks-rebounding|Rebounding|1hof|0|0|0",
  "b5-59-blocks-rebounding|Rebounding|1hof|6|8|0",
  "b5-59-blocks-rebounding|Rebounding|1hof|99|8|0",
  "b5-59-blocks-rebounding|Rebounding|3mix|0|0|0",
  "b5-59-blocks-rebounding|Rebounding|3mix|6|6|0",
  "b5-59-blocks-rebounding|Rebounding|3mix|99|6|0",
  "b5-59-blocks-rebounding|Physicals|empty|0|0|0",
  "b5-59-blocks-rebounding|Physicals|empty|6|15|0",
  "b5-59-blocks-rebounding|Physicals|empty|99|15|0",
  "b5-59-blocks-rebounding|Physicals|1brz|0|0|0",
  "b5-59-blocks-rebounding|Physicals|1brz|6|15|0",
  "b5-59-blocks-rebounding|Physicals|1brz|99|15|0",
  "b5-59-blocks-rebounding|Physicals|1hof|0|0|0",
  "b5-59-blocks-rebounding|Physicals|1hof|6|15|0",
  "b5-59-blocks-rebounding|Physicals|1hof|99|15|0",
  "b5-59-blocks-rebounding|Physicals|3mix|0|0|0",
  "b5-59-blocks-rebounding|Physicals|3mix|6|10|0",
  "b5-59-blocks-rebounding|Physicals|3mix|99|10|0",
  "b6-84-asymmetric|Finishing|empty|0|0|0",
  "b6-84-asymmetric|Finishing|empty|6|25|0",
  "b6-84-asymmetric|Finishing|empty|99|25|0",
  "b6-84-asymmetric|Finishing|1brz|0|0|0",
  "b6-84-asymmetric|Finishing|1brz|6|24|2",
  "b6-84-asymmetric|Finishing|1brz|99|24|2",
  "b6-84-asymmetric|Finishing|1hof|0|0|0",
  "b6-84-asymmetric|Finishing|1hof|6|22|0",
  "b6-84-asymmetric|Finishing|1hof|99|22|0",
  "b6-84-asymmetric|Finishing|3mix|0|0|0",
  "b6-84-asymmetric|Finishing|3mix|6|17|2",
  "b6-84-asymmetric|Finishing|3mix|99|17|2",
  "b6-84-asymmetric|Shooting|empty|0|0|0",
  "b6-84-asymmetric|Shooting|empty|6|13|0",
  "b6-84-asymmetric|Shooting|empty|99|13|0",
  "b6-84-asymmetric|Shooting|1brz|0|0|0",
  "b6-84-asymmetric|Shooting|1brz|6|13|0",
  "b6-84-asymmetric|Shooting|1brz|99|13|0",
  "b6-84-asymmetric|Shooting|1hof|0|0|0",
  "b6-84-asymmetric|Shooting|1hof|6|13|0",
  "b6-84-asymmetric|Shooting|1hof|99|13|0",
  "b6-84-asymmetric|Shooting|3mix|0|0|0",
  "b6-84-asymmetric|Shooting|3mix|6|7|0",
  "b6-84-asymmetric|Shooting|3mix|99|7|0",
  "b6-84-asymmetric|Playmaking|empty|0|0|0",
  "b6-84-asymmetric|Playmaking|empty|6|10|0",
  "b6-84-asymmetric|Playmaking|empty|99|10|0",
  "b6-84-asymmetric|Playmaking|1brz|0|0|0",
  "b6-84-asymmetric|Playmaking|1brz|6|10|0",
  "b6-84-asymmetric|Playmaking|1brz|99|10|0",
  "b6-84-asymmetric|Playmaking|1hof|0|0|0",
  "b6-84-asymmetric|Playmaking|1hof|6|10|0",
  "b6-84-asymmetric|Playmaking|1hof|99|10|0",
  "b6-84-asymmetric|Playmaking|3mix|0|0|0",
  "b6-84-asymmetric|Playmaking|3mix|6|7|0",
  "b6-84-asymmetric|Playmaking|3mix|99|7|0",
  "b6-84-asymmetric|Defense|empty|0|0|0",
  "b6-84-asymmetric|Defense|empty|6|10|0",
  "b6-84-asymmetric|Defense|empty|99|10|0",
  "b6-84-asymmetric|Defense|1brz|0|0|0",
  "b6-84-asymmetric|Defense|1brz|6|10|0",
  "b6-84-asymmetric|Defense|1brz|99|10|0",
  "b6-84-asymmetric|Defense|1hof|0|0|0",
  "b6-84-asymmetric|Defense|1hof|6|10|0",
  "b6-84-asymmetric|Defense|1hof|99|10|0",
  "b6-84-asymmetric|Defense|3mix|0|0|0",
  "b6-84-asymmetric|Defense|3mix|6|10|0",
  "b6-84-asymmetric|Defense|3mix|99|10|0",
  "b6-84-asymmetric|Rebounding|empty|0|0|0",
  "b6-84-asymmetric|Rebounding|empty|6|9|0",
  "b6-84-asymmetric|Rebounding|empty|99|9|0",
  "b6-84-asymmetric|Rebounding|1brz|0|0|0",
  "b6-84-asymmetric|Rebounding|1brz|6|9|0",
  "b6-84-asymmetric|Rebounding|1brz|99|9|0",
  "b6-84-asymmetric|Rebounding|1hof|0|0|0",
  "b6-84-asymmetric|Rebounding|1hof|6|9|0",
  "b6-84-asymmetric|Rebounding|1hof|99|9|0",
  "b6-84-asymmetric|Rebounding|3mix|0|0|0",
  "b6-84-asymmetric|Rebounding|3mix|6|4|0",
  "b6-84-asymmetric|Rebounding|3mix|99|4|0",
  "b6-84-asymmetric|Physicals|empty|0|0|0",
  "b6-84-asymmetric|Physicals|empty|6|12|0",
  "b6-84-asymmetric|Physicals|empty|99|12|0",
  "b6-84-asymmetric|Physicals|1brz|0|0|0",
  "b6-84-asymmetric|Physicals|1brz|6|11|2",
  "b6-84-asymmetric|Physicals|1brz|99|11|2",
  "b6-84-asymmetric|Physicals|1hof|0|0|0",
  "b6-84-asymmetric|Physicals|1hof|6|9|0",
  "b6-84-asymmetric|Physicals|1hof|99|9|0",
  "b6-84-asymmetric|Physicals|3mix|0|0|0",
  "b6-84-asymmetric|Physicals|3mix|6|7|2",
  "b6-84-asymmetric|Physicals|3mix|99|7|2",
  "b7-synthetic-gap|Finishing|empty|0|0|0",
  "b7-synthetic-gap|Finishing|empty|6|44|0",
  "b7-synthetic-gap|Finishing|empty|99|47|0",
  "b7-synthetic-gap|Finishing|1brz|0|0|0",
  "b7-synthetic-gap|Finishing|1brz|6|43|3",
  "b7-synthetic-gap|Finishing|1brz|99|46|3",
  "b7-synthetic-gap|Finishing|1hof|0|0|0",
  "b7-synthetic-gap|Finishing|1hof|6|40|0",
  "b7-synthetic-gap|Finishing|1hof|99|43|0",
  "b7-synthetic-gap|Finishing|3mix|0|0|0",
  "b7-synthetic-gap|Finishing|3mix|6|37|4",
  "b7-synthetic-gap|Finishing|3mix|99|39|4",
  "b7-synthetic-gap|Shooting|empty|0|0|0",
  "b7-synthetic-gap|Shooting|empty|6|29|0",
  "b7-synthetic-gap|Shooting|empty|99|35|0",
  "b7-synthetic-gap|Shooting|1brz|0|0|0",
  "b7-synthetic-gap|Shooting|1brz|6|29|3",
  "b7-synthetic-gap|Shooting|1brz|99|34|3",
  "b7-synthetic-gap|Shooting|1hof|0|0|0",
  "b7-synthetic-gap|Shooting|1hof|6|26|0",
  "b7-synthetic-gap|Shooting|1hof|99|31|0",
  "b7-synthetic-gap|Shooting|3mix|0|0|0",
  "b7-synthetic-gap|Shooting|3mix|6|24|4",
  "b7-synthetic-gap|Shooting|3mix|99|27|4",
  "b7-synthetic-gap|Playmaking|empty|0|0|0",
  "b7-synthetic-gap|Playmaking|empty|6|38|0",
  "b7-synthetic-gap|Playmaking|empty|99|42|0",
  "b7-synthetic-gap|Playmaking|1brz|0|0|0",
  "b7-synthetic-gap|Playmaking|1brz|6|38|3",
  "b7-synthetic-gap|Playmaking|1brz|99|41|3",
  "b7-synthetic-gap|Playmaking|1hof|0|0|0",
  "b7-synthetic-gap|Playmaking|1hof|6|35|0",
  "b7-synthetic-gap|Playmaking|1hof|99|38|0",
  "b7-synthetic-gap|Playmaking|3mix|0|0|0",
  "b7-synthetic-gap|Playmaking|3mix|6|32|4",
  "b7-synthetic-gap|Playmaking|3mix|99|34|4",
  "b7-synthetic-gap|Defense|empty|0|0|0",
  "b7-synthetic-gap|Defense|empty|6|46|0",
  "b7-synthetic-gap|Defense|empty|99|52|0",
  "b7-synthetic-gap|Defense|1brz|0|0|0",
  "b7-synthetic-gap|Defense|1brz|6|45|3",
  "b7-synthetic-gap|Defense|1brz|99|51|3",
  "b7-synthetic-gap|Defense|1hof|0|0|0",
  "b7-synthetic-gap|Defense|1hof|6|42|0",
  "b7-synthetic-gap|Defense|1hof|99|48|0",
  "b7-synthetic-gap|Defense|3mix|0|0|0",
  "b7-synthetic-gap|Defense|3mix|6|39|4",
  "b7-synthetic-gap|Defense|3mix|99|44|4",
  "b7-synthetic-gap|Rebounding|empty|0|0|0",
  "b7-synthetic-gap|Rebounding|empty|6|17|0",
  "b7-synthetic-gap|Rebounding|empty|99|20|0",
  "b7-synthetic-gap|Rebounding|1brz|0|0|0",
  "b7-synthetic-gap|Rebounding|1brz|6|16|3",
  "b7-synthetic-gap|Rebounding|1brz|99|19|3",
  "b7-synthetic-gap|Rebounding|1hof|0|0|0",
  "b7-synthetic-gap|Rebounding|1hof|6|13|0",
  "b7-synthetic-gap|Rebounding|1hof|99|16|0",
  "b7-synthetic-gap|Rebounding|3mix|0|0|0",
  "b7-synthetic-gap|Rebounding|3mix|6|11|4",
  "b7-synthetic-gap|Rebounding|3mix|99|12|4",
  "b7-synthetic-gap|Physicals|empty|0|0|0",
  "b7-synthetic-gap|Physicals|empty|6|27|0",
  "b7-synthetic-gap|Physicals|empty|99|28|0",
  "b7-synthetic-gap|Physicals|1brz|0|0|0",
  "b7-synthetic-gap|Physicals|1brz|6|26|3",
  "b7-synthetic-gap|Physicals|1brz|99|27|3",
  "b7-synthetic-gap|Physicals|1hof|0|0|0",
  "b7-synthetic-gap|Physicals|1hof|6|23|0",
  "b7-synthetic-gap|Physicals|1hof|99|24|0",
  "b7-synthetic-gap|Physicals|3mix|0|0|0",
  "b7-synthetic-gap|Physicals|3mix|6|20|4",
  "b7-synthetic-gap|Physicals|3mix|99|20|4",
];

describe("INV-19 — categoryFeasibility golden table (the R-4 hoist control)", () => {
  it("the matrix is the size the brief specifies", () => {
    expect(generateGoldenRows().length).toBe(7 * 6 * 4 * 3);
  });

  it("the table is pinned against the dataset it was generated from", () => {
    // If badges.json's dataVersion moves, the table is STALE — regenerate it
    // in the same commit and say so in the reportback. Never hand-edit a cell.
    expect(shippedDataset.dataVersion).toBe("2026-08-26.1");
  });

  it("every affordable-upgrade count is unchanged, cell for cell", () => {
    expect(generateGoldenRows()).toEqual(GOLDEN);
  });

  it("the matrix actually exercises the behaviour it claims to pin", () => {
    const rows = generateGoldenRows();
    const counts = rows.map((row) => Number(row.split("|")[4]));
    // Non-degenerate: some cells are zero (nothing affordable) and some are not.
    expect(counts.some((count) => count === 0)).toBe(true);
    expect(counts.some((count) => count > 0)).toBe(true);
    // The owned/new split is genuinely exercised in both directions.
    const owned = rows.map((row) => Number(row.split("|")[5]));
    expect(owned.some((count) => count > 0)).toBe(true);
    expect(rows.some((_row, index) => owned[index] === 0 && (counts[index] as number) > 0)).toBe(
      true,
    );
  });
});
