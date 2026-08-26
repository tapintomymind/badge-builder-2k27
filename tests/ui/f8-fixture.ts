/**
 * THE F8-S2 FIXTURE — one build, in code, and every expectation computed
 * from it by the engine.
 *
 * §14.5.1 IS THE RULING THIS FILE IMPLEMENTS, and it is the sharpest
 * constraint in the slice:
 *
 *   > A hand-typed golden string in a markdown file IS a hand-transcribed
 *   > dataset — the single defect class this project has spent four
 *   > documents establishing as its most likely one (§0 change #4's
 *   > generator, H7's alias-map bijection, NB-7's "self-consistent, fully
 *   > green, systematically wrong"). Rev 8's illustrative block is the
 *   > proof: authored carefully, reviewed, and wrong FIVE ways.
 *
 * So no test in this slice holds a transcribed summary. They build this
 * state, render BOTH the panel and `formatSummaryText` from it, and compute
 * every expected substring by calling the same engine the panel calls
 * (`buildSummary`, `synergyProjections`, `validateBadge`, `costForLevel`,
 * `overByBadgePoints` / `overByBadgeSlots`). Only STRUCTURAL literals — the
 * presence of a heading, the ABSENCE of the Σ line, a tally identity — stay
 * hand-written, because those are the four a computed test cannot express.
 *
 * ONE FIXTURE, PARAMETERISED. `f8Rig()` with no arguments is the canonical
 * build; the options exist so an edge case (an unset capacity, an overspend,
 * the other refund trigger) is a VARIATION OF THE SAME STATE rather than a
 * second hand-built one that can drift from it.
 *
 * WHAT THE CANONICAL BUILD EXERCISES, and why each is here rather than in a
 * fixture of its own:
 *   - four purchases across TWO categories, so the partial-empty tail line
 *     has four categories to name;
 *   - a Fuse whose target is boosted (Posterizer), so the effective-level
 *     column has something to show and the refund arm has something to fire;
 *   - a Reaction (Rise Up), whose committed level is UNBOOSTED under the
 *     neutral overlay — the §14.6 case a careless implementation gets wrong;
 *   - a STALE purchase (Float Game at Gold), produced by lowering the gating
 *     attribute rather than by asserting staleness directly;
 *   - Playmaking with a points pool SET and its Badge Slots capacity UNSET,
 *     which is §4.7's independence ruling deliberately exercised;
 *   - an unlocked-but-unassigned Synergy Slot (7) and six locked ones.
 *
 * NOTHING HERE INVENTS 2K27 DATA. Every badge id, tier and requirement is
 * read from the shipped dataset; the fixture only chooses attributes,
 * budgets and assignments, which are the user's own inputs.
 */

import { defaultAppConfig } from "../../src/config";
import { deriveBudget } from "../../src/config";
import { effectiveBudgets } from "../../src/engine/budget";
import { shippedDataset } from "../../src/engine/dataset";
import type { SynergyLedgerState } from "../../src/engine/synergy-ledger";
import type { Budget, RefundTrigger, SavedBuild, SynergySlot } from "../../src/engine/types";
import type { Attr, Category } from "../../src/engine/vocabulary";
import { budgetsWith, makeRig } from "./m4-rig";

/** The four purchases, by dataset id. Names, tiers, categories and costs are
 *  all READ from the dataset by the engine — never restated here. */
export const F8_BADGES = {
  /** Finishing, tier A. Gold is reachable; HOF is not. Holds the Fuse. */
  fused: "posterizer",
  /** Finishing, tier C. Holds the Reaction — committed level UNBOOSTED. */
  reacting: "rise-up",
  /** Finishing, tier A. Purchased Gold, gated back to Silver → STALE. */
  stale: "float-game",
  /** Playmaking, tier C. The lone row in the capacity-unset category. */
  lone: "dimer",
} as const;

