/**
 * PinControl (design-spec §14.7, impl-brief F8-R2 §1(b)) — component #32.
 * ONE component, TWO hosts: the roster row's pin column and BadgeCard's action
 * line. Two kinds, `pin` and `exclude`, because they are the same affordance
 * pointed at opposite sides of the same question — "the roll may not move this"
 * and "the roll may not reach this" — and one <button aria-pressed> expresses
 * both.
 *
 * ---------------------------------------------------------------------------
 * WHY `Pin` AND NOT `Lock`. §14.1's vocabulary ruling, and it is a BUG FIX
 * rather than a preference. `lock` is already taken twice in this app:
 * §10.1's `Locked by attributes` pip state, carried by a 🔒 glyph on up to 53
 * cards, and §3.5's `Locked — unlock to assign badges` Synergy Slot state with
 * its `unlock` Toggle. A `Lock` control sitting on a card that simultaneously
 * renders 🔒-locked pips is the H1 failure mode exactly — one word for two
 * things — one level up from the `slot` case H1 was written for.
 *
 * Canonical: `Pin` · `Pinned` · `Unpin` · `Exclude` · `Excluded`. Never `Lock`,
 * `Locked`, `Unlock`, `Freeze`, `Keep`, `Hold`. `tests/vocabulary.test.ts`
 * lint class 3 holds this file to it.
 *
 * NO GLYPH. A padlock would re-import the collision the rename removes, and
 * §10.6's ≤3KB SVG budget is not being spent on decoration.
 * ---------------------------------------------------------------------------
 *
 * STATE IS CARRIED BY THE LABEL FIRST (§6): `Pin` → `Pinned` is a text change,
 * and the fill and rim are the second channel, never the only one.
 *
 * `aria-pressed` IS THE SEMANTIC, and it is why §14.10 does not need a fourth
 * live region for this control: a screen reader announces a pressed-state
 * change on a native <button> by itself. A region here would be the fourth,
 * and §6 allows three.
 *
 * TOUCH — the class is `.btn`, and that is load-bearing rather than cosmetic.
 * `.btn` already takes `min-height: var(--tap-target)` below 768 and is already
 * registered in `tests/layout-arithmetic.test.ts`'s S_TOUCH_FLOOR_CENSUS, whose
 * assertion 27 requires the censused selector set to EXACTLY equal the set of
 * rules declaring that floor. A bespoke `.pin-control { min-height: … }` would
 * redden a RUN-never-edit gate; a bespoke `44px` literal would escape the gate
 * and break the doctrine instead. Reusing `.btn` gets the floor at S, the chip
 * size at L (`.btn--sm` is 28px) and no new census entry. `.pin-control` adds
 * COLOUR AND PADDING ONLY and never a height.
 *
 * The Button PRIMITIVE is not reused because it has no `aria-pressed` and
 * `src/ui/primitives/**` is otherwise closed to this slice — Chip, Button,
 * SegmentedControl and Toggle are reused as shipped. The `.btn` CLASS is the
 * shared surface; the component is not.
 *
 * DISABLED + REASON, NEVER A TOOLTIP. Two implicit pins come from the engine
 * (`PinnedEntryNote.reason`) and the user may not clear either: a badge holding
 * a synergy role (clearing it could strand a `fuseBadgeId` — the F2.1 defect
 * class that cost real unrecoverable autosaves) and a stale purchase (the roll
 * never repairs a disclosure, H8). Both render `Pinned`, `disabled`, with an
 * `aria-describedby` reason — H4's INVARIANT verb, so disabling is correct
 * here. `title` is banned by §3.1: unreachable by keyboard and by touch.
 *
 * THE REASON SPAN IS NEVER INSIDE A DIMMED ELEMENT (§6). It is a SIBLING of the
 * button, not a child, so no `:disabled` opacity can reach it.
 *
 * ---------------------------------------------------------------------------
 * `reasonId` — WHY THE HOST MAY TAKE THE SPAN OFF US, AND WHY ONLY THE ROSTER
 * DOES. The default placement puts the sentence in the SAME BOX as the button.
 * On the card that box is `.badge-card__action`, a flex row inside a 249px
 * card, and the sentence wraps there for free (measured: 158.9px in a 249px
 * content box, zero overflow).
 *
 * In the ROSTER that box is a <td> — and a table column is sized by the
 * intrinsic width of what is in it. A 47-character sentence in the pin column
 * made that column's min-content 286.7px against the 60px `PIN_CHIP_MAX` the
 * layout arithmetic budgets for it, and a table cannot be laid out narrower
 * than its min-content: `.summary-roster__table { max-width: 520px }` was
 * silently inoperative and the table overflowed its card by up to 179.1px at
 * a 498px track. The fix is not to shrink the sentence — it is the ONLY place
 * the user learns which Synergy Slot a badge holds — but to stop it sizing a
 * column, by giving it the whole row.
 *
 * So the roster passes `reasonId`, renders the span itself in a spanning <tr>
 * (the device `.summary-roster__pin-mode` and `.summary-roster__stale` already
 * use), and this component renders NO span while still wiring
 * `aria-describedby` to it. §6 is not weakened by that — the sentence moves
 * FURTHER from the dimmed element, out of the button's box entirely.
 */

