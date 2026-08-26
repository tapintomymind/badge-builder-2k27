/**
 * Banner (design-spec §3.1) — full-width bar, 3px left border in the semantic
 * color, body capped at 65ch. `persistent` banners cannot be dismissed while
 * their condition holds; `dismissible` ones dismiss for the session only.
 * role="status" for polite warnings; role="alert" is RESERVED for the
 * autosave-failure banner, the only genuinely urgent one.
 */

import type { ReactNode } from "react";

export interface BannerProps {
  children: ReactNode;
  variant: "info" | "warning" | "danger";
  role?: "status" | "alert";
  /** Rendered right-aligned (actions / dismiss). */
  actions?: ReactNode;
  onDismiss?: () => void;
}

export function Banner({ children, variant, role = "status", actions, onDismiss }: BannerProps) {
  return (
    <div className={`banner banner--${variant}`} role={role}>
      <div className="banner__body">{children}</div>
      {(actions !== undefined || onDismiss !== undefined) && (
        <div className="banner__actions">
          {actions}
          {onDismiss !== undefined ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
