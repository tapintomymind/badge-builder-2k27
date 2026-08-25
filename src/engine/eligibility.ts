/**
 * Eligibility engine (H3). The load-bearing semantics:
 *
 *  - `null` threshold means "this level is unreachable via this attribute
 *    line." Never 0, never "skip the line."
 *  - single: one line; null at L ⇒ L unreachable.
 *  - or: L passes iff AT LEAST ONE line has a NON-NULL threshold at L that
 *    the build meets.
 *  - and: L passes iff EVERY line has a NON-NULL threshold at L AND all are
 *    met. One null on any line makes L unreachable, full stop.
 *  - Levels are evaluated INDEPENDENTLY, never scanned until first failure.
 *    A gap is legal: if Silver fails and Gold passes, the answer is Gold —
 *    costs are total-to-own, so you buy Gold without ever owning Silver.
 *  - Height failure blocks the badge entirely.
 *  - Thresholds are >=, not >.
 */

import { badgeById } from "./dataset";
import type {
  Badge,
  BadgeDataset,
  BadgeEligibility,
  BadgeRequirements,
  Build,
  LoadoutEntry,
  SavedBuild,
} from "./types";
import type { PurchasableLevel } from "./vocabulary";
import {
  ATTR_LABELS,
  LEVEL_LABELS,
  PURCHASABLE_LEVELS,
  formatHeightInches,
  levelIndex,
} from "./vocabulary";

/** Does one attribute line pass at one level? null threshold ⇒ false. */
function linePassesAt(
  line: BadgeRequirements["attrs"][number],
  build: Build,
  level: PurchasableLevel,
): boolean {
  const threshold = line.perLevel[level];
  if (threshold === null) return false;
  return build.attributes[line.attr] >= threshold; // >=, not >
}

/** Does the badge's attribute logic pass at one level — evaluated for this
 * level alone, independent of every other level? */
export function levelPasses(
  requirements: BadgeRequirements,
  build: Build,
  level: PurchasableLevel,
): boolean {
  if (requirements.logic === "and") {
    return (
      requirements.attrs.length > 0 &&
      requirements.attrs.every((line) => linePassesAt(line, build, level))
    );
  }
  // "single" and "or": at least one line with a non-null, met threshold.
  return requirements.attrs.some((line) => linePassesAt(line, build, level));
}

/** Highest level that passes, computed per level. Gaps are legal. */
export function maxPurchasableLevel(badge: Badge, build: Build): PurchasableLevel | null {
  let max: PurchasableLevel | null = null;
  for (const level of PURCHASABLE_LEVELS) {
    if (levelPasses(badge.requirements, build, level)) max = level;
  }
  return max;
}

/**
 * Why one level fails, in the phrasing every disclosure surface shares
 * ("needs 90 Close or 93 Layup"). EXPORTED in F8-E1 — unchanged body, no new
 * rule — because the copy-as-text block must reproduce §3.4's stale-purchase
 * sentence, and it needs the reasons for the PURCHASED level specifically
 * rather than `validateBadge`'s union over all four.
 */
export function reasonsForLevel(
  requirements: BadgeRequirements,
  build: Build,
  level: PurchasableLevel,
): string[] {
  const levelLabel = LEVEL_LABELS[level];
  const reasons: string[] = [];
  if (requirements.logic === "and") {
    for (const line of requirements.attrs) {
      const threshold = line.perLevel[level];
      if (threshold === null) {
        reasons.push(`${levelLabel} is unreachable via ${ATTR_LABELS[line.attr]}`);
      } else if (build.attributes[line.attr] < threshold) {
        reasons.push(`needs ${threshold} ${ATTR_LABELS[line.attr]} for ${levelLabel}`);
      }
    }
    return reasons;
  }
  const nonNull = requirements.attrs.filter((line) => line.perLevel[level] !== null);
  if (nonNull.length === 0) {
    return [`${levelLabel} is unreachable via this badge's attributes`];
  }
  const needs = nonNull
    .map((line) => `${line.perLevel[level]} ${ATTR_LABELS[line.attr]}`)
    .join(" or ");
  return [`needs ${needs} for ${levelLabel}`];
}

/** Full eligibility for one badge against one build (seed: Gating semantics). */
export function validateBadge(badge: Badge, build: Build): BadgeEligibility {
  const { heightMinInches, heightMaxInches } = badge.requirements;
  if (build.heightInches < heightMinInches || build.heightInches > heightMaxInches) {
    return {
      allowed: false,
      maxPurchasableLevel: null,
      reasons: [
        `requires height ${formatHeightInches(heightMinInches)}–${formatHeightInches(heightMaxInches)}` +
          ` (build is ${formatHeightInches(build.heightInches)})`,
      ],
    };
  }
  const max = maxPurchasableLevel(badge, build);
  const reasons: string[] = [];
  for (const level of PURCHASABLE_LEVELS) {
    if (!levelPasses(badge.requirements, build, level)) {
      reasons.push(...reasonsForLevel(badge.requirements, build, level));
    }
  }
  return { allowed: true, maxPurchasableLevel: max, reasons };
}

