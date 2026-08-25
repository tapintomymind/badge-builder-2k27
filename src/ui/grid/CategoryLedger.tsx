/**
 * CategoryLedger (design-spec §3.4) — the per-category status bar, which IS
 * the grid group's sticky header (one component, not two).
 *
 * H4 (scope.md §3): points overspend and Badge Slots overflow are the SOFT
 * budget class — `over by N` renders in danger red with a ⚠ glyph and a
 * hatched meter overflow (never color alone), and NO control anywhere
 * becomes disabled because of it.
 *
 * Every number is an engine readout (synergy-ledger's categoryLedgerAt);
 * this component contains zero arithmetic beyond formatting.
 */

import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { Meter } from "../primitives/Meter";

export interface CategoryLedgerProps {
  category: Category;
  readout: CategoryLedgerReadout;
  budget: Budget;
  /** id for the heading, so the parent section can be aria-labelledby it. */
  headingId: string;
}

export function CategoryLedger({ category, readout, budget, headingId }: CategoryLedgerProps) {
  const pointsOver = readout.remainingPoints < 0;
  const equipSlotsOver = readout.equipSlotsUsed > budget.equipSlots;
  const over = pointsOver || equipSlotsOver;

  return (
    <div className={`category-ledger${over ? " category-ledger--over" : ""}`}>
      <h2 id={headingId}>{category}</h2>
      <div className="category-ledger__row">
        <span>
          Badge Points{" "}
          <span className="num">
            {readout.spent} / {budget.points}
          </span>
        </span>
        {pointsOver ? (
          <span className="ledger-over num">over by {-readout.remainingPoints} ⚠</span>
        ) : (
          <span>
            left <span className="num">{readout.remainingPoints}</span>
          </span>
        )}
        <span>
          refunded <span className="num">{readout.refunded}</span>
        </span>
      </div>
      <Meter label={`${category} Badge Points`} value={readout.spent} max={budget.points} />
      <div className="category-ledger__row">
        <span>
          Badge Slots{" "}
          <span className="num">
            {readout.equipSlotsUsed} / {budget.equipSlots}
          </span>
        </span>
        {equipSlotsOver ? (
          <span className="ledger-over num">
            over by {readout.equipSlotsUsed - budget.equipSlots} ⚠
          </span>
        ) : null}
      </div>
    </div>
  );
}
