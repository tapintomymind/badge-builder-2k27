/**
 * localStorage adapter (M3) — THE ONLY MODULE IN THE CODEBASE PERMITTED TO
 * TOUCH `window.localStorage` (tech-strategy.md §2, §9; scope.md §2 M3 NB-2).
 * A lint test pins that boundary.
 *
 * EVERY write is wrapped: `QuotaExceededError` (~5MB) and Safari
 * private-browsing both throw on `setItem`, and a failed autosave must
 * surface a visible non-blocking `AutosaveWarning` — never fail silently.
 * Silent autosave failure on a planning tool is the same failure class as a
 * wrong number (tech-strategy.md §9 finding #2). Writes therefore return a
 * typed `PersistResult` the caller must inspect.
 *
 * Serialization is delegated to the engine's PURE serializer
 * (serialize/deserializeSavedBuild) so the schemaVersion migration seam has
 * exactly one owner; this module owns only the I/O.
 *
 * Keys are origin-scoped by the browser; the dev-server port is pinned
 * (strictPort 5173) precisely so these keys never silently change origin.
 */

import {
  deserializeSavedBuild,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "../engine/serialization";
import type { DeserializedSavedBuild } from "../engine/serialization";
import type { SavedBuild } from "../engine/types";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";
const NAMED_BUILDS_KEY = "badge-builder-2k27:named-builds:v1";
/** UI prefs live under a key SEPARATE from the build envelope, so a layout
 * preference can never corrupt a saved build (design-spec §3.1 Section). */
const UI_STATE_KEY = "badge-builder-2k27:ui-state:v1";

export type PersistResult = { ok: true } | { ok: false; error: unknown };

function safeSetItem(key: string, value: string): PersistResult {
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Removal failure has no user-facing consequence worth a banner.
  }
}

// ---------------------------------------------------------------- autosave --

export function writeAutosave(saved: SavedBuild): PersistResult {
  return safeSetItem(AUTOSAVE_KEY, serializeSavedBuild(saved));
}

/** null = no autosave, or an unreadable/foreign envelope (never throws —
 * a corrupt autosave must not take the app down at boot). Carries the H8
 * drift report: `droppedEntries` lists loadout entries the deserializer
 * stripped because their badge id is absent from the current dataset, so the
 * boot path can disclose the drop instead of crash-looping on it. */
export function readAutosaveWithReport(): DeserializedSavedBuild | null {
  const text = safeGetItem(AUTOSAVE_KEY);
  if (text === null) return null;
  try {
    return deserializeSavedBuildWithReport(text);
  } catch {
    return null;
  }
}

/** The report-free form for callers that only need the build. */
export function readAutosave(): SavedBuild | null {
  return readAutosaveWithReport()?.saved ?? null;
}

export function clearAutosave(): void {
  safeRemoveItem(AUTOSAVE_KEY);
}

// ------------------------------------------------------------ named builds --

/** The named-builds store: id → the engine-serialized SavedBuild string.
 * Each entry keeps its own schemaVersion envelope, so per-build migration
 * (the engine's seam) still applies on read. */
type NamedBuildStore = Record<string, string>;

export interface NamedBuildSummary {
  id: string;
  name: string;
  savedAt: string;
  /** The dataset this plan was made against (H8) — the build manager shows a
   * warning dot when it differs from the current dataset. */
  dataVersion: string;
}

function readStore(): NamedBuildStore {
  const text = safeGetItem(NAMED_BUILDS_KEY);
  if (text === null) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as NamedBuildStore;
  } catch {
    return {};
  }
}

function writeStore(store: NamedBuildStore): PersistResult {
  return safeSetItem(NAMED_BUILDS_KEY, JSON.stringify(store));
}

/** A collision-safe id without reaching for APIs jsdom may lack. */
export function newBuildId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listNamedBuilds(): NamedBuildSummary[] {
  const store = readStore();
  const summaries: NamedBuildSummary[] = [];
  for (const [id, text] of Object.entries(store)) {
    try {
      const saved = deserializeSavedBuild(text);
      summaries.push({
        id,
        name: saved.name,
        savedAt: saved.savedAt,
        dataVersion: saved.dataVersion,
      });
    } catch {
      // An unreadable entry is skipped, never deleted — deleting data the
      // user may still want is not this module's call to make.
    }
  }
  summaries.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  return summaries;
}

/** null = no such build, or an unreadable envelope (never throws). Carries
 * the deserializer's full H8/heal report — `droppedEntries` and
 * `clearedSynergyRefs` — so the named-build LOAD route can disclose a strip
 * or heal exactly like the boot and import routes do. */
export function readNamedBuildWithReport(id: string): DeserializedSavedBuild | null {
  const text = readStore()[id];
  if (text === undefined) return null;
  try {
    return deserializeSavedBuildWithReport(text);
  } catch {
    return null;
  }
}

/** The report-free form for callers that only need the build. */
export function readNamedBuild(id: string): SavedBuild | null {
  return readNamedBuildWithReport(id)?.saved ?? null;
}

export function saveNamedBuild(id: string, saved: SavedBuild): PersistResult {
  const store = readStore();
  store[id] = serializeSavedBuild(saved);
  return writeStore(store);
}

export function deleteNamedBuild(id: string): PersistResult {
  const store = readStore();
  if (!(id in store)) return { ok: true };
  delete store[id];
  return writeStore(store);
}

export function renameNamedBuild(id: string, name: string): PersistResult {
  const saved = readNamedBuild(id);
  if (saved === null) return { ok: true };
  return saveNamedBuild(id, { ...saved, name });
}

// ---------------------------------------------------------------- UI state --

/** Open/closed accordion prefs, keyed by section id. Failures are swallowed:
 * a lost layout preference is not an autosave failure and earns no banner. */
export function readUiSectionOpen(sectionKey: string): boolean | null {
  const text = safeGetItem(UI_STATE_KEY);
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = (parsed as Record<string, unknown>)[sectionKey];
    return typeof value === "boolean" ? value : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------- recovery surface (boot) --
// Consumed ONLY by the render error boundary in src/main.tsx. This module is
// the single localStorage owner (the boundary lint), so the recovery screen's
// storage access lives here.

/**
 * Every raw persisted string under this app's keys, verbatim — the recovery
 * screen's "export raw saved data" escape hatch. Read-only: exporting must
 * work even (especially) when the data cannot be deserialized.
 */
export function exportRawPersistedData(): string {
  return JSON.stringify(
    {
      [AUTOSAVE_KEY]: safeGetItem(AUTOSAVE_KEY),
      [NAMED_BUILDS_KEY]: safeGetItem(NAMED_BUILDS_KEY),
      [UI_STATE_KEY]: safeGetItem(UI_STATE_KEY),
    },
    null,
    2,
  );
}

/**
 * Removes every key this app owns. ONLY ever reached from an explicit user
 * click on the recovery screen's "Clear saved data" action — NOTHING in the
 * codebase auto-clears storage (H8: never destroy the user's plan silently).
 */
export function clearAllPersistedData(): void {
  safeRemoveItem(AUTOSAVE_KEY);
  safeRemoveItem(NAMED_BUILDS_KEY);
  safeRemoveItem(UI_STATE_KEY);
}

export function writeUiSectionOpen(sectionKey: string, open: boolean): void {
  const text = safeGetItem(UI_STATE_KEY);
  let state: Record<string, unknown> = {};
  if (text !== null) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        state = parsed as Record<string, unknown>;
      }
    } catch {
      state = {};
    }
  }
  state[sectionKey] = open;
  safeSetItem(UI_STATE_KEY, JSON.stringify(state));
}
