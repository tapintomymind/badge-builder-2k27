/**
 * SynergyBoard (F11 cut 1) — a 2 x 8 read-plus-navigate board rendered as the
 * HEAD of the existing Synergy Slots <Section>, above the eight shipped
 * SynergySlotRows, which keep working exactly as they ship and serve as this
 * board's detail surface.
 *
 * WHAT IT IS. Two labelled rows (Fuse above Reaction) crossed with eight
 * columns in SynergySlotId order 1..8 — never sorted, never filtered, never
 * reordered — with a Temporary / Permanent band divider between columns 4
 * and 5. That divider is information 2K's own screen does not carry and we
 * do: it maps our SynergySlot.permanence model onto the reference's shape.
 *
 * WHAT IT IS NOT — AND THIS IS THE WHOLE DESIGN. No control renders inside a
 * cell. The board SELECTS; every control stays the shipped primitive at its
 * shipped size in the rows below. That is derived, not preferred: a <select>
 * needs 180px to show a badge name before the native ellipsis
 * (tests/layout-arithmetic.test.ts SELECT_FLOOR) and the verified cell at
 * 1280 is 93.0px — a 1.94x shortfall. What it buys is that pickerGroups'
 * entire disable-with-reason discipline in SynergyPanel.tsx survives
 * UNTOUCHED. A second picker implementation on a 93px cell is exactly how
 * that discipline rots.
 *
 * IT DISPATCHES NO STATE CHANGE. It reads props and moves focus. There is no
 * onSynergySlotsChange, no assignSynergy, no clearSynergy, no onSetLevel
 * here, and its own useState holds nothing but which column is selected —
 * transient view state that is never persisted.
 *
 * THE MAGNITUDE IS READ OFF STATE, NEVER HARDCODED. Each column header
 * renders (+1) / (+2) from `synergySlot.magnitude`. [A7] The app now ships
 * six (+1) and two (+2), which CLOSES scope.md deviation #5 — the shape the
 * board was built to make visible is the seed's declared 6/2 default at last.
 * This file needed NO EDIT to get there beyond this sentence, exactly as
 * predicted when Synergy Slot 8's ratification was pending: magnitudeFor-
 * SynergySlot derives from ratified union user-designated and `magnitude` is
 * a persisted field. A hardcoded (+2) on columns 7 and 8 would silently
 * disagree with a loaded build, and still would.
 *
 * ACCESSIBILITY. A real <table>: <th scope="col"> for the columns,
 * <th scope="row"> for Fuse / Reaction, an <h3> heading inside the
 * <Section>'s <h2>. Roles are declared EXPLICITLY on every table element
 * because the responsive arrangement lays the table out as a CSS grid, and a
 * changed `display` strips native table semantics in every engine. Selection
 * rides on aria-pressed on a native <button> — the board adds NO live region
 * and announces nothing (the panel's live-region budget is counted by
 * tests/ui/f4-slot7.test.tsx and tests/ui/reset-build.test.tsx).
 *
 * NEVER COLOUR ALONE. Locked = the lock glyph AND the word "Locked"; empty =
 * the circled-plus glyph; occupied = the badge name itself; the season-reset
 * band = the glyph and a full sentence. Every state has a non-colour carrier
 * by construction.
 */

