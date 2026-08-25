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
/** F2.2 A2 — the verbatim raw text of an autosave the deserializer REFUSED.
 * Written once, from the boot path, before any fresh-state write can occur.
 * EXACTLY ONE quarantine key, never a growing list: localStorage is ~5MB and
 * QuotaExceededError is a live concern here (tech-strategy.md §9). */
const AUTOSAVE_QUARANTINE_KEY = "badge-builder-2k27:autosave-quarantine:v1";

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

/**
 * F2.2 A1 — the boot read, with "there is no autosave" and "there is an
 * autosave and I could not read it" told APART.
 *
 * `readAutosaveWithReport()` collapsed both to `null`, and that ambiguity is
 * the whole of F-CORE: the caller could not tell destroyed data from a
 * first-ever boot, so it booted fresh and the mount-time autosave write
 * overwrote the unreadable-but-recoverable bytes.
 *
 * The `catch` STAYS — a corrupt autosave must still never take the app down
 * at boot. What changes is that the caller now LEARNS it happened, and gets
 * the verbatim bytes back so it can preserve them.
 */
export type AutosaveReadResult =
  | { kind: "absent" }
  | { kind: "ok"; value: DeserializedSavedBuild }
  /** The bytes exist and the deserializer refused them. `raw` is the VERBATIM
   * stored string — the user's data, intact. Never discard it. */
  | { kind: "unreadable"; raw: string; error: unknown };

export function readAutosaveResult(): AutosaveReadResult {
  const text = safeGetItem(AUTOSAVE_KEY);
  if (text === null) return { kind: "absent" };
  try {
    return { kind: "ok", value: deserializeSavedBuildWithReport(text) };
  } catch (error) {
    return { kind: "unreadable", raw: text, error };
  }
}

/** null = no autosave, or an unreadable/foreign envelope (never throws —
 * a corrupt autosave must not take the app down at boot). Carries the H8
 * drift report: `droppedEntries` lists loadout entries the deserializer
 * stripped because their badge id is absent from the current dataset, so the
 * boot path can disclose the drop instead of crash-looping on it.
 *
 * Retained as a thin wrapper over `readAutosaveResult()` (F2.2 A1): it has a
 * second caller (`readAutosave`) and existing test references, so the typed
 * reader lands ADDITIVELY. */
export function readAutosaveWithReport(): DeserializedSavedBuild | null {
  const result = readAutosaveResult();
  return result.kind === "ok" ? result.value : null;
}

/**
 * F2.2 A2 — preserve the verbatim bytes of an autosave the deserializer
 * refused. Called from the boot path BEFORE any fresh-state write can occur.
 *
 * NEVER overwrites an existing quarantine: the FIRST quarantine is the one
 * closest to the user's real data, and a later boot's bytes may already be
 * degraded. An already-present key is a success, not a conflict — which also
 * makes this idempotent under a StrictMode double render.
 */
export function quarantineAutosave(raw: string): PersistResult {
  if (safeGetItem(AUTOSAVE_QUARANTINE_KEY) !== null) return { ok: true };
  return safeSetItem(AUTOSAVE_QUARANTINE_KEY, raw);
}

/** The quarantined raw text, or null. Read-only — the banner uses it to know
 * a quarantine stands; the raw export ships the bytes themselves. */
export function readAutosaveQuarantine(): string | null {
  return safeGetItem(AUTOSAVE_QUARANTINE_KEY);
}

/** The ONLY path in F2.2 that deletes anything, and it is reached only from
 * an explicit, informed "Discard" click on the quarantine banner (§0.1 rule
 * 6: never auto-clear). */
export function clearAutosaveQuarantine(): void {
  safeRemoveItem(AUTOSAVE_QUARANTINE_KEY);
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

/** The store envelope as an object, or null when the stored text is present
 * but is NOT a JSON object. The single predicate behind both `readStore`
 * (which reads nothing) and `writeStore` (which now refuses to clobber
 * exactly what `readStore` refused to read). */
function parseStore(text: string): NamedBuildStore | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as NamedBuildStore;
  } catch {
    return null;
  }
}

