/**
 * SummaryPanel + ExportImportControls + ImportDialog (design-spec §3.6).
 *
 * The summary reads COMMITTED state only: badge counts use effectiveLevel
 * under the neutral overlay and the spend table renders the "current"-basis
 * ledger readouts the App already computed — so NOTHING here can move under
 * a display overlay (H2). Real <table>s: tabular data gets <caption> +
 * <th scope> for free screen-reader structure.
 *
 * `Legend N (boost)` is listed separately from the purchasable four, because
 * Legend is never bought (seed: Core rules).
 *
 * H4/NB-3 disclosure obligation: when any synergy-role holder sits in an
 * over-capacity category, the over-capacity warning chip fires HERE too —
 * visible from where the user reads totals, not only in that category's
 * ledger.
 *
 * Export/import is FILE-based only (Blob download + <input type="file">, no
 * network, no storage) — the localStorage adapter is M3's src/persist/ and
 * is not touched here.
 */

import { useEffect, useRef } from "react";
import { badgeById } from "../../engine/dataset";
import { defaultOverlay, effectiveLevel, synergyRoleFor } from "../../engine/synergy";
import type { CategoryLedgerReadout } from "../../engine/synergy-ledger";
import type { HardViolation, LoadoutValidation } from "../../engine/validate-loadout";
import type {
  BadgeDataset,
  Budget,
  LoadoutEntry,
  SavedBuild,
  SynergySlot,
} from "../../engine/types";
import type { Category, Level } from "../../engine/vocabulary";
import { CATEGORIES, LEVELS, LEVEL_LABELS } from "../../engine/vocabulary";
import { badgeSlotsCapacityUnset } from "../grid/CategoryLedger";
import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";
import { Chip } from "../primitives/Chip";

/** Human-readable rendering of one engine HardViolation (H4 invariant
 * class). Copy only — the classification is entirely the engine's. Exported
 * so the pinning test can assert every kind has a rendering. */
export function hardViolationText(error: HardViolation, dataset: BadgeDataset): string {
  const nameOf = (badgeId: string) => badgeById(dataset, badgeId)?.name ?? badgeId;
  switch (error.kind) {
    case "synergyTargetNotPurchased":
      return (
        `Synergy Slot ${error.synergySlotId} ${error.role === "fuse" ? "Fuse" : "Reaction"} ` +
        `references ${nameOf(error.badgeId)}, which is not purchased.`
      );
    case "badgeHoldsMultipleSynergyRoles":
      return (
        `${nameOf(error.badgeId)} holds ${error.occurrences.length} synergy roles: ` +
        error.occurrences
          .map(
            (occurrence) =>
              `${occurrence.role === "fuse" ? "Fuse" : "Reaction"} in Synergy Slot ${occurrence.synergySlotId}`,
          )
          .join(", ") +
        ". A badge holds at most one."
      );
    case "sameBadgeBothRolesInOneSynergySlot":
      return `${nameOf(error.badgeId)} is both Fuse and Reaction in Synergy Slot ${error.synergySlotId}.`;
    case "tooManyPlusTwoSynergySlots":
      return (
        `${error.plusTwoSynergySlotIds.length} Synergy Slots are designated +2 ` +
        `(Synergy Slots ${error.plusTwoSynergySlotIds.join(", ")}) — at most ${error.maxAllowed} allowed.`
      );
  }
}

export interface SummaryPanelProps {
  loadout: readonly LoadoutEntry[];
  synergySlots: readonly SynergySlot[];
  budgets: Readonly<Record<Category, Budget>>;
  readouts: Readonly<Record<Category, CategoryLedgerReadout>>;
  validation: LoadoutValidation;
  dataset: BadgeDataset;
}

