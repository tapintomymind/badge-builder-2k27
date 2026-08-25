/**
 * The bonus layer and THE ONE PLACE effective capacity and pool are derived.
 *
 * A function that knows what a capacity number MEANS is a rule, and rules live
 * in the engine [seed: Working agreements #1]. Zero effective-capacity
 * arithmetic exists in any .tsx — tests/architecture.test.ts (a) already
 * forbids src/engine/ importing from src/ui/, and this is the mirror
 * obligation.
 *
 * The model is a SEPARATE LAYER, never merged into `budgets`:
 *   base    — the six user-entered values, the "20 a build starts with" spread
 *   bonus   — build-level earned totals + a per-category applied allocation
 *   effect. — composed on read, stored nowhere
 *
 * [scope.md §0.1 A5-R1 · A5-R4 · features/bonus-badge-slots-and-points/
 *  engine-data-design.md §1.3, §2]
 */

import type { BonusBudget, Budget } from "./types";
import type { Category } from "./vocabulary";
import { CATEGORIES } from "./vocabulary";

/**
 * The default, and the ONLY value the app can currently produce for a fresh
 * build: both earned totals zero, all six applied allocations zero.
 *
 * THERE IS NO PUBLISHED CAP AND NO PUBLISHED STARTING VALUE. The user's
 * "3 extra slots and 12 tokens" is one account's snapshot at one moment,
 * explicitly qualified by "you can earn more … so this will be dynamic" — an
 * OBSERVATION, never a rule. Neither number appears in this file as a default,
 * a cap or a placeholder. Ship gate 1.7.
 */
export function zeroBonus(): BonusBudget {
  return {
    earnedEquipSlots: 0,
    earnedPoints: 0,
    appliedEquipSlots: zeroPerCategory(),
    appliedPoints: zeroPerCategory(),
  };
}

function zeroPerCategory(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<
    Category,
    number
  >;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeApplied(value: unknown): Record<Category, number> {
  // EXTRA KEYS ARE IGNORED, never a problem — a future category or a hand-edit
  // typo is not worth refusing a build over. Missing keys default to 0.
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, nonNegativeOrZero(source[category])]),
  ) as Record<Category, number>;
}

/**
 * THE ONE NORMALIZATION POINT for the wire shape. Called from
 * `validateBody`'s reassembly in src/engine/serialization.ts AFTER
 * `validateBonus` has pushed any shape problems, so by the time this runs the
 * value is already known to be shaped or absent.
 *
 * Returns a fully-populated BonusBudget with EXACTLY the six category keys.
 * No downstream reader ever sees `undefined`, a missing category, or an extra
 * key — the F4/P3 `disciplineLock` pattern: the alternative leaves the field
 * simply missing on a pre-A5 file, and `undefined !== 0` fires spurious
 * arithmetic on every category of every old build.
 *
 * ABSENT and `null` both normalize to `zeroBonus()`. `fromSaved` in App.tsx
 * does NOT re-normalize — a second normalization point is a second place for
 * the two to drift.
 *
 * IT NEVER CLAMPS AND NEVER CHECKS Σ ≤ earned. See the comment at
 * `validateBonus`.
 */
export function normalizeBonus(value: unknown): BonusBudget {
  if (!isRecord(value)) return zeroBonus();
  return {
    earnedEquipSlots: nonNegativeOrZero(value["earnedEquipSlots"]),
    earnedPoints: nonNegativeOrZero(value["earnedPoints"]),
    appliedEquipSlots: normalizeApplied(value["appliedEquipSlots"]),
    appliedPoints: normalizeApplied(value["appliedPoints"]),
  };
}

/** Σ of the six applied bonus Badge Slots. */
export function appliedEquipSlotsTotal(bonus: BonusBudget): number {
  return CATEGORIES.reduce((sum, category) => sum + bonus.appliedEquipSlots[category], 0);
}

/** Σ of the six applied bonus Badge Points. */
export function appliedPointsTotal(bonus: BonusBudget): number {
  return CATEGORIES.reduce((sum, category) => sum + bonus.appliedPoints[category], 0);
}

/**
 * earned − applied. MAY BE NEGATIVE AND MUST NOT CLAMP.
 *
 * The negative IS the over-applied disclosure figure (INV-A5-5), and clamping
 * it to 0 hides the very state validateLoadout's `bonusEquipSlotsOverApplied`
 * exists to report. Reachable with no external editing: earn 3, apply 3, then
 * edit the total down at season rollover.
 */
