/**
 * App shell (M3 + M4) — wires the build panel, badge grid, category ledgers,
 * synergy panel, overlays, filters, summary, and persistence UI to the
 * engine. CONTAINS ZERO RULES: every number rendered anywhere below comes
 * from src/engine/ (ledger readouts, eligibility, costs, effective levels)
 * or from user input routed through the src/config/ deriveBudget seam.
 *
 * HARD CONTRACT: every card renders via effectiveLevel(state, badgeId,
 * overlay) — never purchasedLevel.
 *
 * H2 — THE PRIMARY LEDGER ROWS ALWAYS RENDER THE "current" BASIS. The
 * season-reset preview is reachable ONLY through the separately-computed
 * `projections` (basis "postSeasonReset"), rendered by CategoryLedger as a
 * second, explicitly-labelled row. The primary readout below is NEVER
 * derived from the overlay state — writing
 * `categoryLedgerAt(state, overlaySeasonReset ? … : …)` for the primary row
 * is the one-line bug the whole H2 ruling exists to prevent. Do not.
 * "Reactions activated" cannot reach any ledger call at all: the ledger's
 * basis type has no representation for it.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyRatifiedRefundTrigger, defaultAppConfig, deriveBudget } from "./config";
import { hasCapBreakers } from "./engine/attributes";
import {
  bonusFieldsSet,
  bonusHasContent,
  effectiveBudgets,
  zeroBonus,
} from "./engine/budget";
import { shippedDataset } from "./engine/dataset";
import { levelPasses, validateBadge } from "./engine/eligibility";
import { whatIf } from "./engine/cost";
import {
  SAVED_BUILD_SCHEMA_VERSION,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "./engine/serialization";
import type { ClearedSynergyRef } from "./engine/serialization";
import { buildSummary, synergyProjections } from "./engine/summary";
import { applyRatifiedMagnitudes, createDefaultSynergySlots, defaultOverlay } from "./engine/synergy";
import type { SynergyState } from "./engine/synergy";
import { categoryLedgerAt } from "./engine/synergy-ledger";
import { badgeSlotsCapacityUnset } from "./engine/ledger";
import type { CategoryLedgerReadout, SynergyLedgerState } from "./engine/synergy-ledger";
import type { PinMode, RollMode, RollRequest, RollResult } from "./engine/randomize";
import { rollBuild } from "./engine/randomize";
import { stableDigest } from "./engine/random";
import { RollPanel, RerollConfirmDialog } from "./ui/summary/RollPanel";
import type { RollControls } from "./ui/roll/roll-controls";
import { RollControlsContext } from "./ui/roll/roll-controls";
import { newSeed } from "./ui/roll/newSeed";
import { positionHeightRange, validateBuild } from "./engine/validate-build";
import { validateLoadout } from "./engine/validate-loadout";
import type {
  AppConfig,
  Badge,
  BonusBudget,
  Budget,
  Build,
  LoadoutEntry,
  OverlayState,
  SavedBuild,
  SynergySlot,
} from "./engine/types";
import type { Attr, Category, Position, PurchasableLevel } from "./engine/vocabulary";
import {
  ATTRS,
  ATTR_LABELS,
  CATEGORIES,
  PURCHASABLE_LEVELS,
  formatHeightInches,
  levelIndex,
} from "./engine/vocabulary";
import {
  clearAutosaveQuarantine,
  duplicateNamedBuild,
  exportRawPersistedData,
  listNamedBuilds,
  newBuildId,
  preserveAutosaveOriginal,
  quarantineAutosave,
  readAutosaveQuarantine,
  readAutosaveResult,
  readNamedBuildWithReport,
  renameNamedBuild,
  saveNamedBuild,
  deleteNamedBuild,
  writeAutosaveIfUnmoved,
  writeAutosaveTracked,
} from "./persist/local-storage";
import type { NamedBuildSummary, PersistResult } from "./persist/local-storage";
import { BonusDialog } from "./ui/build/BonusDialog";
import { BudgetsDialog } from "./ui/build/BudgetsDialog";
import {
  AttributesSection,
  BuildPanel,
  PhysiqueSection,
  PhysiqueStrip,
} from "./ui/build/BuildPanel";
import type { HeightClampNotice } from "./ui/build/BuildPanel";
import { ResetBuildDialog } from "./ui/build/ResetBuildDialog";
import type { ResetBlastRadius } from "./ui/build/ResetBuildDialog";
import { BuildManagerDialog, BuildSwitcher } from "./ui/builds/BuildManager";
import { badgeAnchorId } from "./ui/board/board-model";
import { LoadoutBoard } from "./ui/board/LoadoutBoard";
import { BadgeCard } from "./ui/grid/BadgeCard";
import { BadgeGridSection } from "./ui/grid/BadgeGridSection";
import {
  CategoryLedgerDigest,
  CategoryLedgerLede,
  projectionDiffers,
} from "./ui/grid/CategoryLedger";
import { EmptyResults } from "./ui/grid/EmptyResults";
import { categoryFeasibility } from "./ui/grid/feasibility";
import type { CategoryFeasibility } from "./ui/grid/feasibility";
import { FilterBar, defaultFilterState } from "./ui/grid/FilterBar";
import type { FilterState } from "./ui/grid/FilterBar";
import { JumpNav } from "./ui/grid/JumpNav";
import { AppHeader } from "./ui/shell/AppHeader";
import { AutosaveWarning } from "./ui/shell/AutosaveWarning";
import { DriftBanner } from "./ui/shell/DriftBanner";
import { PreviewModeStrip } from "./ui/shell/PreviewModeStrip";
import { QuarantineBanner } from "./ui/shell/QuarantineBanner";
import { mountColRightScrollMemory } from "./ui/shell/scroll-memory";
import { SynergyDock } from "./ui/rail/SynergyDock";
import { MobileTabs, mobileTabId, mobileTabPanelId } from "./ui/shell/MobileTabs";
import type { MobileTabId } from "./ui/shell/MobileTabs";
import { TotalsStrip } from "./ui/rail/TotalsStrip";
import { Section } from "./ui/primitives/Section";
import { Toggle } from "./ui/primitives/Toggle";
import { useMediaQuery } from "./ui/useMediaQuery";
import { SynergyPanel } from "./ui/synergy/SynergyPanel";
import {
  ExportImportControls,
  ImportDialog,
  SummaryPanel,
} from "./ui/summary/SummaryPanel";
import type { ImportDialogState } from "./ui/summary/SummaryPanel";

/** The dataset's own height coverage — the "Any"-position range, DERIVED by
 * the engine (positionHeightRange with no position), never authored here. */
const ANY_HEIGHT_RANGE = positionHeightRange();

/** Zero-state height: the midpoint of the dataset's range, floored — 6'6"
 * (78 in) for the shipped 69–88 dataset, exactly the design-spec §5.4 ruled
 * default. A UI default, not a claim about 2K. */
const DEFAULT_HEIGHT_INCHES = Math.floor(
  (ANY_HEIGHT_RANGE.minInches + ANY_HEIGHT_RANGE.maxInches) / 2,
);

/**
 * Purchased entries that no longer qualify at their PURCHASED level — the
 * predicate BadgeCard's stale/blocked treatments render, counted over ENGINE
 * outputs only (validateBadge + levelPasses; no rule re-implemented here).
 * Drives the §6 build-change announcements and the clamp notice's stale
 * sentence.
 */
function stalePurchaseCount(loadout: readonly LoadoutEntry[], build: Build): number {
  let count = 0;
  for (const entry of loadout) {
    const badge = shippedDataset.badges.find((candidate) => candidate.id === entry.badgeId);
    if (badge === undefined) continue;
    const eligibility = validateBadge(badge, build);
    if (!eligibility.allowed || !levelPasses(badge.requirements, build, entry.purchasedLevel)) {
      count += 1;
    }
  }
  return count;
}

/** `N purchased badge(s) no longer qualify/qualifies.` — shared by the clamp
 * notice and both build-change announcements so the copy cannot drift. */
function staleSentence(count: number): string {
  return `${count} purchased ${count === 1 ? "badge no longer qualifies" : "badges no longer qualify"}.`;
}

interface WorkingState {
  name: string;
  /** The named build this working state was loaded from, if any. */
  sourceId: string | null;
  /** The dataset this plan was made against (H8). STICKY: loading an
   * old-dataset build keeps its stamp — restamping on autosave would be the
   * silent re-validation H8 forbids. */
  dataVersion: string;
  build: Build;
  /** [A5] THE BASE SIX — never the composed record. What the base-entry grid
   * shows and what `onBudgetCommit` writes back into. */
  budgets: Record<Category, Budget>;
  /** [A5] The bonus layer, a SEPARATE layer that is never merged into
   * `budgets`. Always present in memory; `zeroBonus()` for a fresh build and
   * for every pre-A5 file. NO CONTROL CAN WRITE A NON-ZERO VALUE YET — that
   * arrives with A5-U. */
  bonus: BonusBudget;
  loadout: LoadoutEntry[];
  synergy: SynergySlot[];
  config: AppConfig;
}

function zeroAttributes(): Build["attributes"] {
  return Object.fromEntries(ATTRS.map((attr) => [attr, 0])) as Build["attributes"];
}

function zeroBudgets(): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 0, points: 0 }]),
  ) as Record<Category, Budget>;
}

function freshWorkingState(): WorkingState {
  return {
    name: "Untitled build",
    sourceId: null,
    dataVersion: shippedDataset.dataVersion,
    build: { heightInches: DEFAULT_HEIGHT_INCHES, attributes: zeroAttributes() },
    budgets: zeroBudgets(),
    // [A5] ALL ZERO. There is no published starting bonus and none is
    // invented — the user's observed figures are one account's snapshot,
    // explicitly "dynamic". Ship gate 1.7.
    bonus: zeroBonus(),
    loadout: [],
    synergy: createDefaultSynergySlots(defaultAppConfig.plusTwoSlotIds),
    config: defaultAppConfig,
  };
}

/**
 * [F4/A2] `fromSaved` returns a PAIR, not a bare WorkingState.
 *
 * Synergy Slot 7's magnitude is re-derived from ratified data at LOAD
 * (`applyRatifiedMagnitudes`), overriding whatever the file says — a data
 * refresh, not an auto-migration (H8). That override is DISCLOSED, so the
 * report has to reach the UI, and it has to reach it from ALL THREE reload
 * routes: boot restore, named-build load, and import.
 *
 * The pair shape is deliberate. The old signature returned a bare
 * WorkingState and two of the three call sites read
 * `applyWorking(fromSaved(...))` — a second return value would have been
 * silently DISCARDED at both, wiring the disclosure at boot only. The
 * destructure forces every call site to acknowledge it.
 *
 * [F16.1] IT IS NOW A TRIPLE, for the second ratified value F4 landed and did
 * NOT normalize. `applyRatifiedRefundTrigger` re-derives `config.refundTrigger`
 * from the ratified fact the same way, at the same one point, disclosed
 * through the same three routes. The whole defect was that these two facts
 * shipped asymmetrically: one re-derived at load, one left to a DEFAULT that
 * only a build constructed AFTER the flip could ever see.
 *
 * THE ONE NORMALIZATION POINT for all three persisted-reload routes.
 */
interface FromSavedResult {
  working: WorkingState;
  /** Did this load override a persisted magnitude with ratified data? */
  ratifiedMagnitudeNormalized: boolean;
  /** [F16.1] Did this load override a persisted refund trigger with the
   * ratified one? */
  refundTriggerNormalized: boolean;
}

function fromSaved(saved: SavedBuild, sourceId: string | null): FromSavedResult {
  const ratified = applyRatifiedMagnitudes(saved.synergy);
  const ratifiedTrigger = applyRatifiedRefundTrigger(saved.config);
  return {
    working: {
      name: saved.name,
      sourceId,
      dataVersion: saved.dataVersion,
      build: saved.build,
      budgets: saved.budgets,
      // [A5] NO SECOND NORMALIZATION. The deserializer already guaranteed a
      // fully-populated bonus with exactly the six category keys, and a second
      // normalization point is a second place for the two to drift. Also NO
      // DISCLOSURE: "your file had no bonus section" is the normal case for
      // every build that exists today and would fire on every boot.
      bonus: saved.bonus,
      loadout: saved.loadout,
      synergy: ratified.synergySlots,
      config: ratifiedTrigger.config,
    },
    ratifiedMagnitudeNormalized: ratified.normalizedSynergySlotIds.length > 0,
    refundTriggerNormalized: ratifiedTrigger.refundTriggerNormalized,
  };
}

function toEnvelope(working: WorkingState, savedAt: string = new Date().toISOString()): SavedBuild {
  return {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: working.dataVersion,
    savedAt,
    name: working.name,
    build: working.build,
    budgets: working.budgets,
    // [A5] All five call sites (autosave, unmount flush, save-named, export,
    // the BuildManager prop) route through here. A miss writes a bonus-less
    // envelope OVER a build that had one — the F4/A2 discarded-return class.
    bonus: working.bonus,
    loadout: working.loadout,
    synergy: working.synergy,
    config: working.config,
  };
}

