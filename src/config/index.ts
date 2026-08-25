/**
 * Config seams for the three unpublished 2K facts (seed: Open items).
 * Where a rule depends on an unconfirmed value, the rule reads from here —
 * when the real value lands (M5), the change is a config edit, not a rewrite.
 *
 * NEVER INVENT 2K27 DATA: unknown stays null / stubbed, never guessed.
 */

import type {
  AppConfig,
  Budget,
  BudgetStrategy,
  Build,
  RefundTrigger,
  SynergySlotId,
} from "../engine/types";
import type { Category } from "../engine/vocabulary";

/** Thrown by seams whose real 2K27 data has not been published yet. */
export class NotYetPublishedError extends Error {
  constructor(what: string) {
    super(`${what} — 2K has not published this. Use the manual seam; never guess.`);
    this.name = "NotYetPublishedError";
  }
}

/**
 * Seed Open item #1: the refund trigger condition is unconfirmed (the
 * category destination IS confirmed). Default is exactly the seed's stated
 * default: refund on reaching Legend by any means. The alternatives are
 * pre-wired so the day 2K publishes, this is a one-line change.
 */
export const DEFAULT_REFUND_TRIGGER: RefundTrigger = "legendByAnyMeans";

/**
 * Seed Open item #2: which two synergy slots carry +2 is TBD. null until the
 * user designates exactly two in the Synergy panel (M4). All 8 synergy slots
 * default to magnitude 1 until then — picking two numbers here would be
 * inventing 2K27 data. When 2K publishes: set `[n, m]`, done (M5).
 */
export const plusTwoSlotIds: readonly [SynergySlotId, SynergySlotId] | null = null;

/**
 * Seed Open item #3: the attribute → per-category (equipSlots, points)
 * derivation is unpublished. `manual` (active) reads the user's per-category
 * inputs; `derived` is the stub the real formula drops into at M5.
 */
export const DEFAULT_BUDGET_STRATEGY: BudgetStrategy = "manual";

export function deriveBudget(
  build: Build,
  manualBudgets: Record<Category, Budget>,
  strategy: BudgetStrategy = DEFAULT_BUDGET_STRATEGY,
): Record<Category, Budget> {
  switch (strategy) {
    case "manual":
      return manualBudgets;
    case "derived":
      // `build` is the future input of the real formula; referenced so the
      // seam's signature is honest about what M5 will consume.
      void build;
      throw new NotYetPublishedError(
        "The attribute → (equipSlots, points) derivation",
      );
  }
}

export const defaultAppConfig: AppConfig = {
  refundTrigger: DEFAULT_REFUND_TRIGGER,
  plusTwoSlotIds,
  budgetStrategy: DEFAULT_BUDGET_STRATEGY,
};
