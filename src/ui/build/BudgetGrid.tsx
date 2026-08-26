/**
 * BudgetGrid (design-spec §3.3) — six Category rows of manual Badge Tokens +
 * Badge Slots inputs, behind the deriveBudget seam, with an auto-summed
 * read-only total footer (BudgetTotalRow). The whole section carries ONE
 * unverified banner — the derivation is unpublished 2K27 data (Open item #3)
 * and twelve per-field icons would say it worse.
 *
 * Category ≠ AttrGroup (H7): same six words, different axes — the hint below
 * the grid states it so nobody reads them as one.
 */

import { useId } from "react";
import {
  appliedEquipSlotsTotal,
  appliedPointsTotal,
  bonusHasContent,
} from "../../engine/budget";
import type { BonusBudget, Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";
import { Hint } from "../primitives/Hint";
import { NumberField } from "../primitives/NumberField";

export interface BudgetGridProps {
  budgets: Record<Category, Budget>;
  onCommit: (category: Category, field: keyof Budget, value: number) => void;
  /** A5-U — the bonus layer, READ-ONLY here. This grid is the BASE editor and
   * nothing in it writes a bonus value; the entry point below opens the mode
   * that does (design-spec §17.5, §17.13/②). */
  bonus: BonusBudget;
  /** A5-U — open the bonus mode. The grid never opens it itself and holds no
   * dialog state; App owns the seam (§17.13/⑤). */
  onOpenBonus: () => void;
}

/**
 * F4 slice C — the 20-Badge-Slot default baseline.
 * `[official 2K page 2026-08-26 + user-confirmed same date]`
 *
 * Every build starts with 20 Badge Slots distributed across the six
 * disciplines. The app has no check anywhere that the six equipSlots numbers
 * sum to anything in particular — a `4` typed where `1` was meant produces a
 * fully-green, internally-consistent, WRONG plan. This is that checksum.
 *
 * IT IS H4 **SOFT**, PERMANENTLY. Never red, never a ⚠, never a chip, never
 * a live region, never gating. TWO independent reasons, recorded here because
 * the next reader will see a cross-field invariant with a known correct value
 * and reach for enforcement:
 *   1. A legitimate total is UNDER 20 for the whole data-entry session —
 *      twelve fields typed by hand over minutes.
 *   2. H4's founding argument: you may not hard-block on a number the user
 *      typed from memory. The default gives that memory a CHECKSUM, not an
 *      authority.
 *
 * A5-U STRUCK THE ORIGINAL LEG 1, IN THE SAME COMMIT AS THE BEHAVIOUR IT
 * JUSTIFIED (design-spec §17.8). It read: "A legitimate total EXCEEDS 20 —
 * bonus Badge Slots are earned (Build Specialization, Seasons, Crew) and
 * reassignable across disciplines, AND NOTHING IN THE APP RECORDS THEM." The
 * app records them now, in a SEPARATE layer that never enters these six
 * fields, so that clause is false and the reason it supported has expired.
 * The rule stands on the two legs above. Leaving a stale justification under a
 * still-correct rule is how the rule gets "corrected" away by a later reader
 * who notices the justification is false — this project has hit that pattern
 * twice already.
 *
 * THE CHECK IS NOW EXACT, and that is a consequence of the user's "don't
 * include the bonus into the original 20" rather than of anything chosen here:
 * Σ base against a base baseline. The guess branch is DELETED — the row may
 * not ASK a question the app can now ANSWER, and "3 bonus Badge Slots?" beside
 * a mode where the user declared 2 is the app arguing with the user.
 *
 * OQ-A3 stays OPEN: no distribution formula, no attribute → Badge Slots
 * mapping. `deriveBudget`'s `derived` arm still throws.
 */
/**
 * The two per-category field maxima, NAMED so the bonus twin can take them by
 * reference instead of by retyping (design-spec §17.4: "each per-category
 * bonus field takes ITS BASE TWIN'S SHIPPED MAX", because it is the same kind
 * of number and that is an existing app convention rather than a claim about
 * 2K).
 *
 * Exported rather than duplicated for one specific reason: `12` is also HALF
 * OF THE USER'S OBSERVATION ("3 extra Badge Slots and 12 Badge Tokens"), which
 * canary 6 forbids appearing anywhere in the A5-U slice as a default, a max or
 * a copy literal. Sharing the constant means the bonus fields inherit an
 * app convention that predates the observation instead of accidentally
 * freezing the observation into a cap.
 */
export const BUDGET_POINTS_MAX = 99;
export const BUDGET_EQUIP_SLOTS_MAX = 12;

const DEFAULT_TOTAL_BADGE_SLOTS = 20;

/** The read-only computed total row, rendered as the grid's <tfoot>. A
 * distinct component so a future global-pool flip is a row swap, not a
 * layout rewrite (design-spec §3.3). */
export function BudgetTotalRow({ budgets }: { budgets: Record<Category, Budget> }) {
  const totalPoints = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + budgets[category].equipSlots,
    0,
  );
  // The `0 = capacity not set` ruling (design-spec §4.7) is checked FIRST and
  // WINS OVER EVERY OTHER STATE, including a coincidental Σ = 20. §4.7
  // suppresses COMPARISONS while never suppressing FACTS — so the annotation
  // disappears and the total itself keeps rendering.
  const anyUnset = CATEGORIES.some((category) => budgets[category].equipSlots === 0);
  // A5-U (design-spec §17.8) — ONE annotation, identical treatment on both
  // sides of 20. No `?`, no guess, no red, no ⚠: the disclosure IS the
  // comparison. Over and under read the same because the case is still H4
  // soft, and because the over case is no longer a mystery the row has to
  // speculate about. Canary 2 pins both halves — the character `?` never
  // appears in this row's output, and the word "bonus" never appears in this
  // annotation.
  const defaultAnnotation = anyUnset ? null : `/ ${DEFAULT_TOTAL_BADGE_SLOTS} default`;
  return (
    <tr className="budget-total-row">
      <td>Total</td>
      <td className="num">{totalPoints}</td>
      <td className="num">
        {totalEquipSlots}
        {defaultAnnotation === null ? null : (
          <>
            {" "}
            <span className="budget-total-row__default-note">{defaultAnnotation}</span>
          </>
        )}
      </td>
    </tr>
  );
}