/** First name in `base`, `base 2`, `base 3`, … not already taken. Duplicate /
 * save-as-new / rename all route through this, so the switcher can never
 * grow two indistinguishable same-named builds. */
function uniqueBuildName(base: string, takenNames: ReadonlySet<string>): string {
  if (!takenNames.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base} ${n}`;
    if (!takenNames.has(candidate)) return candidate;
  }
}

/** Is there anything in this working state worth guarding? Used by the
 * switcher guard so a boot-restored autosave (sourceId is null after reload —
 * the envelope carries no sourceId, a deferred schema change) still gets a
 * confirm before being replaced. */
function workingHasContent(working: WorkingState): boolean {
  return (
    working.loadout.length > 0 ||
    Object.values(working.build.attributes).some((value) => value > 0) ||
    // [A6] A build carrying only cap breakers is content worth guarding: the
    // user read those numbers off the game and typed them in, and a switcher
    // replace that discards them silently is the F2.2 class. THE GUARD LANDS
    // BEFORE THE WRITER — nothing in A6-E can produce a cap breaker, so this
    // arm is inert TODAY and that is precisely the point: A6-U's control
    // ships into a clobber-confirm that already sees what it writes. Derived
    // through the engine, never enumerated here, so the containment lint
    // holds and the predicate widens by itself.
    hasCapBreakers(working.build) ||
    CATEGORIES.some(
      (category) =>
        working.budgets[category].points > 0 || working.budgets[category].equipSlots > 0,
    ) ||
    // [A5] Earned totals and applied allocations are BOTH content worth
    // guarding — they are account progression the user typed in, and a
    // switcher replace that discards them silently is the F2.2 class. Derived
    // (src/engine/budget.ts), not enumerated here, so it widens by itself.
    bonusHasContent(working.bonus) ||
    working.synergy.some(
      (synergySlot) =>
        synergySlot.unlocked ||
        synergySlot.fuseBadgeId !== null ||
        synergySlot.reactionBadgeId !== null,
    )
  );
}

/**
 * F5.3/C — the DEFAULT RESET'S OWN SCOPE, as a predicate.
 *
 * NOT `workingHasContent`. That one answers the switcher guard's question and
 * returns true for `budgets`-only and `unlocked`-only states, NEITHER of which
 * the default reset touches — so a user who has entered budgets and nothing
 * else would get an enabled `Reset build` whose confirm, with zero-count rows
 * suppressed, shows an empty "Will be cleared" list.
 *
 * `workingHasContent` is deliberately left alone: it is F2.2's shipped
 * data-loss guard, and making one predicate answer two questions breaks
 * silently the moment either question's scope moves.
 *
 * Consequence, stated so it is a decision and not an oversight: a
 * budgets-only build cannot be reset. That is correct — the budgets are the
 * most tedious block in the app and a user re-spreading a player almost
 * always keeps them.
 */
function playerHasContent(working: WorkingState): boolean {
  return (
    working.loadout.length > 0 ||
    Object.values(working.build.attributes).some((value) => value > 0) ||
    // [A6] Same widening, same before-the-writer reasoning: a build whose
    // only content is cap breakers must still offer `Reset build`.
    hasCapBreakers(working.build) ||
    working.build.heightInches !== DEFAULT_HEIGHT_INCHES ||
    working.build.position !== undefined ||
    working.synergy.some(
      (synergySlot) =>
        synergySlot.fuseBadgeId !== null || synergySlot.reactionBadgeId !== null,
    )
  );
}

/**
 * F5.3/C — what a reset would actually destroy, counted.
 *
 * PURE COUNTING over WorkingState: no engine call, no rule, no cost, no
 * eligibility. Same local-helper precedent as `stalePurchaseCount` and
 * `workingHasContent`. If this function ever derives a cost or a level, the
 * diagnosis is wrong.
 *
 * `budgetFieldsSet` drives the CHECKBOX LABEL only — the default reset keeps
 * every one of those fields.
 */
function resetBlastRadius(working: WorkingState): ResetBlastRadius {
  return {
    attributesTotal: ATTRS.length,
    attributesSet: Object.values(working.build.attributes).filter((value) => value > 0).length,
    purchased: working.loadout.length,
    synergyAssigned: working.synergy.filter(
      (synergySlot) =>
        synergySlot.fuseBadgeId !== null || synergySlot.reactionBadgeId !== null,
    ).length,
    // A5-U (design-spec §17.11's F5.3 amendment) — DERIVED OVER THE SET OF
    // FIELDS THE CHECKBOX ACTUALLY CLEARS, never pinned and never
    // hand-counted. Bonus totals and placements ARE budgets (§17.13/5), so
    // the checkbox clears fourteen more fields than the twelve counted here
    // before this slice, and a confirm that under-reports its own blast
    // radius is the one thing a confirm may not do.
    budgetFieldsSet:
      CATEGORIES.reduce(
        (count, category) =>
          count +
          (working.budgets[category].points > 0 ? 1 : 0) +
          (working.budgets[category].equipSlots > 0 ? 1 : 0),
        0,
      ) + bonusFieldsSet(working.bonus),
    heightChanged: working.build.heightInches !== DEFAULT_HEIGHT_INCHES,
    positionSet: working.build.position !== undefined,
  };
}

/** Removing a badge from the loadout clears any synergy role it held —
 * otherwise the removal strands a `synergyTargetNotPurchased` HardViolation
 * (a state the engine refuses to create) and a later re-purchase silently
 * re-attaches a boost the user believed cleared. */
function clearSynergyReferencesTo(
  synergy: readonly SynergySlot[],
  badgeId: string,
): SynergySlot[] {
  return synergy.map((synergySlot) =>
    synergySlot.fuseBadgeId === badgeId || synergySlot.reactionBadgeId === badgeId
      ? {
          ...synergySlot,
          fuseBadgeId: synergySlot.fuseBadgeId === badgeId ? null : synergySlot.fuseBadgeId,
          reactionBadgeId:
            synergySlot.reactionBadgeId === badgeId ? null : synergySlot.reactionBadgeId,
        }
      : synergySlot,
  );
}

/** File download of the current build — export + the AutosaveWarning escape
 * hatch. A Blob + <a download>, no network, no storage (tech-strategy §9). */
function downloadJsonFile(filename: string, text: string): void {
  if (typeof URL.createObjectURL !== "function") return; // jsdom guard
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // F2.2 F-G: revoking SYNCHRONOUSLY races the browser's own read of the
  // object URL — a lost race yields an empty download with no error surface,
  // and these exports are exactly the escape hatches (AutosaveWarning, the
  // quarantine banner) reached when storage is already failing, i.e. the
  // only copy the user has. A leaked object URL for 60s costs nothing; the
  // race costs the user their build.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

function downloadBuildJson(envelope: SavedBuild): void {
  downloadJsonFile(
    `${envelope.name}-${envelope.dataVersion}.json`,
    serializeSavedBuild(envelope),
  );
}

export default function App() {
  /** Boot read happens ONCE, with the H8 drift report: `droppedEntries`
   * lists loadout entries the deserializer stripped because their badge id
   * left the dataset — disclosed below, never a crash (F1 boot backstop).
   *
   * F2.2 A1: `readAutosaveResult()` (not the old `readAutosaveWithReport()`)
   * so "absent" and "unreadable" are TOLD APART. Collapsing them to `null`
   * is what let an unreadable autosave boot fresh and be overwritten. */
  const [boot] = useState(() => readAutosaveResult());
  /** F2.2 A2 — quarantine the verbatim bytes DURING the boot render, before
   * ANY effect (the mount autosave write included) can run. This is the
   * first line of defence; `persistableRef` below is the second, and the
   * order matters even with the guard in place.
   *
   * A side effect in a state initializer is deliberate and safe here:
   * `quarantineAutosave` never overwrites an existing quarantine, so a
   * StrictMode double render is a no-op the second time. */
  const [quarantineWrite] = useState<PersistResult | null>(() =>
    boot.kind === "unreadable" ? quarantineAutosave(boot.raw) : null,
  );
  /** Is a quarantine standing? Drives the banner; cleared only by an
   * explicit Discard click.
   *
   * Keyed on the KEY'S EXISTENCE, not on this boot's outcome: once the
   * autosave key is gone — "Clear just the unreadable autosave" on the
   * recovery screen does exactly that — the next boot reads "absent", and a
   * boot-outcome-keyed banner would leave preserved bytes sitting in storage
   * with nothing pointing at them. Deliberately NOT how `persistableRef` is
   * seeded: a stale quarantine from last week must not suppress autosave for
   * a healthy build today. */
  const [quarantined, setQuarantined] = useState(
    () => boot.kind === "unreadable" || readAutosaveQuarantine() !== null,
  );
  /** [F4/A2] Boot restore is disclosure route 1 of 3. Computed ONCE, beside
   * the working state it produced. */
  const [bootRestore] = useState(() =>
    boot.kind === "ok" ? fromSaved(boot.value.saved, null) : null,
  );
  /**
   * F2.3 A3 — DID THE BOOT READ LOSE SOMETHING?
   *
   * A successful read is not the same as a faithful one. Four channels turn
   * the stored bytes into a strictly poorer in-memory build, and every one of
   * them is a transformation the user has not agreed to yet:
   *
   *   1. `droppedEntries`        — loadout rows whose badge id left the dataset
   *   2. `clearedSynergyRefs`    — stranded fuse/reaction references, healed
   *   3. ratified magnitudes     — a persisted magnitude overridden at load
   *   4. `droppedUnknownFields`  — top-level fields the fixed-list reassembly
   *                                did not carry across
   *
   * LOSSY, NOT MERELY DIFFERENT [R3]. A schema MIGRATION is a transformation
   * the app intends to persist, and it produces none of these four: the
   * dropped-field measurement runs after migrations, so a field a migration
   * retires is not reported. Nor is this a byte comparison — re-serializing
   * differs from the stored text for reasons as trivial as key order and a
   * fresh `savedAt`, which would make every boot "lossy" and suppress
   * autosave for everyone.
   *
   * On the HEALTHY path all four are empty and every seed below is exactly
   * what it was before this slice.
   */
  const bootWasLossy =
    boot.kind === "ok" &&
    (boot.value.droppedEntries.length > 0 ||
      boot.value.clearedSynergyRefs.length > 0 ||
      boot.value.droppedUnknownFields.length > 0 ||
      (bootRestore?.ratifiedMagnitudeNormalized ?? false));
  /**
   * F2.3 A2 — PRESERVE the original bytes of a lossily-read autosave, during
   * the boot render, before any effect can write the poorer derivative back.
   *
   * Suppressing the write alone (`persistableRef` below) only DELAYS the loss:
   * the user's first edit is the acceptance, and that edit writes the stripped
   * state over the one remaining copy of the dropped rows. This is what makes
   * the row recoverable afterwards — through the recovery screen's raw export,
   * which ships the preserved key.
   *
   * A separate key from the quarantine, for the reasons spelled out at
   * `AUTOSAVE_PRESERVED_KEY`. Same state-initializer idiom and same
   * justification as `quarantineWrite`: it never overwrites, so a StrictMode
   * double render is a no-op the second time.
   */
  const [preserveWrite] = useState<PersistResult | null>(() =>
    boot.kind === "ok" && bootWasLossy ? preserveAutosaveOriginal(boot.raw) : null,
  );
  const [working, setWorkingState] = useState<WorkingState>(
    () => bootRestore?.working ?? freshWorkingState(),
  );
  /** Write-through mirror of `working`: updated SYNCHRONOUSLY by every
   * mutation, so the pagehide/visibilitychange flush can persist the very
   * last edit without waiting on a React render. */
  const workingRef = useRef<WorkingState>(working);
  /** F14 — the right column's scrollport. Under the app shell it is one of the
   * app's TWO scrollers and the only one worth remembering across a reload;
   * below the gate it is not a scrollport at all and the effect below is a
   * no-op. Wiring only: every rule about what may be persisted, where, and how
   * the read must behave lives in ui/shell/scroll-memory.ts. */
  const colRightRef = useRef<HTMLDivElement | null>(null);
  /** Has the user edited the working build this session? Drives the switcher
   * guard and the "— unsaved changes" label. Ref + state pair: the ref is
   * read synchronously inside handlers, the state re-renders the label. */
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  /**
   * F2.2 A3 / F2.3 A3 — "the app holds a state worth persisting YET". FALSE in
   * exactly two situations, and both are the same shape: `working` is a
   * derivative of stored bytes rather than something the user has authored or
   * accepted, so writing it would destroy the original.
   *
   *   (a) F2.2 — boot found an autosave it could not read, so `working` is a
   *       synthetic freshWorkingState() standing in for data we have
   *       QUARANTINED but not lost (F-CORE).
   *   (b) F2.3 — boot READ the autosave but read it LOSSILY (`bootWasLossy`),
   *       so `working` is a strictly poorer derivative of bytes still sitting
   *       in the key. The DriftBanner is the disclosure; the user's first edit
   *       is the acceptance; `preserveAutosaveOriginal` above is the safety
   *       net for after that acceptance.
   *
   * Both are RELATIONAL questions about the boot read, which is the axis the
   * predicate was missing: "is what I am about to write derived from the bytes
   * currently in storage?" — never a local "do I hold something".
   *
   * Deliberately NOT `dirty`, which would be wrong in two independent ways:
   *   (1) `loadBuild` calls `markClean()`, so a freshly LOADED build is
   *       clean — a dirty-keyed guard would stop it ever autosaving and the
   *       next reload would restore the PREVIOUS autosave. A new data-loss
   *       bug traded for the old one.
   *   (2) the pagehide/visibilitychange flush writes regardless of `dirty`.
   *
   * One-way latch: flips to true on a user edit, a named-build load, an
   * import commit, a successful named save, or an explicit Discard — and
   * never flips back. BOTH writers consult it.
   *
   * On the HEALTHY path (boot read succeeded and lost nothing — every boot for
   * every user who has ever used this app) it is `true` from the first render,
   * so the mount write happens exactly as it did before this slice. The guard
   * is a NO-OP except on the defect paths.
   */
  const persistableRef = useRef<boolean>(boot.kind !== "unreadable" && !bootWasLossy);
  /**
   * F2.3 A4 — the exact string this instance last OBSERVED in the autosave key
   * or last WROTE to it. The guarded flush compares against this; a mismatch
   * means a foreign writer (another tab) has moved the key.
   *
   * Seeded from the boot READ, not from the first write, so a tab that boots
   * and never writes still holds an accurate reference.
   */
  const lastObservedAutosaveRef = useRef<string | null>(
    boot.kind === "absent" ? null : boot.raw,
  );
  /**
   * F2.3 R2 — did the last autosave write FAIL (quota, Safari private mode)?
   *
   * The flush has always doubled as the de facto retry for a failed write, and
   * the layer-1 "did this flush have something to add" test would silently
   * drop that retry. A pending failure IS something to add.
   */
  const lastWriteFailedRef = useRef(false);
  /**
   * F2.3 A5 — THE FLUSH OWNS THE WRITE FOR THE COMMIT IT CAUSED.
   *
   * The flush blurs the active element, and that blur commits through
   * `applyEdit` — which is a React state change, so the state-change writer
   * fires for it too. On a true `pagehide` the document is gone before that
   * ever happens; on `visibilitychange → hidden` the tab is very much alive
   * and it happens immediately, UNGUARDED, landing exactly the stale envelope
   * the guarded flush had just declined to write. Layer 3 would then be
   * decorative on the one trigger that leaves a tab running.
   *
   * So the flush records the state it settled, and the state-change writer
   * skips that ONE run. Semantics, not a hack: a flush that WROTE has already
   * persisted this state (the second write was pure duplication), and a flush
   * that was REFUSED decided this state must not land — letting the effect
   * undo that a microtask later would make the decision meaningless.
   *
   * ONE-SHOT, and cleared on use. The suppression covers a single subsequent
   * run for that exact object, so a later `persistEpoch` bump against the same
   * `working` (the Discard re-arm) still writes.
   */
  const flushSettledWorkingRef = useRef<WorkingState | null>(null);
  /** Bumped when the latch flips, so the autosave effect re-runs and writes
   * even when `working` itself did not change (the Discard case). */
  const [persistEpoch, setPersistEpoch] = useState(0);
  /** A FAILED quarantine write is strictly MORE reason to suppress autosave,
   * not less — and the failure surfaces on the existing role="alert" banner
   * rather than silently trading the user's data for a successful fresh
   * write. F2.3 holds a failed PRESERVE write to the identical rule: it is the
   * same event (the original bytes are now unbacked) on the second key. */
  const [autosaveFailed, setAutosaveFailed] = useState(
    () =>
      (quarantineWrite !== null && !quarantineWrite.ok) ||
      (preserveWrite !== null && !preserveWrite.ok),
  );
  const [autosaveDismissed, setAutosaveDismissed] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [namedBuildListing, setNamedBuildListing] = useState(() => listNamedBuilds());
  const namedBuilds: NamedBuildSummary[] = namedBuildListing.summaries;
  /** The two DISPLAY-ONLY overlays (H2). Session state — previews are never
   * persisted as if they were plan state. */
  const [overlay, setOverlay] = useState<OverlayState>(defaultOverlay);
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [importState, setImportState] = useState<ImportDialogState | null>(null);
  /** H8 disclosure: loadout entries stripped at the deserialize boundary
   * because their badge id no longer exists in the current dataset. */
  const [droppedEntries, setDroppedEntries] = useState<readonly LoadoutEntry[]>(
    boot.kind === "ok" ? boot.value.droppedEntries : [],
  );
  /** F2.1 heal disclosure: synergy assignments cleared at the deserialize
   * boundary because they referenced a badge not in the build's loadout (the
   * pre-F2 remove path wrote exactly this state). */
  const [clearedSynergyRefs, setClearedSynergyRefs] = useState<readonly ClearedSynergyRef[]>(
    boot.kind === "ok" ? boot.value.clearedSynergyRefs : [],
  );
  /** [F4/A2] Did the load that produced `working` override a persisted
   * Synergy Slot magnitude with ratified data? Held BESIDE `droppedEntries`
   * and `clearedSynergyRefs`, reset on every disclosure ROUTE transition
   * exactly as those two are. Drives the plain-text note in SynergyPanel. */
  const [ratifiedMagnitudeNormalized, setRatifiedMagnitudeNormalized] = useState(
    () => bootRestore?.ratifiedMagnitudeNormalized ?? false,
  );
  /** [F16.1] The refund-trigger sibling of the flag above, with the identical
   * lifecycle: route-scoped, REPLACED never OR-ed, reset at all three reload
   * routes. Drives the second plain-text note in SynergyPanel. */
  const [refundTriggerNormalized, setRefundTriggerNormalized] = useState(
    () => bootRestore?.refundTriggerNormalized ?? false,
  );
  /** Bumped on every disclosure ROUTE transition (load / import confirm) —
   * keys the DriftBanner so its internal re-check output can never linger
   * stale across a build switch. */
  const [disclosureEpoch, setDisclosureEpoch] = useState(0);
  /** Clamp-on-position-switch disclosure (§3.3 rev 3): persistent, holds
   * until the user next changes height or position. */
  const [clampNotice, setClampNotice] = useState<HeightClampNotice | null>(null);
  /** The §6 build-change live region (role="status"): position clamps and
   * attribute commits that CHANGED the stale-purchase count — never one
   * announcement per drag frame or per keyboard step. */
  const [buildAnnouncement, setBuildAnnouncement] = useState("");
  /** F5.3/C — the `Reset build` confirm. The button never resets directly. */
  const [resetOpen, setResetOpen] = useState(false);
  /** A5-U — the bonus mode's open state, and it is the ONLY state this
   * feature adds. There is no draft buffer anywhere: every keystroke inside
   * the dialog commits through `applyEdit` exactly as the twelve base fields
   * do (design-spec §17.3, §4.2). */
  const [bonusOpen, setBonusOpen] = useState(false);
  /** R12 — the budgets editor's open state, the SEVENTH dialog. At L the
   * twelve base fields live behind the rail's `Edit budgets…` control;
   * below L they stay inside BuildPanel and this state is never reachable. */
  const [budgetsOpen, setBudgetsOpen] = useState(false);

  /* ------------------------------------------------------------- F8-R2 --
   * THE ROLL'S SESSION STATE. Every field here is deliberately NOT persisted:
   * persisting a pin, an exclusion or a seed would be a SavedBuild shape
   * change -> a schemaVersion migration -> the reader-inventory ceremony ->
   * a collision with the deferred sourceId envelope. Nothing in this block
   * reaches src/persist/, toEnvelope() or SAVED_BUILD_SCHEMA_VERSION.
   */
  /** badgeId -> PinMode. Presence in this record IS the pin. */
  const [pins, setPins] = useState<Readonly<Record<string, PinMode>>>({});
  const [excludedBadgeIds, setExcludedBadgeIds] = useState<readonly string[]>([]);
  const [seed, setSeed] = useState(() => newSeed());
  /** The last APPLIED roll and the exact request that produced it. The request
   *  is what Restore re-runs -- one step, scope-local, exact only under the
   *  stated preconditions, and NEVER an undo stack. */
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [lastRollRequest, setLastRollRequest] = useState<RollRequest | null>(null);
  /** Bumped on every applied roll. Drives the report's focus move, and starting
   *  at 0 is what stops boot from stealing focus. */
  const [rollEpoch, setRollEpoch] = useState(0);
  /** null = closed. category null = every category in scope. */
  const [rerollScope, setRerollScope] = useState<{ category: Category | null } | null>(null);

  /** F5.4 (design-spec §16.10) — THE ONE OWNER of the L breakpoint. It used
   * to live inside BuildPanel; the pane, the two-grid-item layout and the
   * panel's shape all key off the same answer, so it is asked once here and
   * passed down.
   *
   * R12 (the workbench re-cut; user ruling 2026-08-26) — L IS NOW COMPOUND:
   * width AND height, matching the stylesheet's workbench gate verbatim.
   * The workbench is a fixed-height shell whose three columns own their
   * scrollports; where the viewport is too short for the shell (≥1280 wide
   * but <768 tall — a 1366×768 laptop with browser chrome), the DOM must
   * fall back to the M document flow WITH the CSS, or the two disagree
   * about where the panels live. One owner, one compound answer.
   *
   * KEEP THE QUERY STRINGS AND KEEP THE NEGATIONS IN THIS DIRECTION.
   * `useMediaQuery` returns false where matchMedia is absent (jsdom), so
   * both negated terms yield true and isLarge = true — every component test
   * keeps rendering the desktop shape it renders today. The tidier-looking
   * min-width/min-height forms invert that default to MOBILE and silently
   * flip a large, hard-to-attribute set of tests.
   *
   * TWO STATEMENTS, NEVER ONE `&&` EXPRESSION OVER TWO HOOK CALLS. `&&`
   * short-circuits, so a narrow viewport would skip the second useMediaQuery
   * and the hook count would change the moment the width crossed 1280 —
   * "calling Hooks conditionally", caught live by the F1 boot backstop the
   * first time this was written the tidy way.
   * tests/layout-arithmetic.test.ts asserts this source text. */
  const belowLWidth = useMediaQuery("(max-width: 1279px)");
  const belowLHeight = useMediaQuery("(max-height: 767px)");
  const isLarge = !belowLWidth && !belowLHeight;

  /** F13 (user ruling, 2026-08-25) — THE ONE OWNER of the M breakpoint, and
   * the whole of the phone carve-out.
   *
   * The physique strip is worth its height where it lays out as ONE
   * horizontal row and where the setup panel is not the surface the user
   * lives in. Below 768 neither holds. Measured on this tree: the strip's
   * three max-content tracks cannot fit a 358px content box, so at 390 it
   * STACKS into 199.56px of permanent chrome — the same vertical block the
   * ask was about, minus the ability to collapse it. That is a −122.19px
   * gain the user sees ONCE at first load, against +199.56px of lead on
   * every visit after the auto-collapse latch has fired, on the device this
   * app is used on (planning with a phone beside the console).
   *
   * So below 768 Physique goes back into the setup panel, as the <Section>
   * it was pre-F13, with the same latch and the same collapse. NOT a third
   * arrangement: the pre-F13 behaviour, restored.
   *
   * SAME NEGATION DIRECTION AND SAME REASON AS isLarge ABOVE. jsdom has no
   * matchMedia, so `!useMediaQuery("(max-width: 767px)")` yields isWide =
   * true and every component test keeps rendering the desktop shape — the
   * strip. `useMediaQuery("(min-width: 768px)")` would flip the whole suite
   * to the phone shape silently. tests/layout-arithmetic.test.ts asserts
   * this source text. */
  const isWide = !useMediaQuery("(max-width: 767px)");

  /** R12 slice 3 — THE PHONE, as the complement of `isWide` and never as a
   * fourth query. `isWide` already owns the 768 seam (F13's ruling), so the
   * tab shell keys off its negation rather than asking matchMedia a third
   * time: two owners for one breakpoint is how a layout comes to disagree
   * with itself. jsdom yields isWide = true, so isPhone is false and every
   * component test keeps rendering the desktop shape. */
  const isPhone = !isWide;

  /** Which station the phone is showing. Session state, never persisted: a
   * tab is a viewport position, not plan data, and persisting it would put a
   * layout preference inside the reader-inventory ceremony for no gain.
   * Defaults to the catalog — the surface the app exists for, and the one a
   * returning user most often wants. */
  const [mobileTab, setMobileTab] = useState<MobileTabId>("badges");

  /** EVERY working-state mutation flows through here (write-through ref). */
  const applyWorking = useCallback(
    (update: WorkingState | ((prev: WorkingState) => WorkingState)) => {
      const next = typeof update === "function" ? update(workingRef.current) : update;
      workingRef.current = next;
      setWorkingState(next);
    },
    [],
  );

  /** F2.2 A3 — flip the persistable latch to true, once, permanently. The
   * epoch bump makes the autosave effect re-run even when `working` is
   * unchanged (Discard), so re-arming always produces a write. */
  const armPersistence = useCallback(() => {
    if (persistableRef.current) return;
    persistableRef.current = true;
    setPersistEpoch((epoch) => epoch + 1);
  }, []);

  /** A user EDIT (as opposed to a load/import/save): marks the state dirty.
   * An updater returning `prev` unchanged is a no-op and marks nothing. */
  const applyEdit = useCallback(
    (update: (prev: WorkingState) => WorkingState) => {
      const prev = workingRef.current;
      const next = update(prev);
      if (next === prev) return;
      workingRef.current = next;
      setWorkingState(next);
      dirtyRef.current = true;
      setDirty(true);
      // An edit is a state worth persisting, even if boot could not read the
      // old autosave. The quarantine stays — an edit is not a discard.
      armPersistence();
    },
    [armPersistence],
  );

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    setDirty(false);
  }, []);

  // ---- autosave: every change writes; a throwing setItem surfaces the
  // role="alert" banner and never crashes (tech-strategy §9). A SUCCESSFUL
  // write re-arms the dismissed banner: dismissal is per failure epoch,
  // never per session. ----
  useEffect(() => {
    // F2.2 F-CORE / F2.3, writer 1 of 2. See `persistableRef`: false only when
    // boot found an autosave it could not read, or read lossily — in both
    // cases `working` is a derivative and writing it would destroy the
    // original.
    if (!persistableRef.current) return;
    // F2.3 A5: the flush already made a write decision about exactly this
    // state. Honour it — see `flushSettledWorkingRef`. One-shot.
    if (flushSettledWorkingRef.current === working) {
      flushSettledWorkingRef.current = null;
      return;
    }
    // UNGUARDED, deliberately. This writer runs behind a change the user made
    // in THIS tab, and last-write-wins on an intentional edit is the bargain
    // tech-strategy.md §9 documents. Refusing it on a concurrency mismatch
    // would silently stop autosaving for someone who is actively working —
    // R5's failure run in reverse. The guarded form is the FLUSH's, below,
    // where there is no intent at all.
    const outcome = writeAutosaveTracked(toEnvelope(working));
    const wrote = outcome.kind === "written";
    // Keep the concurrency reference exact: the bytes that actually reached
    // storage, never a re-derivation (a second toEnvelope has a fresh savedAt
    // and would leave this permanently wrong).
    if (outcome.kind === "written") lastObservedAutosaveRef.current = outcome.raw;
    lastWriteFailedRef.current = !wrote;
    setAutosaveFailed(!wrote);
    if (wrote) setAutosaveDismissed(false);
  }, [working, persistEpoch]);

  // ---- tail-edit flush: committing happens on field blur, so a reload or
  // tab-hide mid-edit would lose the pending value. Blurring the active
  // element runs the field's commit synchronously (through applyWorking's
  // write-through ref), then the autosave writes synchronously too. ----
  useEffect(() => {
    const flush = () => {
      // F2.3 LAYER 1 — "did this flush have something to add?"
      //
      // The flush exists for exactly one thing: a field edit that has not
      // committed yet because the field has not blurred. Capture the working
      // state BEFORE the blur; if the blur produced no commit, this flush has
      // nothing to contribute and must not write. Pre-fix it serialized a
      // long-lived in-memory copy and setItem'd over the key unconditionally,
      // so a tab opened an hour ago reverted a newer tab's work merely by
      // being closed — no edit, no intent.
      //
      // THIS IS NOT A `dirty` FLAG, and the distinction is the whole reason
      // F2.2's guard could not be reused here: `loadBuild` calls `markClean()`,
      // so a dirty-keyed test is false for a freshly loaded build that very
      // much needs writing. This asks only whether THIS FLUSH changed anything.
      //
      // ⚠ IT ASSUMES EVERY FIELD COMMITS SYNCHRONOUSLY INSIDE ITS BLUR
      // HANDLER. True today of both commit-on-blur components (NumberField
      // clamps and calls onCommit in onBlur; AttributeSlider's keyboard
      // debounce is flushed synchronously by flushPending). A field that
      // committed in a microtask would make this comparison a FALSE NEGATIVE
      // and silently lose the tail edit — a brand-new instance of exactly the
      // class this fixes. tests/ui/flush-blur-synchrony.test.tsx pins the
      // property PER COMPONENT and freezes the census of which components
      // have a commit-on-blur at all.
      const before = workingRef.current;
      const active = document.activeElement;
      if (active instanceof HTMLElement && typeof active.blur === "function") {
        active.blur();
      }
      // F2.2 F-CORE, writer 2 of 2 — THE SAME predicate, read from the ref.
      // This writer fired UNCONDITIONALLY pre-fix, so gating only the
      // useEffect above would have returned the whole bug the moment the tab
      // was closed or backgrounded. The blur runs FIRST: committing a
      // pending field edit is itself an edit, and it arms the latch.
      if (!persistableRef.current) return;
      const after = workingRef.current;
      // Every commit path returns `prev` unchanged on a no-op, so reference
      // identity IS "the blur committed nothing". R2: a pending write FAILURE
      // is also something to add — the flush has always been the de facto
      // retry for a throwing setItem, and dropping that would trade one data
      // loss for another.
      if (after === before && !lastWriteFailedRef.current) return;
      // F2.3 LAYER 3 — optimistic concurrency, on this writer only. A stale
      // tab CAN legitimately reach here holding a genuine mid-edit field; if
      // storage has moved since this instance last saw it, a foreign writer
      // owns those bytes. Preserve them by writing nothing. No adoption, no
      // storage listener, no silent replacement of in-memory state (R5).
      const outcome = writeAutosaveIfUnmoved(
        toEnvelope(after),
        lastObservedAutosaveRef.current,
      );
      // F2.3 A5 — claim this state, whatever the outcome was. A write makes
      // the state-change writer's copy redundant; a refusal makes it a
      // silent undo of the refusal.
      flushSettledWorkingRef.current = after;
      if (outcome.kind === "written") {
        lastObservedAutosaveRef.current = outcome.raw;
        lastWriteFailedRef.current = false;
      } else if (outcome.kind === "failed") {
        lastWriteFailedRef.current = true;
      }
      // "refused" is neither success nor failure: nothing was written and
      // nothing was lost that this tab did not already hold in memory. No
      // setState here — the page may be unloading, and this writer has never
      // rendered anything.
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // ---- derived, all engine-side ----
  //
  // [A5] THE COMPOSITION POINT, AND THE ONE PLACE THE TWO RECORDS DIVERGE.
  //
  //   baseBudgets → BuildPanel → BudgetGrid — the ENTRY surface, and the only
  //                 record `onBudgetCommit` may ever write back into.
  //   budgets     → ledgerState, the category rail, SummaryPanel, feasibility,
  //                 the roll — everything that READS a capacity or a pool.
  //
  // ⚠ THE RUNAWAY-INFLATION HAZARD. `onBudgetCommit` writes the field's value
  // straight into `prev.budgets`, the BASE. Pre-A5 these two records were the
  // same object, so passing the derived one to the grid was a no-op. THEY ARE
  // NOT THE SAME POST-A5: hand `budgets` to the grid and a user with base 3 +
  // bonus 1 sees 4, the next blur commits 4 as the base, the next render shows
  // 5, then 6 — a silent runaway on the number the entire plan rests on, in
  // the one surface that has no cross-check. Test 6.6 pins it.
  const baseBudgets = deriveBudget(working.build, working.budgets, working.config.budgetStrategy);
  const budgets = effectiveBudgets(baseBudgets, working.bonus);

  const synergyState: SynergyState = useMemo(
    () => ({ loadout: working.loadout, synergySlots: working.synergy }),
    [working.loadout, working.synergy],
  );

  const ledgerState: SynergyLedgerState = useMemo(
    () => ({
      loadout: working.loadout,
      budgets,
      synergySlots: working.synergy,
      refundTrigger: working.config.refundTrigger,
      // [A5] The rules layer's only route to the bonus layer: validateLoadout's
      // two Σ ≤ earned SoftViolations and buildSummary's base-Σ recovery. The
      // ledger math never sees it.
      bonus: working.bonus,
    }),
    [working.loadout, budgets, working.synergy, working.config.refundTrigger, working.bonus],
  );

  const badgesByCategory = useMemo(() => {
    const groups = new Map<Category, Badge[]>(CATEGORIES.map((category) => [category, []]));
    for (const badge of shippedDataset.badges) {
      groups.get(badge.category)?.push(badge);
    }
    return groups;
  }, []);

  // ---- purchase actions (selection logic only — gating comes from the
  // engine's levelPasses / validateBadge) ----
  const setLevel = useCallback(
    (badgeId: string, level: PurchasableLevel | null) => {
      applyEdit((prev) => {
        const rest = prev.loadout.filter((entry) => entry.badgeId !== badgeId);
        if (level === null) {
          // Removal also clears any synergy role the badge held — never
          // strand a synergyTargetNotPurchased HardViolation.
          return {
            ...prev,
            loadout: rest,
            synergy: clearSynergyReferencesTo(prev.synergy, badgeId),
          };
        }
        return { ...prev, loadout: [...rest, { badgeId, purchasedLevel: level }] };
      });
    },
    [applyEdit],
  );

  const cycleBadge = useCallback(
    (badgeId: string) => {
      applyEdit((prev) => {
        const badge = shippedDataset.badges.find((candidate) => candidate.id === badgeId);
        if (badge === undefined) return prev;
        const eligibility = validateBadge(badge, prev.build);
        if (!eligibility.allowed) return prev;
        const purchasable = PURCHASABLE_LEVELS.filter((level) =>
          levelPasses(badge.requirements, prev.build, level),
        );
        if (purchasable.length === 0) return prev;
        const current =
          prev.loadout.find((entry) => entry.badgeId === badgeId)?.purchasedLevel ?? null;
        // A STALE purchase (purchased level no longer passes) is never in the
        // cycle sequence — a card-body tap must not remove it. Destructive
        // transitions on stale purchases require the pip control (Escape).
        if (current !== null && !purchasable.includes(current)) return prev;
        const sequence: (PurchasableLevel | null)[] = [null, ...purchasable];
        const nextIndex = (sequence.indexOf(current) + 1) % sequence.length;
        const next = sequence[nextIndex] ?? null;
        const rest = prev.loadout.filter((entry) => entry.badgeId !== badgeId);
        if (next === null) {
          return {
            ...prev,
            loadout: rest,
            synergy: clearSynergyReferencesTo(prev.synergy, badgeId),
          };
        }
        return { ...prev, loadout: [...rest, { badgeId, purchasedLevel: next }] };
      });
    },
    [applyEdit],
  );

  // ---- synergy (M4): all invariant checks live in the engine ----
  const setSynergySlots = useCallback(
    (synergySlots: SynergySlot[]) => {
      applyEdit((prev) => ({ ...prev, synergy: synergySlots }));
    },
    [applyEdit],
  );

  // ---- physique (F3): position bounds the height range. The ENGINE owns
  // the rule (positionHeightRange / validateBuild); this handler clamps at
  // the point of change and DISCLOSES — visible persistent notice + the §6
  // build-change announcement. Nearest bound, never a reset; the switch
  // always succeeds (non-blocking). ----
  const handlePositionChange = useCallback(
    (position: Position | undefined) => {
      const prev = workingRef.current;
      if (prev.build.position === position) return;
      const range = positionHeightRange(position);
      const clampedHeight = Math.min(
        range.maxInches,
        Math.max(range.minInches, prev.build.heightInches),
      );
      const clamped = clampedHeight !== prev.build.heightInches;
      const nextBuild: Build = { ...prev.build, position, heightInches: clampedHeight };
      applyEdit((current) => ({ ...current, build: nextBuild }));
      if (!clamped) {
        // The notice holds only until the next height or position change.
        setClampNotice(null);
        return;
      }
      const staleBefore = stalePurchaseCount(prev.loadout, prev.build);
      const staleAfter = stalePurchaseCount(prev.loadout, nextBuild);
      const staleChanged = staleAfter !== staleBefore;
      setClampNotice({
        fromInches: prev.build.heightInches,
        toInches: clampedHeight,
        staleCount: staleChanged && staleAfter > 0 ? staleAfter : null,
      });
      setBuildAnnouncement(
        `Position set to ${position ?? "Any"}. Height adjusted to ` +
          `${formatHeightInches(clampedHeight)}.` +
          (staleChanged && staleAfter > 0 ? ` ${staleSentence(staleAfter)}` : ""),
      );
    },
    [applyEdit],
  );

  /** F13 — HOISTED out of the BuildPanel call site, byte-for-byte the same
   * body. Physique now renders in the PhysiqueStrip above `.layout`, so the
   * handler can no longer be an inline closure inside the setup panel's JSX.
   * Fields commit on EVERY blur — a no-change commit is a no-op (returning
   * prev), so tabbing through never marks dirty. */
  const handleHeightCommit = useCallback(
    (heightInches: number) => {
      const changed = workingRef.current.build.heightInches !== heightInches;
      applyEdit((prev) =>
        prev.build.heightInches === heightInches
          ? prev
          : { ...prev, build: { ...prev.build, heightInches } },
      );
      // A height change ends the clamp notice's hold (§3.3 rev 3).
      if (changed) setClampNotice(null);
    },
    [applyEdit],
  );

  const handleAttributeCommit = useCallback(
    (attr: Attr, value: number) => {
      const prev = workingRef.current;
      if (prev.build.attributes[attr] === value) return;
      const nextBuild: Build = {
        ...prev.build,
        attributes: { ...prev.build.attributes, [attr]: value },
      };
      applyEdit((current) => ({ ...current, build: nextBuild }));
      // §6: attribute commits announce ONLY when they change the
      // stale-purchase count — stepping 40 → 50 stays silent.
      const staleBefore = stalePurchaseCount(prev.loadout, prev.build);
      const staleAfter = stalePurchaseCount(prev.loadout, nextBuild);
      if (staleAfter !== staleBefore) {
        setBuildAnnouncement(
          `${ATTR_LABELS[attr]} set to ${value}. ` +
            (staleAfter > 0 ? staleSentence(staleAfter) : "All purchased badges qualify."),
        );
      }
    },
    [applyEdit],
  );

  /** R12 — the ONE base-budget commit, shared by BuildPanel's grid (M/S) and
   * BudgetsDialog's grid (L). Two inline copies of this closure is how the
   * two surfaces would come to commit differently; the A5 base-record rule
   * (write the BASE, never the composed record — test 6.6) lives here once. */
  const handleBudgetCommit = useCallback(
    (category: Category, field: keyof Budget, value: number) => {
      applyEdit((prev) =>
        prev.budgets[category][field] === value
          ? prev
          : {
              ...prev,
              budgets: {
                ...prev.budgets,
                [category]: { ...prev.budgets[category], [field]: value },
              },
            },
      );
    },
    [applyEdit],
  );

  // ---- named builds ----
  const refreshNamedBuilds = useCallback(() => {
    setNamedBuildListing(listNamedBuilds());
  }, []);

  /** Names already in use (for the collision auto-suffix). */
  const takenNames = useCallback(
    (excludeId?: string) =>
      new Set(namedBuilds.filter((build) => build.id !== excludeId).map((build) => build.name)),
    [namedBuilds],
  );

  const loadBuild = useCallback(
    (id: string) => {
      const report = readNamedBuildWithReport(id);
      if (report === null) return;
      // Switcher guard: replacing a dirty working build — or a boot-restored
      // autosave that never got a sourceId — destroys the only copy (the
      // autosave is overwritten on the next commit). Confirm first; the
      // passive default stays the user's work.
      const current = workingRef.current;
      const guarded =
        dirtyRef.current || (current.sourceId === null && workingHasContent(current));
      if (guarded) {
        const proceed = window.confirm(
          `Replace the working build "${current.name}" with "${report.saved.name}"? ` +
            "Unsaved changes will be lost.",
        );
        if (!proceed) return;
      }
      const restored = fromSaved(report.saved, id);
      applyWorking(restored.working);
      markClean();
      // F2.2 A3: a LOADED build is a state worth persisting even though
      // markClean() just made it non-dirty — the exact trap a dirty-keyed
      // guard falls into.
      armPersistence();
      // The load is its own disclosure ROUTE (same as boot and import):
      // REPLACE any stale prior-route report with this build's own — empty
      // for a clean build, so a leftover banner can never describe a build
      // it does not belong to.
      setDroppedEntries(report.droppedEntries);
      setClearedSynergyRefs(report.clearedSynergyRefs);
      // [F4/A2] Disclosure route 2 of 3. REPLACED, never OR-ed, exactly like
      // the two reports above — a leftover flag must never describe a build
      // it does not belong to.
      setRatifiedMagnitudeNormalized(restored.ratifiedMagnitudeNormalized);
      setRefundTriggerNormalized(restored.refundTriggerNormalized);
      setDisclosureEpoch((epoch) => epoch + 1);
      // The clamp notice belongs to an edit gesture, not to the new build.
      setClampNotice(null);
      setManagerOpen(false);
    },
    [applyWorking, armPersistence, markClean],
  );

  const saveAsNew = useCallback(
    (name: string) => {
      const id = newBuildId();
      const finalName = uniqueBuildName(name, takenNames());
      const result = saveNamedBuild(id, toEnvelope({ ...workingRef.current, name: finalName }));
      if (result.ok) {
        applyWorking((prev) => ({ ...prev, name: finalName, sourceId: id }));
        markClean();
        armPersistence();
      } else {
        setAutosaveFailed(true);
      }
      refreshNamedBuilds();
    },
    [applyWorking, armPersistence, markClean, refreshNamedBuilds, takenNames],
  );

  /**
   * F5.3/C — the reset itself.
   *
   * WRITES THE BUILD WHOLESALE THROUGH `applyEdit`, and deliberately NOT
   * through `handlePositionChange`: that path would emit a clamp announcement
   * for a clamp that did not happen. Position → Any restores the dataset's
   * full 69–88 range and height 78 sits inside it, so nothing clamps.
   *
   * WHAT IS CLEARED — the PLAYER: the 20 attributes, height, position, the
   * loadout, and the Synergy Slot ASSIGNMENTS.
   *
   * WHAT SURVIVES — the PLAN CONTAINER: Badge Tokens, Badge Slots, Synergy
   * Slot `unlocked` flags, the +2 designation, the build name, `sourceId`,
   * `dataVersion` and `config`. The unlocks and the +2 designation are
   * account-progression facts, not properties of an attribute spread — eight
   * toggles the user would have to re-enter for no reason. Keeping `sourceId`
   * means the switcher honestly reads "— unsaved changes" rather than
   * silently detaching.
   *
   * SYNERGY ASSIGNMENTS ARE FORCED, not chosen: they reference badges that
   * will no longer be in the loadout, which is `synergyTargetNotPurchased` —
   * a HardViolation the engine refuses to create. Every other removal path
   * already clears them via `clearSynergyReferencesTo`; reset cannot be the
   * one path that strands them. `.map()` and NOT `createDefaultSynergySlots()`,
   * which would also reset `unlocked` and the +2 designation.
   *
   * The reset touches NO named build, NO quarantine and NO UI preference. It
   * calls none of saveNamedBuild / deleteNamedBuild / renameNamedBuild /
   * duplicateNamedBuild / clearAllPersistedData / clearAutosave, and no
   * `writeUiSectionOpen` — so the six category collapse states AND the Build
   * panel's auto-collapse latch both survive it.
   *
   * `applyEdit` marks the build dirty and arms persistence, so the autosave
   * writes and the switcher tells the truth. H8 is satisfied loudly: a counted
   * confirm, a live-region announcement, and a durable save path.
   */
  const handleReset = useCallback(
    (alsoBudgets: boolean) => {
      const before = resetBlastRadius(workingRef.current);
      applyEdit((current) => ({
        ...current,
        // Constructed exactly as freshWorkingState() does, `position` omitted
        // rather than set to undefined, so the post-reset envelope is
        // byte-identical to the boot zero state.
        build: { heightInches: DEFAULT_HEIGHT_INCHES, attributes: zeroAttributes() },
        loadout: [],
        synergy: current.synergy.map((synergySlot) => ({
          ...synergySlot,
          fuseBadgeId: null,
          reactionBadgeId: null,
        })),
        // A5-U — bonus rides WITH the budgets checkbox and NEVER with the
        // player reset (design-spec §17.13/5). The two are one quantity from
        // the user's side; clearing the base six and leaving fourteen bonus
        // fields behind would be the confirm telling a half-truth.
        ...(alsoBudgets ? { budgets: zeroBudgets(), bonus: zeroBonus() } : {}),
      }));
      // A reset is not a load ROUTE: droppedEntries, clearedSynergyRefs and
      // ratifiedMagnitudeNormalized are route-scoped disclosures and are
      // deliberately left alone. The clamp notice belongs to an edit gesture,
      // and this ends it — same discipline as loadBuild and confirmImport.
      setClampNotice(null);
      // §6 live region 2, the EXISTING role="status" region. No fourth one.
      setBuildAnnouncement(
        `Build reset. ${before.attributesTotal} attributes cleared, ` +
          `${before.purchased} purchased ${before.purchased === 1 ? "badge" : "badges"} removed, ` +
          `${before.synergyAssigned} Synergy Slot ` +
          `${before.synergyAssigned === 1 ? "assignment" : "assignments"} cleared. ` +
          `Height ${formatHeightInches(DEFAULT_HEIGHT_INCHES)}, Position Any.` +
          (alsoBudgets ? " Badge Tokens and Badge Slots cleared." : ""),
      );
      setResetOpen(false);
    },
    [applyEdit],
  );

  /**
   * F5.3/C — the durable alternative to the undo that is ruled out.
   *
   * This is the ONLY route by which the reset flow reaches the named-builds
   * store, and it reaches it to WRITE A NEW ENTRY, never to remove one.
   * `saveAsNew` mints a fresh id and a unique name, so nothing is overwritten.
   */
  const handleSaveCopyAndReset = useCallback(
    (alsoBudgets: boolean) => {
      saveAsNew(workingRef.current.name);
      handleReset(alsoBudgets);
    },
    [handleReset, saveAsNew],
  );

  const duplicateBuild = useCallback(
    (id: string) => {
      // F2.2 F-D: the copy is made from the source's RAW STORED BYTES, so it
      // is byte-faithful apart from name + savedAt. Reading through the
      // deserializer here produced a silently healed/stripped copy — with a
      // raw copy there is no difference left to disclose. The name comes
      // from the switcher summary, which is React state, not another read.
      const source = namedBuilds.find((build) => build.id === id);
      if (source === undefined) return;
      const result = duplicateNamedBuild(
        id,
        newBuildId(),
        uniqueBuildName(`${source.name} copy`, takenNames()),
        new Date().toISOString(),
      );
      if (!result.ok) setAutosaveFailed(true);
      refreshNamedBuilds();
    },
    [namedBuilds, refreshNamedBuilds, takenNames],
  );

  const removeBuild = useCallback(
    (id: string) => {
      // PersistResult surfaced (every-write-surfaced mandate): a failed
      // delete keeps the entry and raises the banner instead of lying.
      const result = deleteNamedBuild(id);
      if (!result.ok) {
        setAutosaveFailed(true);
      } else if (workingRef.current.sourceId === id) {
        applyWorking((prev) => ({ ...prev, sourceId: null }));
      }
      refreshNamedBuilds();
    },
    [applyWorking, refreshNamedBuilds],
  );

  const renameBuild = useCallback(
    (id: string, name: string) => {
      const finalName = uniqueBuildName(name, takenNames(id));
      const result = renameNamedBuild(id, finalName);
      if (!result.ok) {
        // No optimistic header rename over a failed write.
        setAutosaveFailed(true);
      } else if (workingRef.current.sourceId === id) {
        applyWorking((prev) => ({ ...prev, name: finalName }));
      }
      refreshNamedBuilds();
    },
    [applyWorking, refreshNamedBuilds, takenNames],
  );

  const exportNow = useCallback(() => {
    downloadBuildJson(toEnvelope(workingRef.current));
  }, []);

  /** F2.2 slice B — the quarantine banner's FIRST action, deliberately ahead
   * of Discard. Reuses F1's `exportRawPersistedData` (which now carries the
   * quarantine key); this is only the download plumbing, not a second
   * exporter. */
  const exportRawNow = useCallback(() => {
    downloadJsonFile("badge-builder-2k27-raw-saved-data.json", exportRawPersistedData());
  }, []);

  /** The ONLY deleting path in this slice, and an explicit informed click:
   * drop the preserved bytes, hide the banner, and re-arm autosave. */
  const discardQuarantine = useCallback(() => {
    clearAutosaveQuarantine();
    setQuarantined(false);
    armPersistence();
  }, [armPersistence]);

  /* F14 — restore the right column's scroll offset, then keep it current.
   *
   * useLayoutEffect, and the choice is load-bearing: F5.3's per-category
   * collapse state and Section's open state are read from storage during
   * render, and every one of those components' own layout effects has already
   * run by the time a PARENT's layout effect fires in the same commit. Restore
   * any earlier and the column's scrollHeight is the wrong one and the offset
   * lands in the wrong place. Restore in a passive effect instead and the user
   * watches the grid jump after paint.
   *
   * Empty deps: the element identity never changes for the life of the app,
   * and re-running on every render would re-restore over the user's scrolling.
   *
   * There is no `isLarge` guard here on purpose (§4.2 rule 4's spirit): below
   * the shell's gate `.col-right` is not a scrollport, so `scroll` never fires
   * and the restore clamps to zero. A JS mirror of a CSS breakpoint is a
   * desync waiting to happen — assertion 12 exists because of the last one. */
  useLayoutEffect(() => {
    const element = colRightRef.current;
    if (element === null) return undefined;
    return mountColRightScrollMemory(element);
  }, []);

  // ---- import (M4): file → engine deserializer → confirm dialog. The
  // deserializer's H8 drift report rides along so the disclosure banner can
  // name what was stripped. ----
  const importFile = useCallback((file: File) => {
    void file.text().then(
      (text) => {
        try {
          const report = deserializeSavedBuildWithReport(text);
          setImportState({
            kind: "confirm",
            saved: report.saved,
            droppedEntries: report.droppedEntries,
            clearedSynergyRefs: report.clearedSynergyRefs,
          });
        } catch (error) {
          setImportState({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
      () => {
        setImportState({ kind: "error", message: "The file could not be read." });
      },
    );
  }, []);

  const confirmImport = useCallback(
    (saved: SavedBuild) => {
      // F2.2 F-E: an import replaces the working state exactly as loadBuild
      // does, and loadBuild guards it — so this uses loadBuild's PREDICATE
      // VERBATIM. Two divergent guards on the same transition is how one of
      // them rots.
      const current = workingRef.current;
      const guarded =
        dirtyRef.current || (current.sourceId === null && workingHasContent(current));
      if (guarded) {
        const proceed = window.confirm(
          `Replace the working build "${current.name}" with the imported "${saved.name}"? ` +
            "Unsaved changes will be lost.",
        );
        if (!proceed) return;
      }
      const imported = fromSaved(saved, null);
      applyWorking(imported.working);
      // [F4/A2] Disclosure route 3 of 3.
      setRatifiedMagnitudeNormalized(imported.ratifiedMagnitudeNormalized);
      setRefundTriggerNormalized(imported.refundTriggerNormalized);
      armPersistence();
      // An import is unsaved-as-named work: guard it like any other edit.
      dirtyRef.current = true;
      setDirty(true);
      setDroppedEntries(
        importState?.kind === "confirm" ? importState.droppedEntries : [],
      );
      setClearedSynergyRefs(
        importState?.kind === "confirm" ? importState.clearedSynergyRefs : [],
      );
      setDisclosureEpoch((epoch) => epoch + 1);
      setClampNotice(null);
      setImportState(null);
    },
    [applyWorking, armPersistence, importState],
  );

  // ---- render-time readouts ----
  // PRIMARY ledger: ALWAYS the "current" basis (H2). Never overlay-derived.
  const readouts = Object.fromEntries(
    CATEGORIES.map((category) => [category, categoryLedgerAt(ledgerState, "current", category)]),
  ) as Record<Category, CategoryLedgerReadout>;

  // Season-reset PROJECTIONS: a separate postSeasonReset readout set, only
  // while the preview is on — rendered as the labelled second row, never in
  // place of the primary (H2(c)).
  const projections = overlay.seasonReset
    ? (Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          categoryLedgerAt(ledgerState, "postSeasonReset", category),
        ]),
      ) as Record<Category, CategoryLedgerReadout>)
    : null;
  const projectedCategoryCount =
    projections === null
      ? 0
      : CATEGORIES.filter((category) => projectionDiffers(readouts[category], projections[category]))
          .length;

  const eligibilityById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateBadge>>();
    for (const badge of shippedDataset.badges) {
      map.set(badge.id, validateBadge(badge, working.build));
    }
    return map;
  }, [working.build]);

  // ---- filters (M4): predicates over ENGINE outputs only ----
  const badgeVisible = (badge: Badge): boolean => {
    if (filters.tiers.length > 0 && !filters.tiers.includes(badge.tier)) return false;
    if (!filters.categories.includes(badge.category)) return false;
    // F8-S2: the roster's companion facet. The bar holds zero arithmetic;
    // the predicate is the loadout membership test, here.
    if (
      filters.purchasedOnly &&
      !working.loadout.some((entry) => entry.badgeId === badge.id)
    ) {
      return false;
    }
    const eligibility = eligibilityById.get(badge.id);
    if (eligibility === undefined) return false;
    if (filters.legalOnly && (!eligibility.allowed || eligibility.maxPurchasableLevel === null)) {
      return false;
    }
    if (filters.affordableAtLeast !== null) {
      // Pinned semantics (design-spec §3.4): show iff there exists a level
      // L ≥ X with L ≤ maxPurchasableLevel and whatIf ≤ remainingPoints.
      const max = eligibility.maxPurchasableLevel;
      if (!eligibility.allowed || max === null) return false;
      const floor = levelIndex(filters.affordableAtLeast);
      const remaining = readouts[badge.category].remainingPoints;
      const fits = PURCHASABLE_LEVELS.some(
        (level) =>
          levelIndex(level) >= floor &&
          levelIndex(level) <= levelIndex(max) &&
          whatIf(working.loadout, badge.id, level, shippedDataset) <= remaining,
      );
      if (!fits) return false;
    }
    return true;
  };

  const visibleByCategory = new Map<Category, Badge[]>(
    CATEGORIES.map((category) => [
      category,
      (badgesByCategory.get(category) ?? []).filter(badgeVisible),
    ]),
  );
  const shownCount = CATEGORIES.reduce(
    (sum, category) => sum + (visibleByCategory.get(category)?.length ?? 0),
    0,
  );

  // FeasibilityReadout (M4): counts over engine outputs, per category.
  const feasibilityByCategory = Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      categoryFeasibility(
        ledgerState,
        working.build,
        category,
        readouts[category].remainingPoints,
        shippedDataset,
      ),
    ]),
  ) as Record<Category, CategoryFeasibility>;

  const validation = validateLoadout(ledgerState);

  // F8-S2 (§14.4/§14.6). Computed HERE alongside readouts / validation /
  // feasibility, and the OUTPUT is what crosses into SummaryPanel — a
  // `BuildSummary` is a value, so there is no channel through which a future
  // prop edit could route an OverlayState into the summary by accident.
  // `buildSummary`'s signature already refuses one; this keeps the seam that
  // narrow at the call site too.
  const loadoutSummary = buildSummary(ledgerState, working.build, shippedDataset);
  const synergyRows = synergyProjections(ledgerState, shippedDataset);

  /* ================================================================ F8-R2 ==
   * THE ROLL SURFACE'S WIRING. Read this block as: derive what the controls
   * need, hand the ENGINE a request, apply its proposal in ONE write.
   * Nothing below enumerates a step, tests affordability, computes a cost or
   * decides a decline. Those are all rollBuild's, and re-deriving any of them
   * here is the breach [seed: Working agreements #1].
   * ======================================================================= */

  /**
   * THE TWO IMPLICIT PINS, as reason strings. The engine pins these whether or
   * not the user did, so the UI must render them PRESSED and DISABLED or it is
   * lying about what the roll will do.
   *
   * Both facts are READ OFF the summary the app already computes -- 
   * `row.synergyRole` and `row.stale` are engine fields, not predicates
   * re-implemented here. A synergy-role holder is unconditional (clearing it
   * could strand a fuseBadgeId -- the F2.1 defect class that cost real
   * unrecoverable autosaves); a stale purchase is H8 (the roll never repairs a
   * disclosure).
   */
  const implicitPinReasons = useMemo(() => {
    const reasons: Record<string, string> = {};
    for (const category of loadoutSummary.categories) {
      for (const row of category.rows) {
        if (row.synergyRole !== null) {
          const roleName = row.synergyRole.kind === "fuse" ? "Fuse" : "Reaction";
          reasons[row.badgeId] =
            `Pinned — holds the ${roleName} role in Synergy Slot ${row.synergyRole.synergySlotId}.`;
        } else if (row.stale) {
          reasons[row.badgeId] =
            "Pinned — this purchase no longer qualifies and the roll will not change it.";
        }
      }
    }
    return reasons;
  }, [loadoutSummary]);

  const pinnedBadgeIds = useMemo(() => new Set(Object.keys(pins)), [pins]);
  const excludedSet = useMemo(() => new Set(excludedBadgeIds), [excludedBadgeIds]);

  const buildRollRequest = useCallback(
    (
      mode: RollMode,
      category: Category | null,
      requestSeed: string,
    ): RollRequest => ({
      state: ledgerState,
      build: working.build,
      pins,
      excludedBadgeIds,
      ...(category === null ? {} : { categories: [category] }),
      seed: requestSeed,
      mode,
    }),
    [ledgerState, working.build, pins, excludedBadgeIds],
  );

  /**
   * THE APPLY, AND IT IS EXACTLY ONE STATE WRITE. `proposedLoadout` is the
   * COMPLETE loadout for all six categories -- out-of-scope and declined
   * categories carried through byte-identical -- so one `applyEdit` commits
   * the whole thing. Eleven sequential writes would be eleven eligibility
   * recomputes across 53 badges, eleven feasibility passes and eleven
   * autosaves.
   *
   * `changed === false` writes NOTHING: the report still renders and still
   * says, per category, what the roll could not do. Silence is never an
   * outcome, but neither is a no-op autosave.
   */
  const runRoll = useCallback(
    (request: RollRequest) => {
      const result = rollBuild(request, shippedDataset);
      setLastRoll(result);
      setLastRollRequest(request);
      setRollEpoch((epoch) => epoch + 1);
      if (!result.changed) return;
      applyEdit((prev) => ({ ...prev, loadout: [...result.proposedLoadout] }));
    },
    [applyEdit],
  );

  /**
   * Restore's precondition. THE GATE IS THE ENGINE'S OWN `inputDigest` -- a
   * candidate request is composed from the CURRENT build, budgets, pins and
   * exclusions but the STORED pre-roll loadout, and its engine-computed digest
   * is compared to the stored one. That keeps the digest's composition in
   * exactly one place (randomize.ts) instead of hand-rolling a second change
   * detector here.
   *
   * The per-field comparisons below the gate choose the WORDING ONLY. They
   * never decide enabled-vs-disabled, so they cannot disagree with the gate
   * about whether the roll is reproducible -- only about which sentence
   * explains it.
   */
  const restoreDisabledReason = useMemo((): string | null => {
    if (lastRoll === null || lastRollRequest === null) {
      return "Restore unavailable — nothing has been rolled yet.";
    }
    if (lastRoll.token.dataVersion !== shippedDataset.dataVersion) {
      return "Restore unavailable — the dataset changed.";
    }
    if (lastRoll.token.refundTrigger !== working.config.refundTrigger) {
      return "Restore unavailable — the refund setting changed.";
    }
    const candidate: RollRequest = {
      ...lastRollRequest,
      state: { ...ledgerState, loadout: lastRollRequest.state.loadout },
      build: working.build,
      pins,
      excludedBadgeIds,
    };
    if (rollBuild(candidate, shippedDataset).token.inputDigest === lastRoll.token.inputDigest) {
      return null;
    }
    if (stableDigest(pins) !== stableDigest(lastRollRequest.pins)) {
      return "Restore unavailable — pins changed since that roll.";
    }
    if (stableDigest(budgets) !== stableDigest(lastRollRequest.state.budgets)) {
      return "Restore unavailable — budgets changed.";
    }
    if (stableDigest(working.build) !== stableDigest(lastRollRequest.build)) {
      return "Restore unavailable — the build changed.";
    }
    return "Restore unavailable — the inputs to that roll changed.";
  }, [
    lastRoll,
    lastRollRequest,
    ledgerState,
    working.build,
    working.config.refundTrigger,
    budgets,
    pins,
    excludedBadgeIds,
  ]);

  /** The re-roll dialog's blast radius. A roll-up of ENGINE values (row.cost),
   *  in the same spirit as the roster digest -- no cost is derived here. */
  const rerollCounts = useMemo(() => {
    let unpinnedCount = 0;
    let unpinnedPoints = 0;
    let pinnedCount = 0;
    for (const category of loadoutSummary.categories) {
      if (rerollScope !== null && rerollScope.category !== null) {
        if (category.category !== rerollScope.category) continue;
      }
      for (const row of category.rows) {
        const isPinned =
          implicitPinReasons[row.badgeId] !== undefined || pinnedBadgeIds.has(row.badgeId);
        if (isPinned) pinnedCount += 1;
        else {
          unpinnedCount += 1;
          unpinnedPoints += row.cost;
        }
      }
    }
    return { unpinnedCount, unpinnedPoints, pinnedCount };
  }, [loadoutSummary, rerollScope, implicitPinReasons, pinnedBadgeIds]);

  const rollControls: RollControls = useMemo(
    () => ({
      pinnedBadgeIds,
      pinModes: pins,
      implicitPinReasons,
      excludedBadgeIds: excludedSet,
      onTogglePin: (badgeId: string) => {
        setPins((prev) => {
          if (prev[badgeId] !== undefined) {
            const { [badgeId]: _dropped, ...rest } = prev;
            return rest;
          }
          // Defaults to `exact` -- the user's own example is "I select gold
          // posterizer", which means THIS level, not this badge at any level.
          return { ...prev, [badgeId]: "exact" };
        });
      },
      onPinModeChange: (badgeId: string, mode: PinMode) => {
        setPins((prev) => (prev[badgeId] === mode ? prev : { ...prev, [badgeId]: mode }));
      },
      onToggleExclude: (badgeId: string) => {
        setExcludedBadgeIds((prev) =>
          prev.includes(badgeId) ? prev.filter((id) => id !== badgeId) : [...prev, badgeId],
        );
      },
      onRerollCategory: (category: Category) => {
        setRerollScope({ category });
      },
    }),
    [pinnedBadgeIds, pins, implicitPinReasons, excludedSet],
  );

  // F3: the position-derived height range (engine accessor — the only route
  // to the table) and the HARD-DISCLOSED build validation. Position unset ⇒
  // the dataset's own range ⇒ pre-F3 behavior, unchanged.
  const heightRange = positionHeightRange(working.build.position);
  const buildValidation = validateBuild(working.build);
  const buildViolationReasons = buildValidation.violations.map(
    (violation) => violation.reason,
  );

  /** F13 — ONE bundle, built once, handed to EXACTLY ONE of the two surfaces
   * that can render Physique. The seam is `isWide` and it is expressed here
   * and nowhere else (§16.10's rule, applied to the M query): at >=768 the
   * strip gets it and BuildPanel gets `physique={null}`; below 768 it is the
   * other way round. There is no width at which both render it, and no
   * component below re-asks the question. */
  const physiqueProps = {
    build: working.build,
    heightRange,
    buildViolationReasons,
    clampNotice,
    onHeightCommit: handleHeightCommit,
    onPositionChange: handlePositionChange,
  };

  /**
   * F16 — the Loadout board's ONE write, and it writes FILTER state, never
   * the build. Pressing an empty Badge Slot (or an untouched discipline's
   * browse link) narrows the grid to that discipline and moves focus into
   * it, which is the "fill this" affordance without a second purchase
   * surface: a badge you do not own has no tile to press, and an empty-tile
   * picker over 53 badges is the grid with a worse interface.
   *
   * `legalOnly` and `purchasedOnly` are CLEARED rather than preserved. Both
   * can hide the very badges the user just asked to see — `purchasedOnly`
   * would show an empty grid by construction — and a navigation that lands
   * you somewhere empty reads as a broken link, not as a filter.
   */
  const browseCategoryInGrid = (category: Category) => {
    setFilters((prev) => ({
      ...prev,
      categories: [category],
      legalOnly: false,
      purchasedOnly: false,
    }));
    document.getElementById("badge-grid")?.focus();
  };

  const clearAllFilters = () => {
    setFilters(defaultFilterState());
  };

  /** R12 — the Synergy and Summary panels and the footer, defined ONCE and
   * mounted in exactly one of two homes: the build rail's scroller at L, the
   * end of `.col-right` below the gate. Conditional parenting with a single
   * definition, so the two widths cannot drift.
   *
   * The Loadout board is NOT here — it renders in the catalog column at
   * every width (user ruling 2026-08-26: the 2K-style Kanban tile layout
   * needs the catalog column's width; a 348px rail would stack it 1-wide).
   *
   * F8-R2's RollPanel placement rationale survives the move: it stays the
   * sibling ABOVE <SummaryPanel>, outside the `.summary` subtree, so the H2
   * overlay comparison in tests/ui/overlays.test.tsx never has to reason
   * about roll state. §11.5 ⑤'s ban on a rail Export/Import pair also
   * stands — the header pair remains the only one. */
  /**
   * R12 slice 3 — the tab-panel attributes for one station, and they exist
   * ONLY on the phone.
   *
   * `.mobile-panel` is a `display: contents` wrapper at every width above the
   * phone: it generates no box, so `.col-right`'s flex children are exactly
   * what they were before this slice and no measurement in
   * tests/layout-arithmetic.test.ts moves. Below 768 it becomes a real block
   * carrying `role="tabpanel"`, its tab's id as `aria-labelledby`, and
   * `hidden` when another tab is active.
   *
   * HIDDEN, NEVER UNMOUNTED — see the MobileTabs docblock. A torn-down panel
   * takes `#badge-grid` (the skip link's target) and every `#cat-*` anchor
   * with it, and loses the catalog's scroll position on every switch.
   */
  const mobilePanelProps = (id: MobileTabId) =>
    isPhone
      ? {
          role: "tabpanel",
          id: mobileTabPanelId(id),
          "aria-labelledby": mobileTabId(id),
          hidden: mobileTab !== id,
        }
      : {};

  /** F16 — the Kanban board's region, hoisted so the phone can group it with
   * the synergy station without the JSX being written twice. */
  const boardRegion = (
    <div id="panel-board">
      <Section title="Loadout board" storageKey="section-board">
        <LoadoutBoard
          loadout={working.loadout}
          synergySlots={working.synergy}
          build={working.build}
          dataset={shippedDataset}
          readouts={readouts}
          // The EFFECTIVE record, exactly as the grid takes it: `budgets`,
          // never `baseBudgets`. Asking a different record is how two
          // surfaces come to disagree about whether a discipline is over.
          budgets={budgets}
          onBrowseCategory={browseCategoryInGrid}
        />
      </Section>
    </div>
  );

  const planPanels = (
    <>
      <div id="panel-synergy">
        <Section title="Synergy Slots" storageKey="section-synergy">
          <SynergyPanel
            synergySlots={working.synergy}
            loadout={working.loadout}
            dataset={shippedDataset}
            overlay={overlay}
            ratifiedMagnitudeNormalized={ratifiedMagnitudeNormalized}
            refundTriggerNormalized={refundTriggerNormalized}
            onSynergySlotsChange={setSynergySlots}
          />
        </Section>
      </div>

      <div id="panel-summary">
        <Section title="Summary" storageKey="section-summary">
          <RollPanel
            dataset={shippedDataset}
            heightText={formatHeightInches(working.build.heightInches)}
            lastRoll={lastRoll}
            rollEpoch={rollEpoch}
            seed={seed}
            onSeedChange={setSeed}
            onRegenerateSeed={() => {
              setSeed(newSeed());
            }}
            onFillRemaining={() => {
              runRoll(buildRollRequest("fill", null, seed));
            }}
            onRerollRequest={() => {
              setRerollScope({ category: null });
            }}
            excludedCount={excludedBadgeIds.length}
            onClearExclusions={() => {
              setExcludedBadgeIds([]);
            }}
            restoreDisabledReason={restoreDisabledReason}
            onRestore={() => {
              if (lastRollRequest !== null) runRoll(lastRollRequest);
            }}
          />
          <SummaryPanel
            loadout={working.loadout}
            synergySlots={working.synergy}
            budgets={budgets}
            readouts={readouts}
            validation={validation}
            dataset={shippedDataset}
            // F8-S2 wiring: `buildSummary(ledgerState, build, dataset)`
            // needs the committed ledger state and the build; the OUTPUT
            // value is what crosses this seam, never an OverlayState.
            summary={loadoutSummary}
            synergy={synergyRows}
            buildName={working.name}
          />
        </Section>
      </div>

      {/* F14 put the footer inside the scroller — a citation belongs at the
          end of the reading order, never in the shell's permanent chrome.
          R12 keeps that rule; the reading order now ends in the rail at L
          and in `.col-right` below the gate, and the footer follows it. */}
      <footer className="app-footer">
        <span className="num">dataset {shippedDataset.dataVersion}</span> ·{" "}
        {shippedDataset.source} · as of {shippedDataset.asOf} · confidence:{" "}
        {shippedDataset.confidence}
      </footer>
    </>
  );

  return (
    /* F14/R12 — `app-shell` rides the EXISTING root element rather than
       adding a wrapper, so the component inventory does not move. It is
       presentation only, exactly as `.col-right` is: no landmark, no id, no
       aria, no state. At >=1280 wide AND >=768 tall the stylesheet turns
       this element into a 100dvh flex column whose only growing child is
       `.layout`; everywhere else it is inert and `.app`'s shipped rules are
       the whole behaviour. */
    <RollControlsContext value={rollControls}>
    <div className="app app-shell">
      <a className="skip-link" href="#badge-grid">
        Skip to badge grid
      </a>
      <AppHeader
        dataset={shippedDataset}
        overlayControls={
          <>
            <Toggle
              variant="overlay"
              label="Reactions activated"
              checked={overlay.reactionsActive}
              onChange={(reactionsActive) => {
                setOverlay((prev) => ({ ...prev, reactionsActive }));
              }}
            />
            <Toggle
              variant="overlay"
              label="Season-reset preview"
              checked={overlay.seasonReset}
              onChange={(seasonReset) => {
                setOverlay((prev) => ({ ...prev, seasonReset }));
              }}
            />
          </>
        }
        actions={<ExportImportControls onExport={exportNow} onImportFile={importFile} />}
      >
        <BuildSwitcher
          builds={namedBuilds}
          currentName={working.name}
          currentSourceId={working.sourceId}
          currentDirty={dirty}
          unreadableCount={namedBuildListing.unreadableCount}
          onSelect={loadBuild}
          onOpenManager={() => {
            setManagerOpen(true);
          }}
        />
      </AppHeader>

      <PreviewModeStrip
        overlay={overlay}
        projectedCategoryCount={projectedCategoryCount}
        categoryCount={CATEGORIES.length}
      />

      <div className="app-banners">
        {quarantined ? (
          <QuarantineBanner onExportRaw={exportRawNow} onDiscard={discardQuarantine} />
        ) : null}
        <DriftBanner
          key={disclosureEpoch}
          saved={toEnvelope(working)}
          currentDataset={shippedDataset}
          droppedEntries={droppedEntries}
          clearedSynergyRefs={clearedSynergyRefs}
        />
        {autosaveFailed && !autosaveDismissed ? (
          <AutosaveWarning
            onExport={exportNow}
            onDismiss={() => {
              setAutosaveDismissed(true);
            }}
          />
        ) : null}
      </div>

      {/* §6 live region 2 — build-change result (rev 3 contract): position
        * clamps and attribute commits that changed the stale-purchase count.
        * Fires once per COMMIT, never per drag frame. */}
      <p className="sr-only" role="status">
        {buildAnnouncement}
      </p>

      {/* F13 — THE PHYSIQUE STRIP. Position + Height in the full-bleed
          horizontal band directly under the banners, not as a vertical block
          inside the setup panel: measured, the block cost 302.6px at 1280 and
          321.8px at 390 of lead ahead of the badge grid, and it is two
          controls.

          A SIBLING OF `.app-banners`, NEVER A CHILD OF THE DRIFT BANNER. The
          banner renders only on a dataVersion mismatch (or a deserializer
          strip/heal report); the strip is unconditional. Nesting an
          unconditional control surface inside a conditional disclosure would
          tie the lifetime of the first to the second.

          AFTER the banners, not before. `.app-banners` measures 0px tall when
          empty (flex column, no children), so this position costs the strip
          nothing in the common case, and when a warning DOES arrive the
          warning is still the first thing under the header rather than the
          second. A warning must not be pushed below a toolbar.

          OUTSIDE `.layout`, so it is genuinely full-bleed at both widths and
          is unaffected by the L media query that owns the pane.

          R12 — THE STRIP IS NOW THE M BAND'S SURFACE ONLY (768–1279, or
          wide-but-short viewports below the workbench gate). At L Physique
          lives at the top of the body column, so the strip there would be a
          second surface for the same two controls. The three-surface seam:
          L → col-body's PhysiqueSection; M → this strip; S → the Section
          inside BuildPanel. Exactly one renders at every viewport. */}
      {isWide && !isLarge ? <PhysiqueStrip {...physiqueProps} /> : null}

      {/* R12 (the workbench re-cut; user ruling 2026-08-26, approved from the
          workbench mockup) — .layout is THREE grid items at L: the body
          column, the catalog column, and the build rail. The planning loop —
          nudge attributes → see what unlocks → buy → pair synergy → check
          budget — used to cross a 9,096px document twice per lap; now each
          station owns a column and a scrollport, and only the catalog is
          tall. F5.4's sticky-pane machinery (attr-pane, attr-pane-column,
          the containing-block stretch) is RETIRED: under a fixed-height
          shell a column that owns its scrollport has nothing left for
          sticky to do.

          Below the workbench gate (width <1280 OR height <768) the columns
          are NOT RENDERED, .col-right is the only item, and the output is
          the shipped M/S document flow (§16.10's discipline, new gate). */}
      <div className="layout">
        {isLarge ? (
          <div className="col-body">
            {/* R12 — Physique heads the body column: position and height are
                the same kind of input as the 20 attributes and sit with
                them. PhysiqueSection is the S surface reused verbatim — same
                Section, same storage key, same collapse. */}
            <aside aria-label="Physique">
              <PhysiqueSection {...physiqueProps} />
            </aside>
            <aside aria-label="Attributes">
              {/* [A7] The column's mount takes the SAME two reset props the
                  panel's mount takes below — the control rides the Section,
                  so there is exactly one placement to keep correct. */}
              <AttributesSection
                attributes={working.build.attributes}
                onCommit={handleAttributeCommit}
                onResetRequest={() => {
                  setResetOpen(true);
                }}
                canReset={playerHasContent(working)}
              />
            </aside>
          </div>
        ) : null}

        <div className="col-right" ref={colRightRef}>
          {/* R12 — the Ledger overview panel is RETIRED. It was L-only
              (display: none below 1280) and its successor is the build
              rail's TotalsStrip: the same engine readouts, the same string
              builders, permanently visible instead of first-in-a-scroller.
              One of the five same-six-numbers surfaces R12 collapses to
              two. */}

          {/* Badge Tokens/Slots are SET-UP surfaces, not loop surfaces: the
              twelve budget fields are filled by hand from the MyPlayer
              builder and then not touched again.

              R12 — THE PANEL IS AN M/S SURFACE NOW. At L the entry grid
              lives behind the rail's `Edit budgets…` (BudgetsDialog) and
              the always-visible readout is the TotalsStrip — entry and
              monitoring are different surfaces, and the panel's 560px of
              pre-grid lead was the old layout's single biggest block of
              setup chrome. Below the gate everything here is the shipped
              M/S behaviour: the auto-collapse latch, the digest row, the
              F13 physique carve-out at S, F5.3's Reset — untouched. */}
          {isLarge ? null : (
            <div className="mobile-panel" {...mobilePanelProps("build")}>
            <aside className="setup-panel" aria-label="Build">
              {/* [A5] `budgets` here is the BASE record, never the composed
                  one. The grid is a base-ENTRY surface and `onBudgetCommit`
                  writes straight back into the base; rendering the
                  effective number would compound it on every blur. Test 6.6. */}
              <BuildPanel
                build={working.build}
                budgets={baseBudgets}
                bonus={working.bonus}
                onOpenBonus={() => {
                  setBonusOpen(true);
                }}
                compact
                withAttributes
                physique={isWide ? null : physiqueProps}
                onAttributeCommit={handleAttributeCommit}
                onResetRequest={() => {
                  setResetOpen(true);
                }}
                canReset={playerHasContent(working)}
                onBudgetCommit={handleBudgetCommit}
                // R12 slice 3 — on the phone this panel IS the Build tab, so
                // the outer collapsible wrapper (and its one-shot latch) come
                // off: see the `unwrapped` rationale in BuildPanel. At M the
                // panel is one region in a scroll and keeps both.
                unwrapped={isPhone}
              />
            </aside>
            </div>
          )}

          {/* tabIndex={-1} is not decoration under a shell. A skip link whose
              target is not focusable moves the NEXT tab stop in most engines
              but does not move FOCUS in all of them — and a focus move is what
              drives a scrollport. Without it the skip link can leave
              `.col-right` exactly where it was. */}
          <div className="mobile-panel" {...mobilePanelProps("badges")}>
          <main id="badge-grid" tabIndex={-1}>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              shownCount={shownCount}
              totalCount={shippedDataset.badges.length}
            />
            {/* R12 — the panel chips exist to REACH panels that live below
                the grid, and that is true at exactly ONE width band now.
                At L those panels are permanently on screen in the build
                rail. On the PHONE they are on another TAB, and an anchor
                into a `hidden` subtree is a dead link — worse than a missing
                one, because it looks live and does nothing. Both get `[]`;
                only M (768–1279), where the panels really are further down
                the same scroll, renders them.

                The category chips remain at every width — they navigate the
                catalog, which is still the one tall scroller. */}
            <JumpNav
              panelAnchors={
                isLarge || isPhone
                  ? []
                  : [
                      { id: "panel-board", label: "Board" },
                      { id: "panel-synergy", label: "Synergy" },
                      { id: "panel-summary", label: "Summary" },
                    ]
              }
            />
            {shownCount === 0 ? (
              <EmptyResults all onClearAll={clearAllFilters} />
            ) : (
              CATEGORIES.map((category) => {
                const readout = readouts[category];
                const budget = budgets[category];
                const visible = visibleByCategory.get(category) ?? [];
                return (
                  <BadgeGridSection
                    key={category}
                    category={category}
                    // F5.3/B: two render props instead of one `header`. The
                    // digest becomes the section's <summary> (the collapse
                    // control); the lede is ordinary disclosure content. Wiring
                    // only — the numbers are the same engine readouts.
                    digest={(headingId) => (
                      <CategoryLedgerDigest
                        category={category}
                        readout={readout}
                        budget={budget}
                        headingId={headingId}
                      />
                    )}
                    lede={() => (
                      <CategoryLedgerLede
                        category={category}
                        readout={readout}
                        budget={budget}
                        feasibility={feasibilityByCategory[category]}
                        projection={projections?.[category]}
                        // [A5-U] BOTH halves of the composition, so the lede
                        // does no arithmetic to recover a split the engine
                        // already holds. `budget` above is the EFFECTIVE
                        // record; these two are what it was composed from.
                        baseBudget={baseBudgets[category]}
                        appliedBonus={{
                          points: working.bonus.appliedPoints[category],
                          equipSlots: working.bonus.appliedEquipSlots[category],
                        }}
                      />
                    )}
                  >
                    {visible.length === 0 ? (
                      <li>
                        <EmptyResults onClearAll={clearAllFilters} />
                      </li>
                    ) : (
                      visible.map((badge) => {
                        const purchased = working.loadout.some(
                          (entry) => entry.badgeId === badge.id,
                        );
                        return (
                          <li key={badge.id} id={badgeAnchorId(badge.id)}>
                            <BadgeCard
                              badge={badge}
                              build={working.build}
                              eligibility={eligibilityById.get(badge.id) ?? validateBadge(badge, working.build)}
                              synergyState={synergyState}
                              overlay={overlay}
                              dataset={shippedDataset}
                              remainingPoints={readout.remainingPoints}
                              overBadgeSlotsIfBought={
                                // 0 = unset RULING (uniform across all four
                                // surfaces): warn only against an ENTERED
                                // capacity — see badgeSlotsCapacityUnset.
                                !purchased &&
                                !badgeSlotsCapacityUnset(budget) &&
                                readout.equipSlotsUsed >= budget.equipSlots
                              }
                              onSetLevel={setLevel}
                              onCycle={cycleBadge}
                            />
                          </li>
                        );
                      })
                    )}
                  </BadgeGridSection>
                );
              })
            )}
          </main>
          </div>

          {/* R12 slice 3 — THE THIRD PHONE STATION: the Kanban board, the
              Synergy Slots panel, the Summary and the footer, grouped under
              one tab. Above the phone this wrapper is `display: contents`,
              so `.col-right`'s flex children are byte-identical to slice 1's
              and the board keeps its place directly under the grid.

              F16 — the board renders HERE at every width (user ruling
              2026-08-26: "maintain the 2K style board layout — looked like a
              Kanban"). Its tiles need the catalog column's width; a 348px
              rail would stack them 1-wide and lose exactly the look the
              ruling names.

              R12 — below the gate the Synergy and Summary panels and the
              footer render here too; at L they live in the build rail. One
              definition (`planPanels`, above the return), two conditional
              homes — the same JSX cannot drift between widths. */}
          <div className="mobile-panel" {...mobilePanelProps("synergy")}>
            {boardRegion}
            {isLarge ? null : planPanels}
          </div>
        </div>

        {isLarge ? (
          /* R12 — THE BUILD RAIL: what you are making, permanently visible.
             THREE flex children, and the two outer ones are the furniture:
             the TotalsStrip is pinned at the rail's top and the SynergyDock
             at its foot (neither grows), with the plan panels scrolling
             between them in the rail's own scrollport. That is the whole of
             "pinned" — no sticky layer is opened at either end (I5). The
             board's old "over by two → press the tile → land on its card →
             drop a level" loop now crosses two columns that are BOTH on
             screen, which is the whole point of the re-cut.

             The dock READS `working.synergy` and resolves names against the
             dataset. It takes no change callback: the build is structurally
             unreachable from it, and a chip press only scrolls the rail's
             scroller to the Synergy Slot's own row and focuses it. */
          <div className="col-build">
            <TotalsStrip
              readouts={readouts}
              budgets={budgets}
              onEditBudgets={() => {
                setBudgetsOpen(true);
              }}
            />
            <div className="col-build__scroll">{planPanels}</div>
            <SynergyDock synergySlots={working.synergy} dataset={shippedDataset} />
          </div>
        ) : null}
      </div>

      {/* R12 slice 3 — THE PHONE DOCK, and it is the tab shell's whole
          chrome: the totals bar (the rail's strip in its `bar` arrangement —
          one component, so the six numbers cannot disagree across widths)
          above the tab bar, both fixed to the bottom of the viewport.

          ONE FIXED ELEMENT, NOT TWO. The dock is a single fixed box so the
          space the document has to reserve for it is one number
          (`--mobile-dock-h`) rather than a sum that two rules could drift
          apart on.

          OUTSIDE `.layout`, like the physique strip and for the same reason:
          it is chrome, not a grid item. It renders only below 768, where the
          app shell is NOT fixed and the document scrolls normally — so the
          totals stay on screen while the catalog scrolls under them, which
          is the one property the phone shares with the workbench. */}
      {isPhone ? (
        <div className="mobile-dock">
          <TotalsStrip
            variant="bar"
            readouts={readouts}
            budgets={budgets}
            onEditBudgets={() => {
              setBudgetsOpen(true);
            }}
          />
          <MobileTabs
            active={mobileTab}
            onSelect={(next) => {
              setMobileTab(next);
              // A tab switch is a change of PLACE, so it lands at the top of
              // the new station rather than at whatever offset the previous
              // one happened to be scrolled to. The panels are hidden rather
              // than unmounted, so nothing else about their state moves.
              window.scrollTo({ top: 0 });
            }}
          />
        </div>
      ) : null}

      <BuildManagerDialog
        open={managerOpen}
        builds={namedBuilds}
        currentDataVersion={shippedDataset.dataVersion}
        onClose={() => {
          setManagerOpen(false);
        }}
        onLoad={loadBuild}
        onRename={renameBuild}
        onDuplicate={duplicateBuild}
        onDelete={removeBuild}
        onSaveAsNew={saveAsNew}
        unreadableCount={namedBuildListing.unreadableCount}
      />

      {resetOpen ? (
        <ResetBuildDialog
          counts={resetBlastRadius(working)}
          defaultHeightText={formatHeightInches(DEFAULT_HEIGHT_INCHES)}
          onCancel={() => {
            setResetOpen(false);
          }}
          onConfirm={handleReset}
          onSaveCopyAndReset={handleSaveCopyAndReset}
        />
      ) : null}

      {/* A5-U (design-spec §17) — the SIXTH dialog. Mounted only while open,
          like the reset confirm: at zero earned the tree is byte-identical to
          the pre-A5-U tree except for one secondary Button (§17.10, canary
          1), and a permanently-mounted closed dialog would put six rows of
          `.bonus-*` nodes in the DOM to be "identical" with. */}
      {/* R12 — the SEVENTH dialog: the base-budget editor, reachable only
          from the rail's `Edit budgets…` at L. Mounted only while open,
          like every dialog here. It is `#dialog-budgets` — select by id,
          never by tag. */}
      {budgetsOpen ? (
        <BudgetsDialog
          budgets={baseBudgets}
          bonus={working.bonus}
          onBudgetCommit={handleBudgetCommit}
          onOpenBonus={() => {
            setBonusOpen(true);
          }}
          onDone={() => {
            setBudgetsOpen(false);
          }}
        />
      ) : null}

      {bonusOpen ? (
        <BonusDialog
          baseBudgets={baseBudgets}
          bonus={working.bonus}
          onEarnedCommit={(pool, value) => {
            applyEdit((prev) => {
              const field = pool === "points" ? "earnedPoints" : "earnedEquipSlots";
              if (prev.bonus[field] === value) return prev;
              return { ...prev, bonus: { ...prev.bonus, [field]: value } };
            });
          }}
          onAppliedCommit={(pool, category, value) => {
            applyEdit((prev) => {
              const field = pool === "points" ? "appliedPoints" : "appliedEquipSlots";
              if (prev.bonus[field][category] === value) return prev;
              return {
                ...prev,
                bonus: { ...prev.bonus, [field]: { ...prev.bonus[field], [category]: value } },
              };
            });
          }}
          onDone={() => {
            setBonusOpen(false);
          }}
        />
      ) : null}

      {/* F8-R2 — THE FOURTH <dialog> (§4.6 as amended by §14.11). Mounted only
          while open, like the reset and bonus confirms. It is `#dialog-reroll`
          and everything that reaches for it MUST select by that id:
          `document.querySelector("dialog")` returns the builds dialog, which
          is how a review once reported "import does nothing". */}
      {rerollScope !== null ? (
        <RerollConfirmDialog
          category={rerollScope.category}
          unpinnedCount={rerollCounts.unpinnedCount}
          unpinnedPoints={rerollCounts.unpinnedPoints}
          pinnedCount={rerollCounts.pinnedCount}
          onCancel={() => {
            setRerollScope(null);
          }}
          onPinEverything={() => {
            // The `Save as new` analogue: it converts the scary action into the
            // safe one at the moment of hesitation, and it closes WITHOUT
            // rolling.
            const scope = rerollScope.category;
            setPins((prev) => {
              const next = { ...prev };
              for (const category of loadoutSummary.categories) {
                if (scope !== null && category.category !== scope) continue;
                for (const row of category.rows) {
                  if (next[row.badgeId] === undefined) next[row.badgeId] = "exact";
                }
              }
              return next;
            });
            setRerollScope(null);
          }}
          onConfirm={() => {
            const scope = rerollScope.category;
            setRerollScope(null);
            runRoll(buildRollRequest("reroll", scope, seed));
          }}
        />
      ) : null}

      {importState !== null ? (
        <ImportDialog
          state={importState}
          currentDataVersion={shippedDataset.dataVersion}
          onConfirm={confirmImport}
          onCancel={() => {
            setImportState(null);
          }}
        />
      ) : null}
    </div>
    </RollControlsContext>
  );
}