import { useId } from "react";

export type PinControlKind = "pin" | "exclude";

export interface PinControlProps {
  kind: PinControlKind;
  pressed: boolean;
  onToggle: () => void;
  /** The badge this control acts on — the accessible name has to say WHICH,
   *  because a roster of eleven `Pin` buttons is eleven identical names. */
  badgeName: string;
  /** When present the control is disabled and this is exposed via a sibling
   *  span + aria-describedby. Never a `title`. */
  disabledReason?: string;
  /** OPT-OUT OF RENDERING THE SPAN, NOT OF THE REASON. When the host supplies
   *  an id it owns the element carrying it, and `aria-describedby` points at
   *  the host's node instead of one this component made. Meaningless without
   *  `disabledReason` — an enabled control describes nothing. */
  reasonId?: string;
}

const LABELS: Record<PinControlKind, { off: string; on: string }> = {
  pin: { off: "Pin", on: "Pinned" },
  exclude: { off: "Exclude", on: "Excluded" },
};

/** `Unpin Posterizer` / `Pin Posterizer`. The visible label stays the short
 *  token; the accessible name carries the verb AND the target, so the control
 *  is unambiguous in a forms list. */
function accessibleName(kind: PinControlKind, pressed: boolean, badgeName: string): string {
  if (kind === "pin") return `${pressed ? "Unpin" : "Pin"} ${badgeName}`;
  return `${pressed ? "Stop excluding" : "Exclude"} ${badgeName}`;
}

export function PinControl({
  kind,
  pressed,
  onToggle,
  badgeName,
  disabledReason,
  reasonId,
}: PinControlProps) {
  const ownReasonId = useId();
  const disabled = disabledReason !== undefined;
  /** The host's id when it has one, ours otherwise. ONE id either way — the
   *  button always describes SOMETHING when it is disabled, and which node
   *  carries the sentence is a layout decision, not an a11y one. */
  const describedBy = reasonId ?? ownReasonId;
  const labels = LABELS[kind];
  return (
    <>
      <button
        type="button"
        className={`btn btn--sm pin-control pin-control--${kind}`}
        aria-pressed={pressed}
        aria-label={accessibleName(kind, pressed, badgeName)}
        aria-describedby={disabled ? describedBy : undefined}
        disabled={disabled}
        onClick={onToggle}
      >
        {pressed ? labels.on : labels.off}
      </button>
      {/* SIBLING, never a child: §6 forbids a reason inside a dimmed element,
          and `:disabled` styling stops at the button's own box. Skipped
          entirely when the host said it is rendering the sentence itself —
          two nodes with one id would be the defect, not the fix. */}
      {disabled && reasonId === undefined ? (
        <span id={ownReasonId} className="pin-control__reason">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}
