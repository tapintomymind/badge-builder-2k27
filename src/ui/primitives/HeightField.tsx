/**
 * HeightField (design-spec §3.1; range position-derived as of rev 3/F3) —
 * ft/in inside one fieldset with a live read-only inches echo, because every
 * requirement in the dataset is expressed in inches. Clamped on blur to the
 * range passed in — pre-F3 the dataset's own coverage, post-F3 the currently
 * selected position's range (both come from the caller; no number is ever
 * invented here). The ft/in sub-field min/max stay coarse — the true bound
 * is enforced in the blur clamp, per §4.2's clamp-on-blur-never-on-keystroke
 * rule.
 *
 * `notice` is the clamp-on-position-switch disclosure (§3.3 rev 3):
 * persistent, never a toast, rendered directly beneath the fields and wired
 * into both inputs' aria-describedby. A value the app changed on the user's
 * behalf may not scroll away unread.
 *
 * F13 — the component returns a FRAGMENT, not a lone <fieldset>: the notice
 * is a SIBLING of the fieldset now rather than its last child. It is still
 * rendered directly beneath the fields, still persistent, still wired into
 * both inputs' aria-describedby (the association is by id and does not care
 * about nesting), and NOTHING ABOUT WHAT IT DISCLOSES CHANGED.
 *
 * The reason is layout, and it is measured. In the F13 physique strip the
 * fieldset is a grid ITEM sized to max-content. A ~90-character clamp
 * sentence nested inside it drags that item's max-content contribution out
 * to the width of the sentence — one transient notice re-flowing the whole
 * bar. As a sibling the notice takes its own full-width grid row and the
 * fieldset's column stays the width of `ft`, `in` and the `= NN in` echo.
 */

import { Fragment, useId } from "react";
import { formatHeightInches } from "../../engine/vocabulary";
import { NumberField } from "./NumberField";
import { Hint } from "./Hint";

export interface HeightFieldProps {
  heightInches: number;
  /** Caller-derived clamp range, inclusive. */
  minInches: number;
  maxInches: number;
  /** The live-bound hint (e.g. `SF: 6'4"–6'10"`). Falls back to the
   * dataset-range copy when omitted. */
  rangeHint?: string;
  /** Persistent clamp disclosure — rendered beneath the fields when set. */
  notice?: string | null;
  onCommit: (heightInches: number) => void;
}

export function HeightField({
  heightInches,
  minInches,
  maxInches,
  rangeHint,
  notice,
  onCommit,
}: HeightFieldProps) {
  const hintId = useId();
  const noticeId = useId();
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  const describedBy = notice != null ? `${hintId} ${noticeId}` : hintId;

  function commitTotal(totalInches: number) {
    onCommit(Math.min(maxInches, Math.max(minInches, totalInches)));
  }

  return (
    <Fragment>
      <fieldset className="height-field attr-group">
        <legend>Height</legend>
        <div className="height-field__row">
          <NumberField
            label="ft"
            value={feet}
            min={Math.floor(minInches / 12)}
            max={Math.floor(maxInches / 12)}
            describedBy={describedBy}
            onCommit={(nextFeet) => {
              commitTotal(nextFeet * 12 + inches);
            }}
          />
          <NumberField
            label="in"
            value={inches}
            min={0}
            max={11}
            describedBy={describedBy}
            onCommit={(nextInches) => {
              commitTotal(feet * 12 + nextInches);
            }}
          />
          <span className="height-field__echo num" aria-hidden="true">
            = {heightInches} in
          </span>
        </div>
        {/* THE SURVIVING RANGE READOUT (F13). Three surfaces recited the
            range before this slice — this hint, the Position hint, and the
            clamp notice. This one is the survivor because it is the one
            attached to the control the range actually constrains, and it
            updates live on a position switch: `rangeHint` is recomputed by
            PhysiqueStrip from `build.position` and the engine's range on
            every render. The Position hint's recitation was dropped (an
            orchestrator-ratified amendment to scope.md §0.1 A2's copy
            consequence); the clamp notice keeps its copy verbatim, because
            what it discloses is not duplication — it is the record of a
            value the app changed on the user's behalf. */}
        <Hint id={hintId}>
          {rangeHint ??
            `Clamped to ${formatHeightInches(minInches)}–${formatHeightInches(maxInches)}, the range this dataset covers.`}
        </Hint>
      </fieldset>
      {notice != null ? (
        <p id={noticeId} className="hint height-field__notice">
          <span className="height-field__notice-mark" aria-hidden="true">
            ⚠{" "}
          </span>
          {notice}
        </p>
      ) : null}
    </Fragment>
  );
}
