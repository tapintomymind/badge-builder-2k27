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
 * On mobile (<768px) the whole panel collapses into one <details> whose
 * summary carries a live digest (§5.3).
 */

import { useId } from "react";
import type { Budget, Build } from "../../engine/types";
import type { Attr, Category } from "../../engine/vocabulary";
import { CATEGORIES, formatHeightInches } from "../../engine/vocabulary";
import { Chip } from "../primitives/Chip";
import { HeightField } from "../primitives/HeightField";
import { Hint } from "../primitives/Hint";
import { Section } from "../primitives/Section";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { useMediaQuery } from "../useMediaQuery";
import { AttributeGrid } from "./AttributeGrid";
import { BudgetGrid } from "./BudgetGrid";

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
  const isMobile = useMediaQuery("(max-width: 767px)");

  const totalPoints = CATEGORIES.reduce((sum, category) => sum + budgets[category].points, 0);
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + budgets[category].equipSlots,
    0,
  );

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

  if (!isMobile) return sections;

  const digest = [
    formatHeightInches(build.heightInches),
    ...(build.position !== undefined ? [build.position] : []),
    `${totalPoints} pts`,
    `${totalEquipSlots} Badge Slots`,
  ].join(" · ");

  const hasValues =
    totalPoints > 0 ||
    totalEquipSlots > 0 ||
    Object.values(build.attributes).some((value) => value > 0);

  return (
    <Section
      title="Build"
      storageKey="section-build-panel"
      defaultOpen={!hasValues}
      digest={<span className="num">{digest}</span>}
    >
      {sections}
    </Section>
  );
}
