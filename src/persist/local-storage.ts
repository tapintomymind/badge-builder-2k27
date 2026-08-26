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
/**
 * F2.3 A2 — the verbatim raw text of an autosave the deserializer READ, but
 * read LOSSILY: entries stripped by dataset drift, synergy references healed,
 * a magnitude overridden by ratified data, or a top-level field dropped by
 * the fixed-list reassembly. The in-memory build is a strictly poorer
 * derivative of these bytes, and the user's first edit persists it over them.
 *
 * A SECOND KEY, deliberately, rather than sharing `AUTOSAVE_QUARANTINE_KEY`.
 * Three reasons, in order of weight:
 *
 *  1. Sharing INVERTS the never-overwrite rule into data loss. Neither
 *     preserve path may clobber a standing one (rule 6 — an automatic write
 *     must never destroy bytes the user did not agree to destroy), so a
 *     drift preservation sitting in a shared key would silently block the
 *     strictly MORE severe unreadable case from ever being preserved. The
 *     fix would have manufactured the bug it exists to remove.
 *  2. The two conditions carry different disclosure. `QuarantineBanner` says
 *     "A saved build couldn't be read" and is keyed on the quarantine key's
 *     EXISTENCE — a drifted-but-readable autosave written there would raise
 *     that banner and tell the user something untrue.
 *  3. The drift case already has its own disclosure (`DriftBanner`) and its
 *     own acceptance gesture (the first edit). It is a different event.
 *
 * ONE ENTRY, NEVER A GROWING LIST — the same ~5MB budget rule the quarantine
 * key states, applied per key: at most two preserved envelopes exist at once,
 * and neither is ever appended to.
 */
const AUTOSAVE_PRESERVED_KEY = "badge-builder-2k27:autosave-preserved:v1";

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

/**
 * F2.3 R6 — "there is nothing stored" and "I could not ask" TOLD APART.
 *
 * `safeGetItem` returns null for both, and that ambiguity is load-bearing the
 * moment a read is used to decide whether to WRITE: reading a transient
 * failure as "someone else changed it" and suppressing the write turns a
 * hiccup into total autosave loss. Every read that gates a write goes through
 * this, and every such caller must FAIL OPEN on `failed`.
 */
export type RawReadOutcome =
  | { kind: "absent" }
  | { kind: "present"; raw: string }
  | { kind: "failed"; error: unknown };

function rawGetItem(key: string): RawReadOutcome {
  try {
    const text = window.localStorage.getItem(key);
    return text === null ? { kind: "absent" } : { kind: "present", raw: text };
  } catch (error) {
    return { kind: "failed", error };
  }
}

// ---------------------------------------------------------------- autosave --

export function writeAutosave(saved: SavedBuild): PersistResult {
  return safeSetItem(AUTOSAVE_KEY, serializeSavedBuild(saved));
}

/**
 * F2.3 A4 — what an autosave write DID, in enough detail for the caller to
 * keep an accurate "what is in storage right now" reference.
 *
 * `written.raw` is the EXACT string that reached storage. A caller that
 * re-derives it (`serializeSavedBuild(toEnvelope(...))` a second time) gets a
 * different `savedAt` and a permanently wrong reference, so the bytes are
 * returned rather than recomputed.
 */
export type AutosaveWriteOutcome =
  | { kind: "written"; raw: string }
  | { kind: "failed"; error: unknown }
  /** A foreign writer (another tab) has moved the key since this instance
   * last observed or wrote it, and the caller asked to refuse in that case.
   * NOTHING was written; `foreign` is what is in storage, untouched. */
  | { kind: "refused"; foreign: string };

/**
 * The UNGUARDED write — last-write-wins, and the caller means it.
 *
 * Used by the state-change writer, which runs behind a user gesture in THIS
 * tab. That is the bargain tech-strategy.md §9 documents and it is deliberately
 * left standing: refusing an intentional edit's write would silently disable
 * autosave for someone who is actively working, which converts another tab's
 * loss into this tab's total loss.
 */
export function writeAutosaveTracked(saved: SavedBuild): AutosaveWriteOutcome {
  const text = serializeSavedBuild(saved);
  const result = safeSetItem(AUTOSAVE_KEY, text);
  return result.ok ? { kind: "written", raw: text } : { kind: "failed", error: result.error };
}

