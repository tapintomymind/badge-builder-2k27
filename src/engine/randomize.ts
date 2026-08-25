/**
 * THE ROLL ENGINE -- randomized greedy over a uniformly-sampled legal-step set.
 *
 * WHAT IT IS. Per category: enumerate every legal single step, keep the ones
 * that fit the remaining points and the remaining Badge Slots, pick one
 * UNIFORMLY, apply it, repeat until the set is empty. That is the whole
 * algorithm, and it should stay this simple.
 *
 * WHY IT IS MAXIMAL, AND WHY THAT IS THE RIGHT WORD. The walk stops only when
 * NO legal affordable step remains, so the result is maximal BY CONSTRUCTION.
 * Maximal is not maximum: a different sequence of choices could sometimes fit
 * more total points. That gap is measured against a test-only exact DP oracle
 * (INV-14) and held to a p95 of 2 points, but it is a gap and it is named as
 * one. NOTHING in this file, in any comment, test name or doc string, claims
 * the roller finds an optimum -- because it does not, and because "the numbers
 * reconcile" is the acceptance bar, not "the numbers are the largest possible".
 *
 * WHY IT IS QUALITY-BLIND, STRUCTURALLY. The complete list of badge-derived
 * quantities this file reads is: `badge.category` (which pool it spends from),
 * legality (the game's own height and attribute gate, from badges.json),
 * net cost (the game's own tier-cost table) and `badge.id` (map keys and
 * equality only). THERE IS NO FIFTH. `badge.tier` is read only inside
 * `costForLevel`, and `badge.name` IS NEVER READ -- both mechanically checked.
 * There is ONE selection primitive, `pickUniform`, at ONE call site: no sort,
 * no comparator, no reduce-to-an-extremum, no array of multipliers, no
 * probability parameter. The enumeration order is fixed by the dataset and is
 * an INPUT TO A UNIFORM INDEX, not a preference.
 *
 * THE CLAIM THAT MAY BE MADE, AND THE ONE THAT MAY NOT. Every candidate legal
 * step is equiprobable at every point in the walk, and the roller is
 * equivariant under relabelling two indistinguishable badges (INV-8). The
 * induced distribution over OUTCOMES is not uniform -- cheap badges fit more
 * often, which is arithmetic the game itself defines. The sentence "every
 * loadout is equally likely" is FALSE for randomized greedy and appears
 * nowhere in this codebase.
 *
 * SYNERGY IS OUT OF v1, STRUCTURALLY, NOT BY DISCIPLINE. `RollResult` has no
 * field able to carry a `SynergySlot` and there is no write channel for one.
 * The reason is a genuine fixpoint rather than a scheduling call: a fuse
 * assignment frees that badge's spend back to its category pool, which funds
 * another purchase, which is itself a fuse candidate -- so the purchase set and
 * the assignment set become mutually determining and "maximal" stops being
 * well-defined. What v1 does instead is the right answer and not a compromise:
 * the roller reads `remainingPoints` AS IT FINDS IT, so whatever refunds the
 * user's existing assignments already produce are counted, with no fixpoint and
 * no special case.
 *
 * IT MUTATES NOTHING, READS NO CLOCK, AND TOUCHES NO SYNERGY SLOT.
 */

import { badgeById, shippedDataset } from "./dataset";
import { entryIsStale } from "./eligibility";
import { RollDidNotTerminateError } from "./errors";
import { badgeSlotsCapacityUnset } from "./ledger";
import { createRng, pickUniform, stableDigest } from "./random";
import { applyStep, legalSteps } from "./steps";
import type { LegalStep } from "./steps";
import { synergyRoleFor } from "./synergy";
import { categoryLedgerAt } from "./synergy-ledger";
import type { CategoryLedgerReadout, SynergyLedgerState } from "./synergy-ledger";
import type {
  Badge,
  BadgeDataset,
  Build,
  LoadoutEntry,
  RefundTrigger,
} from "./types";
import type { Category, PurchasableLevel } from "./vocabulary";
import { CATEGORIES } from "./vocabulary";

/**
 * Bumped whenever a change could alter what a given seed produces. It rides in
 * the reproducibility token so a stale token says "this seed will not
 * reproduce that roll" instead of quietly producing something else.
 */
