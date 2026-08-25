/**
 * The build-summary SELECTORS (engine-design §8.2). Pure projections over
 * COMMITTED state — no new rules, no arithmetic that is not already the
 * ledger's, no prose.
 *
 * H2 IS ENFORCED BY THE SIGNATURE, not by discipline. `buildSummary` takes no
 * `OverlayState` and never will — the same structural control as
 * `categoryLedgerAt`, whose `LedgerBasis` parameter is deliberately a
 * DIFFERENT TYPE from `OverlayState`. The single most likely way this feature
 * reddens the H2 ship gate is a roster row rendering an overlay-dependent
 * effective level into a cost or spend column, so the overlay-dependent values
 * live in a SEPARATE, explicitly-named selector (`synergyProjections`) with a
 * field literally called `activatesTo`. Making that mistake now requires an
 * extra, visible import.
 *
 * Everything here is REUSED, never re-derived: `categoryLedgerAt` for the
 * numbers, `effectiveLevel` under `defaultOverlay` for committed levels,
 * `entryIsStale` for staleness, `synergyRoleFor` for roles,
 * `badgeSlotsCapacityUnset` for the 0 = unset ruling, `validateLoadout` for
 * the violation set.
 *
 * H8 — DISCLOSE, NEVER REPAIR. A stale entry is reported as stale and left
 * exactly where it is. Nothing in this file removes, clamps or fixes anything.
 */

import { appliedEquipSlotsTotal, baseEquipSlotsOf, zeroBonus } from "./budget";
import { costForLevel } from "./cost";
import { badgeById, shippedDataset } from "./dataset";
import { entryIsStale, maxPurchasableLevel, reasonsForLevel, validateBadge } from "./eligibility";
import { UnknownBadgeError } from "./errors";
import { badgeSlotsCapacityUnset } from "./ledger";
import { defaultOverlay, effectiveLevel, synergyRoleFor } from "./synergy";
import { categoryLedgerAt } from "./synergy-ledger";
import type { CategoryLedgerReadout, SynergyLedgerState } from "./synergy-ledger";
import { validateLoadout } from "./validate-loadout";
import type { LoadoutValidation } from "./validate-loadout";
import type {
  Badge,
  BadgeDataset,
  BonusBudget,
  Build,
  LoadoutEntry,
  SynergyRole,
  SynergySlotId,
} from "./types";
import type { Category, Level, PurchasableLevel, Tier } from "./vocabulary";
import { CATEGORIES, LEVELS, levelIndex } from "./vocabulary";

/**
 * scope.md §0.1 A3: the six per-category Badge Slots capacities are known to
 * sum to 20 by default. This is a DISCLOSURE, never a constraint — nothing
 * anywhere blocks, clamps or warns on a different total.
 */
export const EQUIP_SLOTS_BASELINE = 20;

// ---------------------------------------------------------------------------
// Shapes.
// ---------------------------------------------------------------------------

export interface RosterRow {
  badgeId: string;
  name: string;
  category: Category;
  tier: Tier;
  purchasedLevel: PurchasableLevel;
  /** Total-to-own cost at the purchased level, "current" basis.
   *  H2: this value CANNOT move under any overlay. */
  cost: number;
  /** Does this entry's refund trigger currently fire? READ FROM THE LEDGER via
   *  a one-entry probe — the trigger predicate has exactly one definition. */
  refunded: boolean;
  synergyRole: SynergyRole | null;
  /** purchased + COMMITTED fuse boost under the NEUTRAL overlay — exactly the
   *  call the shipped counts table already makes. The only field that may
   *  differ from purchasedLevel, and only via a committed boost. */
  committedEffectiveLevel: Level;
  stale: boolean;
  /** For the stale row's copy. */
  maxPurchasableLevel: PurchasableLevel | null;
  /**
   * Why the purchased level no longer passes, in §3.4's shared phrasing.
   * Empty unless `stale`.
   *
   * NOT IN THE BRIEF'S `RosterRow` SHAPE — added because §14.5's text block
   * must emit `!! no longer qualifies: needs 90 Close or 93 Layup` and
   * `formatSummaryText(summary)` has no other input to read it from. Reported
   * as a shape deviation rather than smuggled.
   */
  staleReasons: string[];
}

