/**
 * BadgeGridSection (design-spec §3.4) — one <section> per Category:
 * the CategoryLedger as sticky group header, then the card <ul>.
 * (EmptyResults is M4 — there are no filters yet, so a section can never be
 * empty in M3.)
 */

import { useId } from "react";
import type { ReactNode } from "react";
import type { Category } from "../../engine/vocabulary";
import { categoryAnchorId } from "./anchors";

export interface BadgeGridSectionProps {
  category: Category;
  /** The CategoryLedger header — rendered by the parent so the ledger's
   * headingId and this section's aria-labelledby agree. */
  header: (headingId: string) => ReactNode;
  children: ReactNode;
}

export function BadgeGridSection({ category, header, children }: BadgeGridSectionProps) {
  const headingId = useId();
  return (
    <section
      className="grid-section"
      id={categoryAnchorId(category)}
      aria-labelledby={headingId}
    >
      {header(headingId)}
      <ul className="grid-section__cards">{children}</ul>
    </section>
  );
}
