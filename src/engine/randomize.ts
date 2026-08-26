/**
 * THE ROLL ENGINE -- randomized greedy over a uniformly-sampled legal-step set.
 *
 * WHAT IT IS. Per category: enumerate every legal move, keep the ones that fit
 * the remaining points and the remaining Badge Slots, pick one UNIFORMLY,
 * apply it, repeat until the set is empty. That is the whole algorithm, and it
 * should stay this simple.
 *
 * THERE ARE THREE MOVE KINDS, not two. `add` and `upgrade` come from
 * `legalSteps`. The third is `exchange` -- drop one entry THIS WALK CREATED and
 * buy an unowned legal badge in the same category, iff the net spend strictly
 * increases. Exchanges are offered ONLY while every Badge Slot is occupied,
 * because that is the only state in which a Badge Slot commitment has become
 * irreversible and trading is the only way left to move at all. Below capacity
 * the third kind is never enumerated, so the walk is the two-move walk
 * verbatim -- a theorem, not a measurement, and pinned as INV-20.
 *
 * WHY THE THIRD MOVE EXISTS. Without it a slot can be spent on a badge with a
 * low legal ceiling and never recovered: a measured case at capacity 3 and a
 * pool of 16 bought three cost-1 Bronzes, was MAXIMAL, and left most of the
 * pool unspent. The user's objective is that a roll spends the pool as fully as
 * it can, so the remedy ENLARGES THE MOVE SET rather than adding any leaning
 * toward badges that happen to reach further. Those are different things and
 * only the first one is free of a claim about which badge is good.
 *
 * WHY IT IS MAXIMAL, AND WHY THAT IS THE RIGHT WORD. The walk stops only when
 * NO affordable move of ANY of the three kinds remains, so the result is
 * maximal BY CONSTRUCTION over the enlarged move set -- strictly stronger than
 * the two-move statement it replaces. Maximal is still not maximum: a different
 * sequence of choices could sometimes fit more total points. That gap is
 * measured against a test-only exact DP oracle (INV-14) and held to a hard cap
 * of 2 points on EVERY roll, but it is a gap and it is named as one. NOTHING in
 * this file, in any comment, test name or doc string, claims the roller finds
 * the largest possible spend -- because it does not, and because "the numbers
 * reconcile" is the acceptance bar.
 *
 * WHY IT IS QUALITY-BLIND, STRUCTURALLY. The complete list of badge-derived
 * quantities this file reads is: `badge.category` (which pool it spends from),
 * legality (the game's own height and attribute gate, from badges.json),
 * net cost (the game's own tier-cost table) and `badge.id` (map keys and
 * equality only). THERE IS NO FIFTH, AND THE THIRD MOVE KIND DID NOT ADD ONE --
 * an exchange reads legality and net cost and nothing else, which is why INV-8
 * relabel/swap equivariance carries across it untouched. `badge.tier` is read
 * only inside `costForLevel`, and `badge.name` IS NEVER READ -- both
 * mechanically checked. There is ONE selection primitive, `pickUniform`, at ONE
 * call site: no sort, no comparator, no reduce-to-an-extremum, no array of
 * multipliers, no probability parameter. The enumeration order is fixed by the
 * dataset and is an INPUT TO A UNIFORM INDEX, not a preference.
 *
 * THE CLAIM THAT MAY BE MADE, AND THE ONE THAT MAY NOT. Every candidate move
 * is equiprobable at every point in the walk, and that holds VERBATIM over the
 * three-kind move set: the three kinds go into ONE flat candidate array and the
 * picker cannot see which is which. A net-cost-1 exchange and a net-cost-4
 * exchange are drawn with the same probability (INV-23 pins it at +/-1.5%),
 * because `netCost > 0` is an admissibility test of exactly the same class as
 * `netCost <= remainingPoints` -- it decides whether a move is offered, never
 * how often. The roller is also equivariant under relabelling two
 * indistinguishable badges (INV-8), and that is the load-bearing property.
 *
 * WHAT MAY NOT BE SAID: any claim that the induced distribution over OUTCOMES
 * is uniform. It is not -- cheap badges fit more often, which is arithmetic the
 * game itself defines. That claim is BANNED outright (scope.md 0.1 A4), not
 * merely discouraged, and it appears nowhere in this codebase.
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
import {
  applyExchange,
  ceilingSpendFor,
  exchangeSteps,
  applyStep,
  isExchangeStep,
  legalSteps,
} from "./steps";
import type { LegalStep, RollStep } from "./steps";
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
 *
 * 1 -> 2 (F8-E3): the exchange move. It changes what a seed produces in the
 * capacity-bound regime, and it is part of the per-category RNG seed string, so
 * a version-1 token cannot silently reproduce something else at version 2.
 */
