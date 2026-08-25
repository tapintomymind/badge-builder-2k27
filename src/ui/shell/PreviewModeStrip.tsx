/**
 * PreviewModeStrip (design-spec §3.2, §4.4) — the structural H2 defense at
 * the UI layer: a persistent, visually distinct strip rendered ONLY while at
 * least one overlay is on, so the user cannot be in preview mode without
 * seeing that they are. Copy is exact per the spec.
 */

import type { OverlayState } from "../../engine/types";

export interface PreviewModeStripProps {
  overlay: OverlayState;
  /** How many categories currently show a season-reset projection row. */
  projectedCategoryCount: number;
  categoryCount: number;
}

export function PreviewModeStrip({
  overlay,
  projectedCategoryCount,
  categoryCount,
}: PreviewModeStripProps) {
  const sentences: string[] = [];
  if (overlay.reactionsActive) {
    sentences.push(
      "Preview: reactions activated. Card levels show in-game ceilings. Points are unchanged.",
    );
  }
  if (overlay.seasonReset) {
    sentences.push(
      `Preview: season reset. Synergy Slots 1–4 disabled. Primary points are unchanged; ${projectedCategoryCount} of ${categoryCount} categories show a projection.`,
    );
  }
  if (sentences.length === 0) return null;
  return <div className="preview-strip">{sentences.join(" ")}</div>;
}
