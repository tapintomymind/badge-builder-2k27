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
  RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS,
  assignSynergy,
  clearSynergy,
  effectiveLevel,
  isRatifiedPlusTwo,
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
import type { Category } from "../../engine/vocabulary";
import { CATEGORIES, LEVEL_LABELS } from "../../engine/vocabulary";
import { Banner } from "../primitives/Banner";
import { Chip } from "../primitives/Chip";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { Select } from "../primitives/Select";
import type { SelectGroup, SelectOption } from "../primitives/Select";
import { Toggle } from "../primitives/Toggle";
import { SynergyBoard } from "./SynergyBoard";

const ROLE_LABELS: Record<SynergyRoleKind, string> = { fuse: "Fuse", reaction: "Reaction" };

/** How many Synergy Slots carry +2 in total — RATIFIED plus user-designated
 * (2 max — the sealed count; OQ-A1 covers only WHICH). */
export function plusTwoDesignatedCount(synergySlots: readonly SynergySlot[]): number {
  return synergySlots.filter((synergySlot) => synergySlot.magnitude === 2).length;
}

/** F4: how many +2 designations remain for the USER, once the ratified set is
 * accounted for. Synergy Slot 7 is 2K's; one is left to designate. */
const USER_DESIGNATABLE_PLUS_TWO = 2 - RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS.length;

export interface PlusTwoDesignatorProps {
  designatedCount: number;
}

/** The standing banner — persistent while OQ-A1 is unresolved. F4 re-cut the
 * copy and the counter to the REMAINING budget: Synergy Slot 7's +2 is
 * ratified data, so only one designation is left to the user. The banner
 * itself retires only when the second +2 is published (scope.md §6 OQ-A1). */
export function PlusTwoDesignator({ designatedCount }: PlusTwoDesignatorProps) {
  const userDesignated = Math.max(
    0,
    designatedCount - RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS.length,
  );
  return (
    <Banner variant="warning">
      {USER_DESIGNATABLE_PLUS_TWO} more Synergy Slot can be +2 — 2K hasn&apos;t published which.
      Designate it here.{" "}
      <span className="num plus-two-counter">
        +2 designated: {userDesignated} of {USER_DESIGNATABLE_PLUS_TWO}
      </span>
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
  /** F4: the Build Specialization discipline for Synergy Slot 7, or null. */
  onDisciplineLockChange: (synergySlotId: SynergySlotId, lock: Category | null) => void;
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
      } else if (
        synergySlot.disciplineLock !== null &&
        badge.category !== synergySlot.disciplineLock
      ) {
        // F4 discipline lock. The picker READS the lock off the slot; the
        // rule itself is the engine's (assignSynergy refuses the assignment).
        // Off-discipline PURCHASED badges are shown DISABLED with the reason
        // in the label — omission is reserved for unpurchased badges, and a
        // user whose badge silently vanished will assume a bug.
        disabled = true;
        label = `${base} — ${synergySlot.disciplineLock} badges only in this Synergy Slot`;
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
  onDisciplineLockChange,
  onPick,
}: SynergySlotRowProps) {
  // THE canonical predicate (engine): never hand-negate synergySlotActive.
  const previewDisabled = synergySlotDisabledByPreview(synergySlot, overlay);
  const plusTwoBlocked = designatedCount >= 2 && synergySlot.magnitude !== 2;
  /** F4: is this Synergy Slot's +2 RATIFIED data rather than a user
   * preference? The UI READS the engine predicate; it never recomputes the
   * membership (seed: Working agreements — every rule lives in the engine).
   * The `disabled` attribute below is an AFFORDANCE; the INVARIANT lives in
   * handleMagnitudeChange, which reads the same predicate. */
  const ratifiedPlusTwo = isRatifiedPlusTwo(synergySlot.id);
  const ratifiedReasonId = `synergy-ratified-${synergySlot.id}`;
  /** Only the ratified Build Specialization Synergy Slot offers a discipline
   * control; every other Synergy Slot is permanently interchangeable. */
  const offersDisciplineLock = ratifiedPlusTwo;

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
      // [F11] The scroll-and-focus anchor the SynergyBoard's column buttons
      // target. An id rather than a ref map or a context — it matches the
      // app's existing in-page-anchor convention (#cat-*, #panel-synergy,
      // #badge-grid) and needs no plumbing at all.
      id={`synergy-row-${synergySlot.id}`}
      className={`synergy-row${
        !synergySlot.unlocked || previewDisabled ? " synergy-row--dimmed" : ""
      }`}
      // F5 presentation hook (design-spec §10.5 permanence rim): a field the
      // row already renders (the Temporary/Permanent chip), exposed for CSS.
      // Static per Synergy Slot — never overlay-derived.
      data-permanence={synergySlot.permanence}
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
          describedBy={ratifiedPlusTwo ? ratifiedReasonId : undefined}
          onChange={(picked) => {
            onMagnitudeChange(synergySlot.id, picked === "+2" ? 2 : 1);
          }}
          disabledOptions={
            ratifiedPlusTwo
              ? {
                  "+1": `Synergy Slot ${synergySlot.id} is +2 — Build Specialization, confirmed 2026-08-26.`,
                }
              : plusTwoBlocked
                ? { "+2": "Only 2 Synergy Slots can be +2. Clear another first." }
                : undefined
          }
        />
        {ratifiedPlusTwo ? (
          <Chip variant="muted">
            <span id={ratifiedReasonId}>
              +2 — Build Specialization, confirmed 2026-08-26
            </span>
          </Chip>
        ) : null}
        {offersDisciplineLock ? (
          <Select
            label="Build Specialization discipline"
            value={synergySlot.disciplineLock ?? ""}
            onChange={(picked) => {
              onDisciplineLockChange(synergySlot.id, picked === "" ? null : (picked as Category));
            }}
            options={[
              { value: "", label: "Not set" },
              ...CATEGORIES.map((category) => ({ value: category, label: category })),
            ]}
          />
        ) : null}
        {synergySlot.disciplineLock !== null ? (
          <Chip variant="muted">Locked to {synergySlot.disciplineLock}</Chip>
        ) : null}
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
  /**
   * [F4/A2] Did THIS load normalize a ratified Synergy Slot's magnitude?
   * Threaded from App.tsx's `fromSaved` at all three reload routes (boot,
   * named-build load, import) — false on a fresh build and on a build that
   * already carried the ratified value, so the disclosure is a DISCLOSURE
   * and not decoration.
   */
  ratifiedMagnitudeNormalized?: boolean;
  onSynergySlotsChange: (synergySlots: SynergySlot[]) => void;
}

