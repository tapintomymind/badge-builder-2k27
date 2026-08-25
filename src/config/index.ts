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
 * Seed Open item #1 is RESOLVED (F4, 2026-08-26). The official 2K MyPlayer
 * Builder page states that placing a badge in a Fuse position "entirely frees
 * up the Badge Tokens" spent on it, and the user ratified it the same day —
 * so the trigger is the FUSE ROLE, not a level. The three Legend/HOF variants
 * remain fully selectable alternates; they are simply no longer the default.
 *
 * Refund AMOUNT and DESTINATION are unchanged: the badge's total-to-own cost
 * at its purchased level, back to that badge's own category pool.
 */
export const DEFAULT_REFUND_TRIGGER: RefundTrigger = "onFuse";

/**
 * Dead seam, retyped for shape only. Designates Synergy Slots the user picked
 * as +2 BEYOND the ratified set (Synergy Slot 7 — see
 * `RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS` in src/engine/synergy.ts).
 *
 * NOTHING WRITES THIS TODAY — the designator continues to write magnitudes
 * onto the slots (`SynergyPanel` `handleMagnitudeChange`), never config.
 * Retained because a deserialized `AppConfig` may legally carry it (pre-F4
 * files carry `[3,6]`) and the superset validator must keep accepting it.
 *
 * Seed Open item #2 is HALF-resolved: Synergy Slot 7 IS a +2; WHICH further
 * Synergy Slot carries the second is still unpublished and is never guessed.
 */
export const plusTwoSlotIds: readonly SynergySlotId[] | null = null;

/**
 * Seed Open item #3: the attribute → per-category (equipSlots, points)
 * derivation is unpublished. `manual` (active) reads the user's per-category
 * inputs; `derived` is the stub the real formula drops into at M5.
 */
export const DEFAULT_BUDGET_STRATEGY: BudgetStrategy = "manual";

/**
 * [A5] ITS OUTPUT IS THE **BASE** SIX. Composition happens AFTER, at the App
 * seam, in `effectiveBudgets` (src/engine/budget.ts). The bonus layer is never
 * merged into what this returns, and the base-entry grid is wired to THIS
 * record rather than the composed one — otherwise a rendered effective number
 * would be committed straight back as a base on the next blur
 * [scope.md §0.1 A5-R4, A5-R6].
 *
 * A3's Σ = 20 PROPERTY, recorded here where the real derivation will land: the
 * six BASE capacities sum to the 20 a build starts with
 * (`EQUIP_SLOTS_BASELINE`). It is a property of the BASE spread only — "we
 * don't need to include the bonus into the original 20"
 * [user 2026-08-26] — so an applied bonus does not raise it, and the `derived`
 * arm must satisfy it when M5 lands. It is NOT enforced today and must not be:
 * `0` means "not entered" (§4.7), so a partially-entered spread legitimately
 * sums to less than 20, and A3 rules the comparison a DISCLOSURE, never a gate.
 */
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
