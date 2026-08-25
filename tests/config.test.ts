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
import type { Budget } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { CATEGORIES } from "../src/engine/vocabulary";
import { makeBuild } from "./helpers/test-utils";

describe("config seams for the three unpublished 2K facts", () => {
  it("refundTrigger defaults to legendByAnyMeans — EXACTLY the seed's stated default (Open item #1)", () => {
    expect(DEFAULT_REFUND_TRIGGER).toBe("legendByAnyMeans");
    expect(defaultAppConfig.refundTrigger).toBe("legendByAnyMeans");
  });

  it("plusTwoSlotIds is null — which two synergy slots are +2 is unpublished and NEVER guessed (Open item #2)", () => {
    expect(plusTwoSlotIds).toBeNull();
    expect(defaultAppConfig.plusTwoSlotIds).toBeNull();
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
