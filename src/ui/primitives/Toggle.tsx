/**
 * Toggle (design-spec §3.1) — native checkbox with role="switch"; the label
 * text IS the accessible name (no aria-label overrides). Built at M3 per the
 * §9 inventory; its consumers (overlays, filters, synergy unlocks) are M4.
 */

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabledReason?: string;
}

export function Toggle({ label, checked, onChange, disabledReason }: ToggleProps) {
  const disabled = disabledReason !== undefined;
  return (
    <label className="toggle">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
      />
      <span className="toggle__track" aria-hidden="true" />
      <span>{label}</span>
      {disabled ? <span className="hint">{disabledReason}</span> : null}
    </label>
  );
}
