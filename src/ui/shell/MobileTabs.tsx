/**
 * MobileTabs (R12 slice 3 — the phone carve-out; user ruling 2026-08-26,
 * approved from the workbench mockup's phone section).
 *
 * THE WORKBENCH, TRANSLATED. At L the three stations of the planning loop are
 * three columns; below 768 they are three TABS — Build (physique +
 * attributes), Badges (the catalog), Synergy (slots + roster). The totals
 * strip stays pinned above this bar on every tab, so budget truth never
 * leaves the screen, which is the one property the column layout and the tab
 * layout genuinely share.
 *
 * PRESENTATIONAL ONLY. This component owns no state, reads no engine, and
 * renders no number. App owns which tab is active and which panels are
 * hidden — the same seam discipline `isLarge` / `isWide` already follow
 * (design-spec §16.10: one owner per breakpoint question).
 *
 * PANELS ARE HIDDEN, NEVER UNMOUNTED, and that is a contract rather than an
 * optimisation. Three things break the moment a tab unmounts its panel:
 *   1. the skip link's target (`#badge-grid`) and every `#cat-*` anchor stop
 *      existing while another tab is active — a dead link, not a slow one;
 *   2. the §6 live regions announce into a subtree that is being torn down;
 *   3. scroll position inside the catalog is lost on every switch, which is
 *      exactly the "switching cannot lose your place" property the tabs are
 *      supposed to buy.
 * Rendering all three and hiding two costs what the app already pays at every
 * width (53 cards are always in the tree), so the trade is free.
 *
 * ROLE SEMANTICS, and why they are the real ones. These are `role="tab"`
 * buttons in a `role="tablist"`, each pointing at its `role="tabpanel"` by
 * `aria-controls`, with roving `aria-selected`. The cheaper spelling — six
 * plain buttons that toggle `hidden` — reads to a screen reader as six
 * unrelated controls and gives no arrow-key navigation, on the one device
 * where a user is least able to hunt for the control they want.
 *
 * THE GLYPHS ARE DECORATIVE. Each carries `aria-hidden`, and the visible text
 * label beside it is the accessible name — colour and glyph are never the
 * only carrier (§6), the same rule the level pips follow.
 */

import type { KeyboardEvent } from "react";

/** The three stations. Ids double as the `aria-controls` target ids, so the
 *  panel and its tab cannot drift apart. */
export type MobileTabId = "build" | "badges" | "synergy";

export interface MobileTabDefinition {
  id: MobileTabId;
  label: string;
  /** Decorative — always aria-hidden; the label is the accessible name. */
  glyph: string;
}

/** THE ORDER IS THE LOOP, left to right: set the body, shop for badges, pair
 *  what you bought. It matches the column order at L exactly, so a user who
 *  learns the desktop layout already knows the phone one. */
export const MOBILE_TABS: readonly MobileTabDefinition[] = [
  { id: "build", label: "Build", glyph: "👤" },
  { id: "badges", label: "Badges", glyph: "▦" },
  { id: "synergy", label: "Synergy", glyph: "⇄" },
];

/** The DOM id of a tab's panel, and of its tab button. One builder each, so
 *  the `aria-controls` / `aria-labelledby` pair is impossible to mistype. */
export function mobileTabPanelId(id: MobileTabId): string {
  return `mobile-panel-${id}`;
}
export function mobileTabId(id: MobileTabId): string {
  return `mobile-tab-${id}`;
}

export interface MobileTabsProps {
  active: MobileTabId;
  onSelect: (id: MobileTabId) => void;
}

export function MobileTabs({ active, onSelect }: MobileTabsProps) {
  /** Arrow keys move between tabs and wrap, Home/End jump to the ends — the
   *  WAI-ARIA tabs pattern. Without this the tablist is a role that promises
   *  a behaviour it does not have, which is worse than no role at all. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = MOBILE_TABS.findIndex((tab) => tab.id === active);
    if (index === -1) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % MOBILE_TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + MOBILE_TABS.length) % MOBILE_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MOBILE_TABS.length - 1;
    else return;
    event.preventDefault();
    const target = MOBILE_TABS[next];
    if (target === undefined) return;
    onSelect(target.id);
    // Follow-focus, per the pattern: the newly selected tab takes focus so the
    // next arrow press continues from where the user actually is.
    document.getElementById(mobileTabId(target.id))?.focus();
  };

  return (
    <nav className="mobile-tabs" aria-label="Sections">
      <div className="mobile-tabs__list" role="tablist" onKeyDown={onKeyDown}>
        {MOBILE_TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={mobileTabId(tab.id)}
              type="button"
              role="tab"
              className={selected ? "mobile-tab mobile-tab--on" : "mobile-tab"}
              aria-selected={selected}
              aria-controls={mobileTabPanelId(tab.id)}
              // Roving tabindex: exactly ONE tab is in the tab order, and the
              // arrow keys move between them. Three tab stops for one control
              // group is the thing the pattern exists to avoid.
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                onSelect(tab.id);
              }}
            >
              <span className="mobile-tab__glyph" aria-hidden="true">
                {tab.glyph}
              </span>
              <span className="mobile-tab__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
