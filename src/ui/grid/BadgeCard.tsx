/**
 * BadgeCard + LevelPipRow (design-spec §3.4).
 *
 * HARD CONTRACT (scope.md §2 M3): the card's displayed level renders via
 * `effectiveLevel(state, badgeId, overlay)` — NEVER `purchasedLevel`
 * directly — even though boost is 0 everywhere until M4. The pip radiogroup's
 * VALUE is the purchased level (it is the purchase control); everything the
 * card *says* about the level it plays at comes from effectiveLevel.
 *
 * Pips are the canonical purchase control (scope.md §0 addition #8): a
 * radiogroup of the four purchasable levels plus a non-interactive Legend
 * indicator. Card-body tap/click cycling is retained ON TOP as a pointer
 * convenience; no function is pointer-only. Keyboard: Tab to the row, arrows
 * move, Space selects, Escape on the selected pip clears to none.
 *
 * Eligibility strings come from the ENGINE's reasons[] — this component
 * selects which engine string to show and computes no rule of its own.
 */

import { useId } from "react";
import { costForLevelOrNull, whatIf } from "../../engine/cost";
import { levelPasses } from "../../engine/eligibility";
import type { BadgeEligibility } from "../../engine/types";
import { effectiveLevel } from "../../engine/synergy";
import type { SynergyState } from "../../engine/synergy";
import type { Badge, BadgeDataset, Build, OverlayState } from "../../engine/types";
import type { PurchasableLevel } from "../../engine/vocabulary";
import {
  LEVEL_LABELS,
  PURCHASABLE_LEVELS,
  formatHeightInches,
  levelIndex,
} from "../../engine/vocabulary";
import { Chip } from "../primitives/Chip";

const LEVEL_COLOR_TOKENS: Record<PurchasableLevel, string> = {
  bronze: "var(--lvl-bronze)",
  silver: "var(--lvl-silver)",
  gold: "var(--lvl-gold)",
  hof: "var(--lvl-hof)",
};

const LEVEL_LETTERS: Record<PurchasableLevel, string> = {
  bronze: "B",
  silver: "S",
  gold: "G",
  hof: "H",
};

export interface BadgeCardProps {
  badge: Badge;
  build: Build;
  eligibility: BadgeEligibility;
  synergyState: SynergyState;
  overlay: OverlayState;
  dataset: BadgeDataset;
  /** True when this badge is unpurchased and buying it would exceed the
   * category's Badge Slots — soft warning chip, purchase still permitted. */
  overBadgeSlotsIfBought: boolean;
  onSetLevel: (badgeId: string, level: PurchasableLevel | null) => void;
  onCycle: (badgeId: string) => void;
}

/** The engine reason strings that concern one level (selection only — the
 * strings themselves are engine output). */
function reasonsFor(level: PurchasableLevel, reasons: string[]): string[] {
  const label = LEVEL_LABELS[level];
  return reasons.filter(
    (reason) => reason.endsWith(`for ${label}`) || reason.startsWith(`${label} is unreachable`),
  );
}

interface PipModel {
  level: PurchasableLevel;
  state: "owned" | "current" | "upgrade" | "locked";
  costText: string;
  ariaLabel: string;
}

function pipModel(
  level: PurchasableLevel,
  badge: Badge,
  build: Build,
  eligibility: BadgeEligibility,
  synergyState: SynergyState,
  dataset: BadgeDataset,
  heightBlocked: boolean,
): PipModel {
  const label = LEVEL_LABELS[level];
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;
  const passes = !heightBlocked && levelPasses(badge.requirements, build, level);
  const totalCost = costForLevelOrNull(badge.tier, level, dataset);

  if (purchased !== null && levelIndex(level) < levelIndex(purchased)) {
    return { level, state: "owned", costText: "✓", ariaLabel: `${label}, owned` };
  }
  if (purchased === level) {
    return { level, state: "current", costText: "✓", ariaLabel: `${label}, current level` };
  }
  if (!passes) {
    const reasonText = heightBlocked
      ? eligibility.reasons.join("; ")
      : reasonsFor(level, eligibility.reasons).join("; ");
    return {
      level,
      state: "locked",
      costText: "—",
      ariaLabel: `${label}, locked${reasonText === "" ? "" : `, ${reasonText}`}`,
    };
  }
  const delta = whatIf(synergyState.loadout, badge.id, level, dataset);
  const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
  return {
    level,
    state: "upgrade",
    costText: deltaText,
    ariaLabel: `${label}, ${totalCost ?? 0} points total, ${deltaText} points`,
  };
}

