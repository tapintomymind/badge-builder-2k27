/**
 * ResetBuildDialog (design-spec §15.13–§15.18) — the confirm in front of
 * `Reset build`.
 *
 * PURE PRESENTATION. It receives every count as a prop and owns no state but
 * the one checkbox. The scope decision, the counting and the write all live in
 * App.tsx; this file decides only how the blast radius is worded.
 *
 * WHY THE COPY IS SPECIFIED HERE RATHER THAN LEFT TO THE CALLER: it carries a
 * GUARANTEE. "Your saved builds are not touched" is a true statement about a
 * code path (the reset never reaches saveNamedBuild / deleteNamedBuild /
 * clearAllPersistedData / clearAutosave), and a guarantee that can be
 * reworded by a caller is a guarantee that can be made false by a caller.
 *
 * THERE IS NO UNDO, and that is a ruling rather than a scope cut. The autosave
 * is overwritten the instant the reset commits, so an in-memory undo buffer
 * would be THE ONLY COPY of the pre-reset build — which is the precise shape
 * of all three data-loss defects this project has already shipped.
 * `Save a copy and reset` is the durable alternative: named, reload-surviving,
 * and strictly more than undo for one extra click at the moment of hesitation.
 * It is therefore a FIRST-CLASS BUTTON and the primary path, not advice in a
 * hint.
 *
 * NEITHER COMMIT ACTION IS .btn--primary. Gold is the app's voice; a
 * destructive dialog does not get a gold nudge toward deletion. The durable
 * path is --secondary and the destructive one is --danger-ghost.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "../primitives/Button";

export interface ResetBlastRadius {
  /** The full attribute count (20) and how many are currently non-zero. */
  attributesTotal: number;
  attributesSet: number;
  purchased: number;
  synergyAssigned: number;
  /** Badge Tokens / Badge Slots fields currently non-zero, across the six
   * categories. Drives the CHECKBOX LABEL only — the default reset keeps
   * every one of them. */
  budgetFieldsSet: number;
  heightChanged: boolean;
  positionSet: boolean;
}

export interface ResetBuildDialogProps {
  counts: ResetBlastRadius;
  /** The zero-state height, already formatted (6'6" for the shipped dataset).
   * Resetting to a value the user did not pick has to be said out loud. */
  defaultHeightText: string;
  onCancel: () => void;
  onConfirm: (alsoBudgets: boolean) => void;
  onSaveCopyAndReset: (alsoBudgets: boolean) => void;
}

export function ResetBuildDialog({
  counts,
  defaultHeightText,
  onCancel,
  onConfirm,
  onSaveCopyAndReset,
}: ResetBuildDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [alsoBudgets, setAlsoBudgets] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    // showModal gives the focus trap; jsdom builds without it fall back to the
    // open attribute so component tests can still assert visibility. Same
    // idiom BuildManagerDialog and ImportDialog already ship.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      // The id is the disambiguator, and it is not decoration: this is the
      // THIRD <dialog> in the app and `querySelector("dialog")` returns the
      // wrong one. The last time that happened a reviewer reported "import
      // does nothing". Select by #reset-build-dialog or .reset-dialog, never
      // bare. F5.3 introduces the id convention; the two shipped dialogs
      // predate it.
      id="reset-build-dialog"
      ref={dialogRef}
      className="reset-dialog"
      aria-labelledby="reset-build-dialog-title"
      onClose={onCancel}
    >
      <div className="reset-dialog__body">
        <h2 id="reset-build-dialog-title">Reset build?</h2>
        <p>
          This clears the working build only.{" "}
          <strong>Your saved builds are not touched.</strong>
        </p>

        <div>
          <h3 className="reset-dialog__subhead">Will be cleared</h3>
          <ul className="reset-dialog__list">
            {/* Zero-count rows are SUPPRESSED (§3.4's zero-valued-advisory
                rule, and the `refunded 0` precedent): a build with no
                purchases does not get told about zero purchased badges. */}
            <li>
              {counts.attributesTotal} attributes{" "}
              <span className="hint">({counts.attributesSet} currently set)</span>
            </li>
            {counts.purchased > 0 ? (
              <li>
                {counts.purchased} purchased {counts.purchased === 1 ? "badge" : "badges"}
              </li>
            ) : null}
            {counts.synergyAssigned > 0 ? (
              <li>
                {counts.synergyAssigned} Synergy Slot{" "}
                {counts.synergyAssigned === 1 ? "assignment" : "assignments"}
              </li>
            ) : null}
            {counts.heightChanged || counts.positionSet ? (
              <li>
                Height returns to {defaultHeightText} · Position returns to Any
              </li>
            ) : null}
          </ul>
        </div>

        <p className="reset-dialog__kept">
          <strong>Will be kept</strong> — Badge Tokens and Badge Slots for all six categories,
          Synergy Slot unlocks, and the build name.
        </p>

        <label className="reset-dialog__opt-in">
          <input
            type="checkbox"
            checked={alsoBudgets}
            onChange={(event) => {
              setAlsoBudgets(event.currentTarget.checked);
            }}
          />
          <span>
            <strong>Also clear Badge Tokens and Badge Slots</strong>{" "}
            <span className="hint">({counts.budgetFieldsSet} fields set)</span>
          </span>
        </label>

        <div className="reset-dialog__actions">
          {/* Cancel is default-focused, and Escape routes to it through the
              native onClose above. */}
          <Button variant="ghost" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onSaveCopyAndReset(alsoBudgets);
            }}
          >
            Save a copy and reset
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={() => {
              onConfirm(alsoBudgets);
            }}
          >
            Reset build
          </Button>
        </div>
      </div>
    </dialog>
  );
}
