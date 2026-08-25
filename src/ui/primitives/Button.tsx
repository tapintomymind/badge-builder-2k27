/**
 * Button (design-spec §3.1) — always a native <button>. Disabled uses the
 * `disabled` attribute PLUS a sibling reason span referenced by
 * aria-describedby: H4's invariant class requires "disabled + reason", and a
 * title tooltip is unreachable by keyboard or touch.
 */

import type { ReactNode } from "react";
import { useId } from "react";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger-ghost";
  size?: "sm" | "md";
  /** When present, the button is disabled and this reason is exposed via a
   * sibling span + aria-describedby (never a title tooltip). */
  disabledReason?: string;
  type?: "button" | "submit";
  autoFocus?: boolean;
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabledReason,
  type = "button",
  autoFocus,
}: ButtonProps) {
  const reasonId = useId();
  const disabled = disabledReason !== undefined;
  return (
    <>
      <button
        type={type}
        className={`btn btn--${variant} btn--${size}`}
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabled ? reasonId : undefined}
        autoFocus={autoFocus}
      >
        {children}
      </button>
      {disabled ? (
        <span id={reasonId} className="hint">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}