export const ROLL_ALGORITHM_VERSION = 1;

export type PinMode = "exact" | "include";
export type PinReason = "user" | "synergyRole" | "stale" | "excluded";
export type RollMode = "fill" | "reroll";

export interface RollRequest {
  /** The committed state. NEVER mutated. */
  state: SynergyLedgerState;
  build: Build;
  /**
   * Session-only. ABSENT ID MEANS UNPINNED -- this engine honours the record
   * exactly as given and invents no state the request did not carry.
   *
   * The ruled product default (E-OQ-2) is that every existing entry starts
   * `exact`, so a roll is additive and destroys nothing the user chose. That
   * default is the CALLER's to seed: R2 writes `pins[badgeId] = "exact"` when a
   * badge is purchased. Putting it here instead would mean the engine could
   * never express "roll this category from scratch" at all, and would make the
   * `reroll` mode unreachable.
   */
  pins: Readonly<Record<string, PinMode>>;
  /** Session-only. "Never roll this badge." */
  excludedBadgeIds: readonly string[];
  /** Defaults to every category. */
  categories?: readonly Category[];
  /** Generated in the UI or typed by the user. Seed GENERATION is not the
   * engine's job -- it is nondeterministic, and `crypto` is banned here. */
  seed: string;
  mode: RollMode;
}

export type RollDecline =
  | { kind: "badgeSlotsCapacityUnset" }
  | { kind: "alreadyOverspent"; overBy: number }
  | { kind: "pinnedOverPoints"; pinnedNetCost: number; pool: number; overBy: number }
  | { kind: "pinnedOverBadgeSlots"; pinnedCount: number; equipSlotCapacity: number; overBy: number }
  | { kind: "noEligibleBadges" };

export interface PinnedEntryNote {
  badgeId: string;
  purchasedLevel: PurchasableLevel;
  mode: PinMode;
  reason: PinReason;
}

export interface CategoryRollReport {
  category: Category;
  outcome: "rolled" | "noLegalStep" | "declined";
  decline: RollDecline | null;
  /** Applied steps, in application order. WHAT was done, never WHY-THIS. */
  steps: LegalStep[];
  pinned: PinnedEntryNote[];
  /** `reroll` only; always [] in `fill`. */
  cleared: LoadoutEntry[];
  newBadgesBlockedByBadgeSlots: boolean;
  before: CategoryLedgerReadout;
  after: CategoryLedgerReadout;
  equipSlotCapacity: number;
}

export interface ReproducibilityToken {
  seed: string;
  rollAlgorithmVersion: number;
  dataVersion: string;
  refundTrigger: RefundTrigger;
  /** build + budgets + loadout + synergySlots + pins + exclusions + scope + mode. */
  inputDigest: string;
}

export interface RollResult {
  /**
   * A PROPOSAL, never a mutation: the COMPLETE loadout for all six categories,
   * with out-of-scope and declined categories carried through byte-identical
   * so the UI applies it as ONE state write. Eleven sequential writes would be
   * eleven eligibility recomputes, eleven feasibility passes and eleven
   * autosaves.
   */
  proposedLoadout: LoadoutEntry[];
  /** One entry per category in scope, ALWAYS -- including on total success and
   * on total decline. Silence is never an outcome. */
  categories: CategoryRollReport[];
  token: ReproducibilityToken;
  /** false means `proposedLoadout` deep-equals the input and the UI offers no Apply. */
  changed: boolean;
  // STRUCTURAL: this type has NO field able to carry a SynergySlot.
}

/** TEST-ONLY escape hatch. Production callers never pass it; it exists so the
 * H6 termination guard can be PROVEN to throw rather than assumed to. */
export interface RollOptions {
  iterationBound?: number;
}

// ---------------------------------------------------------------------------

function requireBadge(dataset: BadgeDataset, badgeId: string): Badge {
  const badge = badgeById(dataset, badgeId);
  if (badge === undefined) throw new Error(`Unknown badge id "${badgeId}"`);
  return badge;
}

