/**
 * RollPanel + RollReport + SeedField + RerollConfirmDialog (design-spec §14.7,
 * impl-brief F8-R2 §1(c)–(f)) — component #33.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE IS NOT. It contains no step enumerator, no affordability
 * test, no decline condition and no maximality check. Every number and every
 * outcome is READ OFF `RollResult` (src/engine/randomize.ts). A decline is
 * rendered from its TYPED DISCRIMINANT — `decline.kind` — and never
 * re-derived from readouts, because two implementations of "is this category
 * over-pinned" is exactly how the report starts disagreeing with the roll it
 * describes. [seed: Working agreements #1]
 * ---------------------------------------------------------------------------
 *
 * IN FLOW. NEVER STICKY. NEVER A DIALOG. §5.3's two sticky layers are spoken
 * for (jump nav, category digest) and a third would eat the vertical budget
 * the F14 shell has already spent down to ~0.02pp of margin at its gate. The
 * panel lives inside `.col-right`, which IS the scrollport under the shell and
 * is the document scroller below it — so it costs zero always-visible height
 * in both regimes.
 *
 * `Fill remaining` IS NEVER `disabled`. §4.3's H4 ruling: no control in this
 * app is ever disabled because of the Budget class. It CAN be a no-op, and the
 * report says so per category — which is the roll's most useful output, not
 * its failure mode. A pre-flight "this pin set is impossible" disable is
 * explicitly rejected (§14.1 item 7).
 *
 * `Restore` MAY be disabled, and the difference is the whole of H4: it is
 * gated by an INVARIANT (the roll is not reproducible any more), not by a
 * budget. Its mechanism is the `ReproducibilityToken`'s `inputDigest` — the
 * caller compares the stored token against a freshly computed one and hands
 * down a reason string. THERE IS NO SECOND CHANGE DETECTOR HERE.
 *
 * A ROLL MOVES FOCUS AND DOES NOT ANNOUNCE (§14.10). §6 allows exactly three
 * live regions and this is not a fourth: the report container is
 * `aria-live="off"` and MUST BE, or the focus move and an implicit
 * announcement both fire and the user hears the six-line report twice. The
 * heading text IS the summary, so moving focus to it reads the outcome to a
 * screen-reader user and puts a keyboard user's next Tab at the top of the
 * report. Without the move, `Fill remaining` produces no evidence anything
 * happened — the result is ~600px below, in a different region.
 *
 * THE REPORT IS NOT A ONE-LINE SURFACE (invariant I11). Decline reasons wrap,
 * and that is intended.
 */

import { useEffect, useId, useRef, useState } from "react";
import type {
  CategoryRollReport,
  RollDecline,
  RollResult,
} from "../../engine/randomize";
import { isExchangeStep } from "../../engine/steps";
import type { RollStep } from "../../engine/steps";
import type { BadgeDataset } from "../../engine/types";
import { badgeById } from "../../engine/dataset";
import type { Category } from "../../engine/vocabulary";
import { LEVEL_LABELS } from "../../engine/vocabulary";
import { Button } from "../primitives/Button";

/**
 * THE RATIFIED CLOSING SENTENCE (§14.7). Fixed copy, rendered verbatim, always
 * last. Same device as `DriftBanner`'s "Points remain spent. Nothing was
 * changed for you." — the disclosure that keeps the surface honest is part of
 * the surface, not a footnote someone can trim.
 *
 * EXPORTED because `tests/vocabulary.test.ts` needs the exact literal: this
 * sentence collides head-on with containment lint class 2, whose pattern bans
 * the substring `rank`. The collision is REAL and is documented there rather
 * than resolved by weakening either side — the sentence DENIES ranking, which
 * is the containment stated out loud, and a substring lint cannot tell a
 * denial from an endorsement.
 */
export const ROLL_REPORT_CLOSING_LINE =
  "Chosen at random from what fits. There is no ranking here.";

/** The seed's honesty sentence (§14.7(e)). MANDATORY, once, beneath the field.
 *  Without it the seed silently over-promises, and a silently-wrong
 *  reproduction is worse than none. */
export const SEED_HONESTY_LINE =
  "Same seed + same build + same budgets + same pins reproduces this roll. " +
  "Change any of them and it won't.";

