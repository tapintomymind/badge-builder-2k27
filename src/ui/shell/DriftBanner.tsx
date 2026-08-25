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
import type { BadgeDataset, SavedBuild } from "../../engine/types";
import { LEVEL_LABELS } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";

export interface DriftBannerProps {
  saved: SavedBuild;
  currentDataset: BadgeDataset;
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

export function DriftBanner({ saved, currentDataset }: DriftBannerProps) {
  const [drift, setDrift] = useState<EligibilityDrift[] | null>(null);

  if (saved.dataVersion === currentDataset.dataVersion) return null;

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
