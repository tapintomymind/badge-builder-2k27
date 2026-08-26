/**
 * AppHeader (design-spec §3.2) — title, BuildSwitcher, ProvenanceChip, and
 * (M4) the overlay toggles + Export/Import controls, in that order.
 */

import type { ReactNode } from "react";
import type { BadgeDataset } from "../../engine/types";
import { ProvenanceChip } from "./ProvenanceChip";

export interface AppHeaderProps {
  dataset: Pick<BadgeDataset, "dataVersion" | "source" | "asOf" | "confidence">;
  /** The BuildSwitcher slot (§3.6). */
  children?: ReactNode;
  /** M4: the two display-overlay toggles (Reactions / Season-reset). */
  overlayControls?: ReactNode;
  /** M4: Export / Import controls. */
  actions?: ReactNode;
}

export function AppHeader({ dataset, children, overlayControls, actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Badge Builder — 2K27</h1>
      {children}
      <ProvenanceChip dataset={dataset} />
      {overlayControls !== undefined ? (
        <div className="app-header__overlays">{overlayControls}</div>
      ) : null}
      {actions !== undefined ? <div className="app-header__actions">{actions}</div> : null}
    </header>
  );
}
