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
 *
 * ---------------------------------------------------------------------------
 * F8-S2 — EXTENDED, NEVER REWRITTEN. A rewrite is how the H2 ship-gate
 * regressions go red on a pass that changed no logic, and how
 * `hardViolationText`'s exhaustive-`kind` pinning quietly stops being
 * exhaustive. Everything M4 and F4 shipped is still here: the errors Banner
 * with F4's [N6] re-cut lead-in, the H4/NB-3 chip with its unset-capacity
 * suppression, both legacy tables, and the ExportImportControls/ImportDialog
 * pair.
 *
 * THE COLUMN CONTRACT (§14.6), stated once for everything below. This panel
 * still reads COMMITTED state only, and the new surfaces are built on
 * `buildSummary` — a selector whose SIGNATURE takes no `OverlayState` and
 * never will. Purchased level, effective level (neutral overlay), cost, every
 * <tfoot>, both legacy tables and the text block are therefore byte-identical
 * across all four overlay combinations. `synergyProjections` — the selector
 * carrying the overlay-DEPENDENT `activatesTo` — reaches only `SynergyDigest`,
 * where a fixed overlay makes it a labelled conditional rather than a
 * preview. `tests/ui/overlays.test.tsx` compares this whole subtree's
 * textContent, so ONE overlay-dependent node anywhere inside `.summary`
 * reddens the gate.
 *
 * Region order (§14.4): errors · over-capacity chips · [RollPanel — F8-R2's,
 * absent and NOT reserved] · LoadoutRoster · SynergyDigest · [no Σ-vs-20 row —
 * AJ-5 / F4 R17 rule ONE home, `BudgetTotalRow`; the Σ line lives in the text
 * block only, because the text leaves the app and BudgetTotalRow cannot
 * travel with it] · the two legacy tables in region B · SummaryTextBlock.
 *
 * `countsByLevel` is now the ENGINE's (`BuildSummary.countsByLevel`); F8-E1
 * pinned old ≡ new before deleting the inline computation, and the rendered
 * table does not move by one character.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { badgeById } from "../../engine/dataset";
import { badgeSlotsCapacityUnset } from "../../engine/ledger";
import type { ClearedSynergyRef } from "../../engine/serialization";
import type { BuildSummary, SynergySummaryRow } from "../../engine/summary";
import { formatSummaryText } from "../../engine/summary-text";
import { RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS, synergyRoleFor } from "../../engine/synergy";
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
import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";
import { Chip } from "../primitives/Chip";
import { LoadoutRoster } from "./LoadoutRoster";
import { SummaryTextBlock } from "./SummaryTextBlock";
import { SynergyDigest } from "./SynergyDigest";

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
        `(Synergy Slots ${error.plusTwoSynergySlotIds.join(", ")}) — at most ${error.maxAllowed} allowed. ` +
        `Synergy Slot ${RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS.join(", ")} is 2K's ratified +2 ` +
        `(Build Specialization), so it is not the one to clear.`
      );
    case "badgeCategoryViolatesDisciplineLock":
      return (
        `Synergy Slot ${error.synergySlotId} ${error.role === "fuse" ? "Fuse" : "Reaction"} ` +
        `holds ${nameOf(error.badgeId)}, a ${error.badgeCategory} badge, but the Synergy Slot is ` +
        `locked to ${error.disciplineLock}.`
      );
  }
}

/**
 * §3.6's `capacity not set (N of 6 categories)` footnote — RATIFIED IN REV 2
 * AND NEVER SHIPPED (design-spec §14.5.2 ⑤). Its absence is why the pasted
 * text block and the panel could not be asserted equal, which is the one
 * property §14.5 exists to deliver. Exported so the text↔panel test can pin
 * it against `formatSummaryText`'s own output rather than a transcription.
 *
 * Empty when every capacity is entered — an unset capacity is MISSING
 * INFORMATION, never an overspend, so this is advisory weight and never
 * `--danger` (§4.7).
 */
export function capacityFootnote(summary: BuildSummary): string {
  const missing = summary.categoriesWithoutCapacity;
  if (missing === 0) return "";
  return ` (${missing} of ${summary.categories.length} categories ${missing === 1 ? "has" : "have"} no capacity set)`;
}

/** The zero element of the counts record — NOT a re-implementation of the
 *  rule, which is `BuildSummary.countsByLevel`'s alone. Reached only when the
 *  panel is mounted without a summary (see `SummaryPanelProps.summary`). */
function noCounts(): Record<Level, number> {
  return Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<Level, number>;
}

