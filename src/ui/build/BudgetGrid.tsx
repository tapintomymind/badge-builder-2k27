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

/** The read-only computed total row, rendered as the grid's <tfoot>. A
 * distinct component so a future global-pool flip is a row swap, not a
 * layout rewrite (design-spec §3.3). */
export function BudgetTotalRow({ budgets }: { budgets: Record<Category, Budget> }) {
  const totalPoints = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + budgets[category].equipSlots,
    0,
  );
  return (
    <tr className="budget-total-row">
      <td>Total</td>
      <td className="num">{totalPoints}</td>
      <td className="num">{totalEquipSlots}</td>
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
