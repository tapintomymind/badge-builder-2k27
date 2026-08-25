/**
 * Serializer tests (H8 + migration seam). Pure string ↔ object only — the
 * assertions here also pin that `synergy` round-trips OPAQUELY (type-only at
 * M1) and that recheckEligibility recomputes against the CURRENT dataset.
 */

import { describe, expect, it } from "vitest";
import { loadDataset, shippedDataset, shippedRawDataset } from "../src/engine/dataset";
import { driftFromDroppedEntries, recheckEligibility } from "../src/engine/eligibility";
import { MalformedSavedBuildError, UnsupportedSchemaVersionError } from "../src/engine/errors";
import {
  createSavedBuild,
  deserializeSavedBuild,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "../src/engine/serialization";
import { validateBuild } from "../src/engine/validate-build";
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
        droppedFromDataset: false,
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
        droppedFromDataset: false,
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
        droppedFromDataset: true,
      },
    ]);
  });

  it("driftFromDroppedEntries maps the deserializer's droppedEntries into the SAME drift-report shape", () => {
    expect(
      driftFromDroppedEntries([
        { badgeId: "vanished-badge", purchasedLevel: "hof" },
        { badgeId: "another-gone", purchasedLevel: "bronze" },
      ]),
    ).toEqual([
      {
        badgeId: "vanished-badge",
        purchasedLevel: "hof",
        maxPurchasableLevel: null,
        heightBlocked: false,
        droppedFromDataset: true,
      },
      {
        badgeId: "another-gone",
        purchasedLevel: "bronze",
        maxPurchasableLevel: null,
        heightBlocked: false,
        droppedFromDataset: true,
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// F1 item 1 — FULL body validation at the JSON boundary (H6). Every case in
// the first describe is a pinning test that FAILS on the pre-fix code (which
// validated only schemaVersion + dataVersion and cast the body through).
// ---------------------------------------------------------------------------

/** Serialize the valid fixture, apply a raw-JSON mutation, restringify. */
function corrupt(mutate: (envelope: Record<string, unknown>) => void): string {
  const envelope = JSON.parse(serializeSavedBuild(makeSaved())) as Record<string, unknown>;
  mutate(envelope);
  return JSON.stringify(envelope);
}

describe("deserializeSavedBuild — malformed bodies throw MalformedSavedBuildError, never cast through", () => {
  it("rejects purchasedLevel 'legend' — Legend is boost-only and can never be purchased", () => {
    const text = corrupt((envelope) => {
      (envelope["loadout"] as Record<string, unknown>[])[0]!["purchasedLevel"] = "legend";
    });
    expect(() => deserializeSavedBuild(text)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects a non-canonical purchasedLevel string ('Gold') — the silent-NaN import shape", () => {
    const text = corrupt((envelope) => {
      (envelope["loadout"] as Record<string, unknown>[])[0]!["purchasedLevel"] = "Gold";
    });
    expect(() => deserializeSavedBuild(text)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects duplicate loadout rows for one badge id — the silent double-count shape", () => {
    const text = corrupt((envelope) => {
      const loadout = envelope["loadout"] as Record<string, unknown>[];
      loadout.push({ badgeId: "deadeye", purchasedLevel: "silver" });
    });
    expect(() => deserializeSavedBuild(text)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects a bodyless envelope ({schemaVersion, dataVersion} only) — the confirm-crash shape", () => {
    expect(() =>
      deserializeSavedBuild('{"schemaVersion":1,"dataVersion":"2026-08-25.1"}'),
    ).toThrowError(MalformedSavedBuildError);
  });

  it("rejects junk attributes: missing key, out-of-range value, non-numeric value", () => {
    const missingKey = corrupt((envelope) => {
      const build = envelope["build"] as Record<string, unknown>;
      delete (build["attributes"] as Record<string, unknown>)["mid"];
    });
    expect(() => deserializeSavedBuild(missingKey)).toThrowError(MalformedSavedBuildError);

    const outOfRange = corrupt((envelope) => {
      const build = envelope["build"] as Record<string, unknown>;
      (build["attributes"] as Record<string, unknown>)["mid"] = 120;
    });
    expect(() => deserializeSavedBuild(outOfRange)).toThrowError(MalformedSavedBuildError);

    const nonNumeric = corrupt((envelope) => {
      const build = envelope["build"] as Record<string, unknown>;
      (build["attributes"] as Record<string, unknown>)["mid"] = "92";
    });
    expect(() => deserializeSavedBuild(nonNumeric)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects a non-numeric heightInches", () => {
    const text = corrupt((envelope) => {
      (envelope["build"] as Record<string, unknown>)["heightInches"] = "tall";
    });
    expect(() => deserializeSavedBuild(text)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects negative budgets and a missing budget category", () => {
    const negative = corrupt((envelope) => {
      const budgets = envelope["budgets"] as Record<string, Record<string, unknown>>;
      budgets["Finishing"]!["points"] = -4;
    });
    expect(() => deserializeSavedBuild(negative)).toThrowError(MalformedSavedBuildError);

    const missing = corrupt((envelope) => {
      const budgets = envelope["budgets"] as Record<string, unknown>;
      delete budgets["Defense"];
    });
    expect(() => deserializeSavedBuild(missing)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects junk config (unknown refundTrigger, unknown budgetStrategy, missing config)", () => {
    const badTrigger = corrupt((envelope) => {
      (envelope["config"] as Record<string, unknown>)["refundTrigger"] = "whenever";
    });
    expect(() => deserializeSavedBuild(badTrigger)).toThrowError(MalformedSavedBuildError);

    const badStrategy = corrupt((envelope) => {
      (envelope["config"] as Record<string, unknown>)["budgetStrategy"] = "vibes";
    });
    expect(() => deserializeSavedBuild(badStrategy)).toThrowError(MalformedSavedBuildError);

    const noConfig = corrupt((envelope) => {
      delete envelope["config"];
    });
    expect(() => deserializeSavedBuild(noConfig)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects junk synergy shapes: non-array, duplicate ids, magnitude 3, wrong permanence", () => {
    const nonArray = corrupt((envelope) => {
      envelope["synergy"] = "not-an-array";
    });
    expect(() => deserializeSavedBuild(nonArray)).toThrowError(MalformedSavedBuildError);

    const duplicateIds = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[1]!["id"] = 1;
    });
    expect(() => deserializeSavedBuild(duplicateIds)).toThrowError(MalformedSavedBuildError);

    const badMagnitude = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[0]!["magnitude"] = 3;
    });
    expect(() => deserializeSavedBuild(badMagnitude)).toThrowError(MalformedSavedBuildError);

    const wrongPermanence = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[0]!["permanence"] = "permanent"; // Synergy Slot 1 is temporary (seed table)
    });
    expect(() => deserializeSavedBuild(wrongPermanence)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects MORE than two magnitude-2 synergy entries — the sealed 2-of-8 cap", () => {
    const twoPlusTwo = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[0]!["magnitude"] = 2;
      synergy[1]!["magnitude"] = 2;
    });
    // Exactly two is legal.
    expect(() => deserializeSavedBuild(twoPlusTwo)).not.toThrow();

    const threePlusTwo = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[0]!["magnitude"] = 2;
      synergy[1]!["magnitude"] = 2;
      synergy[2]!["magnitude"] = 2;
    });
    expect(() => deserializeSavedBuild(threePlusTwo)).toThrowError(MalformedSavedBuildError);
  });

  it("rejects a synergy role reference of a genuinely untyped shape (number, not string/null)", () => {
    const text = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[4]!["fuseBadgeId"] = 42;
    });
    expect(() => deserializeSavedBuild(text)).toThrowError(MalformedSavedBuildError);
  });

  it("aggregates EVERY problem found into MalformedSavedBuildError.problems", () => {
    const text = corrupt((envelope) => {
      (envelope["loadout"] as Record<string, unknown>[])[0]!["purchasedLevel"] = "legend";
      (envelope["build"] as Record<string, unknown>)["heightInches"] = null;
      delete envelope["config"];
    });
    let caught: unknown = null;
    try {
      deserializeSavedBuild(text);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MalformedSavedBuildError);
    expect((caught as MalformedSavedBuildError).problems.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// F1 items 1+5 — dataset drift (H8): an unknown badge id in an OTHERWISE-VALID
// build is stripped + reported, NEVER a failure and NEVER a cast-through.
// ---------------------------------------------------------------------------

describe("deserializeSavedBuildWithReport — dataset drift strips into droppedEntries (H8)", () => {
  /** The valid fixture with one loadout entry whose badge id left the dataset,
   * holding a fuse role on unlocked Synergy Slot 5 (reaction stays deadeye). */
  function driftedText(): string {
    return corrupt((envelope) => {
      (envelope["loadout"] as Record<string, unknown>[]).push({
        badgeId: "vanished-badge",
        purchasedLevel: "hof",
      });
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[4]!["unlocked"] = true;
      synergy[4]!["fuseBadgeId"] = "vanished-badge";
      synergy[4]!["reactionBadgeId"] = "deadeye";
    });
  }

  it("does NOT throw; strips the unknown-id entry and reports it in droppedEntries", () => {
    const { saved, droppedEntries } = deserializeSavedBuildWithReport(driftedText());
    expect(droppedEntries).toEqual([{ badgeId: "vanished-badge", purchasedLevel: "hof" }]);
    expect(saved.loadout).toEqual([
      { badgeId: "deadeye", purchasedLevel: "gold" },
      { badgeId: "glove", purchasedLevel: "gold" },
    ]);
  });

  it("a reference cleared by DATASET drift is disclosed via droppedEntries only — never double-reported in clearedSynergyRefs", () => {
    const { clearedSynergyRefs } = deserializeSavedBuildWithReport(driftedText());
    expect(clearedSynergyRefs).toEqual([]);
  });

  it("clears synergy references to the dropped badge id, keeping unrelated references", () => {
    const { saved } = deserializeSavedBuildWithReport(driftedText());
    const synergySlot5 = saved.synergy.find((entry) => entry.id === 5);
    expect(synergySlot5?.fuseBadgeId).toBeNull();
    expect(synergySlot5?.reactionBadgeId).toBe("deadeye");
  });

  it("preserves unknown synergy extra fields OPAQUELY while clearing dropped references", () => {
    const envelope = JSON.parse(driftedText()) as Record<string, unknown>;
    const synergy = envelope["synergy"] as Record<string, unknown>[];
    synergy[4]!["futureField"] = "opaque";
    const { saved } = deserializeSavedBuildWithReport(JSON.stringify(envelope));
    const synergySlot5 = saved.synergy.find((entry) => entry.id === 5) as unknown as Record<
      string,
      unknown
    >;
    expect(synergySlot5["futureField"]).toBe("opaque");
    expect(synergySlot5["fuseBadgeId"]).toBeNull();
  });

  it("reports droppedEntries [] and clearedSynergyRefs [] for a fully-valid build (and the report-free form matches)", () => {
    const text = serializeSavedBuild(makeSaved());
    const { saved, droppedEntries, clearedSynergyRefs } = deserializeSavedBuildWithReport(text);
    expect(droppedEntries).toEqual([]);
    expect(clearedSynergyRefs).toEqual([]);
    expect(saved).toEqual(makeSaved());
    expect(deserializeSavedBuild(text)).toEqual(saved);
  });
});

// ---------------------------------------------------------------------------
// F2.1 re-ruling — a STRANDED synergy reference (fuse/reaction badge id not in
// the loadout) is a HEALABLE condition, never MalformedSavedBuildError. The
// PRE-F2 app wrote exactly this state in normal use (removing a purchase did
// not clear its synergy role), so a user's real autosave must never be
// destroyed by an upgrade: the stale assignment is cleared into the report
// (clearedSynergyRefs, alongside droppedEntries) and deserialization proceeds.
// ---------------------------------------------------------------------------

describe("deserializeSavedBuildWithReport — stranded synergy refs heal into clearedSynergyRefs (F2.1)", () => {
  /** The valid fixture shaped exactly like a pre-F2 autosave: Posterizer was
   * purchased, fused on Synergy Slot 5, then removed — the pre-F2 remove
   * path left the fuse reference stranded. Posterizer still exists in the
   * dataset; it is just not in the loadout. */
  function strandedText(): string {
    return corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[4]!["unlocked"] = true;
      synergy[4]!["fuseBadgeId"] = "posterizer"; // in the dataset, NOT in the loadout
    });
  }

  it("does NOT throw (pre-F2.1 this was rejected as malformed — destroying real pre-F2 autosaves)", () => {
    expect(() => deserializeSavedBuildWithReport(strandedText())).not.toThrow();
  });

  it("clears the stranded reference and reports it in clearedSynergyRefs; the loadout survives intact", () => {
    const { saved, droppedEntries, clearedSynergyRefs } =
      deserializeSavedBuildWithReport(strandedText());
    expect(clearedSynergyRefs).toEqual([
      { synergySlotId: 5, role: "fuse", badgeId: "posterizer" },
    ]);
    expect(saved.synergy.find((entry) => entry.id === 5)?.fuseBadgeId).toBeNull();
    // Nothing else was touched: the plan is intact, no dataset drift.
    expect(saved.loadout).toEqual([
      { badgeId: "deadeye", purchasedLevel: "gold" },
      { badgeId: "glove", purchasedLevel: "gold" },
    ]);
    expect(droppedEntries).toEqual([]);
  });

  it("heals BOTH roles independently and keeps valid references", () => {
    const text = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[1]!["unlocked"] = true;
      synergy[1]!["reactionBadgeId"] = "float-game"; // stranded (not in loadout)
      synergy[4]!["unlocked"] = true;
      synergy[4]!["fuseBadgeId"] = "posterizer"; // stranded (not in loadout)
      synergy[4]!["reactionBadgeId"] = "deadeye"; // VALID — in the loadout
    });
    const { saved, clearedSynergyRefs } = deserializeSavedBuildWithReport(text);
    expect(clearedSynergyRefs).toEqual([
      { synergySlotId: 2, role: "reaction", badgeId: "float-game" },
      { synergySlotId: 5, role: "fuse", badgeId: "posterizer" },
    ]);
    const synergySlot2 = saved.synergy.find((entry) => entry.id === 2);
    const synergySlot5 = saved.synergy.find((entry) => entry.id === 5);
    expect(synergySlot2?.reactionBadgeId).toBeNull();
    expect(synergySlot5?.fuseBadgeId).toBeNull();
    expect(synergySlot5?.reactionBadgeId).toBe("deadeye");
  });

  it("still preserves unknown synergy extra fields OPAQUELY while healing (M1 carve-out)", () => {
    const envelope = JSON.parse(strandedText()) as Record<string, unknown>;
    const synergy = envelope["synergy"] as Record<string, unknown>[];
    synergy[4]!["futureField"] = "opaque";
    const { saved } = deserializeSavedBuildWithReport(JSON.stringify(envelope));
    const synergySlot5 = saved.synergy.find((entry) => entry.id === 5) as unknown as Record<
      string,
      unknown
    >;
    expect(synergySlot5["futureField"]).toBe("opaque");
    expect(synergySlot5["fuseBadgeId"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// F3 (scope.md §0.1 A2): an out-of-range height is a validateBuild VIOLATION,
// never malformed input. MalformedSavedBuildError stays for SHAPE violations
// only. This pin exists because F1 made the deserializer strict and the next
// reader's instinct will be to add the range check there — do not.
// ---------------------------------------------------------------------------

describe("F3: the deserializer does NOT reject an out-of-range height", () => {
  it("a 7'0\" PG round-trips and surfaces as a validateBuild violation", () => {
    const saved = makeSaved();
    const outOfRange: SavedBuild = {
      ...saved,
      build: { ...saved.build, position: "PG", heightInches: 84 },
    };
    // Round-trips successfully — no MalformedSavedBuildError, no mutation.
    const roundTripped = deserializeSavedBuild(serializeSavedBuild(outOfRange));
    expect(roundTripped.build.position).toBe("PG");
    expect(roundTripped.build.heightInches).toBe(84);
    // The engine's HARD-DISCLOSED surface is where it lands instead.
    const validation = validateBuild(roundTripped.build);
    expect(validation.violations).toHaveLength(1);
    expect(validation.violations[0]?.kind).toBe("heightOutsidePositionRange");
    expect(validation.violations[0]?.reason).toBe(
      `7'0" is outside the PG range 5'9"–6'7"`,
    );
  });

  it("junk in position is still junk (shape stays validated)", () => {
    const saved = makeSaved();
    const envelope = JSON.parse(serializeSavedBuild(saved)) as Record<string, unknown>;
    (envelope["build"] as Record<string, unknown>)["position"] = "GOALIE";
    expect(() => deserializeSavedBuild(JSON.stringify(envelope))).toThrowError(
      MalformedSavedBuildError,
    );
  });
});
