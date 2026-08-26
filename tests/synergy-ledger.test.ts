/**
 * M2 synergy-ledger tests — the H2 basis channel.
 *
 *  - item 12: totality of the basis → OverlayState mapping, with
 *    `reactionsActive` a LITERAL false in both cases (runtime + source-text
 *    assertions — that mapping is the single place the two channels can
 *    re-couple).
 *  - item 13: replay — the ledger of a state reached by any op sequence
 *    equals the ledger of that state constructed directly (derived, never
 *    accumulated).
 *  - item 14: the enumerated refund pairs — the COMPLETE set of
 *    (purchasedLevel, magnitude) pairs reaching Legend is exactly
 *    {(gold,2), (hof,1), (hof,2)}.
 *  - H2(a)/(b): temporary-but-unlocked fuse boosts DO refund on the primary
 *    basis; reaction activation NEVER refunds; season reset is reachable
 *    only through the parallel "postSeasonReset" basis.
 *
 * All magnitude-2 synergy slots here are TEST-LOCAL HYPOTHETICALS (OQ-A1).
 */

import { describe, expect, it } from "vitest";
import { assignSynergy, clearSynergy, createDefaultSynergySlots } from "../src/engine/synergy";
import type { SynergyState } from "../src/engine/synergy";
import {
  categoryLedgerAt,
  LEDGER_BASES,
  ledger,
  overlayForBasis,
} from "../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import type {
  Budget,
  LoadoutEntry,
  RefundTrigger,
  SynergyRoleKind,
  SynergySlot,
  SynergySlotId,
} from "../src/engine/types";
import type { Category, PurchasableLevel } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { srcSources, stripComments } from "./helpers/test-utils";

function makeBudgets(points: number, equipSlots: number): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { points, equipSlots }]),
  ) as Record<Category, Budget>;
}

function synergySlotsWith(
  overrides: Partial<Record<SynergySlotId, Partial<SynergySlot>>>,
): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) => ({
    ...synergySlot,
    ...overrides[synergySlot.id],
  }));
}

describe("M2 item 12 — basis → OverlayState mapping is TOTAL with reactionsActive literally false", () => {
  it("LEDGER_BASES enumerates exactly the 2 members of the union", () => {
    expect(LEDGER_BASES).toEqual(["current", "postSeasonReset"]);
  });

  it("both cases map with reactionsActive === false; only seasonReset varies", () => {
    for (const basis of LEDGER_BASES) {
      expect(overlayForBasis(basis).reactionsActive).toBe(false);
    }
    expect(overlayForBasis("current")).toEqual({ reactionsActive: false, seasonReset: false });
    expect(overlayForBasis("postSeasonReset")).toEqual({
      reactionsActive: false,
      seasonReset: true,
    });
  });

  it("source pin: synergy-ledger.ts writes `reactionsActive: false` exactly twice and never `reactionsActive: true`", () => {
    const source = stripComments(srcSources["/src/engine/synergy-ledger.ts"] as string);
    expect(source.match(/reactionsActive:\s*false/g)).toHaveLength(2);
    expect(/reactionsActive:\s*true/.test(source)).toBe(false);
  });
});

