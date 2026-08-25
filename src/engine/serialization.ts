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
 * `synergy` entries round-trip any UNKNOWN extra fields OPAQUELY (the M1
 * carve-out, scope.md §2 M1): known fields are validated, everything else is
 * preserved verbatim.
 *
 * DESERIALIZE VALIDATES THE FULL BODY (H6 at the JSON boundary). Two failure
 * classes, deliberately distinct:
 *  - MALFORMED input (wrong types, invalid levels, duplicate loadout rows,
 *    junk synergy/config shapes) throws MalformedSavedBuildError — LOUDLY,
 *    never a cast-through into NaN ledgers or render crashes.
 *  - DATASET DRIFT (a badge id absent from the CURRENT dataset in an
 *    otherwise-valid build) is H8's supported scenario, NEVER a failure:
 *    those loadout entries are stripped into `droppedEntries` (and any
 *    synergy references to them cleared) so the UI can disclose the drop.
 */

import { badgeById, shippedDataset } from "./dataset";
import { MalformedSavedBuildError, UnsupportedSchemaVersionError } from "./errors";
import { MAX_PLUS_TWO_SYNERGY_SLOTS, SYNERGY_SLOT_IDS, permanenceForSynergySlot } from "./synergy";
import type {
  AppConfig,
  BadgeDataset,
  Budget,
  Build,
  LoadoutEntry,
  SavedBuild,
  SynergySlot,
  SynergySlotId,
} from "./types";
import type { Category, PurchasableLevel } from "./vocabulary";
import { ATTRS, CATEGORIES, PURCHASABLE_LEVELS } from "./vocabulary";

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

function isPurchasableLevel(value: unknown): value is PurchasableLevel {
  return typeof value === "string" && (PURCHASABLE_LEVELS as readonly string[]).includes(value);
}

function isSynergySlotId(value: unknown): value is SynergySlotId {
  return typeof value === "number" && (SYNERGY_SLOT_IDS as readonly number[]).includes(value);
}

/** Build.position is display metadata, but junk in it is still junk. */
const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** The deserializer's full result: the validated build plus the H8 drift
 * report. `droppedEntries` is empty in the normal case; it lists the loadout
 * entries whose badge id is absent from the CURRENT dataset — stripped, never
 * a failure, so the UI can disclose the drop (DriftBanner path). */
export interface DeserializedSavedBuild {
  saved: SavedBuild;
  droppedEntries: LoadoutEntry[];
}

function validateBuild(problems: string[], value: unknown): void {
  if (!isRecord(value)) {
    problems.push("build must be an object");
    return;
  }
  if (!isFiniteNumber(value["heightInches"])) {
    problems.push("build.heightInches must be a finite number");
  }
  const position = value["position"];
  if (position !== undefined && !(POSITIONS as readonly unknown[]).includes(position)) {
    problems.push("build.position must be one of PG/SG/SF/PF/C when present");
  }
  const attributes = value["attributes"];
  if (!isRecord(attributes)) {
    problems.push("build.attributes must be an object");
    return;
  }
  for (const attr of ATTRS) {
    const attrValue = attributes[attr];
    if (!isFiniteNumber(attrValue) || attrValue < 0 || attrValue > 99) {
      problems.push(`build.attributes.${attr} must be a number between 0 and 99`);
    }
  }
}

function validateBudgets(problems: string[], value: unknown): void {
  if (!isRecord(value)) {
    problems.push("budgets must be an object");
    return;
  }
  for (const category of CATEGORIES) {
    const budget = value[category];
    if (!isRecord(budget)) {
      problems.push(`budgets.${category} must be an object`);
      continue;
    }
    for (const field of ["points", "equipSlots"] as const) {
      const fieldValue = budget[field];
      if (!isFiniteNumber(fieldValue) || fieldValue < 0) {
        problems.push(`budgets.${category}.${field} must be a non-negative number`);
      }
    }
  }
}

/** Shape-validates the loadout (types, valid PURCHASABLE levels, no duplicate
 * badge ids). Badge-id EXISTENCE is deliberately not checked here — that is
 * the dataset-drift partition, applied after shape validation succeeds. */
