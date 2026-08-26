/**
 * DriftBanner (design-spec §3.2, scope.md §3 H8) — persistent warning shown
 * on load when saved.dataVersion !== current.dataVersion. NEVER auto-migrates
 * and never silently re-validates the plan away.
 *
 * Also the disclosure surface for the deserializer's strip/heal report
 * (droppedEntries + clearedSynergyRefs) on EVERY route that deserializes —
 * boot, import, and named-build load.
 *
 * The action RECOMPUTES against the current dataset (M1's recheckEligibility)
 * and lists which purchased badges no longer qualify at the level planned —
 * MERGED with the deserializer's droppedEntries (via driftFromDroppedEntries)
 * so a stripped badge shows up as "removed from the dataset" instead of the
 * re-check claiming everything still qualifies. It does NOT diff — the old
 * dataset is not retained, so a true diff is impossible, and no dataset
 * snapshot is persisted to fake one.
 */

import { useState } from "react";
import { badgeById } from "../../engine/dataset";
import { driftFromDroppedEntries, recheckEligibility } from "../../engine/eligibility";
import type { EligibilityDrift } from "../../engine/eligibility";
import type { ClearedSynergyRef } from "../../engine/serialization";
import type { BadgeDataset, LoadoutEntry, SavedBuild } from "../../engine/types";
import { LEVEL_LABELS } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";

export interface DriftBannerProps {
  saved: SavedBuild;
  currentDataset: BadgeDataset;
  /** H8 drift disclosure (F1's deserializer report): loadout entries whose
   * badge id no longer exists in the current dataset — stripped at the
   * deserialize boundary, DISCLOSED here, never silently gone. Renders even
   * without a dataVersion mismatch (a hand-edited same-version import can
   * carry an unknown id too). */
  droppedEntries?: readonly LoadoutEntry[];
  /** F2.1 heal disclosure: synergy assignments cleared at the deserialize
   * boundary because they referenced a badge not in the build's loadout (the
   * pre-F2 remove path wrote exactly this state). Disclosed here, never
   * silently gone; renders with or without a dataVersion mismatch. */
  clearedSynergyRefs?: readonly ClearedSynergyRef[];
}

function driftLine(drift: EligibilityDrift, dataset: BadgeDataset): string {
  const badge = badgeById(dataset, drift.badgeId);
  const name = badge?.name ?? drift.badgeId;
  const planned = LEVEL_LABELS[drift.purchasedLevel];
  if (drift.droppedFromDataset) return `${name} (planned ${planned}, removed from the dataset)`;
  if (drift.heightBlocked) return `${name} (planned ${planned}, now height-blocked)`;
  if (drift.maxPurchasableLevel === null) {
    return `${name} (planned ${planned}, now qualifies at no level)`;
  }
  return `${name} (planned ${planned}, now ${LEVEL_LABELS[drift.maxPurchasableLevel]})`;
}

/** The dropped-entries disclosure line: names (ids — the badge left the
 * dataset, so no name exists to look up) plus what happened to them. */
function droppedLine(droppedEntries: readonly LoadoutEntry[], dataset: BadgeDataset): string {
  const labels = droppedEntries.map((entry) => {
    const badge = badgeById(dataset, entry.badgeId);
    return badge?.name ?? entry.badgeId;
  });
  const n = droppedEntries.length;
  return (
    `${n} badge${n === 1 ? "" : "s"} from this build no longer exist${n === 1 ? "s" : ""} ` +
    `in the dataset: ${labels.join(", ")} — removed from the plan.`
  );
}

/** The heal disclosure line: which Synergy Slot roles were cleared and which
 * badge each one pointed at (names resolve — the badge is still in the
 * dataset, just not in the loadout). */
function clearedRefsLine(
  clearedSynergyRefs: readonly ClearedSynergyRef[],
  dataset: BadgeDataset,
): string {
  const labels = clearedSynergyRefs.map((clearedRef) => {
    const name = badgeById(dataset, clearedRef.badgeId)?.name ?? clearedRef.badgeId;
    const role = clearedRef.role === "fuse" ? "Fuse" : "Reaction";
    return `Synergy Slot ${clearedRef.synergySlotId} ${role} → ${name}`;
  });
  const n = clearedSynergyRefs.length;
  return (
    `${n} synergy assignment${n === 1 ? "" : "s"} referenced ` +
    `${n === 1 ? "a badge" : "badges"} not in this build's loadout: ` +
    `${labels.join(", ")} — cleared.`
  );
}

export function DriftBanner({
  saved,
  currentDataset,
  droppedEntries = [],
  clearedSynergyRefs = [],
}: DriftBannerProps) {
  const [drift, setDrift] = useState<EligibilityDrift[] | null>(null);

  const versionDrift = saved.dataVersion !== currentDataset.dataVersion;
  const hasStripReport = droppedEntries.length > 0 || clearedSynergyRefs.length > 0;
  if (!versionDrift && !hasStripReport) return null;

  const stripLines = (
    <>
      {droppedEntries.length > 0 ? (
        <span className="drift-banner__dropped">
          {droppedLine(droppedEntries, currentDataset)}
        </span>
      ) : null}
      {clearedSynergyRefs.length > 0 ? (
        <span className="drift-banner__cleared">
          {clearedRefsLine(clearedSynergyRefs, currentDataset)}
        </span>
      ) : null}
    </>
  );

  if (!versionDrift) {
    // Strip/heal disclosure WITHOUT a version mismatch (a same-version
    // pre-F2 autosave or hand-edited import): the disclosure still renders;
    // the recheck action is version-drift-only.
    return (
      <Banner variant="warning" role="status">
        {stripLines}
      </Banner>
    );
  }

  return (
    <Banner
      variant="warning"
      role="status"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // Deserializer-dropped entries never reach `saved` (they were
            // stripped before the working state existed), so merge them in
            // via driftFromDroppedEntries — the re-check must not claim
            // everything qualifies while a badge sits removed above it.
            setDrift([
              ...driftFromDroppedEntries(droppedEntries),
              ...recheckEligibility(saved, currentDataset),
            ]);
          }}
        >
          Re-check eligibility
        </Button>
      }
    >
      Planned against dataset <span className="num">{saved.dataVersion}</span>; current is{" "}
      <span className="num">{currentDataset.dataVersion}</span>. Requirements may have changed —
      re-check eligibility.
      {hasStripReport ? <div className="drift-banner__list">{stripLines}</div> : null}
      {drift !== null ? (
        drift.length === 0 ? (
          <div className="drift-banner__list">
            Every purchased badge still qualifies at the level you planned.
          </div>
        ) : (
          <div className="drift-banner__list">
            <span>
              {drift.length} badge{drift.length === 1 ? "" : "s"} no longer qualify at the level
              you planned:
            </span>
            {drift.map((entry) => (
              <span key={entry.badgeId}>{driftLine(entry, currentDataset)}</span>
            ))}
          </div>
        )
      ) : null}
    </Banner>
  );
}
