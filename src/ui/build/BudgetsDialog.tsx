/**
 * BudgetsDialog (R12 — the workbench re-cut) — the base Badge Tokens / Badge
 * Slots editor as the SEVENTH `<dialog>`, at L only. Below 1280 the grid
 * stays where it has always been, inside BuildPanel's "Badge Tokens & Badge
 * Slots" Section; there is no width at which both surfaces render it.
 *
 * WHY A DIALOG. The twelve base fields are a SET-ONCE surface — filled by
 * hand from the MyPlayer builder and then not touched again — and under the
 * workbench the always-visible readout is the rail's TotalsStrip. Keeping a
 * 560px entry grid permanently mounted in the browse column was the old
 * layout's single biggest block of pre-grid chrome, and it conflated entry
 * with monitoring. BonusDialog (§17.2) is the exact precedent: same reasons,
 * same element, same focus/Escape/backdrop-for-free argument.
 *
 * NO CANCEL AND NO DRAFT STATE, verbatim from §4.2 via BonusDialog's ruling:
 * every keystroke commits through the same `onBudgetCommit` seam the panel
 * grid uses, `Done`/Escape/backdrop all just close, and nothing needs saving
 * on close because every field already did. A Cancel would be a draft-state
 * buffer — the shape of all four data-loss defects this project has shipped.
 *
 * SELECT BY id, NEVER BY TAG: `#dialog-budgets`.
 *
 * The grid inside is THE BudgetGrid, unchanged — base record in, base record
 * out (the A5 runaway-inflation rule travels with the component, test 6.6).
 * The bonus entry point inside the grid keeps working: opening the bonus
 * mode from here stacks the two dialogs, which the native element handles
 * (top layer) without any zIndex bookkeeping.
 */

import { useEffect, useRef } from "react";
import type { BonusBudget, Budget } from "../../engine/types";
import type { Category } from "../../engine/vocabulary";
import { Button } from "../primitives/Button";
import { BudgetGrid } from "./BudgetGrid";

export interface BudgetsDialogProps {
  /** The BASE six — the only record the grid may render or write (A5). */
  budgets: Record<Category, Budget>;
  bonus: BonusBudget;
  onBudgetCommit: (category: Category, field: keyof Budget, value: number) => void;
  onOpenBonus: () => void;
  onDone: () => void;
}

export function BudgetsDialog({
  budgets,
  bonus,
  onBudgetCommit,
  onOpenBonus,
  onDone,
}: BudgetsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    // showModal gives the focus trap; jsdom builds without it fall back to
    // the open attribute — the idiom every dialog in this app ships.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      id="dialog-budgets"
      ref={dialogRef}
      className="budgets-dialog"
      aria-labelledby="dialog-budgets-title"
      onClose={onDone}
      onClick={(event) => {
        // Backdrop closes — no unsaved state exists, so dismissal cannot
        // lose anything (the BonusDialog/import-confirm rule).
        if (event.target === dialogRef.current) onDone();
      }}
    >
      <div className="budgets-dialog__body">
        <h2 id="dialog-budgets-title">Badge Tokens &amp; Badge Slots</h2>
        <BudgetGrid
          budgets={budgets}
          onCommit={onBudgetCommit}
          bonus={bonus}
          onOpenBonus={onOpenBonus}
        />
        <div className="budgets-dialog__done">
          <Button variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  );
}