describe("M2 item 14 — enumerated refund pairs: exactly {(gold,2), (hof,1), (hof,2)} reach Legend", () => {
  // float-game: Finishing, tier A — total-to-own 3/5/6/7.
  function refundsAt(purchasedLevel: PurchasableLevel, magnitude: 1 | 2): boolean {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "float-game", purchasedLevel }],
      budgets: makeBudgets(16, 3),
      synergySlots: synergySlotsWith({
        5: { unlocked: true, magnitude, fuseBadgeId: "float-game" }, // permanent
      }),
      refundTrigger: "legendByAnyMeans",
    };
    return categoryLedgerAt(state, "current", "Finishing").refunded > 0;
  }

  it("the complete refunding set over all 8 (purchasedLevel, magnitude) pairs — asserted explicitly", () => {
    const refundingPairs: string[] = [];
    for (const purchasedLevel of ["bronze", "silver", "gold", "hof"] as const) {
      for (const magnitude of [1, 2] as const) {
        if (refundsAt(purchasedLevel, magnitude)) {
          refundingPairs.push(`${purchasedLevel}+${magnitude}`);
        }
      }
    }
    expect(refundingPairs).toEqual(["gold+2", "hof+1", "hof+2"]);
  });

  it("the two near-misses are excluded: gold+1 = HOF and silver+2 = HOF — not Legend, no refund", () => {
    expect(refundsAt("gold", 1)).toBe(false);
    expect(refundsAt("silver", 2)).toBe(false);
  });

  it("a refunding badge returns exactly what was SPENT on it, to its own category pool", () => {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "float-game", purchasedLevel: "hof" }], // A hof = 7
      budgets: makeBudgets(16, 3),
      synergySlots: synergySlotsWith({ 5: { unlocked: true, fuseBadgeId: "float-game" } }),
      refundTrigger: "legendByAnyMeans",
    };
    const readout = categoryLedgerAt(state, "current", "Finishing");
    expect(readout.spent).toBe(7);
    expect(readout.refunded).toBe(7);
    expect(readout.remainingPoints).toBe(16 - 7 + 7);
  });
});

describe("H2(a) — the committed refund basis (ratified 2026-08-25)", () => {
  // deadeye: Shooting, tier A — hof = 7. Synergy slot 2 is TEMPORARY.
  const temporaryFuseState: SynergyLedgerState = {
    loadout: [{ badgeId: "deadeye", purchasedLevel: "hof" }],
    budgets: makeBudgets(16, 3),
    synergySlots: synergySlotsWith({ 2: { unlocked: true, fuseBadgeId: "deadeye" } }),
    refundTrigger: "legendByAnyMeans",
  };

  it("a fuse boost from an UNLOCKED TEMPORARY synergy slot refunds on the primary basis — the game counts a slot that is unlocked right now", () => {
    expect(categoryLedgerAt(temporaryFuseState, "current", "Shooting").refunded).toBe(7);
  });

  it("season reset does NOT un-refund the primary ledger — the drop is visible only through the parallel postSeasonReset basis", () => {
    expect(categoryLedgerAt(temporaryFuseState, "current", "Shooting").refunded).toBe(7);
    expect(categoryLedgerAt(temporaryFuseState, "postSeasonReset", "Shooting").refunded).toBe(0);
    expect(categoryLedgerAt(temporaryFuseState, "postSeasonReset", "Shooting").remainingPoints).toBe(
      16 - 7,
    );
  });

  it("a permanent synergy slot's refund survives the postSeasonReset basis", () => {
    const permanentFuseState: SynergyLedgerState = {
      ...temporaryFuseState,
      synergySlots: synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "deadeye" } }),
    };
    expect(categoryLedgerAt(permanentFuseState, "postSeasonReset", "Shooting").refunded).toBe(7);
  });

  it("a LOCKED synergy slot's assignment contributes nothing on any basis", () => {
    const lockedState: SynergyLedgerState = {
      ...temporaryFuseState,
      synergySlots: synergySlotsWith({ 6: { unlocked: false, fuseBadgeId: "deadeye" } }),
    };
    expect(categoryLedgerAt(lockedState, "current", "Shooting").refunded).toBe(0);
  });

  it("H2(b): a REACTION role NEVER refunds — reaction activation is an in-game transient with no ledger channel", () => {
    const reactionState: SynergyLedgerState = {
      ...temporaryFuseState,
      synergySlots: synergySlotsWith({ 6: { unlocked: true, reactionBadgeId: "deadeye" } }),
    };
    // Display-side, reactionsActive would show deadeye at Legend — but the
    // ledger cannot receive reactionsActive, on either basis.
    expect(categoryLedgerAt(reactionState, "current", "Shooting").refunded).toBe(0);
    expect(categoryLedgerAt(reactionState, "postSeasonReset", "Shooting").refunded).toBe(0);
  });
});

