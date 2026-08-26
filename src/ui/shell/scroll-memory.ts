/**
 * F14 — scroll memory for the right column, and NOTHING ELSE.
 *
 * WHY IT EXISTS. `history.scrollRestoration` and the browser's own
 * restore-on-reload operate on the DOCUMENT scroller. The app shell sets
 * `body { overflow: hidden }`, so there is no document scroller left for them
 * to restore and a reload would dump the user at the top of the badge grid.
 *
 * WHY IT IS ONE SCROLLER AND NOT TWO. Browsers do not restore NESTED scroller
 * positions either, and `.attr-pane` has been a nested scroller since F5.2 —
 * so the pane's offset is already lost on every reload today. Restoring
 * `.col-right` alone is therefore parity with what ships, not a new feature;
 * restoring the pane as well would be a new behaviour AND would fight any
 * focus-scroll on mount. The pane has <= 1376px of travel and is cheap to
 * re-establish by eye.
 *
 * ---------------------------------------------------------------------------
 * THE PERSISTENCE CONTRACT — five structural rules, and they are the point of
 * this file. This project has shipped FOUR data-loss defects, every one of
 * them in the persisted-READ path, every one of them the same shape: a
 * validator got stricter than the data it would actually meet, and the read
 * path failed OPEN into a write. A scroll offset must be structurally unable
 * to participate in that shape, so:
 *
 *  1. sessionStorage, NEVER localStorage. A different storage area entirely.
 *     It cannot be read by the autosave path, cannot be swept into an export,
 *     and cannot outlive the tab. `tests/ui/persist-boundary.test.ts` bans
 *     localStorage outside src/persist/ and this file is nowhere near it.
 *
 *  2. ONE key, and it is NOT build data. Never inside SavedBuild, never in the
 *     autosave envelope, never in the UI-prefs record that
 *     readUiSectionOpen/writeUiSectionOpen own. schemaVersion does not move,
 *     the deserializer never sees this value, and the ship gate's zero-diff
 *     comparison is untouched.
 *
 *  3. THE READ NEVER WRITES AND NEVER THROWS. No parse, no validation, no
 *     heal, no fallback write, no clear. A garbage value is IGNORED. That is
 *     the doctrine the four defects earned, applied to the cheapest payload in
 *     the app.
 *
 *  4. PHYSICAL SEPARATION. This module imports nothing from src/persist/** or
 *     src/engine/**, and nothing in either imports it. Stated as a property
 *     and asserted mechanically, because it is the only guarantee that
 *     survives a refactor that has forgotten why the rule exists.
 *
 *  5. THE WRITE IS COALESCED AND SWALLOWING. One rAF per scroll burst plus one
 *     on `pagehide`, wrapped so a quota or private-mode failure is silent. A
 *     scroll offset failing to persist is not disclosure-worthy — contrast an
 *     autosave failure, which raises a banner by design.
 *
 * THE HASH WINS. If the document loads with a fragment, the saved offset is
 * discarded: an anchor is an explicit destination and memory is not.
 *
 * SAFE BELOW THE SHELL'S GATE. Where the shell does not apply, `.col-right` is
 * not a scrollport: `scroll` never fires on it so nothing is ever written, and
 * the restore clamps to zero. No media query is consulted here and none should
 * be — a JS/CSS breakpoint pair is a classic desync.
 */

/** The one key. Namespaced `ui`, because that is exactly what it is. */
const KEY = "bb2k27.ui.scrollTop.colRight";

/**
 * Rule 3, in nine lines. Reads. Never writes, never throws, never heals.
 *
 * Every failure mode — absent key, absent storage, a disabled cookie jar, a
 * value someone typed into devtools — returns null and the column stays where
 * the browser put it.
 */
export function readColRightScrollTop(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Apply the remembered offset, CLAMPED to what the element can actually
 * scroll. The clamp is not politeness: a build whose badge grid is shorter
 * this session (a filter, a collapsed category) would otherwise be handed an
 * offset past its own end.
 *
 * Call from a layout effect that runs AFTER persisted open-state has been
 * applied — F5.3's per-category collapse and Section's open state are read
 * from storage during render, so a parent's useLayoutEffect is the right
 * moment: child layout effects have already run in the same commit.
 */
export function restoreColRightScrollTop(element: HTMLElement): void {
  if (window.location.hash !== "") return;
  const saved = readColRightScrollTop();
  if (saved === null) return;
  const travel = Math.max(0, element.scrollHeight - element.clientHeight);
  element.scrollTop = Math.min(saved, travel);
}

/**
 * Restore now, then keep the offset current for the rest of the tab session.
 * Returns the teardown.
 *
 * `pageshow` + `event.persisted` covers bfcache: a back-navigation restores
 * the whole DOM, but a scroller inside it is not guaranteed to come back at
 * the offset it left.
 */
export function mountColRightScrollMemory(element: HTMLElement): () => void {
  let frame = 0;

  const write = (): void => {
    frame = 0;
    try {
      sessionStorage.setItem(KEY, String(Math.round(element.scrollTop)));
    } catch {
      // Quota, private mode, a storage-partitioned iframe. Not a disclosure.
    }
  };

  const onScroll = (): void => {
    if (frame === 0) frame = requestAnimationFrame(write);
  };

  const onPageHide = (): void => {
    if (frame !== 0) cancelAnimationFrame(frame);
    write();
  };

  const onPageShow = (event: PageTransitionEvent): void => {
    if (event.persisted) restoreColRightScrollTop(element);
  };

  restoreColRightScrollTop(element);
  element.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    element.removeEventListener("scroll", onScroll);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
  };
}
