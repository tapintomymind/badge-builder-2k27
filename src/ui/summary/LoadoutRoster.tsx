/**
 * LoadoutRoster + RosterGroup + RosterRow (design-spec §14.2 / §14.4).
 *
 * THE GAP THIS CLOSES. Before this file, no surface in the app named the
 * badges you actually bought: `SummaryPanel` rendered two tallies and zero
 * badge names, and the only place a badge name appeared was the 53-card grid,
 * where ~11 purchases sit scattered among ~42 non-purchases. The project's
 * acceptance bar is "the numbers reconcile with what the game shows"
 * [scope.md §1] and reconciliation is LINE BY LINE. A tally cannot be
 * reconciled against a game screen; a roster can.
 *
 * ZERO ARITHMETIC LIVES HERE. Every number is read off `BuildSummary`
 * (src/engine/summary.ts) and every stateful token is built by the SHARED
 * over-by builders in `CategoryLedger` — the same two functions the in-grid
 * digest and the rail overview call, so the four surfaces cannot drift
 * (design-review P0-1). A cost derivation, a step enumerator or a stale
 * predicate appearing in this file would be the single largest breach of the
 * engine/UI separation this project has had the opportunity to make
 * [seed: Working agreements #1].
 *
 * H2 — WHY NOTHING HERE CAN MOVE UNDER AN OVERLAY. `buildSummary` takes no
 * `OverlayState` and never will; that is a signature-level control, not
 * discipline. Every column reads it:
 *   name / tier        dataset
 *   purchased level    entry.purchasedLevel
 *   effective level    committedEffectiveLevel — the NEUTRAL overlay, exactly
 *                      the call the shipped counts table already makes
 *   cost               RosterRow.cost, "current" basis
 *   <tfoot>            the "current"-basis readout
 * `synergyProjections()` — the selector whose field is literally called
 * `activatesTo` — is consumed by `SynergyDigest` and nowhere else. Reading it
 * into the effective-level column, or a `postSeasonReset` readout into the
 * <tfoot>, both look reasonable and both redden the ship gate.
 *
 * §14.6's OPTIONAL PER-ROW PROJECTION ELEMENT IS DELIBERATELY NOT BUILT, and
 * the reason is mechanical rather than a preference: `tests/ui/overlays.test.tsx`
 * compares the WHOLE `.summary` subtree's textContent across all four overlay
 * combinations, not a column list. Any overlay-dependent node anywhere inside
 * `.summary` reddens that gate, and it is RUN-never-edit. A labelled
 * projection in the roster therefore cannot ship without first re-cutting the
 * gate's selector list, which is a design question. Not rendering one leaves
 * the roster overlay-invariant end to end, which is what §14.6 wanted.
 *
 * NO PIN COLUMN. It is F8-R2's, and it is not stubbed, not reserved and not
 * rendered disabled — an empty <td> would take the layout decision away from
 * the slice that owns the control.
 *
 * NO @container / display:block RESPONSIVE TABLE. See the .summary-roster
 * block in app.css: it strips the table role from the accessibility tree
 * silently, and <caption> + <th scope> + row/column association is this
 * component's whole screen-reader value.
 */