export interface SummaryPanelProps {
  loadout: readonly LoadoutEntry[];
  synergySlots: readonly SynergySlot[];
  budgets: Readonly<Record<Category, Budget>>;
  readouts: Readonly<Record<Category, CategoryLedgerReadout>>;
  validation: LoadoutValidation;
  dataset: BadgeDataset;
  /**
   * F8-S2 — `buildSummary(ledgerState, build, dataset)`, computed by the App
   * exactly as `readouts`, `validation` and the feasibility counts already
   * are. Passing the OUTPUT rather than the inputs keeps the H2 seam narrow:
   * `BuildSummary` is a value with no channel an `OverlayState` could arrive
   * through, so no future prop edit can make this panel overlay-dependent by
   * accident.
   *
   * OPTIONAL, and the reason is worth stating rather than inferring:
   * `tests/ui/f2-disclosure-surfaces.test.tsx` mounts this component directly
   * to pin `hardViolationText`'s exhaustiveness, and that file is a
   * RUN-never-edit path for this slice. A required prop would have forced an
   * edit to it. Absent ⇒ the roster, the Synergy digest and the text block do
   * not render and the counts read zero; the App ALWAYS supplies it, and
   * tests/ui/f8-roster.test.tsx pins that it does.
   */
  summary?: BuildSummary;
  /** `synergyProjections(ledgerState, dataset)`. Same optionality, same
   *  reason. Its overlay-dependent `activatesTo` field is computed by the
   *  selector under a FIXED overlay, so it is a constant of the render. */
  synergy?: readonly SynergySummaryRow[];
  /** The saved build's name. A persistence concern the App holds; the text
   *  block's header suffix is absent without it. */
  buildName?: string;
}

export function SummaryPanel({
  loadout,
  synergySlots,
  budgets,
  readouts,
  validation,
  dataset,
  summary,
  synergy,
  buildName,
}: SummaryPanelProps) {
  // ONE engine value feeds the roster, the counts table, the footnote and the
  // text block, so none of the four can disagree with the others.
  const summaryText =
    summary === undefined ? null : formatSummaryText(summary, { buildName }, synergy ?? []);

  // Committed effective levels (neutral overlay) — Legend is reachable only
  // via boost, so its row is labelled as such. Hoisted to the engine in
  // F8-E1, which pinned old ≡ new before this inline loop was deleted.
  const countsByLevel = summary?.countsByLevel ?? noCounts();

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
          {/* [F4/N6] The old lead-in read "this can only come from an
              externally edited or imported build". That became FALSE the day
              F4 shipped: Synergy Slot 7's ratified +2 can push a build the
              user never exported and never edited over the +2 cap, from the
              app's OWN upgrade. Misdirecting the user away from the real
              cause, on the one surface H8 depends on for disclosure, is worse
              than saying nothing. */}
          <strong>Invalid loadout state</strong> — from an imported or externally edited
          build, or from a data update that changed a ratified value:
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

      {/* Region 4 (§14.4) — every badge you own, BY NAME. */}
      {summary !== undefined ? <LoadoutRoster summary={summary} budgets={budgets} /> : null}

      {/* Region 5 — read-only; §3.5's panel owns Synergy Slot ACTIONS. */}
      {synergy !== undefined ? <SynergyDigest rows={synergy} dataset={dataset} /> : null}

      {/* Region 7 — REGION B. §13.5's cap was derived against these two
          tables' 196px max-content and is preserved verbatim on the wrapper;
          the roster's 412px row needed its own region rather than a wider
          cap (§14.2). */}
      <div className="summary__tables">
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
              {/* §14.5.2 ⑤ — the ratified-and-never-shipped honesty marker.
                  Without it the panel silently reads a whole-build total off
                  a partial spread, and the panel↔text equality §14.5 exists
                  for cannot hold. */}
              {summary === undefined || capacityFootnote(summary) === "" ? null : (
                <span className="summary__footnote">{capacityFootnote(summary)}</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* Region 8 — the whole thing as plain text. The <textarea> is the
          PRIMARY path, not a fallback: on the LAN origin this feature exists
          to serve, `navigator.clipboard` is undefined (§14.5). */}
      {summaryText !== null ? <SummaryTextBlock text={summaryText} /> : null}
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

/* THE LABELS ARE `Export` / `Import`, and the missing word is load-bearing.
 * design-spec §3.2 item 5 names them exactly that; the shipped tree carried
 * `Export JSON` / `Import JSON`, which nothing specified. Measured at 1280 in
 * headless Chrome, the suffix costs 72.24px (`Export JSON` 74.05 -> 37.92,
 * `Import JSON` 74.38 -> 38.27) against a header that overflowed its content
 * box by 71.44px — i.e. the two words WERE the second header row, and the
 * second row was 40 of the 102px that set the app shell's height gate.
 * Restoring the spec's names takes the gate 868 -> 768 and is why an ordinary
 * 1440x900 laptop can reach the shell at all. `.json` is still the extension
 * the download carries, so nothing about the format is now unsaid.
 * layout-arithmetic's F15 block re-derives the fit and fails if it returns. */
export function ExportImportControls({ onExport, onImportFile }: ExportImportControlsProps) {
  return (
    <span className="export-import">
      <Button variant="secondary" size="sm" onClick={onExport}>
        Export
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
        Import
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
      /** F2.1 heal report from the deserializer: synergy assignments
       * cleared because they referenced a badge not in the loadout —
       * disclosed post-confirm on the same surface. */
      clearedSynergyRefs: ClearedSynergyRef[];
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