export interface CategorySummary {
  category: Category;
  /** DATASET ORDER (design-spec §14.1 item 8). */
  rows: RosterRow[];
  readout: CategoryLedgerReadout;
  equipSlotCapacity: number;
  badgeSlotsCapacityUnset: boolean;
  /** 0 when within budget. */
  pointsOverBy: number;
  /** 0 when within capacity OR capacity unset (§4.7). */
  equipSlotsOverBy: number;
}

export interface BuildSummary {
  categories: CategorySummary[];
  /** Hoisted VERBATIM from SummaryPanel's inline computation. */
  countsByLevel: Record<Level, number>;
  totalSpent: number;
  totalPool: number;
  /** Σ of the six ENTERED capacities. [A5] EFFECTIVE — base + applied bonus,
   *  because `state.budgets` arrives already composed. */
  totalEquipSlots: number;
  /**
   * [A5] Σ of the six BASE capacities — the "20 a build starts with" spread,
   * with the bonus layer taken back out. Recovered exactly via
   * `baseEquipSlotsOf` (the carve-out is absorbing at zero, so effective 0 ⇒
   * base 0). Equals `totalEquipSlots` whenever no bonus is applied, and
   * whenever `state.bonus` is absent.
   *
   * THIS, not `totalEquipSlots`, is what `badgeSlotsBaselineText` compares
   * against the baseline: the user's clarification settles the frame — "we
   * don't need to include the bonus into the original 20", so the Σ-vs-20
   * comparison continues to describe the BASE only (A5-R3).
   */
  totalBaseEquipSlots: number;
  equipSlotsBaseline: typeof EQUIP_SLOTS_BASELINE;
  /** false while ANY category is unset — §4.7's "0 suppresses comparisons".
   *  The consumer must render NOTHING (absent from the DOM), not a greyed row. */
  equipSlotsBaselineComparable: boolean;
  /** How many of the six carry an unset capacity — the `N of 6` footnote. */
  categoriesWithoutCapacity: number;
  /**
   * [A5] The build's bonus layer, carried so the ONE phrasing of the Σ-vs-20
   * fact (`badgeSlotsBaselineText`) can name it without a second parameter —
   * AJ-5's one-function-two-surfaces rule, preserved.
   *
   * `zeroBonus()` when the caller's `SynergyLedgerState.bonus` is absent, so
   * every pre-A5 caller sees exactly the pre-A5 output.
   */
  bonus: BonusBudget;
  dataVersion: string;
  validation: LoadoutValidation;
  /** The build the summary was taken over. Carried so the pure text builder
   *  can render the height/position header line from one input. */
  build: Build;
}

export interface SynergySummaryRow {
  synergySlotId: SynergySlotId;
  unlocked: boolean;
  permanence: "temporary" | "permanent";
  magnitude: 1 | 2;
  fuse: SynergyProjectionTarget | null;
  reaction: (SynergyProjectionTarget & { activatesTo: Level }) | null;
  /** The `— frees N pts to {Category}` figure, READ FROM THE LEDGER, never
   *  computed here. 0 ⇒ the annotation is not rendered. */
  freesPointsToCategory: number;
}

export interface SynergyProjectionTarget {
  badgeId: string;
  name: string;
  purchasedLevel: PurchasableLevel;
  committedEffectiveLevel: Level;
}

// ---------------------------------------------------------------------------
// Internals — every one of them a call into a shipped engine module.
// ---------------------------------------------------------------------------

function requireBadge(dataset: BadgeDataset, badgeId: string): Badge {
  const badge = badgeById(dataset, badgeId);
  if (badge === undefined) throw new UnknownBadgeError(badgeId);
  return badge;
}

/**
 * The one-entry ledger probe. `refundTriggered` lives in `ledger.ts` and is
 * not exported; rather than copy the predicate (the drift this whole slice
 * exists to prevent), we ask the shipped ledger about a state containing only
 * this entry. `synergySlots` and `refundTrigger` carry through, so a fuse role
 * on this badge is seen exactly as the real ledger sees it.
 */
function probeEntry(
  state: SynergyLedgerState,
  badge: Badge,
  purchasedLevel: PurchasableLevel,
  dataset: BadgeDataset,
): CategoryLedgerReadout {
  return categoryLedgerAt(
    {
      loadout: [{ badgeId: badge.id, purchasedLevel }],
      budgets: state.budgets,
      synergySlots: state.synergySlots,
      refundTrigger: state.refundTrigger,
    },
    "current",
    badge.category,
    dataset,
  );
}

