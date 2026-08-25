/**
 * App shell (M3) — wires the build panel, badge grid, category ledgers, and
 * persistence UI to the engine. CONTAINS ZERO RULES: every number rendered
 * anywhere below comes from src/engine/ (ledger readouts, eligibility,
 * costs, effective levels) or from user input routed through the
 * src/config/ deriveBudget seam.
 *
 * HARD CONTRACT: every card renders via effectiveLevel(state, badgeId,
 * defaultOverlay) — never purchasedLevel — so M4's synergy panel is a panel
 * addition, not a card rewrite.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultAppConfig, deriveBudget } from "./config";
import { shippedDataset } from "./engine/dataset";
import { levelPasses, validateBadge } from "./engine/eligibility";
import { SAVED_BUILD_SCHEMA_VERSION, serializeSavedBuild } from "./engine/serialization";
import { createDefaultSynergySlots, defaultOverlay } from "./engine/synergy";
import type { SynergyState } from "./engine/synergy";
import { categoryLedgerAt } from "./engine/synergy-ledger";
import type { SynergyLedgerState } from "./engine/synergy-ledger";
import type {
  AppConfig,
  Badge,
  Budget,
  Build,
  LoadoutEntry,
  SavedBuild,
  SynergySlot,
} from "./engine/types";
import type { Attr, Category, PurchasableLevel } from "./engine/vocabulary";
import { ATTRS, CATEGORIES, PURCHASABLE_LEVELS } from "./engine/vocabulary";
import {
  listNamedBuilds,
  newBuildId,
  readAutosave,
  readNamedBuild,
  renameNamedBuild,
  saveNamedBuild,
  deleteNamedBuild,
  writeAutosave,
} from "./persist/local-storage";
import type { NamedBuildSummary } from "./persist/local-storage";
import { BuildPanel } from "./ui/build/BuildPanel";
import type { Position } from "./ui/build/BuildPanel";
import { BuildManagerDialog, BuildSwitcher } from "./ui/builds/BuildManager";
import { BadgeCard } from "./ui/grid/BadgeCard";
import { BadgeGridSection } from "./ui/grid/BadgeGridSection";
import { CategoryLedger } from "./ui/grid/CategoryLedger";
import { JumpNav } from "./ui/grid/JumpNav";
import { AppHeader } from "./ui/shell/AppHeader";
import { AutosaveWarning } from "./ui/shell/AutosaveWarning";
import { DriftBanner } from "./ui/shell/DriftBanner";
import { Section } from "./ui/primitives/Section";

/** The dataset's own height coverage — the clamp range is DERIVED, never
 * authored here. */
const HEIGHT_RANGE = {
  minInches: Math.min(...shippedDataset.badges.map((b) => b.requirements.heightMinInches)),
  maxInches: Math.max(...shippedDataset.badges.map((b) => b.requirements.heightMaxInches)),
};

/** Zero-state height: the midpoint of the dataset's range, floored — 6'6"
 * (78 in) for the shipped 69–88 dataset, exactly the design-spec §5.4 ruled
 * default. A UI default, not a claim about 2K. */
const DEFAULT_HEIGHT_INCHES = Math.floor(
  (HEIGHT_RANGE.minInches + HEIGHT_RANGE.maxInches) / 2,
);

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

