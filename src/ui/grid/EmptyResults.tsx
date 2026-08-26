/**
 * EmptyResults (design-spec §3.4) — when filters yield 0 cards in a category,
 * the section header STILL renders (the ledger is still true) and this body
 * appears. When ALL categories are empty, the App renders the `all` variant
 * once, in place of the grid, with the FilterBar and rails staying live —
 * full chrome, no dead ends.
 */

import { Button } from "../primitives/Button";

export interface EmptyResultsProps {
  onClearAll: () => void;
  /** The single centered all-categories-empty variant. */
  all?: boolean;
}

export function EmptyResults({ onClearAll, all }: EmptyResultsProps) {
  return (
    <div className={`empty-results${all ? " empty-results--all" : ""}`}>
      <p>No badges match the current filters.</p>
      <Button variant="secondary" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
