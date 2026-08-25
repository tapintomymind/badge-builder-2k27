/**
 * JumpNav (design-spec §4.5) — six in-page category chips. There is no
 * router: navigation is in-page anchors, sticky, horizontally scrollable at
 * mobile widths where it is the primary way around 53 cards.
 *
 * M4 (§5.2): below the L breakpoint the Synergy and Summary panels live
 * BELOW the grid, so the row gains two panel chips to reach them; at ≥1280
 * the panels sit in the visible right rail and the chips hide (CSS).
 */

import { CATEGORIES } from "../../engine/vocabulary";
import { categoryAnchorId } from "./anchors";

export interface JumpNavProps {
  /** In-page anchors for the below-grid panels (Synergy / Summary). */
  panelAnchors?: { id: string; label: string }[];
}

export function JumpNav({ panelAnchors = [] }: JumpNavProps) {
  return (
    <nav className="jump-nav" aria-label="Categories">
      {CATEGORIES.map((category) => (
        <a key={category} href={`#${categoryAnchorId(category)}`}>
          {category}
        </a>
      ))}
      {panelAnchors.map((anchor) => (
        <a key={anchor.id} className="jump-nav__panel" href={`#${anchor.id}`}>
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}