/** File download of the current build — the AutosaveWarning escape hatch.
 * A Blob + <a download>, no network, no storage (tech-strategy §9). */
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
  const [working, setWorking] = useState<WorkingState>(() => {
    const autosaved = readAutosave();
    return autosaved === null ? freshWorkingState() : fromSaved(autosaved, null);
  });
  const [autosaveFailed, setAutosaveFailed] = useState(false);
  const [autosaveDismissed, setAutosaveDismissed] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [namedBuilds, setNamedBuilds] = useState<NamedBuildSummary[]>(() => listNamedBuilds());

  // ---- autosave: every change writes; a throwing setItem surfaces the
  // role="alert" banner and never crashes (tech-strategy §9). ----
  useEffect(() => {
    const result = writeAutosave(toEnvelope(working));
    setAutosaveFailed(!result.ok);
  }, [working]);

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
  const setLevel = useCallback((badgeId: string, level: PurchasableLevel | null) => {
    setWorking((prev) => {
      const rest = prev.loadout.filter((entry) => entry.badgeId !== badgeId);
      return {
        ...prev,
        loadout: level === null ? rest : [...rest, { badgeId, purchasedLevel: level }],
      };
    });
  }, []);

  const cycleBadge = useCallback((badgeId: string) => {
    setWorking((prev) => {
      const badge = shippedDataset.badges.find((candidate) => candidate.id === badgeId);
      if (badge === undefined) return prev;
      const eligibility = validateBadge(badge, prev.build);
      if (!eligibility.allowed) return prev;
      const purchasable = PURCHASABLE_LEVELS.filter((level) =>
        levelPasses(badge.requirements, prev.build, level),
      );
      if (purchasable.length === 0) return prev;
      const sequence: (PurchasableLevel | null)[] = [null, ...purchasable];
      const current = prev.loadout.find((entry) => entry.badgeId === badgeId)?.purchasedLevel ?? null;
      const nextIndex = (sequence.indexOf(current) + 1) % sequence.length;
      const next = sequence[nextIndex] ?? null;
      const rest = prev.loadout.filter((entry) => entry.badgeId !== badgeId);
      return {
        ...prev,
        loadout: next === null ? rest : [...rest, { badgeId, purchasedLevel: next }],
      };
    });
  }, []);

  // ---- named builds ----
  const refreshNamedBuilds = useCallback(() => {
    setNamedBuilds(listNamedBuilds());
  }, []);

  const loadBuild = useCallback((id: string) => {
    const saved = readNamedBuild(id);
    if (saved !== null) {
      setWorking(fromSaved(saved, id));
      setManagerOpen(false);
    }
  }, []);

  const saveAsNew = useCallback(
    (name: string) => {
      const id = newBuildId();
      const result = saveNamedBuild(id, toEnvelope({ ...working, name }));
      if (result.ok) {
        setWorking((prev) => ({ ...prev, name, sourceId: id }));
      } else {
        setAutosaveFailed(true);
      }
      refreshNamedBuilds();
    },
    [working, refreshNamedBuilds],
  );

  const duplicateBuild = useCallback(
    (id: string) => {
      const saved = readNamedBuild(id);
      if (saved === null) return;
      const copyId = newBuildId();
      const result = saveNamedBuild(copyId, {
        ...saved,
        name: `${saved.name} copy`,
        savedAt: new Date().toISOString(),
      });
      if (!result.ok) setAutosaveFailed(true);
      refreshNamedBuilds();
    },
    [refreshNamedBuilds],
  );

  const removeBuild = useCallback(
    (id: string) => {
      deleteNamedBuild(id);
      if (working.sourceId === id) {
        setWorking((prev) => ({ ...prev, sourceId: null }));
      }
      refreshNamedBuilds();
    },
    [working.sourceId, refreshNamedBuilds],
  );

  const renameBuild = useCallback(
    (id: string, name: string) => {
      renameNamedBuild(id, name);
      if (working.sourceId === id) {
        setWorking((prev) => ({ ...prev, name }));
      }
      refreshNamedBuilds();
    },
    [working.sourceId, refreshNamedBuilds],
  );

  const exportNow = useCallback(() => {
    downloadBuildJson(toEnvelope(working));
  }, [working]);

  // ---- render ----
  const readouts = Object.fromEntries(
    CATEGORIES.map((category) => [category, categoryLedgerAt(ledgerState, "current", category)]),
  ) as Record<Category, ReturnType<typeof categoryLedgerAt>>;

  return (
    <div className="app">
      <a className="skip-link" href="#badge-grid">
        Skip to badge grid
      </a>
      <AppHeader dataset={shippedDataset}>
        <BuildSwitcher
          builds={namedBuilds}
          currentName={working.name}
          currentSourceId={working.sourceId}
          onSelect={loadBuild}
          onOpenManager={() => {
            setManagerOpen(true);
          }}
        />
      </AppHeader>

      <div className="app-banners">
        <DriftBanner saved={toEnvelope(working)} currentDataset={shippedDataset} />
        {autosaveFailed && !autosaveDismissed ? (
          <AutosaveWarning
            onExport={exportNow}
            onDismiss={() => {
              setAutosaveDismissed(true);
            }}
          />
        ) : null}
      </div>

      <div className="layout">
        <aside className="rail-left" aria-label="Build">
          <BuildPanel
            build={working.build}
            budgets={budgets}
            heightRange={HEIGHT_RANGE}
            onHeightCommit={(heightInches) => {
              setWorking((prev) => ({ ...prev, build: { ...prev.build, heightInches } }));
            }}
            onPositionChange={(position: Position) => {
              setWorking((prev) => ({ ...prev, build: { ...prev.build, position } }));
            }}
            onAttributeCommit={(attr: Attr, value: number) => {
              setWorking((prev) => ({
                ...prev,
                build: {
                  ...prev.build,
                  attributes: { ...prev.build.attributes, [attr]: value },
                },
              }));
            }}
            onBudgetCommit={(category, field, value) => {
              setWorking((prev) => ({
                ...prev,
                budgets: {
                  ...prev.budgets,
                  [category]: { ...prev.budgets[category], [field]: value },
                },
              }));
            }}
          />
        </aside>

        <main id="badge-grid">
          <JumpNav />
          {CATEGORIES.map((category) => {
            const readout = readouts[category];
            const budget = budgets[category];
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
                  />
                )}
              >
                {(badgesByCategory.get(category) ?? []).map((badge) => {
                  const purchased = working.loadout.some(
                    (entry) => entry.badgeId === badge.id,
                  );
                  return (
                    <li key={badge.id}>
                      <BadgeCard
                        badge={badge}
                        build={working.build}
                        eligibility={validateBadge(badge, working.build)}
                        synergyState={synergyState}
                        overlay={defaultOverlay}
                        dataset={shippedDataset}
                        overBadgeSlotsIfBought={
                          // Warn only against an ENTERED capacity (0 = unset
                          // — warning about exceeding an unset budget is
                          // noise, not disclosure).
                          !purchased &&
                          budget.equipSlots > 0 &&
                          readout.equipSlotsUsed >= budget.equipSlots
                        }
                        onSetLevel={setLevel}
                        onCycle={cycleBadge}
                      />
                    </li>
                  );
                })}
              </BadgeGridSection>
            );
          })}
        </main>

        <aside className="rail-right" aria-label="Ledger and synergy">
          <Section title="Ledger overview" storageKey="section-ledger-overview">
            <div className="ledger-overview">
              {CATEGORIES.map((category) => {
                const readout = readouts[category];
                const budget = budgets[category];
                const over =
                  readout.remainingPoints < 0 || readout.equipSlotsUsed > budget.equipSlots;
                return (
                  <div key={category} className="ledger-overview__row">
                    <span>{category}</span>
                    <span className={`num${over ? " ledger-over" : ""}`}>
                      {readout.spent}/{budget.points} · {readout.equipSlotsUsed}/
                      {budget.equipSlots}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
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
    </div>
  );
}
