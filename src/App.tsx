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
import { shippedDataset } from "./engine/dataset";
import { levelPasses, validateBadge } from "./engine/eligibility";
import { whatIf } from "./engine/cost";
import {
  SAVED_BUILD_SCHEMA_VERSION,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "./engine/serialization";
import type { ClearedSynergyRef } from "./engine/serialization";
import { createDefaultSynergySlots, defaultOverlay } from "./engine/synergy";
import type { SynergyState } from "./engine/synergy";
import { categoryLedgerAt } from "./engine/synergy-ledger";
import type { CategoryLedgerReadout, SynergyLedgerState } from "./engine/synergy-ledger";
import { positionHeightRange, validateBuild } from "./engine/validate-build";
import { validateLoadout } from "./engine/validate-loadout";
import type {
  AppConfig,
  Badge,
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
  listNamedBuilds,
  newBuildId,
  readAutosaveWithReport,
  readNamedBuild,
  readNamedBuildWithReport,
  renameNamedBuild,
  saveNamedBuild,
  deleteNamedBuild,
  writeAutosave,
} from "./persist/local-storage";
import type { NamedBuildSummary } from "./persist/local-storage";
import { BuildPanel } from "./ui/build/BuildPanel";
import type { HeightClampNotice } from "./ui/build/BuildPanel";
import { BuildManagerDialog, BuildSwitcher } from "./ui/builds/BuildManager";
import { BadgeCard } from "./ui/grid/BadgeCard";
import { BadgeGridSection } from "./ui/grid/BadgeGridSection";
import {
  CategoryLedger,
  badgeSlotsCapacityUnset,
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
import { Section } from "./ui/primitives/Section";
import { Toggle } from "./ui/primitives/Toggle";
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
  budgets: Record<Category, Budget>;
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
    loadout: [],
    synergy: createDefaultSynergySlots(defaultAppConfig.plusTwoSlotIds),
    config: defaultAppConfig,
  };
}

