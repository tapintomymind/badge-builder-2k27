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

  it("F4 7.3 — RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS is [7] (Build Specialization Level 10)", () => {
    expect([...RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS]).toEqual([7]);
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

  it("F4 7.6(b) — createDefaultSynergySlots(null) yields EXACTLY ONE +2, and it is Synergy Slot 7", () => {
    const plusTwo = createDefaultSynergySlots(null).filter((slot) => slot.magnitude === 2);
    expect(plusTwo).toHaveLength(1);
    expect(plusTwo[0]?.id).toBe(7);
  });

  it("F4 7.6(c) — createDefaultSynergySlots([3,6]) yields THREE +2: documented, UNREACHABLE-IN-APP behaviour", () => {
    // The derivation deliberately does NOT enforce the cap. The cap belongs
    // to validateLoadout's tooManyPlusTwoSynergySlots, once, and this
    // function's job is to derive faithfully. The state is unreachable in the
    // shipped app because createDefaultSynergySlots has exactly ONE src/ call
    // site (App.tsx freshWorkingState), it passes
    // defaultAppConfig.plusTwoSlotIds, that constant is null, and NOTHING
    // ever writes it (the designator writes magnitudes onto the slots).
    const plusTwo = createDefaultSynergySlots([3, 6]).filter((slot) => slot.magnitude === 2);
    expect(plusTwo.map((slot) => slot.id)).toEqual([3, 6, 7]);
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