export const ROLL_ALGORITHM_VERSION = 2;

export type PinMode = "exact" | "include";
export type PinReason = "user" | "synergyRole" | "stale" | "excluded" | "fillDefault";
export type RollMode = "fill" | "reroll";

export interface RollRequest {
  /** The committed state. NEVER mutated. */
  state: SynergyLedgerState;
  build: Build;
  /**
   * Session-only, and A POSITIVE PERMISSION GRANT IN BOTH MODES (A4-R1). An
   * absent id grants nothing, so what an absent id MEANS is decided by the
   * mode, and the two modes are deliberately asymmetric:
   *
   *   `fill`   ADDS. An existing entry is raised ONLY if it carries an explicit
   *            `include`. Absent id => the entry is held byte-identical, pinned
   *            `exact` with reason `fillDefault`.
   *   `reroll` REBUILDS. Absent id => the entry is cleared and the category is
   *            rebuilt around what remains.
   *
   * WHY THE ASYMMETRY IS THE SAFE ONE, and why this is structural rather than a
   * caller obligation: a `reroll` that clears too much is visible in the
   * proposal preview before Apply, whereas a `fill` that quietly raises one
   * entry is one pip in a 53-card grid. So a forgotten pin fails CLOSED in the
   * mode where failing open is invisible. Baking `exact` in for both modes --
   * which is what the design doc's blanket default said -- would instead make
   * `reroll` structurally unreachable.
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
  /** Applied moves, in application order — adds, upgrades and exchanges in one
   *  array. WHAT was done, never WHY-THIS. Discriminate with `isExchangeStep`. */
  steps: RollStep[];
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
 *  4. IN `fill`, EVERY REMAINING EXISTING ENTRY (A4-R1) -- reason
 *     `fillDefault`. `fill` ADDS; only `reroll` REBUILDS. This is the arm that
 *     makes a forgotten pin fail closed, and it is why `pins` is a positive
 *     permission grant rather than a list of exceptions.
 *
 * THE `fillDefault` NOTE IS DEFERRED, NOT SUPPRESSED. Emitting one for all
 * twenty entries of a full build is noise; the note is worth rendering only
 * where it is ACTIONABLE, i.e. where the rule actually suppressed an upgrade
 * this pool could have paid for. So the pin is applied here and the note is
 * emitted after the walk, by re-running the enumerator with the fill-held
 * entries treated as unpinned -- the same shape `newBadgesBlockedByBadgeSlots`
 * already uses, and for the same reason: ask the enumerator, never infer.
 */
function resolvePins(
  request: RollRequest,
  category: Category,
  dataset: BadgeDataset,
): {
  pinnedBadgeIds: Set<string>;
  heldBadgeIds: Set<string>;
  notes: PinnedEntryNote[];
  fillDefaultEntries: LoadoutEntry[];
} {
  const excluded = new Set(request.excludedBadgeIds);
  const pinnedBadgeIds = new Set<string>();
  const heldBadgeIds = new Set<string>();
  const notes: PinnedEntryNote[] = [];
  const fillDefaultEntries: LoadoutEntry[] = [];

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
      } else if (request.mode === "fill") {
        // A4-R1. `fill` ADDS; it does not rebuild. Absent id grants nothing.
        mode = "exact";
        reason = "fillDefault";
      }
    }
    if (mode === null || reason === null) continue;

    heldBadgeIds.add(entry.badgeId);
    // Only `exact` forbids a level change. `include` holds MEMBERSHIP; the
    // enumerator's no-downgrade rule already stops the level from falling.
    if (mode === "exact") pinnedBadgeIds.add(entry.badgeId);
    if (reason === "fillDefault") {
      fillDefaultEntries.push(entry);
      continue;
    }
    notes.push({ badgeId: entry.badgeId, purchasedLevel: entry.purchasedLevel, mode, reason });
  }

  return { pinnedBadgeIds, heldBadgeIds, notes, fillDefaultEntries };
}

