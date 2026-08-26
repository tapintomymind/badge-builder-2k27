/**
 * BonusDialog (design-spec §17) — the bonus Badge Tokens / Badge Slots
 * allocation surface. Component #37, and the SIXTH `<dialog>` in this app.
 *
 * WHY A DIALOG AND NOT A THIRD "MODE". In this app "mode" already means
 * DISPLAY PREVIEW, NOT A FACT — that is what `PreviewModeStrip` exists to say,
 * and §3.2 calls it "the cheapest structural defense available at the UI
 * layer." An EDITING mode wearing the same clothes would teach the user that a
 * striped bar sometimes means "nothing you see is committed" and sometimes
 * means "everything you type is", and §4.4's three coordinated preview signals
 * stop being reliable. The native element also buys the focus trap, Escape,
 * focus restore and backdrop for free, and it has no placement problem at all
 * — which is half the reason it is a dialog (§17.2).
 *
 * SELECT BY id, NEVER BY TAG. `document.querySelector("dialog")` now has SIX
 * ways to be wrong. This is `#dialog-bonus` (§4.6's implementer note, restated
 * for the sixth time).
 *
 * THERE IS NO CANCEL AND NO DRAFT STATE, and that is a ruling rather than a
 * scope cut (§17.3). §4.2: "No form has a submit button. Every input applies
 * immediately and autosaves. There is no draft state." A Cancel here would be
 * this app's FIRST draft-state surface and would have to buffer fourteen
 * values and roll them back — a SECOND SOURCE OF TRUTH FOR BUILD DATA, which
 * is the shape of all four data-loss defects this project has shipped. `Done`,
 * `Escape` and the backdrop all close; none of them saves, because every
 * keystroke already did. The consequence is stated honestly: there is no undo
 * for a mis-typed total, and the recovery is retyping it — nothing is
 * destroyed, so nothing needs recovering.
 *
 * ZERO ENGINE CALLS AND ZERO OVERLAY IMPORT (§17.3). No `categoryLedgerAt`, no
 * `effectiveLevel`, no `overlay`, no spend, no remaining, no "you're short
 * here": a remaining-points figure beside an allocation control is a
 * recommendation with the verb removed, and §3.6's prohibition is absolute.
 * The three Σ helpers this file imports are arithmetic over the bonus record
 * itself, not readouts over the plan. Named here because the next reader will
 * reach for the third column; §17.3 prices it as the user's call.
 *
 * VOCABULARY. §17 is authored in "Badge Tokens", the user approved that rename
 * app-wide, and THE SWEEP HAS NOW RUN (2026-08-26) — every string here ships
 * in "Badge Tokens" alongside the rest of the app. §17.0's hard sequencing
 * gate — "F9's strings may never be the only ones speaking the new word" — is
 * SATISFIED rather than pending: the whole app moved in one change.
 *
 * Identifiers and serialized field names still say `points` ON PURPOSE. See
 * the storage note on `BonusBudget` in src/engine/types.ts before renaming
 * anything here that is not a user-visible string.
 */

import { useEffect, useRef } from "react";
import {
  appliedEquipSlotsTotal,
  appliedPointsTotal,
  unappliedEquipSlots,
  unappliedPoints,
} from "../../engine/budget";
import type { BonusBudget, Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES } from "../../engine/vocabulary";
import { overByText } from "../grid/CategoryLedger";
import { Button } from "../primitives/Button";
import { NumberField } from "../primitives/NumberField";
import { BUDGET_EQUIP_SLOTS_MAX, BUDGET_POINTS_MAX } from "./BudgetGrid";

/**
 * FIELD MAXIMA ARE DERIVED, NOT INVENTED — the seed's #1 non-negotiable
 * applies to a `max` attribute too (§17.4).
 *
 * Each per-category bonus field takes ITS BASE TWIN'S SHIPPED MAX (99 points /
 * 12 Badge Slots), because it is the same kind of number and that is an
 * existing app convention rather than a claim about 2K. Each build-level
 * earned field takes SIX TIMES the per-category max — "the largest total the
 * six cells can hold" — so the placed/earned checksum can never be
 * un-satisfiable by construction.
 *
 * The user's observed "3 extra Badge Slots and 12 Badge Tokens" appears
 * NOWHERE in this file: not as a default, not as a max, not in copy. Their own
 * words make it an observation ("you can earn more … so this will be
 * dynamic"), and canary 6 asserts it.
 */
const CATEGORY_POINTS_MAX = BUDGET_POINTS_MAX;
const CATEGORY_EQUIP_SLOTS_MAX = BUDGET_EQUIP_SLOTS_MAX;
const EARNED_POINTS_MAX = CATEGORIES.length * CATEGORY_POINTS_MAX;
const EARNED_EQUIP_SLOTS_MAX = CATEGORIES.length * CATEGORY_EQUIP_SLOTS_MAX;

