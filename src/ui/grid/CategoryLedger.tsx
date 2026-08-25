/**
 * CategoryLedger (design-spec §3.4) — the per-category status bar, which IS
 * the grid group's sticky header (one component, not two).
 *
 * H4 (scope.md §3): points overspend and Badge Slots overflow are the SOFT
 * budget class — `over by N` renders in danger red with a ⚠ glyph and a
 * hatched meter overflow (never color alone), and NO control anywhere
 * becomes disabled because of it.
 *
 * H2 (M4): the PRIMARY rows always render the "current"-basis readout the
 * App computed — `projection` is a SEPARATE postSeasonReset readout that is
 * provided only while the season-reset preview is on and renders as a
 * SECOND, EXPLICITLY-LABELLED row. It NEVER replaces the primary numbers: a
 * number never changes meaning without changing label. The projection row
 * appears only when it actually differs from the primary (categories that do
 * not change show nothing — the PreviewModeStrip states the count).
 *
 * M4 feasibility line (design-spec §3.6): a pre-aggregated count over engine
 * outputs — see src/ui/grid/feasibility.ts. No arithmetic rule lives here.
 *
 * Every number is an engine readout (synergy-ledger's categoryLedgerAt);
 * this component contains zero arithmetic beyond formatting.
 */

import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { Meter } from "../primitives/Meter";
import type { CategoryFeasibility } from "./feasibility";

/** Does the postSeasonReset readout differ from the primary at all? Pure
 * comparison of two engine outputs. */
export function projectionDiffers(
  primary: CategoryLedgerReadout,
  projection: CategoryLedgerReadout,
): boolean {
  return (
    primary.spent !== projection.spent ||
    primary.refunded !== projection.refunded ||
    primary.remainingPoints !== projection.remainingPoints ||
    primary.equipSlotsUsed !== projection.equipSlotsUsed
  );
}

/** The §3.6 feasibility phrasing — upgrade COUNTS, never tier-cost
 * arithmetic and never a recommendation. */
function feasibilityText(
  readout: CategoryLedgerReadout,
  budget: Budget,
  feasibility: CategoryFeasibility,
): string {
  const pts = readout.remainingPoints;
  const equipSlotsLeft = budget.equipSlots - readout.equipSlotsUsed;
  if (equipSlotsLeft <= 0) {
    if (feasibility.affordableOwnedUpgrades > 0) {
      const n = feasibility.affordableOwnedUpgrades;
      return `${pts} pts · 0 Badge Slots left → ${n} upgrade${n === 1 ? "" : "s"} to badges you already own; new badges would go over Badge Slots.`;
    }
    return `${pts} pts left → nothing else fits at these prices.`;
  }
  if (feasibility.affordableUpgrades === 0) {
    return `${pts} pts left → nothing else fits at these prices.`;
  }
  const n = feasibility.affordableUpgrades;
  return `${pts} pts · ${equipSlotsLeft} Badge Slot${equipSlotsLeft === 1 ? "" : "s"} left → ${n} upgrade${n === 1 ? "" : "s"} still affordable`;
}

export interface CategoryLedgerProps {
  category: Category;
  readout: CategoryLedgerReadout;
  budget: Budget;
  /** id for the heading, so the parent section can be aria-labelledby it. */
  headingId: string;
  /** M4: the pre-aggregated affordable-upgrade counts for this category. */
  feasibility?: CategoryFeasibility;
  /** M4: the postSeasonReset readout — pass ONLY while the season-reset
   * preview is on. Renders the labelled projection row; never the primary. */
  projection?: CategoryLedgerReadout;
}

export function CategoryLedger({
  category,
  readout,
  budget,
  headingId,
  feasibility,
  projection,
}: CategoryLedgerProps) {
  const pointsOver = readout.remainingPoints < 0;
  const equipSlotsOver = readout.equipSlotsUsed > budget.equipSlots;
  const over = pointsOver || equipSlotsOver;
  const showProjection = projection !== undefined && projectionDiffers(readout, projection);
  const projectionOver = projection !== undefined && projection.remainingPoints < 0;

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
      {feasibility !== undefined ? (
        <p className="category-ledger__feasibility num">
          {feasibilityText(readout, budget, feasibility)}
        </p>
      ) : null}
      {showProjection ? (
        <p className="category-ledger__projection num">
          ⟳ After season reset · Badge Points {projection.spent} / {budget.points} ·{" "}
          {projectionOver
            ? `over by ${-projection.remainingPoints} ⚠`
            : `left ${projection.remainingPoints}`}{" "}
          · refunded {projection.refunded}
        </p>
      ) : null}
    </div>
  );
}
