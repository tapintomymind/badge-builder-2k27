/**
 * BuildPanel (design-spec §3.3). As of rev 3 (F3) Physique leads with
 * Position, because Position CONSTRAINS the height range (scope.md §0.1 A2):
 * you pick a position, which sets the range you may pick a height within.
 * Position still gates NO badges — the hint says exactly that, and the rev-1
 * "cosmetic" treatments (muted palette, Cosmetic chip, separating rule) are
 * withdrawn: a live control styled to look inert is a worse lie than a plain
 * one.
 *
 * F13 — PHYSIQUE IS NOT ONE OF THIS PANEL'S SECTIONS AT >=768. It is
 * exported as `PhysiqueStrip` and App mounts it in the full-bleed horizontal
 * band beneath `.app-banners`, so the two controls are permanently on screen
 * and the badge grid moves up by what the block used to cost.
 *
 * BELOW 768 IT COMES BACK HERE, as `PhysiqueSection` — the same Section, the
 * same storage key, the same collapse, the same latch. The strip only earns
 * its height where it lays out as ONE row; at 390 it stacks, and 199.56px of
 * un-collapsible chrome on every visit is a bad trade against a first-load
 * gain seen once. App owns that seam (`physique`), the same way it owns the
 * L seam, and this file never asks a media query.
 *
 * The height range itself comes from the ENGINE (positionHeightRange, via
 * App.tsx) — this file never reads src/data/position-heights and holds no
 * copy of the table.
 *
 * F5.4 (design-spec §16.5) — the panel is a collapsible <details> at EVERY
 * width now, and it no longer owns the breakpoint: `compact` and
 * `withAttributes` arrive as props from App, which is the ONE owner of the L
 * query (§16.10). At L the 20 attribute sliders live in the left pane, so
 * this panel renders Physique + Budgets (+ F5.3's Reset) only, and the
 * Attributes Section is exported separately for the pane to mount.
 *
 * AUTO-COLLAPSE (§5.3, design-review P0-2) — a LATCH, not a computation:
 * default-open at zero state; collapses automatically EXACTLY ONCE the
 * first time the build has non-zero values; the user's open/closed choice is
 * persisted thereafter and never overridden again. The latch reads COMMITTED
 * values only, and — rev 3 — it never fires while the triggering control
 * still holds focus: a slider RELEASE is a commit but NOT a blur (focus
 * stays on the thumb), so the panel must not snap shut when the user lets
 * go of a slider. Firing is deferred to that slider's blur (or the next
 * mount). NumberField commits on blur, so its path is unchanged.
 *
 * F5.4 drops the `compact` term from the latch predicate (§16.5, superseding
 * F5.3/A2's "do not touch the latch", which was scoped to F5.3). The gate
 * existed because at L the panel lived in a rail where its height cost the
 * user nothing; after F5.4 the panel is in flow above the cards, so that
 * precondition is true at L too. `hasValues` is scoped to what the panel
 * actually renders — an attribute drag in the pane must not collapse a panel
 * on the other side of the layout that does not contain the control.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { hasCapBreakers } from "../../engine/attributes";
import { bonusHasContent, effectiveBudgets } from "../../engine/budget";
import type { BonusBudget, Budget, Build } from "../../engine/types";
import type { Attr, Category, Position } from "../../engine/vocabulary";
import { CATEGORIES, POSITIONS, formatHeightInches } from "../../engine/vocabulary";
import { readUiSectionOpen, writeUiSectionOpen } from "../../persist/local-storage";
import { Banner } from "../primitives/Banner";
import { HeightField } from "../primitives/HeightField";
import { Hint } from "../primitives/Hint";
import { Section } from "../primitives/Section";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { AttributeGrid } from "./AttributeGrid";
import type { AttributeGridProps } from "./AttributeGrid";
import { BudgetGrid } from "./BudgetGrid";

/** Section open/closed preference key + the one-shot auto-collapse latch. */
const BUILD_PANEL_SECTION_KEY = "section-build-panel";
const BUILD_PANEL_AUTO_COLLAPSED_KEY = "section-build-panel.auto-collapsed";