describe("refundTrigger config seam — all three pre-wired values (OQ-A2: default ships, nothing guessed)", () => {
  function readoutFor(
    refundTrigger: RefundTrigger,
    synergySlots: SynergySlot[],
    purchasedLevel: PurchasableLevel = "hof",
  ) {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "deadeye", purchasedLevel }],
      budgets: makeBudgets(16, 3),
      synergySlots,
      refundTrigger,
    };
    return categoryLedgerAt(state, "current", "Shooting");
  }

  it("legendByPermanentBoostOnly: a temporary-slot Legend does NOT refund; a permanent-slot Legend does", () => {
    const temporaryFuse = synergySlotsWith({ 2: { unlocked: true, fuseBadgeId: "deadeye" } });
    const permanentFuse = synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "deadeye" } });
    expect(readoutFor("legendByAnyMeans", temporaryFuse).refunded).toBe(7);
    expect(readoutFor("legendByPermanentBoostOnly", temporaryFuse).refunded).toBe(0);
    expect(readoutFor("legendByPermanentBoostOnly", permanentFuse).refunded).toBe(7);
  });

  it("hofOrAbove: a gold badge fused to HOF refunds", () => {
    const permanentFuse = synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "deadeye" } });
    expect(readoutFor("hofOrAbove", permanentFuse, "gold").refunded).toBe(6); // A gold = 6
    expect(readoutFor("legendByAnyMeans", permanentFuse, "gold").refunded).toBe(0);
  });
});

