// @vitest-environment jsdom
/**
 * F4 group 8.6, the PERSISTED-SHAPE legs [A1] — the highest-value gate in the
 * slice. The pure deserialize → normalize → serialize → deserialize leg lives
 * in tests/serialization.test.ts (node env); these two legs need a DOM for
 * localStorage, which this repo supplies per-file, not per-describe.
 *
 * Without A1 both legs fail on the SECOND deserialize with
 * `MalformedSavedBuildError: at most 2 Synergy Slots may carry +2 (found 3)`
 * — reproduced against the shipped code. The full chain: F4 ratifies Synergy
 * Slot 7 as +2, a pre-F4 build that already designated Synergy Slots 3 and 6
 * normalizes to THREE at load (a state F4 is ruled to DISCLOSE, never
 * un-designate), App.tsx's mount-time autosave writes it back verbatim, and
 * the next boot refuses to read it.
 *
 * The NAMED-BUILD leg additionally asserts the build still appears in
 * listNamedBuilds(). Unreadable entries are SKIPPED, not thrown — so a
 * regression there manifests as a build VANISHING FROM THE SWITCHER, with no
 * error and no banner, which no throw-assertion would ever catch.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  listNamedBuilds,
  readAutosaveWithReport,
  readNamedBuildWithReport,
  saveNamedBuild,
  writeAutosave,
} from "../../src/persist/local-storage";
import { applyRatifiedMagnitudes, plusTwoSynergySlotIds } from "../../src/engine/synergy";
import { deserializeSavedBuild } from "../../src/engine/serialization";
import { validateLoadout } from "../../src/engine/validate-loadout";
import type { SavedBuild } from "../../src/engine/types";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

/** The same literal pre-F4 envelope as tests/serialization.test.ts: slot 7 at
 * magnitude 1, Synergy Slots 3 and 6 already designated +2, no
 * disciplineLock anywhere, refundTrigger legendByAnyMeans. */
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
  config: { refundTrigger: "legendByAnyMeans", plusTwoSlotIds: [3, 6], budgetStrategy: "manual" },
});

/** deserialize → applyRatifiedMagnitudes → the envelope App.tsx would write. */
function normalizedEnvelope(): SavedBuild {
  const first = deserializeSavedBuild(PRE_F4_SAVED_BUILD_JSON);
  const report = applyRatifiedMagnitudes(first.synergy);
  // [A7] BOTH ratified ids are re-derived at load now.
  expect(report.normalizedSynergySlotIds).toEqual([7, 8]);
  return { ...first, synergy: report.synergySlots };
}

function expectExactlyOneCapError(saved: SavedBuild): void {
  const validation = validateLoadout({
    loadout: saved.loadout,
    budgets: saved.budgets,
    synergySlots: saved.synergy,
    refundTrigger: saved.config.refundTrigger,
  });
  expect(
    validation.errors.filter((error) => error.kind === "tooManyPlusTwoSynergySlots"),
  ).toHaveLength(1);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("F4 8.6 — the AUTOSAVE shape survives the normalize → write → read round trip", () => {
  it("writeAutosave → readAutosaveWithReport does not throw, keeps [3,6,7,8], and the cap is owned once", () => {
    expect(writeAutosave(normalizedEnvelope()).ok).toBe(true);

    const reread = readAutosaveWithReport();
    expect(reread, "the autosave came back unreadable — A1 has regressed").not.toBeNull();
    expect(plusTwoSynergySlotIds(reread!.saved.synergy)).toEqual([3, 6, 7, 8]);
    expectExactlyOneCapError(reread!.saved);
  });
});

describe("F4 8.6 — the NAMED-BUILD shape survives, and does NOT vanish from the switcher", () => {
  it("saveNamedBuild → listNamedBuilds + readNamedBuildWithReport keeps the build visible and readable", () => {
    expect(saveNamedBuild("bld-f4", normalizedEnvelope()).ok).toBe(true);

    const listing = listNamedBuilds();
    // The load-bearing half: unreadable entries are skipped SILENTLY, so a
    // regression here is a build disappearing with no error and no banner.
    expect(listing.summaries.map((summary) => summary.id)).toContain("bld-f4");
    expect(listing.unreadableCount).toBe(0);

    const reread = readNamedBuildWithReport("bld-f4");
    expect(reread, "the named build came back unreadable — A1 has regressed").not.toBeNull();
    expect(plusTwoSynergySlotIds(reread!.saved.synergy)).toEqual([3, 6, 7, 8]);
    expectExactlyOneCapError(reread!.saved);
  });
});
