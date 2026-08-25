/**
 * HeightField (design-spec §3.1) — ft/in inside one fieldset with a live
 * read-only inches echo, because every requirement in the dataset is
 * expressed in inches. Clamped on blur to the dataset's height range
 * (computed FROM the dataset — never a number invented here).
 */

import { useId } from "react";
import { formatHeightInches } from "../../engine/vocabulary";
import { NumberField } from "./NumberField";
import { Hint } from "./Hint";

export interface HeightFieldProps {
  heightInches: number;
  /** Dataset-derived clamp range, inclusive. */
  minInches: number;
  maxInches: number;
  onCommit: (heightInches: number) => void;
}

export function HeightField({ heightInches, minInches, maxInches, onCommit }: HeightFieldProps) {
  const hintId = useId();
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;

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
          describedBy={hintId}
          onCommit={(nextFeet) => {
            commitTotal(nextFeet * 12 + inches);
          }}
        />
        <NumberField
          label="in"
          value={inches}
          min={0}
          max={11}
          describedBy={hintId}
          onCommit={(nextInches) => {
            commitTotal(feet * 12 + nextInches);
          }}
        />
        <span className="height-field__echo num" aria-hidden="true">
          = {heightInches} in
        </span>
      </div>
      <Hint id={hintId}>
        {`Clamped to ${formatHeightInches(minInches)}–${formatHeightInches(maxInches)}, the range this dataset covers.`}
      </Hint>
    </fieldset>
  );
}
