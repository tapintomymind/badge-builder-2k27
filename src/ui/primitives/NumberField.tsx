/**
 * NumberField (design-spec §3.1) — the 20 attribute inputs and 12 budget
 * inputs. Clamps ON BLUR, never on keystroke (clamping mid-keystroke makes
 * typing "85" impossible if you pass through "8"). Arrow steps 1,
 * Shift+Arrow steps 10. Every field has a visible <label>.
 */

import { useId, useState } from "react";

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  /** Budget fields carry the shared unverified treatment (§3.1): a warning
   * bottom border; the section-level banner is the single footnote. */
  unverified?: boolean;
  /** Optional hint id wired via aria-describedby. */
  describedBy?: string;
  /** Visually hide the label where visible text already labels the field
   * (the BudgetGrid table's column + row headers). Stays accessible. */
  hideLabel?: boolean;
  /** A5-U (design-spec §17.3) — select the whole value on focus, so a touch
   * user taps once and types one digit instead of tap → clear → type.
   *
   * DEFAULT OFF, and opt-in is the whole point: this is a feel change to a
   * primitive with twelve existing consumers, and flipping it globally
   * mid-project in a slice that is not about it is how a shipped control
   * changes under people. §17.3 prices that as a NAMED TRIGGER — if the base
   * budget fields turn out to feel clumsy, that is the fix, and it is the
   * user's call.
   *
   * Safe here because these are one-to-two-digit fields and because a native
   * number input steps from its VALUE regardless of selection, so ArrowUp /
   * Shift+ArrowUp are unaffected. */
  selectOnFocus?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function NumberField({
  label,
  value,
  min,
  max,
  onCommit,
  unverified,
  describedBy,
  hideLabel,
  selectOnFocus,
}: NumberFieldProps) {
  const id = useId();
  /** Local text while editing so blur-clamping never fights the keystroke. */
  const [draft, setDraft] = useState<string | null>(null);

  const shown = draft ?? String(value);
  const unset = draft === null && value === 0;

  function commit(text: string) {
    setDraft(null);
    const parsed = Number.parseInt(text, 10);
    onCommit(Number.isNaN(parsed) ? min : clamp(parsed, min, max));
  }

  const classes = [
    "number-field",
    unset ? "number-field--unset" : "",
    unverified ? "number-field--unverified" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <label
        className={hideLabel ? "sr-only" : "number-field__label"}
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={shown}
        aria-describedby={describedBy}
        onFocus={
          selectOnFocus === true
            ? (event) => {
                event.currentTarget.select();
              }
            : undefined
        }
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        onBlur={(event) => {
          commit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            const direction = event.key === "ArrowUp" ? 10 : -10;
            const parsed = Number.parseInt(event.currentTarget.value, 10);
            const base = Number.isNaN(parsed) ? value : parsed;
            setDraft(null);
            onCommit(clamp(base + direction, min, max));
          }
          if (event.key === "Enter") {
            commit(event.currentTarget.value);
          }
        }}
      />
    </span>
  );
}
