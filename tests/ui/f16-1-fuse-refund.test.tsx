// @vitest-environment jsdom
/**
 * F16.1 — the fuse refund reaches the screen (user-reported defect, 2026-08-26).
 *
 * WHAT THE USER SAW. Five Finishing badges costing 13, a pool of 12, Paint
 * Prodigy assigned to a Fuse position and rendering its ⚡ on the Loadout
 * board — and the panel reading `Badge Tokens 13/12 over by 1 ⚠`. Their words:
 * "I fused a badge, but my points never returned when the 1 should have come
 * back." They were right.
 *
 * WHAT WAS ACTUALLY WRONG, and it was NOT the `isFusedFor` seam. That seam is
 * injected on every production path — `categoryLedgerAt` → `toLedgerState` is
 * the only route any surface takes, and it wires `isFusedForBasis` every time.
 * The defect was one layer out: F4 flipped DEFAULT_REFUND_TRIGGER to `onFuse`
 * and shipped NO load-path normalization for it, while its sibling ratified
 * fact (Synergy Slot 7's +2) got `applyRatifiedMagnitudes` and a disclosure.
 * A DEFAULT only reaches a build CONSTRUCTED after the flip. Every build saved
 * before it kept `legendByAnyMeans` in `config.refundTrigger`, `fromSaved`
 * restored it verbatim, and fusing then freed nothing — on every ledger
 * surface at once, with no error and entirely plausible numbers.
 *
 * WHY NO TEST CAUGHT IT, which is the part worth not repeating. The engine was
 * tested directly and the UI path was not: `tests/ui/m4-rig.ts` pinned
 * `refundTrigger: "legendByAnyMeans"` on EVERY App-level fixture in the suite,
 * so the ratified trigger was never once evaluated through a render. So this
 * file drives the WHOLE APP from a persisted file, and reads the numbers off
 * the DOM — never off `categoryLedgerAt` directly. An engine-only assertion
 * here would have passed on the broken tree.
 *
 * THE FIXTURE IS DELIBERATELY A PRE-RATIFICATION SAVE. `makeRig` now writes
 * the ratified trigger, so a rig that simply used it would prove nothing about
 * the class of build that actually broke. Case 1 overrides it back to the
 * placeholder — i.e. it seeds EXACTLY the file the user had — and asserts the
 * app corrects it.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { categoryLedgerAt } from "../../src/engine/synergy-ledger";
import { shippedDataset } from "../../src/engine/dataset";
import type { RefundTrigger, SavedBuild } from "../../src/engine/types";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { overByBadgePoints } from "../../src/ui/grid/CategoryLedger";
import { readAutosaveResult, writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import type { RigOptions } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

/** The shipped convention for `tests/ui/**` files that render `App`: this repo
 * has a load-dependent flake class where the 5s default trips under full-suite
 * parallelism. Do not lower it. */
const SLOW = { timeout: 20000 };

/**
 * THE USER'S EXACT FIVE, at their exact levels. Costs come from the dataset
 * (`tierCosts` × tier × level), never from this file:
 *   Ghost Stepper      C · Gold   → 4
 *   Paint Prodigy      C · Bronze → 1   ← the one they fused
 *   Physical Finisher  B · Bronze → 2
 *   Post Spin Catalyst C · Silver → 3
 *   Posterizer         A · Bronze → 3
 * Σ 13 against a pool of 12 and 5 of 5 Badge Slots.
 */
const USER_LOADOUT: SavedBuild["loadout"] = [
  { badgeId: "ghost-stepper", purchasedLevel: "gold" },
  { badgeId: "paint-prodigy", purchasedLevel: "bronze" },
  { badgeId: "physical-finisher", purchasedLevel: "bronze" },
  { badgeId: "post-spin-catalyst", purchasedLevel: "silver" },
  { badgeId: "posterizer", purchasedLevel: "bronze" },
];

/** High enough that every purchase above is legitimate, so nothing renders
 * stale by accident and the arithmetic under test is the only variable. */
const ATTRIBUTES: RigOptions["attributes"] = {
  close: 95,
  layup: 95,
  drivingDunk: 95,
  standingDunk: 95,
  postControl: 95,
  mid: 95,
  threePt: 95,
  strength: 95,
  vertical: 95,
};

const USER_CASE: RigOptions = {
  attributes: ATTRIBUTES,
  budgets: { Finishing: { points: 12, equipSlots: 5 } },
  loadout: USER_LOADOUT,
  // Synergy Slot 1, UNLOCKED, Paint Prodigy in the Fuse position — the state
  // that renders the ⚡ the user was reading.
  synergyPatches: { 1: { unlocked: true, fuseBadgeId: "paint-prodigy" } },
};

/** Seed the autosave, optionally forcing a pre-ratification `refundTrigger`
 * the way every build saved before 2026-08-26 carries one. */