/** One pool's placed-vs-earned facts, in the words the readout says them in. */
interface BonusPoolFacts {
  singular: string;
  plural: string;
  earned: number;
  placed: number;
}

/** The entry-point readout's parts (design-spec §17.5). Split into a neutral
 * clause and PER-METRIC danger clauses because P0-1 is exactly this: only the
 * pool that is over reddens, and Badge Tokens and Badge Slots are separate
 * facts about separate numbers. */
export interface BonusEntryReadout {
  /** Placed / earned / not-yet-placed, for every pool that is NOT over.
   * Neutral, never --danger, never ⚠ — unplaced bonus is a legitimate resting
   * state (you earned it, you have not decided), and reddening a legal state
   * is the H4 failure mode §4.7 exists to prevent. */
  neutral: string | null;
  /** One clause per over-applied pool. */
  over: string[];
}

/**
 * The readout beside the entry point, or null when there is nothing to say.
 *
 * THE RENDER PREDICATE IS THE ANTI-DISCARD GUARANTEE (design-spec §17.6), and
 * the third clause is the whole of it: `bonusHasContent` is true while ANY
 * placement is non-zero, so zeroing both earned totals does NOT retire this
 * surface — it shows the over-by with every placement intact and editable. No
 * confirm is needed because nothing is confirmed away: prevention is in the
 * predicate, not in a modal asking the user to agree to a loss.
 *
 * A pool with nothing earned and nothing placed is omitted entirely (§3.4's
 * zero-valued-advisory rule), so a slots-only user is never told about zero
 * Badge Tokens.
 */
