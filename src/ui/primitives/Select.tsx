/**
 * Select (design-spec §3.1) — native <select>, minimally styled, inside a
 * WRAPPING <label> (native association; no htmlFor — see SegmentedControl
 * for why wrapping keeps the test environment fast). Used for the
 * fuse/reaction pickers and the "affordable at ≥ level" filter. Options are
 * grouped with <optgroup> (by Category for badge pickers).
 *
 * Ineligible options are `disabled` and carry the reason IN THE OPTION LABEL
 * ITSELF — a native disabled <option> cannot host a tooltip, so the reason
 * must be in the label. This is how H4's invariant class ("control not
 * offered + reason") is satisfied without a custom combobox.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Ungrouped options, rendered before any groups. */
  options?: SelectOption[];
  groups?: SelectGroup[];
}

function renderOption(option: SelectOption) {
  return (
    <option key={option.value} value={option.value} disabled={option.disabled}>
      {option.label}
    </option>
  );
}

export function Select({ label, value, onChange, options = [], groups = [] }: SelectProps) {
  return (
    <label className="select">
      <span className="select__label">{label}</span>
      <select
        className="select__control"
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      >
        {options.map(renderOption)}
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(renderOption)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
