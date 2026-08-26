/**
 * BadgeGridSection (design-spec §3.4, §15.8) — one <section> per Category:
 * the CategoryLedger digest as sticky group header, then the card <ul>.
 *
 * F5.3/B — THE CATEGORY IS COLLAPSIBLE, and the structure is a ruling:
 *
 *   <section className="grid-section" id={categoryAnchorId(category)}>
 *     <details className="grid-section__disclosure">
 *       <summary className="category-ledger"> … the digest …
 *       … the lede …
 *       <ul className="grid-section__cards">
 *
 * THE <section> LINE DOES NOT MOVE. `#cat-{name}` is the head of the --cat
 * custom-property chain that four identity surfaces inherit from; custom
 * property inheritance does not care about <details> open state, display, or
 * nesting depth, but it cares very much WHICH element carries the id. The
 * <details> therefore carries no id of its own (assertion 11).
 *
 * COLLAPSE IS DISPLAY-ONLY. This component imports NOTHING from src/engine/
 * (assertion 14): a collapsed category still spends Badge Points, still
 * counts Badge Slots, still appears in the rail ledger and the Summary, and
 * still exports. Hiding cards is a view state, never a plan state.
 */

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import type { Category } from "../../engine/vocabulary";
import { readUiSectionOpen, writeUiSectionOpen } from "../../persist/local-storage";
import { categoryAnchorId, categorySectionStorageKey } from "./anchors";

/**
 * Does the current fragment name this section, or anything INSIDE it?
 *
 * The `#cat-*` half is the shipped JumpNav case. The second half is F16's:
 * a Loadout board tile links to `#badge-{id}` on a card's own <li>, and that
 * <li> lives inside this section's <details>. A closed <details> still keeps
 * its children in the DOM, so the node is findable and `contains` answers
 * truthfully — which is what lets a board tile reveal a card in a discipline
 * the user had collapsed. Without it the link would scroll to a hidden node
 * and appear to do nothing.
 */
function hashTargetsThisSection(category: Category): boolean {
  const hash = window.location.hash;
  if (hash.length < 2) return false;
  if (hash === `#${categoryAnchorId(category)}`) return true;
  const section = document.getElementById(categoryAnchorId(category));
  const target = document.getElementById(hash.slice(1));
  return section !== null && target !== null && section.contains(target);
}

export interface BadgeGridSectionProps {
  category: Category;
  /** The CategoryLedger DIGEST — it renders as this section's <summary>, so
   * it is rendered by the parent to keep the ledger's headingId and this
   * section's aria-labelledby in agreement. */
  digest: (headingId: string) => ReactNode;
  /** The CategoryLedger LEDE — meter, refunded, feasibility, projection. */
  lede: () => ReactNode;
  children: ReactNode;
}

export function BadgeGridSection({ category, digest, lede, children }: BadgeGridSectionProps) {
  const headingId = useId();
  const storageKey = categorySectionStorageKey(category);
  /** All six default OPEN: the zero state renders the full instrument. The
   * Build panel's mobile auto-collapse latch is a Build-panel behaviour and
   * is deliberately NOT extended here. */
  const [open, setOpen] = useState<boolean>(() => readUiSectionOpen(storageKey) ?? true);

  /**
   * A JumpNav chip pointing into a COLLAPSED section must open it. The
   * browser's native ancestor-revealing algorithm does not help: the target
   * <section> is the details' ANCESTOR, not its descendant, so nothing is
   * hidden from the fragment-navigation algorithm's point of view.
   *
   * The auto-open PERSISTS, because the section genuinely is open now and a
   * reload must not re-collapse what the user is looking at.
   *
   * `open` is deliberately NOT a dependency. Clicking the same JumpNav chip
   * twice fires no `hashchange` at all, so jump → deliberately collapse →
   * click the same chip does nothing — which is the correct reading of "I
   * collapsed that on purpose." Adding `open` here would make the effect
   * re-fire on the collapse itself and re-open it under the user.
   */
  useEffect(() => {
    const openIfTargeted = () => {
      if (!hashTargetsThisSection(category)) return;
      setOpen(true);
      writeUiSectionOpen(storageKey, true);
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => {
      window.removeEventListener("hashchange", openIfTargeted);
    };
  }, [category, storageKey]);

  return (
    <section
      className="grid-section"
      id={categoryAnchorId(category)}
      aria-labelledby={headingId}
    >
      {/* No aria-expanded: the browser maps it from `open`. Hand-authoring it
          is redundant and can conflict with the native mapping. */}
      <details
        className="grid-section__disclosure"
        open={open}
        onToggle={(event) => {
          const next = event.currentTarget.open;
          setOpen(next);
          writeUiSectionOpen(storageKey, next);
        }}
      >
        {digest(headingId)}
        {lede()}
        <ul className="grid-section__cards">{children}</ul>
      </details>
    </section>
  );
}