function committedLevelOf(
  state: SynergyLedgerState,
  entry: LoadoutEntry,
): Level {
  return (
    effectiveLevel(
      { loadout: state.loadout, synergySlots: state.synergySlots },
      entry.badgeId,
      defaultOverlay,
    ) ?? entry.purchasedLevel
  );
}

function rosterRow(
  state: SynergyLedgerState,
  build: Build,
  badge: Badge,
  entry: LoadoutEntry,
  dataset: BadgeDataset,
): RosterRow {
  const stale = entryIsStale(badge, build, entry.purchasedLevel);
  const eligibility = validateBadge(badge, build);
  return {
    badgeId: badge.id,
    name: badge.name,
    category: badge.category,
    tier: badge.tier,
    purchasedLevel: entry.purchasedLevel,
    cost: costForLevel(badge.tier, entry.purchasedLevel, dataset),
    refunded: probeEntry(state, badge, entry.purchasedLevel, dataset).refunded > 0,
    synergyRole: synergyRoleFor(state.synergySlots, badge.id),
    committedEffectiveLevel: committedLevelOf(state, entry),
    stale,
    maxPurchasableLevel: maxPurchasableLevel(badge, build),
    // A height failure blocks the badge outright, so the height sentence IS
    // the reason; otherwise the purchased level's own failing lines are.
    staleReasons: !stale
      ? []
      : eligibility.allowed
        ? reasonsForLevel(badge.requirements, build, entry.purchasedLevel)
        : [...eligibility.reasons],
  };
}

// ---------------------------------------------------------------------------
// The selectors.
// ---------------------------------------------------------------------------

/**
 * NOTE THE SIGNATURE: there is no `OverlayState` parameter and there never
 * will be. Same structural H2 control as `categoryLedgerAt`.
 */
export function buildSummary(
  state: SynergyLedgerState,
  build: Build,
  dataset: BadgeDataset = shippedDataset,
): BuildSummary {
  const categories: CategorySummary[] = CATEGORIES.map((category) => {
    const readout = categoryLedgerAt(state, "current", category, dataset);
    const budget = state.budgets[category];
    const capacityUnset = badgeSlotsCapacityUnset(budget);
    // DATASET ORDER, and only purchased badges.
    const rows = dataset.badges
      .filter((badge) => badge.category === category)
      .flatMap((badge) => {
        const entry = state.loadout.find((candidate) => candidate.badgeId === badge.id);
        return entry === undefined ? [] : [rosterRow(state, build, badge, entry, dataset)];
      });
    return {
      category,
      rows,
      readout,
      equipSlotCapacity: budget.equipSlots,
      badgeSlotsCapacityUnset: capacityUnset,
      pointsOverBy: readout.remainingPoints < 0 ? -readout.remainingPoints : 0,
      // §4.7: an unset capacity constrains nothing, so it can never be "over".
      equipSlotsOverBy:
        capacityUnset || readout.equipSlotsUsed <= budget.equipSlots
          ? 0
          : readout.equipSlotsUsed - budget.equipSlots,
    };
  });

  // Hoisted VERBATIM from SummaryPanel.tsx's inline computation — same call,
  // same neutral overlay, same result. E1 does NOT delete the inline version;
  // tests/summary.test.ts pins old ≡ new so S2 can delete it safely.
  const countsByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<
    Level,
    number
  >;
  for (const entry of state.loadout) {
    const effective = effectiveLevel(
      { loadout: state.loadout, synergySlots: state.synergySlots },
      entry.badgeId,
      defaultOverlay,
    );
    if (effective !== null) countsByLevel[effective] += 1;
  }

  // Loud guard, matching validateLoadout's: an unknown id never passes silently.
  for (const entry of state.loadout) requireBadge(dataset, entry.badgeId);

  const categoriesWithoutCapacity = categories.filter(
    (summary) => summary.badgeSlotsCapacityUnset,
  ).length;

  return {
    categories,
    countsByLevel,
    totalSpent: categories.reduce((sum, summary) => sum + summary.readout.spent, 0),
    totalPool: CATEGORIES.reduce((sum, category) => sum + state.budgets[category].points, 0),
    totalEquipSlots: CATEGORIES.reduce(
      (sum, category) => sum + state.budgets[category].equipSlots,
      0,
    ),
    // [A5] `state.budgets` is the COMPOSED record, so the base Σ is recovered
    // by subtracting the applied allocation back out — through the inverse in
    // src/engine/budget.ts, never re-derived here, so the two cannot drift.
    // `state.bonus` absent ⇒ nothing was applied ⇒ base Σ === effective Σ.
    totalBaseEquipSlots: CATEGORIES.reduce(
      (sum, category) =>
        sum +
        baseEquipSlotsOf(
          state.budgets[category].equipSlots,
          state.bonus?.appliedEquipSlots[category] ?? 0,
        ),
      0,
    ),
    equipSlotsBaseline: EQUIP_SLOTS_BASELINE,
    equipSlotsBaselineComparable: categoriesWithoutCapacity === 0,
    categoriesWithoutCapacity,
    bonus: state.bonus ?? zeroBonus(),
    dataVersion: dataset.dataVersion,
    validation: validateLoadout(state, dataset),
    build,
  };
}

