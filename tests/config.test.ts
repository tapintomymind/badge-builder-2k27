/**
 * Config seam tests (seed: Open items — implement behind config, don't guess).
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUDGET_STRATEGY,
  DEFAULT_REFUND_TRIGGER,
  NotYetPublishedError,
  RATIFIED_REFUND_TRIGGER,
  applyRatifiedRefundTrigger,
  defaultAppConfig,
  deriveBudget,
  plusTwoSlotIds,
} from "../src/config";
import {
  MAX_PLUS_TWO_SYNERGY_SLOTS,
  RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS,
  createDefaultSynergySlots,
} from "../src/engine/synergy";
import type { AppConfig, Budget, RefundTrigger } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { makeBuild, srcSources, stripComments } from "./helpers/test-utils";

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

/**
 * [F16.1] The refund trigger's LOAD-TIME correction, and the premise that
 * makes it safe.
 *
 * F4 resolved seed Open item #1 by flipping DEFAULT_REFUND_TRIGGER. A default
 * only reaches a build CONSTRUCTED after the flip, so every build saved before
 * 2026-08-26 kept the `legendByAnyMeans` placeholder and never refunded on a
 * fuse — the user-reported defect. `applyRatifiedRefundTrigger` re-derives it
 * at load, exactly as `applyRatifiedMagnitudes` does for the sibling ratified
 * fact F4 landed the same day.
 */
describe("F16.1 — the ratified refund trigger is re-derived at load", () => {
  const anyConfig = (refundTrigger: RefundTrigger): AppConfig => ({
    ...defaultAppConfig,
    refundTrigger,
  });

  it("the ratified fact and the fresh-build default are the same value", () => {
    // Two constants, one value, on purpose: the normalizer must read the FACT
    // and never the new-build default. If they are ever allowed to diverge,
    // this reddens and forces the decision to be made deliberately.
    expect(RATIFIED_REFUND_TRIGGER).toBe("onFuse");
    expect(DEFAULT_REFUND_TRIGGER).toBe(RATIFIED_REFUND_TRIGGER);
  });

  it("a config already carrying the ratified trigger is returned UNTOUCHED and unreported", () => {
    const config = anyConfig("onFuse");
    const report = applyRatifiedRefundTrigger(config);
    expect(report.refundTriggerNormalized).toBe(false);
    // Identity, not just equality — a normalizer that rebuilt an unchanged
    // object would defeat every referential-equality memo downstream.
    expect(report.config).toBe(config);
  });

  for (const stale of ["legendByAnyMeans", "legendByPermanentBoostOnly", "hofOrAbove"] as const) {
    it(`a persisted ${stale} is corrected to the ratified trigger AND reported`, () => {
      const config = anyConfig(stale);
      const report = applyRatifiedRefundTrigger(config);
      expect(report.config.refundTrigger).toBe(RATIFIED_REFUND_TRIGGER);
      expect(report.refundTriggerNormalized).toBe(true);
      // PURE: the input is never mutated. Every other normalizer in this
      // codebase holds to that and this one is not the exception.
      expect(config.refundTrigger).toBe(stale);
      // Nothing ELSE on the config moves — this corrects one field.
      expect({ ...report.config, refundTrigger: stale }).toEqual(config);
    });
  }

  /**
   * THE PREMISE, MECHANIZED — a CONTAINMENT allowlist, the same shape the
   * cap-breaker lint uses (architecture.test.ts (g)) and for the same reason.
   *
   * Overriding a persisted value unconditionally is only honest while the
   * value is provably APP-authored. It is: nothing in the shipped app can
   * write a chosen `refundTrigger` — there is no picker, no route and no
   * gesture. The nine files below NAME it, and every one of them either
   * authors the ratified constant or forwards a value it was handed.
   *
   * A TENTH FILE NAMING IT REDDENS THIS. That is the point: the likeliest
   * tenth file is a trigger picker, and the day one ships,
   * `applyRatifiedRefundTrigger` must stop overriding unconditionally and gain
   * an explicit "the user chose this" channel to read — the same shape
   * design-spec §17.9's `entered` channel is waiting on for Badge Slots
   * capacity. Until such a channel exists the two cases are indistinguishable
   * and the app must not pretend otherwise in either direction.
   */
  it("PREMISE PIN: refundTrigger is named in exactly nine files, and none of them offers a CHOICE", () => {
    // Word-bounded, so `refundTriggerNormalized` — the DISCLOSURE flag the
    // correction threads to SynergyPanel — is correctly not a mention of the
    // trigger itself.
    const namesIt = Object.keys(srcSources).filter((file) =>
      /\brefundTrigger\b/.test(stripComments(srcSources[file] as string)),
    );
    expect(
      [...namesIt].sort(),
      "a NEW file names refundTrigger — if it is a user-facing picker, " +
        "applyRatifiedRefundTrigger must stop overriding unconditionally",
    ).toEqual(
      [
        "/src/App.tsx", // reads working.config.refundTrigger into LedgerState
        "/src/config/index.ts", // authors the constants + this normalizer
        "/src/engine/ledger.ts", // the four-arm `refundTriggered` switch
        "/src/engine/randomize.ts", // carries it into the roll's working state + token
        "/src/engine/serialization.ts", // SHAPE validation only: accepts all four
        "/src/engine/steps.ts", // carries it into the one-entry probe
        "/src/engine/summary.ts", // ditto
        "/src/engine/synergy-ledger.ts", // forwards it into LedgerState
        "/src/engine/types.ts", // the RefundTrigger union + the AppConfig field
      ].sort(),
    );
  });
});