import { useState } from "react";
import { badgeById } from "../../engine/dataset";
import { synergySlotDisabledByPreview } from "../../engine/synergy";
import type {
  BadgeDataset,
  LoadoutEntry,
  OverlayState,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "../../engine/types";
import { LEVEL_LABELS } from "../../engine/vocabulary";

const ROLE_LABELS: Record<SynergyRoleKind, string> = { fuse: "Fuse", reaction: "Reaction" };
const ROLE_KINDS = ["fuse", "reaction"] as const;

/** REQUIRED COPY, and it must differ from SynergySlotRow's per-row string.
 * tests/ui/overlays.test.tsx does a global exact
 * getByText("⟳ Disabled by season-reset preview"), which THROWS on a second
 * match — a band label carrying the same text reds a declared
 * RUN-never-edit ship gate. It is also better copy on its own terms: this
 * one statement replaces four row statements, so it should read as a
 * statement about the band. The row-level strings are untouched. */
const BAND_PREVIEW_NOTE = "⟳ Temporary Synergy Slots disabled by season-reset preview";

/** Which of the four two-column blocks a Synergy Slot falls in. Presentation
 * only: it drives the narrow arrangements' grid placement (4+4 on the
 * temporary/permanent seam, then four blocks of two) and nothing else. */
function blockOf(synergySlotId: SynergySlotId): number {
  return Math.floor((synergySlotId - 1) / 2);
}

/** The purchased level letter for an assigned badge — B / S / G / H / L,
 * taken from LEVEL_LABELS rather than a second table of initials. */
function levelLetter(
  loadout: readonly LoadoutEntry[],
  badgeId: string,
): { letter: string; label: string } | null {
  const entry = loadout.find((candidate) => candidate.badgeId === badgeId);
  if (entry === undefined) return null;
  const label = LEVEL_LABELS[entry.purchasedLevel];
  return { letter: label.charAt(0), label };
}

/**
 * Scroll the Synergy Slot's own row into view and put focus in it.
 *
 * The anchor is the one attribute F11 adds to SynergySlotRow —
 * id="synergy-row-{id}" on its <fieldset> — matching the app's existing
 * in-page-anchor convention (#cat-*, #panel-synergy, #badge-grid). No ref
 * array, no useRef map, no context.
 *
 * FOCUS IS THE LOAD-BEARING HALF. .synergy-panel is a 2-column auto-fill
 * grid at >= 1280, so most rows are already on screen there and the scroll
 * is doing less work than it looks; landing the caret inside the right
 * <fieldset> is what actually moves the user.
 *
 * EXPORTED FOR THE R12 SYNERGY DOCK, and exported rather than copied on
 * purpose: the dock's chips target the identical `#synergy-row-{id}` anchor,
 * and two implementations of "go to this Synergy Slot" would drift the moment
 * one of them learned about a new focusable control. The board still owns it
 * because the board defined the anchor.
 */
export function goToSynergySlotRow(synergySlotId: SynergySlotId): void {
  const row = document.getElementById(`synergy-row-${synergySlotId}`);
  if (row === null) return;
  // jsdom implements no layout and therefore no scrollIntoView. Guarding
  // here rather than stubbing per test keeps the navigate half of the board
  // exercisable by any suite that renders <App/>.
  if (typeof row.scrollIntoView === "function") row.scrollIntoView({ block: "nearest" });
  const firstFocusable = row.querySelector<HTMLElement>(
    "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
  );
  (firstFocusable ?? row).focus();
}

export interface SynergyBoardProps {
  synergySlots: readonly SynergySlot[];
  loadout: readonly LoadoutEntry[];
  dataset: BadgeDataset;
  overlay: OverlayState;
}

export function SynergyBoard({ synergySlots, loadout, dataset, overlay }: SynergyBoardProps) {
  /** Transient view state: which column the user last pressed. Nothing is
   * persisted, nothing is announced — aria-pressed on the native <button>
   * carries the change by itself. */
  const [selected, setSelected] = useState<SynergySlotId | null>(null);

  /** THE canonical predicate (engine), never a hand-rolled negation of
   * synergySlotActive: is any Temporary Synergy Slot currently switched off
   * by the season-reset preview? */
  const temporaryPreviewDisabled = synergySlots.some(
    (synergySlot) =>
      synergySlot.permanence === "temporary" && synergySlotDisabledByPreview(synergySlot, overlay),
  );

  const select = (synergySlotId: SynergySlotId) => {
    setSelected(synergySlotId);
    goToSynergySlotRow(synergySlotId);
  };

  function columnHeader(synergySlot: SynergySlot) {
    const permanenceLabel = synergySlot.permanence === "temporary" ? "Temporary" : "Permanent";
    return (
      <th
        key={synergySlot.id}
        scope="col"
        role="columnheader"
        className="synergy-board__colhead"
        data-column={synergySlot.id}
        data-block={blockOf(synergySlot.id)}
        data-band={synergySlot.permanence}
        data-locked={synergySlot.unlocked ? undefined : "true"}
      >
        <button
          type="button"
          className="synergy-board__button synergy-board__button--colhead"
          aria-pressed={selected === synergySlot.id}
          aria-label={`Synergy Slot ${synergySlot.id}, ${permanenceLabel}, plus ${synergySlot.magnitude}, ${
            synergySlot.unlocked ? "unlocked" : "locked"
          }`}
          onClick={() => {
            select(synergySlot.id);
          }}
        >
          <span className="synergy-board__colhead-name">Synergy Slot {synergySlot.id}</span>{" "}
          <span className="num synergy-board__colhead-boost">(+{synergySlot.magnitude})</span>
        </button>
        {synergySlot.disciplineLock === null ? null : (
          <span className="synergy-board__lock-note">{synergySlot.disciplineLock} only</span>
        )}
      </th>
    );
  }

  function cell(synergySlot: SynergySlot, roleKind: SynergyRoleKind) {
    const shared = {
      role: "cell" as const,
      "data-column": synergySlot.id,
      "data-block": blockOf(synergySlot.id),
      "data-band": synergySlot.permanence,
      "data-role": roleKind,
    };

    // H4's invariant class: a locked column offers no control at all, so its
    // cells are NOT buttons. The de-opacified recipe is design-spec §6 /
    // invariant I2 — a canvas fill and a subtle rim, with the muted token
    // spelled out on the text rather than a container transparency an
    // ancestor would composite into unreadability.
    if (!synergySlot.unlocked) {
      return (
        <td
          key={synergySlot.id}
          {...shared}
          className="synergy-board__cell synergy-board__cell--locked"
        >
          <span className="synergy-board__locked">🔒 Locked</span>
        </td>
      );
    }

    const badgeId = roleKind === "fuse" ? synergySlot.fuseBadgeId : synergySlot.reactionBadgeId;
    const badge = badgeId === null ? undefined : badgeById(dataset, badgeId);
    const level = badgeId === null ? null : levelLetter(loadout, badgeId);
    const occupied = badge !== undefined;

    return (
      <td key={synergySlot.id} {...shared} className="synergy-board__cell">
        <button
          type="button"
          className={`synergy-board__button synergy-board__button--${occupied ? "filled" : "empty"}`}
          aria-label={
            occupied
              ? `${ROLE_LABELS[roleKind]}, Synergy Slot ${synergySlot.id}: ${badge.name}${
                  level === null ? "" : `, ${level.label}`
                }`
              : `${ROLE_LABELS[roleKind]}, Synergy Slot ${synergySlot.id}: empty`
          }
          onClick={() => {
            select(synergySlot.id);
          }}
        >
          {occupied ? (
            <>
              <span className="synergy-board__badge-name">{badge.name}</span>
              {level === null ? null : (
                <span className="synergy-board__level"> ({level.letter})</span>
              )}
            </>
          ) : (
            <span aria-hidden="true">⊕</span>
          )}
        </button>
      </td>
    );
  }

  /** One Fuse / Reaction label. FOUR pairs exist in the DOM, one per
   * two-column block, because the narrow arrangements repeat the label above
   * each block; CSS shows exactly as many pairs as there are blocks at that
   * width. The repeats are aria-hidden — the row already has its one real
   * row header, and the extras are a visual repetition of it. */
  function rowLabel(block: number, roleKind: SynergyRoleKind) {
    const primary = block === 0;
    return (
      <th
        key={`${roleKind}-${block}`}
        scope={primary ? "row" : undefined}
        role={primary ? "rowheader" : "presentation"}
        aria-hidden={primary ? undefined : "true"}
        className="synergy-board__rowlabel"
        data-block={block}
        data-band={block < 2 ? "temporary" : "permanent"}
        data-role={roleKind}
      >
        {ROLE_LABELS[roleKind]}
      </th>
    );
  }

  return (
    <div className="synergy-board">
      <h3 className="synergy-board__heading">Pairing board</h3>
      <table className="synergy-board__table" role="table">
        <caption className="sr-only">
          Fuse and Reaction assignments across all eight Synergy Slots, with the boost and the
          lock state of each one.
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            <th
              scope="colgroup"
              role="columnheader"
              className="synergy-board__band"
              data-band="temporary"
              data-preview={temporaryPreviewDisabled ? "disabled" : undefined}
            >
              Temporary — resets at season end
              {temporaryPreviewDisabled ? (
                <span className="synergy-board__preview-note"> {BAND_PREVIEW_NOTE}</span>
              ) : null}
            </th>
            <th
              scope="colgroup"
              role="columnheader"
              className="synergy-board__band"
              data-band="permanent"
            >
              Permanent — survives the season reset
            </th>
            {/* The band divider itself. A presentational grid item in its own
                track so the 1px rule and its breathing room are GEOMETRY the
                layout arithmetic can parse, not a decoration bolted onto a
                cell edge. */}
            <td className="synergy-board__seam" role="presentation" aria-hidden="true" />
          </tr>
          <tr role="row">{synergySlots.map((synergySlot) => columnHeader(synergySlot))}</tr>
        </thead>
        <tbody role="rowgroup">
          {ROLE_KINDS.map((roleKind) => (
            <tr key={roleKind} role="row">
              {[0, 1, 2, 3].map((block) => rowLabel(block, roleKind))}
              {synergySlots.map((synergySlot) => cell(synergySlot, roleKind))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
