/**
 * BadgeTile (F16) — one cell of a discipline panel on the Loadout board.
 *
 * A TILE IS A NAME CELL, NOT A SQUARE, and that is the board's single largest
 * deliberate departure from the in-game reference (design.md §8 item 1). 2K
 * renders ~64px art squares; we render ~113px name cells. The reason is a
 * constraint, not a preference: the app ships zero images, its runtime
 * dependencies are frozen at {react, react-dom}, and hand-authoring 53 badge
 * glyphs would both blow the SVG budget and move TOWARD trade dress rather
 * than away from it. The consequence is real and is stated rather than
 * discovered — the board is wider and taller than the screen it echoes.
 *
 * TWO VARIANTS, ONE COMPONENT.
 *
 *  - PURCHASED. An <a> to the badge's own card in the grid. It is a LINK, not
 *    a control: the board arranges, the grid is where you spend. There is no
 *    Remove here and no level control here — design.md §2.4 routes both
 *    through the grid, and §2.5 puts Remove in a detail region this cut does
 *    not build, so the board dispatches NO state change at all and adds no
 *    write path to the loadout.
 *  - EMPTY. A <button> that filters the grid to this discipline and moves
 *    focus there (§3.4). It writes FilterState, never the build.
 *
 * NEVER COLOUR ALONE (design-spec §6). Purchase level rides the metal top
 * edge AND the letter in the disc; a synergy role rides an edge SHAPE (solid
 * for Fuse, dashed for Reaction) AND a glyph AND the accessible name; empty
 * capacity rides a dashed rim AND the plus glyph AND the words "Badge Slot";
 * a stale purchase rides the ABSENCE of the specular highlight AND a warning
 * glyph AND a word in the accessible name. Category hue never reaches a tile
 * — it stops at the panel title (§9.2), which is the one selector the board
 * adds to the --cat placement law.
 */

import type { Badge, LoadoutEntry, SynergyRole } from "../../engine/types";
import type { Category, PurchasableLevel } from "../../engine/vocabulary";
import { LEVEL_LABELS } from "../../engine/vocabulary";

/** Fuse / Reaction glyphs, matching the shipped card edges (design-spec
 * §10.4). Decorative — every role also spells itself out in the accessible
 * name, so a glyph the reader's font lacks costs nothing. */
const ROLE_GLYPH: Record<SynergyRole["kind"], string> = { fuse: "⚡", reaction: "↺" };
const ROLE_WORD: Record<SynergyRole["kind"], string> = { fuse: "Fuse", reaction: "Reaction" };

export interface PurchasedTileProps {
  badge: Badge;
  entry: LoadoutEntry;
  /** Total-to-own cost at the purchased level. Read from the engine by the
   * panel, never recomputed here — a component that prices a badge is a rule
   * in a component. */
  cost: number | null;
  /** The badge's single synergy role, or null. `synergyRoleFor`'s output. */
  role: SynergyRole | null;
  /** `entryIsStale`'s output — H8 DISCLOSES, it never repairs. */
  stale: boolean;
  /** Where the grid's card for this badge lives. */
  href: string;
}

/** The purchased level's initial — B / S / G / H / L — taken from
 * LEVEL_LABELS rather than a second table of initials, exactly as
 * SynergyBoard does. */
function levelLetter(level: PurchasableLevel): string {
  return LEVEL_LABELS[level].charAt(0);
}

export function PurchasedTile({
  badge,
  entry,
  cost,
  role,
  stale,
  href,
}: PurchasedTileProps) {
  const levelLabel = LEVEL_LABELS[entry.purchasedLevel];
  const roleText =
    role === null
      ? ""
      : `, ${ROLE_WORD[role.kind]} in Synergy Slot ${role.synergySlotId}`;
  const costText = cost === null ? "" : `, ${cost} Badge Points`;
  const staleText = stale ? ", no longer qualifies at this level" : "";

  return (
    <a
      className="board-tile"
      href={href}
      data-level={entry.purchasedLevel}
      data-role={role === null ? undefined : role.kind}
      data-stale={stale ? "true" : undefined}
      aria-label={`${badge.name}, ${levelLabel}${costText}${roleText}${staleText} — show its card in the badge grid`}
    >
      {/* The metal top edge. A presentational span rather than a border, so
          the gradient token can be used as a background verbatim and the
          forced-colors companion has an element to re-paint. */}
      <span className="board-tile__edge" aria-hidden="true" />
      <span className="board-tile__name">{badge.name}</span>
      <span className="board-tile__meta">
        <span className="board-tile__level" aria-hidden="true">
          {levelLetter(entry.purchasedLevel)}
          {stale ? <span className="board-tile__warn">⚠</span> : null}
        </span>
        {role === null ? null : (
          <span className="board-tile__role" aria-hidden="true">
            {ROLE_GLYPH[role.kind]}
          </span>
        )}
        {cost === null ? null : (
          <span className="num board-tile__cost" aria-hidden="true">
            {cost}
          </span>
        )}
      </span>
    </a>
  );
}

export interface EmptyTileProps {
  category: Category;
  onBrowse: () => void;
}

/**
 * An unused Badge Slot, rendered as capacity you can see rather than a number
 * you have to subtract. That spatial reading is the clearest thing the board
 * borrows from the reference.
 *
 * IT IS A BUTTON, NOT A DECORATION — but it buys nothing. Pressing it filters
 * the grid to this discipline and moves focus there; the purchase itself
 * still happens on a card, because a badge you do not own has no tile to
 * press and an empty-tile picker over 53 badges is the grid with a worse
 * interface (§2.4).
 */
export function EmptyTile({ category, onBrowse }: EmptyTileProps) {
  return (
    <button
      type="button"
      className="board-tile board-tile--empty"
      aria-label={`Empty Badge Slot — browse ${category} badges`}
      onClick={onBrowse}
    >
      <span className="board-tile__plus" aria-hidden="true">
        ＋
      </span>
      <span className="board-tile__empty-label" aria-hidden="true">
        Badge Slot
      </span>
    </button>
  );
}