function fromSaved(saved: SavedBuild, sourceId: string | null): WorkingState {
  return {
    name: saved.name,
    sourceId,
    dataVersion: saved.dataVersion,
    build: saved.build,
    budgets: saved.budgets,
    loadout: saved.loadout,
    synergy: saved.synergy,
    config: saved.config,
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
    working.synergy.some(
      (synergySlot) =>
        synergySlot.unlocked ||
        synergySlot.fuseBadgeId !== null ||
        synergySlot.reactionBadgeId !== null,
    )
  );
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
function downloadBuildJson(envelope: SavedBuild): void {
  if (typeof URL.createObjectURL !== "function") return; // jsdom guard
  const blob = new Blob([serializeSavedBuild(envelope)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${envelope.name}-${envelope.dataVersion}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  /** Boot read happens ONCE, with the H8 drift report: `droppedEntries`
   * lists loadout entries the deserializer stripped because their badge id
   * left the dataset — disclosed below, never a crash (F1 boot backstop). */
  const [boot] = useState(() => readAutosaveWithReport());
  const [working, setWorkingState] = useState<WorkingState>(() =>
    boot === null ? freshWorkingState() : fromSaved(boot.saved, null),
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
  const [autosaveFailed, setAutosaveFailed] = useState(false);
  const [autosaveDismissed, setAutosaveDismissed] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [namedBuilds, setNamedBuilds] = useState<NamedBuildSummary[]>(() => listNamedBuilds());
  /** The two DISPLAY-ONLY overlays (H2). Session state — previews are never
   * persisted as if they were plan state. */
  const [overlay, setOverlay] = useState<OverlayState>(defaultOverlay);
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [importState, setImportState] = useState<ImportDialogState | null>(null);
  /** H8 disclosure: loadout entries stripped at the deserialize boundary
   * because their badge id no longer exists in the current dataset. */
  const [droppedEntries, setDroppedEntries] = useState<readonly LoadoutEntry[]>(
    boot?.droppedEntries ?? [],
  );
  /** F2.1 heal disclosure: synergy assignments cleared at the deserialize
   * boundary because they referenced a badge not in the build's loadout (the
   * pre-F2 remove path wrote exactly this state). */
  const [clearedSynergyRefs, setClearedSynergyRefs] = useState<readonly ClearedSynergyRef[]>(
    boot?.clearedSynergyRefs ?? [],
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

  /** EVERY working-state mutation flows through here (write-through ref). */
  const applyWorking = useCallback(
    (update: WorkingState | ((prev: WorkingState) => WorkingState)) => {
      const next = typeof update === "function" ? update(workingRef.current) : update;
      workingRef.current = next;
      setWorkingState(next);
    },
    [],
  );

  /** A user EDIT (as opposed to a load/import/save): marks the state dirty.
   * An updater returning `prev` unchanged is a no-op and marks nothing. */
  const applyEdit = useCallback((update: (prev: WorkingState) => WorkingState) => {
    const prev = workingRef.current;
    const next = update(prev);
    if (next === prev) return;
    workingRef.current = next;
    setWorkingState(next);
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    setDirty(false);
  }, []);

  // ---- autosave: every change writes; a throwing setItem surfaces the
  // role="alert" banner and never crashes (tech-strategy §9). A SUCCESSFUL
  // write re-arms the dismissed banner: dismissal is per failure epoch,
  // never per session. ----
  useEffect(() => {
    const result = writeAutosave(toEnvelope(working));
    setAutosaveFailed(!result.ok);
    if (result.ok) setAutosaveDismissed(false);
  }, [working]);

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
  const budgets = deriveBudget(working.build, working.budgets, working.config.budgetStrategy);

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
    }),
    [working.loadout, budgets, working.synergy, working.config.refundTrigger],
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
    setNamedBuilds(listNamedBuilds());
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
      applyWorking(fromSaved(report.saved, id));
      markClean();
      // The load is its own disclosure ROUTE (same as boot and import):
      // REPLACE any stale prior-route report with this build's own — empty
      // for a clean build, so a leftover banner can never describe a build
      // it does not belong to.
      setDroppedEntries(report.droppedEntries);
      setClearedSynergyRefs(report.clearedSynergyRefs);
      setDisclosureEpoch((epoch) => epoch + 1);
      // The clamp notice belongs to an edit gesture, not to the new build.
      setClampNotice(null);
      setManagerOpen(false);
    },
    [applyWorking, markClean],
  );

  const saveAsNew = useCallback(
    (name: string) => {
      const id = newBuildId();
      const finalName = uniqueBuildName(name, takenNames());
      const result = saveNamedBuild(id, toEnvelope({ ...workingRef.current, name: finalName }));
      if (result.ok) {
        applyWorking((prev) => ({ ...prev, name: finalName, sourceId: id }));
        markClean();
      } else {
        setAutosaveFailed(true);
      }
      refreshNamedBuilds();
    },
    [applyWorking, markClean, refreshNamedBuilds, takenNames],
  );

  const duplicateBuild = useCallback(
    (id: string) => {
      const saved = readNamedBuild(id);
      if (saved === null) return;
      const copyId = newBuildId();
      const result = saveNamedBuild(copyId, {
        ...saved,
        name: uniqueBuildName(`${saved.name} copy`, takenNames()),
        savedAt: new Date().toISOString(),
      });
      if (!result.ok) setAutosaveFailed(true);
      refreshNamedBuilds();
    },
    [refreshNamedBuilds, takenNames],
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
      applyWorking(fromSaved(saved, null));
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
    [applyWorking, importState],
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
        badgesByCategory.get(category) ?? [],
        working.build,
        working.loadout,
        readouts[category].remainingPoints,
        shippedDataset,
      ),
    ]),
  ) as Record<Category, CategoryFeasibility>;

  const validation = validateLoadout(ledgerState);

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

      <div className="layout">
        <aside className="rail-left" aria-label="Build">
          <BuildPanel
            build={working.build}
            budgets={budgets}
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
                  header={(headingId) => (
                    <CategoryLedger
                      category={category}
                      readout={readout}
                      budget={budget}
                      headingId={headingId}
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

        <aside className="rail-right" aria-label="Ledger and synergy">
          <div className="rail-right__overview">
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
                      <span>{category}</span>
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
          </div>
          <div id="panel-synergy">
            <Section title="Synergy Slots" storageKey="section-synergy">
              <SynergyPanel
                synergySlots={working.synergy}
                loadout={working.loadout}
                dataset={shippedDataset}
                overlay={overlay}
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
              />
              <ExportImportControls onExport={exportNow} onImportFile={importFile} />
            </Section>
          </div>
        </aside>
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
      />

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
