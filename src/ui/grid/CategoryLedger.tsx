/**
 * CategoryLedger (design-spec §3.4, §5.3 rev 2) — the per-category status
 * surface. TWO pieces now, per the rev-2 sticky budget:
 *
 *  - `.category-ledger` (the DIGEST): title + one compact row — Badge Points
 *    spent/pool with left/over-by, Badge Slots used/capacity with over-by.
 *    THIS is the sticky layer (layer 2 of the global two-layer cap).
 *    F5.3/B: it is also the collapse control — it renders AS the `<summary>`
 *    of BadgeGridSection's `<details>`. See CategoryLedgerDigest below for
 *    why it must BE the summary and not be nested inside one.
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

/**
 * THE ATOM. `over by N ⚠`, or null at or under the line.
 *
 * §3.4's "one string builder, N consumers" rule, applied a fourth time. The
 * two ledger builders below and A5-U's bonus mode (design-spec §17.6) all
 * render this, so the mode cannot author its own phrasing of the same fact and
 * then drift from the ledger's — which is design-review P0-1 arriving by a new
 * door. It takes the OVERAGE, not the two operands: every caller already knows
 * which of its numbers is the capacity.
 */
export function overByText(overBy: number): string | null {
  return overBy > 0 ? `over by ${overBy} ⚠` : null;
}

/** The canonical Badge Points over-by string, or null when within budget.
 * SHARED by the in-grid digest and the rail Ledger overview (P0-1: one
 * builder, two surfaces, zero drift). */
export function overByBadgePoints(readout: CategoryLedgerReadout): string | null {
  return overByText(-readout.remainingPoints);
}

/** The canonical Badge Slots over-by string, or null when within capacity —
 * and ALWAYS null while the capacity is unset (0 = unset ruling). */
export function overByBadgeSlots(
  readout: CategoryLedgerReadout,
  budget: Budget,
): string | null {
  if (badgeSlotsCapacityUnset(budget)) return null;
  return overByText(readout.equipSlotsUsed - budget.equipSlots);
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
  /** A5-U (design-spec §17.4) — this category's BASE budget and its APPLIED
   * bonus, for the lede's one conditional composition line.
   *
   * BOTH RECORDS ARE PASSED, and that is why this component still "contains
   * zero arithmetic beyond formatting": `budget` above is the EFFECTIVE
   * record, and decomposing it here would mean re-deriving in a .tsx a split
   * the engine already holds. App owns both and hands over both.
   *
   * Absent ⇒ no composition line at all, which is the zero state: at zero
   * earned and zero placed the lede is byte-identical to pre-A5-U
   * (design-spec §17.10, canary 1). */
  baseBudget?: Budget;
  appliedBonus?: Budget;
}

/**
 * F5.3/B (design-spec §15.8) — THE DIGEST IS THE `<summary>`.
 *
 * Three reasons this element is the `<summary>` itself rather than a `<div>`
 * nested inside one, and all three are load-bearing:
 *
 *  1. `position: sticky` survives. A `<summary>` wrapping the digest would
 *     become the sticky element's CONTAINING BLOCK — a box its own size — and
 *     the sticky header would die with every test still green, because the
 *     shipped pin reads CSS text, not layout.
 *  2. It is the only conforming HTML. `<summary>`'s content model is phrasing
 *     content optionally intermixed with heading content: an `<h2>` plus a
 *     `<span>` row qualifies, a `<div>` does not. That is why
 *     `.category-ledger__row` is a `<span>` here — its `display: flex` is
 *     unaffected, and both `querySelector` and `textContent` still match.
 *  3. `--over` stays on this element, so a COLLAPSED category that is
 *     overspent still renders its --danger border and its `over by N ⚠`.
 *     Collapse can never hide an H4 overspend.
 *
 * No `aria-expanded` (the browser maps it from `<details open>`) and no
 * `aria-label` (the native subtree computation reads the category name then
 * the numbers, which is exactly what a user collapsing a category wants).
 */
export function CategoryLedgerDigest({
  category,
  readout,
  budget,
  headingId,
}: Omit<CategoryLedgerProps, "feasibility" | "projection">) {
  const pointsOverText = overByBadgePoints(readout);
  const equipSlotsOverText = overByBadgeSlots(readout, budget);
  const capacityUnset = badgeSlotsCapacityUnset(budget);
  const over = pointsOverText !== null || equipSlotsOverText !== null;

  return (
    <summary className={`category-ledger${over ? " category-ledger--over" : ""}`}>
      <h2 id={headingId}>{category}</h2>
      <span className="category-ledger__row">
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
      </span>
    </summary>
  );
}

/**
 * F5.3/B — the lede, VERBATIM from the pre-split component. It already
 * "SCROLLS AWAY — that is what makes the sticky budget achievable", so
 * collapsing hides exactly what scrolling already hid.
 */
export function CategoryLedgerLede({
  category,
  readout,
  budget,
  feasibility,
  projection,
  baseBudget,
  appliedBonus,
}: Omit<CategoryLedgerProps, "headingId">) {
  const capacityUnset = badgeSlotsCapacityUnset(budget);
  const showProjection = projection !== undefined && projectionDiffers(readout, projection);
  const projectionOver = projection !== undefined && projection.remainingPoints < 0;

  /**
   * A5-U (design-spec §17.4) — the composition lives HERE, in the lede, and
   * NEVER in the digest. §3.4's own test: "would I need this while scrolled 40
   * cards deep?" The numbers you reconcile against 2K's screen are yes; HOW
   * they were assembled is context you read once on arrival. The digest string
   * has 0.56px of margin (§16.11 C4) and stays effective-only.
   *
   * ONE LINE, THREE VARIANTS (§17.4): both pools, one pool (the other's clause
   * omitted — §3.4's zero-valued-advisory rule), and §17.9's all-bonus case,
   * which is its own sentence below and REPLACES the slots clause rather than
   * sitting beside it.
   */
  const bonusSlots = appliedBonus?.equipSlots ?? 0;
  const bonusPoints = appliedBonus?.points ?? 0;
  const baseSlots = baseBudget?.equipSlots ?? 0;
  const basePoints = baseBudget?.points ?? 0;
  /** §17.9 Ruling ③, row `0 · M`. The base is zero and a bonus is placed, so
   * the capacity here is real and entirely reassignable. "No base capacity is
   * RECORDED" describes THE APP'S STATE, not the build's — true under both
   * readings of a zero base, which is exactly the property the
   * indistinguishable case needs. The app may not say "this build has no X"
   * until the `entered` channel can tell the two apart (canary 4c). */
  const slotsAllBonus = baseSlots === 0 && bonusSlots > 0;
  const compositionClauses = [
    ...(bonusPoints > 0 ? [`Badge Points ${basePoints} base + ${bonusPoints} bonus`] : []),
    ...(bonusSlots > 0 && !slotsAllBonus
      ? [`Badge Slots ${baseSlots} base + ${bonusSlots} bonus`]
      : []),
  ];

  return (
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
        {/* NEVER BOTH (§17.9 consequence 4), and it is structural rather than
            a rule to remember: `slotsAllBonus` requires a placed bonus, which
            composes to a non-zero effective capacity, which makes
            `capacityUnset` false. */}
        {slotsAllBonus ? (
          <p className="bonus-lede category-ledger__hint">
            Badge Slots capacity here is {bonusSlots} bonus. No base capacity is recorded for
            this discipline.
          </p>
        ) : null}
        {compositionClauses.length > 0 ? (
          <p className="bonus-lede category-ledger__composition num">
            {compositionClauses.join(" · ")}
          </p>
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
  );
}