// ---------------------------------------------------------------------------
// Decline + step rendering — every arm reads a typed discriminant.
// ---------------------------------------------------------------------------

/**
 * One decline, from its discriminant. The `heightText` argument is the only
 * thing the component supplies, and it is FORMATTING of a build field, not a
 * derivation about eligibility.
 */
export function declineText(decline: RollDecline, heightText: string): string {
  switch (decline.kind) {
    case "badgeSlotsCapacityUnset":
      // §4.7 consequence 12. NOT A FAILURE, and it must not read as one: `0`
      // suppresses COMPARISONS, and a roll is a comparison against a capacity.
      // Rendered --fg-muted, with no ⚠, alongside declines that are.
      return "nothing rolled — Badge Slots capacity not set";
    case "alreadyOverspent":
      return `nothing rolled — already over by ${decline.overBy}, nothing to fill`;
    case "pinnedOverPoints":
      return (
        `nothing rolled — pinned badges cost ${decline.pinnedNetCost} ` +
        `against a ${decline.pool}-point pool`
      );
    case "pinnedOverBadgeSlots":
      return (
        `nothing rolled — ${decline.pinnedCount} pinned badges ` +
        `against ${decline.equipSlotCapacity} Badge Slots`
      );
    case "noEligibleBadges":
      return `no badge in this category is legal for a ${heightText} build`;
  }
}

/** `Posterizer (Gold)` · `Posterizer (Bronze → Gold)` · `Rise Up → Posterizer
 *  (Gold)`. WHAT was done, never WHY-THIS. */
function stepText(step: RollStep, dataset: BadgeDataset): string {
  const nameOf = (badgeId: string) => badgeById(dataset, badgeId)?.name ?? badgeId;
  const into = `${nameOf(step.badgeId)} (${LEVEL_LABELS[step.toLevel]})`;
  if (isExchangeStep(step)) return `${nameOf(step.outBadgeId)} → ${into}`;
  if (step.fromLevel === null) return into;
  return `${nameOf(step.badgeId)} (${LEVEL_LABELS[step.fromLevel]} → ${LEVEL_LABELS[step.toLevel]})`;
}

/**
 * One category's line — INCLUDING the successes. A roll that cannot do
 * something says so, in the same place, every time; and a roll that CAN says
 * what it did. Silence is never an outcome.
 */
