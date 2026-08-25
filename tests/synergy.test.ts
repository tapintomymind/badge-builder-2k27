/**
 * Synergy engine tests (M2) — model defaults, exclusive effective level (H5),
 * and the H4 invariant rejections. assignSynergy/clearSynergy return TYPED
 * errors and never partially mutate: every rejection asserts the input state
 * is deeply unchanged.
 *
 * NOTE ON MAGNITUDES: any magnitude-2 synergy slot in this file is a
 * TEST-LOCAL HYPOTHETICAL exercising the per-slot-data seam. Which two 2K27
 * synergy slots are +2 is UNPUBLISHED (OQ-A1); the shipped default is all 8
 * at magnitude 1 with plusTwoSlotIds null, and nothing here changes that.
 */

import { describe, expect, it } from "vitest";
import {
  assignSynergy,
  boost,
  clampToLegend,
  clearSynergy,
  createDefaultSynergySlots,
  defaultOverlay,
  effectiveLevel,
  magnitudeForSynergySlot,
  MAX_PLUS_TWO_SYNERGY_SLOTS,
  permanenceForSynergySlot,
  plusTwoSynergySlotIds,
  SYNERGY_SLOT_IDS,
  synergyRoleFor,
  synergySlotActive,
  synergySlotDisabledByPreview,
} from "../src/engine/synergy";
import type { SynergyState } from "../src/engine/synergy";
import type { LoadoutEntry, OverlayState, SynergySlot, SynergySlotId } from "../src/engine/types";

function synergySlotsWith(
  overrides: Partial<Record<SynergySlotId, Partial<SynergySlot>>>,
): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) => ({
    ...synergySlot,
    ...overrides[synergySlot.id],
  }));
}

const overlay = (reactionsActive: boolean, seasonReset: boolean): OverlayState => ({
  reactionsActive,
  seasonReset,
});

