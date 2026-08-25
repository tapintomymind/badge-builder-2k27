/**
 * SynergyPanel + PlusTwoDesignator + SynergySlotRow (design-spec §3.5).
 *
 * THE DESIGNATOR IS THE FIRST CONTROL IN THE PANEL (impl-brief M4 #2,
 * scope.md §0 deviation #5): until the user designates two +2 Synergy Slots,
 * a fully-unlocked build under-reports its ceiling against the seed's own
 * 6×(+1)/2×(+2) default — the standing banner + live counter is the
 * mitigation, and it must be impossible to miss. WHICH two are +2 is
 * unpublished 2K27 data: the USER designates them at runtime; nothing here
 * ever guesses (seed: Open items #2).
 *
 * Every assignment flows through the engine's assignSynergy / clearSynergy
 * typed results — the panel renders state and never re-implements an
 * invariant. Ineligible picker options are `disabled` with the reason in the
 * option label itself (H4 invariant class; see Select).
 *
 * Season-reset preview: temporary Synergy Slots 1–4 gain a
 * "⟳ Disabled by season-reset preview" line and drop to reduced opacity, but
 * their controls REMAIN OPERABLE — the preview is a display overlay, not a
 * state change (H2).
 */

import { useState } from "react";
import { badgeById } from "../../engine/dataset";
import {
  assignSynergy,
  clearSynergy,
  effectiveLevel,
  synergyRoleFor,
  synergySlotDisabledByPreview,
} from "../../engine/synergy";
import type {
  BadgeDataset,
  LoadoutEntry,
  OverlayState,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "../../engine/types";
import { CATEGORIES, LEVEL_LABELS } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Chip } from "../primitives/Chip";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { Select } from "../primitives/Select";
import type { SelectGroup, SelectOption } from "../primitives/Select";
import { Toggle } from "../primitives/Toggle";

const ROLE_LABELS: Record<SynergyRoleKind, string> = { fuse: "Fuse", reaction: "Reaction" };

/** How many Synergy Slots the user has designated +2 (2 max — OQ-A1). */
export function plusTwoDesignatedCount(synergySlots: readonly SynergySlot[]): number {
  return synergySlots.filter((synergySlot) => synergySlot.magnitude === 2).length;
}

export interface PlusTwoDesignatorProps {
  designatedCount: number;
}

/** The standing banner — persistent while OQ-A1 is unresolved. */
export function PlusTwoDesignator({ designatedCount }: PlusTwoDesignatorProps) {
  return (
    <Banner variant="warning">
      2 of these 8 are +2 — 2K hasn't published which. Designate them here.{" "}
      <span className="num plus-two-counter">+2 designated: {designatedCount} of 2</span>
    </Banner>
  );
}

interface SynergySlotRowProps {
  synergySlot: SynergySlot;
  allSynergySlots: readonly SynergySlot[];
  loadout: readonly LoadoutEntry[];
  dataset: BadgeDataset;
  overlay: OverlayState;
  designatedCount: number;
  onToggleUnlocked: (synergySlotId: SynergySlotId, unlocked: boolean) => void;
  onMagnitudeChange: (synergySlotId: SynergySlotId, magnitude: 1 | 2) => void;
  /** badgeId, or null to clear the position. */
  onPick: (synergySlotId: SynergySlotId, roleKind: SynergyRoleKind, badgeId: string | null) => void;
}

/** Picker options for one role position of one Synergy Slot: only PURCHASED
 * badges appear (unpurchased are omitted entirely — 53 disabled options would
 * be unusable); ineligible ones are disabled with the reason in the label. */
