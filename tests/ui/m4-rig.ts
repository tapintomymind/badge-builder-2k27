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
    loadout: options.loadout ?? [],
    synergy,
    // [F4/A4] The trigger is passed EXPLICITLY, never inherited from
    // DEFAULT_REFUND_TRIGGER. F4 flipped that default to "onFuse"; a
    // behavioural fixture that rides the default silently re-bases its
    // arithmetic on every future flip. tests/config.test.ts is the ONLY
    // file permitted to assert the default.
    config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
  };
}