describe("synergy slot model (seed: Synergy system)", () => {
  it("defaults: 8 synergy slots, ids 1–8, locked, unassigned", () => {
    const synergySlots = createDefaultSynergySlots();
    expect(synergySlots).toHaveLength(8);
    expect(synergySlots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const synergySlot of synergySlots) {
      expect(synergySlot.unlocked).toBe(false);
      expect(synergySlot.fuseBadgeId).toBeNull();
      expect(synergySlot.reactionBadgeId).toBeNull();
    }
  });

  it("permanence table: synergy slots 1–4 temporary, 5–8 permanent", () => {
    for (const id of SYNERGY_SLOT_IDS) {
      expect(permanenceForSynergySlot(id)).toBe(id <= 4 ? "temporary" : "permanent");
    }
    const synergySlots = createDefaultSynergySlots();
    expect(synergySlots.filter((s) => s.permanence === "temporary").map((s) => s.id)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(synergySlots.filter((s) => s.permanence === "permanent").map((s) => s.id)).toEqual([
      5, 6, 7, 8,
    ]);
  });

  it("OQ-A1 ruling: with plusTwoSlotIds null (the SHIPPED default) every synergy slot is magnitude 1 — no +2 pair is ever guessed", () => {
    for (const synergySlot of createDefaultSynergySlots(null)) {
      expect(synergySlot.magnitude).toBe(1);
    }
    for (const id of SYNERGY_SLOT_IDS) {
      expect(magnitudeForSynergySlot(id, null)).toBe(1);
    }
  });

  it("once the user designates two ids, exactly those two are +2 (the seed's 6×(+1)/2×(+2) with the unpublished fact SUPPLIED)", () => {
    // Hypothetical designation — exercises the seam, asserts nothing about 2K27.
    const synergySlots = createDefaultSynergySlots([3, 8]);
    expect(synergySlots.filter((s) => s.magnitude === 2).map((s) => s.id)).toEqual([3, 8]);
    expect(synergySlots.filter((s) => s.magnitude === 1)).toHaveLength(6);
  });
});

describe("synergySlotActive (H5) — the sealed spec's `slotActive`", () => {
  const temporary = synergySlotsWith({ 2: { unlocked: true } })[1] as SynergySlot;
  const permanent = synergySlotsWith({ 6: { unlocked: true } })[5] as SynergySlot;

  it("a locked synergy slot is never active", () => {
    const locked = createDefaultSynergySlots()[0] as SynergySlot;
    expect(synergySlotActive(locked, overlay(false, false))).toBe(false);
    expect(synergySlotActive(locked, overlay(true, true))).toBe(false);
  });

  it("an unlocked temporary synergy slot deactivates ONLY under the season-reset preview", () => {
    expect(synergySlotActive(temporary, overlay(false, false))).toBe(true);
    expect(synergySlotActive(temporary, overlay(true, false))).toBe(true);
    expect(synergySlotActive(temporary, overlay(false, true))).toBe(false);
    expect(synergySlotActive(temporary, overlay(true, true))).toBe(false);
  });

  it("an unlocked permanent synergy slot survives the season-reset preview", () => {
    expect(synergySlotActive(permanent, overlay(false, true))).toBe(true);
    expect(synergySlotActive(permanent, overlay(true, true))).toBe(true);
  });
});

describe("clampToLegend — effective level caps at Legend", () => {
  it("HOF + 2 → Legend (never past the ladder)", () => {
    expect(clampToLegend("hof", 2)).toBe("legend");
    expect(clampToLegend("hof", 1)).toBe("legend");
    expect(clampToLegend("gold", 2)).toBe("legend");
  });

  it("plain arithmetic below the cap", () => {
    expect(clampToLegend("bronze", 0)).toBe("bronze");
    expect(clampToLegend("bronze", 1)).toBe("silver");
    expect(clampToLegend("gold", 1)).toBe("hof");
    expect(clampToLegend("silver", 2)).toBe("hof");
  });
});

describe("effectiveLevel (H5) — exclusive, display-overlay semantics", () => {
  const loadout: LoadoutEntry[] = [
    { badgeId: "float-game", purchasedLevel: "gold" },
    { badgeId: "deadeye", purchasedLevel: "hof" },
    { badgeId: "glove", purchasedLevel: "silver" },
  ];
  // Hypothetical magnitudes — seam exercise, not 2K27 data.
  const synergySlots = synergySlotsWith({
    2: { unlocked: true, magnitude: 2, fuseBadgeId: "float-game" }, // temporary +2
    6: { unlocked: true, magnitude: 1, reactionBadgeId: "deadeye" }, // permanent +1
  });
  const state: SynergyState = { loadout, synergySlots };

  it("an unpurchased badge has no effective level (purchased ≡ equipped)", () => {
    expect(effectiveLevel(state, "posterizer", defaultOverlay)).toBeNull();
  });

  it("a role-free badge plays at its purchased level under every overlay", () => {
    for (const reactionsActive of [false, true]) {
      for (const seasonReset of [false, true]) {
        expect(effectiveLevel(state, "glove", overlay(reactionsActive, seasonReset))).toBe("silver");
      }
    }
  });

  it("fuse: boosted for the entire game at no token cost — gold +2 fuse plays Legend", () => {
    expect(effectiveLevel(state, "float-game", defaultOverlay)).toBe("legend");
    expect(boost(state, "float-game", defaultOverlay)).toBe(2);
  });

  it("reaction: conditional — base level until reactionsActive, boosted level when active", () => {
    expect(effectiveLevel(state, "deadeye", overlay(false, false))).toBe("hof");
    expect(effectiveLevel(state, "deadeye", overlay(true, false))).toBe("legend");
  });

  it("a fuse in a TEMPORARY synergy slot loses its boost under the season-reset preview", () => {
    expect(effectiveLevel(state, "float-game", overlay(false, true))).toBe("gold");
    expect(boost(state, "float-game", overlay(false, true))).toBe(0);
  });

  it("M2 contract item 17: a reaction in a temporary synergy slot shows NO activation under seasonReset — even with reactionsActive on", () => {
    const temporaryReaction: SynergyState = {
      loadout,
      synergySlots: synergySlotsWith({
        3: { unlocked: true, magnitude: 1, reactionBadgeId: "deadeye" },
      }),
    };
    expect(effectiveLevel(temporaryReaction, "deadeye", overlay(true, true))).toBe("hof");
    expect(boost(temporaryReaction, "deadeye", overlay(true, true))).toBe(0);
  });

  it("synergyRoleFor: at most one role, ever — magnitude comes from the holding synergy slot (data, not a constant)", () => {
    expect(synergyRoleFor(synergySlots, "float-game")).toEqual({
      kind: "fuse",
      synergySlotId: 2,
      magnitude: 2,
    });
    expect(synergyRoleFor(synergySlots, "deadeye")).toEqual({
      kind: "reaction",
      synergySlotId: 6,
      magnitude: 1,
    });
    expect(synergyRoleFor(synergySlots, "glove")).toBeNull();
  });
});

describe("assignSynergy — H4 invariant rejections (typed errors, no partial mutation)", () => {
  const loadout: LoadoutEntry[] = [
    { badgeId: "float-game", purchasedLevel: "gold" },
    { badgeId: "deadeye", purchasedLevel: "hof" },
  ];
  const baseSynergySlots = synergySlotsWith({
    5: { unlocked: true, fuseBadgeId: "float-game" },
    6: { unlocked: true },
  });
  const state: SynergyState = { loadout, synergySlots: baseSynergySlots };
  const snapshot = () => JSON.parse(JSON.stringify(state)) as SynergyState;

  it("rejects assigning to a LOCKED synergy slot", () => {
    const before = snapshot();
    const result = assignSynergy(state, 1, "fuse", "deadeye");
    expect(result).toEqual({ ok: false, error: { kind: "synergySlotLocked", synergySlotId: 1 } });
    expect(state).toEqual(before);
  });

  it("rejects an UNPURCHASED target badge", () => {
    const before = snapshot();
    const result = assignSynergy(state, 6, "fuse", "posterizer");
    expect(result).toEqual({
      ok: false,
      error: { kind: "targetBadgeNotPurchased", badgeId: "posterizer" },
    });
    expect(state).toEqual(before);
  });

  it("rejects a SECOND role on a badge that already holds one (H5: at most one, ever)", () => {
    const before = snapshot();
    const result = assignSynergy(state, 6, "reaction", "float-game");
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "badgeAlreadyHoldsSynergyRole",
        badgeId: "float-game",
        existingRole: { kind: "fuse", synergySlotId: 5, magnitude: 1 },
      },
    });
    expect(state).toEqual(before);
  });

  it("rejects the same badge as both fuse AND reaction in one synergy slot", () => {
    const before = snapshot();
    const result = assignSynergy(state, 5, "reaction", "float-game");
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "sameBadgeBothRolesInOneSynergySlot",
        synergySlotId: 5,
        badgeId: "float-game",
      },
    });
    expect(state).toEqual(before);
  });

  it("rejects a synergy slot id missing from the given array", () => {
    const truncated: SynergyState = { loadout, synergySlots: baseSynergySlots.slice(0, 4) };
    const result = assignSynergy(truncated, 7, "fuse", "deadeye");
    expect(result).toEqual({ ok: false, error: { kind: "unknownSynergySlot", synergySlotId: 7 } });
  });

  it("accepts a valid assignment, returning a NEW synergySlots array (input untouched)", () => {
    const before = snapshot();
    const result = assignSynergy(state, 6, "reaction", "deadeye");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const updated = result.synergySlots.find((s) => s.id === 6);
      expect(updated?.reactionBadgeId).toBe("deadeye");
      expect(result.synergySlots).not.toBe(state.synergySlots);
    }
    expect(state).toEqual(before);
  });

  it("set semantics: assigning a new badge to an occupied position replaces the previous occupant (which loses its role)", () => {
    const withDeadeyePurchasable: SynergyState = { loadout, synergySlots: baseSynergySlots };
    const result = assignSynergy(withDeadeyePurchasable, 5, "fuse", "deadeye");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(synergyRoleFor(result.synergySlots, "deadeye")).toEqual({
        kind: "fuse",
        synergySlotId: 5,
        magnitude: 1,
      });
      expect(synergyRoleFor(result.synergySlots, "float-game")).toBeNull();
    }
  });

  it("re-assigning a badge to the exact position it already holds is an idempotent success, not a second role", () => {
    const result = assignSynergy(state, 5, "fuse", "float-game");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.synergySlots).toEqual(baseSynergySlots);
  });
});

