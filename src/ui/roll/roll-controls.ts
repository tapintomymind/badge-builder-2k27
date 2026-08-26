/**
 * The roll's session-state channel (F8-R2).
 *
 * WHY A CONTEXT AND NOT PROPS. Two consumers sit at opposite ends of the tree
 * and neither parent should have to know about the randomizer:
 *
 *   - LoadoutRoster is rendered by SummaryPanel, which is a summary renderer.
 *     It reads BuildSummary and paints it, and its H2 overlay guarantees are
 *     exactly where F8-S2 left them. Threading pins, pin modes and four roll
 *     handlers through it would couple the app's most overlay-sensitive
 *     component to a feature it neither reads nor affects.
 *   - BadgeCard is one of 53 instances inside the grid, and its prop list is
 *     already the widest in the app.
 *
 * So the roll state travels AROUND both. App.tsx provides; the two consumers
 * read. No intermediate component's signature changes.
 *
 * EVERYTHING HERE IS SESSION-ONLY. No pin, no pin mode, no exclusion and no
 * seed is ever written to SavedBuild. Persisting any of them would be a
 * SavedBuild shape change, which is a schemaVersion migration, which is the
 * reader-inventory ceremony, which collides with the deferred sourceId
 * envelope. Out of scope, deliberately, and cheap to keep that way.
 *
 * THE DEFAULT IS INERT, NOT ABSENT. A missing provider yields a control set
 * with no pins and no-op handlers rather than a thrown error, so any test or
 * surface that renders the summary or a card without the roll wiring still
 * paints completely. A control that does nothing is a truthful rendering of
 * "no roll session here"; a crash is not.
 */

import { createContext, useContext } from "react";
import type { PinMode } from "../../engine/randomize";
import type { Category } from "../../engine/vocabulary";

export interface RollControls {
  pinnedBadgeIds: ReadonlySet<string>;
  pinModes: Readonly<Record<string, PinMode>>;
  /** badgeId -> reason, for pins the user may not clear (synergy-role holder,
   *  stale purchase). Presence in this map is what disables the control. */
  implicitPinReasons: Readonly<Record<string, string>>;
  excludedBadgeIds: ReadonlySet<string>;
  onTogglePin: (badgeId: string) => void;
  onPinModeChange: (badgeId: string, mode: PinMode) => void;
  onToggleExclude: (badgeId: string) => void;
  onRerollCategory: (category: Category) => void;
}

const INERT: RollControls = {
  pinnedBadgeIds: new Set<string>(),
  pinModes: {},
  implicitPinReasons: {},
  excludedBadgeIds: new Set<string>(),
  onTogglePin: () => {},
  onPinModeChange: () => {},
  onToggleExclude: () => {},
  onRerollCategory: () => {},
};

export const RollControlsContext = createContext<RollControls>(INERT);

export function useRollControls(): RollControls {
  return useContext(RollControlsContext);
}
