/**
 * Position → height range table — USER-SUPPLIED 2K27 DATA (scope.md §0.1 A2).
 *
 * provenance: user-supplied 2026-08-26, PG min confirmed same date
 *
 * HAND-AUTHORED, NOT GENERATED. This table is deliberately NOT part of
 * badges.json (which is generated verbatim from the sealed seed listing) and
 * NOT part of src/config/ (the unpublished-2K seam — this is the opposite:
 * KNOWN data, supplied by the user). All ten bounds are user-confirmed; the
 * PG minimum was explicitly confirmed verbatim ("5'9 yes for PG",
 * 2026-08-26). Do not round them, do not derive a "typical" range, do not
 * fill a gap — a mismatch with the app means ASK THE USER, never adjust.
 *
 * ACCESS RULE: src/ui/** must NEVER import this module. The engine's
 * positionHeightRange() (src/engine/validate-build.ts) is the only route by
 * which the UI may learn a range — tests/architecture.test.ts lints this.
 */

import type { Position } from "../engine/vocabulary";

export interface PositionHeightBounds {
  minInches: number;
  maxInches: number;
}

/**
 * Provenance, mirroring badges.json's H8 block on this module's OWN version
 * line — a position-table correction never forces a badges.json dataVersion
 * bump, and vice versa.
 */
export const positionHeightsProvenance = Object.freeze({
  positionDataVersion: "2026-08-26.1",
  source: "User-supplied from the in-game 2K27 MyPlayer builder",
  asOf: "2026-08-26",
  /** The 2K27 patch this reflects — still unknown. NEVER guessed (H8). */
  gameVersion: null as string | null,
  /** Deliberately NOT badges.json's {pre-release|launch|patched} union —
   * a different provenance class. */
  confidence: "user-supplied" as const,
  /** Verbatim provenance string (impl-brief F3 §2). */
  provenance: "user-supplied 2026-08-26, PG min confirmed same date",
});

/** The ten user-supplied bounds, verbatim. Inches are authoritative. */
export const POSITION_HEIGHT_RANGES: Readonly<
  Record<Position, Readonly<PositionHeightBounds>>
> = Object.freeze({
  PG: Object.freeze({ minInches: 69, maxInches: 79 }), // 5'9" – 6'7"
  SG: Object.freeze({ minInches: 72, maxInches: 80 }), // 6'0" – 6'8"
  SF: Object.freeze({ minInches: 76, maxInches: 82 }), // 6'4" – 6'10"
  PF: Object.freeze({ minInches: 77, maxInches: 84 }), // 6'5" – 7'0"
  C: Object.freeze({ minInches: 79, maxInches: 88 }), // 6'7" – 7'4"
});
