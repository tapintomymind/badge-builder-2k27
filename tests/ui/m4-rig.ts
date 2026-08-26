/**
 * Shared M4 test rig: builds SavedBuild envelopes with real synergy state
 * and seeds them through the autosave path, so App-level tests exercise the
 * exact load path the user's builds take. All values flow through the engine
 * once rendered — nothing here bypasses a rule.
 */

import { defaultAppConfig } from "../../src/config";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { Budget, SavedBuild, SynergySlot } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { zeroBonus } from "../../src/engine/budget";
import { shippedDataset } from "../../src/engine/dataset";
import { makeBuild } from "../helpers/test-utils";

export function budgetsWith(overrides: Partial<Record<Category, Budget>>): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, overrides[category] ?? { equipSlots: 0, points: 0 }]),
  ) as Record<Category, Budget>;
}

export interface RigOptions {
  attributes?: Parameters<typeof makeBuild>[2];
  budgets?: Partial<Record<Category, Budget>>;
  loadout?: SavedBuild["loadout"];
  /** Per-synergy-slot patches keyed by synergy slot id. */
  synergyPatches?: Partial<Record<number, Partial<SynergySlot>>>;
  dataVersion?: string;
  name?: string;
}

export function makeRig(options: RigOptions = {}): SavedBuild {
  const synergy = createDefaultSynergySlots(null).map((synergySlot) => ({
    ...synergySlot,
    ...(options.synergyPatches?.[synergySlot.id] ?? {}),
  }));
  return {
    schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
    dataVersion: options.dataVersion ?? shippedDataset.dataVersion,
    savedAt: "2026-08-25T12:00:00.000Z",
    name: options.name ?? "M4 rig",
    build: makeBuild(78, 0, options.attributes ?? {}),
    budgets: budgetsWith(options.budgets ?? {}),
    bonus: zeroBonus(),
    loadout: options.loadout ?? [],
    synergy,
    // [F4/A4, revised F16.1] The trigger is passed EXPLICITLY and as a
    // LITERAL, never inherited from DEFAULT_REFUND_TRIGGER: a behavioural
    // fixture that rides the default silently re-bases its arithmetic on every
    // future flip. That instinct stands. The VALUE it pinned does not.
    //
    // F4/A4 pinned "legendByAnyMeans" here, and that is why F16.1's defect was
    // invisible for a day: every App-level fixture in the suite ran a trigger
    // no user can reach, so the ratified `onFuse` was never once evaluated
    // through the UI path — the engine was tested directly and the UI path was
    // not. It is now moot as well as wrong: App.tsx's `fromSaved` re-derives
    // the ratified trigger at load (`applyRatifiedRefundTrigger`), so any
    // other value written here is overridden before a component renders.
    //
    // THE ALTERNATES LOSE NO COVERAGE — they are exercised where they are
    // reachable, at the engine: tests/ledger.test.ts, tests/synergy-ledger.ts,
    // tests/steps.test.ts and randomize's INV-11 all drive all four triggers
    // directly. tests/config.test.ts is still the ONLY file permitted to
    // assert the default.
    config: { ...defaultAppConfig, refundTrigger: "onFuse" as const },
  };
}