/**
 * F2.3 A4 — the GUARDED write: optimistic concurrency for the unload flush.
 *
 * The flush fires with no user intent at all — a stale tab merely being
 * closed or backgrounded. Pre-fix it serialized an hour-old in-memory copy
 * and `setItem` over the key without ever reading what was there, so closing
 * yesterday's tab reverted today's work irrecoverably.
 *
 * `expected` is the exact string this instance last OBSERVED (its boot read)
 * or last WROTE. If storage holds something else, a foreign writer has moved
 * it and this envelope is not derived from what is there: preserve the
 * foreign bytes by writing nothing, and tell the caller.
 *
 * THREE DELIBERATE FAIL-OPEN CASES, each of which would otherwise convert a
 * benign condition into lost autosaves:
 *  - `failed` (R6): the read THREW. Unknowable is not "moved" — write.
 *  - `absent`: nothing is stored. A removal is not a foreign WRITE, and
 *    there are no bytes to preserve; refusing would leave the key empty
 *    forever after any "Clear just the autosave".
 *  - `present` and equal: the ordinary single-tab case, every time.
 *
 * Never adopts the foreign bytes and never reads them into memory — that is
 * the caller's own state's job, and adopting would destroy the other tab's
 * work to save this one's.
 */
export function writeAutosaveIfUnmoved(
  saved: SavedBuild,
  expected: string | null,
): AutosaveWriteOutcome {
  const current = rawGetItem(AUTOSAVE_KEY);
  if (current.kind === "present" && current.raw !== expected) {
    return { kind: "refused", foreign: current.raw };
  }
  return writeAutosaveTracked(saved);
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
  /** F2.3: `raw` is carried on the SUCCESS path too. The deserializer's result
   * can be a strictly poorer derivative of these bytes (drift strip, heal,
   * ratified override, dropped top-level field), so the caller needs the
   * original both to PRESERVE it and to hold it as its "what is in storage"
   * reference for the guarded write. */
  | { kind: "ok"; value: DeserializedSavedBuild; raw: string }
  /** The bytes exist and the deserializer refused them. `raw` is the VERBATIM
   * stored string — the user's data, intact. Never discard it. */
  | { kind: "unreadable"; raw: string; error: unknown };

export function readAutosaveResult(): AutosaveReadResult {
  const text = safeGetItem(AUTOSAVE_KEY);
  if (text === null) return { kind: "absent" };
  try {
    return { kind: "ok", value: deserializeSavedBuildWithReport(text), raw: text };
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

/**
 * F2.3 A2 — preserve the verbatim bytes of an autosave that was READ, but read
 * LOSSILY. Called from the boot path, during the boot render, before any write
 * derived from the poorer in-memory build can occur.
 *
 * NEVER overwrites a standing preservation, for the same reason
 * `quarantineAutosave` does not: an automatic boot-time write must never
 * destroy bytes the user never clicked anything to destroy (§0.1 rule 6), and
 * a later boot's bytes are already the degraded ones. That rule has a KNOWN
 * cost, recorded rather than hidden — a SECOND, later drift while an earlier
 * preservation stands is not preserved, and "Clear ALL saved data" on the
 * recovery screen is the only way to free the entry. Choosing the other way
 * round would put an automatic write on top of the user's older data, which is
 * the defect class this whole path exists to close.
 *
 * An already-present value is a SUCCESS, not a conflict — which also makes
 * this idempotent under a StrictMode double render.
 */
export function preserveAutosaveOriginal(raw: string): PersistResult {
  if (safeGetItem(AUTOSAVE_PRESERVED_KEY) !== null) return { ok: true };
  return safeSetItem(AUTOSAVE_PRESERVED_KEY, raw);
}

/** The preserved pre-transform autosave text, or null. Read-only. The raw
 * export ships the bytes themselves; this is how a test or a caller asks
 * whether a preservation stands. */
export function readPreservedAutosaveOriginal(): string | null {
  return safeGetItem(AUTOSAVE_PRESERVED_KEY);
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
      // F2.3 A2: same argument, and it is the WHOLE recovery route for a
      // lossily-read autosave — there is no banner action for this one, so
      // the raw export is how the preserved original gets back out.
      [AUTOSAVE_PRESERVED_KEY]: safeGetItem(AUTOSAVE_PRESERVED_KEY),
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
  /** F2.3: a standing preserved original is data the nuclear action destroys,
   * so the confirm has to be able to name it. */
  hasPreservedOriginal: boolean;
}

export function persistedDataBlastRadius(): PersistedDataBlastRadius {
  const listing = listNamedBuilds();
  return {
    namedBuildCount: listing.summaries.length + listing.unreadableCount,
    hasAutosave: safeGetItem(AUTOSAVE_KEY) !== null,
    hasQuarantine: safeGetItem(AUTOSAVE_QUARANTINE_KEY) !== null,
    hasPreservedOriginal: safeGetItem(AUTOSAVE_PRESERVED_KEY) !== null,
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
  // F2.3 A2: same rule, same reason. The confirm names this one too.
  safeRemoveItem(AUTOSAVE_PRESERVED_KEY);
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