/**
 * Which entries in this category may not move, and why.
 *
 * THREE IMPLICIT PINS the engine applies whether or not the user set them:
 *
 *  1. SYNERGY-ROLE HOLDERS -- unconditional and non-overridable. Two
 *     independent reasons, and the second is why this is an engine invariant
 *     rather than a UI courtesy: removing such an entry STRANDS a fuse or
 *     reaction reference, which is the exact F2.1 defect class that cost real
 *     autosaves; and changing its level breaks the cost model's Invariant R.
 *     Determined by `synergyRoleFor(...) !== null` -- role-holding REGARDLESS
 *     of whether the slot is unlocked, because the reference exists either way.
 *     This is the single highest-severity risk in the feature.
 *  2. STALE PURCHASES -- a purchase above its current cap, or now
 *     height-blocked, is a DISCLOSURE (H8), never a defect for the roller to
 *     clean up. The roll never silently repairs a disclosure, and never
 *     proposes the badge either.
 *  3. OWNED-BUT-EXCLUDED BADGES -- an exclusion governs the CANDIDATE SET
 *     only. It does not force removal, and in `reroll` an owned excluded badge
 *     is HELD, not cleared. The alternative would make a toggle labelled
 *     "never roll this" silently DELETE a purchase, and undo is cut.
 */
function resolvePins(
  request: RollRequest,
  category: Category,
  dataset: BadgeDataset,
): { pinnedBadgeIds: Set<string>; heldBadgeIds: Set<string>; notes: PinnedEntryNote[] } {
  const excluded = new Set(request.excludedBadgeIds);
  const pinnedBadgeIds = new Set<string>();
  const heldBadgeIds = new Set<string>();
  const notes: PinnedEntryNote[] = [];

  for (const entry of request.state.loadout) {
    const badge = requireBadge(dataset, entry.badgeId);
    if (badge.category !== category) continue;

    let mode: PinMode | null = null;
    let reason: PinReason | null = null;
    if (synergyRoleFor(request.state.synergySlots, entry.badgeId) !== null) {
      mode = "exact";
      reason = "synergyRole";
    } else if (entryIsStale(badge, request.build, entry.purchasedLevel)) {
      mode = "exact";
      reason = "stale";
    } else if (excluded.has(entry.badgeId)) {
      mode = "exact";
      reason = "excluded";
    } else {
      const requested = request.pins[entry.badgeId];
      if (requested !== undefined) {
        mode = requested;
        reason = "user";
      }
    }
    if (mode === null || reason === null) continue;

    notes.push({ badgeId: entry.badgeId, purchasedLevel: entry.purchasedLevel, mode, reason });
    heldBadgeIds.add(entry.badgeId);
    // Only `exact` forbids a level change. `include` holds MEMBERSHIP; the
    // enumerator's no-downgrade rule already stops the level from falling.
    if (mode === "exact") pinnedBadgeIds.add(entry.badgeId);
  }

  return { pinnedBadgeIds, heldBadgeIds, notes };
}

/**
 * The lattice bound on the walk.
 *
 * Every applied step strictly increases either the number of entries in the
 * category (at most `equipSlots - used` times) or one entry's level index (at
 * most 3 per entry), so the walk cannot exceed `4 * max(used, equipSlots)`.
 *
 * NOTE `max(used, equipSlots)`, not `equipSlots`. The brief's `4 * equipSlots`
 * is too small for a PRE-EXISTING Badge Slots overflow, which AJ-11 explicitly
 * permits `fill` to roll into: five entries against a capacity of one is a
 * legal input, and it admits up to fifteen upgrade steps against a bound of
 * four. Using the smaller bound would throw on correct input.
 */
export function rollIterationBound(entriesAtStart: number, equipSlots: number): number {
  return 4 * Math.max(entriesAtStart, equipSlots) + 1;
}

function entriesIn(
  loadout: readonly LoadoutEntry[],
  category: Category,
  dataset: BadgeDataset,
): LoadoutEntry[] {
  return loadout.filter((entry) => requireBadge(dataset, entry.badgeId).category === category);
}

// ---------------------------------------------------------------------------

