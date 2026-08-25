/**
 * Cost engine tests (H6). The 12 tier×level cost literals below are
 * hand-transcribed from the seed's "Tiers, levels, and costs" table —
 * independently of the generator's TIER_COSTS constant — so a transposition
 * in either transcription fails here.
 */

import { describe, expect, it } from "vitest";
import { costForLevel, costForLevelOrNull, whatIf } from "../src/engine/cost";
import { LegendNotPurchasableError, UnknownBadgeError } from "../src/engine/errors";
import { TIERS } from "../src/engine/vocabulary";

describe("costForLevel: total-to-own costs (seed table, hand-transcribed)", () => {
  const EXPECTED = [
    // [tier, bronze, silver, gold, hof] — seed: Tiers, levels, and costs
    ["A", 3, 5, 6, 7],
    ["B", 2, 4, 5, 6],
    ["C", 1, 3, 4, 5],
  ] as const;

  for (const [tier, bronze, silver, gold, hof] of EXPECTED) {
    it(`tier ${tier}: ${bronze}/${silver}/${gold}/${hof}`, () => {
      expect(costForLevel(tier, "bronze")).toBe(bronze);
      expect(costForLevel(tier, "silver")).toBe(silver);
      expect(costForLevel(tier, "gold")).toBe(gold);
      expect(costForLevel(tier, "hof")).toBe(hof);
    });
  }

  it("THROWS LegendNotPurchasableError on Legend, for all three tiers — never null, never NaN, never ?? 0", () => {
    for (const tier of TIERS) {
      expect(() => costForLevel(tier, "legend")).toThrowError(LegendNotPurchasableError);
    }
  });
});

describe("costForLevelOrNull: the ONE explicitly-named nullable variant (locked-pip preview)", () => {
  it("returns null on Legend instead of throwing", () => {
    for (const tier of TIERS) {
      expect(costForLevelOrNull(tier, "legend")).toBeNull();
    }
  });

  it("agrees with costForLevel on every purchasable level", () => {
    expect(costForLevelOrNull("A", "gold")).toBe(6);
    expect(costForLevelOrNull("C", "bronze")).toBe(1);
  });
});

describe("whatIf: cost delta of moving a badge to a target level", () => {
  // float-game is tier A (spot-checked). Costs A: 3/5/6/7.
  it("upgrade pays only the difference: A Silver → Gold = 6 − 5 = 1 (seed's own example)", () => {
    const loadout = [{ badgeId: "float-game", purchasedLevel: "silver" as const }];
    expect(whatIf(loadout, "float-game", "gold")).toBe(1);
  });

  it("downgrade returns the difference: A Gold → Silver = −1", () => {
    const loadout = [{ badgeId: "float-game", purchasedLevel: "gold" as const }];
    expect(whatIf(loadout, "float-game", "silver")).toBe(-1);
  });

  it("first purchase from unowned costs the full total-to-own", () => {
    expect(whatIf([], "float-game", "hof")).toBe(7);
  });

  it("removal (target null) returns the full amount spent", () => {
    const loadout = [{ badgeId: "float-game", purchasedLevel: "hof" as const }];
    expect(whatIf(loadout, "float-game", null)).toBe(-7);
  });

  it("no-op move costs 0", () => {
    const loadout = [{ badgeId: "float-game", purchasedLevel: "gold" as const }];
    expect(whatIf(loadout, "float-game", "gold")).toBe(0);
  });

  it("throws UnknownBadgeError on an id not in the dataset — never a silent 0", () => {
    expect(() => whatIf([], "not-a-badge", "gold")).toThrowError(UnknownBadgeError);
  });
});