/**
 * The LABELLED projections, in a separate selector the roster does not
 * consume. `activatesTo` is overlay-DEPENDENT by design and is named so it
 * cannot be mistaken for a committed value.
 */
export function synergyProjections(
  state: SynergyLedgerState,
  dataset: BadgeDataset = shippedDataset,
): SynergySummaryRow[] {
  const targetFor = (badgeId: string | null): SynergyProjectionTarget | null => {
    if (badgeId === null) return null;
    const entry = state.loadout.find((candidate) => candidate.badgeId === badgeId);
    if (entry === undefined) return null; // a stranded reference discloses as a HARD violation
    const badge = requireBadge(dataset, badgeId);
    return {
      badgeId,
      name: badge.name,
      purchasedLevel: entry.purchasedLevel,
      committedEffectiveLevel: committedLevelOf(state, entry),
    };
  };

  return state.synergySlots.map((synergySlot) => {
    const fuse = targetFor(synergySlot.fuseBadgeId);
    const reactionBase = targetFor(synergySlot.reactionBadgeId);
    const reaction =
      reactionBase === null
        ? null
        : {
            ...reactionBase,
            activatesTo:
              effectiveLevel(
                { loadout: state.loadout, synergySlots: state.synergySlots },
                reactionBase.badgeId,
                { reactionsActive: true, seasonReset: false },
              ) ?? reactionBase.purchasedLevel,
          };
    // READ FROM THE LEDGER. Under legendByAnyMeans a fused Gold badge frees 0;
    // under onFuse it frees its full spend — and NO COPY CHANGE is needed when
    // that flips, which is the test of whether this was specified correctly.
    let freesPointsToCategory = 0;
    if (fuse !== null) {
      const badge = requireBadge(dataset, fuse.badgeId);
      freesPointsToCategory = probeEntry(state, badge, fuse.purchasedLevel, dataset).refunded;
    }
    return {
      synergySlotId: synergySlot.id,
      unlocked: synergySlot.unlocked,
      permanence: synergySlot.permanence,
      magnitude: synergySlot.magnitude,
      fuse,
      reaction,
      freesPointsToCategory,
    };
  });
}

/**
 * AJ-5 — the ONE phrasing of the A3 Σ-vs-20 fact, so the on-screen annotation
 * and the pasted text block can never drift.
 *
 * Returns null while ANY category's capacity is unset, and THE UNSET GUARD IS
 * EVALUATED FIRST: it beats a coincidental Σ = 20 (§4.7 — 0 suppresses
 * comparisons; it is never "zero capacity").
 */
export function badgeSlotsBaselineText(summary: BuildSummary): string | null {
  if (!summary.equipSlotsBaselineComparable) return null;
  // [A5] READS THE BASE Σ, NOT THE EFFECTIVE ONE. "We don't need to include
  // the bonus into the original 20" [user 2026-08-26] — the Σ-vs-20 sentence
  // describes the BASE spread, and the bonus gets its own clause rather than
  // being folded into the comparison (A5-R3). Byte-identical to the pre-A5
  // output whenever nothing is earned, which is every existing build.
  const baseline = `${summary.totalBaseEquipSlots} of the ${summary.equipSlotsBaseline} a build starts with`;
  if (summary.bonus.earnedEquipSlots === 0) return baseline;
  const applied = appliedEquipSlotsTotal(summary.bonus);
  return `${baseline} · +${applied} of ${summary.bonus.earnedEquipSlots} bonus Badge Slots applied`;
}

/** Convenience for consumers that hold a row and want the ladder position. */
export function rowIsBoosted(row: RosterRow): boolean {
  return levelIndex(row.committedEffectiveLevel) > levelIndex(row.purchasedLevel);
}
