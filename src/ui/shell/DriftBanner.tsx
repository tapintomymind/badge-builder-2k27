/**
 * DriftBanner (design-spec §3.2, scope.md §3 H8) — persistent warning shown
 * on load when saved.dataVersion !== current.dataVersion. NEVER auto-migrates
 * and never silently re-validates the plan away.
 *
 * The action RECOMPUTES against the current dataset (M1's recheckEligibility)
 * and lists which purchased badges no longer qualify at the level planned.
 * It does NOT diff — the old dataset is not retained, so a true diff is
 * impossible, and no dataset snapshot is persisted to fake one.
 */

import { useState } from "react";
import { badgeById } from "../../engine/dataset";
import { recheckEligibility } from "../../engine/eligibility";
import type { EligibilityDrift } from "../../engine/eligibility";
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
}

function driftLine(drift: EligibilityDrift, dataset: BadgeDataset): string {
  const badge = badgeById(dataset, drift.badgeId);
  const name = badge?.name ?? drift.badgeId;
  const planned = LEVEL_LABELS[drift.purchasedLevel];
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

export function DriftBanner({ saved, currentDataset, droppedEntries = [] }: DriftBannerProps) {
  const [drift, setDrift] = useState<EligibilityDrift[] | null>(null);

  const versionDrift = saved.dataVersion !== currentDataset.dataVersion;
  if (!versionDrift && droppedEntries.length === 0) return null;

  if (!versionDrift) {
    // Dropped entries WITHOUT a version mismatch (hand-edited import): the
    // disclosure still renders; the recheck action is version-drift-only.
    return (
      <Banner variant="warning" role="status">
        <span className="drift-banner__dropped">{droppedLine(droppedEntries, currentDataset)}</span>
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
            setDrift(recheckEligibility(saved, currentDataset));
          }}
        >
          Re-check eligibility
        </Button>
      }
    >
      Planned against dataset <span className="num">{saved.dataVersion}</span>; current is{" "}
      <span className="num">{currentDataset.dataVersion}</span>. Requirements may have changed —
      re-check eligibility.
      {droppedEntries.length > 0 ? (
        <div className="drift-banner__list">
          <span className="drift-banner__dropped">
            {droppedLine(droppedEntries, currentDataset)}
          </span>
        </div>
      ) : null}
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
