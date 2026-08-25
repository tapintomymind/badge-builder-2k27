/**
 * AppHeader (design-spec §3.2) — title, BuildSwitcher, ProvenanceChip.
 * The overlay toggles and Export/Import buttons are M4 and are absent by
 * contract, not by omission.
 */

import type { ReactNode } from "react";
import type { BadgeDataset } from "../../engine/types";
import { ProvenanceChip } from "./ProvenanceChip";

export interface AppHeaderProps {
  dataset: Pick<BadgeDataset, "dataVersion" | "source" | "asOf" | "confidence">;
  /** The BuildSwitcher slot (§3.6). */
  children?: ReactNode;
}

export function AppHeader({ dataset, children }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Badge Builder — 2K27</h1>
      {children}
      <ProvenanceChip dataset={dataset} />
    </header>
  );
}