function validateLoadoutShape(problems: string[], value: unknown): LoadoutEntry[] {
  if (!Array.isArray(value)) {
    problems.push("loadout must be an array");
    return [];
  }
  const entries: LoadoutEntry[] = [];
  const seenBadgeIds = new Set<string>();
  value.forEach((entry: unknown, index: number) => {
    if (!isRecord(entry)) {
      problems.push(`loadout[${index}] must be an object`);
      return;
    }
    const badgeId = entry["badgeId"];
    const purchasedLevel = entry["purchasedLevel"];
    if (typeof badgeId !== "string" || badgeId.length === 0) {
      problems.push(`loadout[${index}].badgeId must be a non-empty string`);
    }
    if (!isPurchasableLevel(purchasedLevel)) {
      problems.push(
        `loadout[${index}].purchasedLevel must be one of ${PURCHASABLE_LEVELS.join("/")}` +
          " (Legend is boost-only and can never be purchased)",
      );
    }
    if (typeof badgeId !== "string" || badgeId.length === 0 || !isPurchasableLevel(purchasedLevel)) {
      return;
    }
    if (seenBadgeIds.has(badgeId)) {
      problems.push(`loadout has duplicate entries for badge id "${badgeId}"`);
      return;
    }
    seenBadgeIds.add(badgeId);
    entries.push({ badgeId, purchasedLevel });
  });
  return entries;
}

/** Validates known SynergySlot fields; unknown extra fields pass through
 * OPAQUELY (the M1 carve-out). Returns the raw records for reassembly. */
function validateSynergyShape(
  problems: string[],
  value: unknown,
  loadoutBadgeIds: ReadonlySet<string>,
): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    problems.push("synergy must be an array");
    return [];
  }
  const entries: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let plusTwoCount = 0;
  value.forEach((raw: unknown, index: number) => {
    if (!isRecord(raw)) {
      problems.push(`synergy[${index}] must be an object`);
      return;
    }
    const id = raw["id"];
    if (!isSynergySlotId(id)) {
      problems.push(`synergy[${index}].id must be a Synergy Slot id 1-8`);
      return;
    }
    if (seenIds.has(id)) {
      problems.push(`synergy has duplicate entries for Synergy Slot ${id}`);
      return;
    }
    seenIds.add(id);
    if (typeof raw["unlocked"] !== "boolean") {
      problems.push(`synergy[${index}].unlocked must be a boolean`);
    }
    const expectedPermanence = permanenceForSynergySlot(id);
    if (raw["permanence"] !== expectedPermanence) {
      problems.push(
        `synergy[${index}].permanence must be "${expectedPermanence}" for Synergy Slot ${id}`,
      );
    }
    const magnitude = raw["magnitude"];
    if (magnitude !== 1 && magnitude !== 2) {
      problems.push(`synergy[${index}].magnitude must be 1 or 2`);
    } else if (magnitude === 2) {
      plusTwoCount += 1;
    }
    for (const roleField of ["fuseBadgeId", "reactionBadgeId"] as const) {
      const reference = raw[roleField];
      if (reference === null) continue;
      if (typeof reference !== "string") {
        problems.push(`synergy[${index}].${roleField} must be null or a badge id string`);
        continue;
      }
      if (!loadoutBadgeIds.has(reference)) {
        problems.push(
          `synergy[${index}].${roleField} "${reference}" is not a badge in this build's loadout`,
        );
      }
    }
    entries.push(raw);
  });
  if (plusTwoCount > MAX_PLUS_TWO_SYNERGY_SLOTS) {
    problems.push(
      `at most ${MAX_PLUS_TWO_SYNERGY_SLOTS} Synergy Slots may carry +2 (found ${plusTwoCount})`,
    );
  }
  return entries;
}

