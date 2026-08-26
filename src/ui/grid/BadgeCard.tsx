/**
 * BadgeCard + LevelPipRow (design-spec §3.4).
 *
 * R12 SLICE 2 — THE COMPACT CARD IS THE DEFAULT (user ruling 2026-08-26,
 * approved one-to-one from docs/mockups/workbench-recut.html). The card is a
 * TWO-LINE tile:
 *
 *   row 1  tier medallion · name (ellipsised) · NEW · the expand control
 *   row 2  the five lettered level marks B/S/G/H/L · role chip · cost
 *
 * and a card with nothing to sell — no purchase AND no reachable level — puts
 * the binding gate line where the cost would be and dims its ladder, which is
 * the ONLY prose a compact card carries. Everything else the 307px
 * "comfortable" card showed at all times — the description, the per-level
 * requirement ladder, the height range and the roll controls — moves behind
 * the expand control. Prose appears when it is actionable; nothing was
 * deleted.
 *
 * WHAT DID NOT MOVE, because these are contracts and not layout:
 *   · the pips are still the per-level purchase control, with levelPasses
 *     gating, Escape-to-remove on the current pip and their full aria names;
 *   · the card body still cycles on tap (onCycle), and every child that is
 *     itself a control still stops propagation — without that, expanding a
 *     card or pinning a badge would BUY A LEVEL;
 *   · the status line is still built from effectiveLevel and is still in the
 *     DOM on every card. It is `.sr-only` while the card is compact (the
 *     lettered pips and the cost carry the same fact visually there) and
 *     visible once expanded. Nothing is announced twice.
 *
 * HARD CONTRACT (scope.md §2 M3): the card's displayed level renders via
 * `effectiveLevel(state, badgeId, overlay)` — NEVER `purchasedLevel`
 * directly. The pip radiogroup's VALUE is the purchased level (it is the
 * purchase control); everything the card *says* about the level it plays at
 * comes from effectiveLevel. The COST readout is the one number keyed to the
 * purchase rather than to the effective level, and it must be: a fused HOF
 * costs what its Gold purchase cost. That is a purchase fact, like the
 * radiogroup's value and like `data-purchased-level`, not a claim about the
 * level the badge plays at.
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

import { useId, useState } from "react";
import { costForLevel, costForLevelOrNull, whatIf } from "../../engine/cost";
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
import { PinControl } from "../primitives/PinControl";
import { useRollControls } from "../roll/roll-controls";

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
      ariaLabel: `${label}, ${totalCost ?? 0} tokens total, ${deltaText} tokens — exceeds remaining tokens`,
    };
  }
  return {
    level,
    state: "upgrade",
    costText: deltaText,
    ariaLabel:
      `${label}, ${totalCost ?? 0} tokens total, ${deltaText} tokens` +
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

  /** R12 slice 2 — the expand control's state. Session-only and per card: it
   *  is a view state, never a plan state, so it is deliberately NOT persisted
   *  and NOT lifted (the same reasoning F5.3/B applied to a collapsed
   *  category, one level down). */
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  // THE HARD CONTRACT: the level the card displays comes from effectiveLevel.
  const effective = effectiveLevel(synergyState, badge.id, overlay);
  const role = synergyRoleFor(synergyState.synergySlots, badge.id);
  const roleClass =
    role === null ? "" : role.kind === "fuse" ? " badge-card--fuse" : " badge-card--reaction";

  /** THE LOWEST LEVEL THE BUILD CAN ACTUALLY BUY, selected by the engine's own
   *  per-level predicate. Two things read it: the `from N` cost readout, and
   *  the gate-only test below. No rule of its own — `levelPasses` decides. */
  const lowestOpen = heightBlocked
    ? undefined
    : PURCHASABLE_LEVELS.find((level) => levelPasses(badge.requirements, props.build, level));

  /** GATED — the mockup's `blocked` tile: nothing is owned and nothing is
   *  reachable, so the tile states the binding requirement and the ladder
   *  recedes (the same dim `--blocked` has always put on the pip glyphs, and
   *  never on the text — design-review P1-1).
   *
   *  THE PIPS STAY. The mockup's sketch drops them; this does not, and the
   *  reason is a contract rather than a preference: the pips are the purchase
   *  control with the engine's per-level reasons in their accessible names,
   *  and the gate line is prose ABOUT them. What the ruling asks for is that
   *  the gate line be the tile's ONLY prose, and it is. */
  const gated = purchased === null && lowestOpen === undefined;
  /** The shortest TRUE gate line, and every word of it is the engine's:
   *  height blocks read as the eligibility reasons, an attribute gate reads as
   *  the LOWEST level's failing requirement (in the gated state every level
   *  fails, so the lowest one is the one to clear first). */
  const gateLevel = PURCHASABLE_LEVELS[0] as PurchasableLevel;
  const gateReasons = heightBlocked
    ? eligibility.reasons
    : reasonsFor(gateLevel, eligibility.reasons);

  /** Stale purchase (eligibility disclosure): the purchased level itself no
   * longer passes. */
  const stalePurchase =
    purchased !== null && !heightBlocked && !levelPasses(badge.requirements, props.build, purchased);

  /** THE LADDER (expanded state): every failing level with its own engine
   *  string, in ladder order. It supersedes the "next failing level only"
   *  compaction the comfortable card needed — the expanded card has the room,
   *  and the mockup's expanded specimen states the whole ladder.
   *
   *  The two levels the COMPACT card already states in full — the stale
   *  purchase and the gate — are skipped here. That is de-duplication of one
   *  sentence, never suppression of one: both strings are on screen without
   *  the card being opened at all. */
  const ladder = PURCHASABLE_LEVELS.map((level) => ({
    level,
    reasons: reasonsFor(level, eligibility.reasons),
  })).filter(
    (rung) =>
      rung.reasons.length > 0 &&
      !(stalePurchase && rung.level === purchased) &&
      !(gated && rung.level === gateLevel),
  );

  /** The stale disclosure line, WORD FOR WORD as it shipped: the condition and
   * the engine's failing-requirement strings, on the COMPACT card. A stale
   * purchase is the one state that is both urgent and actionable, so it keeps
   * its prose without being opened (H8: the tool never destroys the plan, and
   * never hides the fact that the plan drifted). It is the ONLY compact line
   * that may wrap past two lines, and it does so on a handful of cards. */
  const staleReasons = stalePurchase ? reasonsFor(purchased as PurchasableLevel, eligibility.reasons) : [];

  /** The cost readout — an engine number in both arms. `from N` is what the
   *  cheapest reachable level costs; `N` is what the purchase cost. Both go
   *  through costForLevel; nothing is added up here. */
  const costTokens =
    purchased !== null
      ? costForLevel(badge.tier, purchased, props.dataset)
      : lowestOpen === undefined
        ? null
        : costForLevel(badge.tier, lowestOpen, props.dataset);

  /** F8-R2 session-only roll state. Read from CONTEXT rather than props: this
   *  component's prop list is already the widest in the app, it is instantiated
   *  53 times, and the grid's parents have no other reason to carry roll
   *  state. Nothing here is persisted. */
  const roll = useRollControls();
  /** The two pins the user may not clear come from the engine, and this
   *  component does not decide who is in the map -- it renders what App put
   *  there. */
  const implicitPinReason = roll.implicitPinReasons[badge.id];

  return (
    <div
      className={
        `badge-card${heightBlocked ? " badge-card--blocked" : ""}${roleClass}` +
        `${gated ? " badge-card--gated" : ""}${expanded ? " badge-card--expanded" : ""}`
      }
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
      {/* ROW 1 — identity. R12 slice 2 re-opens the title line the F5.3
          arithmetic had to empty, and it is the COMPACTION that pays for it,
          not a bigger box: the name is the row's only flexible item and it
          ellipsises (the mockup's own `.bc-name` does), so a fixed chip added
          here can never wrap the row. The tier medallion leads, per the
          mockup; the NEW pill and the expand control ride the far end.

          The `{category} · ` prefix stays .sr-only and stays a SIBLING of
          `.badge-card__name` — the name element's textContent is read as the
          badge's name by three filter tests, so nothing may be nested inside
          it. */}
      <div className="badge-card__title-row">
        <Chip variant="tier">{badge.tier}</Chip>
        <span className="sr-only">{badge.category} · </span>
        <span className="badge-card__name">{badge.name}</span>
        {/* F4's NEW flag, back on the title line where the mockup draws it. */}
        {badge.isNew ? <Chip variant="info">NEW</Chip> : null}
        {/* THE EXPAND CONTROL. The mockup's caption names the affordance
            ("click / focus / ?") but does not draw it, because the card body's
            own click is already spoken for: it cycles the purchase. So the
            control is explicit and it is its own button.

            stopPropagation is MANDATORY, not defensive — the card root carries
            the pointer-cycle handler, so without it every expand would BUY A
            LEVEL. Same idiom as the pip-row fieldset and the action line. */}
        <button
          type="button"
          className="badge-card__more"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`Details — ${badge.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((open) => !open);
          }}
        >
          <span className="badge-card__more-caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </div>
      {/* ROW 2 — the lettered ladder, its chips, and ONE trailing readout: the
          cost, or (when nothing is reachable) the gate line that answers the
          same question with the reason instead of the price. */}
      <div className="badge-card__line">
        <LevelPipRow {...props} />
        {role !== null ? (
          // Compact on-card form (design-review P1-5, and now the mockup's
          // `.r-role`): the H1-correct long form stays the ACCESSIBLE name;
          // the visible chip abbreviates. The long form is 130px against a
          // 160px row — it never fitted beside five level marks at any
          // width the workbench offers.
          <Chip variant={role.kind === "fuse" ? "accent" : "info"}>
            <span aria-hidden="true">
              {role.kind === "fuse" ? "Fuse" : "Reac"} S{role.synergySlotId}
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
        {/* H4 SOFT CLASS: the warning has to sit where the ACTION is, and the
            action (a pip) is on this row, so it is NOT moved behind the expand
            control. Abbreviated by the same rule as the role chip — and the
            abbreviation still says `Badge Slots` in full, because §14.1's H1
            lint is right that a bare `slots` is ambiguous in an app that also
            has Synergy Slots. Only `Would go` is dropped; the accessible name
            keeps the whole sentence. */}
        {overBadgeSlotsIfBought ? (
          <Chip variant="warning">
            <span aria-hidden="true">⚠ over Badge Slots</span>
            <span className="sr-only">Would go over Badge Slots</span>
          </Chip>
        ) : null}
        {gated ? (
          // THE GATE LINE — the tile's only prose, and the engine's own
          // words. It is a flex item that takes a full line of its own
          // (never a truncation: I14, the reason string is never clipped).
          <span className="badge-card__eligibility badge-card__gate">
            {heightBlocked ? "Blocked — " : ""}
            {gateReasons.join("; ")}
          </span>
        ) : costTokens === null ? null : (
          <span className="badge-card__cost">
            {/* THE PRICE, AND IT IS ALL NUMERALS NOW (user ask 2026-08-26:
                "make the badge cost more apparent", then the copy call that
                unlocked it).

                `from 3` spent 38 of the row's ~39px cost budget on a
                PROPORTIONAL word, which capped the numeral at --text-sm and
                took the card floor to its 181px ceiling with zero slack. The
                same fact as a `+` SUFFIX is two monospace glyphs — `3+` is
                ~24px at --text-lg — so the number can be the biggest thing
                on the tile and still leave the budget half unspent.

                THE SEEN AND THE HEARD DIVERGE ON PURPOSE, and neither is
                abbreviated. Sighted readers get `3+`; the `+` is
                aria-hidden and flanked by sr-only words, so a screen reader
                still hears the whole sentence — "from 3 tokens" — exactly as
                it did before. A suffix that read aloud as "three plus" would
                be a worse sentence, not a shorter one. */}
            {purchased === null ? <span className="sr-only">from </span> : null}
            <span className="num">
              {costTokens}
              {purchased === null ? <span aria-hidden="true">+</span> : null}
            </span>
            <span className="sr-only"> {costTokens === 1 ? "token" : "tokens"}</span>
          </span>
        )}
      </div>
      {/* The stale disclosure KEEPS ITS PLACE ON THE COMPACT CARD, and keeps
          its whole sentence. §10.4 and H8: the tool never destroys the plan
          silently, so the one card state that is genuinely urgent states
          itself — reasons included — without being opened. */}
      {stalePurchase && purchased !== null ? (
        <div className="badge-card__eligibility badge-card__eligibility--stale">
          Purchased at {LEVEL_LABELS[purchased]} — no longer meets requirements
          {staleReasons.length > 0 ? `: ${staleReasons.join("; ")}` : ""}
        </div>
      ) : null}
      {/* THE STATUS LINE, unchanged in construction and in wording: built from
          effectiveLevel, on every card, in the DOM in both states. `.sr-only`
          while compact — the lettered pips, the role chip and the cost carry
          the same fact visually there, and the mockup's compact tile carries
          no prose but a gate. */}
      <div className={`badge-card__status${expanded ? "" : " sr-only"}`}>
        {statusText(badge, synergyState, overlay, role, purchased, effective)}
      </div>
      {expanded ? (
        <div
          className="badge-card__expanded"
          id={panelId}
          // The same MANDATORY stopPropagation: this region holds the roll
          // controls, and a pin that also bought a level would be F4 6.2's
          // defect in a new place.
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {/* F4's official one-line description. It is in the DOM exactly
              ONCE — the <details> clamp idiom it replaces existed to stop a
              double announcement, and rendering it once here keeps that
              property by construction. */}
          <p className="badge-card__desc-text">{badge.description}</p>
          <p className="badge-card__meta">
            <span className="sr-only">Height </span>
            {formatHeightInches(badge.requirements.heightMinInches)}–
            {formatHeightInches(badge.requirements.heightMaxInches)}
          </p>
          {/* THE LADDER — the engine's strings, one rung per failing level,
              never truncated (I14). A height block is a whole-card condition
              and reads as one line instead. */}
          {heightBlocked ? (
            <div className="badge-card__eligibility">
              Blocked — {eligibility.reasons.join("; ")}
            </div>
          ) : (
            ladder.map((rung) => (
              <div className="badge-card__eligibility" key={rung.level}>
                {rung.reasons.join("; ")}
              </div>
            ))
          )}
          {/* F8-R2 THE ACTION LINE. EXACTLY ONE control: Pin when the badge is
              purchased, Exclude when it is not. Never both, never neither.

              NO NEW CARD STATE, no recede treatment and NO opacity for an
              excluded card (invariant I2) — the pressed chip IS the marker,
              and the roll panel carries the roll-up. R12 moves the line behind
              the expand control: it is roll SESSION chrome, and it was
              permanent furniture on all 53 cards. */}
          <div className="badge-card__action">
            {purchased !== null ? (
              <PinControl
                kind="pin"
                pressed={implicitPinReason !== undefined || roll.pinnedBadgeIds.has(badge.id)}
                badgeName={badge.name}
                onToggle={() => {
                  roll.onTogglePin(badge.id);
                }}
                {...(implicitPinReason === undefined ? {} : { disabledReason: implicitPinReason })}
              />
            ) : (
              <PinControl
                kind="exclude"
                pressed={roll.excludedBadgeIds.has(badge.id)}
                badgeName={badge.name}
                onToggle={() => {
                  roll.onToggleExclude(badge.id);
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
