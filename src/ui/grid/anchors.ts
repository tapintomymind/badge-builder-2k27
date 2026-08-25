/** Shared in-page anchor ids for the category sections (JumpNav targets). */

import type { Category } from "../../engine/vocabulary";

export function categoryAnchorId(category: Category): string {
  return `cat-${category.toLowerCase()}`;
}
