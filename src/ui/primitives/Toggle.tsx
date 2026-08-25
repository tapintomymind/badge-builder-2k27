/**
 * Toggle (design-spec §3.1) — native checkbox with role="switch"; the label
 * text IS the accessible name (no aria-label overrides). Built at M3; the M4
 * `overlay` variant marks the two display-overlay toggles: its checked track
 * paints in --info (the preview color), matching the PreviewModeStrip so a
 * live preview control is visually of a piece with the preview surface.
 */

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabledReason?: string;
  /** M4: the preview-colored overlay-toggle treatment. */
  variant?: "default" | "overlay";
}

export function Toggle({ label, checked, onChange, disabledReason, variant = "default" }: ToggleProps) {
  const disabled = disabledReason !== undefined;
  return (
    <label className={`toggle${variant === "overlay" ? " toggle--overlay" : ""}`}>
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
