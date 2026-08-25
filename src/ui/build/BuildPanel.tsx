/**
 * BuildPanel (design-spec §3.3) — three Sections. As of rev 3 (F3) the
 * Physique section leads with Position, because Position now CONSTRAINS the
 * height range (scope.md §0.1 A2): you pick a position, which sets the range
 * you may pick a height within. Position still gates NO badges — the hint
 * says exactly that, and the rev-1 "cosmetic" treatments (muted palette,
 * Cosmetic chip, separating rule) are withdrawn: a live control styled to
 * look inert is a worse lie than a plain one.
 *
 * The height range itself comes from the ENGINE (positionHeightRange, via
 * App.tsx) — this file never reads src/data/position-heights and holds no
 * copy of the table.
 *
 * Below the L breakpoint (<1280px — §5.2 rev 2: BOTH rails dissolve at M,
 * so M and S share one structure) the whole panel collapses into one
 * <details> whose summary carries a live digest (§5.3).
 *
 * AUTO-COLLAPSE (§5.3, design-review P0-2) — a LATCH, not a computation:
 * default-open at zero state; collapses automatically EXACTLY ONCE the
 * first time the build has non-zero values; the user's open/closed choice is
 * persisted thereafter and never overridden again. The latch reads COMMITTED
 * values only, and — rev 3 — it never fires while the triggering control
 * still holds focus: a slider RELEASE is a commit but NOT a blur (focus
 * stays on the thumb), so the panel must not snap shut when the user lets
 * go of a slider. Firing is deferred to that slider's blur (or the next
 * mount). NumberField commits on blur, so its path is unchanged.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Budget, Build } from "../../engine/types";
import type { Attr, Category, Position } from "../../engine/vocabulary";
import { CATEGORIES, POSITIONS, formatHeightInches } from "../../engine/vocabulary";
import { readUiSectionOpen, writeUiSectionOpen } from "../../persist/local-storage";
import { Banner } from "../primitives/Banner";
import { HeightField } from "../primitives/HeightField";
import { Hint } from "../primitives/Hint";
import { Section } from "../primitives/Section";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { useMediaQuery } from "../useMediaQuery";
import { AttributeGrid } from "./AttributeGrid";
import { BudgetGrid } from "./BudgetGrid";

/** Section open/closed preference key + the one-shot auto-collapse latch. */
const BUILD_PANEL_SECTION_KEY = "section-build-panel";
const BUILD_PANEL_AUTO_COLLAPSED_KEY = "section-build-panel.auto-collapsed";

/** "Any" = the EXISTING optional Build.position left unset — the dataset's
 * own full range, and the zero-state default (§5.4 rev 3). */
const POSITION_OPTIONS = ["Any", ...POSITIONS] as const;
type PositionOption = (typeof POSITION_OPTIONS)[number];

/** The clamp-on-position-switch disclosure (§3.3 rev 3): persistent, never a
 * toast — holds until the user next changes height or position. */
export interface HeightClampNotice {
  fromInches: number;
  toInches: number;
  /** Stale-purchase count when the clamp changed it (cause and consequence
   * in one sentence, at the site of the action); null = no stale sentence. */
  staleCount: number | null;
}

export interface BuildPanelProps {
  build: Build;
  budgets: Record<Category, Budget>;
  /** Position-derived height clamp range (inches) — from the engine's
   * positionHeightRange(), the only route to the table. */
  heightRange: { minInches: number; maxInches: number };
  /** Engine validateBuild() reasons — HARD-DISCLOSED as a warning Banner
   * local to the control that caused them. */
  buildViolationReasons: readonly string[];
  clampNotice: HeightClampNotice | null;
  onHeightCommit: (heightInches: number) => void;
  onPositionChange: (position: Position | undefined) => void;
  onAttributeCommit: (attr: Attr, value: number) => void;
  onBudgetCommit: (category: Category, field: keyof Budget, value: number) => void;
  /** F5.3/C — open the `Reset build` confirm. The button NEVER resets
   * directly; the dialog is mandatory (assertion 18). */
  onResetRequest: () => void;
  /** `playerHasContent(working)` — the DEFAULT RESET'S OWN SCOPE, and
   * deliberately not `workingHasContent`. The latter answers the switcher
   * guard's question and returns true for budgets-only and unlocks-only
   * states, neither of which the default reset touches: a user who has
   * entered budgets and nothing else would get an enabled control whose
   * confirm, with zero rows suppressed, lists nothing. */
  canReset: boolean;
}

