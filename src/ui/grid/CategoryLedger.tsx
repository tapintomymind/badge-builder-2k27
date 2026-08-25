/**
 * CategoryLedger (design-spec §3.4, §5.3 rev 2) — the per-category status
 * surface. TWO pieces now, per the rev-2 sticky budget:
 *
 *  - `.category-ledger` (the DIGEST): title + one compact row — Badge Points
 *    spent/pool with left/over-by, Badge Slots used/capacity with over-by.
 *    THIS is the sticky layer (layer 2 of the global two-layer cap).
 *  - `.category-ledger__lede`: the meter, `refunded N` (suppressed at zero),
 *    the feasibility line, the "capacity not set" hint, and the H2 projection
 *    row. Lede content SCROLLS AWAY — that is what makes the sticky budget
 *    achievable.
 *
 * H4 (scope.md §3): points overspend and Badge Slots overflow are the SOFT
 * budget class — `over by N` renders in danger red with a ⚠ glyph and a
 * hatched meter overflow (never color alone), and NO control anywhere
 * becomes disabled because of it. The over-by STRINGS are built here by
 * `overByBadgePoints` / `overByBadgeSlots` and exported so every other
 * surface (rail Ledger overview) renders the SAME text — two surfaces
 * cannot drift again (design-review P0-1).
 *
 * "0 = unset" Badge Slots capacity (orchestrator-ratified ruling): a
 * capacity of 0 means "not entered" → NO overflow warning fires anywhere;
 * instead ONE neutral per-category hint ("Badge Slots capacity not set")
 * renders in the lede. A genuinely-entered 0 is indistinguishable and
 * acceptable for this planner. `overByBadgeSlots` encodes the rule, so all
 * four consuming surfaces stay uniform. The PREDICATE itself was hoisted to
 * `src/engine/ledger.ts` in F8-E1 (a function that knows what a capacity
 * number MEANS is a rule, and the engine cannot import from src/ui/); this
 * file imports it and deliberately re-exports NOTHING.
 *
 * H2 (M4): the PRIMARY rows always render the "current"-basis readout the
 * App computed — `projection` is a SEPARATE postSeasonReset readout that is
 * provided only while the season-reset preview is on and renders as a
 * SECOND, EXPLICITLY-LABELLED row. It NEVER replaces the primary numbers.
 *
 * Every number is an engine readout (synergy-ledger's categoryLedgerAt);
 * this component contains zero arithmetic beyond formatting.
 */

import { badgeSlotsCapacityUnset } from "../../engine/ledger";
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

/** The canonical Badge Points over-by string, or null when within budget.
 * SHARED by the in-grid digest and the rail Ledger overview (P0-1: one
 * builder, two surfaces, zero drift). */
export function overByBadgePoints(readout: CategoryLedgerReadout): string | null {
  return readout.remainingPoints < 0 ? `over by ${-readout.remainingPoints} ⚠` : null;
}

/** The canonical Badge Slots over-by string, or null when within capacity —
 * and ALWAYS null while the capacity is unset (0 = unset ruling). */
export function overByBadgeSlots(
  readout: CategoryLedgerReadout,
  budget: Budget,
): string | null {
  if (badgeSlotsCapacityUnset(budget)) return null;
  return readout.equipSlotsUsed > budget.equipSlots
    ? `over by ${readout.equipSlotsUsed - budget.equipSlots} ⚠`
    : null;
}

/** The §3.6 feasibility phrasing — upgrade COUNTS, never tier-cost
 * arithmetic and never a recommendation. An unset capacity constrains
 * nothing (0 = unset ruling). */
function feasibilityText(
  readout: CategoryLedgerReadout,
  budget: Budget,
  feasibility: CategoryFeasibility,
): string {
  const pts = readout.remainingPoints;
  const capacityUnset = badgeSlotsCapacityUnset(budget);
  const equipSlotsLeft = budget.equipSlots - readout.equipSlotsUsed;
  if (!capacityUnset && equipSlotsLeft <= 0) {
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
  if (capacityUnset) {
    return `${pts} pts left → ${n} upgrade${n === 1 ? "" : "s"} still affordable`;
  }
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
  const pointsOverText = overByBadgePoints(readout);
  const equipSlotsOverText = overByBadgeSlots(readout, budget);
  const capacityUnset = badgeSlotsCapacityUnset(budget);
  const over = pointsOverText !== null || equipSlotsOverText !== null;
  const showProjection = projection !== undefined && projectionDiffers(readout, projection);
  const projectionOver = projection !== undefined && projection.remainingPoints < 0;

  return (
    <>
      <div className={`category-ledger${over ? " category-ledger--over" : ""}`}>
        <h2 id={headingId}>{category}</h2>
        <div className="category-ledger__row">
          <span>
            Badge Points{" "}
            <span className="num">
              {readout.spent} / {budget.points}
            </span>
          </span>
          {pointsOverText !== null ? (
            <span className="ledger-over num">{pointsOverText}</span>
          ) : (
            <span>
              left <span className="num">{readout.remainingPoints}</span>
            </span>
          )}
          <span>
            Badge Slots{" "}
            <span className="num">
              {capacityUnset ? readout.equipSlotsUsed : `${readout.equipSlotsUsed} / ${budget.equipSlots}`}
            </span>
          </span>
          {equipSlotsOverText !== null ? (
            <span className="ledger-over num">{equipSlotsOverText}</span>
          ) : null}
        </div>
      </div>
      <div className="category-ledger__lede">
        <Meter label={`${category} Badge Points`} value={readout.spent} max={budget.points} />
        {readout.refunded > 0 ? (
          <div className="category-ledger__row">
            <span>
              refunded <span className="num">{readout.refunded}</span>
            </span>
          </div>
        ) : null}
        {capacityUnset ? (
          <p className="category-ledger__hint">Badge Slots capacity not set</p>
        ) : null}
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
    </>
  );
}