/** "Any" = the EXISTING optional Build.position left unset — the dataset's
 * own full range, and the zero-state default (§5.4 rev 3). */
const POSITION_OPTIONS = ["Any", ...POSITIONS] as const;
type PositionOption = (typeof POSITION_OPTIONS)[number];

/** The clamp-on-position-switch disclosure (§3.3 rev 3): persistent, never a
 * toast — holds until the user next changes height or position. */
export interface HeightClampNotice {
  fromInches: number;
  toInches: number;
  /** Stale-purchase count when the clamp changed it (cause and consequence
   * in one sentence, at the site of the action); null = no stale sentence. */
  staleCount: number | null;
}

/** F13 — the physique props are their OWN interface now, not a `Pick<>` off
 * BuildPanelProps. Physique renders in a different part of the document from
 * the panel and App passes each set to a different component, so a shared
 * interface would have forced the panel to keep declaring five props it can
 * no longer use — the kind of prop that stays wired for a release and then
 * gets read by something that should not have it. */
export interface PhysiqueStripProps {
  build: Build;
  /** Position-derived height clamp range (inches) — from the engine's
   * positionHeightRange(), the only route to the table. */
  heightRange: { minInches: number; maxInches: number };
  /** Engine validateBuild() reasons — HARD-DISCLOSED as a warning Banner
   * local to the control that caused them. */
  buildViolationReasons: readonly string[];
  clampNotice: HeightClampNotice | null;
  onHeightCommit: (heightInches: number) => void;
  onPositionChange: (position: Position | undefined) => void;
}

export interface BuildPanelProps {
  build: Build;
  budgets: Record<Category, Budget>;
  onAttributeCommit: (attr: Attr, value: number) => void;
  onBudgetCommit: (category: Category, field: keyof Budget, value: number) => void;
  /** A5-U — the bonus layer, threaded to `BudgetGrid` for its entry-point
   * readout AND read by the latch below. See `hasBudgetValues`. */
  bonus: BonusBudget;
  /** A5-U — open the bonus mode (design-spec §17.5). App owns the state. */
  onOpenBonus: () => void;
  /** F5.3/C — open the `Reset build` confirm. The button NEVER resets
   * directly; the dialog is mandatory (assertion 18). */
  onResetRequest: () => void;
  /** `playerHasContent(working)` — the DEFAULT RESET'S OWN SCOPE, and
   * deliberately not `workingHasContent`. The latter answers the switcher
   * guard's question and returns true for budgets-only and unlocks-only
   * states, neither of which the default reset touches: a user who has
   * entered budgets and nothing else would get an enabled control whose
   * confirm, with zero rows suppressed, lists nothing. */
  canReset: boolean;
  /** F5.4 — true below 1280, and it is the DECLARED seam input: the L query
   * has exactly ONE owner and it is App (§16.10), so this file no longer
   * calls useMediaQuery at all. The panel does not branch on it today —
   * §16.5 renders the identical collapsible <details> on both sides of the
   * seam and §4.3 keeps the identical digest — and that is the point: the
   * seam is expressed once, in App, rather than re-derived here. Anything
   * that must differ by width goes through this prop and nowhere else. */
  compact: boolean;
  /** F5.4 — false at L, where the 20 attribute sliders live in the pane
   * (§16.5). Scopes both the rendered Sections AND the latch's `hasValues`.
   * F13: at L the panel's only Section is the budget grid, so this now
   * scopes the latch to the budget record alone. */
  withAttributes: boolean;
  /** F13 — the M seam, and App owns it exactly as it owns the L seam. NULL
   * at >=768, where the physique strip renders it; the props bundle below
   * 768, where the strip is not rendered and Physique comes back into this
   * panel as `PhysiqueSection`. There is no width at which both surfaces
   * render it, and this file never asks the query itself. */
  physique: PhysiqueStripProps | null;
}

