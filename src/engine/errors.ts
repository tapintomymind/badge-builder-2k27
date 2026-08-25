/**
 * Typed engine errors. Every impossible operation fails LOUDLY with a named
 * error — never a silent null, NaN, or `?? 0` (the H6 silent-wrong class).
 */

import type { Tier } from "./vocabulary";

/** Legend is boost-only and can never be purchased. Thrown by costForLevel;
 * the one legitimate nullable path is the explicitly-named costForLevelOrNull. */
export class LegendNotPurchasableError extends Error {
  constructor(tier: Tier) {
    super(
      `Legend is boost-only and has no purchase cost (tier ${tier}). ` +
        "Use costForLevelOrNull for a locked-pip cost preview.",
    );
    this.name = "LegendNotPurchasableError";
  }
}

/** The loader's ONLY guard class: a positional array whose length is not 4.
 * (Null placement and monotonicity are DATASET tests, not loader guards —
 * the H3 synthetic fixtures deliberately violate them and must stay loadable.) */
export class DatasetArityError extends Error {
  constructor(context: string, actualLength: number) {
    super(`${context}: expected a positional array of length 4, got ${actualLength}`);
    this.name = "DatasetArityError";
  }
}

/** A badge id that does not exist in the dataset being consulted. */
export class UnknownBadgeError extends Error {
  constructor(badgeId: string) {
    super(`Unknown badge id "${badgeId}"`);
    this.name = "UnknownBadgeError";
  }
}

/** A SavedBuild envelope this build of the app cannot read. */
export class UnsupportedSchemaVersionError extends Error {
  constructor(found: unknown, supported: number) {
    super(
      `Unsupported SavedBuild schemaVersion ${String(found)} (this build reads <= ${supported}). ` +
        "Never auto-migrate silently — surface this to the user.",
    );
    this.name = "UnsupportedSchemaVersionError";
  }
}

/**
 * A SavedBuild envelope whose BODY fails shape validation (H6 at the JSON
 * boundary): a hand-edited, corrupted, or foreign file must fail LOUDLY at
 * deserialize time — never cast through into cost arithmetic as NaN, a render
 * crash, or a silent double-count. `problems` lists every violation found so
 * the import banner can say exactly what was wrong.
 *
 * Deliberately NOT thrown for dataset drift (a badge id absent from the
 * current dataset in an otherwise-valid build) — that is H8's supported
 * scenario, reported via `droppedEntries` instead. Also NOT thrown for a
 * STRANDED synergy reference (a well-typed fuse/reaction badge id not in the
 * loadout) — the pre-F2 app wrote that state in normal use, so it heals into
 * `clearedSynergyRefs` (F2.1 re-ruling); destroying a user's real autosave
 * over it would be the exact silent loss this error class exists to prevent.
 */
export class MalformedSavedBuildError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Saved build failed validation: ${problems.join("; ")}`);
    this.name = "MalformedSavedBuildError";
    this.problems = problems;
  }
}
