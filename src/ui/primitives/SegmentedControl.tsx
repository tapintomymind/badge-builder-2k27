/**
 * SegmentedControl (design-spec §3.1) — a native fieldset of radios with
 * visually-hidden inputs and styled labels. Real radios give arrow-key
 * navigation and group semantics for free; never a row of <button>s.
 */

import { useId } from "react";

export interface SegmentedControlProps<T extends string> {
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  /** The Position control's treatment (§3.3): the only control in the app
   * that never uses --accent when active — it gates nothing. */
  muted?: boolean;
  describedBy?: string;
}

export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  muted,
  describedBy,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  return (
    <fieldset
      className={`segmented${muted ? " segmented--muted" : ""}`}
      aria-describedby={describedBy}
    >
      <legend>{legend}</legend>
      <span className="segmented__track">
        {options.map((option) => {
          const optionId = `${groupId}-${option}`;
          return (
            <span key={option}>
              <input
                type="radio"
                id={optionId}
                name={groupId}
                checked={value === option}
                onChange={() => {
                  onChange(option);
                }}
              />
              <label htmlFor={optionId}>{option}</label>
            </span>
          );
        })}
      </span>
    </fieldset>
  );
}
