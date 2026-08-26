/** Shared in-page anchor ids for the category sections (JumpNav targets),
 * and — F5.3/B — the per-category collapse preference keys. ONE module owns
 * both derived strings, because it is the module that already owns the
 * category → string mapping. */

import type { Category } from "../../engine/vocabulary";

export function categoryAnchorId(category: Category): string {
  return `cat-${category.toLowerCase()}`;
}

/**
 * The ui-state key for a category section's open/closed preference.
 *
 * The prefix is `category-`, NEVER `section-`. That is not cosmetic: the five
 * shipped `section-*` keys are the Build panel, its auto-collapse latch, the
 * attribute and budget sections and F5.2's three panels, and they live in the
 * same `ui-state:v1` blob. Keeping the two classes in disjoint namespaces is
 * what makes it impossible for a future reset of one class to touch the
 * other. Pinned by layout-arithmetic assertion 13.
 */
export function categorySectionStorageKey(category: Category): string {
  return `category-${category.toLowerCase()}`;
}