function pickerGroups(
  synergySlot: SynergySlot,
  roleKind: SynergyRoleKind,
  allSynergySlots: readonly SynergySlot[],
  loadout: readonly LoadoutEntry[],
  dataset: BadgeDataset,
): SelectGroup[] {
  const groups: SelectGroup[] = [];
  for (const category of CATEGORIES) {
    const options: SelectOption[] = [];
    for (const entry of loadout) {
      const badge = badgeById(dataset, entry.badgeId);
      if (badge === undefined || badge.category !== category) continue;
      const base = `${badge.name} — ${LEVEL_LABELS[entry.purchasedLevel]}`;
      const role = synergyRoleFor(allSynergySlots, badge.id);
      const isThisPosition =
        role !== null && role.synergySlotId === synergySlot.id && role.kind === roleKind;
      let label = base;
      let disabled = false;
      if (role !== null && !isThisPosition) {
        disabled = true;
        label =
          role.synergySlotId === synergySlot.id
            ? `${base} — already this Synergy Slot's ${ROLE_LABELS[role.kind]}`
            : `${base} — already ${ROLE_LABELS[role.kind]} in Synergy Slot ${role.synergySlotId}`;
      }
      options.push({ value: badge.id, label, disabled });
    }
    if (options.length > 0) groups.push({ label: category, options });
  }
  return groups;
}

export function SynergySlotRow({
  synergySlot,
  allSynergySlots,
  loadout,
  dataset,
  overlay,
  designatedCount,
  onToggleUnlocked,
  onMagnitudeChange,
  onPick,
}: SynergySlotRowProps) {
  // THE canonical predicate (engine): never hand-negate synergySlotActive.
  const previewDisabled = synergySlotDisabledByPreview(synergySlot, overlay);
  const plusTwoBlocked = designatedCount >= 2 && synergySlot.magnitude !== 2;

  const state = { loadout, synergySlots: allSynergySlots };
  const committed: OverlayState = { reactionsActive: false, seasonReset: false };
  const fuseBadge =
    synergySlot.fuseBadgeId === null ? undefined : badgeById(dataset, synergySlot.fuseBadgeId);
  const reactionBadge =
    synergySlot.reactionBadgeId === null
      ? undefined
      : badgeById(dataset, synergySlot.reactionBadgeId);
  const fuseEffective =
    fuseBadge === undefined ? null : effectiveLevel(state, fuseBadge.id, committed);
  const reactionActivated =
    reactionBadge === undefined
      ? null
      : effectiveLevel(state, reactionBadge.id, { reactionsActive: true, seasonReset: false });

  const effectParts: string[] = [];
  if (fuseBadge !== undefined && fuseEffective !== null) {
    effectParts.push(`${fuseBadge.name} → ${LEVEL_LABELS[fuseEffective]}`);
  }
  if (reactionBadge !== undefined && reactionActivated !== null) {
    effectParts.push(`${reactionBadge.name} → ${LEVEL_LABELS[reactionActivated]} when activated`);
  }

  function picker(roleKind: SynergyRoleKind) {
    const groups = pickerGroups(synergySlot, roleKind, allSynergySlots, loadout, dataset);
    const value =
      roleKind === "fuse" ? (synergySlot.fuseBadgeId ?? "") : (synergySlot.reactionBadgeId ?? "");
    const empty = groups.length === 0;
    return (
      <Select
        label={roleKind === "fuse" ? "⚡ Fuse" : "↺ Reaction"}
        value={value}
        onChange={(picked) => {
          onPick(synergySlot.id, roleKind, picked === "" ? null : picked);
        }}
        options={
          empty
            ? [{ value: "", label: "No purchased badges yet", disabled: true }]
            : [{ value: "", label: "None" }]
        }
        groups={groups}
      />
    );
  }

  return (
    <fieldset
      className={`synergy-row${
        !synergySlot.unlocked || previewDisabled ? " synergy-row--dimmed" : ""
      }`}
    >
      <legend className="synergy-row__legend">Synergy Slot {synergySlot.id}</legend>
      <div className="synergy-row__header">
        <span className="synergy-row__title" aria-hidden="true">
          Synergy Slot {synergySlot.id}
        </span>
        <Chip variant={synergySlot.permanence === "temporary" ? "warning" : "muted"}>
          {synergySlot.permanence === "temporary" ? "Temporary" : "Permanent"}
        </Chip>
        <SegmentedControl
          legend="Boost"
          options={["+1", "+2"] as const}
          value={synergySlot.magnitude === 2 ? "+2" : "+1"}
          onChange={(picked) => {
            onMagnitudeChange(synergySlot.id, picked === "+2" ? 2 : 1);
          }}
          disabledOptions={
            plusTwoBlocked
              ? { "+2": "Only 2 Synergy Slots can be +2. Clear another first." }
              : undefined
          }
        />
        <span className="synergy-row__unlock">
          <Toggle
            label="Unlocked"
            checked={synergySlot.unlocked}
            onChange={(unlocked) => {
              onToggleUnlocked(synergySlot.id, unlocked);
            }}
          />
        </span>
      </div>
      {previewDisabled ? (
        <p className="synergy-row__preview-note">⟳ Disabled by season-reset preview</p>
      ) : null}
      {synergySlot.unlocked ? (
        <>
          <div className="synergy-row__pickers">
            {picker("fuse")}
            {picker("reaction")}
          </div>
          {effectParts.length > 0 ? (
            <p className="synergy-row__effect">{effectParts.join(" · ")}</p>
          ) : null}
        </>
      ) : (
        <p className="synergy-row__locked-note">Locked — unlock to assign badges</p>
      )}
    </fieldset>
  );
}