/**
 * Attributes chosen so the engine — not this file — decides what is stale:
 *   posterizer  Gold needs drivingDunk 93 AND vertical 80 → passes at 95/85
 *   rise-up     Silver needs standingDunk 81 AND vertical 62 → passes at 85/85
 *   float-game  Gold needs close 90 OR layup 93 → FAILS at 85/80 (Silver, its
 *               ceiling here, needs close 80 → passes), so a Gold purchase is
 *               stale and `validateBadge` says exactly why
 *   dimer       Bronze needs passAcc 50 → passes at 60
 */
export const F8_ATTRIBUTES: Partial<Record<Attr, number>> = {
  drivingDunk: 95,
  vertical: 85,
  standingDunk: 85,
  close: 85,
  layup: 80,
  passAcc: 60,
};

/** Finishing funds its three purchases exactly; Playmaking has a POOL but no
 *  entered capacity (§4.7: 0 means "not entered", never "zero capacity"). */
export const F8_BUDGETS: Partial<Record<Category, Budget>> = {
  Finishing: { points: 16, equipSlots: 3 },
  Playmaking: { points: 8, equipSlots: 0 },
};

export interface F8FixtureOptions {
  /** Passed EXPLICITLY, never inherited from DEFAULT_REFUND_TRIGGER — a
   *  behavioural fixture that rides the default re-bases its arithmetic on
   *  every future flip (m4-rig's own rule, followed here). */
  refundTrigger?: RefundTrigger;
  budgets?: Partial<Record<Category, Budget>>;
  loadout?: SavedBuild["loadout"];
  attributes?: Partial<Record<Attr, number>>;
  synergyPatches?: Partial<Record<number, Partial<SynergySlot>>>;
  name?: string;
}

export function f8Rig(options: F8FixtureOptions = {}): SavedBuild {
  const rig = makeRig({
    attributes: { ...F8_ATTRIBUTES, ...options.attributes },
    budgets: options.budgets ?? F8_BUDGETS,
    loadout: options.loadout ?? [
      { badgeId: F8_BADGES.fused, purchasedLevel: "gold" },
      { badgeId: F8_BADGES.reacting, purchasedLevel: "silver" },
      { badgeId: F8_BADGES.stale, purchasedLevel: "gold" },
      { badgeId: F8_BADGES.lone, purchasedLevel: "bronze" },
    ],
    synergyPatches: options.synergyPatches ?? {
      // Magnitude 1 — the shipped default for every Synergy Slot but 7.
      // A +2 here would be an UNSOURCED 2K27 claim, which is the seed's #1
      // non-negotiable being broken by a fixture.
      5: {
        unlocked: true,
        magnitude: 1,
        fuseBadgeId: F8_BADGES.fused,
        reactionBadgeId: F8_BADGES.reacting,
      },
      // Unlocked and UNASSIGNED: the `— not assigned` arm. Its +2 is 2K's
      // ratified one and arrives from the engine, not from this patch.
      7: { unlocked: true },
    },
    name: options.name ?? "F8 fixture",
  });
  return {
    ...rig,
    build: { ...rig.build, position: "SF" },
    config: {
      ...rig.config,
      refundTrigger: options.refundTrigger ?? rig.config.refundTrigger,
    },
  };
}

/**
 * The `SynergyLedgerState` the App will hold for this rig, composed through
 * the SAME two engine functions App.tsx composes it with — so a test's
 * expectations and the rendered panel are provably reading one state rather
 * than two that happen to agree.
 */
export function f8LedgerState(rig: SavedBuild): SynergyLedgerState {
  const base = deriveBudget(rig.build, rig.budgets, rig.config.budgetStrategy);
  return {
    loadout: rig.loadout,
    budgets: effectiveBudgets(base, rig.bonus),
    synergySlots: rig.synergy,
    refundTrigger: rig.config.refundTrigger,
    bonus: rig.bonus,
  };
}

/** A rig with nothing purchased — the zero state, from the same builder. */
export function f8EmptyRig(): SavedBuild {
  return f8Rig({ loadout: [], synergyPatches: {} });
}

export { budgetsWith, shippedDataset, defaultAppConfig };