export function SummaryPanel({
  loadout,
  synergySlots,
  budgets,
  readouts,
  validation,
  dataset,
}: SummaryPanelProps) {
  // Committed effective levels (neutral overlay) — Legend is reachable only
  // via boost, so its row is labelled as such.
  const countsByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<
    Level,
    number
  >;
  for (const entry of loadout) {
    const effective = effectiveLevel({ loadout, synergySlots }, entry.badgeId, defaultOverlay);
    if (effective !== null) countsByLevel[effective] += 1;
  }

  const totalSpent = CATEGORIES.reduce((sum, category) => sum + readouts[category].spent, 0);
  const totalPool = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);

  // H4/NB-3: over-capacity categories that hold a synergy-role badge.
  // 0 = unset RULING: an unset capacity (equipSlots 0) warns nowhere — the
  // per-category ledger renders the neutral hint instead, so the summary
  // chip is suppressed uniformly with the other three surfaces.
  const overCapacityWithSynergyRole = validation.warnings.flatMap((warning) => {
    if (warning.kind !== "equipSlotOverflow") return [];
    if (badgeSlotsCapacityUnset(budgets[warning.category])) return [];
    const holdsRole = loadout.some(
      (entry) =>
        badgeById(dataset, entry.badgeId)?.category === warning.category &&
        synergyRoleFor(synergySlots, entry.badgeId) !== null,
    );
    return holdsRole ? [warning] : [];
  });

  return (
    <div className="summary">
      {validation.errors.length > 0 ? (
        <Banner variant="danger">
          <strong>Invalid loadout state</strong> — this can only come from an externally
          edited or imported build:
          <ul className="summary__errors">
            {validation.errors.map((error, index) => (
              <li key={index}>{hardViolationText(error, dataset)}</li>
            ))}
          </ul>
        </Banner>
      ) : null}
      {overCapacityWithSynergyRole.map((warning) => (
        <p key={warning.category} className="summary__warning">
          <Chip variant="warning">Over Badge Slots</Chip>{" "}
          <span>
            {warning.category}{" "}
            <span className="num">
              {warning.equipSlotsUsed}/{warning.equipSlotCapacity}
            </span>{" "}
            — a synergy-role badge sits in this over-capacity category.
          </span>
        </p>
      ))}

      <table className="summary__table">
        <caption>Badges by level</caption>
        <tbody>
          {(["bronze", "silver", "gold", "hof"] as const).map((level) => (
            <tr key={level}>
              <th scope="row">{LEVEL_LABELS[level]}</th>
              <td className="num">{countsByLevel[level]}</td>
            </tr>
          ))}
          <tr className="summary__legend-row">
            <th scope="row">Legend (boost)</th>
            <td className="num">{countsByLevel.legend}</td>
          </tr>
        </tbody>
      </table>

      <table className="summary__table">
        <caption>Spend by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">spent / pool</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => {
            const over = readouts[category].remainingPoints < 0;
            return (
              <tr key={category}>
                <th scope="row">{category}</th>
                <td className={`num${over ? " ledger-over" : ""}`}>
                  {readouts[category].spent} / {budgets[category].points}
                  {over ? " ⚠" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className="num summary__total">
              {totalSpent} / {totalPool}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExportImportControls
// ---------------------------------------------------------------------------

export interface ExportImportControlsProps {
  onExport: () => void;
  onImportFile: (file: File) => void;
}

export function ExportImportControls({ onExport, onImportFile }: ExportImportControlsProps) {
  return (
    <span className="export-import">
      <Button variant="secondary" size="sm" onClick={onExport}>
        Export JSON
      </Button>
      {/* Wrapping label (no htmlFor): native association, styled as a
       * button; the sr-only file input stays keyboard-reachable. */}
      <label className="btn btn--secondary btn--sm export-import__label">
        <input
          className="sr-only export-import__input"
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file !== undefined) onImportFile(file);
            event.currentTarget.value = "";
          }}
        />
        Import JSON
      </label>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ImportDialog
// ---------------------------------------------------------------------------

export type ImportDialogState =
  | {
      kind: "confirm";
      saved: SavedBuild;
      /** H8 drift report from the deserializer: entries stripped because
       * their badge id left the dataset — disclosed post-confirm via the
       * DriftBanner path. */
      droppedEntries: LoadoutEntry[];
    }
  | { kind: "error"; message: string };

export interface ImportDialogProps {
  state: ImportDialogState;
  currentDataVersion: string;
  onConfirm: (saved: SavedBuild) => void;
  onCancel: () => void;
}

/**
 * Import confirm (§3.6, §4.6): shows name / savedAt / dataVersion — with the
 * DriftBanner copy inlined on a dataVersion mismatch — BEFORE replacing the
 * working build. A parse failure renders a danger Banner inside the dialog
 * and the dialog stays open. Backdrop click closes (no unsaved state here).
 * The App mounts this component only while an import is in flight.
 */
export function ImportDialog({ state, currentDataVersion, onConfirm, onCancel }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    // showModal gives the focus trap; jsdom builds without it fall back to
    // the open attribute so component tests can still assert visibility.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-label="Import build"
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel(); // backdrop (§4.6)
      }}
    >
      <div className="import-dialog__body">
        <h2>Import build</h2>
        {state.kind === "error" ? (
          <>
            <Banner variant="danger">Couldn't read that file: {state.message}</Banner>
            <div className="import-dialog__actions">
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <dl className="import-dialog__facts">
              <dt>Name</dt>
              <dd>{state.saved.name}</dd>
              <dt>Saved at</dt>
              <dd className="num">{state.saved.savedAt}</dd>
              <dt>Dataset</dt>
              <dd className="num">{state.saved.dataVersion}</dd>
            </dl>
            {state.saved.dataVersion !== currentDataVersion ? (
              <Banner variant="warning">
                Planned against dataset <span className="num">{state.saved.dataVersion}</span>;
                current is <span className="num">{currentDataVersion}</span>. Requirements may
                have changed.
              </Banner>
            ) : null}
            <div className="import-dialog__actions">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onConfirm(state.saved);
                }}
              >
                Replace working build
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