/** F5.4 (§16.5) — the Attributes Section, lifted VERBATIM out of BuildPanel
 * so the pane can mount it directly at L. `PhysiqueStrip` below (F5.4's
 * `PhysiqueSection`) is the precedent.
 *
 * THE <Section> WRAPPER IS NOT DECORATION. Its <summary> is a focusable,
 * persisted control that takes all 20 sliders out of the tab order in one
 * keystroke. It costs SECTION_CHROME_Y (70px, 53 of it above the first
 * slider) and it buys the keyboard bypass — no pass may unwrap it to reclaim
 * the pixels (§16.9). If it looks removable, that is the stop condition, not
 * the optimisation. */
export interface AttributesSectionProps extends AttributeGridProps {
  /** [A7] F5.3/C's `Reset build` confirm-opener, moved here. The control
   * NEVER resets directly — it opens ResetBuildDialog, which is the entire
   * destructive-safety story now (see below). */
  onResetRequest: () => void;
  canReset: boolean;
}

/** [A7] RESET NOW RIDES THE ATTRIBUTES HEADING — placed against the tree as it
 * STANDS, because design-spec §15.18 is stale in two independent ways and
 * following it literally would put the control somewhere that no longer
 * exists.
 *
 * WHERE §15.18 IS WRONG.
 *
 *  1. "The foot of the LEFT RAIL, after the Build panel's last block." There
 *     is no left rail. F5.4 (§16.7) cut `.layout` into exactly two grid items
 *     at L — the attributes pane and `.col-right` — and the Build panel went
 *     into the RIGHT column with everything else. §15.18's companion claim,
 *     that "§13.0.1 puts the Ledger overview first and the Build panel
 *     second", describes a single rail that was split in two.
 *  2. "…the far end of a long scroll, where a mis-click is not available."
 *     THIS WAS THE ENTIRE SAFETY ARGUMENT and F14 dissolved it. The rail's
 *     `max-height: calc(100vh − --space-6)` scroll is gone; `.col-right` is
 *     now a fixed-height flex row inside a `position: fixed; height: 100dvh`
 *     shell, and the pane is a STATIC scrollport (`position: static;
 *     height: 100%`). A bounded scrollport's foot is one flick away, so
 *     "reaching it is a deliberate act" stopped being true before this slice
 *     touched anything. BuildPanel's own comment had already re-based the
 *     argument once, onto F5.4's collapsible; F14 moved it again.
 *
 * SO THE SAFETY COMES FROM THE CONFIRM, WHICH IS WHERE IT ALWAYS ACTUALLY WAS.
 * `ResetBuildDialog` is untouched by this slice and is still mandatory — this
 * button opens it and never resets. Placement was only ever the second lock,
 * and it had already quietly failed open.
 *
 * WHY THE SUMMARY AND NOT THE BODY. "Beside the heading" is the ask, and the
 * heading lives inside the `<Section>`'s `<summary>`. The action slot takes
 * `margin-left: auto`, so the heading keeps its intrinsic width and CANNOT be
 * crowded — at 1280 the pane's summary content box is 258px against roughly
 * 78px of "Attributes" and a ~60px control. Riding the summary also means the
 * control follows the Attributes Section to BOTH its mounts (the pane at L,
 * this panel below 1280) with no second placement to keep in sync, and it
 * stays reachable while the Section is collapsed.
 *
 * THE COST, PAID KNOWINGLY: a `<button>` inside a `<summary>` is nested
 * interactive content. It is CONFORMING (summary takes phrasing content), but
 * a click there toggles the `<details>` unless propagation is stopped — hence
 * the handler below, which is BadgeCard's shipped idiom. The disabled reason
 * moves to `sr-only`: a full sentence does not fit beside a heading, and the
 * visible carrier is the disabled control itself. */