export interface BonusDialogProps {
  /** The BASE six. The effective column is composed against this, and it is
   * never written to from here. */
  baseBudgets: Record<Category, Budget>;
  bonus: BonusBudget;
  onEarnedCommit: (pool: "points" | "equipSlots", value: number) => void;
  onAppliedCommit: (pool: "points" | "equipSlots", category: Category, value: number) => void;
  /** Done / Escape / backdrop all route here, and all three are the same act:
   * close. Nothing is committed on close because everything committed on
   * keystroke. */
  onDone: () => void;
}

/**
 * The `placed / earned` fraction, plus whichever annotation is true.
 *
 * `placed / earned` is not a progress bar and not a meter — it is a fraction
 * of two numbers the user typed, beside the input that changes one of them
 * (§17.3). The unplaced count is always rendered when non-zero and is NEVER a
 * warning: it is the affordance that stops the user silently forgetting the
 * second half of "earn it, then place it".
 *
 * REDUCING THE EARNED TOTAL BELOW WHAT IS PLACED IS ALLOWED (§17.6). Blocking
 * it breaks §4.2 ("no input is ever rejected for being 'too high' against a
 * budget") and §4.3 ("no control is ever disabled because of the Budget
 * class"); auto-unallocating is H8's auto-migration ban in a new costume. So
 * it is allowed, disclosed in the H4 soft class, PER METRIC — and every
 * placement stays exactly where the user put it. `overByText` is the ledger's
 * own atom, so the mode cannot drift from the digest's phrasing.
 */
function PlacedCell({
  placed,
  earned,
  unapplied,
  noun,
  nounPlural,
}: {
  placed: number;
  earned: number;
  unapplied: number;
  noun: string;
  nounPlural: string;
}) {
  const over = overByText(placed - earned);
  return (
    <span className="bonus-dialog__placed num">
      <span>
        {placed} / {earned}
      </span>
      {over === null ? null : <span className="bonus-dialog__over">{over}</span>}
      {unapplied > 0 ? (
        <span className="bonus-dialog__unplaced">
          · {unapplied} {unapplied === 1 ? noun : nounPlural} not placed
        </span>
      ) : null}
    </span>
  );
}

/**
 * One category's effective cell.
 *
 * `base → effective` renders ONLY when that cell's bonus is non-zero;
 * otherwise the cell is the bare base number (§3.4's zero-valued-advisory
 * rule — typically five of six rows are bare).
 *
 * `—` is the app's existing "no capacity recorded" glyph and renders ONLY for
 * base 0 WITH no bonus placed: that is the genuinely indistinguishable case
 * (§17.9). Place a bonus there and it becomes `0 → 1`, which is §17.9 Ruling
 * ②'s deadlock break made visible — the frame canary 4 falsifies.
 */
function EffectiveCell({ base, applied }: { base: number; applied: number }) {
  if (applied === 0) {
    return <td className="num bonus-dialog__effective">{base === 0 ? "—" : base}</td>;
  }
  return (
    <td className="num bonus-dialog__effective">
      {base} → {base + applied}
    </td>
  );
}