/**
 * The lattice bound on the walk. A BACKSTOP, NOT A BUDGET -- it exists to throw
 * loudly (H6) if the measure argument below is ever wrong, and a guard that can
 * FALSE-throw is worse than one that is loose. Do not tighten it.
 *
 * The measure argument, over all three move kinds:
 *
 *   ADDS      strictly increase the entry count and fire only below capacity,
 *             so at most `equipSlots` of them ever.
 *   EXCHANGES hold the entry count constant and strictly increase net spend by
 *             at least 1, so at most `ceilingSpend` of them.
 *   UPGRADES  strictly increase one entry's level index; an exchange resets one
 *             entry's index and hands back at most 3, so at most
 *             `3 * max(E0, equipSlots) + 3 * ceilingSpend`.
 *
 * Summed and rounded up: `4 * (max(E0, equipSlots) + ceilingSpend) + 1`.
 *
 * NOTE `max(entriesAtStart, equipSlots)`, not `equipSlots`: AJ-11 explicitly
 * permits `fill` to roll into a PRE-EXISTING Badge Slots overflow, and five
 * entries against a capacity of one admits fifteen upgrade steps against a
 * bound of four. The smaller form throws on correct input (A4-R2).
 *
 * `ceilingSpend` is `min(points, legalCeiling)` -- a LATTICE quantity, not a
 * budget one, which is what keeps the argument that a fat-fingered
 * `points: 999` cannot produce a long loop. It is REQUIRED rather than
 * defaulted: a silently-omitted third argument would produce a bound that is
 * too tight in exactly the capacity-bound case the exchange move exists for,
 * and a false throw is the one failure this guard must not have.
 *
 * Measured maximum iterations over the full INV-14 sweep: see
 * `docs/proof/f8e3-verification.txt`. The guard is nowhere near binding.
 */
