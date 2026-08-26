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
 * DESERIALIZE VALIDATES THE FULL BODY (H6 at the JSON boundary). Three
 * classes, deliberately distinct:
 *  - MALFORMED input (wrong types, invalid levels, duplicate loadout rows,
 *    junk synergy/config shapes) throws MalformedSavedBuildError — LOUDLY,
 *    never a cast-through into NaN ledgers or render crashes. Reserved for
 *    GENUINELY untyped/corrupt shapes only.
 *  - DATASET DRIFT (a badge id absent from the CURRENT dataset in an
 *    otherwise-valid build) is H8's supported scenario, NEVER a failure:
 *    those loadout entries are stripped into `droppedEntries` (and any
 *    synergy references to them cleared) so the UI can disclose the drop.
 *  - STRANDED SYNERGY REFS (a well-typed fuse/reaction badge id not in the
 *    loadout) are HEALABLE, never malformed (F2.1 re-ruling): the pre-F2
 *    app wrote exactly this state in normal use (removing a purchase did
 *    not clear its synergy role), and a user's real autosave must never be
 *    destroyed by an upgrade. The stale assignment is cleared into
 *    `clearedSynergyRefs` so the UI can disclose the heal.
 */

import { ATTRIBUTE_CEILING } from "../config";
import { normalizeBonus } from "./budget";
import { badgeById, shippedDataset } from "./dataset";
import { MalformedSavedBuildError, UnsupportedSchemaVersionError } from "./errors";
import { MAX_PLUS_TWO_SYNERGY_SLOTS, SYNERGY_SLOT_IDS, permanenceForSynergySlot } from "./synergy";
import type {
  AppConfig,
  BadgeDataset,
  BonusBudget,
  Budget,
  Build,
  LoadoutEntry,
  SavedBuild,
  SynergyRoleKind,
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
/** Exported so test 8.5 can assert LITERALLY that it is still empty. A
 * well-meaning schemaVersion bump + migration entry is the single change that
 * would brick every existing autosave, and F4's four persisted-shape changes
 * are all backward compatible BY CONSTRUCTION — none needs one. */
export const MIGRATIONS: Readonly<Record<number, (old: Record<string, unknown>) => Record<string, unknown>>> =
  {};

/** Everything the caller provides; the envelope fields are stamped here. */
export interface SavedBuildContent {
  name: string;
  build: Build;
  budgets: Record<Category, Budget>;
  /** [A5] The bonus layer — see SavedBuild.bonus. Required here too: the
   *  caller always holds one (`zeroBonus()` at worst), and an optional field
   *  would model a state the pipeline forbids. */
  bonus: BonusBudget;
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
    bonus: content.bonus,
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

/** One synergy assignment cleared at deserialize because it referenced a
 * badge id not in the build's loadout (F2.1 re-ruling): the pre-F2 app wrote
 * exactly this state in normal use — removing a purchase did not clear its
 * synergy role — so the condition heals with disclosure, never throws. */
export interface ClearedSynergyRef {
  synergySlotId: SynergySlotId;
  role: SynergyRoleKind;
  badgeId: string;
}

/** The deserializer's full result: the validated build plus the H8 drift
 * report. `droppedEntries` is empty in the normal case; it lists the loadout
 * entries whose badge id is absent from the CURRENT dataset — stripped, never
 * a failure, so the UI can disclose the drop (DriftBanner path).
 * `clearedSynergyRefs` lists stale synergy assignments healed because their
 * badge id was not in the loadout (disclosed on the same surface). */
export interface DeserializedSavedBuild {
  saved: SavedBuild;
  droppedEntries: LoadoutEntry[];
  clearedSynergyRefs: ClearedSynergyRef[];
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
  validateCapBrokenAttributes(problems, value["capBrokenAttributes"]);
}

/**
 * [A6] CAP BREAKERS — a STRICT SUPERSET of what shipped [A6-R5's table]. No
 * pre-A6 `SavedBuild` string gains a single problem: every shape that
 * deserialized before still deserializes, and `schemaVersion` stays 1 with
 * `MIGRATIONS` still empty.
 *
 * ABSENT is the normal state of every pre-A6 file and of every build with no
 * cap breaker; `null` is treated as absent, because refusing it buys nothing
 * and costs the user a build. NEITHER WRITES A DEFAULT:
 * `Build.capBrokenAttributes` is optional in TypeScript too, so absent IS a
 * legal value of the type and there is deliberately NO normalizer here
 * [A6-R5] — the `build` payload reaches the typed world through a blind cast,
 * so a normalizer would be a step a future slice could forget, and
 * required-in-TS would boot-crash every pre-A6 autosave while every in-memory
 * test stayed green.
 *
 * STRICTNESS MIRRORS THE SIBLING `attributes` ARM: finite, and within
 * 0..ATTRIBUTE_CEILING. NO INTEGER CHECK — `validateBudgets` has none for
 * `points`, and a strictness the shipped sibling lacks is the F4/R3 trap
 * running the other way. EXTRA KEYS ARE IGNORED, never a problem (a future
 * attribute, or a hand-edit typo, is not worth refusing a whole build over) —
 * `validateBonus`'s extra-keys row, verbatim.
 *
 * AND THERE IS DELIBERATELY NO `declared < attributes[attr]` CHECK. The app's
 * OWN UI produces that state in normal use: declare 83 against an entered 60,
 * then drag the slider to 90. A validator that refused it would refuse a
 * value the app itself wrote — the exact shape of all four of this project's
 * data-destruction defects (F2.1, F2.2, F4/A1, F4/R3). It is accepted
 * silently here, made INERT by `Math.max` in `effectiveAttribute`, and
 * disclosed in the UI. Same reasoning as the `+2`-cap comment in
 * `validateSynergyShape` below.
 */
function validateCapBrokenAttributes(problems: string[], capBroken: unknown): void {
  if (capBroken === undefined || capBroken === null) return; // ⇒ no cap breakers
  if (!isRecord(capBroken)) {
    problems.push("build.capBrokenAttributes must be an object when present");
    return;
  }
  for (const attr of ATTRS) {
    const declared = capBroken[attr];
    if (declared === undefined) continue; // ⇒ no cap breaker on this attribute
    if (!isFiniteNumber(declared) || declared < 0 || declared > ATTRIBUTE_CEILING) {
      problems.push(
        `build.capBrokenAttributes.${attr} must be a number between 0 and ${ATTRIBUTE_CEILING}`,
      );
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

/**
 * [A5] Shape-validates the bonus layer. A STRICT SUPERSET of what shipped:
 * ABSENT and `null` are both LEGAL and normalize to `zeroBonus()` — absent is
 * the normal state of every pre-A5 file, and refusing `null` buys nothing and
 * costs a build.
 *
 * STRICTNESS IS `validateBudgets`'s, BYTE FOR BYTE, and deliberately not more.
 * Finite and >= 0, with NO INTEGER CHECK: the shipped sibling has none for
 * `points`, and adding a strictness the sibling lacks is the F4/R3 trap
 * running the other way. Extra keys inside the applied records are IGNORED,
 * never a problem — a future category or a hand-edit typo is not worth
 * refusing a build over.
 *
 * [A5] NO Σ ≤ earned CHECK HERE, DELIBERATELY. The cap has exactly ONE owner:
 * validate-loadout.ts's `bonusEquipSlotsOverApplied` / `bonusPointsOverApplied`
 * SoftViolations (see the matching comment there).
 *
 * WHY: a user who earned 3, applied 3, then edits the total down to 2 at
 * season rollover reaches `Σ applied > earned` THROUGH THE UI with no external
 * editing — season-earned rewards expire, so the gesture is ordinary. With a
 * throw here, that state is written straight back by the autosave and REFUSED
 * on the next boot; the read swallows the throw and the app overwrites the
 * user's build with an empty one.
 *
 * The deserializer validates SHAPE. validateLoadout validates RULES. A state
 * ruled DISCLOSABLE must never be a state the deserializer REFUSES. All four
 * of this project's data-loss defects (F2.1, F2.2, F4/A1, F4/R3) are that one
 * shape: a validator refused a value it had not been widened for, and the
 * refusal reached a write path.
 */
function validateBonus(problems: string[], value: unknown): void {
  if (value === undefined || value === null) return; // absent ⇒ zeroBonus()
  if (!isRecord(value)) {
    problems.push("bonus must be an object when present");
    return;
  }
  for (const field of ["earnedEquipSlots", "earnedPoints"] as const) {
    const fieldValue = value[field];
    if (fieldValue === undefined) continue; // additive default: 0
    if (!isFiniteNumber(fieldValue) || fieldValue < 0) {
      problems.push(`bonus.${field} must be a non-negative number`);
    }
  }
  for (const field of ["appliedEquipSlots", "appliedPoints"] as const) {
    const applied = value[field];
    if (applied === undefined) continue; // additive default: six zeros
    if (!isRecord(applied)) {
      problems.push(`bonus.${field} must be an object when present`);
      continue;
    }
    for (const category of CATEGORIES) {
      const categoryValue = applied[category];
      if (categoryValue === undefined) continue; // additive default: 0
      if (!isFiniteNumber(categoryValue) || categoryValue < 0) {
        problems.push(`bonus.${field}.${category} must be a non-negative number`);
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
 * OPAQUELY (the M1 carve-out). Returns the raw records for reassembly.
 * Role references are checked for TYPE only (string | null) — loadout
 * membership is deliberately not a shape failure: a well-typed reference to
 * a badge outside the loadout is the healable stranded-ref condition,
 * partitioned after shape validation succeeds (F2.1 re-ruling). */
function validateSynergyShape(
  problems: string[],
  value: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    problems.push("synergy must be an array");
    return [];
  }
  const entries: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
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
    }
    // [F4/P3] disciplineLock: ABSENT is legal (every pre-F4 file), null is
    // legal, one of the six CATEGORIES is legal, anything else is a problem.
    // Absent normalizes to null in the reassembly below, BEFORE the `...raw`
    // spread can leak `undefined` into a declared `Category | null`.
    const disciplineLock = raw["disciplineLock"];
    if (
      disciplineLock !== undefined &&
      disciplineLock !== null &&
      !(CATEGORIES as readonly string[]).includes(disciplineLock as string)
    ) {
      problems.push(`synergy[${index}].disciplineLock must be absent, null, or a Category`);
    }
    for (const roleField of ["fuseBadgeId", "reactionBadgeId"] as const) {
      const reference = raw[roleField];
      if (reference === null) continue;
      if (typeof reference !== "string") {
        problems.push(`synergy[${index}].${roleField} must be null or a badge id string`);
      }
    }
    entries.push(raw);
  });
  // [F4/A1] NO +2 CAP CHECK HERE, DELIBERATELY. The cap has exactly ONE
  // owner: validateLoadout's `tooManyPlusTwoSynergySlots` HardViolation
  // (src/engine/validate-loadout.ts — see the matching comment there),
  // already rendered in SummaryPanel.
  //
  // WHY IT WAS REMOVED: F4 ratifies Synergy Slot 7 as a +2, so a pre-F4 build
  // that already designated two OTHER Synergy Slots normalizes to THREE at
  // load — a state F4 is ruled to DISCLOSE (H8: never un-designate a user's
  // choice). With a throw here, that ruled state was written straight back by
  // the mount-time autosave and REFUSED on the next boot, the read swallowed
  // the throw, and the app overwrote the user's build with an empty one.
  //
  // The deserializer validates SHAPE. validateLoadout validates RULES. A
  // state ruled DISCLOSABLE must never be a state the deserializer REFUSES.
  return entries;
}

function validateConfig(problems: string[], value: unknown): void {
  if (!isRecord(value)) {
    problems.push("config must be an object");
    return;
  }
  // [F4/P1] WIDENED AS A STRICT SUPERSET: "onFuse" is the new default and
  // every pre-F4 value stays legal, so a pre-F4 SavedBuild still deserializes
  // with zero problems. Unwidened, the flipped default would have written an
  // autosave this very function refuses on the next boot.
  const refundTrigger = value["refundTrigger"];
  if (
    refundTrigger !== "onFuse" &&
    refundTrigger !== "legendByAnyMeans" &&
    refundTrigger !== "legendByPermanentBoostOnly" &&
    refundTrigger !== "hofOrAbove"
  ) {
    problems.push(
      "config.refundTrigger must be onFuse, legendByAnyMeans, legendByPermanentBoostOnly, or hofOrAbove",
    );
  }
  const budgetStrategy = value["budgetStrategy"];
  if (budgetStrategy !== "manual" && budgetStrategy !== "derived") {
    problems.push("config.budgetStrategy must be manual or derived");
  }
  // [F4/P2] WIDENED AS A STRICT SUPERSET: null, or 0-2 DISTINCT Synergy Slot
  // ids (the pre-F4 rule was "exactly 2 distinct", so `[3,6]` still passes).
  // The total-across-ratified-and-designated cap is NOT enforced here — that
  // is validateLoadout's, for the same reason the +2 slot cap is (see
  // validateSynergyShape above).
  const plusTwoSlotIds = value["plusTwoSlotIds"];
  if (plusTwoSlotIds !== null) {
    const valid =
      Array.isArray(plusTwoSlotIds) &&
      plusTwoSlotIds.length <= MAX_PLUS_TWO_SYNERGY_SLOTS &&
      plusTwoSlotIds.every(isSynergySlotId) &&
      new Set(plusTwoSlotIds).size === plusTwoSlotIds.length;
    if (!valid) {
      problems.push(
        `config.plusTwoSlotIds must be null or up to ${MAX_PLUS_TWO_SYNERGY_SLOTS} distinct Synergy Slot ids`,
      );
    }
  }
}

/**
 * Full-body validation + the H8 drift partition + the F2.1 heal partition.
 * `envelope` has already passed the schemaVersion/dataVersion envelope
 * checks and any migrations. Throws MalformedSavedBuildError (with every
 * problem found) on genuinely untyped junk; strips dataset-drifted loadout
 * entries into `droppedEntries` (clearing synergy references to them), and
 * heals stranded synergy references into `clearedSynergyRefs`.
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
  validateBonus(problems, envelope["bonus"]);
  const shapedLoadout = validateLoadoutShape(problems, envelope["loadout"]);
  const shapedSynergy = validateSynergyShape(problems, envelope["synergy"]);
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
  const keptBadgeIds = new Set(kept.map((entry) => entry.badgeId));

  // --- Synergy role references, partitioned three ways: kept as-is (badge
  // in the loadout), cleared silently alongside its droppedEntries report
  // (dataset drift), or HEALED + reported (stranded ref — the pre-F2 app's
  // remove-without-clearing state; F2.1 re-ruling, never malformed). ---
  const clearedSynergyRefs: ClearedSynergyRef[] = [];
  const synergy = shapedSynergy.map((raw) => {
    // Spread first: unknown future fields round-trip OPAQUELY (M1 carve-out).
    const healed: Record<string, unknown> = { ...raw };
    // [F4/P3] Normalize an ABSENT disciplineLock to null BEFORE anything can
    // read it. The opaque `...raw` spread would otherwise leave the field
    // simply missing on a pre-F4 file, and `undefined !== null` would fire a
    // spurious violation on every slot of every old build.
    if (healed["disciplineLock"] === undefined) healed["disciplineLock"] = null;
    for (const roleKind of ["fuse", "reaction"] as const) {
      const roleField = roleKind === "fuse" ? "fuseBadgeId" : "reactionBadgeId";
      const reference = raw[roleField] as string | null;
      if (reference === null || keptBadgeIds.has(reference)) continue;
      healed[roleField] = null;
      if (!droppedIds.has(reference)) {
        // Stranded (not dataset drift): disclose the heal.
        clearedSynergyRefs.push({
          synergySlotId: raw["id"] as SynergySlotId,
          role: roleKind,
          badgeId: reference,
        });
      }
    }
    return healed as unknown as SynergySlot;
  });

  const saved: SavedBuild = {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: envelope["dataVersion"] as string,
    savedAt: savedAt as string,
    name: name as string,
    build: envelope["build"] as unknown as Build,
    budgets: envelope["budgets"] as unknown as Record<Category, Budget>,
    // [A5] THE ONE NORMALIZATION POINT. This reassembly is a LITERAL, not a
    // spread, so an absent `bonus` is simply lost unless it is named here.
    // Absent / null ⇒ zeroBonus(); partial ⇒ filled; extra keys ⇒ dropped.
    // Downstream (App.tsx's `fromSaved`) does NOT re-normalize.
    bonus: normalizeBonus(envelope["bonus"]),
    loadout: kept,
    synergy,
    config: envelope["config"] as unknown as AppConfig,
  };
  return { saved, droppedEntries, clearedSynergyRefs };
}

/**
 * Deserialize with the full H8 drift report. Throws
 * UnsupportedSchemaVersionError on an unreadable envelope and
 * MalformedSavedBuildError on a genuinely untyped body; dataset drift and
 * stranded synergy refs never throw — they are reported via
 * `droppedEntries` / `clearedSynergyRefs`.
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
