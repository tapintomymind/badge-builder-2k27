/**
 * SegmentedControl (design-spec §3.1) — a native fieldset of radios with
 * visually-hidden inputs and styled labels. Real radios give arrow-key
 * navigation and group semantics for free; never a row of <button>s.
 *
 * Labels WRAP their inputs (no htmlFor): the association is native either
 * way, and htmlFor label→control resolution in the jsdom test environment
 * walks the whole tree per label — wrapping keeps every UI test O(local).
 *
 * `disabledOptions` (M4, internal extension): per-option disabled state with
 * the reason exposed via aria-describedby — the H4 invariant treatment
 * ("control not offered + reason") needed by the +2 designator once two
 * Synergy Slots are designated. The reason span sits OUTSIDE the label so it
 * never pollutes the option's accessible name.
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
  /** Options that are disabled, each with its reason (aria-describedby). */
  disabledOptions?: Partial<Record<T, string>>;
}

export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  muted,
  describedBy,
  disabledOptions,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  return (
    <fieldset
      className={`segmented${muted ? " segmented--muted" : ""}`}
      aria-describedby={describedBy}
    >
      <legend>{legend}</legend>
      <span className="segmented__track">
        {options.map((option, optionIndex) => {
          const disabledReason = disabledOptions?.[option];
          const disabled = disabledReason !== undefined;
          const reasonId = `${groupId}-${optionIndex}-reason`;
          return (
            <span key={option}>
              <label>
                <input
                  type="radio"
                  name={groupId}
                  checked={value === option}
                  disabled={disabled}
                  aria-describedby={disabled ? reasonId : undefined}
                  onChange={() => {
                    onChange(option);
                  }}
                />
                <span className="segmented__option-text">{option}</span>
              </label>
              {disabled ? (
                <span id={reasonId} className="sr-only">
                  {disabledReason}
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
    </fieldset>
  );
}