export function AttributesSection({
  attributes,
  onCommit,
  onResetRequest,
  canReset,
}: AttributesSectionProps) {
  const resetReasonId = useId();
  return (
    <Section
      title="Attributes"
      storageKey="section-attributes"
      action={
        <>
          <button
            type="button"
            className="btn btn--danger-ghost btn--sm build-panel__reset"
            onClick={(event) => {
              // MANDATORY, not defensive: without it every press of this
              // button also collapses the Attributes Section under it.
              event.stopPropagation();
              onResetRequest();
            }}
            disabled={!canReset}
            aria-describedby={canReset ? undefined : resetReasonId}
          >
            Reset build
          </button>
          {canReset ? null : (
            <span id={resetReasonId} className="sr-only">
              Nothing to reset — no attributes, purchased badges, Synergy Slot assignments, height
              or position are set.
            </span>
          )}
        </>
      }
    >
      <AttributeGrid attributes={attributes} onCommit={onCommit} />
    </Section>
  );
}

/** F13 — Physique as a FULL-BLEED HORIZONTAL STRIP rather than a collapsible
 * <Section> inside the setup panel. App mounts it directly beneath the
 * `.app-banners` region and as a SIBLING of it — never nested inside the
 * drift banner, which is conditional on a dataVersion mismatch while
 * Physique is unconditional. Different things, different lifetimes.
 *
 * WHY THE <Section> WRAPPER IS GONE, AND WHY THAT IS NOT THE §16.9 MISTAKE.
 * §16.9 forbids unwrapping the ATTRIBUTES Section to reclaim its chrome,
 * because that <summary> takes twenty sliders out of the tab order in one
 * keystroke: it costs SECTION_CHROME_Y and buys a real keyboard bypass.
 * Physique is two controls and THREE tab stops (a radio group contributes
 * one). Measured on this tree, the Section cost 70px of chrome around a
 * strip whose entire laid-out content is ~50px — a collapse control costing
 * more than the thing it collapses — and collapsing it hid the two controls
 * the user asked to have permanently in view. The keyboard-bypass argument
 * that licenses the Attributes wrapper does not transfer to three tab stops.
 *
 * THE ARRANGEMENT IS A CAP, NOT A STRETCH. The two number inputs keep
 * `.number-field input { width: 56px }` untouched, so the ~434px-each defect
 * that `.summary`'s track cap and F5.4/A1 were both written to prevent is
 * structurally unreachable: nothing in the strip's CSS hands them a
 * percentage or an `auto` track. The prose Hint is the ONLY item permitted
 * to absorb leftover width, and `.hint`'s own 65ch cap bounds even that. */
/** F13 — THE BODY, authored ONCE and worn by both surfaces below. The DOM
 * order here is the PRE-F13 order (Position, its hint, Height, the engine
 * violation Banner) and that is deliberate: in `PhysiqueSection` the order
 * IS the layout, and in `PhysiqueStrip` every one of these four is placed by
 * an explicit `grid-column` / `grid-row`, so the strip does not care. One
 * body means the two surfaces cannot drift in copy, wiring or a11y — which
 * they would, because they are one control group rendered at two widths. */
