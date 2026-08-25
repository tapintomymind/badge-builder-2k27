/**
 * BudgetGrid (design-spec §3.3) — six Category rows of manual Badge Points +
 * Badge Slots inputs, behind the deriveBudget seam, with an auto-summed
 * read-only total footer (BudgetTotalRow). The whole section carries ONE
 * unverified banner — the derivation is unpublished 2K27 data (Open item #3)
 * and twelve per-field icons would say it worse.
 *
 * Category ≠ AttrGroup (H7): same six words, different axes — the hint below
 * the grid states it so nobody reads them as one.
 */

import { useId } from "react";
import type { Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Hint } from "../primitives/Hint";
import { NumberField } from "../primitives/NumberField";

export interface BudgetGridProps {
  budgets: Record<Category, Budget>;
  onCommit: (category: Category, field: keyof Budget, value: number) => void;
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
 * a live region, never gating. Three independent reasons, recorded here
 * because the next reader will see a cross-field invariant with a known
 * correct value and reach for enforcement:
 *   1. A legitimate total EXCEEDS 20 — bonus Badge Slots are earned (Build
 *      Specialization, Seasons, Crew) and reassignable across disciplines,
 *      and nothing in the app records them.
 *   2. A legitimate total is UNDER 20 for the whole data-entry session —
 *      twelve fields typed by hand over minutes.
 *   3. H4's founding argument: you may not hard-block on a number the user
 *      typed from memory. The default gives that memory a CHECKSUM, not an
 *      authority.
 *
 * OQ-A3 stays OPEN: no distribution formula, no attribute → Badge Slots
 * mapping. `deriveBudget`'s `derived` arm still throws.
 */
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
  const overBy = totalEquipSlots - DEFAULT_TOTAL_BADGE_SLOTS;
  let defaultAnnotation: string | null = null;
  if (!anyUnset) {
    defaultAnnotation =
      overBy > 0
        ? `/ ${DEFAULT_TOTAL_BADGE_SLOTS} default — ${overBy} bonus Badge Slots?`
        : `/ ${DEFAULT_TOTAL_BADGE_SLOTS} default`;
  }
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

export function BudgetGrid({ budgets, onCommit }: BudgetGridProps) {
  const hintId = useId();
  return (
    <div className="budget-grid">
      <Banner variant="warning">
        Not published by 2K yet — enter these from your MyPlayer builder. Values are unverified.
      </Banner>
      <table aria-describedby={hintId}>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Badge Points</th>
            <th scope="col">Badge Slots</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => (
            <tr key={category}>
              <td>{category}</td>
              <td>
                <NumberField
                  label={`${category} Badge Points`}
                  value={budgets[category].points}
                  min={0}
                  max={99}
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
                  max={12}
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
      <Hint id={hintId}>
        Badge categories. A badge&apos;s category is not its attribute group — e.g. Physical
        Finisher is a Finishing badge that needs Strength.
      </Hint>
    </div>
  );
}