export function rollIterationBound(
  entriesAtStart: number,
  equipSlots: number,
  ceilingSpend: number,
): number {
  return 4 * (Math.max(entriesAtStart, equipSlots) + ceilingSpend) + 1;
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
  const { pinnedBadgeIds, heldBadgeIds, notes, fillDefaultEntries } = resolvePins(
    request,
    category,
    dataset,
  );
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

  const enumerationInput = () => ({
    state: workingState(),
    build: request.build,
    pinnedBadgeIds,
    excludedBadgeIds: new Set(request.excludedBadgeIds),
  });
  const enumerate = (): LegalStep[] => legalSteps(enumerationInput(), category, dataset);

  // "Nothing is legal here at all" is a different fact from "nothing fits".
  if (enumerate().length === 0) return decline({ kind: "noEligibleBadges" });

  // ---- the walk ----------------------------------------------------------
  // Per-category seeding, so `rollCategory(X, C, S)` reproduces exactly what
  // `rollBuild(X, all, S)` did to C. Pools, Badge Slots and refunds are all
  // per-category, so nothing is lost -- and it removes "why did the same seed
  // give me something different" as a class.
  const rng = createRng(`${request.seed} ${ROLL_ALGORITHM_VERSION} ${category}`);
  const bound =
    options.iterationBound ??
    rollIterationBound(
      keptEntries.length,
      budget.equipSlots,
      ceilingSpendFor(enumerationInput(), category, budget.points, dataset),
    );
  const applied: RollStep[] = [];

  // THE SAFETY BOUNDARY for the exchange move: entries THIS WALK created.
  // Nothing the user placed is ever in here, so INV-5 holds BY CONSTRUCTION
  // rather than by a check that could be forgotten. An UPGRADE of a pre-existing
  // entry does NOT enrol it -- an `include` pin permits a raise, and enrolling
  // on a raise is exactly how a roll would start deleting the user's badges.
  const rollCreatedIds = new Set<string>();

  for (let iteration = 0; ; iteration += 1) {
    if (iteration >= bound) throw new RollDidNotTerminateError(category, bound);
    const readout = categoryLedgerAt(workingState(), "current", category, dataset);
    const newBadgesAllowed = readout.equipSlotsUsed < budget.equipSlots;
    let candidates: RollStep[] = enumerate().filter(
      (step) =>
        step.netCost <= readout.remainingPoints &&
        (!step.requiresNewBadgeSlot || newBadgesAllowed),
    );
    // THE THIRD MOVE KIND, offered ONLY when every Badge Slot is occupied --
    // read as `>=`, not `===`: AJ-11 permits `fill` to roll into a pre-existing
    // overflow, an exchange is slot-count-neutral so the overflow is never
    // INCREASED (INV-6, INV-22), and refusing to trade inside an overflow would
    // strand the user in the state H4's taxonomy says must not become a block.
    // No move ever DECREASES the entry count, so a walk that ends below
    // capacity was never offered one of these at any iteration.
    if (!newBadgesAllowed) {
      candidates = candidates.concat(
        exchangeSteps(
          { ...enumerationInput(), exchangeableBadgeIds: rollCreatedIds },
          category,
          dataset,
        ).filter((step) => step.netCost <= readout.remainingPoints),
      );
    }
    // MAXIMAL BY CONSTRUCTION: the only exit is an empty candidate set.
    if (candidates.length === 0) break;
    // THE ONE SELECTION PRIMITIVE, AT ITS ONE CALL SITE. The three kinds sit in
    // ONE flat array and the picker cannot tell them apart.
    const chosen = pickUniform(rng, candidates);
    if (isExchangeStep(chosen)) {
      workingLoadout = applyExchange(workingLoadout, chosen) as LoadoutEntry[];
      rollCreatedIds.delete(chosen.outBadgeId);
      rollCreatedIds.add(chosen.badgeId);
    } else {
      workingLoadout = applyStep(workingLoadout, chosen) as LoadoutEntry[];
      if (chosen.fromLevel === null) rollCreatedIds.add(chosen.badgeId);
    }
    applied.push(chosen);
  }

  // Would more have been possible with a free Badge Slot? Asked by re-running
  // the enumerator WITHOUT the capacity filter -- never inferred from a tally.
  const finalReadout = categoryLedgerAt(workingState(), "current", category, dataset);
  const newBadgesBlockedByBadgeSlots = enumerate().some(
    (step) => step.requiresNewBadgeSlot && step.netCost <= finalReadout.remainingPoints,
  );

  // A4-R1's disclosure, computed the same way: re-run the enumerator with the
  // fill-held entries treated as UNPINNED and see which of them the rule
  // actually cost something. A note here means "this one could have absorbed
  // points if you let it", which is the only version of it worth rendering.
  if (fillDefaultEntries.length > 0) {
    const fillDefaultIds = new Set(fillDefaultEntries.map((entry) => entry.badgeId));
    const withoutFillHolds = legalSteps(
      {
        ...enumerationInput(),
        pinnedBadgeIds: new Set([...pinnedBadgeIds].filter((id) => !fillDefaultIds.has(id))),
      },
      category,
      dataset,
    );
    for (const entry of fillDefaultEntries) {
      const suppressed = withoutFillHolds.some(
        (step) =>
          step.badgeId === entry.badgeId && step.netCost <= finalReadout.remainingPoints,
      );
      if (!suppressed) continue;
      notes.push({
        badgeId: entry.badgeId,
        purchasedLevel: entry.purchasedLevel,
        mode: "exact",
        reason: "fillDefault",
      });
    }
  }

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