describe("M2 item 13 — replay: the ledger is a pure function of the END state (derived, never accumulated)", () => {
  type Op =
    | { op: "purchase"; badgeId: string; purchasedLevel: PurchasableLevel }
    | { op: "downgrade"; badgeId: string; purchasedLevel: PurchasableLevel }
    | { op: "remove"; badgeId: string }
    | { op: "assign"; synergySlotId: SynergySlotId; role: SynergyRoleKind; badgeId: string }
    | { op: "clear"; synergySlotId: SynergySlotId; role: SynergyRoleKind };

  function applyOp(state: SynergyState, operation: Op): SynergyState {
    switch (operation.op) {
      case "purchase":
      case "downgrade": {
        const rest = state.loadout.filter((entry) => entry.badgeId !== operation.badgeId);
        return {
          ...state,
          loadout: [...rest, { badgeId: operation.badgeId, purchasedLevel: operation.purchasedLevel }],
        };
      }
      case "remove":
        return { ...state, loadout: state.loadout.filter((e) => e.badgeId !== operation.badgeId) };
      case "assign": {
        const result = assignSynergy(state, operation.synergySlotId, operation.role, operation.badgeId);
        expect(result.ok, `replay assign ${operation.badgeId}`).toBe(true);
        return result.ok ? { ...state, synergySlots: result.synergySlots } : state;
      }
      case "clear": {
        const result = clearSynergy(state, operation.synergySlotId, operation.role);
        expect(result.ok, "replay clear").toBe(true);
        return result.ok ? { ...state, synergySlots: result.synergySlots } : state;
      }
    }
  }

  // Synergy slot 5 carries a hypothetical +2; 2 is a +1 temporary.
  const initialSynergySlots = synergySlotsWith({
    2: { unlocked: true },
    5: { unlocked: true, magnitude: 2 },
  });

  const sequence: Op[] = [
    { op: "purchase", badgeId: "float-game", purchasedLevel: "silver" },
    { op: "purchase", badgeId: "posterizer", purchasedLevel: "gold" },
    { op: "purchase", badgeId: "deadeye", purchasedLevel: "hof" },
    { op: "purchase", badgeId: "float-game", purchasedLevel: "gold" }, // upgrade
    { op: "assign", synergySlotId: 5, role: "fuse", badgeId: "float-game" }, // gold +2 → legend
    { op: "assign", synergySlotId: 2, role: "reaction", badgeId: "deadeye" },
    { op: "purchase", badgeId: "glove", purchasedLevel: "gold" },
    { op: "downgrade", badgeId: "posterizer", purchasedLevel: "bronze" },
    { op: "clear", synergySlotId: 2, role: "reaction" },
    { op: "assign", synergySlotId: 2, role: "fuse", badgeId: "deadeye" }, // hof +1 → legend (temporary)
    { op: "purchase", badgeId: "dimer", purchasedLevel: "silver" },
    { op: "remove", badgeId: "dimer" },
  ];

  const replayed = sequence.reduce(applyOp, {
    loadout: [] as LoadoutEntry[],
    synergySlots: initialSynergySlots,
  } as SynergyState);

  /** The same end state, constructed DIRECTLY — no history. */
  const direct: SynergyState = {
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "deadeye", purchasedLevel: "hof" },
      { badgeId: "glove", purchasedLevel: "gold" },
      { badgeId: "posterizer", purchasedLevel: "bronze" },
    ],
    synergySlots: synergySlotsWith({
      2: { unlocked: true, fuseBadgeId: "deadeye" },
      5: { unlocked: true, magnitude: 2, fuseBadgeId: "float-game" },
    }),
  };

  function ledgerOf(state: SynergyState) {
    const full: SynergyLedgerState = {
      loadout: state.loadout,
      budgets: makeBudgets(16, 3),
      synergySlots: state.synergySlots,
      refundTrigger: "legendByAnyMeans",
    };
    return { current: ledger(full, "current"), postSeasonReset: ledger(full, "postSeasonReset") };
  }

  it("ledger(replayed) equals ledger(direct) on BOTH bases — no memory of the path exists", () => {
    expect(ledgerOf(replayed)).toEqual(ledgerOf(direct));
  });

  it("spot values: the end state's numbers stand alone", () => {
    const { current, postSeasonReset } = ledgerOf(replayed);
    // Finishing: float-game A gold (6) + posterizer A bronze (3); float-game
    // fused +2 (permanent) → legend → refund 6.
    expect(current.Finishing).toEqual({
      spent: 9,
      refunded: 6,
      remainingPoints: 16 - 9 + 6,
      equipSlotsUsed: 2,
    });
    // Shooting: deadeye A hof (7), fused +1 in TEMPORARY synergy slot 2 →
    // legend → refund 7 on the primary basis…
    expect(current.Shooting.refunded).toBe(7);
    // …which the postSeasonReset basis drops (temporary slot inactive there),
    // while Finishing's permanent-slot refund survives.
    expect(postSeasonReset.Shooting.refunded).toBe(0);
    expect(postSeasonReset.Finishing.refunded).toBe(6);
    // Playmaking: dimer was purchased then removed — nothing remains.
    expect(current.Playmaking).toEqual({
      spent: 0,
      refunded: 0,
      remainingPoints: 16,
      equipSlotsUsed: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// F4 group 9 — `onFuse`, the RATIFIED refund trigger and the new default.
// `[official 2K MyPlayer Builder page: fusing "entirely frees up the Badge
//   Tokens"; user ratification 2026-08-26]`
//
// The refund becomes ROLE-KEYED, not level-keyed. Amount and destination are
// UNCHANGED: total-to-own cost at the purchased level, to the badge's own
// category pool.
// ---------------------------------------------------------------------------

describe("F4 group 9 — onFuse refund arithmetic", () => {
  function onFuseReadout(
    synergySlots: SynergySlot[],
    purchasedLevel: PurchasableLevel,
    basis: "current" | "postSeasonReset" = "current",
  ) {
    const state: SynergyLedgerState = {
      loadout: [{ badgeId: "deadeye", purchasedLevel }],
      budgets: makeBudgets(16, 3),
      synergySlots,
      refundTrigger: "onFuse",
    };
    return categoryLedgerAt(state, basis, "Shooting");
  }

  it("9.1 UNIVERSALITY — every fused badge refunds its FULL spent cost, at every level and both magnitudes", () => {
    // deadeye is Tier A: bronze 3, silver 5, gold 6, hof 7.
    // Explicitly including the pairs the OLD default excluded.
    const fusePlusOne = synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "deadeye" } });
    const fusePlusTwo = synergySlotsWith({
      6: { unlocked: true, magnitude: 2, fuseBadgeId: "deadeye" },
    });
    expect(onFuseReadout(fusePlusOne, "gold").refunded).toBe(6); // gold +1 → HOF: 6
    expect(onFuseReadout(fusePlusOne, "bronze").refunded).toBe(3); // bronze +1: 3
    expect(onFuseReadout(fusePlusTwo, "silver").refunded).toBe(5); // silver +2: 5
    expect(onFuseReadout(fusePlusOne, "hof").refunded).toBe(7);
    expect(onFuseReadout(fusePlusTwo, "hof").refunded).toBe(7);
  });

  it("9.2 ROLE, NOT LEVEL — an unfused badge never refunds at ANY effective level", () => {
    const noRole = synergySlotsWith({ 6: { unlocked: true } });
    for (const level of ["bronze", "silver", "gold", "hof"] as const) {
      expect(onFuseReadout(noRole, level).refunded, level).toBe(0);
    }
    // ...and a Gold badge fused +2 refunds because it is FUSED, not because
    // it reached Legend: the same fuse at Bronze refunds too (9.1).
    const fusePlusTwo = synergySlotsWith({
      6: { unlocked: true, magnitude: 2, fuseBadgeId: "deadeye" },
    });
    expect(onFuseReadout(fusePlusTwo, "gold").refunded).toBe(6);
  });

  it("9.3 REACTION EXCLUSION — a badge holding only a reaction role refunds 0 in BOTH bases", () => {
    const reactionOnly = synergySlotsWith({
      6: { unlocked: true, reactionBadgeId: "deadeye" },
    });
    expect(onFuseReadout(reactionOnly, "gold", "current").refunded).toBe(0);
    expect(onFuseReadout(reactionOnly, "gold", "postSeasonReset").refunded).toBe(0);
  });

  it("9.4 THE H2 INTERACTION — a temporary-slot fuse loses its refund under postSeasonReset; a permanent-slot fuse does not", () => {
    // Tier A gold = 6 tokens; category pool 16; deadeye is the sole Shooting badge.
    const temporary = synergySlotsWith({ 2: { unlocked: true, fuseBadgeId: "deadeye" } });
    const permanent = synergySlotsWith({ 5: { unlocked: true, fuseBadgeId: "deadeye" } });

    const tempCurrent = onFuseReadout(temporary, "gold", "current");
    expect(tempCurrent).toMatchObject({ spent: 6, refunded: 6, remainingPoints: 16 });
    const tempReset = onFuseReadout(temporary, "gold", "postSeasonReset");
    expect(tempReset).toMatchObject({ spent: 6, refunded: 0, remainingPoints: 10 });

    const permCurrent = onFuseReadout(permanent, "gold", "current");
    expect(permCurrent).toMatchObject({ spent: 6, refunded: 6, remainingPoints: 16 });
    const permReset = onFuseReadout(permanent, "gold", "postSeasonReset");
    expect(permReset).toMatchObject({ spent: 6, refunded: 6, remainingPoints: 16 });
  });

  it("9.5 NO ACCUMULATOR — fuse → unfuse → re-fuse yields the same numbers as fusing once", () => {
    const fused = synergySlotsWith({ 6: { unlocked: true, fuseBadgeId: "deadeye" } });
    const once = onFuseReadout(fused, "gold");
    // The ledger is a pure function of the END state; there is no path memory
    // anywhere in the codebase, and re-deriving from the same end state proves it.
    const unfused = synergySlotsWith({ 6: { unlocked: true } });
    expect(onFuseReadout(unfused, "gold").refunded).toBe(0);
    expect(onFuseReadout(fused, "gold")).toEqual(once);
  });

  it("9.7 H2 CHANNEL GUARD — the refund still reads the CANONICAL activity predicate, so a LOCKED fuse slot refunds nothing", () => {
    // synergySlotActive is `unlocked && !(seasonReset && temporary)`. Reusing
    // it — never hand-negating it — is what makes it structurally impossible
    // for the refund to disagree with the boost math.
    const lockedFuse = synergySlotsWith({ 6: { unlocked: false, fuseBadgeId: "deadeye" } });
    expect(onFuseReadout(lockedFuse, "gold").refunded).toBe(0);
    expect(onFuseReadout(lockedFuse, "gold", "postSeasonReset").refunded).toBe(0);
  });
});