export function SynergyPanel({
  synergySlots,
  loadout,
  dataset,
  overlay,
  ratifiedMagnitudeNormalized = false,
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
    // [F4/N9] The RATIFIED +2 is not user-removable, and that rule lives in
    // the ENGINE (isRatifiedPlusTwo) — this handler READS it. A `disabled`
    // attribute is an affordance, not an invariant; without this line a
    // programmatic call would happily set Synergy Slot 7 back to +1.
    if (magnitude === 1 && isRatifiedPlusTwo(synergySlotId)) return;
    // The +2 cap is already enforced by the disabled radio (invariant class);
    // this guard only backstops a programmatic call.
    if (magnitude === 2 && designatedCount >= 2) return;
    onSynergySlotsChange(
      synergySlots.map((synergySlot) =>
        synergySlot.id === synergySlotId ? { ...synergySlot, magnitude } : synergySlot,
      ),
    );
  };

  /** F4: set (or clear) a Synergy Slot's Build Specialization discipline.
   * NEVER auto-clears an assignment that the new lock invalidates — H8
   * forbids silently re-validating a plan away, so the resulting state is
   * REPORTED by validateLoadout and disclosed in the Summary panel. */
  const handleDisciplineLockChange = (synergySlotId: SynergySlotId, lock: Category | null) => {
    onSynergySlotsChange(
      synergySlots.map((synergySlot) =>
        synergySlot.id === synergySlotId ? { ...synergySlot, disciplineLock: lock } : synergySlot,
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
        : assignSynergy(state, synergySlotId, roleKind, badgeId, dataset);
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
      {/* [F4/A2] The ratification disclosure. VISIBLE, PERSISTENT PLAIN TEXT
          — deliberately NOT a live region (no role="status", no aria-live):
          it describes a STATE, not a discrete user action, and design-spec §6
          budgets exactly three live regions, which F4 does not extend. A
          screen reader reaches it by normal traversal, which is correct for a
          state description. It also needs no dismiss control: states are not
          events. */}
      {ratifiedMagnitudeNormalized ? (
        <p className="synergy-panel__ratified-note">
          Synergy Slot {RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS.join(", ")} is now +2 — 2K&apos;s Build
          Specialization reward, confirmed 2026-08-26.
        </p>
      ) : null}
      <PlusTwoDesignator designatedCount={designatedCount} />
      {/* [F11] The board is the HEAD of this section and the eight rows below
          are its detail. It takes four props this component already holds and
          adds none — nothing is threaded through App.tsx, because there is
          nothing to thread. It dispatches no state change. */}
      <SynergyBoard
        synergySlots={synergySlots}
        loadout={loadout}
        dataset={dataset}
        overlay={overlay}
      />
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
          onDisciplineLockChange={handleDisciplineLockChange}
          onPick={handlePick}
        />
      ))}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}