function seed(options: RigOptions, trigger?: RefundTrigger): SavedBuild {
  const rig = makeRig(options);
  const seeded =
    trigger === undefined ? rig : { ...rig, config: { ...rig.config, refundTrigger: trigger } };
  expect(writeAutosave(seeded).ok).toBe(true);
  return seeded;
}

function boardMetrics(category: string): string {
  const found = document.querySelector(
    `.board-panel[data-category="${category}"] .board-panel__metrics`,
  );
  if (!(found instanceof HTMLElement)) throw new Error(`no board panel for ${category}`);
  return found.textContent ?? "";
}

/** The in-grid digest for one category — the OTHER surface built from the same
 * `overByBadgePoints` builder, so a fix that reached only the board would be
 * visible here as a disagreement. */
function digest(category: string): string {
  const found = [...document.querySelectorAll("summary.category-ledger")].find((node) =>
    (node.textContent ?? "").startsWith(category),
  );
  if (found === undefined) throw new Error(`no digest for ${category}`);
  return found.textContent ?? "";
}

/** Every category lede that renders a `refunded N` row. The row is SUPPRESSED
 * at zero, so this doubles as "which pools received a refund". */
function refundedLedes(): string[] {
  return [...document.querySelectorAll(".category-ledger__lede")]
    .map((node) => node.textContent ?? "")
    .filter((text) => text.includes("refunded"));
}

