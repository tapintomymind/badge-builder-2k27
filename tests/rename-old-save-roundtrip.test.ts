// @vitest-environment jsdom
/**
 * OLD-SAVE ROUND-TRIP GUARD — the "Badge Points" -> "Badge Tokens" rename must
 * be invisible to storage.
 *
 * WHY THIS EXISTS. `serializeSavedBuild` is a bare `JSON.stringify` with NO
 * translation boundary, so `SavedBuild`'s property names ARE the on-disk
 * format. The 2026-08-26 vocabulary sweep renamed DISPLAY COPY ONLY and left
 * every identifier alone precisely because renaming one would rewrite the key
 * inside every build a user had already saved, with nowhere to migrate them
 * from. This test is the proof of that claim rather than the assertion of it.
 *
 * THE FIXTURE IS NOT HAND-WRITTEN. The JSON below was EMITTED BY PRE-RENAME
 * CODE — `serializeSavedBuild` at commit e927a70, the last commit before the
 * sweep — and pasted here byte-for-byte. A fixture typed out by the same
 * person who wrote the rename would only prove that person's beliefs were
 * self-consistent; bytes produced by the old serializer prove the format.
 *
 * This project has shipped four data-destruction defects, two of them
 * introduced by the fix for the first, and NONE was caught by the suite. This
 * is the guard that class of defect keeps getting past.
 */

import { describe, expect, it } from "vitest";
import {
  deserializeSavedBuildWithReport,
  serializeSavedBuild,
} from "../src/engine/serialization";
import { CATEGORIES } from "../src/engine/vocabulary";

/** Emitted by serializeSavedBuild at e927a70 (pre-rename). Do not regenerate:
 *  the whole point is that these bytes predate the sweep. */
const PRE_RENAME_SAVE_JSON = `{"schemaVersion":1,"dataVersion":"2026-08-26.1","savedAt":"2026-08-26T09:00:00.000Z","name":"pre-rename build","build":{"heightInches":78,"attributes":{"close":90,"layup":85,"drivingDunk":88,"standingDunk":85,"postControl":85,"mid":92,"threePt":85,"passAcc":85,"ballHandle":85,"speedWithBall":85,"interiorDef":85,"perimeterDef":85,"steal":93,"block":85,"offReb":85,"defReb":85,"speed":85,"agility":85,"strength":85,"vertical":85}},"budgets":{"Finishing":{"points":16,"equipSlots":3},"Shooting":{"points":16,"equipSlots":3},"Playmaking":{"points":16,"equipSlots":3},"Defense":{"points":16,"equipSlots":3},"Rebounding":{"points":16,"equipSlots":3},"Physicals":{"points":16,"equipSlots":3}},"bonus":{"earnedEquipSlots":3,"earnedPoints":12,"appliedEquipSlots":{"Finishing":2,"Shooting":0,"Playmaking":0,"Defense":0,"Rebounding":0,"Physicals":0},"appliedPoints":{"Finishing":7,"Shooting":5,"Playmaking":0,"Defense":0,"Rebounding":0,"Physicals":0}},"loadout":[{"badgeId":"deadeye","purchasedLevel":"gold"},{"badgeId":"glove","purchasedLevel":"silver"}],"synergy":[{"id":1,"unlocked":true,"permanence":"temporary","magnitude":1,"fuseBadgeId":"deadeye","reactionBadgeId":null,"disciplineLock":null},{"id":2,"unlocked":true,"permanence":"temporary","magnitude":1,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":3,"unlocked":true,"permanence":"temporary","magnitude":1,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":4,"unlocked":true,"permanence":"temporary","magnitude":1,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":5,"unlocked":true,"permanence":"permanent","magnitude":1,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":6,"unlocked":false,"permanence":"permanent","magnitude":1,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":7,"unlocked":false,"permanence":"permanent","magnitude":2,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null},{"id":8,"unlocked":false,"permanence":"permanent","magnitude":2,"fuseBadgeId":null,"reactionBadgeId":null,"disciplineLock":null}],"config":{"refundTrigger":"onFuse","plusTwoSlotIds":null,"budgetStrategy":"manual"}}`;

describe("a build saved BEFORE the rename still loads AFTER it", () => {
  it("deserializes without throwing", () => {
    expect(() => deserializeSavedBuildWithReport(PRE_RENAME_SAVE_JSON)).not.toThrow();
  });

  it("reports NO drift — no dropped entries, no cleared synergy refs", () => {
    // These two are what drive the user-visible disclosure banner. Either one
    // non-empty means the load silently discarded part of the saved work.
    const report = deserializeSavedBuildWithReport(PRE_RENAME_SAVE_JSON);
    expect(report.droppedEntries).toEqual([]);
    expect(report.clearedSynergyRefs).toEqual([]);
  });

  it("preserves every economy field the rename could plausibly have touched", () => {
    const { saved } = deserializeSavedBuildWithReport(PRE_RENAME_SAVE_JSON);

    // The per-category base pools.
    for (const category of CATEGORIES) {
      expect(saved.budgets[category].points, `${category} points`).toBe(16);
      expect(saved.budgets[category].equipSlots, `${category} equipSlots`).toBe(3);
    }

    // The A5 bonus layer — the surface the rename actually renamed in the UI.
    expect(saved.bonus.earnedPoints).toBe(12);
    expect(saved.bonus.earnedEquipSlots).toBe(3);
    expect(saved.bonus.appliedPoints.Finishing).toBe(7);
    expect(saved.bonus.appliedPoints.Shooting).toBe(5);
    expect(saved.bonus.appliedEquipSlots.Finishing).toBe(2);

    // The loadout and the fused synergy slot survive intact.
    expect(saved.loadout).toEqual([
      { badgeId: "deadeye", purchasedLevel: "gold" },
      { badgeId: "glove", purchasedLevel: "silver" },
    ]);
    expect(saved.synergy.find((s) => s.id === 1)?.fuseBadgeId).toBe("deadeye");
    expect(saved.name).toBe("pre-rename build");
  });

  it("RE-SERIALIZES BYTE-IDENTICALLY — the wire format did not move", () => {
    // The strongest form of the claim: load an old save on the renamed build,
    // write it straight back out, and the bytes are the ones the OLD code
    // produced. If any serialized key had been swept, this is where it shows.
    const { saved } = deserializeSavedBuildWithReport(PRE_RENAME_SAVE_JSON);
    expect(serializeSavedBuild(saved)).toBe(PRE_RENAME_SAVE_JSON);
  });

  it("the saved JSON still spells the currency `points`, and that is CORRECT", () => {
    // Guards the divergence itself. If a future tidy-up renames the field to
    // `tokens`, this fails LOUDLY here rather than silently in a user's
    // localStorage — which is the only place it would otherwise surface.
    expect(PRE_RENAME_SAVE_JSON).toContain('"points"');
    expect(PRE_RENAME_SAVE_JSON).toContain('"earnedPoints"');
    expect(PRE_RENAME_SAVE_JSON).toContain('"appliedPoints"');
    expect(PRE_RENAME_SAVE_JSON).not.toContain("Token");
    expect(PRE_RENAME_SAVE_JSON).not.toContain("token");
  });
});