export function unappliedEquipSlots(bonus: BonusBudget): number {
  return bonus.earnedEquipSlots - appliedEquipSlotsTotal(bonus);
}

/** earned − applied. MAY BE NEGATIVE AND MUST NOT CLAMP — see above. */
export function unappliedPoints(bonus: BonusBudget): number {
  return bonus.earnedPoints - appliedPointsTotal(bonus);
}

/**
 * Is there anything in this bonus layer worth guarding against a destructive
 * replace? DERIVED over the whole record — both earned totals and both applied
 * allocations, the latter through the Σ helpers above so a seventh category
 * would be counted automatically. Deliberately NOT a hand-enumerated field
 * list: the callers of this predicate (App.tsx's switcher guard, and the reset
 * blast-radius count when A5-U extends it) must widen by construction rather
 * than by remembering.
 *
 * A non-zero EARNED total counts even with nothing applied: it is
 * account-progression the user typed in, and silently discarding it on a
 * switcher replace is exactly the F2.2 class.
 */
export function bonusHasContent(bonus: BonusBudget): boolean {
  return (
    bonus.earnedEquipSlots > 0 ||
    bonus.earnedPoints > 0 ||
    appliedEquipSlotsTotal(bonus) > 0 ||
    appliedPointsTotal(bonus) > 0
  );
}

/**
 * THE COMPOSITION. base + applied bonus, per category, with the zero-base
 * carve-out.
 *
 * THE ZERO-BASE CARVE-OUT, AND WHY IT IS HERE RATHER THAN IN A PREDICATE.
 * A base of 0 means "the user has not entered this yet" (design-spec §4.7) —
 * it never means "a capacity of zero". So the base is UNKNOWN, and
 * unknown + 2 is not 2. A category with an unset base stays UNSET no matter
 * what bonus is applied to it: the allocation is recorded, kept and disclosed
 * ("applied and waiting"), and it starts counting the moment a base is
 * entered. Treating it as 2 would (a) flip an untouched category to
 * fully-live-and-red on a single click in a DIFFERENT surface — the exact
 * false-alarm class §4.7 exists to kill — and (b) let the roll engine fill
 * that category against a capacity the user never entered, this project's
 * named cardinal failure shape.
 *
 * Expressing this in the COMPOSITION rather than in `badgeSlotsCapacityUnset`
 * makes every downstream consumer — ledger, validateLoadout, feasibility,
 * steps.ts, randomize.ts, summary.ts — correct with NO EDIT and no
 * possibility of a missed reader. The alternative (a base/bonus split
 * travelling on the `Budget` type) was rejected: it churns 68 budget literals
 * across 29 test files and buys nothing this does not already guarantee.
 * [scope.md §0.1 A5-R4]
 *
 * NEVER CLAMPS. An over-applied bonus composes exactly as given — H8:
 * disclose, never repair. Pure: neither argument is mutated and the result is
 * a fresh record.
 */
export function effectiveBudgets(
  base: Record<Category, Budget>,
  bonus: BonusBudget,
): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => {
      const baseBudget = base[category];
      return [
        category,
        {
          equipSlots:
            baseBudget.equipSlots === 0
              ? 0
              : baseBudget.equipSlots + bonus.appliedEquipSlots[category],
          points: baseBudget.points === 0 ? 0 : baseBudget.points + bonus.appliedPoints[category],
        },
      ];
    }),
  ) as Record<Category, Budget>;
}

/**
 * The EXACT INVERSE of the equip-slot half of `effectiveBudgets`, for the one
 * consumer that holds an effective record and needs the BASE figure back:
 * `summary.ts`'s `totalBaseEquipSlots`, which feeds `badgeSlotsBaselineText`
 * ("N of the 20 a build starts with" describes the BASE spread — A5-R3).
 *
 * Exact because the carve-out is absorbing at zero: effective 0 ⇒ base 0, and
 * above zero the applied amount was added unconditionally. It lives HERE, next
 * to the composition, so the two can never drift apart in separate files.
 */
export function baseEquipSlotsOf(effectiveEquipSlots: number, appliedEquipSlots: number): number {
  return effectiveEquipSlots === 0 ? 0 : effectiveEquipSlots - appliedEquipSlots;
}
