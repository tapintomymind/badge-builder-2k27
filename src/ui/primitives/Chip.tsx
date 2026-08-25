/**
 * Chip (design-spec §3.1) — text, not a control (filter chips are M4
 * <button aria-pressed> variants; none ship in M3).
 */

import type { ReactNode } from "react";

export interface ChipProps {
  children: ReactNode;
  variant?: "tier" | "level" | "warning" | "info" | "muted";
  /** For the level variant: the level color token painted behind dark text. */
  color?: string;
}

export function Chip({ children, variant = "muted", color }: ChipProps) {
  return (
    <span
      className={`chip chip--${variant}`}
      style={color !== undefined ? { background: color } : undefined}
    >
      {children}
    </span>
  );
}
