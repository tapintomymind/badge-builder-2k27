/**
 * Serializer tests (H8 + migration seam). Pure string ↔ object only — the
 * assertions here also pin that `synergy` round-trips OPAQUELY (type-only at
 * M1) and that recheckEligibility recomputes against the CURRENT dataset.
 */

import { describe, expect, it } from "vitest";
import { loadDataset, shippedDataset, shippedRawDataset } from "../src/engine/dataset";
import { recheckEligibility } from "../src/engine/eligibility";
import { UnsupportedSchemaVersionError } from "../src/engine/errors";
import {
  createSavedBuild,
  deserializeSavedBuild,
  serializeSavedBuild,
} from "../src/engine/serialization";
import type { Budget, RawBadgeDataset, SavedBuild, SynergySlot } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { defaultAppConfig } from "../src/config";
import { makeBuild } from "./helpers/test-utils";

function makeBudgets(): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { points: 12, equipSlots: 3 }]),
  ) as Record<Category, Budget>;
}

/** All 8 synergy slots, unassigned — seed: Synergy system (1–4 temporary, 5–8 permanent). */
function makeSynergy(): SynergySlot[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((id) => ({
    id,
    unlocked: false,
    permanence: id <= 4 ? "temporary" : "permanent",
    magnitude: 1,
    fuseBadgeId: null,
    reactionBadgeId: null,
  }));
}

function makeSaved(): SavedBuild {
  // A plan that genuinely holds against the shipped dataset:
  // deadeye gold needs 92 Mid (build has 92); glove gold needs 93 Steal (93).
  return createSavedBuild(
    {
      name: "test build",
      build: makeBuild(78, 85, { mid: 92, steal: 93 }),
      budgets: makeBudgets(),
      loadout: [
        { badgeId: "deadeye", purchasedLevel: "gold" },
        { badgeId: "glove", purchasedLevel: "gold" },
      ],
      synergy: makeSynergy(),
      config: defaultAppConfig,
    },
    shippedDataset,
    "2026-08-25T12:00:00.000Z",
  );
}

describe("SavedBuild serializer: pure string ↔ object", () => {
  it("createSavedBuild stamps schemaVersion 1 and the dataset's dataVersion (H8)", () => {
    const saved = makeSaved();
    expect(saved.schemaVersion).toBe(1);
    expect(saved.dataVersion).toBe(shippedDataset.dataVersion);
    expect(saved.dataVersion).toBe("2026-08-25.1");
  });

  it("round-trips to an identical object", () => {
    const saved = makeSaved();
    expect(deserializeSavedBuild(serializeSavedBuild(saved))).toEqual(saved);
  });

  it("round-trips synergy OPAQUELY — the M1 serializer applies zero synergy behavior, unknown future fields included", () => {
    const saved = makeSaved();
    // Simulate a future writer adding a field the M1 type does not know about.
    const withExtra = {
      ...saved,
      synergy: saved.synergy.map((entry) => ({ ...entry, futureField: "opaque" })),
    };
    const roundTripped = deserializeSavedBuild(serializeSavedBuild(withExtra as SavedBuild));
    expect(roundTripped.synergy).toEqual(withExtra.synergy);
  });

  it("throws UnsupportedSchemaVersionError on a FUTURE schemaVersion — never auto-migrates silently", () => {
    const text = serializeSavedBuild(makeSaved()).replace('"schemaVersion":1', '"schemaVersion":2');
    expect(() => deserializeSavedBuild(text)).toThrowError(UnsupportedSchemaVersionError);
  });

  it("throws UnsupportedSchemaVersionError on an UNKNOWN past version with no registered migration", () => {
    const text = serializeSavedBuild(makeSaved()).replace('"schemaVersion":1', '"schemaVersion":0');
    expect(() => deserializeSavedBuild(text)).toThrowError(UnsupportedSchemaVersionError);
  });

  it("throws on a non-envelope payload", () => {
    expect(() => deserializeSavedBuild('"just a string"')).toThrowError(
      UnsupportedSchemaVersionError,
    );
    expect(() => deserializeSavedBuild('{"name":"no version"}')).toThrowError(
      UnsupportedSchemaVersionError,
    );
  });
});

describe("recheckEligibility (H8 drift action, engine half — consumed by M3's DriftBanner)", () => {
  it("returns [] when the saved plan still holds against the current dataset", () => {
    expect(recheckEligibility(makeSaved(), shippedDataset)).toEqual([]);
  });

  it("RECOMPUTES against the current dataset (no diff against the old one): a raised threshold surfaces the badge with its new max", () => {
    // Synthetic drift: clone the shipped raw dataset and raise Deadeye's Gold
    // threshold from 92 to 95, above the build's 92 Mid. (Test-local
    // simulation of a future 2K patch — never written to badges.json.)
    const drifted = structuredClone(shippedRawDataset) as RawBadgeDataset;
    const deadeye = drifted.badges.find((badge) => badge.id === "deadeye");
    for (const line of deadeye!.requirements.attrs) {
      line.perLevel = [65, 85, 95, 99];
    }
    drifted.dataVersion = "2027-01-01.1";
    const current = loadDataset(drifted);

    const report = recheckEligibility(makeSaved(), current);
    expect(report).toEqual([
      {
        badgeId: "deadeye",
        purchasedLevel: "gold",
        maxPurchasableLevel: "silver", // build has 92 Mid: gold now needs 95
        heightBlocked: false,
      },
    ]);
  });

  it("reports a now-height-blocked badge with heightBlocked: true", () => {
    const drifted = structuredClone(shippedRawDataset) as RawBadgeDataset;
    const glove = drifted.badges.find((badge) => badge.id === "glove");
    glove!.requirements.heightMinInches = 80; // build is 78
    const current = loadDataset(drifted);

    const report = recheckEligibility(makeSaved(), current);
    expect(report).toEqual([
      {
        badgeId: "glove",
        purchasedLevel: "gold",
        maxPurchasableLevel: null,
        heightBlocked: true,
      },
    ]);
  });

  it("reports a badge id that vanished from the current dataset (it no longer qualifies at any level)", () => {
    const drifted = structuredClone(shippedRawDataset) as RawBadgeDataset;
    drifted.badges = drifted.badges.filter((badge) => badge.id !== "glove");
    const current = loadDataset(drifted);

    const report = recheckEligibility(makeSaved(), current);
    expect(report).toEqual([
      {
        badgeId: "glove",
        purchasedLevel: "gold",
        maxPurchasableLevel: null,
        heightBlocked: false,
      },
    ]);
  });
});