export function rollCategory(
  request: RollRequest,
  category: Category,
  dataset: BadgeDataset = shippedDataset,
  options: RollOptions = {},
): CategoryRollReport & { proposedEntries: LoadoutEntry[] } {
  const budget = request.state.budgets[category];
  const before = categoryLedgerAt(request.state, "current", category, dataset);
  const originalEntries = entriesIn(request.state.loadout, category, dataset);

  const decline = (
    reason: RollDecline,
  ): CategoryRollReport & { proposedEntries: LoadoutEntry[] } => ({
    category,
    outcome: "declined",
    decline: reason,
    steps: [],
    pinned: notes,
    // A DECLINE MUTATES NOTHING. Not even a clear that was computed.
    cleared: [],
    newBadgesBlockedByBadgeSlots: false,
    before,
    after: before,
    equipSlotCapacity: budget.equipSlots,
    proposedEntries: originalEntries,
  });

  // 0 means NOT ENTERED, never "zero capacity": a category whose Badge Slots
  // capacity is unset does not roll at all, because the generator has no
  // capacity to respect.
  const { pinnedBadgeIds, heldBadgeIds, notes } = resolvePins(request, category, dataset);
  if (badgeSlotsCapacityUnset(budget)) return decline({ kind: "badgeSlotsCapacityUnset" });

  // `reroll` rebuilds the category from its held entries; `fill` adds to what
  // is already there.
  const keptEntries =
    request.mode === "reroll"
      ? originalEntries.filter((entry) => heldBadgeIds.has(entry.badgeId))
      : originalEntries;
  const clearedEntries =
    request.mode === "reroll"
      ? originalEntries.filter((entry) => !heldBadgeIds.has(entry.badgeId))
      : [];

  const keptIds = new Set(keptEntries.map((entry) => entry.badgeId));
  let workingLoadout: LoadoutEntry[] = request.state.loadout.filter((entry) => {
    const badge = requireBadge(dataset, entry.badgeId);
    return badge.category !== category || keptIds.has(entry.badgeId);
  });
  const workingState = (): SynergyLedgerState => ({
    loadout: workingLoadout,
    budgets: request.state.budgets,
    synergySlots: request.state.synergySlots,
    refundTrigger: request.state.refundTrigger,
  });

  const held = categoryLedgerAt(workingState(), "current", category, dataset);

  // Two DISTINCT discriminants for a points overspend, so R2 can render the
  // better sentence: "your pins already cost more than the pool" is a different
  // fact from "you were already overspent before the roll".
  if (held.remainingPoints < 0) {
    return request.mode === "reroll"
      ? decline({
          kind: "pinnedOverPoints",
          pinnedNetCost: held.spent - held.refunded,
          pool: budget.points,
          overBy: -held.remainingPoints,
        })
      : decline({ kind: "alreadyOverspent", overBy: -held.remainingPoints });
  }

  // AJ-11, and the asymmetry is the whole point. `reroll` declines on a Badge
  // Slots overflow because rebuilding the category is impossible while the
  // pins already overflow it. `fill` DOES NOT DECLINE -- it blocks only the
  // steps that would consume a Badge Slot and lets upgrades proceed. Declining
  // there would derive a BLOCK from a WARNING, which is the one thing H4's
  // taxonomy exists to prevent.
  if (request.mode === "reroll" && held.equipSlotsUsed > budget.equipSlots) {
    return decline({
      kind: "pinnedOverBadgeSlots",
      pinnedCount: held.equipSlotsUsed,
      equipSlotCapacity: budget.equipSlots,
      overBy: held.equipSlotsUsed - budget.equipSlots,
    });
  }

  const enumerate = (): LegalStep[] =>
    legalSteps(
      {
        state: workingState(),
        build: request.build,
        pinnedBadgeIds,
        excludedBadgeIds: new Set(request.excludedBadgeIds),
      },
      category,
      dataset,
    );

  // "Nothing is legal here at all" is a different fact from "nothing fits".
  if (enumerate().length === 0) return decline({ kind: "noEligibleBadges" });

  // ---- the walk ----------------------------------------------------------
  // Per-category seeding, so `rollCategory(X, C, S)` reproduces exactly what
  // `rollBuild(X, all, S)` did to C. Pools, Badge Slots and refunds are all
  // per-category, so nothing is lost -- and it removes "why did the same seed
  // give me something different" as a class.
  const rng = createRng(`${request.seed} ${ROLL_ALGORITHM_VERSION} ${category}`);
  const bound = options.iterationBound ?? rollIterationBound(keptEntries.length, budget.equipSlots);
  const applied: LegalStep[] = [];

  for (let iteration = 0; ; iteration += 1) {
    if (iteration >= bound) throw new RollDidNotTerminateError(category, bound);
    const readout = categoryLedgerAt(workingState(), "current", category, dataset);
    const newBadgesAllowed = readout.equipSlotsUsed < budget.equipSlots;
    const candidates = enumerate().filter(
      (step) =>
        step.netCost <= readout.remainingPoints &&
        (!step.requiresNewBadgeSlot || newBadgesAllowed),
    );
    // MAXIMAL BY CONSTRUCTION: the only exit is an empty candidate set.
    if (candidates.length === 0) break;
    // THE ONE SELECTION PRIMITIVE, AT ITS ONE CALL SITE.
    const chosen = pickUniform(rng, candidates);
    workingLoadout = applyStep(workingLoadout, chosen) as LoadoutEntry[];
    applied.push(chosen);
  }

  // Would more have been possible with a free Badge Slot? Asked by re-running
  // the enumerator WITHOUT the capacity filter -- never inferred from a tally.
  const finalReadout = categoryLedgerAt(workingState(), "current", category, dataset);
  const newBadgesBlockedByBadgeSlots = enumerate().some(
    (step) => step.requiresNewBadgeSlot && step.netCost <= finalReadout.remainingPoints,
  );

  return {
    category,
    outcome: applied.length > 0 ? "rolled" : "noLegalStep",
    decline: null,
    steps: applied,
    pinned: notes,
    cleared: clearedEntries,
    newBadgesBlockedByBadgeSlots,
    before,
    // BELT AND BRACES: `after` comes from the SHIPPED LEDGER on the real
    // resulting state, never from the walk's internal tally. A drift in the
    // cost model can therefore produce a suboptimal CHOICE; it cannot produce
    // a WRONG DISPLAYED NUMBER.
    after: finalReadout,
    equipSlotCapacity: budget.equipSlots,
    proposedEntries: entriesIn(workingLoadout, category, dataset),
  };
}