function PhysiqueControls({
  build,
  heightRange,
  buildViolationReasons,
  clampNotice,
  onHeightCommit,
  onPositionChange,
}: PhysiqueStripProps) {
  const positionHintId = useId();
  const positionLabel: PositionOption = build.position ?? "Any";
  const rangeText = `${formatHeightInches(heightRange.minInches)}–${formatHeightInches(heightRange.maxInches)}`;
  const noticeText =
    clampNotice === null
      ? null
      : `Height adjusted ${formatHeightInches(clampNotice.fromInches)} → ` +
        `${formatHeightInches(clampNotice.toInches)} to fit ${positionLabel}'s ` +
        `range (${rangeText}).` +
        (clampNotice.staleCount === null
          ? ""
          : ` ${clampNotice.staleCount} purchased ${
              clampNotice.staleCount === 1
                ? "badge no longer qualifies"
                : "badges no longer qualify"
            }.`);
  return (
    <>
      <SegmentedControl
        legend="Position"
        options={POSITION_OPTIONS}
        value={positionLabel}
        onChange={(option) => {
          onPositionChange(option === "Any" ? undefined : option);
        }}
        describedBy={positionHintId}
      />
      {/* F13, orchestrator-ratified amendment to scope.md §0.1 A2's copy
          consequence, and it holds at EVERY width: the recitation
          `(${positionLabel}: ${rangeText})` is GONE from this sentence. The
          range was rendering THREE times at once — here, in the HeightField
          hint, and in the clamp notice.
          WHAT DID NOT CHANGE, and must not: both facts the hint exists to
          carry. "No badge has a position requirement" is still stated
          outright, and "Sets the available height range" still makes it
          discoverable that changing position can move your height — and
          height DOES gate. Position gates nothing; that stays true and
          stays said. */}
      <Hint id={positionHintId}>
        {"Sets the available height range. No badge has a position " +
          "requirement; badges gate on height and attributes only."}
      </Hint>
      {/* HeightField returns a FRAGMENT — the fieldset plus, when a clamp is
          live, the notice as its sibling. In the Section that simply stacks;
          in the strip both are grid items placed explicitly by the
          stylesheet, so the notice's arrival adds a row instead of widening
          a column. */}
      <HeightField
        heightInches={build.heightInches}
        minInches={heightRange.minInches}
        maxInches={heightRange.maxInches}
        rangeHint={
          build.position !== undefined
            ? `${build.position}: ${rangeText}`
            : `${rangeText}, the range this dataset covers.`
        }
        notice={noticeText}
        onCommit={onHeightCommit}
      />
      {buildViolationReasons.length > 0 ? (
        <Banner variant="warning">{buildViolationReasons.join(" ")}</Banner>
      ) : null}
    </>
  );
}

/** The >=768 surface: the full-bleed horizontal bar. */
export function PhysiqueStrip(props: PhysiqueStripProps) {
  return (
    <aside className="physique-strip" aria-label="Physique">
      <div className="physique-strip__row">
        <PhysiqueControls {...props} />
      </div>
    </aside>
  );
}

/** The <768 surface: exactly the <Section> this was before F13 — same title,
 * same storage key, same place inside the setup panel, same collapse, same
 * latch. RESTORED, not re-invented: at 390 the strip does not lay out
 * horizontally (its max-content tracks need 494.75px against a 358px content
 * box, so it stacks), which makes it the same vertical block the ask was
 * about, minus the ability to collapse it. Measured, the phone pays 199.56px
 * of permanent lead for that — every visit, on the device this app is
 * actually used on. The user ruled against it.
 *
 * The COPY consolidation and the latch fix are NOT part of the carve-out and
 * hold at every width; only the arrangement reverts. */
export function PhysiqueSection(props: PhysiqueStripProps) {
  return (
    <Section title="Physique" storageKey="section-physique">
      <PhysiqueControls {...props} />
    </Section>
  );
}

