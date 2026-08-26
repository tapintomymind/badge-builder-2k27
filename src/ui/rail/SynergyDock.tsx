/**
 * SynergyDock (R12 slice 2 — the workbench re-cut; user ruling 2026-08-26,
 * approved "one to one" from docs/mockups/workbench-recut.html) — the build
 * rail's PINNED FOOT: all eight Synergy Slots as a 2 x 4 chip grid, banded
 * Temporary / Permanent, permanently on screen at L.
 *
 * WHY IT IS PINNED AT THE BOTTOM AND NOT STICKY. It is `.col-build`'s THIRD
 * flex child and it does not grow — that is the whole of "docked", exactly as
 * the TotalsStrip is "pinned" by being the FIRST non-growing child. No third
 * sticky layer is opened (design-spec I5, re-scoped by the R12 shell block):
 * §5.3 budgets two, the jump nav and the category digest, and the workbench
 * spends neither of them here.
 *
 * IT IS A READOUT AND A DOOR, NEVER AN EDITOR. This component takes NO change
 * callback of any kind — no onSynergySlotsChange, no assignSynergy, no
 * applyEdit — so the build is structurally unreachable from it. A chip press
 * SCROLLS AND FOCUSES: it hands off to `goToSynergySlotRow`, the SAME
 * navigation the F11 pairing board already uses, so the shipped
 * `#synergy-row-{id}` anchor has one implementation and the two surfaces
 * cannot land in different places. Cross-column picking (the mockup's "lit
 * loop" — press an empty Fuse here, eligible catalog cards glow) is a LATER
 * slice and deliberately absent: half a gesture is worse than none.
 *
 * EVERY FACT IS READ, NONE IS DERIVED. The band membership is
 * `synergySlot.permanence` — the engine's own field, the identical source
 * SynergyPanel's `data-permanence` and SynergyBoard's `data-band` read. An
 * `id <= 4` test here would be a second, silently-drifting copy of a rule the
 * engine already owns (seed: Working agreements #1). The boost is
 * `synergySlot.magnitude`, never a hardcoded (+1)/(+2) — [A7] proved that
 * literal wrong once already. Badge NAMES resolve through `badgeById`.
 *
 * "FULLY ASSIGNED" IS SynergyDigest's PREDICATE, restated rather than
 * reinvented: a Synergy Slot counts as assigned when BOTH positions are
 * filled, because a lone Fuse boosts nothing. Two surfaces counting the same
 * word two ways is how a header and a digest come to disagree on screen.
 *
 * NEVER COLOUR ALONE (§6). Locked carries the 🔒 glyph AND the word; an empty
 * position carries ⊕; an assigned pair carries the two badge names. Every
 * state has a non-colour carrier by construction, and each chip's aria-label
 * spells the whole thing out for a reader who sees none of the glyphs.
 *
 * L-ONLY BY CONSTRUCTION. `.col-build` renders only inside App's compound
 * `isLarge`, so this file needs no width check, no media query and no S touch
 * floor — the chips are pointer targets on a desktop shell. The chip's own
 * box is derived and asserted in tests/layout-arithmetic.test.ts.
 */

import { Fragment } from "react";
import { badgeById } from "../../engine/dataset";
import type { BadgeDataset, SynergySlot } from "../../engine/types";
import { goToSynergySlotRow } from "../synergy/SynergyBoard";

/** The two bands, in reading order, with the mockup's ratified labels. The
 *  Permanent line is the mockup's shorter phrasing rather than the pairing
 *  board's "survives the season reset": the dock and the board sit in the
 *  same scroll column at L, and two surfaces repeating one sentence verbatim
 *  is how a `getByText` goes ambiguous and a reader stops reading either. */
const BANDS = [
  { permanence: "temporary", label: "Temporary — resets at season end" },
  { permanence: "permanent", label: "Permanent — survives the reset" },
] as const;

/** A synergy role position's rendered token: the badge's name, or ⊕ when the
 *  position is empty. Resolution failures fall back to the id rather than
 *  rendering blank — a dangling reference is disclosed by validateLoadout and
 *  must not vanish here (H8). */
