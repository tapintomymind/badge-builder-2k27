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
 */

import { useId } from "react";
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
      <Hint id={hintId}>
        {rangeHint ??
          `Clamped to ${formatHeightInches(minInches)}–${formatHeightInches(maxInches)}, the range this dataset covers.`}
      </Hint>
      {notice != null ? (
        <p id={noticeId} className="hint height-field__notice">
          <span className="height-field__notice-mark" aria-hidden="true">
            ⚠{" "}
          </span>
          {notice}
        </p>
      ) : null}
    </fieldset>
  );
}