function readStore(): NamedBuildStore {
  const text = safeGetItem(NAMED_BUILDS_KEY);
  if (text === null) return {};
  return parseStore(text) ?? {};
}

/**
 * F2.2 F-C — REFUSE to clobber an unparseable store envelope.
 *
 * `readStore()` returns `{}` when the envelope cannot be read; every mutator
 * then wrote a ONE-ENTRY object over bytes that held every named build. The
 * refusal is the minimum intervention: the bytes stay exactly where they
 * are, the caller gets `{ok:false}` and surfaces it through the existing
 * `PersistResult` → `AutosaveWarning` channel, and the recovery screen's raw
 * export still reaches them. No quarantine here, and NO auto-repair.
 *
 * REACHABILITY, honestly: this is not reachable from the app today —
 * `setItem` is atomic, and a throwing `setItem` provably leaves the prior
 * value byte-identical, so it needs exogenous corruption or a future format
 * change. It is fixed because it is STRUCTURALLY IDENTICAL to F-CORE with a
 * blast radius of every named build, and "not currently reachable" is
 * exactly what was true of the two earlier instances of this class until a
 * shape change made them reachable. Do not delete this as dead code.
 */
function writeStore(store: NamedBuildStore): PersistResult {
  const existing = safeGetItem(NAMED_BUILDS_KEY);
  if (existing !== null && parseStore(existing) === null) {
    return {
      ok: false,
      error: new Error(
        "Saved builds could not be read, so they were not overwritten. " +
          "Export raw saved data from the recovery screen before changing anything.",
      ),
    };
  }
  return safeSetItem(NAMED_BUILDS_KEY, JSON.stringify(store));
}

/**
 * F2.2 slices C + F — patch top-level fields on a stored entry WITHOUT
 * deserializing it.
 *
 * The deserializer applies the H8 drift strip AND the F2.1 stranded-ref
 * heal, and `validateBody` reconstructs the envelope from a fixed field
 * list — so running it on a RENAME or a DUPLICATE persists those
 * transformations over the user's original and drops unknown top-level
 * fields (F-A / F-D). `serializeSavedBuild` is compact `JSON.stringify`, so
 * parse → assign → stringify is a faithful round trip that preserves every
 * field and key order.
 *
 * Returns null if the stored text is not a parseable JSON object; the caller
 * writes nothing in that case.
 */
function patchStoredEntry(text: string, patch: Record<string, unknown>): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  return JSON.stringify({ ...(parsed as Record<string, unknown>), ...patch });
}

/** A collision-safe id without reaching for APIs jsdom may lack. */
export function newBuildId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface NamedBuildListing {
  summaries: NamedBuildSummary[];
  /** F2.2 disclosure: entries that are still stored but could not be read.
   * Skipping them is correct (deleting them is not this module's call), but
   * skipping them SILENTLY made an unreadable build vanish from the switcher
   * with no error and no banner. The count is what the switcher discloses. */
  unreadableCount: number;
}

export function listNamedBuilds(): NamedBuildListing {
  const store = readStore();
  const summaries: NamedBuildSummary[] = [];
  let unreadableCount = 0;
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
      // user may still want is not this module's call to make. It IS
      // counted, so the skip is disclosed rather than silent.
      unreadableCount += 1;
    }
  }
  summaries.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  return { summaries, unreadableCount };
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

/**
 * F2.2 F-A (P0) — a rename changes the NAME AND NOTHING ELSE.
 *
 * PRE-FIX this read through the full deserializer, discarded the report, and
 * wrote the TRANSFORMED result back over the original: the H8 drift strip
 * and the F2.1 stranded-ref heal were PERSISTED, and unknown top-level
 * fields were dropped — all from a gesture that said "rename". No amount of
 * disclosure makes "your loadout was also rewritten" an acceptable result of
 * typing a new name, so the fix patches the RAW stored string instead.
 *
 * This is the same property that already lets a single unreadable entry
 * survive a read-modify-write: the store keeps entry values as OPAQUE
 * STRINGS. We are extending an existing guarantee, not inventing one.
 */