export function BonusDialog({
  baseBudgets,
  bonus,
  onEarnedCommit,
  onAppliedCommit,
  onDone,
}: BonusDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    // showModal gives the focus trap; jsdom builds without it fall back to the
    // open attribute so component tests can still assert visibility. The same
    // idiom BuildManagerDialog, ImportDialog and ResetBuildDialog all ship.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  const placedPoints = appliedPointsTotal(bonus);
  const placedEquipSlots = appliedEquipSlotsTotal(bonus);
  const baseTotalPoints = CATEGORIES.reduce((sum, c) => sum + baseBudgets[c].points, 0);
  const baseTotalEquipSlots = CATEGORIES.reduce((sum, c) => sum + baseBudgets[c].equipSlots, 0);

  return (
    <dialog
      id="dialog-bonus"
      ref={dialogRef}
      className="bonus-dialog"
      aria-labelledby="dialog-bonus-title"
      onClose={onDone}
      onClick={(event) => {
        // Backdrop, matching the import confirm (§4.6) and for the same
        // reason: there is no unsaved state, so dismissal cannot lose
        // anything.
        if (event.target === dialogRef.current) onDone();
      }}
    >
      <div className="bonus-dialog__body">
        <h2 id="dialog-bonus-title">Bonus Badge Tokens &amp; Badge Slots</h2>
        <p className="hint">
          Earned in-game — Build Specialization, Seasons, Crew. Bonus can go in any discipline
          and can be moved at any time.
        </p>
        {/* CONDITIONAL, NOT ASSERTIVE (§1's honesty posture). The reading that
            2K's header shows the UNAPPLIED REMAINDER rather than the earned
            total is better-explained than the alternative but is NOT
            confirmed, so the sentence hedges and the model does not depend on
            which is right. If the user confirms it, the only change is that
            this hint drops its hedge. */}
        <p className="hint">
          Enter the total you have earned, including any already placed. 2K&apos;s own header may
          show a smaller figure; if it does, it is counting what you have left to place.
        </p>

        <div className="bonus-dialog__earned">
          <span className="bonus-dialog__earned-label">Earned in total</span>
          <NumberField
            label="Bonus Badge Tokens earned in total"
            value={bonus.earnedPoints}
            min={0}
            max={EARNED_POINTS_MAX}
            unverified
            selectOnFocus
            onCommit={(value) => {
              onEarnedCommit("points", value);
            }}
          />
          <NumberField
            label="Bonus Badge Slots earned in total"
            value={bonus.earnedEquipSlots}
            min={0}
            max={EARNED_EQUIP_SLOTS_MAX}
            unverified
            selectOnFocus
            onCommit={(value) => {
              onEarnedCommit("equipSlots", value);
            }}
          />
          <span className="bonus-dialog__earned-label">Placed</span>
          <PlacedCell
            placed={placedPoints}
            earned={bonus.earnedPoints}
            unapplied={unappliedPoints(bonus)}
            noun="Badge Token"
            nounPlural="Badge Tokens"
          />
          <PlacedCell
            placed={placedEquipSlots}
            earned={bonus.earnedEquipSlots}
            unapplied={unappliedEquipSlots(bonus)}
            noun="Badge Slot"
            nounPlural="Badge Slots"
          />
        </div>

        {/* THE EFFECTIVE COLUMN IS THE WHOLE POINT OF THE MODE (§17.3): the
            composed number §17.4 keeps out of the digest, live, on every row
            at once, beside the input that moves it. */}
        <table className="bonus-dialog__table">
          <thead>
            <tr>
              <td />
              <th scope="col" colSpan={2}>
                Badge Tokens
              </th>
              <th scope="col" colSpan={2}>
                Badge Slots
              </th>
            </tr>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">bonus</th>
              <th scope="col">effective</th>
              <th scope="col">bonus</th>
              <th scope="col">effective</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr key={category}>
                <th scope="row">{category}</th>
                {/* `data-pool` is the STACKED arrangement's visible pool
                    label at S, printed by the container query's ::before. It
                    is decorative by construction — every input already
                    carries its own sr-only label naming both the category and
                    the pool, so the accessible name does not depend on a
                    stylesheet. */}
                <td data-pool="Badge Tokens">
                  <NumberField
                    label={`${category} bonus Badge Tokens`}
                    value={bonus.appliedPoints[category]}
                    min={0}
                    max={CATEGORY_POINTS_MAX}
                    unverified
                    hideLabel
                    selectOnFocus
                    onCommit={(value) => {
                      onAppliedCommit("points", category, value);
                    }}
                  />
                </td>
                <EffectiveCell
                  base={baseBudgets[category].points}
                  applied={bonus.appliedPoints[category]}
                />
                <td data-pool="Badge Slots">
                  <NumberField
                    label={`${category} bonus Badge Slots`}
                    value={bonus.appliedEquipSlots[category]}
                    min={0}
                    max={CATEGORY_EQUIP_SLOTS_MAX}
                    unverified
                    hideLabel
                    selectOnFocus
                    onCommit={(value) => {
                      onAppliedCommit("equipSlots", category, value);
                    }}
                  />
                </td>
                <EffectiveCell
                  base={baseBudgets[category].equipSlots}
                  applied={bonus.appliedEquipSlots[category]}
                />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num" data-pool="Badge Tokens">
                {placedPoints}
              </td>
              <EffectiveCell base={baseTotalPoints} applied={placedPoints} />
              <td className="num" data-pool="Badge Slots">
                {placedEquipSlots}
              </td>
              <EffectiveCell base={baseTotalEquipSlots} applied={placedEquipSlots} />
            </tr>
          </tfoot>
        </table>

        {/* `Done` is `secondary`, NEVER `primary`. Gold is the app's voice,
            not a nudge (§10.5), and §15.15 already set the precedent that a
            dialog's exit does not get one. There is no Cancel beside it and
            there never will be — see the file header. */}
        <div className="bonus-dialog__actions">
          <Button variant="secondary" size="sm" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  );
}