describe("clearSynergy — typed results, idempotent, unlocked-only", () => {
  const loadout: LoadoutEntry[] = [{ badgeId: "float-game", purchasedLevel: "gold" }];
  const synergySlots = synergySlotsWith({
    5: { unlocked: true, fuseBadgeId: "float-game" },
  });
  const state: SynergyState = { loadout, synergySlots };

  it("clears an occupied position", () => {
    const result = clearSynergy(state, 5, "fuse");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.synergySlots.find((s) => s.id === 5)?.fuseBadgeId).toBeNull();
      expect(synergyRoleFor(result.synergySlots, "float-game")).toBeNull();
    }
  });

  it("clearing an already-empty position is an idempotent success", () => {
    const result = clearSynergy(state, 5, "reaction");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.synergySlots).toEqual(synergySlots);
  });

  it("rejects clearing on a locked synergy slot (H4 invariant class — the UI never offers the control)", () => {
    const result = clearSynergy(state, 1, "fuse");
    expect(result).toEqual({ ok: false, error: { kind: "synergySlotLocked", synergySlotId: 1 } });
  });

  it("rejects a synergy slot id missing from the given array", () => {
    const truncated: SynergyState = { loadout, synergySlots: synergySlots.slice(0, 4) };
    const result = clearSynergy(truncated, 8, "fuse");
    expect(result).toEqual({ ok: false, error: { kind: "unknownSynergySlot", synergySlotId: 8 } });
  });
});

