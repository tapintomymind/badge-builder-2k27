/**
 * JumpNav (design-spec §4.5) — six in-page category chips. There is no
 * router: navigation is in-page anchors, sticky, horizontally scrollable at
 * mobile widths where it is the primary way around 53 cards.
 */

import { CATEGORIES } from "../../engine/vocabulary";
import { categoryAnchorId } from "./anchors";

export function JumpNav() {
  return (
    <nav className="jump-nav" aria-label="Categories">
      {CATEGORIES.map((category) => (
        <a key={category} href={`#${categoryAnchorId(category)}`}>
          {category}
        </a>
      ))}
    </nav>
  );
}