function positionText(dataset: BadgeDataset, badgeId: string | null): string {
  if (badgeId === null) return "⊕";
  return badgeById(dataset, badgeId)?.name ?? badgeId;
}

/** The same token for a screen reader, where a glyph says nothing. */
function positionLabel(dataset: BadgeDataset, badgeId: string | null): string {
  if (badgeId === null) return "empty";
  return badgeById(dataset, badgeId)?.name ?? badgeId;
}

export interface SynergyDockProps {
  /** The working build's eight Synergy Slots, in id order — never sorted,
   *  never filtered here. */
  synergySlots: readonly SynergySlot[];
  /** For NAME resolution only. The dock reads no other dataset field. */
  dataset: BadgeDataset;
}

export function SynergyDock({ synergySlots, dataset }: SynergyDockProps) {
  const unlocked = synergySlots.filter((synergySlot) => synergySlot.unlocked).length;
  const assigned = synergySlots.filter(
    (synergySlot) =>
      synergySlot.fuseBadgeId !== null && synergySlot.reactionBadgeId !== null,
  ).length;

  function chip(synergySlot: SynergySlot) {
    const permanenceLabel =
      synergySlot.permanence === "temporary" ? "Temporary" : "Permanent";
    const fuse = positionText(dataset, synergySlot.fuseBadgeId);
    const reaction = positionText(dataset, synergySlot.reactionBadgeId);
    const empty = synergySlot.fuseBadgeId === null && synergySlot.reactionBadgeId === null;
    const pair = !synergySlot.unlocked
      ? "🔒 locked"
      : empty
        ? "⊕ empty"
        : `${fuse} ⇄ ${reaction}`;
    const state = synergySlot.unlocked
      ? `Fuse ${positionLabel(dataset, synergySlot.fuseBadgeId)}, Reaction ${positionLabel(
          dataset,
          synergySlot.reactionBadgeId,
        )}`
      : "locked";
    return (
      <button
        key={synergySlot.id}
        type="button"
        className="synergy-dock__chip"
        data-band={synergySlot.permanence}
        data-state={synergySlot.unlocked ? (empty ? "empty" : "assigned") : "locked"}
        // THE TRUNCATION'S SECOND CARRIER. The chip is 79.5px wide and its
        // pair line is clamped to two lines, so "Layup Mixmaster ⇄ Paint
        // Prodigy" renders as "Layup Mixmaster …" — the mockup's own chip has
        // the same box and simply chose shorter names for its example. The
        // full pair is never lost: the aria-label below spells it out for a
        // screen reader, this spells it out on hover for everyone else, and
        // pressing the chip lands on the row that renders both pickers.
        title={pair}
        aria-label={`Synergy Slot ${synergySlot.id}, ${permanenceLabel}, plus ${synergySlot.magnitude}, ${state}. Opens its controls.`}
        onClick={() => {
          goToSynergySlotRow(synergySlot.id);
        }}
      >
        <span className="synergy-dock__id num" aria-hidden="true">
          S{synergySlot.id} <span className="synergy-dock__boost">+{synergySlot.magnitude}</span>
        </span>
        <span className="synergy-dock__pair" aria-hidden="true">
          {pair}
        </span>
      </button>
    );
  }

  return (
    <aside className="synergy-dock" aria-label="Synergy Slots dock">
      <div className="synergy-dock__header">
        <span className="synergy-dock__title">Synergy Slots</span>
        <span className="synergy-dock__count num">
          {assigned}/{synergySlots.length} assigned · {unlocked} unlocked
        </span>
      </div>
      {/* ONE grid, TWO bands. The band labels are grid items spanning every
          column rather than wrappers around their chips: a wrapper would
          need `display: contents` to keep the chips as grid children, and a
          contents box is exactly the shape that has stripped semantics in
          shipped engines. Fragments cost nothing and keep the DOM flat. */}
      <div className="synergy-dock__grid">
        {BANDS.map((band) => (
          <Fragment key={band.permanence}>
            <span className="synergy-dock__bandlabel">{band.label}</span>
            {synergySlots
              .filter((synergySlot) => synergySlot.permanence === band.permanence)
              .map((synergySlot) => chip(synergySlot))}
          </Fragment>
        ))}
      </div>
    </aside>
  );
}