export function renameNamedBuild(id: string, name: string): PersistResult {
  const store = readStore();
  const text = store[id];
  if (text === undefined) return { ok: true };
  const patched = patchStoredEntry(text, { name });
  // An unparseable entry cannot reach rename anyway (it is not in the
  // switcher); if it somehow does, write NOTHING rather than replace it.
  if (patched === null) return { ok: true };
  store[id] = patched;
  return writeStore(store);
}

/**
 * F2.2 F-D — a duplicate copies BYTES, not a transformation.
 *
 * `App`'s duplicate route read through the report-free deserializer, so the
 * copy was silently healed/stripped relative to its source. Patching the raw
 * string means there is no difference to disclose: the copy is byte-faithful
 * to its source apart from `name` and `savedAt`.
 *
 * `App` still computes the unique name (it needs the switcher's taken-name
 * set, which lives in React state).
 */
export function duplicateNamedBuild(
  sourceId: string,
  newId: string,
  name: string,
  savedAt: string,
): PersistResult {
  const store = readStore();
  const text = store[sourceId];
  if (text === undefined) return { ok: true };
  const patched = patchStoredEntry(text, { name, savedAt });
  if (patched === null) return { ok: true };
  store[newId] = patched;
  return writeStore(store);
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
      // F2.2 A2: without this the quarantined bytes are unreachable by the
      // only export we have — which would make the quarantine pointless.
      [AUTOSAVE_QUARANTINE_KEY]: safeGetItem(AUTOSAVE_QUARANTINE_KEY),
    },
    null,
    2,
  );
}

/** F2.2 slice D — what "Clear ALL saved data" is about to destroy, so the
 * recovery screen's confirm can NAME it instead of saying "clear it". */
export interface PersistedDataBlastRadius {
  namedBuildCount: number;
  hasAutosave: boolean;
  hasQuarantine: boolean;
}

export function persistedDataBlastRadius(): PersistedDataBlastRadius {
  const listing = listNamedBuilds();
  return {
    namedBuildCount: listing.summaries.length + listing.unreadableCount,
    hasAutosave: safeGetItem(AUTOSAVE_KEY) !== null,
    hasQuarantine: safeGetItem(AUTOSAVE_QUARANTINE_KEY) !== null,
  };
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
  // F2.2 A2: "clear everything" must not silently leave data behind — and
  // the confirm copy names the quarantine when one exists.
  safeRemoveItem(AUTOSAVE_QUARANTINE_KEY);
}

/**
 * F2.2 F-F — ruled to the MINIMUM, and deliberately silent.
 *
 * PRE-FIX a parse failure reset `state` to `{}` and wrote a one-key object
 * over the stored bytes: the same swallow-then-overwrite shape this slice
 * exists to eliminate, in the same file, for a future reader to copy. It now
 * REFUSES to overwrite a present-but-unparseable value.
 *
 * The payload is *which accordions are open*, so the ceremony stops there:
 * NO quarantine, NO banner, NO disclosure — that would exceed a layout
 * preference's worth. The value is deliberately treated as disposable on the
 * READ side (`readUiSectionOpen` already returns null and the app falls back
 * to its defaults); what is not acceptable is DESTROYING bytes we could not
 * read, however cheap we judge them. The recovery screen's "Clear ALL saved
 * data" is the explicit, user-clicked way out.
 */
export function writeUiSectionOpen(sectionKey: string, open: boolean): void {
  const text = safeGetItem(UI_STATE_KEY);
  let state: Record<string, unknown> = {};
  if (text !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return; // present but unparseable — leave the bytes exactly as they are.
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
    state = parsed as Record<string, unknown>;
  }
  state[sectionKey] = open;
  safeSetItem(UI_STATE_KEY, JSON.stringify(state));
}