// ---------------------------------------------------------------------------
// F1 item 4 — synergySlotDisabledByPreview: THE canonical engine predicate
// for the "⟳ Disabled by season-reset preview" UI state, exported so
// components import it instead of hand-negating synergySlotActive (F2 swaps
// the hand-rolled copies). Pinning test: FAILS on pre-fix code, where the
// export did not exist.
// ---------------------------------------------------------------------------

describe("F1 — synergySlotDisabledByPreview (canonical predicate for the preview-disabled state)", () => {
  const allOverlays: OverlayState[] = [
    { reactionsActive: false, seasonReset: false },
    { reactionsActive: false, seasonReset: true },
    { reactionsActive: true, seasonReset: false },
    { reactionsActive: true, seasonReset: true },
  ];

  it("is algebraically `unlocked && !synergySlotActive` for every slot state × overlay", () => {
    for (const unlocked of [false, true]) {
      for (const permanence of ["temporary", "permanent"] as const) {
        for (const testOverlay of allOverlays) {
          const synergySlot: SynergySlot = {
            id: 1,
            unlocked,
            permanence,
            magnitude: 1,
            fuseBadgeId: null,
            reactionBadgeId: null,
          };
          expect(synergySlotDisabledByPreview(synergySlot, testOverlay)).toBe(
            unlocked && !synergySlotActive(synergySlot, testOverlay),
          );
        }
      }
    }
  });

  it("fires ONLY for an unlocked temporary slot under the season-reset preview", () => {
    const temporary = synergySlotsWith({ 2: { unlocked: true } }).find((s) => s.id === 2)!;
    const permanent = synergySlotsWith({ 5: { unlocked: true } }).find((s) => s.id === 5)!;
    const locked = synergySlotsWith({})!.find((s) => s.id === 3)!;
    const reset: OverlayState = { reactionsActive: false, seasonReset: true };

    expect(synergySlotDisabledByPreview(temporary, reset)).toBe(true);
    expect(synergySlotDisabledByPreview(temporary, defaultOverlay)).toBe(false);
    expect(synergySlotDisabledByPreview(permanent, reset)).toBe(false);
    expect(synergySlotDisabledByPreview(locked, reset)).toBe(false);
  });
});

describe("F1 — plusTwoSynergySlotIds + MAX_PLUS_TWO_SYNERGY_SLOTS (the sealed count)", () => {
  it("the sealed cap is exactly 2 (seed: '2 different +2 slots' — count sealed, WHICH two unpublished)", () => {
    expect(MAX_PLUS_TWO_SYNERGY_SLOTS).toBe(2);
  });

  it("lists the magnitude-2 synergy slot ids in array order", () => {
    expect(plusTwoSynergySlotIds(createDefaultSynergySlots())).toEqual([]);
    expect(
      plusTwoSynergySlotIds(synergySlotsWith({ 3: { magnitude: 2 }, 6: { magnitude: 2 } })),
    ).toEqual([3, 6]);
  });
});
