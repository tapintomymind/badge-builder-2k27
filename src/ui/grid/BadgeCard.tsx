/**
 * BadgeCard + LevelPipRow (design-spec §3.4).
 *
 * HARD CONTRACT (scope.md §2 M3): the card's displayed level renders via
 * `effectiveLevel(state, badgeId, overlay)` — NEVER `purchasedLevel`
 * directly. The pip radiogroup's VALUE is the purchased level (it is the
 * purchase control); everything the card *says* about the level it plays at
 * comes from effectiveLevel.
 *
 * M4 synergy states (§3.4): Fuse (solid --accent edge + role Chip + `Fused
 * to X` status + accent halo on the effective pip), Reaction (dashed --info
 * edge + role Chip + `activates to X` / `Activated: X` + info halo), and
 * Legend-effective (filled Legend pip + LEGEND Chip). The purchased pip
 * keeps its ring while the effective pip gains the halo, so
 * purchased-vs-effective stays legible. None of these is color-only: each
 * carries a text label.
 *
 * M4 per-pip affordability (§3.6): an upgrade pip whose whatIf delta exceeds
 * the category's remaining points renders dashed with a --danger delta + ⚠ —
 * a comparison of two engine outputs; no arithmetic rule lives here. H4: it
 * stays fully clickable — unaffordable is warned, never disabled.
 *
 * Eligibility strings come from the ENGINE's reasons[] — this component
 * selects which engine string to show and computes no rule of its own.
 */

import { useId } from "react";
import { costForLevelOrNull, whatIf } from "../../engine/cost";
import { levelPasses } from "../../engine/eligibility";
import type { BadgeEligibility } from "../../engine/types";
import {
  effectiveLevel,
  synergyRoleFor,
  synergySlotById,
  synergySlotDisabledByPreview,
} from "../../engine/synergy";
import type { SynergyState } from "../../engine/synergy";
import type { Badge, BadgeDataset, Build, OverlayState, SynergyRole } from "../../engine/types";
import type { Level, PurchasableLevel } from "../../engine/vocabulary";
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
  /** M4: the category's remaining points — powers the per-pip affordability
   * treatment. Omitted (unit tests) = no affordability styling. */
  remainingPoints?: number;
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
  /** `stale` = the PURCHASED level no longer passes the attribute gate —
   * disclosed, never auto-removed (H8: the tool never destroys the plan). */
  state: "owned" | "current" | "stale" | "upgrade" | "unaffordable" | "locked";
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
  remainingPoints: number | undefined,
): PipModel {
  const label = LEVEL_LABELS[level];
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;
  const passes = !heightBlocked && levelPasses(badge.requirements, build, level);
  const totalCost = costForLevelOrNull(badge.tier, level, dataset);
  const failReasonText = heightBlocked
    ? eligibility.reasons.join("; ")
    : reasonsFor(level, eligibility.reasons).join("; ");

  if (purchased === level) {
    if (passes) {
      return { level, state: "current", costText: "✓", ariaLabel: `${label}, current level` };
    }
    // Stale purchase: purchased above the cap the current attributes allow.
    // Disclosed (flagged pip + the engine's failing-requirement string), never
    // auto-removed — the pip control (Escape) is the destructive affordance.
    return {
      level,
      state: "stale",
      costText: "⚠",
      ariaLabel:
        `${label}, current level — no longer meets requirements` +
        (failReasonText === "" ? "" : `, ${failReasonText}`),
    };
  }
  if (purchased !== null && levelIndex(level) < levelIndex(purchased) && passes) {
    return { level, state: "owned", costText: "✓", ariaLabel: `${label}, owned` };
  }
  if (!passes) {
    // Covers unpurchased ineligible levels AND ineligible gap levels below a
    // purchase: an H3-legal gap level that fails is NOT one-click purchasable.
    return {
      level,
      state: "locked",
      costText: "—",
      ariaLabel: `${label}, locked${failReasonText === "" ? "" : `, ${failReasonText}`}`,
    };
  }
  const delta = whatIf(synergyState.loadout, badge.id, level, dataset);
  const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
  // Per-pip affordability (§3.6): compare two engine outputs. Unaffordable is
  // dashed-and-warned, NEVER disabled (H4 soft class).
  const unaffordable = remainingPoints !== undefined && delta > remainingPoints;
  if (unaffordable) {
    return {
      level,
      state: "unaffordable",
      // F5.3/I12: the space is deleted, not the glyph — 34px -> 28px in the
      // narrowest box in the app. The stale case above is a BARE glyph and is
      // not touched.
      costText: `${deltaText}⚠`,
      ariaLabel: `${label}, ${totalCost ?? 0} points total, ${deltaText} points — exceeds remaining points`,
    };
  }
  return {
    level,
    state: "upgrade",
    costText: deltaText,
    ariaLabel:
      `${label}, ${totalCost ?? 0} points total, ${deltaText} points` +
      (remainingPoints === undefined ? "" : " — affordable"),
  };
}

