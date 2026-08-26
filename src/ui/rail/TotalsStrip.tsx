/**
 * TotalsStrip (R12 — the workbench re-cut; user ruling 2026-08-26, approved
 * from the workbench mockup) — the build rail's PINNED header: all six
 * category ledgers as compact two-line cells, permanently on screen at L.
 *
 * THIS IS THE LEDGER OVERVIEW'S SUCCESSOR, not a new readout. R12 collapses
 * the five surfaces that each partially rendered the six category totals
 * (ledger overview, in-grid digests, Loadout-board tiles, summary spend
 * table, budget entry grid) down to two: THIS strip (always visible) and the
 * in-grid digests (contextual). The numbers come from the identical engine
 * calls the overview made — categoryLedgerAt readouts composed in App, the
 * ledger's own over-by string builders, badgeSlotsCapacityUnset — and no
 * arithmetic is performed here (seed: Working agreements #1).
 *
 * WHY CELLS DODGE THE FORECLOSED THIRD COLUMN. The pre-R12 stylesheet
 * foreclosed any third column on arithmetic: a ONE-LINE-per-category ledger
 * row demands 239px of content box, which no rail the centre could afford
 * would ever hold. The strip's cell is TWO lines — name above, numbers below
 * — so its floor is the widest of (category name at 10px caps, `NN/NN ⚠ ·
 * NN/NN` in --font-num 11px), ~78px, and three cells fit a 348px rail with
 * margin. The old arithmetic was right about the old row; it does not bind
 * the cell.
 *
 * CHANNEL RULE (§2.8.1): the category hue is IDENTITY and lands on the NAME
 * text only. Over-state is --danger and lands on the NUMBERS only, with the
 * ⚠ glyph and an sr-only sentence carrying it — never colour alone (§6).
 * The two channels never touch the same node.
 *
 * `Edit budgets…` is the entry point to the base-budget editor
 * (BudgetsDialog). ENTRY AND MONITORING ARE DIFFERENT SURFACES — conflating
 * them is how the setup panel came to spend 560px of the old scroll lead —
 * so the strip renders readouts and opens the editor, and no field is
 * editable here.
 */

import { badgeSlotsCapacityUnset } from "../../engine/ledger";
import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import { overByBadgePoints, overByBadgeSlots } from "../grid/CategoryLedger";
import { Button } from "../primitives/Button";

export interface TotalsStripProps {
  /** Primary readouts — ALWAYS the "current" basis (H2). Never overlay-fed. */
  readouts: Record<Category, CategoryLedgerReadout>;
  /** The EFFECTIVE budgets (base + bonus), same record the grid and the old
   * overview consumed — asking a different record is how two surfaces come
   * to disagree about whether a discipline is over. */
  budgets: Record<Category, Budget>;
  onEditBudgets: () => void;
  /**
   * R12 slice 3 — WHICH SHELL IS ASKING, and it changes the arrangement only.
   *
   * `rail` (default) is the L build rail's 3×2 cell grid. `bar` is the phone
   * dock's single horizontally-scrolling row above the tab bar.
   *
   * ONE COMPONENT, TWO ARRANGEMENTS, and deliberately not two components: the
   * six cells are the same engine readouts, the same over-by string builders
   * and the same §2.8.1 channel rule at both widths. A second phone-only
   * totals component is how two surfaces come to disagree about whether a
   * discipline is over — which is the exact defect R12 collapsed five
   * surfaces down to two to prevent.
   */
  variant?: "rail" | "bar";
}

/** One metric span: `spent/capacity`, danger + ⚠ + sr-only sentence when the
 * ledger's own string builder says it is over. The builder's sentence is the
 * single source of the phrasing (F16 test 10's rule — no second over-by
 * string is ever composed in the UI). */
function Metric({
  spent,
  capacityText,
  overText,
  kind,
}: {
  spent: number;
  capacityText: string;
  overText: string | null;
  kind: string;
}) {
  return (
    <span className={overText !== null ? "ledger-over totals-strip__metric" : "totals-strip__metric"}>
      {spent}/{capacityText}
      {overText !== null ? (
        <>
          {" ⚠"}
          <span className="sr-only">
            {" "}
            {kind} {overText}
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * R12 slice 3 — the phone bar's three-letter category labels.
 *
 * A DISPLAY ABBREVIATION, not a rename: the rail's strip, the grid's
 * digests, the board and the summary all keep the full word, and the
 * sr-only over-by sentences beside these abbreviations spell the full
 * category out for assistive tech. This map exists because the alternative
 * measured badly — a CSS truncation of the full name renders "Fi…", "Sh…",
 * "Pl…", which is not shorter reading, only worse reading, and the full
 * words make the six-chip row about 1,020px wide on a 375px screen.
 *
 * SPELLED OUT PER CATEGORY rather than sliced from the name, because
 * `Playmaking`.slice(0, 3) is "Pla" and `Physicals`.slice(0, 3) is "Phy" —
 * two labels one character apart in the app's two most-confusable pair.
 * Written down, they are PLY and PHY.
 */
const CATEGORY_SHORT: Record<Category, string> = {
  Finishing: "FIN",
  Shooting: "SHO",
  Playmaking: "PLY",
  Defense: "DEF",
  Rebounding: "REB",
  Physicals: "PHY",
};

export function TotalsStrip({
  readouts,
  budgets,
  onEditBudgets,
  variant = "rail",
}: TotalsStripProps) {
  return (
    <aside
      className={variant === "bar" ? "totals-strip totals-strip--bar" : "totals-strip"}
      aria-label="Build totals"
    >
      <div className="totals-strip__grid">
        {CATEGORIES.map((category) => {
          const readout = readouts[category];
          const budget = budgets[category];
          const pointsOverText = overByBadgePoints(readout);
          const equipSlotsOverText = overByBadgeSlots(readout, budget);
          const capacityUnset = badgeSlotsCapacityUnset(budget);
          return (
            <div key={category} className="totals-strip__cell" data-category={category}>
              <span className="totals-strip__name">
                {variant === "bar" ? CATEGORY_SHORT[category] : category}
                {variant === "bar" ? <span className="sr-only"> {category}</span> : null}
              </span>
              <span className="num totals-strip__nums">
                <Metric
                  spent={readout.spent}
                  capacityText={String(budget.points)}
                  overText={pointsOverText}
                  kind="Badge Tokens"
                />
                {" · "}
                <Metric
                  spent={readout.equipSlotsUsed}
                  capacityText={capacityUnset ? "—" : String(budget.equipSlots)}
                  overText={equipSlotsOverText}
                  kind="Badge Slots"
                />
              </span>
            </div>
          );
        })}
      </div>
      <div className="totals-strip__actions">
        <Button variant="ghost" size="sm" onClick={onEditBudgets}>
          Edit budgets…
        </Button>
      </div>
    </aside>
  );
}