import type { BuildSummary, CategorySummary, RosterRow } from "../../engine/summary";
import { rowIsBoosted } from "../../engine/summary";
import type { Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { LEVEL_LABELS } from "../../engine/vocabulary";
import { overByBadgePoints, overByBadgeSlots } from "../grid/CategoryLedger";
import { Chip } from "../primitives/Chip";

/**
 * The <tfoot> digest, in parts, so `--danger` can land PER-METRIC rather than
 * per-row (P0-1). The two stateful tokens come from `CategoryLedger`'s
 * exported builders — §3.4's "one string builder, three consumers" becomes
 * four — and this call site adds no `⚠` and no `over by` of its own.
 *
 * Exported so the roster test can assert the rendered <tfoot> against the
 * builders directly rather than against a transcribed string.
 */
export interface RosterDigestParts {
  /** New here, and it is the count of rows in THIS table — so it can never
   *  disagree with what is rendered above it. */
  badges: string;
  points: string;
  /** `left N` or the builder's `over by N ⚠`. */
  pointsStatus: string;
  pointsOver: boolean;
  /** `3 / 3 Badge Slots`, or `capacity not set` with NO fraction (§4.7
   *  consequence 11: an unset capacity constrains nothing, so it can never be
   *  over and never renders a comparison). */
  badgeSlots: string;
  /** The builder's `over by N ⚠`, or null. Always null while unset. */
  badgeSlotsOver: string | null;
}

export function rosterDigestParts(
  summary: CategorySummary,
  budget: Budget,
): RosterDigestParts {
  const pointsOverText = overByBadgePoints(summary.readout);
  const count = summary.rows.length;
  return {
    badges: `${count} badge${count === 1 ? "" : "s"}`,
    points: `${summary.readout.spent} / ${budget.points} pts`,
    pointsStatus: pointsOverText ?? `left ${summary.readout.remainingPoints}`,
    pointsOver: pointsOverText !== null,
    badgeSlots: summary.badgeSlotsCapacityUnset
      ? "capacity not set"
      : `${summary.readout.equipSlotsUsed} / ${summary.equipSlotCapacity} Badge Slots`,
    badgeSlotsOver: overByBadgeSlots(summary.readout, budget),
  };
}

/** `Rebounding or Physicals` / `Finishing, Defense or Physicals`. Grammar
 *  only — the LIST is the engine's (`CategorySummary.rows.length === 0`). */
function joinWithOr(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1] as string}`;
}

/** `⚡` = Fuse, `↺` = Reaction. */
function roleGlyph(kind: "fuse" | "reaction"): string {
  return kind === "fuse" ? "⚡" : "↺";
}

// ---------------------------------------------------------------------------
// RosterRow — one purchased badge, on one line at a group box ≥ 444px.
// ---------------------------------------------------------------------------

function RosterRowCells({ row }: { row: RosterRow }) {
  const boosted = rowIsBoosted(row);
  return (
    <tr>
      <th scope="row" className="summary-roster__name">
        {row.name}
      </th>
      <td className="summary-roster__tier">
        <Chip variant="tier">{row.tier}</Chip>
      </td>
      <td className="summary-roster__level" data-purchased-level={row.purchasedLevel}>
        {LEVEL_LABELS[row.purchasedLevel]}
      </td>
      <td className="summary-roster__effective">
        {boosted ? (
          <>
            {"→ "}
            <span
              className="summary-roster__effective-level"
              data-effective-level={row.committedEffectiveLevel}
            >
              {LEVEL_LABELS[row.committedEffectiveLevel]}
            </span>
            {row.synergyRole !== null
              ? ` ${roleGlyph(row.synergyRole.kind)}${row.synergyRole.synergySlotId}`
              : ""}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="summary-roster__cost num">{row.cost}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// RosterGroup — one category with at least one purchase.
// ---------------------------------------------------------------------------

export interface RosterGroupProps {
  summary: CategorySummary;
  budget: Budget;
}

export function RosterGroup({ summary, budget }: RosterGroupProps) {
  const digest = rosterDigestParts(summary, budget);
  return (
    <div className="summary-roster__group" data-category={summary.category.toLowerCase()}>
      <table className="summary-roster__table">
        {/* §14.3: the ONE permitted --cat-* surface in the whole summary, and
            it carries IDENTITY ONLY — `--danger` never overrides it at
            overspend (I10). State lives in the <tfoot>, per-metric. */}
        <caption className="summary-roster__caption">{summary.category}</caption>
        <thead className="summary-roster__head">
          <tr>
            {/* A column header for a name column is noise on screen and
                required off it. */}
            <th scope="col" className="sr-only">
              Badge
            </th>
            <th scope="col" className="sr-only">
              Tier
            </th>
            <th scope="col">lvl</th>
            <th scope="col">eff</th>
            <th scope="col">cost</th>
          </tr>
        </thead>
        <tbody>
          {/* DATASET ORDER — `buildSummary` filters the dataset rather than
              the loadout, so the order is the dataset's. Sorting by level or
              cost would be a ranking by another name (§14.1 item 8). */}
          {summary.rows.map((row) => (
            <RosterRowFragment key={row.badgeId} row={row} />
          ))}
        </tbody>
        <tfoot className="summary-roster__foot">
          <tr>
            <td colSpan={5}>
              <span className="summary-roster__digest">
                <span>{digest.badges}</span>
                <span className="num">{digest.points}</span>
                <span className={digest.pointsOver ? "ledger-over num" : "num"}>
                  {digest.pointsStatus}
                </span>
                <span className="num">{digest.badgeSlots}</span>
                {digest.badgeSlotsOver !== null ? (
                  <span className="ledger-over num">{digest.badgeSlotsOver}</span>
                ) : null}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * A row plus, when the purchase is stale, its spanning disclosure.
 *
 * THE SAME PREDICATE AND THE SAME REASON STRINGS as the card, the ledger
 * lede, the drift list and the Build-panel roll-up: all five read one engine
 * condition (`entryIsStale` → `RosterRow.stale`) and interpolate one engine
 * reason array (`RosterRow.staleReasons`). Nothing about WHICH badges are
 * stale, or WHY, is authored here.
 *
 * The carrier sentence is §14.4's, not the card's, and that is deliberate:
 * the card's wording was tried first and it made
 * `tests/ui/f2-eligibility-disclosure.test.tsx`'s `getByText` ambiguous —
 * two nodes, same string, on one screen. A shipped disclosure test going
 * multiple-match is the correct signal that two surfaces had become
 * indistinguishable, so the roster takes §14.4's own phrasing and the card
 * keeps its unique one. The FACTS are shared; the sentence is per-surface,
 * exactly as §3.4 already has it (the card says "no longer meets
 * requirements", the text block says "!! no longer qualifies").
 *
 * H8 — this DISCLOSES. Nothing here removes, clamps or repairs the entry.
 */
function RosterRowFragment({ row }: { row: RosterRow }) {
  return (
    <>
      <RosterRowCells row={row} />
      {row.stale ? (
        <tr className="summary-roster__stale">
          <td colSpan={5}>
            <span className="summary-roster__stale-glyph">⚠</span> Purchased at{" "}
            {LEVEL_LABELS[row.purchasedLevel]}; this build no longer qualifies
            {row.staleReasons.length > 0 ? ` — ${row.staleReasons.join("; ")}` : ""}.
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// LoadoutRoster
// ---------------------------------------------------------------------------

export interface LoadoutRosterProps {
  summary: BuildSummary;
  budgets: Readonly<Record<Category, Budget>>;
}

export function LoadoutRoster({ summary, budgets }: LoadoutRosterProps) {
  const populated = summary.categories.filter((category) => category.rows.length > 0);
  const empty = summary.categories
    .filter((category) => category.rows.length === 0)
    .map((category) => category.category);

  return (
    <div className="summary-roster">
      {populated.length === 0 ? (
        // Full chrome at zero state: everything else in the Summary still
        // renders [memory/feedback_dashboard_zero_state_full_chrome.md].
        <p className="summary-roster__empty">
          No badges purchased yet. Buy a badge in the grid above, or roll one.
        </p>
      ) : (
        populated.map((category) => (
          <RosterGroup
            key={category.category}
            summary={category}
            budget={budgets[category.category]}
          />
        ))
      )}
      {/* Empty categories are OMITTED and named in one tail line. This
          diverges from §3.4's partial-empty rule on purpose: in the grid a
          category header IS its live CategoryLedger, so it must render with
          no cards; in the roster a group is a list of badges you own, its
          budget is in the Spend-by-category table on the same screen, and six
          empty panels would be chrome rather than information. */}
      {populated.length > 0 && empty.length > 0 ? (
        <p className="summary-roster__omitted">Nothing purchased in {joinWithOr(empty)}.</p>
      ) : null}
    </div>
  );
}
