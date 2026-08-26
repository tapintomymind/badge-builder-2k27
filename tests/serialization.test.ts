/**
 * Serializer tests (H8 + migration seam). Pure string ↔ object only — the
 * assertions here also pin that `synergy` round-trips OPAQUELY (type-only at
 * M1) and that recheckEligibility recomputes against the CURRENT dataset.
 */

import { describe, expect, it } from "vitest";
import { appliedEquipSlotsTotal, effectiveBudgets, zeroBonus } from "../src/engine/budget";
import { loadDataset, shippedDataset, shippedRawDataset } from "../src/engine/dataset";
import { driftFromDroppedEntries, recheckEligibility } from "../src/engine/eligibility";
import { MalformedSavedBuildError, UnsupportedSchemaVersionError } from "../src/engine/errors";
import {
  MIGRATIONS,
  SAVED_BUILD_SCHEMA_VERSION,
  createSavedBuild,
  deserializeSavedBuild,
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "../src/engine/serialization";
import { validateBuild } from "../src/engine/validate-build";
import type { Budget, RawBadgeDataset, SavedBuild, SynergySlot } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { applyRatifiedMagnitudes, plusTwoSynergySlotIds } from "../src/engine/synergy";
import { validateLoadout } from "../src/engine/validate-loadout";
import { ATTRIBUTE_CEILING, defaultAppConfig } from "../src/config";
import { effectiveAttribute } from "../src/engine/attributes";
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
    disciplineLock: null,
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
      bonus: zeroBonus(),
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
    // [F4/N7] Re-pinned by the F4 dataVersion bump. NOTE the sibling literal
    // further down (the '{"schemaVersion":1,"dataVersion":"2026-08-25.1"}'
    // envelope) is a SAVED BUILD's stamp exercising the H8 DRIFT path, and
    // drift is the behaviour under test there — it must NOT be re-pinned.
    expect(saved.dataVersion).toBe("2026-08-26.1");
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

  /**
   * [F4/A1] RE-DECIDED. This case used to assert that THREE magnitude-2
   * entries throw MalformedSavedBuildError. That check is REMOVED, and the
   * removal is the single most important change in F4.
   *
   * F4 ratifies Synergy Slot 7 as a +2, so a pre-F4 build that already
   * designated two OTHER Synergy Slots normalizes to THREE at load — a state
   * F4 is ruled to DISCLOSE (H8: never un-designate a user's choice). With
   * the throw in place, that ruled state was written straight back by the
   * mount-time autosave and REFUSED on the next boot; the read swallowed the
   * throw and the app overwrote the user's build with an empty one.
   *
   * The cap now has exactly ONE owner: validateLoadout's
   * tooManyPlusTwoSynergySlots HARD violation. See test 8.6 below.
   */
  it("[F4/A1] does NOT reject three magnitude-2 synergy entries — the cap is validateLoadout's, not the deserializer's", () => {
    const threePlusTwo = corrupt((envelope) => {
      const synergy = envelope["synergy"] as Record<string, unknown>[];
      synergy[0]!["magnitude"] = 2;
      synergy[1]!["magnitude"] = 2;
      synergy[2]!["magnitude"] = 2;
    });
    expect(() => deserializeSavedBuild(threePlusTwo)).not.toThrow();
    expect(
      deserializeSavedBuild(threePlusTwo).synergy.filter((slot) => slot.magnitude === 2),
    ).toHaveLength(3);
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

// ---------------------------------------------------------------------------
// F4 group 8 — PERSISTED BACKWARD COMPATIBILITY.
//
// F4 makes FOUR persisted-shape changes and NONE of them bumps schemaVersion:
//   P1 config.refundTrigger        — legal-value set widens by "onFuse"
//   P2 config.plusTwoSlotIds       — retyped [id,id]|null → readonly id[]|null
//   P3 synergy[].disciplineLock    — new additive field, Category|null
//   P4 synergy[].magnitude         — READ-TIME projection (slot 7 re-derived)
// All four are backward compatible by construction. Bumping schemaVersion here
// would be a ONE-WAY DOOR that made every existing autosave
// UnsupportedSchemaVersionError on the next boot.
// ---------------------------------------------------------------------------

/** A literal PRE-F4 SavedBuild, checked in as a string constant so no
 * post-F4 code path can have produced it: refundTrigger legendByAnyMeans,
 * plusTwoSlotIds [3,6], synergy entries with NO disciplineLock, slot 7 at
 * magnitude 1, schemaVersion 1. */
const PRE_F4_SAVED_BUILD_JSON = JSON.stringify({
  schemaVersion: 1,
  dataVersion: "2026-08-25.1",
  savedAt: "2026-08-25T12:00:00.000Z",
  name: "pre-F4 build",
  build: makeBuild(78, 85, { mid: 92, steal: 93 }),
  budgets: Object.fromEntries(
    CATEGORIES.map((category) => [category, { points: 12, equipSlots: 3 }]),
  ),
  loadout: [
    { badgeId: "deadeye", purchasedLevel: "gold" },
    { badgeId: "glove", purchasedLevel: "gold" },
  ],
  synergy: ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((id) => ({
    id,
    unlocked: true,
    permanence: id <= 4 ? "temporary" : "permanent",
    magnitude: id === 3 || id === 6 ? 2 : 1,
    fuseBadgeId: null,
    reactionBadgeId: null,
  })),
  config: {
    refundTrigger: "legendByAnyMeans",
    plusTwoSlotIds: [3, 6],
    budgetStrategy: "manual",
  },
});

describe("F4 group 8 — a pre-F4 SavedBuild still loads", () => {
  it("8.1 THE ONE THAT MATTERS — deserializes with ZERO problems, and every disciplineLock comes back null (never undefined)", () => {
    const { saved, droppedEntries, clearedSynergyRefs } =
      deserializeSavedBuildWithReport(PRE_F4_SAVED_BUILD_JSON);
    expect(droppedEntries).toEqual([]);
    expect(clearedSynergyRefs).toEqual([]);
    expect(saved.synergy).toHaveLength(8);
    for (const synergySlot of saved.synergy) {
      expect(synergySlot.disciplineLock, `Synergy Slot ${synergySlot.id}`).toBeNull();
      // `undefined !== null` would fire a spurious violation on every slot of
      // every old build — the type lie the P3 normalization exists to close.
      expect(Object.prototype.hasOwnProperty.call(synergySlot, "disciplineLock")).toBe(true);
    }
    expect(saved.config.refundTrigger).toBe("legendByAnyMeans");
    expect(saved.config.plusTwoSlotIds).toEqual([3, 6]);
  });

  it("8.2 refundTrigger: onFuse round-trips; junk still throws", () => {
    const onFuse = PRE_F4_SAVED_BUILD_JSON.replace('"legendByAnyMeans"', '"onFuse"');
    expect(deserializeSavedBuild(onFuse).config.refundTrigger).toBe("onFuse");
    const junk = PRE_F4_SAVED_BUILD_JSON.replace('"legendByAnyMeans"', '"whenever"');
    expect(() => deserializeSavedBuild(junk)).toThrowError(MalformedSavedBuildError);
  });

  it("8.3 plusTwoSlotIds accepts null / [] / [7] / [3,6]; rejects a non-id, a duplicate pair, and a 3-element array", () => {
    const withPlusTwo = (value: string) =>
      PRE_F4_SAVED_BUILD_JSON.replace('"plusTwoSlotIds":[3,6]', `"plusTwoSlotIds":${value}`);
    for (const legal of ["null", "[]", "[7]", "[3,6]"]) {
      expect(() => deserializeSavedBuild(withPlusTwo(legal)), legal).not.toThrow();
    }
    for (const illegal of ["[9]", '["7"]', "[3,3]", "[1,2,3]"]) {
      expect(() => deserializeSavedBuild(withPlusTwo(illegal)), illegal).toThrowError(
        MalformedSavedBuildError,
      );
    }
  });

  it("8.4 disciplineLock accepts absent / null / a valid Category; rejects a non-Category", () => {
    const withLock = (value: string) =>
      PRE_F4_SAVED_BUILD_JSON.replace('"magnitude":1,"fuseBadgeId"', `"magnitude":1,"disciplineLock":${value},"fuseBadgeId"`);
    // Absent is legal — that is PRE_F4_SAVED_BUILD_JSON itself (8.1).
    expect(() => deserializeSavedBuild(withLock("null"))).not.toThrow();
    expect(() => deserializeSavedBuild(withLock('"Shooting"'))).not.toThrow();
    expect(deserializeSavedBuild(withLock('"Shooting"')).synergy[0]?.disciplineLock).toBe(
      "Shooting",
    );
    // "Dunking" is an ATTRIBUTE-flavoured word, not one of the six Categories.
    expect(() => deserializeSavedBuild(withLock('"Dunking"'))).toThrowError(
      MalformedSavedBuildError,
    );
  });

  it("8.5 SAVED_BUILD_SCHEMA_VERSION is STILL 1 and MIGRATIONS is STILL empty", () => {
    // Asserted LITERALLY: a well-meaning bump is the single change that would
    // brick every existing autosave. All four F4 persisted-shape changes are
    // backward compatible by construction and need no migration.
    expect(SAVED_BUILD_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
  });

  /**
   * 8.6 [F4/A1] THE ROUND TRIP THAT FAILED BEFORE A1 — the highest-value test
   * in the slice.
   *
   * Without A1 this fails on its SECOND deserialize with
   * `MalformedSavedBuildError: at most 2 Synergy Slots may carry +2 (found 3)`
   * — reproduced against the shipped code. That is the chain: slice E's ruled
   * three-+2 state → toEnvelope verbatim → mount-time autosave with no dirty
   * guard → validateSynergyShape throws on the next boot →
   * readAutosaveWithReport swallows it → freshWorkingState() → the mount
   * effect overwrites the user's build with an empty one.
   *
   * The two PERSISTED-SHAPE legs (autosave + named-build) live in
   * tests/ui/f4-plus-two-roundtrip.test.tsx, because they need a DOM
   * environment for localStorage and this file is node-env by config.
   */
  it("8.6 deserialize → normalize → serialize → DESERIALIZE AGAIN survives, and the cap is owned exactly once", () => {
    const first = deserializeSavedBuild(PRE_F4_SAVED_BUILD_JSON);
    const normalized = applyRatifiedMagnitudes(first.synergy);
    expect(normalized.normalizedSynergySlotIds).toEqual([7]);

    const envelope: SavedBuild = { ...first, synergy: normalized.synergySlots };
    const text = serializeSavedBuild(envelope);

    expect(() => deserializeSavedBuild(text)).not.toThrow();
    const second = deserializeSavedBuild(text);
    expect(plusTwoSynergySlotIds(second.synergy)).toEqual([3, 6, 7]);

    const validation = validateLoadout({
      loadout: second.loadout,
      budgets: second.budgets,
      synergySlots: second.synergy,
      refundTrigger: second.config.refundTrigger,
    });
    const capErrors = validation.errors.filter(
      (error) => error.kind === "tooManyPlusTwoSynergySlots",
    );
    expect(capErrors).toHaveLength(1);
  });
});

// ===========================================================================
// A5 group 3 — the bonus layer at the JSON boundary.
//
// WRITTEN AGAINST THE ONE SHAPE ALL FOUR OF THIS PROJECT'S DATA-LOSS DEFECTS
// SHARE: a validator refused a value it had not been widened for, and the
// refusal reached a write path. The construction rule these tests enforce is
// that ANY value the app's own write path can produce must be readable by its
// own read path on the very next boot — INCLUDING values the rules layer
// considers violations. [scope.md §0.1 A5-R5 · engine-data-design.md §4]
// ===========================================================================

/** A REAL pre-A5 envelope: current in every other respect, `bonus` simply
 *  absent — which is every saved build that exists today. */
const PRE_A5_SAVED_BUILD_JSON = JSON.stringify({
  schemaVersion: 1,
  dataVersion: shippedDataset.dataVersion,
  savedAt: "2026-08-26T12:00:00.000Z",
  name: "pre-A5 build",
  build: makeBuild(78, 85, { mid: 92, steal: 93 }),
  budgets: Object.fromEntries(
    CATEGORIES.map((category) => [category, { points: 20, equipSlots: 4 }]),
  ),
  loadout: [{ badgeId: "deadeye", purchasedLevel: "gold" }],
  synergy: makeSynergy(),
  config: defaultAppConfig,
});

/** Re-parses the pre-A5 envelope with a `bonus` value spliced in. */
function withBonus(bonus: unknown): string {
  const parsed = JSON.parse(PRE_A5_SAVED_BUILD_JSON) as Record<string, unknown>;
  parsed["bonus"] = bonus;
  return JSON.stringify(parsed);
}

describe("A5 group 3 — a pre-A5 SavedBuild still loads, and an over-applied one round-trips", () => {
  it("3.1 SHIP GATE — a pre-A5 envelope (bonus ABSENT) deserializes with ZERO problems and yields zeroBonus()", () => {
    const { saved, droppedEntries, clearedSynergyRefs } =
      deserializeSavedBuildWithReport(PRE_A5_SAVED_BUILD_JSON);
    expect(droppedEntries).toEqual([]);
    expect(clearedSynergyRefs).toEqual([]);
    expect(saved.bonus).toEqual(zeroBonus());
  });

  it("3.2 bonus: null is LEGAL and normalizes to zeroBonus() — refusing null buys nothing and costs a build", () => {
    expect(() => deserializeSavedBuild(withBonus(null))).not.toThrow();
    expect(deserializeSavedBuild(withBonus(null)).bonus).toEqual(zeroBonus());
  });

  it("3.3 a PARTIAL bonus fills every other field with 0 and carries exactly the six category keys", () => {
    const saved = deserializeSavedBuild(withBonus({ earnedEquipSlots: 2 }));
    expect(saved.bonus.earnedEquipSlots).toBe(2);
    expect(saved.bonus.earnedPoints).toBe(0);
    expect(Object.keys(saved.bonus.appliedEquipSlots).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(saved.bonus.appliedPoints).sort()).toEqual([...CATEGORIES].sort());
    for (const category of CATEGORIES) {
      expect(saved.bonus.appliedEquipSlots[category]).toBe(0);
      expect(saved.bonus.appliedPoints[category]).toBe(0);
    }
  });

  it("3.4 an UNKNOWN key inside appliedEquipSlots is IGNORED, never a problem", () => {
    const text = withBonus({
      earnedEquipSlots: 1,
      appliedEquipSlots: { Shooting: 1, Telekinesis: 9 },
    });
    expect(() => deserializeSavedBuild(text)).not.toThrow();
    const saved = deserializeSavedBuild(text);
    expect(saved.bonus.appliedEquipSlots.Shooting).toBe(1);
    expect(Object.keys(saved.bonus.appliedEquipSlots)).not.toContain("Telekinesis");
  });

  /**
   * 3.5 SHIP GATE — THE HIGHEST-VALUE TEST IN THE AMENDMENT, and F4 test 8.6's
   * shape aimed squarely at F4/A1's defect class.
   *
   * The state is reachable with NO external editing: season-earned rewards
   * expire, so a user who earned 3, applied 3, then edits the total down at
   * rollover lands at Σ applied > earned through the UI. With a Σ ≤ earned
   * check at the JSON boundary that state is written straight back by the
   * autosave and REFUSED on the next boot — the read swallows the throw and
   * the app overwrites the user's build with an empty one.
   */
  it("3.5 SHIP GATE — an OVER-APPLIED bonus deserializes, warns (never errors), re-serializes and DESERIALIZES AGAIN", () => {
    const text = withBonus({
      earnedEquipSlots: 1,
      appliedEquipSlots: { Shooting: 1, Defense: 1, Rebounding: 1 },
    });

    // Leg 1: it loads at all.
    expect(() => deserializeSavedBuild(text)).not.toThrow();
    const first = deserializeSavedBuild(text);
    expect(first.bonus.earnedEquipSlots).toBe(1);
    expect(appliedEquipSlotsTotal(first.bonus)).toBe(3);

    // Leg 2: the RULES layer reports it — as a WARNING, and it is the sole owner.
    const validation = validateLoadout({
      loadout: first.loadout,
      budgets: effectiveBudgets(first.budgets, first.bonus),
      synergySlots: first.synergy,
      refundTrigger: first.config.refundTrigger,
      bonus: first.bonus,
    });
    expect(validation.warnings).toContainEqual({
      kind: "bonusEquipSlotsOverApplied",
      applied: 3,
      earned: 1,
      overBy: 2,
    });
    for (const error of validation.errors) {
      expect(error.kind).not.toMatch(/^bonus/);
    }

    // Leg 3: the app writes it back verbatim and reads it again. THE CHAIN
    // THAT FAILED IN F4/A1 STOPS HERE.
    const round = serializeSavedBuild(first);
    expect(() => deserializeSavedBuild(round)).not.toThrow();
    const second = deserializeSavedBuild(round);
    expect(second.bonus).toEqual(first.bonus);
    // …and a THIRD time, because an autosave loop is not a one-shot.
    expect(() => deserializeSavedBuild(serializeSavedBuild(second))).not.toThrow();
  });

  it("3.6 a fully-populated bonus round-trips value for value", () => {
    const bonus = {
      earnedEquipSlots: 5,
      earnedPoints: 40,
      appliedEquipSlots: Object.fromEntries(
        CATEGORIES.map((category, index) => [category, index]),
      ),
      appliedPoints: Object.fromEntries(
        CATEGORIES.map((category, index) => [category, index * 2]),
      ),
    };
    const saved = deserializeSavedBuild(withBonus(bonus));
    expect(saved.bonus).toEqual(bonus);
    expect(deserializeSavedBuild(serializeSavedBuild(saved)).bonus).toEqual(bonus);
  });

  it("3.7 negative and non-finite values push problems whose SHAPE matches validateBudgets's", () => {
    for (const bad of [
      { earnedEquipSlots: -1 },
      { earnedPoints: Number.NaN },
      { earnedPoints: Number.POSITIVE_INFINITY },
      { earnedEquipSlots: "2" },
      { appliedEquipSlots: { Shooting: -1 } },
      { appliedPoints: { Defense: Number.NaN } },
      { appliedEquipSlots: [] },
      { appliedPoints: 7 },
    ]) {
      expect(() => deserializeSavedBuild(withBonus(bad)), JSON.stringify(bad)).toThrowError(
        MalformedSavedBuildError,
      );
    }
    // Not an object at all.
    expect(() => deserializeSavedBuild(withBonus(7))).toThrowError(MalformedSavedBuildError);
    expect(() => deserializeSavedBuild(withBonus("nope"))).toThrowError(MalformedSavedBuildError);

    // NO INTEGER CHECK — validateBudgets has none for points either, and
    // adding a strictness the shipped sibling lacks is the F4/R3 trap running
    // the other way.
    expect(() => deserializeSavedBuild(withBonus({ earnedPoints: 1.5 }))).not.toThrow();
  });

  it("3.8 SHIP GATE — the version machinery did NOT move (test 8.5's claim, restated at the A5 boundary)", () => {
    expect(SAVED_BUILD_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
    // A post-A5 envelope still DECLARES 1, so a pre-A5 worktree degrades
    // (dropping `bonus`) rather than quarantining the whole store.
    const posted = JSON.parse(
      serializeSavedBuild(deserializeSavedBuild(withBonus({ earnedEquipSlots: 1 }))),
    ) as Record<string, unknown>;
    expect(posted["schemaVersion"]).toBe(1);
  });

  it("3.11 createSavedBuild carries the bonus through, and a zero bonus survives the round trip", () => {
    const saved = makeSaved();
    expect(saved.bonus).toEqual(zeroBonus());
    expect(deserializeSavedBuild(serializeSavedBuild(saved)).bonus).toEqual(zeroBonus());
  });
});

/* ------------------------------------------------------------ A6: persistence -- */

/**
 * Re-parses the pre-A6 envelope with a `capBrokenAttributes` value spliced
 * into `build`. The SAME fixture the A5 group uses — it predates both
 * amendments, which is exactly what makes it the right superset probe.
 */
function withCapBroken(capBroken: unknown): string {
  const parsed = JSON.parse(PRE_A5_SAVED_BUILD_JSON) as Record<string, unknown>;
  const build = parsed["build"] as Record<string, unknown>;
  build["capBrokenAttributes"] = capBroken;
  parsed["bonus"] = zeroBonus();
  return JSON.stringify(parsed);
}

describe("A6 group 5 — cap breakers persist as a STRICT SUPERSET", () => {
  it("5.1 SHIP GATE — a pre-A6 envelope (field ABSENT) deserializes with ZERO problems and NO default", () => {
    const { saved, droppedEntries, clearedSynergyRefs } =
      deserializeSavedBuildWithReport(PRE_A5_SAVED_BUILD_JSON);
    expect(droppedEntries).toEqual([]);
    expect(clearedSynergyRefs).toEqual([]);
    // ABSENT STAYS ABSENT. No normalizer ran, no `{}` was written, and the
    // key is not even present — which is the whole reason the field is
    // optional in TypeScript too (A6-R5). A default written here would be a
    // silent shape change on every pre-A6 file in the user's storage.
    expect(saved.build.capBrokenAttributes).toBeUndefined();
    expect("capBrokenAttributes" in saved.build).toBe(false);
  });

  it("5.2 the wire acceptance table, exactly [A6-R5]", () => {
    // ACCEPTED — every one of these is a shape the app itself can produce.
    for (const accepted of [
      undefined, // pre-A6 file
      null, // legal wire "absent"
      {}, // present but empty
      { mid: 95 }, // the feature
      { mid: 95, steal: 97 }, // several
      { mid: 0 }, // inert, not an error
      { mid: ATTRIBUTE_CEILING }, // the bound itself
      { mid: 12 }, // v < entered (85): the app's OWN UI writes this
      { mid: 95.5 }, // NO integer check — validateBudgets has none either
      { notAnAttribute: 5 }, // unknown keys IGNORED, never a problem
      { mid: 95, notAnAttribute: "junk" },
    ]) {
      expect(
        () => deserializeSavedBuild(withCapBroken(accepted)),
        JSON.stringify(accepted ?? null),
      ).not.toThrow();
    }

    // REFUSED — genuinely untyped or out of the attribute domain.
    for (const refused of [
      { mid: ATTRIBUTE_CEILING + 1 },
      { mid: -1 },
      { mid: Number.NaN },
      { mid: Number.POSITIVE_INFINITY },
      { mid: "95" },
      { mid: true },
      { mid: null },
      [],
      7,
      "nope",
    ]) {
      expect(
        () => deserializeSavedBuild(withCapBroken(refused)),
        JSON.stringify(refused),
      ).toThrowError(MalformedSavedBuildError);
    }
  });

  it("5.2b `declared < entered` is accepted SILENTLY and made inert by Math.max, never refused", () => {
    // The app's own UI produces this: declare 95, then drag the slider to
    // 85+. Refusing it would refuse a value the app itself wrote — the exact
    // shape of all four of this project's data-destruction defects. The
    // stored number is preserved verbatim (H8: disclose, never repair) and
    // the ENGINE simply ignores it.
    const saved = deserializeSavedBuild(withCapBroken({ mid: 12 }));
    expect(saved.build.capBrokenAttributes?.mid).toBe(12);
    expect(saved.build.attributes.mid).toBe(92);
    expect(effectiveAttribute(saved.build, "mid")).toBe(92);
  });

  it("5.2c ATTRIBUTE_CEILING is the SAME bound the entered value has carried since M1", () => {
    expect(ATTRIBUTE_CEILING).toBe(99);
    const overEntered = JSON.parse(PRE_A5_SAVED_BUILD_JSON) as Record<string, unknown>;
    (
      (overEntered["build"] as Record<string, unknown>)["attributes"] as Record<string, unknown>
    )["mid"] = ATTRIBUTE_CEILING + 1;
    expect(() => deserializeSavedBuild(JSON.stringify(overEntered))).toThrowError(
      MalformedSavedBuildError,
    );
  });

  it("5.3 SHIP GATE — the version machinery did NOT move (test 8.5's claim, at the A6 boundary)", () => {
    expect(SAVED_BUILD_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
    const posted = JSON.parse(
      serializeSavedBuild(deserializeSavedBuild(withCapBroken({ mid: 95 }))),
    ) as Record<string, unknown>;
    expect(posted["schemaVersion"]).toBe(1);
  });

  it("5.4 ROUND TRIP — serialize → deserialize → serialize preserves the field byte-for-byte", () => {
    // THE LATENT-TRAP GUARD [engine-data-design §3.5]. `validateBody` passes
    // `build` through BY REFERENCE (`envelope["build"] as unknown as Build`),
    // which is the ONLY reason cap breakers round-trip with zero serializer
    // work. The ADJACENT `SavedBuild` literal reassembles field by field. If
    // any future slice "tidies" that cast into a field-by-field `Build`
    // literal, `capBrokenAttributes` is silently dropped on every load→save
    // — no error, no test failure anywhere else, and the user's declarations
    // evaporate one reload at a time. THIS assertion is what makes that
    // conversion fail RED instead of shipping green. Do not delete it, and do
    // not "simplify" the cast it protects.
    const capBroken = { mid: 95, steal: 97, close: 0 };
    const once = deserializeSavedBuild(withCapBroken(capBroken));
    expect(once.build.capBrokenAttributes).toEqual(capBroken);

    const twice = deserializeSavedBuild(serializeSavedBuild(once));
    expect(twice.build.capBrokenAttributes).toEqual(capBroken);

    const thrice = deserializeSavedBuild(serializeSavedBuild(twice));
    expect(thrice.build.capBrokenAttributes).toEqual(capBroken);
    expect(serializeSavedBuild(thrice)).toBe(serializeSavedBuild(twice));

    // And the WHOLE build survives, not just the new field — the pass-through
    // is what protects every other `Build` field a literal would drop too.
    expect(thrice.build).toEqual(once.build);
  });

  it("5.4b a pre-A6 file round-trips WITHOUT gaining the key", () => {
    const once = deserializeSavedBuild(PRE_A5_SAVED_BUILD_JSON);
    const text = serializeSavedBuild(once);
    expect(text.includes("capBrokenAttributes")).toBe(false);
    expect(deserializeSavedBuild(text).build.capBrokenAttributes).toBeUndefined();
  });
});
