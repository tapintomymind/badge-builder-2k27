/**
 * SynergyDigest (design-spec §14.4) — the other half of the plan.
 *
 * The synergy assignments are currently readable ONLY in §3.5's panel, and
 * they are half of what the user re-enters into 2K. They belong in the
 * artifact you read beside the console.
 *
 * READ-ONLY. No picker, no toggle, no control of any kind. Acting on a
 * Synergy Slot happens in §3.5's panel, which the jump nav reaches in one
 * chip — and this component being read-only is precisely why `src/ui/synergy/`
 * stays untouched by this slice.
 *
 * H1 — the full `Synergy Slot N` form everywhere. A bare `Slot` is banned in
 * identifiers and in copy [scope.md §3 H1], and tests/vocabulary.test.ts
 * lints for it.
 *
 * H2 — overlay-invariant. `synergyProjections` computes `activatesTo` under a
 * FIXED `{ reactionsActive: true, seasonReset: false }` overlay, which is a
 * constant of the selector rather than a UI toggle, so this whole subtree is
 * byte-identical across every overlay combination. `Gold when activated` is a
 * LABELLED CONDITIONAL, not a level.
 *
 * `— frees N pts to {Category}` renders ONLY when the ledger actually
 * refunded, and the figure is `SynergySummaryRow.freesPointsToCategory` —
 * READ FROM THE LEDGER, never computed here [seed: Working agreements #1].
 * Under the retired `legendByAnyMeans` trigger it rarely appeared; under F4's
 * ratified `onFuse` it fires on every fuse. NO COPY CHANGE was needed when
 * that flipped, and that is the test of whether this was built correctly.
 *
 * The `+N` magnitude is the Synergy Slot's OWN configured value. Where the
 * user has not designated the second +2, this component says nothing about
 * it: §3.5's `PlusTwoDesignator` owns that disclosure, and a second phrasing
 * of one unpublished fact is exactly what [seed: Open items #2] forbids.
 */

import { badgeById } from "../../engine/dataset";
import type { SynergySummaryRow } from "../../engine/summary";
import type { BadgeDataset } from "../../engine/types";
import { LEVEL_LABELS } from "../../engine/vocabulary";

export interface SynergyDigestProps {
  rows: readonly SynergySummaryRow[];
  dataset: BadgeDataset;
}

export function SynergyDigest({ rows, dataset }: SynergyDigestProps) {
  // Unlocked Synergy Slots render whether or not they are assigned; LOCKED
  // ones do not — a locked Synergy Slot has nothing to re-enter into the
  // game, and the tail count carries them instead.
  const unlocked = rows.filter((row) => row.unlocked);
  const fullyAssigned = rows.filter(
    (row) => row.fuse !== null && row.reaction !== null,
  ).length;

  if (rows.length === 0) return null;

  return (
    <section className="synergy-digest" aria-labelledby="summary-synergy-digest">
      <h3 className="synergy-digest__title" id="summary-synergy-digest">
        Synergy
      </h3>
      <ul className="synergy-digest__list">
        {unlocked.map((row) => {
          const freesTo =
            row.fuse === null || row.freesPointsToCategory === 0
              ? null
              : (badgeById(dataset, row.fuse.badgeId)?.category ?? null);
          return (
            <li key={row.synergySlotId} className="synergy-digest__row">
              <span className="synergy-digest__head">
                Synergy Slot {row.synergySlotId} ·{" "}
                {row.permanence === "permanent" ? "Permanent" : "Temporary"} · +{row.magnitude}
              </span>
              <span className="synergy-digest__roles">
                {row.fuse === null && row.reaction === null ? (
                  <span>— not assigned</span>
                ) : null}
                {row.fuse !== null ? (
                  <span>
                    ⚡ Fuse {row.fuse.name} → {LEVEL_LABELS[row.fuse.committedEffectiveLevel]}
                    {freesTo !== null ? (
                      <span className="synergy-digest__frees">
                        {" "}
                        — frees {row.freesPointsToCategory} pts to {freesTo}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {row.reaction !== null ? (
                  <span>
                    ↺ Reaction {row.reaction.name} → {LEVEL_LABELS[row.reaction.activatesTo]} when
                    activated
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="synergy-digest__tail">
        {unlocked.length} of {rows.length} Synergy Slots unlocked · {fullyAssigned} fully assigned
      </p>
    </section>
  );
}
