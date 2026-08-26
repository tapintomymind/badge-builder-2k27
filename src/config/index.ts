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
import type { Attr, Category } from "../engine/vocabulary";

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
 * so the trigger is the FUSE ROLE, not a level.
 *
 * RATIFIED DATA, NOT A PREFERENCE — and the rename is the whole point of
 * F16.1. While Open item #1 was unresolved the app DEFAULTED this to
 * `legendByAnyMeans`; "default" was the honest word for a placeholder. It is
 * no longer a placeholder, and nothing in the app can select anything else:
 * there is no picker, no route and no gesture that writes `refundTrigger`
 * (`rg refundTrigger src/` finds readers only). The three Legend/HOF variants
 * remain PRE-WIRED IN THE ENGINE — `refundTriggered` is total over all four
 * and the engine suites exercise all four — but they are not reachable from
 * the UI, so no user choice of trigger exists to preserve.
 *
 * Refund AMOUNT and DESTINATION are unchanged: the badge's total-to-own cost
 * at its purchased level, back to that badge's own category pool.
 */
export const RATIFIED_REFUND_TRIGGER: RefundTrigger = "onFuse";

/** The trigger a FRESH build starts at. Same value, different question — this
 * one is "what does a new AppConfig carry", `RATIFIED_REFUND_TRIGGER` is "what
 * is true of 2K27". They are one constant apart deliberately: the load-path
 * normalizer below must read the FACT, never the new-build default, or a
 * future divergence would silently re-point it. */
export const DEFAULT_REFUND_TRIGGER: RefundTrigger = RATIFIED_REFUND_TRIGGER;

/** The result of re-deriving the ratified refund trigger over a LOADED
 * AppConfig. Shaped exactly like `RatifiedMagnitudeReport`
 * (src/engine/synergy.ts), because it is the same class of correction. */
export interface RatifiedRefundTriggerReport {
  readonly config: AppConfig;
  /** Did this load OVERRIDE a persisted trigger with the ratified one? False
   * on a fresh build and on a file that already carried it, so the disclosure
   * is a DISCLOSURE and not decoration. */
  readonly refundTriggerNormalized: boolean;
}

/**
 * [F16.1] The read-time projection for the refund trigger — the sibling
 * `applyRatifiedMagnitudes` has had since F4, and the one F4 shipped without.
 *
 * WHAT WENT WRONG. F4 landed two ratified facts on 2026-08-26. Synergy Slot
 * 7's +2 got `applyRatifiedMagnitudes` plus a disclosure at all three load
 * routes; the `onFuse` trigger got the DEFAULT flipped and nothing else. A
 * default only reaches a build that is CONSTRUCTED after the flip. Every build
 * saved before it — which, on 2026-08-26, is every build in existence — kept
 * the `legendByAnyMeans` placeholder in `config.refundTrigger`, and
 * `fromSaved` restored it verbatim. Fusing a badge then freed nothing, on
 * every ledger surface at once, with no error and entirely plausible numbers.
 * F4's own reportback predicted the opposite ("the onFuse flip changes
 * on-screen ledger numbers for any build with fused badges"); for existing
 * builds it did not.
 *
 * WHY OVERRIDING THE FILE IS RIGHT HERE, AND IS NOT AN H8 AUTO-MIGRATION.
 * `applyRatifiedMagnitudes` states the test: "the user never chose +1 for
 * Synergy Slot 7 — the app defaulted it there while the data was unknown.
 * Correcting it when the data lands is the same class as a threshold moving in
 * badges.json, and H8's answer to that is DISCLOSE." Identical here, and one
 * degree stronger: Synergy Slot magnitudes at least HAVE a control the user
 * could have touched. `refundTrigger` has none. A persisted non-ratified value
 * is therefore PROVABLY app-authored, never user-authored, so nothing of the
 * user's is being overwritten. It is a DATA REFRESH, and it is disclosed.
 *
 * ⚠ THE ONE CONDITION THAT WOULD MAKE THIS WRONG. The day a trigger PICKER
 * ships, a persisted value stops being provably app-authored and this
 * function must stop being unconditional — it would need an explicit "the
 * user chose this" channel to read, exactly as design-spec §17.9's `entered`
 * channel is what Badge Slots capacity is waiting on. Until such a channel
 * exists the two cases are indistinguishable, and the app must not pretend
 * otherwise in EITHER direction. `tests/config.test.ts` pins the no-writer
 * premise so this comment cannot quietly go stale.
 *
 * SERIALIZATION IS UNTOUCHED. `validateConfig` still accepts all four values
 * and `toEnvelope` still writes whatever the working state holds — a shape
 * validator that REFUSED a value the app itself once wrote would turn a
 * disclosable state into an unloadable file, which is the exact mistake F4/A1
 * records at the +2 cap. Shape validates; rules normalize.
 */