export function bonusEntryReadout(bonus: BonusBudget): BonusEntryReadout | null {
  if (!bonusHasContent(bonus)) return null;
  const pools: BonusPoolFacts[] = [
    {
      singular: "Badge Token",
      plural: "Badge Tokens",
      earned: bonus.earnedPoints,
      placed: appliedPointsTotal(bonus),
    },
    {
      singular: "Badge Slot",
      plural: "Badge Slots",
      earned: bonus.earnedEquipSlots,
      placed: appliedEquipSlotsTotal(bonus),
    },
  ].filter((pool) => pool.earned > 0 || pool.placed > 0);
  const say = (count: number, pool: BonusPoolFacts) =>
    `${count} ${count === 1 ? pool.singular : pool.plural}`;
  const neutralPools = pools.filter((pool) => pool.placed <= pool.earned);
  const unplaced = neutralPools.filter((pool) => pool.earned - pool.placed > 0);
  const earnedList = neutralPools
    .map((pool) => `${pool.earned} bonus ${pool.earned === 1 ? pool.singular : pool.plural}`)
    .join(" and ");
  return {
    neutral:
      neutralPools.length === 0
        ? null
        : unplaced.length === 0
          ? // Two equal numbers ARE the all-clear; there is no "0 not yet
            // placed" token (§3.4's zero-valued-advisory rule, §17.7).
            `${earnedList} placed.`
          : `${earnedList} earned · ${unplaced
              .map((pool) => say(pool.earned - pool.placed, pool))
              .join(" and ")} not yet placed.`,
    over: pools
      .filter((pool) => pool.placed > pool.earned)
      .map(
        (pool) =>
          `${pool.placed} bonus ${pool.placed === 1 ? pool.singular : pool.plural} placed ` +
          `against ${pool.earned} earned ⚠`,
      ),
  };
}

export function BudgetGrid({ budgets, onCommit, bonus, onOpenBonus }: BudgetGridProps) {
  const hintId = useId();
  const readout = bonusEntryReadout(bonus);
  return (
    <div className="budget-grid">
      <Banner variant="warning">
        Not published by 2K yet — enter these from your MyPlayer builder. Values are unverified.
      </Banner>
      <table aria-describedby={hintId}>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Badge Tokens</th>
            <th scope="col">Badge Slots</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => (
            <tr key={category}>
              <td>{category}</td>
              <td>
                <NumberField
                  label={`${category} Badge Tokens`}
                  value={budgets[category].points}
                  min={0}
                  max={BUDGET_POINTS_MAX}
                  unverified
                  hideLabel
                  onCommit={(value) => {
                    onCommit(category, "points", value);
                  }}
                />
              </td>
              <td>
                <NumberField
                  label={`${category} Badge Slots`}
                  value={budgets[category].equipSlots}
                  min={0}
                  max={BUDGET_EQUIP_SLOTS_MAX}
                  unverified
                  hideLabel
                  onCommit={(value) => {
                    onCommit(category, "equipSlots", value);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <BudgetTotalRow budgets={budgets} />
        </tfoot>
      </table>
      {/* A5-U (design-spec §17.5) — ONE LABEL, ALWAYS. A control whose
          accessible name changes with state is a control a screen reader user
          cannot find twice, so the state lives in the adjacent readout
          instead. This is the ENTIRE zero-state cost of the feature: one
          secondary button, inside a Section that is latched collapsed
          (§17.10, canary 1).
          `size="sm"`, not the `md` §17.10 costed: not one `md` Button renders
          in this app and layout-arithmetic assertion 25 forbids introducing
          the first one. Both sizes clear the I6 touch floor at S through
          `.btn`, which is already in the census. */}
      <div className="budget-grid__actions">
        <Button variant="secondary" size="sm" onClick={onOpenBonus}>
          Bonus Badge Tokens &amp; Badge Slots…
        </Button>
      </div>
      {readout === null ? null : (
        <p className="bonus-readout">
          {readout.neutral === null ? null : <span>{readout.neutral}</span>}
          {readout.over.map((text) => (
            <span className="bonus-readout__over" key={text}>
              {text}
            </span>
          ))}
        </p>
      )}
      <Hint id={hintId}>
        Badge categories. A badge&apos;s category is not its attribute group — e.g. Physical
        Finisher is a Finishing badge that needs Strength.
      </Hint>
    </div>
  );
}