function CategoryLine({
  report,
  dataset,
  heightText,
}: {
  report: CategoryRollReport;
  dataset: BadgeDataset;
  heightText: string;
}) {
  const unset = report.decline?.kind === "badgeSlotsCapacityUnset";
  let detail: string;
  if (report.decline !== null) {
    detail = declineText(report.decline, heightText);
  } else if (report.outcome === "noLegalStep") {
    // The engine's own readout, not a computation: "nothing eligible costs N
    // or less" is a restatement of `after.remainingPoints`, which the roll
    // already produced.
    const left = report.after.remainingPoints;
    detail = `${left} pts left, nothing eligible costs ${left} or less`;
  } else {
    detail = `added ${report.steps.map((step) => stepText(step, dataset)).join(", ")}`;
  }
  return (
    <li className="roll-report__line" data-category={report.category.toLowerCase()}>
      <span className="roll-report__cat">{report.category}</span>{" "}
      <span className={unset ? "roll-report__detail roll-report__detail--unset" : "roll-report__detail"}>
        {detail}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// RollReport
// ---------------------------------------------------------------------------

export interface RollReportProps {
  result: RollResult;
  dataset: BadgeDataset;
  heightText: string;
  /** Bumped by the caller on every APPLIED roll. 0 means "no roll has happened
   *  in this session", which is what keeps boot from stealing focus. */
  rollEpoch: number;
}

export function RollReport({ result, dataset, heightText, rollEpoch }: RollReportProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (rollEpoch === 0) return;
    headingRef.current?.focus();
  }, [rollEpoch]);

  const filled = result.categories.filter((report) => report.outcome === "rolled").length;
  const added = result.categories.reduce((total, report) => total + report.steps.length, 0);

  return (
    // aria-live="off" IS LOAD-BEARING. See the file header: the focus move is
    // the announcement, and a region here would double-speak it.
    <div className="roll-report" aria-live="off">
      <h4
        className="roll-report__heading"
        ref={headingRef}
        tabIndex={-1}
      >
        Rolled with seed <span className="num">{result.token.seed}</span> ·{" "}
        {filled} of {result.categories.length} categories filled · {added} added
      </h4>
      <ul className="roll-report__lines">
        {result.categories.map((report) => (
          <CategoryLine
            key={report.category}
            report={report}
            dataset={dataset}
            heightText={heightText}
          />
        ))}
      </ul>
      <p className="roll-report__closing">{ROLL_REPORT_CLOSING_LINE}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeedField
// ---------------------------------------------------------------------------

export interface SeedFieldProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  onRegenerate: () => void;
}

/**
 * SESSION-ONLY, and never written to `SavedBuild`. Hidden entirely by the
 * caller when the loadout did not come from a roll — there is nothing to
 * reproduce, and a seed field over an unrolled build is an invitation to
 * believe a number that means nothing.
 */
export function SeedField({ seed, onSeedChange, onRegenerate }: SeedFieldProps) {
  const fieldId = useId();
  const [copied, setCopied] = useState(false);

  return (
    <div className="roll-seed">
      <label className="roll-seed__label" htmlFor={fieldId}>
        Seed
      </label>
      <input
        id={fieldId}
        className="roll-seed__input num"
        value={seed}
        onChange={(event) => {
          onSeedChange(event.currentTarget.value);
          setCopied(false);
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          // No network, no dependency. `navigator.clipboard` is native and
          // absent in jsdom, so the optional call is a capability check rather
          // than a defensive habit.
          void navigator.clipboard?.writeText(seed);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
      {/* The regenerate control's VISIBLE label is a glyph, so the accessible
          name has to be spelled out. §3.1's no-tooltip rule means aria-label,
          never title. */}
      <button
        type="button"
        className="btn btn--sm btn--ghost roll-seed__regen"
        aria-label="New seed"
        onClick={() => {
          onRegenerate();
          setCopied(false);
        }}
      >
        ⟳
      </button>
      <p className="roll-seed__honesty hint">{SEED_HONESTY_LINE}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RerollConfirmDialog — §4.6's FOURTH dialog
// ---------------------------------------------------------------------------

export interface RerollConfirmDialogProps {
  /** null = every category in scope. */
  category: Category | null;
  unpinnedCount: number;
  unpinnedPoints: number;
  pinnedCount: number;
  onCancel: () => void;
  onPinEverything: () => void;
  onConfirm: () => void;
}

/**
 * THE FOURTH `<dialog>` (§4.6 as amended by §14.11). build manager · import
 * confirm · dirty-replace confirm · THIS. §4.6's implementer note is exactly
 * what a fourth dialog springs: anything reaching for "the dialog" must select
 * by id. A review once reported "import does nothing" purely because
 * `document.querySelector("dialog")` returned the builds dialog.
 * THIS ONE IS `#dialog-reroll`.
 *
 * `Pin everything instead` is the `Save as new` analogue: it converts the
 * scary action into the safe one at the moment of hesitation, and it costs one
 * handler. Neither commit action is `.btn--primary` — gold is the app's voice
 * and a destructive dialog does not get a gold nudge toward clearing.
 */
export function RerollConfirmDialog({
  category,
  unpinnedCount,
  unpinnedPoints,
  pinnedCount,
  onCancel,
  onPinEverything,
  onConfirm,
}: RerollConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) return;
    // Same idiom the three shipped dialogs use: showModal gives the focus
    // trap; jsdom builds without it fall back to the open attribute.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  const scopeName = category ?? "every category";
  return (
    <dialog
      id="dialog-reroll"
      ref={dialogRef}
      className="reset-dialog roll-dialog"
      aria-labelledby="dialog-reroll-title"
      onClose={onCancel}
      onClick={(event) => {
        // Backdrop click → Cancel. The <dialog> element itself IS the backdrop;
        // clicks inside the body stop at .reset-dialog__body.
        if (event.target === dialogRef.current) onCancel();
      }}
    >
      <div className="reset-dialog__body">
        <h2 id="dialog-reroll-title">Re-roll {scopeName}?</h2>
        <p>
          Clears {unpinnedCount} unpinned{" "}
          {unpinnedCount === 1 ? "purchase" : "purchases"} in {scopeName} (
          {unpinnedPoints} {unpinnedPoints === 1 ? "point" : "points"}) and fills the pool
          again. {pinnedCount} pinned {pinnedCount === 1 ? "purchase is" : "purchases are"}{" "}
          kept.
        </p>
        <div className="reset-dialog__actions">
          {/* Cancel is default-focused, and Escape routes to it through the
              native onClose above. */}
          <Button variant="ghost" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={onPinEverything}>
            Pin everything instead
          </Button>
          <Button variant="danger-ghost" size="sm" onClick={onConfirm}>
            Clear and re-roll
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// RollPanel
// ---------------------------------------------------------------------------

export interface RollPanelProps {
  dataset: BadgeDataset;
  /** Already formatted (`6'6"`). Formatting, not a derivation. */
  heightText: string;
  /** The last APPLIED roll, or null when this loadout did not come from one. */
  lastRoll: RollResult | null;
  rollEpoch: number;
  seed: string;
  onSeedChange: (seed: string) => void;
  onRegenerateSeed: () => void;
  onFillRemaining: () => void;
  onRerollRequest: () => void;
  excludedCount: number;
  onClearExclusions: () => void;
  /** null = enabled. A string = disabled, and the string is the visible
   *  reason. Computed by the caller from the token's `inputDigest`. */
  restoreDisabledReason: string | null;
  onRestore: () => void;
}

export function RollPanel({
  dataset,
  heightText,
  lastRoll,
  rollEpoch,
  seed,
  onSeedChange,
  onRegenerateSeed,
  onFillRemaining,
  onRerollRequest,
  excludedCount,
  onClearExclusions,
  restoreDisabledReason,
  onRestore,
}: RollPanelProps) {
  return (
    <section className="roll-panel" aria-labelledby="roll-panel-title">
      <h3 id="roll-panel-title" className="roll-panel__title">
        Roll
      </h3>

      {/* THE TWO-SENTENCE LEDE IS MANDATORY COPY, NOT DECORATION (§14.7(c)).
          It is containment rule 5 discharged at the point of action: what the
          roll does, what it will not touch, and — plainly, once — that there
          is no opinion in it. */}
      <p className="roll-panel__lede">
        Fills unspent Badge Points with badges drawn at random from the ones your build
        can actually equip. Everything you pinned stays exactly as you set it, and
        nothing you already bought is cleared unless you re-roll.
      </p>

      <div className="roll-panel__actions">
        {/* NEVER `disabled`. Not when the pins are impossible, not when nothing
            is affordable, not ever (§4.3). The honest surface is the POST-roll
            report. */}
        <Button variant="primary" size="sm" onClick={onFillRemaining}>
          Fill remaining
        </Button>
        {/* The trailing ellipsis is the ONE visual difference between the safe
            action and the destructive one. */}
        <Button variant="secondary" size="sm" onClick={onRerollRequest}>
          Re-roll…
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRestore}
          {...(restoreDisabledReason === null
            ? {}
            : { disabledReason: restoreDisabledReason })}
        >
          {/* NEVER labelled undo, and never grown into a stack. One step,
              scope-local, exact only under stated preconditions. */}
          Restore
        </Button>
      </div>

      {excludedCount > 0 ? (
        <p className="roll-panel__exclusions">
          <span className="num">{excludedCount}</span>{" "}
          {excludedCount === 1 ? "badge" : "badges"} excluded{" · "}
          <Button variant="ghost" size="sm" onClick={onClearExclusions}>
            Clear exclusions
          </Button>
        </p>
      ) : null}

      {lastRoll !== null ? (
        <>
          <SeedField seed={seed} onSeedChange={onSeedChange} onRegenerate={onRegenerateSeed} />
          <RollReport
            result={lastRoll}
            dataset={dataset}
            heightText={heightText}
            rollEpoch={rollEpoch}
          />
        </>
      ) : null}
    </section>
  );
}