function validateConfig(problems: string[], value: unknown): void {
  if (!isRecord(value)) {
    problems.push("config must be an object");
    return;
  }
  const refundTrigger = value["refundTrigger"];
  if (
    refundTrigger !== "legendByAnyMeans" &&
    refundTrigger !== "legendByPermanentBoostOnly" &&
    refundTrigger !== "hofOrAbove"
  ) {
    problems.push(
      "config.refundTrigger must be legendByAnyMeans, legendByPermanentBoostOnly, or hofOrAbove",
    );
  }
  const budgetStrategy = value["budgetStrategy"];
  if (budgetStrategy !== "manual" && budgetStrategy !== "derived") {
    problems.push("config.budgetStrategy must be manual or derived");
  }
  const plusTwoSlotIds = value["plusTwoSlotIds"];
  if (plusTwoSlotIds !== null) {
    const valid =
      Array.isArray(plusTwoSlotIds) &&
      plusTwoSlotIds.length === 2 &&
      plusTwoSlotIds.every(isSynergySlotId) &&
      plusTwoSlotIds[0] !== plusTwoSlotIds[1];
    if (!valid) {
      problems.push("config.plusTwoSlotIds must be null or two distinct Synergy Slot ids");
    }
  }
}

/**
 * Full-body validation + the H8 drift partition. `envelope` has already
 * passed the schemaVersion/dataVersion envelope checks and any migrations.
 * Throws MalformedSavedBuildError (with every problem found) on junk;
 * strips dataset-drifted loadout entries into `droppedEntries` and clears
 * synergy references to them.
 */
function validateBody(
  envelope: Record<string, unknown>,
  dataset: BadgeDataset,
): DeserializedSavedBuild {
  const problems: string[] = [];

  const name = envelope["name"];
  if (typeof name !== "string") problems.push("name must be a string");
  const savedAt = envelope["savedAt"];
  if (typeof savedAt !== "string") problems.push("savedAt must be a string");

  validateBuild(problems, envelope["build"]);
  validateBudgets(problems, envelope["budgets"]);
  const shapedLoadout = validateLoadoutShape(problems, envelope["loadout"]);
  const loadoutBadgeIds = new Set(shapedLoadout.map((entry) => entry.badgeId));
  const shapedSynergy = validateSynergyShape(problems, envelope["synergy"], loadoutBadgeIds);
  validateConfig(problems, envelope["config"]);

  if (problems.length > 0) {
    throw new MalformedSavedBuildError(problems);
  }

  // --- Dataset drift (H8): strip unknown badge ids, NEVER fail on them. ---
  const kept: LoadoutEntry[] = [];
  const droppedEntries: LoadoutEntry[] = [];
  for (const entry of shapedLoadout) {
    if (badgeById(dataset, entry.badgeId) === undefined) droppedEntries.push(entry);
    else kept.push(entry);
  }
  const droppedIds = new Set(droppedEntries.map((entry) => entry.badgeId));
  const synergy = shapedSynergy.map((raw) => {
    const fuseBadgeId = raw["fuseBadgeId"] as string | null;
    const reactionBadgeId = raw["reactionBadgeId"] as string | null;
    return {
      // Spread first: unknown future fields round-trip OPAQUELY (M1 carve-out).
      ...raw,
      fuseBadgeId: fuseBadgeId !== null && droppedIds.has(fuseBadgeId) ? null : fuseBadgeId,
      reactionBadgeId:
        reactionBadgeId !== null && droppedIds.has(reactionBadgeId) ? null : reactionBadgeId,
    } as unknown as SynergySlot;
  });

  const saved: SavedBuild = {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: envelope["dataVersion"] as string,
    savedAt: savedAt as string,
    name: name as string,
    build: envelope["build"] as unknown as Build,
    budgets: envelope["budgets"] as unknown as Record<Category, Budget>,
    loadout: kept,
    synergy,
    config: envelope["config"] as unknown as AppConfig,
  };
  return { saved, droppedEntries };
}

/**
 * Deserialize with the full H8 drift report. Throws
 * UnsupportedSchemaVersionError on an unreadable envelope and
 * MalformedSavedBuildError on a junk body; dataset drift never throws —
 * it is reported via `droppedEntries`.
 */
export function deserializeSavedBuildWithReport(
  text: string,
  dataset: BadgeDataset = shippedDataset,
): DeserializedSavedBuild {
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
  return validateBody(envelope, dataset);
}

/** The report-free form (same validation, same throws) for callers that only
 * need the build. Anything surfacing drift disclosure should use
 * deserializeSavedBuildWithReport instead. */
export function deserializeSavedBuild(
  text: string,
  dataset: BadgeDataset = shippedDataset,
): SavedBuild {
  return deserializeSavedBuildWithReport(text, dataset).saved;
}
