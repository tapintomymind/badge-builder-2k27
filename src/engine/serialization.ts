/**
 * SavedBuild serializer (H8 + the one genuine one-way door).
 *
 * PURE string ↔ object ONLY. No localStorage, no window, no I/O of any kind —
 * the storage adapter is M3's src/persist/. The engine never touches a
 * browser API.
 *
 * The schemaVersion envelope is the migration seam: when the persisted shape
 * changes, bump SAVED_BUILD_SCHEMA_VERSION and register a migration step.
 * Unknown (future) versions throw — never auto-migrate silently.
 *
 * `synergy` is round-tripped OPAQUELY at M1 (type-only carve-out, scope.md
 * §2 M1): the serializer preserves it verbatim and applies zero behavior.
 */

import { UnsupportedSchemaVersionError } from "./errors";
import type { AppConfig, BadgeDataset, Budget, Build, LoadoutEntry, SavedBuild, SynergySlot } from "./types";
import type { Category } from "./vocabulary";

export const SAVED_BUILD_SCHEMA_VERSION = 1 as const;

/**
 * Migration seam: step functions from schemaVersion N to N+1. Empty at v1 by
 * definition — the first entry arrives with the first shape change (M5 is the
 * known candidate: SavedBuild.budgets stops being user-entered).
 */
const MIGRATIONS: Readonly<Record<number, (old: Record<string, unknown>) => Record<string, unknown>>> =
  {};

/** Everything the caller provides; the envelope fields are stamped here. */
export interface SavedBuildContent {
  name: string;
  build: Build;
  budgets: Record<Category, Budget>;
  loadout: LoadoutEntry[];
  synergy: SynergySlot[];
  config: AppConfig;
}

/** Assembles a SavedBuild, stamping schemaVersion and the dataset's
 * dataVersion (H8: every plan records which snapshot it was made against). */
export function createSavedBuild(
  content: SavedBuildContent,
  dataset: BadgeDataset,
  savedAt: string = new Date().toISOString(),
): SavedBuild {
  return {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: dataset.dataVersion,
    savedAt,
    name: content.name,
    build: content.build,
    budgets: content.budgets,
    loadout: content.loadout,
    synergy: content.synergy,
    config: content.config,
  };
}

export function serializeSavedBuild(saved: SavedBuild): string {
  return JSON.stringify(saved);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deserializeSavedBuild(text: string): SavedBuild {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new UnsupportedSchemaVersionError(undefined, SAVED_BUILD_SCHEMA_VERSION);
  }
  const declaredVersion = parsed["schemaVersion"];
  if (typeof declaredVersion !== "number") {
    throw new UnsupportedSchemaVersionError(declaredVersion, SAVED_BUILD_SCHEMA_VERSION);
  }
  let version: number = declaredVersion;
  let envelope: Record<string, unknown> = parsed;
  while (version < SAVED_BUILD_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (step === undefined) {
      throw new UnsupportedSchemaVersionError(version, SAVED_BUILD_SCHEMA_VERSION);
    }
    envelope = step(envelope);
    version = version + 1;
  }
  if (version !== SAVED_BUILD_SCHEMA_VERSION) {
    // A FUTURE version — written by a newer build of the app. Refuse loudly.
    throw new UnsupportedSchemaVersionError(version, SAVED_BUILD_SCHEMA_VERSION);
  }
  if (typeof envelope["dataVersion"] !== "string") {
    throw new UnsupportedSchemaVersionError(version, SAVED_BUILD_SCHEMA_VERSION);
  }
  return envelope as unknown as SavedBuild;
}