export function applyRatifiedRefundTrigger(config: AppConfig): RatifiedRefundTriggerReport {
  if (config.refundTrigger === RATIFIED_REFUND_TRIGGER) {
    return { config, refundTriggerNormalized: false };
  }
  return {
    config: { ...config, refundTrigger: RATIFIED_REFUND_TRIGGER },
    refundTriggerNormalized: true,
  };
}

/**
 * Dead seam, retyped for shape only. Designates Synergy Slots the user picked
 * as +2 BEYOND the ratified set (Synergy Slots 7 and 8 — see
 * `RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS` in src/engine/synergy.ts).
 *
 * NOTHING WRITES THIS TODAY — the designator continues to write magnitudes
 * onto the slots (`SynergyPanel` `handleMagnitudeChange`), never config.
 * Retained because a deserialized `AppConfig` may legally carry it (pre-F4
 * files carry `[3,6]`) and the superset validator must keep accepting it.
 *
 * [A7] Seed Open item #2 is now FULLY resolved: Synergy Slots 7 and 8 are
 * BOTH ratified +2, which fills MAX_PLUS_TWO_SYNERGY_SLOTS. The seam stays
 * anyway — a deserialized AppConfig may legally carry it, and any value it
 * carries now lands OVER the cap and is DISCLOSED by validateLoadout rather
 * than dropped. That is the H8 ruling, not an oversight.
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

/**
 * [A6] The attribute domain's upper bound, NAMED so the cap-broken value is
 * bounded by a constant rather than a fresh literal and can never drift from
 * the bound the entered value has carried since M1 (the wire validator's
 * `> 99`, the slider's own max). The A6 tests pin the two together.
 *
 * NOT A CLAIM ABOUT 2K27 [A6-R3 · OQ-A6-1]. The official page's "99 OVR" is
 * an OVERALL rating, not a per-attribute ceiling, and whether a cap breaker
 * can push an attribute past 99 is unpublished. This is THIS APP'S OWN 0–99
 * domain — which predates cap breakers by four milestones — applied to a
 * second value in the same domain. If the real bound ever lands, it is this
 * one constant.
 */
export const ATTRIBUTE_CEILING = 99;

/**
 * [A6] The cap-breaker seam, shaped exactly like `deriveBudget` above.
 *
 * `manual` (active) IS the whole shipped feature: the user reads the boosted
 * value off the 2K builder and types it in. `derived` is the stub the real
 * formula would drop into IF 2K ever published the cap-breaker →
 * per-attribute boost mapping — which it does not: the mapping exists only as
 * an in-builder preview at 99 OVR. 5 breakers took the user's Three-Point
 * 60 → 83, which is neither +1 each nor evenly divided, so there is nothing
 * here to interpolate and nothing may ever be invented [seed: never invent
 * 2K27 data · ship gate A6-R9 1.6].
 *
 * DELIBERATELY NOT ON `AppConfig` [A6-R2]. `deriveBudget`'s strategy lives on
 * AppConfig because the M5 flip is a per-BUILD user choice; a published
 * cap-breaker mapping would be a global app FACT. The concrete payoff is that
 * `validateConfig` does not move and the persisted `config` shape is
 * untouched by A6 — and `validateConfig` is exactly where F4/R3, this
 * project's most recent boot-breaker, lived.
 */
export type CapBreakerStrategy = "manual" | "derived";

export const DEFAULT_CAP_BREAKER_STRATEGY: CapBreakerStrategy = "manual";

export function deriveCapBrokenAttributes(
  build: Build,
  manual: Partial<Record<Attr, number>>,
  strategy: CapBreakerStrategy = DEFAULT_CAP_BREAKER_STRATEGY,
): Partial<Record<Attr, number>> {
  switch (strategy) {
    case "manual":
      return manual;
    case "derived":
      // `build` is the future input of the real formula; referenced so the
      // seam's signature is honest about what it would consume.
      void build;
      throw new NotYetPublishedError(
        "The cap-breaker count → per-attribute boost mapping",
      );
  }
}

export const defaultAppConfig: AppConfig = {
  refundTrigger: DEFAULT_REFUND_TRIGGER,
  plusTwoSlotIds,
  budgetStrategy: DEFAULT_BUDGET_STRATEGY,
};
