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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultAppConfig, deriveBudget } from "./config";
import { bonusHasContent, effectiveBudgets, zeroBonus } from "./engine/budget";
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
  quarantineAutosave,
  readAutosaveQuarantine,
  readAutosaveResult,
  readNamedBuildWithReport,
  renameNamedBuild,
  saveNamedBuild,
  deleteNamedBuild,
  writeAutosave,
} from "./persist/local-storage";
import type { NamedBuildSummary, PersistResult } from "./persist/local-storage";
import { AttributesSection, BuildPanel } from "./ui/build/BuildPanel";
import type { HeightClampNotice } from "./ui/build/BuildPanel";
import { ResetBuildDialog } from "./ui/build/ResetBuildDialog";
import type { ResetBlastRadius } from "./ui/build/ResetBuildDialog";
import { BuildManagerDialog, BuildSwitcher } from "./ui/builds/BuildManager";
import { BadgeCard } from "./ui/grid/BadgeCard";
import { BadgeGridSection } from "./ui/grid/BadgeGridSection";
import {
  CategoryLedgerDigest,
  CategoryLedgerLede,
  overByBadgePoints,
  overByBadgeSlots,
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
 * THE ONE NORMALIZATION POINT for all three persisted-reload routes.
 */
interface FromSavedResult {
  working: WorkingState;
  /** Did this load override a persisted magnitude with ratified data? */
  ratifiedMagnitudeNormalized: boolean;
}

function fromSaved(saved: SavedBuild, sourceId: string | null): FromSavedResult {
  const ratified = applyRatifiedMagnitudes(saved.synergy);
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
      config: saved.config,
    },
    ratifiedMagnitudeNormalized: ratified.normalizedSynergySlotIds.length > 0,
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
    budgetFieldsSet: CATEGORIES.reduce(
      (count, category) =>
        count +
        (working.budgets[category].points > 0 ? 1 : 0) +
        (working.budgets[category].equipSlots > 0 ? 1 : 0),
      0,
    ),
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
  const [working, setWorkingState] = useState<WorkingState>(
    () => bootRestore?.working ?? freshWorkingState(),
  );
  /** Write-through mirror of `working`: updated SYNCHRONOUSLY by every
   * mutation, so the pagehide/visibilitychange flush can persist the very
   * last edit without waiting on a React render. */
  const workingRef = useRef<WorkingState>(working);
  /** Has the user edited the working build this session? Drives the switcher
   * guard and the "— unsaved changes" label. Ref + state pair: the ref is
   * read synchronously inside handlers, the state re-renders the label. */
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  /**
   * F2.2 A3 — "the app holds a state worth persisting". FALSE in exactly one
   * situation: boot found an autosave it could not read, so `working` is a
   * synthetic freshWorkingState() standing in for data we have QUARANTINED
   * but not lost. Writing in that state would overwrite the user's real
   * build with an empty one (F-CORE).
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
   * On the HEALTHY path (boot read succeeded — every boot for every user who
   * has ever used this app) it is `true` from the first render, so the mount
   * write happens exactly as it did before this slice. The guard is a NO-OP
   * except on the defect path.
   */
  const persistableRef = useRef<boolean>(boot.kind !== "unreadable");
  /** Bumped when the latch flips, so the autosave effect re-runs and writes
   * even when `working` itself did not change (the Discard case). */
  const [persistEpoch, setPersistEpoch] = useState(0);
  /** A FAILED quarantine write is strictly MORE reason to suppress autosave,
   * not less — and the failure surfaces on the existing role="alert" banner
   * rather than silently trading the user's data for a successful fresh
   * write. */
  const [autosaveFailed, setAutosaveFailed] = useState(
    () => quarantineWrite !== null && !quarantineWrite.ok,
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

  /** F5.4 (design-spec §16.10) — THE ONE OWNER of the L breakpoint. It used
   * to live inside BuildPanel; the pane, the two-grid-item layout and the
   * panel's shape all key off the same answer, so it is asked once here and
   * passed down.
   *
   * KEEP THE QUERY STRING AND KEEP THE NEGATION IN THIS DIRECTION.
   * `useMediaQuery` returns false where matchMedia is absent (jsdom), so
   * `!useMediaQuery("(max-width: 1279px)")` yields isLarge = true and every
   * component test keeps rendering the desktop shape it renders today. The
   * tidier-looking `useMediaQuery("(min-width: 1280px)")` inverts that
   * default to MOBILE and silently flips a large, hard-to-attribute set of
   * tests. tests/layout-arithmetic.test.ts asserts this source text. */
  const isLarge = !useMediaQuery("(max-width: 1279px)");

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
    // F2.2 F-CORE, writer 1 of 2. See `persistableRef`: false ONLY when boot
    // found an unreadable autosave, in which case `working` is a synthetic
    // fresh state and writing it would destroy the quarantined original.
    if (!persistableRef.current) return;
    const result = writeAutosave(toEnvelope(working));
    setAutosaveFailed(!result.ok);
    if (result.ok) setAutosaveDismissed(false);
  }, [working, persistEpoch]);

  // ---- tail-edit flush: committing happens on field blur, so a reload or
  // tab-hide mid-edit would lose the pending value. Blurring the active
  // element runs the field's commit synchronously (through applyWorking's
  // write-through ref), then the autosave writes synchronously too. ----
  useEffect(() => {
    const flush = () => {
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
      writeAutosave(toEnvelope(workingRef.current));
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
   * WHAT SURVIVES — the PLAN CONTAINER: Badge Points, Badge Slots, Synergy
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
        ...(alsoBudgets ? { budgets: zeroBudgets() } : {}),
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
          (alsoBudgets ? " Badge Points and Badge Slots cleared." : ""),
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

  // F3: the position-derived height range (engine accessor — the only route
  // to the table) and the HARD-DISCLOSED build validation. Position unset ⇒
  // the dataset's own range ⇒ pre-F3 behavior, unchanged.
  const heightRange = positionHeightRange(working.build.position);
  const buildValidation = validateBuild(working.build);
  const buildViolationReasons = buildValidation.violations.map(
    (violation) => violation.reason,
  );

  const clearAllFilters = () => {
    setFilters(defaultFilterState());
  };

  return (
    <div className="app">
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

      {/* F5.4 (design-spec §16) — .layout is EXACTLY TWO grid items at L: the
          attributes pane, and everything else. That is not tidiness. A sticky
          grid item is constrained by the grid CONTAINER's content box, so with
          the panels as separate rows the pane's containing block ended at row
          1 — "pinned while you are in the grid". With every non-attribute
          region inside .col-right the container spans from the top of .layout
          to the bottom of the Summary panel: "always on display".

          Below 1280 the pane is NOT RENDERED, .col-right is the only item, and
          the output is bit-identical to before this slice (§16.10). */}
      <div className="layout">
        {isLarge ? (
          // .attr-pane-column is the GRID ITEM and .attr-pane is the sticky box
          // inside it. Presentation only — no landmark, no id, no state. This
          // is F5.2's D1 wrapper, renamed and otherwise untouched: without the
          // stretch the sticky box slides out of the grid and paints over what
          // follows it (measured at doc-y 4660 against a grid ending at 4644).
          <div className="attr-pane-column">
            <div className="attr-pane">
              <aside aria-label="Attributes">
                <AttributesSection
                  attributes={working.build.attributes}
                  onCommit={handleAttributeCommit}
                />
              </aside>
            </div>
          </div>
        ) : null}

        <div className="col-right">
          <aside className="ledger-panel" aria-label="Ledger overview">
            <Section title="Ledger overview" storageKey="section-ledger-overview">
              <div className="ledger-overview">
                {CATEGORIES.map((category) => {
                  const readout = readouts[category];
                  const budget = budgets[category];
                  // PER-METRIC status via the in-grid ledger's OWN string
                  // builders (design-review P0-1): danger + "over by N ⚠"
                  // land ONLY on the metric that is genuinely over — never
                  // color alone, never a red in-budget number.
                  const pointsOverText = overByBadgePoints(readout);
                  const equipSlotsOverText = overByBadgeSlots(readout, budget);
                  const capacityUnset = badgeSlotsCapacityUnset(budget);
                  return (
                    <div key={category} className="ledger-overview__row">
                      <span className="ledger-overview__label">{category}</span>
                      <span className="num ledger-overview__metrics">
                        <span
                          className={
                            pointsOverText !== null
                              ? "ledger-over ledger-overview__points"
                              : "ledger-overview__points"
                          }
                        >
                          {readout.spent}/{budget.points}
                          {pointsOverText !== null ? ` ${pointsOverText}` : ""}
                        </span>
                        {" · "}
                        <span
                          className={
                            equipSlotsOverText !== null
                              ? "ledger-over ledger-overview__capacity"
                              : "ledger-overview__capacity"
                          }
                        >
                          {readout.equipSlotsUsed}/{capacityUnset ? "—" : budget.equipSlots}
                          {equipSlotsOverText !== null ? ` ${equipSlotsOverText}` : ""}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          </aside>

          {/* Physique and Badge Points/Slots are SET-UP surfaces, not loop
              surfaces: position and height are one opening gesture, and the
              twelve budget fields are filled by hand from the MyPlayer
              builder and then not touched again. Above the FilterBar on
              §13.5's causality argument run in reverse — you set the pools
              BEFORE you shop for badges (§16.5). */}
          <aside className="setup-panel" aria-label="Build">
            {/* [A5] `budgets` here is the BASE record, never the composed
                one. The grid is a base-ENTRY surface and `onBudgetCommit`
                below writes straight back into the base; rendering the
                effective number would compound it on every blur. Test 6.6.
                F5.4 RELOCATED this call site out of the dissolved left rail
                into `.setup-panel`; the prop travelled with it. */}
            <BuildPanel
              build={working.build}
              budgets={baseBudgets}
              compact={!isLarge}
              withAttributes={!isLarge}
              heightRange={heightRange}
              buildViolationReasons={buildViolationReasons}
              clampNotice={clampNotice}
              onHeightCommit={(heightInches) => {
                // Fields commit on EVERY blur — a no-change commit is a no-op
                // (returning prev), so tabbing through never marks dirty.
                const changed = workingRef.current.build.heightInches !== heightInches;
                applyEdit((prev) =>
                  prev.build.heightInches === heightInches
                    ? prev
                    : { ...prev, build: { ...prev.build, heightInches } },
                );
                // A height change ends the clamp notice's hold (§3.3 rev 3).
                if (changed) setClampNotice(null);
              }}
              onPositionChange={handlePositionChange}
              onAttributeCommit={handleAttributeCommit}
              onResetRequest={() => {
                setResetOpen(true);
              }}
              canReset={playerHasContent(working)}
              onBudgetCommit={(category, field, value) => {
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
              }}
            />
          </aside>

          <main id="badge-grid">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              shownCount={shownCount}
              totalCount={shippedDataset.badges.length}
            />
            <JumpNav
              panelAnchors={[
                { id: "panel-synergy", label: "Synergy" },
                { id: "panel-summary", label: "Summary" },
              ]}
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
                          <li key={badge.id}>
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

          <div id="panel-synergy">
            <Section title="Synergy Slots" storageKey="section-synergy">
              <SynergyPanel
                synergySlots={working.synergy}
                loadout={working.loadout}
                dataset={shippedDataset}
                overlay={overlay}
                ratifiedMagnitudeNormalized={ratifiedMagnitudeNormalized}
                onSynergySlotsChange={setSynergySlots}
              />
            </Section>
          </div>

          <div id="panel-summary">
            <Section title="Summary" storageKey="section-summary">
              <SummaryPanel
                loadout={working.loadout}
                synergySlots={working.synergy}
                budgets={budgets}
                readouts={readouts}
                validation={validation}
                dataset={shippedDataset}
                // F8-S2 wiring, and it is why App.tsx is in this slice's
                // allowlist: `buildSummary(ledgerState, build, dataset)`
                // needs the committed ledger state and the build, and M4
                // omitted exactly this class of wiring and had to be
                // ratified post-hoc [state.json 2026-08-26].
                summary={loadoutSummary}
                synergy={synergyRows}
                buildName={working.name}
              />
              {/* §11.5 ⑤ (rev 5): the right-rail Export/Import pair is GONE —
                  a ratified rev-2 §3.6 clause that never shipped (~198px of
                  min-content in a 142px rail box). The header pair above is
                  the only one; tests/layout-arithmetic.test.ts pins this. */}
            </Section>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <span className="num">dataset {shippedDataset.dataVersion}</span> ·{" "}
        {shippedDataset.source} · as of {shippedDataset.asOf} · confidence:{" "}
        {shippedDataset.confidence}
      </footer>

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
  );
}