export function PhysiqueSection({
  build,
  heightRange,
  buildViolationReasons,
  clampNotice,
  onHeightCommit,
  onPositionChange,
}: Pick<
  BuildPanelProps,
  | "build"
  | "heightRange"
  | "buildViolationReasons"
  | "clampNotice"
  | "onHeightCommit"
  | "onPositionChange"
>) {
  const positionHintId = useId();
  const positionLabel: PositionOption = build.position ?? "Any";
  const rangeText = `${formatHeightInches(heightRange.minInches)}–${formatHeightInches(heightRange.maxInches)}`;
  const noticeText =
    clampNotice === null
      ? null
      : `Height adjusted ${formatHeightInches(clampNotice.fromInches)} → ` +
        `${formatHeightInches(clampNotice.toInches)} to fit ${positionLabel}'s ` +
        `range (${rangeText}).` +
        (clampNotice.staleCount === null
          ? ""
          : ` ${clampNotice.staleCount} purchased ${
              clampNotice.staleCount === 1
                ? "badge no longer qualifies"
                : "badges no longer qualify"
            }.`);
  return (
    <Section title="Physique" storageKey="section-physique">
      <SegmentedControl
        legend="Position"
        options={POSITION_OPTIONS}
        value={positionLabel}
        onChange={(option) => {
          onPositionChange(option === "Any" ? undefined : option);
        }}
        describedBy={positionHintId}
      />
      <Hint id={positionHintId}>
        {`Sets the available height range (${positionLabel}: ${rangeText}). ` +
          "No badge has a position requirement; badges gate on height and " +
          "attributes only."}
      </Hint>
      <HeightField
        heightInches={build.heightInches}
        minInches={heightRange.minInches}
        maxInches={heightRange.maxInches}
        rangeHint={
          build.position !== undefined
            ? `${build.position}: ${rangeText}`
            : `${rangeText}, the range this dataset covers.`
        }
        notice={noticeText}
        onCommit={onHeightCommit}
      />
      {buildViolationReasons.length > 0 ? (
        <Banner variant="warning">{buildViolationReasons.join(" ")}</Banner>
      ) : null}
    </Section>
  );
}

