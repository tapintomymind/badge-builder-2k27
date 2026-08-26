/**
 * LoadoutBoard (F16) — the 2K-native-shaped view of the whole plan.
 *
 * WHAT THIS IS, IN ONE SENTENCE. The grid is the catalogue — what exists, and
 * where you spend. The board is the plan — what you hold, and how full each
 * discipline is.
 *
 * IT IS AN ADDITIONAL VIEW AND THAT IS A HARD CONSTRAINT, not a preference
 * [user 2026-08-26: "This can be an ADDITIONAL view (don't remove any work
 * we've done)"]. Nothing is moved, hidden, re-parented, restyled or
 * superseded. The board is one more <Section> in `.col-right`'s existing page
 * flow, beside the grid, the Synergy Slots panel and the Summary — so:
 *
 *  1. Nothing is ever hidden. Both views are in the same document at the same
 *     time; "switching" is scrolling, or one jump-nav chip.
 *  2. Switching cannot mutate the plan, because there IS no switch. That is a
 *     structural guarantee rather than a procedural one.
 *  3. No route, no tab semantics, no aria-selected, no history entry.
 *  4. Find-in-page still works across both views — still one scroller per
 *     column, and the board declares no scrollport of its own.
 *  5. The <Section>'s own <summary> is a free keyboard bypass for the board's
 *     tab stops: one Tab, one Enter, and every one of them leaves the tab
 *     order.
 *
 * IT DISPATCHES NO CHANGE TO THE BUILD. Not one. The board reads the plan and
 * navigates; its ONE callback sets the grid's FILTER state and moves focus,
 * and its links are ordinary in-page anchors. There is no onSetLevel here,
 * no assignSynergy, no clearSynergy and no
 * setState over the build envelope — so a project that has shipped four
 * data-destruction defects gains ZERO new write paths from this view. Remove
 * and synergy assignment were designed for a detail region that this cut
 * deliberately does not build; both stay where they already ship.
 *
 * WHAT IT DOES NOT SHOW, AND WHY THAT IS A DECISION. Every number on the
 * board is one the engine already computes for another surface. Nothing is
 * modelled that 2K has not published: there is no Badge Slots derivation, no
 * "your build has no Badge Slots here" sentence (the app cannot honestly tell
 * a genuine zero from an un-entered field), no synergy magnitude the state
 * does not carry, and no ranking, scoring or recommendation of any kind.
 */

import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { BadgeDataset, Budget, Build, LoadoutEntry, SynergySlot } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import { boardTilesByCategory } from "./board-model";
import { DisciplinePanel } from "./DisciplinePanel";

export interface LoadoutBoardProps {
  loadout: readonly LoadoutEntry[];
  synergySlots: readonly SynergySlot[];
  build: Build;
  dataset: BadgeDataset;
  readouts: Record<Category, CategoryLedgerReadout>;
  /** The EFFECTIVE budgets — base composed with any placed bonus. Every
   * other surface asks the same record, and asking a different one is how
   * two surfaces come to disagree about whether a discipline is over. */
  budgets: Record<Category, Budget>;
  /** Filter the grid to one discipline and move focus there. */
  onBrowseCategory: (category: Category) => void;
}

export function LoadoutBoard({
  loadout,
  synergySlots,
  build,
  dataset,
  readouts,
  budgets,
  onBrowseCategory,
}: LoadoutBoardProps) {
  const tilesByCategory = boardTilesByCategory({ loadout, synergySlots, build, dataset });

  return (
    <div className="loadout-board">
      {/* ALL SIX, ALWAYS. An empty discipline is information — it is the
          answer to "what have I not touched yet" — and hiding it would make
          the board's shape depend on the plan, which is the one thing a
          picture of the plan must not do. */}
      {CATEGORIES.map((category) => (
        <DisciplinePanel
          key={category}
          category={category}
          readout={readouts[category]}
          budget={budgets[category]}
          tiles={tilesByCategory[category]}
          onBrowse={onBrowseCategory}
        />
      ))}
    </div>
  );
}
