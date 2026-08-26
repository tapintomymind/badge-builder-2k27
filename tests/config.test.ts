/**
 * Config seam tests (seed: Open items — implement behind config, don't guess).
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUDGET_STRATEGY,
  DEFAULT_REFUND_TRIGGER,
  NotYetPublishedError,
  defaultAppConfig,
  deriveBudget,
  plusTwoSlotIds,
} from "../src/config";
import {
  MAX_PLUS_TWO_SYNERGY_SLOTS,
  RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS,
  createDefaultSynergySlots,
} from "../src/engine/synergy";
import type { Budget } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

describe("config seams for the three unpublished 2K facts", () => {
  it("F4 7.3 — refundTrigger defaults to onFuse (Open item #1 RESOLVED: official 2K page + user ratification 2026-08-26)", () => {
    expect(DEFAULT_REFUND_TRIGGER).toBe("onFuse");
    expect(defaultAppConfig.refundTrigger).toBe("onFuse");
  });

  it("F4 7.3 — plusTwoSlotIds is null, and its meaning is now USER-DESIGNATION-ONLY (beyond the ratified set)", () => {
    expect(plusTwoSlotIds).toBeNull();
    expect(defaultAppConfig.plusTwoSlotIds).toBeNull();
  });

  it("F4 7.3 / A7 — RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS is [7, 8] and FILLS the sealed cap", () => {
    // 7 = Build Specialization Level 10. 8 = the second +2, user-ratified
    // 2026-08-26 (the confirmation F11 recorded while this set held one id).
    expect([...RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS]).toEqual([7, 8]);
    // THE CAP IS NOW EXACTLY FULL, which is what retires the designator
    // banner. Asserted as a RELATION, not a second literal: if a future id is
    // added without raising the cap, this reddens instead of shipping a
    // ratified set the validator will immediately call a violation.
    expect(RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS.length).toBe(MAX_PLUS_TWO_SYNERGY_SLOTS);
  });

  /**
   * [F4/A1 — the SECOND DOOR] The fresh path is provably single-+2.
   *
   * Test 8.3 requires the deserializer to ACCEPT `plusTwoSlotIds: [3,6]`, and
   * magnitudeForSynergySlot derives FAITHFULLY (it never silently drops a
   * designated id — a silent drop would be an auto-mutation of a user
   * designation, which the LOAD path refuses). So `[3,6]` would describe a
   * THREE-+2 fresh build. It is unreachable in the shipped app, and that is
   * pinned here rather than assumed.
   */
  it("F4 7.6(a) — defaultAppConfig.plusTwoSlotIds is null", () => {
    expect(defaultAppConfig.plusTwoSlotIds).toBeNull();
  });

  it("F4 7.6(b) / A7 — createDefaultSynergySlots(null) yields EXACTLY TWO +2: Synergy Slots 7 and 8", () => {
    const plusTwo = createDefaultSynergySlots(null).filter((slot) => slot.magnitude === 2);
    expect(plusTwo).toHaveLength(2);
    expect(plusTwo.map((slot) => slot.id)).toEqual([7, 8]);
  });

  it("F4 7.6(c) — createDefaultSynergySlots([3,6]) yields FOUR +2: documented, UNREACHABLE-IN-APP behaviour", () => {
    // The derivation deliberately does NOT enforce the cap. The cap belongs
    // to validateLoadout's tooManyPlusTwoSynergySlots, once, and this
    // function's job is to derive faithfully. The state is unreachable in the
    // shipped app because createDefaultSynergySlots has exactly ONE src/ call
    // site (App.tsx freshWorkingState), it passes
    // defaultAppConfig.plusTwoSlotIds, that constant is null, and NOTHING
    // ever writes it (the designator writes magnitudes onto the slots).
    // [A7] FOUR now, not three — the ratified set grew by one and the
    // derivation still refuses to drop a designated id.
    const plusTwo = createDefaultSynergySlots([3, 6]).filter((slot) => slot.magnitude === 2);
    expect(plusTwo.map((slot) => slot.id)).toEqual([3, 6, 7, 8]);
  });

  it("budget strategy defaults to manual (Open item #3)", () => {
    expect(DEFAULT_BUDGET_STRATEGY).toBe("manual");
    expect(defaultAppConfig.budgetStrategy).toBe("manual");
  });

  it("deriveBudget manual strategy returns the user's manual per-category inputs untouched", () => {
    const manual = Object.fromEntries(
      CATEGORIES.map((category, index) => [category, { points: 10 + index, equipSlots: 3 }]),
    ) as Record<Category, Budget>;
    expect(deriveBudget(makeBuild(78, 85), manual, "manual")).toBe(manual);
  });

  it("deriveBudget derived strategy throws NotYetPublishedError — the M5 drop-in seam, stubbed, never guessed", () => {
    const manual = Object.fromEntries(
      CATEGORIES.map((category) => [category, { points: 10, equipSlots: 3 }]),
    ) as Record<Category, Budget>;
    expect(() => deriveBudget(makeBuild(78, 85), manual, "derived")).toThrowError(
      NotYetPublishedError,
    );
  });
});
