/**
 * DisciplinePanel (F16) — one of the Loadout board's six discipline panels.
 *
 * WHAT IT ANSWERS THAT NOTHING ELSE DOES. The grid is the catalogue: what
 * exists, and where you spend. The board is the plan: what you HOLD, and how
 * full each discipline is. A ledger renders "3 / 5 Badge Slots" as a
 * fraction; this panel renders it as a SHAPE — three filled cells and two
 * empty wells — and renders overspend as two cells sitting outside a fence.
 * That is the same fact read without arithmetic, and it is the clearest thing
 * the board borrows from the in-game screen it echoes.
 *
 * IT BUILDS NO STRING OF ITS OWN. `overByBadgePoints` / `overByBadgeSlots`
 * are imported from CategoryLedger.tsx, whose docstring is explicit that the
 * over-by strings live there "so every other surface renders the SAME text —
 * two surfaces cannot drift again (design-review P0-1)". This panel is their
 * THIRD production consumer, after the in-grid digest and the rail Ledger
 * overview. `badgeSlotsCapacityUnset` comes from the engine, not from a local
 * `=== 0`, because a function that knows what a capacity number MEANS is a
 * rule.
 *
 * PER-METRIC COLOUR, NEVER PER-ROW. --danger lands on the metric that is
 * genuinely over and on nothing else. P0-1's defect — a whole ledger row
 * painted red because one of its two numbers was over, so a value 68 points
 * UNDER budget rendered as overspend — must not reappear on a new surface.
 *
 * 0 = CAPACITY NOT SET, HONOURED EXACTLY. An unset discipline renders the
 * shipped `Badge Slots capacity not set` hint and NO fence, NO empty cells
 * and NO over-by. A fence with every cell outside it is the false alarm
 * design-spec §4.7 exists to prevent, arriving in a new costume. The
 * predicate is asked of the EFFECTIVE budget, which is what §17.9 ruled and
 * what every other surface asks: `equipSlots === 0` iff base 0 AND no bonus
 * placed, so a discipline with a base of zero and a placed Bonus Badge Slot
 * is ENTERED and gets a real capacity of one.
 *
 * WHAT IT DOES NOT RENDER, because the data does not exist. There is no
 * "your build has no Badge Slots in this discipline" state, because the app
 * has no channel that can tell a genuine zero from an un-entered field. 2K's
 * own screen has that sentence; ours cannot honestly say it yet, and the
 * ruling in force is that the two cases render IDENTICALLY until a separate
 * "entered" channel exists. Inventing the distinction here would be
 * inventing 2K27 data.
 */

import { badgeSlotsCapacityUnset } from "../../engine/ledger";
import type { Badge, Budget, LoadoutEntry, SynergyRole } from "../../engine/types";
import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { Category } from "../../engine/vocabulary";
import { overByBadgePoints, overByBadgeSlots } from "../grid/CategoryLedger";
import { EmptyTile, PurchasedTile } from "./BadgeTile";

/** One purchased badge, with everything the tile needs already read out of
 * the engine by the board. The panel does no engine work of its own beyond
 * the two shared string builders and the unset predicate. */
export interface BoardTileData {
  badge: Badge;
  entry: LoadoutEntry;
  cost: number | null;
  role: SynergyRole | null;
  stale: boolean;
  href: string;
}

export interface DisciplinePanelProps {
  category: Category;
  readout: CategoryLedgerReadout;
  /** The EFFECTIVE budget — base composed with any placed bonus. */
  budget: Budget;
  /** Purchased badges in this discipline, in DATASET order: never sorted,
   * never ranked. The app shows what fits; the user chooses. */
  tiles: readonly BoardTileData[];
  onBrowse: (category: Category) => void;
}

export function DisciplinePanel({
  category,
  readout,
  budget,
  tiles,
  onBrowse,
}: DisciplinePanelProps) {
  const headingId = `board-panel-${category.toLowerCase()}`;
  const pointsOverText = overByBadgePoints(readout);
  const equipSlotsOverText = overByBadgeSlots(readout, budget);
  const capacityUnset = badgeSlotsCapacityUnset(budget);

  /** How many cells sit inside the fence. An unset capacity fences nothing,
   * so every cell is inside it. */
  const withinCapacity = capacityUnset ? tiles.length : Math.min(tiles.length, budget.equipSlots);
  const inside = tiles.slice(0, withinCapacity);
  const outside = tiles.slice(withinCapacity);
  const emptyCount = capacityUnset ? 0 : Math.max(0, budget.equipSlots - tiles.length);

  return (
    <section className="board-panel" data-category={category.toLowerCase()} aria-labelledby={headingId}>
      <h3 className="board-panel__title" id={headingId}>
        {category}
      </h3>

      {/* THE HEADER WRAPS BY DESIGN, and the wrap is declared rather than
          discovered. Both capacities are user-entered with no published cap,
          so the string has no bounded width and "one line" could never be a
          floor. Same posture as `.badge-card__meta`'s declared wrap. */}
      <p className="board-panel__metrics">
        <span
          className={
            pointsOverText === null
              ? "board-panel__metric"
              : "board-panel__metric board-panel__metric--over"
          }
        >
          Badge Points{" "}
          <span className="num">
            {readout.spent}/{budget.points}
          </span>
          {pointsOverText === null ? null : ` ${pointsOverText}`}
        </span>
        {pointsOverText === null ? (
          <span className="board-panel__metric">
            left <span className="num">{readout.remainingPoints}</span>
          </span>
        ) : null}
        <span
          className={
            equipSlotsOverText === null
              ? "board-panel__metric"
              : "board-panel__metric board-panel__metric--over"
          }
        >
          Badge Slots{" "}
          <span className="num">
            {readout.equipSlotsUsed}/{capacityUnset ? "—" : budget.equipSlots}
          </span>
          {equipSlotsOverText === null ? null : ` ${equipSlotsOverText}`}
        </span>
      </p>

      {capacityUnset ? <p className="board-panel__hint">Badge Slots capacity not set</p> : null}

      {tiles.length === 0 && emptyCount === 0 ? (
        <p className="board-panel__empty-note">
          No badges purchased.{" "}
          <button
            type="button"
            className="board-panel__browse"
            onClick={() => {
              onBrowse(category);
            }}
          >
            Browse {category} badges
          </button>
        </p>
      ) : (
        <ul className="board-panel__tiles">
          {inside.map((tile) => (
            <li key={tile.badge.id}>
              <PurchasedTile {...tile} />
            </li>
          ))}
          {Array.from({ length: emptyCount }, (_unused, index) => (
            <li key={`empty-${String(index)}`}>
              <EmptyTile
                category={category}
                onBrowse={() => {
                  onBrowse(category);
                }}
              />
            </li>
          ))}
          {outside.length === 0 ? null : (
            <>
              {/* THE FENCE. It changes no behaviour: nothing below it is
                  disabled, the badges still spend points, still hold synergy
                  roles and still refund. The seed's rule is "allow overspend
                  but render remaining in red — don't hard-block, this is a
                  planning tool", and this is that rule rendered as a shape.
                  Its label is the SHIPPED over-by string, never a local one. */}
              <li className="board-panel__fence" aria-hidden="true">
                <span className="board-panel__fence-label">{equipSlotsOverText}</span>
              </li>
              {outside.map((tile) => (
                <li key={tile.badge.id} data-over-capacity="true">
                  <PurchasedTile {...tile} />
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </section>
  );
}