function setSwitch(name: string, on: boolean) {
  const control = screen.getByRole("switch", { name }) as HTMLInputElement;
  if (control.checked !== on) fireEvent.click(control);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("F16.1/1 — the user's exact case, through the whole app", () => {
  it(
    "a pre-ratification save with a fused Paint Prodigy loads REFUNDED: no over-by on the board or in the grid",
    SLOW,
    () => {
      seed(USER_CASE, "legendByAnyMeans");
      render(<App />);

      // THE BOARD — the surface the defect was reported on. `13/12` is the
      // shipped GROSS numerator (spend / pool, with the refund carried by
      // `left N` and by the lede's `refunded N` row); what was WRONG was the
      // `over by 1 ⚠`, and what is right is `left 0`.
      expect(boardMetrics("finishing")).toBe("Badge Tokens 13/12left 0Badge Slots 5/5");
      expect(boardMetrics("finishing")).not.toContain("over by");

      // THE MAIN CATEGORY LEDGER — same builder, same numbers. The defect was
      // never board-local, and this is the assertion that says so.
      expect(digest("Finishing")).toBe("FinishingBadge Tokens 13 / 12left 0Badge Slots 5 / 5");

      // THE REFUND ITSELF, named and quantified, where the lede shows it.
      expect(refundedLedes()).toHaveLength(1);
      expect(refundedLedes()[0]).toContain("refunded 1");

      // The tile is still the one the user was reading — this test would be
      // worthless if the ⚡ had merely stopped rendering.
      const tile = [
        ...document.querySelectorAll('.board-panel[data-category="finishing"] .board-tile'),
      ].find((node) => (node.getAttribute("aria-label") ?? "").startsWith("Paint Prodigy"));
      expect(tile?.getAttribute("aria-label")).toContain("Fuse in Synergy Slot 1");
    },
  );

  it(
    "NEGATIVE CANARY: the same committed state under the alternate trigger really is `over by 1`",
    SLOW,
    () => {
      // Without this, case 1 could be passing because the arithmetic happens
      // to land at zero rather than because the refund fired. The trigger is
      // the load-bearing variable, proven by changing ONLY it.
      const rig = seed(USER_CASE, "legendByAnyMeans");
      const asShipped = categoryLedgerAt(
        {
          loadout: rig.loadout,
          budgets: rig.budgets,
          synergySlots: rig.synergy,
          refundTrigger: "legendByAnyMeans",
        },
        "current",
        "Finishing",
        shippedDataset,
      );
      expect(asShipped.refunded).toBe(0);
      expect(overByBadgePoints(asShipped)).toBe("over by 1 ⚠");
    },
  );

  it("the correction is DISCLOSED, as plain text and not as a live region", SLOW, () => {
    seed(USER_CASE, "legendByAnyMeans");
    render(<App />);
    const note = document.querySelector(".synergy-panel__refund-note");
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain("Fusing a badge now returns its Badge Tokens");
    // Same discipline as F4/A2's sibling note: a state description, not an
    // event, so it carries no role and no aria-live and adds no live region.
    expect(note?.getAttribute("role")).toBeNull();
    expect(note?.getAttribute("aria-live")).toBeNull();
    expect(note?.getAttribute("aria-atomic")).toBeNull();
  });

  it("A DISCLOSURE THAT ALWAYS RENDERS IS NOT ONE: a post-ratification save shows no note", SLOW, () => {
    seed(USER_CASE); // makeRig writes the ratified trigger
    render(<App />);
    expect(document.querySelector(".synergy-panel__refund-note")).toBeNull();
    // …and the numbers are identical to the corrected pre-ratification load,
    // which is the whole point of correcting it.
    expect(boardMetrics("finishing")).toBe("Badge Tokens 13/12left 0Badge Slots 5/5");
  });

  it("the correction DURABLY replaces the stale value: the next autosave carries it", SLOW, () => {
    seed(USER_CASE, "legendByAnyMeans");
    render(<App />);
    // The mount write goes through `toEnvelope`, which writes the working
    // config. A correction that lived only in memory would silently revert on
    // the next reload — the failure mode `applyRatifiedMagnitudes` already
    // avoids, held to here too.
    const restored = readAutosaveResult();
    expect(restored.kind).toBe("ok");
    expect(restored.kind === "ok" ? restored.value.saved.config.refundTrigger : null).toBe("onFuse");
  });
});

describe("F16.1/2 — the neighbouring rules the refund must not break", () => {
  it("the refund lands in the badge's OWN category pool, never a global one", SLOW, () => {
    // Two fused badges in two disciplines, each with a distinct cost, so a
    // pooled or misrouted refund cannot land on the right number by accident:
    // Paint Prodigy (Finishing, C·Bronze → 1) and Deadeye (Shooting, A·Silver
    // → 5). Both pools are funded to their gross spend, so `left` reads
    // EXACTLY the refund each discipline is owed and nothing else.
    seed(
      {
        attributes: ATTRIBUTES,
        budgets: {
          Finishing: { points: 12, equipSlots: 5 },
          Shooting: { points: 5, equipSlots: 1 },
        },
        loadout: [...USER_LOADOUT, { badgeId: "deadeye", purchasedLevel: "silver" }],
        synergyPatches: {
          1: { unlocked: true, fuseBadgeId: "paint-prodigy" },
          2: { unlocked: true, fuseBadgeId: "deadeye" },
        },
      },
      "legendByAnyMeans",
    );
    render(<App />);

    // Finishing got its OWN 1 back, not Shooting's 5.
    expect(boardMetrics("finishing")).toBe("Badge Tokens 13/12left 0Badge Slots 5/5");
    // Shooting got its OWN 5 back, not Finishing's 1.
    expect(boardMetrics("shooting")).toBe("Badge Tokens 5/5left 5Badge Slots 1/1");

    // EXACTLY two pools received anything, and each says its own amount. The
    // remaining four disciplines suppress the row entirely.
    const refunded = refundedLedes();
    expect(refunded).toHaveLength(2);
    expect(refunded.some((text) => text.includes("refunded 1"))).toBe(true);
    expect(refunded.some((text) => text.includes("refunded 5"))).toBe(true);
    expect(CATEGORIES).toHaveLength(6);
  });

  it("clearing the fuse assignment removes the refund, through the picker", SLOW, () => {
    seed(USER_CASE, "legendByAnyMeans");
    render(<App />);
    expect(boardMetrics("finishing")).not.toContain("over by");

    // The Synergy Slot 1 row's Fuse picker, cleared the way a user clears it.
    const synergyRow = document.querySelectorAll(".synergy-row")[0] as HTMLElement;
    fireEvent.change(within(synergyRow).getByLabelText("⚡ Fuse"), { target: { value: "" } });

    // The refund is DERIVED, never accumulated: it vanishes with the role.
    expect(boardMetrics("finishing")).toBe("Badge Tokens 13/12 over by 1 ⚠Badge Slots 5/5");
    expect(digest("Finishing")).toContain("over by 1 ⚠");
    expect(refundedLedes()).toHaveLength(0);
  });

  it(
    "no projection overlay can move the committed ledger — 4 combinations, bit-identical",
    SLOW,
    () => {
      seed(USER_CASE, "legendByAnyMeans");
      render(<App />);
      const baseline = boardMetrics("finishing");
      expect(baseline).toContain("left 0");

      for (const reactions of [false, true]) {
        for (const season of [false, true]) {
          setSwitch("Reactions activated", reactions);
          setSwitch("Season-reset preview", season);
          // H2: `reactionsActive` never reaches the ledger at all, and season
          // reset reaches only the parallel `postSeasonReset` basis, which
          // renders as a separate labelled row. The PRIMARY numbers — the ones
          // the user reported on — cannot move under either.
          expect(boardMetrics("finishing"), `${String(reactions)}/${String(season)}`).toBe(baseline);
        }
      }

      // The fuse sits in Synergy Slot 1, which is TEMPORARY, so the season-
      // reset projection genuinely differs — otherwise the loop above proves
      // only that the toggles do nothing.
      setSwitch("Season-reset preview", true);
      const projection = document.querySelector(".category-ledger__projection");
      expect(projection?.textContent).toContain("After season reset");
      expect(projection?.textContent).toContain("over by 1 ⚠");
      expect(projection?.textContent).toContain("refunded 0");
    },
  );
});