export function LevelPipRow({
  badge,
  build,
  eligibility,
  synergyState,
  overlay,
  dataset,
  remainingPoints,
  onSetLevel,
}: Omit<BadgeCardProps, "overBadgeSlotsIfBought" | "onCycle">) {
  const groupId = useId();
  const heightBlocked = !eligibility.allowed;
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;
  const effective = effectiveLevel(synergyState, badge.id, overlay);
  const legendEffective = effective === "legend";
  const role = synergyRoleFor(synergyState.synergySlots, badge.id);
  /** The boosted pip's halo (§3.4): the EFFECTIVE level's pip, only when it
   * differs from the purchased pip (which keeps its ring). */
  const haloLevel: Level | null =
    role !== null && effective !== null && effective !== purchased ? effective : null;

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
          remainingPoints,
        );
        const locked = model.state === "locked" || heightBlocked;
        const halo = haloLevel === level && role !== null ? ` pip--halo-${role.kind}` : "";
        return (
          <label
            key={level}
            className={`pip pip--${model.state}${halo}`}
            // F5 presentation hooks (design-spec §10.7, ruled in): fields the
            // component already renders, exposed as attributes so CSS can see
            // them. Both are overlay-INVARIANT (level is static; model.state
            // derives from purchase/eligibility/affordability, never overlay).
            data-level={level}
            data-state={model.state}
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
        // F5: static level identity only — the effective state stays on the
        // EXISTING class; no new hook keys to an overlay-derived value.
        data-level="legend"
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

/** The M4 status line (§3.4): purchased vs effective, always via
 * effectiveLevel, with the synergy phrase — never a silently changed level. */
function statusText(
  badge: Badge,
  synergyState: SynergyState,
  overlay: OverlayState,
  role: SynergyRole | null,
  purchased: PurchasableLevel | null,
  effective: Level | null,
): string {
  if (effective === null || purchased === null) return "Not purchased";
  if (role === null) return `Now ${LEVEL_LABELS[effective]}`;
  const synergySlot = synergySlotById(synergyState.synergySlots, role.synergySlotId);
  if (synergySlot === undefined) return `Now ${LEVEL_LABELS[effective]}`;
  // THE canonical predicate (engine): never hand-negate synergySlotActive.
  const previewDisabled = synergySlotDisabledByPreview(synergySlot, overlay);
  if (previewDisabled) {
    return `Now ${LEVEL_LABELS[purchased]} · Synergy Slot ${synergySlot.id} disabled by preview`;
  }
  if (role.kind === "fuse") {
    return effective === purchased
      ? `Now ${LEVEL_LABELS[effective]}`
      : `Now ${LEVEL_LABELS[purchased]} · Fused to ${LEVEL_LABELS[effective]}`;
  }
  // Reaction: conditional — base level plus the "when activated" level.
  if (overlay.reactionsActive && effective !== purchased) {
    return `Now ${LEVEL_LABELS[purchased]} · Activated: ${LEVEL_LABELS[effective]}`;
  }
  const activated = effectiveLevel(synergyState, badge.id, { ...overlay, reactionsActive: true });
  if (activated !== null && activated !== purchased) {
    return `Now ${LEVEL_LABELS[purchased]} — activates to ${LEVEL_LABELS[activated]}`;
  }
  return `Now ${LEVEL_LABELS[effective]}`;
}

export function BadgeCard(props: BadgeCardProps) {
  const { badge, eligibility, synergyState, overlay, overBadgeSlotsIfBought, onCycle } = props;
  const heightBlocked = !eligibility.allowed;
  const entry = synergyState.loadout.find((candidate) => candidate.badgeId === badge.id);
  const purchased = entry?.purchasedLevel ?? null;

  // THE HARD CONTRACT: the level the card displays comes from effectiveLevel.
  const effective = effectiveLevel(synergyState, badge.id, overlay);
  const role = synergyRoleFor(synergyState.synergySlots, badge.id);
  const roleClass =
    role === null ? "" : role.kind === "fuse" ? " badge-card--fuse" : " badge-card--reaction";

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

  /** Stale purchase (eligibility disclosure): the purchased level itself no
   * longer passes — the engine's failing-requirement string renders on the
   * card, and the purchase is never auto-removed. */
  const stalePurchase =
    purchased !== null && !heightBlocked && !levelPasses(badge.requirements, props.build, purchased);
  const staleReasons = stalePurchase ? reasonsFor(purchased, eligibility.reasons) : [];

  return (
    <div
      className={`badge-card${heightBlocked ? " badge-card--blocked" : ""}${roleClass}`}
      // F5 presentation hooks (design-spec §10.7, ruled in). H2 guardrail:
      // every value here is overlay-INVARIANT — data-purchased-level keys to
      // purchasedLevel (NEVER effectiveLevel), data-tier is static dataset
      // data, data-stale derives from build attributes. None of these nodes
      // is ledger/summary/feasibility DOM.
      data-purchased-level={purchased ?? undefined}
      data-tier={badge.tier}
      data-stale={stalePurchase ? "true" : undefined}
      onClick={heightBlocked ? undefined : () => {
        onCycle(badge.id);
      }}
    >
      {/* F5.3/A (design-spec §15.4, invariant I11): the title row carries the
          NAME and the TIER MEDALLION ONLY. Every chip left the line, because
          the arithmetic says they must: at the binding 204px content box the
          173px `Would go over Badge Slots` warning leaves the name −1px even
          at zero synergy-chip width. Compaction was not available; eviction
          was. The row is now a provably one-line 24px band (assertion 2),
          which is what licenses `align-items: center` in the CSS. */}
      <div className="badge-card__title-row">
        <span className="badge-card__name">{badge.name}</span>
        <Chip variant="tier">{badge.tier}</Chip>
      </div>
      {/* F5.3/A: meta is now the card's chip rail — a WRAPPING flex row. The
          visible `{category} · ` prefix is gone (it is restated on all 53
          cards under a sticky h2 that already names the category in its own
          hue); it survives as an .sr-only prefix because DriftBanner links
          straight to a card by anchor and that user never passed the section
          heading. That reclamation takes meta's max-content 122 -> 47, which
          is what pays for the chips WITHOUT a new band.

          F4's NEW chip joins them here, and that is arithmetic too: on the
          title line `152 + 8 + 40 + 8 + 24 = 232 > 204` — the widest isNew
          name ("Post Spin Catalyst") would wrap the row straight back open.
          Worst case here is `47 + 8 + 40 + 8 + 130 = 233`, which wraps to a
          second line BY DESIGN (assertion 3b) and is absorbed by A1. */}
      <div className="badge-card__meta">
        <span className="sr-only">{badge.category} · </span>
        <span>
          {formatHeightInches(badge.requirements.heightMinInches)}–
          {formatHeightInches(badge.requirements.heightMaxInches)}
        </span>
        {role !== null ? (
          // Compact on-card form (design-review P1-5): the H1-correct long
          // form stays the ACCESSIBLE name; the visible chip abbreviates.
          <Chip variant={role.kind === "fuse" ? "accent" : "info"}>
            <span aria-hidden="true">
              {role.kind === "fuse" ? "⚡ Fuse" : "↺ Reaction"} · SS{role.synergySlotId} +
              {role.magnitude}
            </span>
            <span className="sr-only">
              {role.kind === "fuse" ? "Fuse" : "Reaction"} · Synergy Slot {role.synergySlotId} +
              {role.magnitude}
            </span>
          </Chip>
        ) : null}
        {effective === "legend" ? (
          <Chip variant="level" color="var(--lvl-legend)">
            LEGEND
          </Chip>
        ) : null}
        {overBadgeSlotsIfBought ? <Chip variant="warning">Would go over Badge Slots</Chip> : null}
        {/* F4: the official page's NEW flag. `info` is the EXISTING Chip
            variant — F4 does not invent one. It is the same variant the
            Reaction role chip uses; that collision is a Designer ask, not an
            implementer decision (raised in the F4 reportback). */}
        {badge.isNew ? <Chip variant="info">NEW</Chip> : null}
      </div>
      {/* F4 — the official one-line description behind a NATIVE <details>
          (design-spec §10.3 + §10.8 item 1: the reveal control is F4's).
          The collapsed state IS the 3-line clamp, which is CSS-only, so the
          FULL string is always in the DOM and AT reads it ONCE. The body is
          deliberately EMPTY: duplicating the text would double-announce it
          on 53 cards.

          stopPropagation is MANDATORY, not defensive: the card root carries
          the pointer-cycle handler, so without it every expand of a
          description would BUY A LEVEL. Same idiom as the pip-row fieldset
          above. */}
      <details
        className="badge-card__desc"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <summary className="badge-card__desc-summary">
          <span className="badge-card__desc-text">{badge.description}</span>
        </summary>
      </details>
      <LevelPipRow {...props} />
      <div className="badge-card__status">
        {statusText(badge, synergyState, overlay, role, purchased, effective)}
      </div>
      {stalePurchase && purchased !== null ? (
        <div className="badge-card__eligibility badge-card__eligibility--stale">
          Purchased at {LEVEL_LABELS[purchased]} — no longer meets requirements
          {staleReasons.length > 0 ? `: ${staleReasons.join("; ")}` : ""}
        </div>
      ) : null}
      {heightBlocked ? (
        <div className="badge-card__eligibility">Blocked — {eligibility.reasons.join("; ")}</div>
      ) : nextLockedReasons.length > 0 ? (
        <div className="badge-card__eligibility">{nextLockedReasons.join("; ")}</div>
      ) : null}
    </div>
  );
}