/** One drifted loadout entry, as reported by recheckEligibility (H8). */
export interface EligibilityDrift {
  badgeId: string;
  purchasedLevel: PurchasableLevel;
  /** Recomputed against the CURRENT dataset. null = no level passes (or the
   * badge id no longer exists in the current dataset). */
  maxPurchasableLevel: PurchasableLevel | null;
  /** true when the build's height is now outside the badge's range. */
  heightBlocked: boolean;
  /** true when the badge id is absent from the current dataset entirely —
   * the deserializer strips such entries into `droppedEntries` (H8), and this
   * flag lets the drift report say "removed from the dataset" rather than the
   * weaker "qualifies at no level". */
  droppedFromDataset: boolean;
}

/**
 * Is this purchase STALE — bought at a level the build no longer supports?
 *
 * EXTRACTED IN F8-E1 from `recheckEligibility`'s own inline predicate, which
 * is refactored below to call it. ONE definition, two callers: the drift
 * report (H8 disclosure) and the summary roster / roll engine, which must
 * agree to the letter about what "no longer qualifies" means. A second copy
 * would be a fifth surface free to disagree with the other four.
 *
 * Two ways to be stale, and `maxPurchasableLevel === null` counts as exceeded:
 *  - the build's height is now outside the badge's range (blocks it entirely);
 *  - the purchased level is above the highest level that still passes.
 *
 * H8 — this DISCLOSES. Nothing anywhere repairs, clamps or removes a stale
 * entry: not the drift report, not the roster, not the roll.
 *
 * NOTE the one case this predicate does NOT own: a badge id absent from the
 * current dataset has no `Badge` to pass, so `recheckEligibility` keeps its
 * own `droppedFromDataset` branch above this call.
 */
export function entryIsStale(
  badge: Badge,
  build: Build,
  purchasedLevel: PurchasableLevel,
): boolean {
  const eligibility = validateBadge(badge, build);
  if (!eligibility.allowed) return true;
  return (
    eligibility.maxPurchasableLevel === null ||
    levelIndex(purchasedLevel) > levelIndex(eligibility.maxPurchasableLevel)
  );
}

/**
 * The H8 drift action's engine half, consumed by M3's DriftBanner.
 *
 * RECOMPUTES against the current dataset; does NOT diff against the old one —
 * the old dataset is not retained. Returns the purchased badges whose
 * purchasedLevel now exceeds their recomputed maxPurchasableLevel, plus any
 * now height-blocked. A badge id absent from the current dataset is reported
 * with maxPurchasableLevel null (it no longer qualifies at any level). Pure.
 */
export function recheckEligibility(
  saved: SavedBuild,
  currentDataset: BadgeDataset,
): EligibilityDrift[] {
  const drifted: EligibilityDrift[] = [];
  for (const entry of saved.loadout) {
    const badge = badgeById(currentDataset, entry.badgeId);
    if (badge === undefined) {
      drifted.push({
        badgeId: entry.badgeId,
        purchasedLevel: entry.purchasedLevel,
        maxPurchasableLevel: null,
        heightBlocked: false,
        droppedFromDataset: true,
      });
      continue;
    }
    const eligibility = validateBadge(badge, saved.build);
    // ONE definition of "stale" (F8-E1). The condition below is byte-for-byte
    // what this loop used to inline; `eligibility` is still read here because
    // the drift PAYLOAD needs its fields.
    if (entryIsStale(badge, saved.build, entry.purchasedLevel)) {
      drifted.push({
        badgeId: entry.badgeId,
        purchasedLevel: entry.purchasedLevel,
        maxPurchasableLevel: eligibility.maxPurchasableLevel,
        heightBlocked: !eligibility.allowed,
        droppedFromDataset: false,
      });
    }
  }
  return drifted;
}

/**
 * Represents the deserializer's `droppedEntries` (H8 dataset drift — badge
 * ids absent from the current dataset, stripped at the JSON boundary) in the
 * SAME drift-report shape the DriftBanner consumes, so the UI has exactly one
 * disclosure structure for both drift sources.
 */
export function driftFromDroppedEntries(
  droppedEntries: readonly LoadoutEntry[],
): EligibilityDrift[] {
  return droppedEntries.map((entry) => ({
    badgeId: entry.badgeId,
    purchasedLevel: entry.purchasedLevel,
    maxPurchasableLevel: null,
    heightBlocked: false,
    droppedFromDataset: true,
  }));
}