export function LevelPipRow({
  badge,
  build,
  eligibility,
  synergyState,
  overlay,
  dataset,
  onSetLevel,
}: Omit<BadgeCardProps, "overBadgeSlotsIfBought" | "onCycle">) {
  const groupId = useId();
  const heightBlocked = !eligibility.allowed;
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;
  const effective = effectiveLevel(synergyState, badge.id, overlay);
  const legendEffective = effective === "legend";

  return (
    <fieldset
      className="pip-row"
      role="radiogroup"
      aria-label={`${badge.name} — purchase level`}
      onClick={(event) => {
        // The pips are their own control; card-body cycling must not fire.
        event.stopPropagation();
      }}
    >
      <legend>{badge.name} — purchase level</legend>
      {PURCHASABLE_LEVELS.map((level) => {
        const model = pipModel(
          level,
          badge,
          build,
          eligibility,
          synergyState,
          dataset,
          heightBlocked,
        );
        const locked = model.state === "locked" || heightBlocked;
        return (
          <label
            key={level}
            className={`pip pip--${model.state}`}
            style={{ "--pip-color": LEVEL_COLOR_TOKENS[level] } as React.CSSProperties}
          >
            <input
              type="radio"
              name={groupId}
              checked={purchased === level}
              aria-disabled={locked}
              aria-label={model.ariaLabel}
              onChange={() => {
                if (!locked) onSetLevel(badge.id, level);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && purchased === level) {
                  onSetLevel(badge.id, null);
                }
              }}
            />
            <span className="pip__dot" aria-hidden="true">
              {model.state === "locked" ? "🔒" : LEVEL_LETTERS[level]}
            </span>
            <span className="pip__cost" aria-hidden="true">
              {model.costText}
            </span>
          </label>
        );
      })}
      <span
        className={`pip pip--legend${legendEffective ? " pip--legend-effective" : ""}`}
        role="img"
        aria-label={
          legendEffective
            ? "Legend — effective level via boost"
            : "Legend — boost only, cannot be purchased"
        }
      >
        <span className="pip__dot">
          <span>L</span>
        </span>
        <span className="pip__cost" aria-hidden="true">
          boost
        </span>
      </span>
    </fieldset>
  );
}

export function BadgeCard(props: BadgeCardProps) {
  const { badge, eligibility, synergyState, overlay, overBadgeSlotsIfBought, onCycle } = props;
  const heightBlocked = !eligibility.allowed;
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;

  // THE HARD CONTRACT: the level the card displays comes from effectiveLevel.
  const effective = effectiveLevel(synergyState, badge.id, overlay);

  /** The next failing level only (§3.4): the lowest locked level above the
   * current purchase (or above none). */
  const nextLocked = heightBlocked
    ? null
    : PURCHASABLE_LEVELS.find(
        (level) =>
          !levelPasses(badge.requirements, props.build, level) &&
          (purchased === null || levelIndex(level) > levelIndex(purchased)),
      );
  const nextLockedReasons = nextLocked ? reasonsFor(nextLocked, eligibility.reasons) : [];

  return (
    <div
      className={`badge-card${heightBlocked ? " badge-card--blocked" : ""}`}
      onClick={heightBlocked ? undefined : () => {
        onCycle(badge.id);
      }}
    >
      <div className="badge-card__title-row">
        <span className="badge-card__name">{badge.name}</span>
        {overBadgeSlotsIfBought ? <Chip variant="warning">Over Badge Slots</Chip> : null}
        <Chip variant="tier">{badge.tier}</Chip>
      </div>
      <div className="badge-card__meta">
        {badge.category} ·{" "}
        {formatHeightInches(badge.requirements.heightMinInches)}–
        {formatHeightInches(badge.requirements.heightMaxInches)}
      </div>
      <LevelPipRow {...props} />
      <div className="badge-card__status">
        {effective === null ? "Not purchased" : `Now ${LEVEL_LABELS[effective]}`}
      </div>
      {heightBlocked ? (
        <div className="badge-card__eligibility">Blocked — {eligibility.reasons.join("; ")}</div>
      ) : nextLockedReasons.length > 0 ? (
        <div className="badge-card__eligibility">{nextLockedReasons.join("; ")}</div>
      ) : null}
    </div>
  );
}