export function rollBuild(
  request: RollRequest,
  dataset: BadgeDataset = shippedDataset,
  options: RollOptions = {},
): RollResult {
  const scope = request.categories ?? CATEGORIES;
  const reports = scope.map((category) => rollCategory(request, category, dataset, options));

  // Rebuild the COMPLETE loadout deterministically: original order for every
  // surviving entry, then each in-scope category's new purchases in scope
  // order. Out-of-scope categories carry through byte-identical.
  const proposedByCategory = new Map<Category, LoadoutEntry[]>(
    reports.map((report) => [report.category, report.proposedEntries]),
  );
  const survivors: LoadoutEntry[] = [];
  const seen = new Set<string>();
  for (const entry of request.state.loadout) {
    const badge = requireBadge(dataset, entry.badgeId);
    const proposed = proposedByCategory.get(badge.category);
    if (proposed === undefined) {
      survivors.push(entry);
      seen.add(entry.badgeId);
      continue;
    }
    const kept = proposed.find((candidate) => candidate.badgeId === entry.badgeId);
    if (kept !== undefined) {
      survivors.push(kept);
      seen.add(entry.badgeId);
    }
  }
  for (const report of reports) {
    for (const entry of report.proposedEntries) {
      if (!seen.has(entry.badgeId)) survivors.push(entry);
    }
  }

  const changed =
    survivors.length !== request.state.loadout.length ||
    survivors.some(
      (entry, index) =>
        entry.badgeId !== request.state.loadout[index]?.badgeId ||
        entry.purchasedLevel !== request.state.loadout[index]?.purchasedLevel,
    );

  return {
    proposedLoadout: survivors,
    categories: reports.map(({ proposedEntries: _proposedEntries, ...report }) => report),
    token: {
      seed: request.seed,
      rollAlgorithmVersion: ROLL_ALGORITHM_VERSION,
      dataVersion: dataset.dataVersion,
      refundTrigger: request.state.refundTrigger,
      inputDigest: stableDigest({
        build: request.build,
        budgets: request.state.budgets,
        loadout: request.state.loadout,
        synergySlots: request.state.synergySlots,
        pins: request.pins,
        excludedBadgeIds: [...request.excludedBadgeIds],
        scope: [...scope],
        mode: request.mode,
      }),
    },
    changed,
  };
}