export function BuildPanel(props: BuildPanelProps) {
  const { build, budgets, onAttributeCommit, onBudgetCommit, onResetRequest, canReset } = props;
  const resetReasonId = useId();
  // <1280: both rails dissolve (§5.2 rev 2) — the panel is a full-width
  // collapsible <details> at M AND S, with the same auto-collapse rule.
  const isCompact = useMediaQuery("(max-width: 1279px)");
  const [autoCollapsed, setAutoCollapsed] = useState<boolean>(
    () => readUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY) === true,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);

  const totalPoints = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + budgets[category].equipSlots,
    0,
  );

  const hasValues =
    totalPoints > 0 ||
    totalEquipSlots > 0 ||
    Object.values(build.attributes).some((value) => value > 0);

  const latchArmed = isCompact && hasValues && !autoCollapsed;

  const fireLatch = useCallback(() => {
    writeUiSectionOpen(BUILD_PANEL_SECTION_KEY, false);
    writeUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY, true);
    setAutoCollapsed(true);
  }, []);

  // The one-shot latch (§5.3): first zero → non-zero transition (or first
  // mount with values) writes open=false ONCE and latches. `hasValues` only
  // moves on COMMIT, so this never fires mid-drag or mid-keystroke. Rev 3
  // guard: a slider commits on release with focus still on the thumb — the
  // latch must not collapse the panel under it, so firing defers to that
  // slider's blur (the onBlur below re-checks). Once latched, the user's own
  // toggle is never overridden.
  useEffect(() => {
    if (!latchArmed) return;
    const active = document.activeElement;
    const sliderHoldsFocus =
      active instanceof HTMLInputElement &&
      active.type === "range" &&
      panelRef.current !== null &&
      panelRef.current.contains(active);
    if (sliderHoldsFocus) return; // fire on that slider's blur instead
    fireLatch();
  }, [latchArmed, fireLatch]);

  const sections = (
    <div
      className="build-panel"
      ref={panelRef}
      onBlur={(event) => {
        if (!latchArmed) return;
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type === "range") {
          fireLatch();
        }
      }}
    >
      <PhysiqueSection {...props} />
      <Section title="Attributes" storageKey="section-attributes">
        <AttributeGrid attributes={build.attributes} onCommit={onAttributeCommit} />
      </Section>
      <Section title="Badge Points & Badge Slots" storageKey="section-budget">
        <BudgetGrid budgets={budgets} onCommit={onBudgetCommit} />
      </Section>
      {/* F5.3/C — `Reset build`, at the foot of the panel.
       *
       * PLACEMENT IS ONE RULING FOR EVERY WIDTH, and it is deliberate. At
       * >=1280 this is the foot of a long sticky, scrolling rail: reaching it
       * is an act, and a mis-click is not available. Below 1280 there is no
       * rail at all and the whole panel is a collapsible <details> — so the
       * button sits INSIDE the collapsible at M/S, which keeps the same
       * property by a different mechanism (an expanded panel rather than a
       * long scroll). One placement, one behaviour.
       *
       * Text only, NO GLYPH: `↺` already means *Reaction* on the badge cards,
       * and re-using a glyph that means something else is H1's doctrine broken
       * by a symbol. Flat, never metallic (§2.7.4: metals are enclosed faces
       * with a bevel; semantics are flat). No --cat — §12.5/§12.12's placement
       * law permits four surfaces and this is none of them.
       *
       * `disabled` here is NOT the H4 class. H4 forbids disabling BECAUSE OF
       * an overspend; this is a control with no object. The reason rides an
       * aria-describedby sibling rather than a title tooltip, which is
       * unreachable by keyboard and by touch — Button.tsx's own idiom, spelled
       * out here because this control needs a className the primitive cannot
       * carry. */}
      <button
        type="button"
        className="btn btn--danger-ghost btn--sm build-panel__reset"
        onClick={onResetRequest}
        disabled={!canReset}
        aria-describedby={canReset ? undefined : resetReasonId}
      >
        Reset build
      </button>
      {canReset ? null : (
        <span id={resetReasonId} className="hint">
          Nothing to reset — no attributes, purchased badges, Synergy Slot assignments, height
          or position are set.
        </span>
      )}
    </div>
  );

  if (!isCompact) return sections;

  const digest = [
    formatHeightInches(build.heightInches),
    ...(build.position !== undefined ? [build.position] : []),
    `${totalPoints} pts`,
    `${totalEquipSlots} Badge Slots`,
  ].join(" · ");

  return (
    <Section
      // Remount on the latch flip so the Section re-reads the stored
      // open=false and actually closes; afterwards the stored preference
      // rules and this key never changes again.
      key={autoCollapsed ? "build-panel-latched" : "build-panel-initial"}
      title="Build"
      storageKey={BUILD_PANEL_SECTION_KEY}
      defaultOpen={!hasValues}
      digest={<span className="num">{digest}</span>}
    >
      {sections}
    </Section>
  );
}