export interface SynergyPanelProps {
  synergySlots: readonly SynergySlot[];
  loadout: readonly LoadoutEntry[];
  dataset: BadgeDataset;
  overlay: OverlayState;
  onSynergySlotsChange: (synergySlots: SynergySlot[]) => void;
}

export function SynergyPanel({
  synergySlots,
  loadout,
  dataset,
  overlay,
  onSynergySlotsChange,
}: SynergyPanelProps) {
  const [announcement, setAnnouncement] = useState("");
  const designatedCount = plusTwoDesignatedCount(synergySlots);

  const handleToggleUnlocked = (synergySlotId: SynergySlotId, unlocked: boolean) => {
    onSynergySlotsChange(
      synergySlots.map((synergySlot) =>
        synergySlot.id === synergySlotId ? { ...synergySlot, unlocked } : synergySlot,
      ),
    );
  };

  const handleMagnitudeChange = (synergySlotId: SynergySlotId, magnitude: 1 | 2) => {
    // The +2 cap is already enforced by the disabled radio (invariant class);
    // this guard only backstops a programmatic call.
    if (magnitude === 2 && designatedCount >= 2) return;
    onSynergySlotsChange(
      synergySlots.map((synergySlot) =>
        synergySlot.id === synergySlotId ? { ...synergySlot, magnitude } : synergySlot,
      ),
    );
  };

  const handlePick = (
    synergySlotId: SynergySlotId,
    roleKind: SynergyRoleKind,
    badgeId: string | null,
  ) => {
    const state = { loadout, synergySlots };
    const result =
      badgeId === null
        ? clearSynergy(state, synergySlotId, roleKind)
        : assignSynergy(state, synergySlotId, roleKind, badgeId);
    if (!result.ok) {
      // The pickers never offer an invalid option (H4 invariant class), so
      // this is unreachable through the UI; announce rather than mutate.
      setAnnouncement(`Could not update Synergy Slot ${synergySlotId}.`);
      return;
    }
    onSynergySlotsChange(result.synergySlots);
    if (badgeId === null) {
      setAnnouncement(`${ROLE_LABELS[roleKind]} cleared in Synergy Slot ${synergySlotId}.`);
      return;
    }
    const badgeName = badgeById(dataset, badgeId)?.name ?? badgeId;
    const effective = effectiveLevel(
      { loadout, synergySlots: result.synergySlots },
      badgeId,
      { reactionsActive: roleKind === "reaction", seasonReset: false },
    );
    setAnnouncement(
      `${badgeName} assigned as ${ROLE_LABELS[roleKind]} in Synergy Slot ${synergySlotId}.` +
        (effective === null ? "" : ` Effective level ${LEVEL_LABELS[effective]}.`),
    );
  };

  return (
    <div className="synergy-panel">
      <PlusTwoDesignator designatedCount={designatedCount} />
      {synergySlots.map((synergySlot) => (
        <SynergySlotRow
          key={synergySlot.id}
          synergySlot={synergySlot}
          allSynergySlots={synergySlots}
          loadout={loadout}
          dataset={dataset}
          overlay={overlay}
          designatedCount={designatedCount}
          onToggleUnlocked={handleToggleUnlocked}
          onMagnitudeChange={handleMagnitudeChange}
          onPick={handlePick}
        />
      ))}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}
