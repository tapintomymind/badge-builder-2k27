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
  applyRatifiedMagnitudes,
  isRatifiedPlusTwo,
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

  /**
   * [F4/7.8] RE-DECIDED, not patched to green. This assertion previously read
   * "every synergy slot is magnitude 1 — no +2 pair is ever guessed", which
   * encoded the PRE-F4 ruling that nothing ships +2 by default. That ruling
   * is superseded: Synergy Slot 7's +2 is now RATIFIED DATA (Build
   * Specialization Level 10; official 2K MyPlayer Builder page + user
   * ratification 2026-08-26) — it is no longer a guess, so the never-guess
   * rule no longer applies to it.
   *
   * The half that SURVIVES verbatim: the SECOND +2 is still unpublished and
   * is still never guessed. That is what the six magnitude-1 slots and the
   * null designation seam now assert.
   */
  it("F4 7.1 / A7 — with userDesignated null (the SHIPPED default) Synergy Slots 7 and 8 are +2 (RATIFIED) and every other synergy slot is 1", () => {
    // The membership test reads the CONSTANT rather than re-typing the ids:
    // this assertion is about the derivation honouring the ratified set, and
    // a second hand-written copy of the set would pass while disagreeing.
    for (const synergySlot of createDefaultSynergySlots(null)) {
      expect(synergySlot.magnitude, `Synergy Slot ${synergySlot.id}`).toBe(
        isRatifiedPlusTwo(synergySlot.id) ? 2 : 1,
      );
    }
    for (const id of SYNERGY_SLOT_IDS) {
      expect(magnitudeForSynergySlot(id, null), `Synergy Slot ${id}`).toBe(
        isRatifiedPlusTwo(id) ? 2 : 1,
      );
    }
    // …and the set really is the two, so the line above cannot go vacuous.
    expect(SYNERGY_SLOT_IDS.filter((id) => isRatifiedPlusTwo(id))).toEqual([7, 8]);
  });

  it("F4 7.1 — createDefaultSynergySlots sets disciplineLock null on all eight (Synergy Slot 7's lock is USER-selected)", () => {
    for (const synergySlot of createDefaultSynergySlots()) {
      expect(synergySlot.disciplineLock).toBeNull();
    }
  });

  it("the user designation seam adds a +2 ON TOP of the ratified set (the unpublished second +2 SUPPLIED, never guessed)", () => {
    // Hypothetical designation — exercises the seam, asserts nothing about 2K27.
    // [A7] Three +2 now: the designated 3 plus the ratified 7 and 8. The seam
    // still ADDS rather than replacing, and still refuses to drop the id.
    const synergySlots = createDefaultSynergySlots([3]);
    expect(synergySlots.filter((s) => s.magnitude === 2).map((s) => s.id)).toEqual([3, 7, 8]);
    expect(synergySlots.filter((s) => s.magnitude === 1)).toHaveLength(5);
  });

  it("F4 7.2/7.7 / A7 — the ratified +2 is an ENGINE predicate: isRatifiedPlusTwo(7) and (8) true, isRatifiedPlusTwo(3) false", () => {
    expect(isRatifiedPlusTwo(7)).toBe(true);
    expect(isRatifiedPlusTwo(8)).toBe(true);
    for (const id of SYNERGY_SLOT_IDS) {
      if (id === 7 || id === 8) continue;
      expect(isRatifiedPlusTwo(id), `Synergy Slot ${id}`).toBe(false);
    }
  });

  it("F4 7.2 — Synergy Slot 7 cannot be derived back to +1 by any designation, and un-designating a user slot returns it to +1", () => {
    // No designation list can make slot 7 a +1 — it is data, not preference.
    expect(magnitudeForSynergySlot(7, [])).toBe(2);
    expect(magnitudeForSynergySlot(7, [3])).toBe(2);
    // Un-designating slot 3 returns it to +1.
    expect(magnitudeForSynergySlot(3, [3])).toBe(2);
    expect(magnitudeForSynergySlot(3, [])).toBe(1);
  });
});