export function BuildPanel(props: BuildPanelProps) {
  const {
    build,
    budgets,
    bonus,
    withAttributes,
    physique,
    onAttributeCommit,
    onBudgetCommit,
    onOpenBonus,
    onResetRequest,
    canReset,
  } = props;
  const [autoCollapsed, setAutoCollapsed] = useState<boolean>(
    () => readUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY) === true,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);

  /** A5-U (design-spec §17.11's F5.4 ruling) — THE DIGEST READS EFFECTIVE, and
   * discloses no composition. It is a digest: it says what the collapsed panel
   * is hiding, and what it is hiding is the capacity the rest of the app is
   * spending against. At zero bonus it is byte-identical to today.
   *
   * `budgets` is the BASE record and stays so — the grid below is the base
   * EDITOR and rendering the composed number into it compounds on every blur
   * (App's runaway-inflation note, test 6.6). The composition happens HERE,
   * for display, through the engine's one composition seam rather than by
   * adding the six numbers up a second way. */
  const digestBudgets = effectiveBudgets(budgets, bonus);
  const totalPoints = CATEGORIES.reduce(
    (sum, category) => sum + digestBudgets[category].points,
    0,
  );
  const totalEquipSlots = CATEGORIES.reduce(
    (sum, category) => sum + digestBudgets[category].equipSlots,
    0,
  );

  /** "Has the user entered ANY budget figure" — DERIVED over the Budget
   * record, never enumerated (Designer §17 amendment). The two totals above
   * are display quantities and stay field-specific; this is a question about
   * the record as a whole.
   *
   * The enumerated `points || equipSlots` form is a trap the moment a slice
   * adds budget-shaped fields — F9's bonus Badge Slots and Points adds
   * fourteen. It would silently miss them, and the concrete failure is a
   * user whose only budget input is bonus getting a setup panel that NEVER
   * LATCHES CLOSED: exactly the defect F5.4 exists to fix, back for a subset
   * of users. Reading the record picks new fields up for free.
   *
   * Equivalent to the shipped `totalPoints > 0 || totalEquipSlots > 0`
   * because every budget field is clamped at min 0 (BudgetGrid), so a
   * positive sum and a positive member are the same question.
   *
   * A5-U CLOSES THE GAP THE COMMENT ABOVE FORECAST, and it needed a second
   * term rather than none. The forecast assumed the fourteen bonus fields
   * would arrive INSIDE the Budget record; they did not — bonus is a SEPARATE
   * layer (`BonusBudget`) that is deliberately never merged into `budgets`, so
   * deriving over the record cannot see them however carefully it is written.
   * The concrete failure is exactly the one named: a user whose only budget
   * input is bonus gets a setup panel that NEVER LATCHES CLOSED.
   *
   * F13 has since dropped `build.position` from the non-attribute arm, so
   * `hasBudgetValues` is now the ENTIRE wide-viewport condition — the gap is
   * total, not partial.
   *
   * `bonusHasContent` is the engine's own derivation over the whole bonus
   * record (both earned totals, both applied allocations, the latter through
   * the Σ helpers), so a seventh category widens it automatically and this
   * file never enumerates a bonus field name. */
  const hasBudgetValues =
    CATEGORIES.some((category) => Object.values(budgets[category]).some((value) => value > 0)) ||
    bonusHasContent(bonus);

  // SCOPED TO WHAT THIS PANEL RENDERS (design-spec §16.5). At L the
  // attributes are in the pane, so an attribute drag must not collapse a
  // panel that does not contain the control the user is touching.
  //
  // [A6] The cap-breaker term rides INSIDE the `withAttributes` arm, not
  // outside it. A6's contract widens "the :175 dirty check"; F5.4 then scoped
  // that check to what the panel actually renders, and A6-U's control lands
  // beside the sliders — so at L, where the sliders are in the pane, the cap
  // breakers are in the pane too and must not collapse a panel that does not
  // contain them. Inert until A6-U ships the writer; the widening lands
  // BEFORE it so there is never a build state the latch cannot see.
  //
  // F13 DROPS `build.position !== undefined` FROM THE L BRANCH, and that is
  // the same rule applied again rather than a new one: Physique left the
  // panel for the strip, so position is now a control on the OTHER side of
  // the layout too. F5.4's own addendum flagged the consequence as a
  // surprise — "at L, picking a position FIRES THE LATCH", collapsing the
  // panel the user was working in. With Physique gone the only thing this
  // panel renders at L is the budget grid, so the budget record is the whole
  // predicate.
  //
  // THE TWO EDITS COMPOSE — DIFFERENT ARMS, and both are kept. A6-E widened
  // the `withAttributes` TRUE arm (M/S, where the panel holds the sliders and
  // the cap breakers); F13 narrowed the FALSE arm (L, where Physique is now
  // the strip). git sees one expression and adjacent lines; they are two
  // independent edits, so this is a WIDEN-NEVER-REPLACE resolution and not a
  // choice between them. M/S stays bit-identical under F13: `withAttributes`
  // is true there and that branch never carried the position term.
  const hasValues = withAttributes
    ? hasBudgetValues ||
      Object.values(build.attributes).some((value) => value > 0) ||
      hasCapBreakers(build)
    : hasBudgetValues;

  // F5.4: the `compact` term is GONE (§16.5). The panel is in flow above the
  // cards at every width now, so its height costs the user something at L too.
  const latchArmed = hasValues && !autoCollapsed;

  const fireLatch = useCallback(() => {
    writeUiSectionOpen(BUILD_PANEL_SECTION_KEY, false);
    writeUiSectionOpen(BUILD_PANEL_AUTO_COLLAPSED_KEY, true);
    setAutoCollapsed(true);
  }, []);

  // The one-shot latch (§5.3): first zero → non-zero transition (or first
  // mount with values) writes open=false ONCE and latches. `hasValues` only
  // moves on COMMIT, so this never fires mid-drag or mid-keystroke. Rev 3
  // guard: a slider commits on release with focus still on the thumb — the
  // latch must not collapse the panel under it, so firing defers to that
  // slider's blur (the onBlur below re-checks). Once latched, the user's own
  // toggle is never overridden.
  useEffect(() => {
    if (!latchArmed) return;
    const active = document.activeElement;
    const sliderHoldsFocus =
      active instanceof HTMLInputElement &&
      active.type === "range" &&
      panelRef.current !== null &&
      panelRef.current.contains(active);
    if (sliderHoldsFocus) return; // fire on that slider's blur instead
    fireLatch();
  }, [latchArmed, fireLatch]);

  const sections = (
    <div
      className="build-panel"
      ref={panelRef}
      onBlur={(event) => {
        if (!latchArmed) return;
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type === "range") {
          fireLatch();
        }
      }}
    >
      {/* F13: at >=768 Physique is NOT here — App mounts the PhysiqueStrip in
          the full-bleed band under the banners and passes `physique={null}`.
          Below 768 the strip is not rendered and this is where Physique
          lives, as the Section it was pre-F13. */}
      {physique !== null ? <PhysiqueSection {...physique} /> : null}
      {/* [A7] Below 1280 the Attributes Section lives HERE, and it now carries
          `Reset build` in its summary. Above 1280 App mounts the same
          component in the pane and passes the same two props — ONE placement,
          both surfaces, which is what moving the control onto the Section
          bought. The panel no longer renders a reset of its own. */}
      {withAttributes ? (
        <AttributesSection
          attributes={build.attributes}
          onCommit={onAttributeCommit}
          onResetRequest={onResetRequest}
          canReset={canReset}
        />
      ) : null}
      <Section title="Badge Points & Badge Slots" storageKey="section-budget">
        <BudgetGrid
          budgets={budgets}
          onCommit={onBudgetCommit}
          bonus={bonus}
          onOpenBonus={onOpenBonus}
        />
      </Section>
    </div>
  );

  // F5.4: no early return. The panel is the collapsible <Section title="Build">
  // at EVERY width — at L it is the setup panel above the FilterBar, at M/S
  // it is the unified panel it has always been (§16.5, §16.10).
  // F13: THE DIGEST FOLLOWS THE SURFACE, because that is what a digest is
  // for — it says what the COLLAPSED panel is hiding. At >=768 height and
  // position are permanently on screen in the strip, so reciting them here
  // would be a fourth copy of a number the user can already read. Below 768
  // Physique is inside this panel again and a collapsed panel really does
  // hide it, so the pre-F13 digest comes back verbatim with it.
  const digest = [
    ...(physique !== null
      ? [
          formatHeightInches(build.heightInches),
          ...(build.position !== undefined ? [build.position] : []),
        ]
      : []),
    `${totalPoints} pts`,
    `${totalEquipSlots} Badge Slots`,
  ].join(" · ");

  return (
    <Section
      // Remount on the latch flip so the Section re-reads the stored
      // open=false and actually closes; afterwards the stored preference
      // rules and this key never changes again.
      key={autoCollapsed ? "build-panel-latched" : "build-panel-initial"}
      title="Build"
      storageKey={BUILD_PANEL_SECTION_KEY}
      defaultOpen={!hasValues}
      digest={<span className="num">{digest}</span>}
    >
      {sections}
    </Section>
  );
}
