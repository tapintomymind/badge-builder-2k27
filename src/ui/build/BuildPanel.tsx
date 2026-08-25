/**
 * BuildPanel (design-spec §3.3) — three Sections, visually separated,
 * because two of them gate badges and one (Position) does not.
 *
 * PhysiqueSection's Position control is deliberately inert-looking: muted
 * palette, a Cosmetic chip, a permanent hint, and it is the ONLY Build-panel
 * control whose change produces ZERO downstream re-render — no card, pip, or
 * ledger number moves. That silence is intentional (seed: position is
 * display metadata only; it gates nothing).
 *
 * Below the L breakpoint (<1280px — §5.2 rev 2: BOTH rails dissolve at M,
 * so M and S share one structure) the whole panel collapses into one
 * <details> whose summary carries a live digest (§5.3).
 *
 * AUTO-COLLAPSE (§5.3, design-review P0-2) — a LATCH, not a computation:
 * default-open at zero state; collapses automatically EXACTLY ONCE the
 * first time the build has non-zero values (evaluated on commit — fields
 * commit on blur, so this never fires mid-keystroke — or on the next
 * mount); the user's open/closed choice is persisted thereafter and never
 * overridden again.
 */

import { useEffect, useId, useState } from "react";
import type { Budget, Build } from "../../engine/types";
import type { Attr, Category } from "../../engine/vocabulary";
import { CATEGORIES, formatHeightInches } from "../../engine/vocabulary";
import { readUiSectionOpen, writeUiSectionOpen } from "../../persist/local-storage";
import { Chip } from "../primitives/Chip";
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

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
export type Position = (typeof POSITIONS)[number];

export interface BuildPanelProps {
  build: Build;
  budgets: Record<Category, Budget>;
  /** Dataset-derived height clamp range (inches). */
  heightRange: { minInches: number; maxInches: number };
  onHeightCommit: (heightInches: number) => void;
  onPositionChange: (position: Position) => void;
  onAttributeCommit: (attr: Attr, value: number) => void;
  onBudgetCommit: (category: Category, field: keyof Budget, value: number) => void;
}

export function PhysiqueSection({
  build,
  heightRange,
  onHeightCommit,
  onPositionChange,
}: Pick<BuildPanelProps, "build" | "heightRange" | "onHeightCommit" | "onPositionChange">) {
  const positionHintId = useId();
  return (
    <Section title="Physique" storageKey="section-physique">
      <HeightField
        heightInches={build.heightInches}
        minInches={heightRange.minInches}
        maxInches={heightRange.maxInches}
        onCommit={onHeightCommit}
      />
      <hr className="physique__rule" />
      <div className="physique__position-row">
        <SegmentedControl
          legend="Position"
          options={POSITIONS}
          value={build.position ?? null}
          onChange={onPositionChange}
          muted
          describedBy={positionHintId}
        />
        <Chip variant="muted">Cosmetic</Chip>
      </div>
      <Hint id={positionHintId}>
        Cosmetic. Position gates no badges — this dataset has no position restrictions.
      </Hint>
    </Section>
  );
}

export function BuildPanel(props: BuildPanelProps) {
  const { build, budgets, onAttributeCommit, onBudgetCommit } = props;
  // <1280: both rails dissolve (§5.2 rev 2) — the panel is a full-width
  // collapsible <details> at M AND S, with the same auto-collapse rule.
  const isCompact = useMediaQuery("(max-width: 1279px)");
  const [autoCollapsed, setAutoCollapsed] = useState<boolean>(
    () => readUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY) === true,
  );

  const totalPoints = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + budgets[category].equipSlots,
    0,
  );

  const hasValues =
    totalPoints > 0 ||
    totalEquipSlots > 0 ||
    Object.values(build.attributes).some((value) => value > 0);

  // The one-shot latch (§5.3): first zero → non-zero transition (or first
  // mount with values) writes open=false ONCE and latches. `hasValues` only
  // moves on commit (fields commit on blur), so this never fires
  // mid-keystroke. Once latched, the user's own toggle is never overridden.
  useEffect(() => {
    if (!isCompact || !hasValues || autoCollapsed) return;
    writeUiSectionOpen(BUILD_PANEL_SECTION_KEY, false);
    writeUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY, true);
    setAutoCollapsed(true);
  }, [isCompact, hasValues, autoCollapsed]);

  const sections = (
    <div className="build-panel">
      <PhysiqueSection {...props} />
      <Section title="Attributes" storageKey="section-attributes">
        <AttributeGrid attributes={build.attributes} onCommit={onAttributeCommit} />
      </Section>
      <Section title="Badge Points & Badge Slots" storageKey="section-budget">
        <BudgetGrid budgets={budgets} onCommit={onBudgetCommit} />
      </Section>
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