describe("F4 — applyRatifiedMagnitudes (P4, the read-time projection)", () => {
  it("overrides a persisted +1 on Synergy Slot 7 and REPORTS it", () => {
    const stale = createDefaultSynergySlots().map((slot) =>
      slot.id === 7 ? { ...slot, magnitude: 1 as const } : slot,
    );
    const report = applyRatifiedMagnitudes(stale);
    expect(report.synergySlots.find((slot) => slot.id === 7)?.magnitude).toBe(2);
    expect(report.normalizedSynergySlotIds).toEqual([7]);
  });

  it("reports NOTHING when Synergy Slot 7 already carried +2 — a disclosure that always renders is not a disclosure", () => {
    const report = applyRatifiedMagnitudes(createDefaultSynergySlots());
    expect(report.normalizedSynergySlotIds).toEqual([]);
  });

  it("[NIT-3] maps over the slots ACTUALLY PRESENT — a missing Synergy Slot 7 is NEVER synthesized", () => {
    const short = createDefaultSynergySlots().filter((slot) => slot.id !== 7);
    const report = applyRatifiedMagnitudes(short);
    expect(report.synergySlots).toHaveLength(7);
    expect(report.synergySlots.some((slot) => slot.id === 7)).toBe(false);
    expect(report.normalizedSynergySlotIds).toEqual([]);
  });

  it("never mutates its input", () => {
    const stale = createDefaultSynergySlots().map((slot) =>
      slot.id === 7 ? { ...slot, magnitude: 1 as const } : slot,
    );
    applyRatifiedMagnitudes(stale);
    expect(stale.find((slot) => slot.id === 7)?.magnitude).toBe(1);
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
            disciplineLock: null,
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

  /**
   * [F4/7.8] RE-DECIDED, not patched to green. The old expectation was
   * `[]` on the defaults, which encoded the pre-F4 ruling that no slot ships
   * +2. Synergy Slot 7's +2 is now RATIFIED data, so the defaults legitimately
   * contain one. The function's CONTRACT — "list the magnitude-2 ids in array
   * order" — is unchanged and is what is still under test; only the fixture's
   * truth changed. [A7] It changed once more when Synergy Slot 8 was
   * ratified: the defaults now contain TWO, and the second case four.
   */
  it("lists the magnitude-2 synergy slot ids in array order (the defaults now contain the RATIFIED Synergy Slots 7 and 8)", () => {
    expect(plusTwoSynergySlotIds(createDefaultSynergySlots())).toEqual([7, 8]);
    // ARRAY ORDER, not designation order — 3 and 6 are user-designated on top
    // of the ratified pair and still sort into slot-id position. This case is
    // over the sealed cap by two, which is validateLoadout's to DISCLOSE and
    // deliberately not this function's to drop.
    expect(
      plusTwoSynergySlotIds(synergySlotsWith({ 3: { magnitude: 2 }, 6: { magnitude: 2 } })),
    ).toEqual([3, 6, 7, 8]);
  });
});

describe("F4 slice B — the disciplineLock refusal in assignSynergy (RATIFIED, HARD)", () => {
  // deadeye is Shooting; float-game is Finishing; glove is Defense.
  const loadout: LoadoutEntry[] = [
    { badgeId: "deadeye", purchasedLevel: "gold" },
    { badgeId: "float-game", purchasedLevel: "gold" },
  ];

  function stateWithLock(lock: SynergySlot["disciplineLock"]): SynergyState {
    return {
      loadout,
      synergySlots: synergySlotsWith({ 7: { unlocked: true, disciplineLock: lock } }),
    };
  }

  it("a null lock accepts any discipline — Synergy Slots 1-6 and 8 are permanently interchangeable", () => {
    const result = assignSynergy(stateWithLock(null), 7, "fuse", "float-game");
    expect(result.ok).toBe(true);
  });

  it("a matching discipline is accepted", () => {
    const result = assignSynergy(stateWithLock("Finishing"), 7, "fuse", "float-game");
    expect(result.ok).toBe(true);
  });

  it("an off-discipline badge is REFUSED with a typed error carrying both categories", () => {
    const result = assignSynergy(stateWithLock("Finishing"), 7, "fuse", "deadeye");
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "badgeCategoryViolatesDisciplineLock",
        synergySlotId: 7,
        badgeId: "deadeye",
        badgeCategory: "Shooting",
        disciplineLock: "Finishing",
      },
    });
  });

  it("BOTH role positions are checked — fuse and reaction are two separately-locked positions", () => {
    // Citation strength: this is the reconciliation's ENDORSED READING of
    // §D.2's "each" (§D.3 flags the token as ambiguous), not page text.
    for (const roleKind of ["fuse", "reaction"] as const) {
      const result = assignSynergy(stateWithLock("Finishing"), 7, roleKind, "deadeye");
      expect(result.ok, roleKind).toBe(false);
    }
  });

  it("the lock is checked LAST — an unpurchased target still reports targetBadgeNotPurchased", () => {
    const result = assignSynergy(stateWithLock("Finishing"), 7, "fuse", "glove");
    expect(result).toEqual({
      ok: false,
      error: { kind: "targetBadgeNotPurchased", badgeId: "glove" },
    });
  });

  it("assignSynergy NEVER auto-clears — setting a lock afterwards leaves the assignment in place", () => {
    // The reachable route is: assign while the lock is null, THEN set it. H8
    // forbids silently re-validating a plan away, so the resulting state is
    // reported by validateLoadout and disclosed, never resolved here.
    const assigned = assignSynergy(stateWithLock(null), 7, "fuse", "deadeye");
    expect(assigned.ok).toBe(true);
    const locked = (assigned as { ok: true; synergySlots: SynergySlot[] }).synergySlots.map(
      (slot) => (slot.id === 7 ? { ...slot, disciplineLock: "Finishing" as const } : slot),
    );
    expect(locked.find((slot) => slot.id === 7)?.fuseBadgeId).toBe("deadeye");
  });
});
