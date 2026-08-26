// @vitest-environment jsdom
/**
 * F8-R2 group 2 — the roll panel, the report, the seed and Restore.
 *
 * WHY THE DECLINE ARMS ARE ASSERTED AGAINST `declineText` DIRECTLY rather than
 * by building six fixtures that each provoke one: the contract under test is
 * "the component renders the ENGINE'S TYPED DISCRIMINANT and never re-derives
 * the condition". Feeding the typed union in one arm at a time tests exactly
 * that, and a fixture that has to be tuned until the engine emits
 * `pinnedOverBadgeSlots` would be testing the engine's classifier a second
 * time — which `tests/randomize.test.ts` already owns. The structural half
 * (that no re-derivation exists in the file at all) is asserted by source
 * inspection below, which is the half a fixture could never prove.
 */

import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import type { RollDecline } from "../../src/engine/randomize";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { writeAutosave } from "../../src/persist/local-storage";
import { srcSources, stripComments } from "../helpers/test-utils";
import {
  ROLL_REPORT_CLOSING_LINE,
  SEED_HONESTY_LINE,
  declineText,
} from "../../src/ui/summary/RollPanel";
import { f8Rig } from "./f8-fixture";
import { budgetsWith } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

function mount(): void {
  expect(writeAutosave(f8Rig()).ok).toBe(true);
  render(<App />);
}

/**
 * THE CANONICAL FIXTURE CANNOT ROLL, AND THAT IS CORRECT. It sets a Badge
 * Slots capacity for Finishing alone, so the other five categories decline
 * with `badgeSlotsCapacityUnset` and Finishing has 1 point left against a
 * cheapest step of more than 1. It is the right fixture for the DECLINE arms
 * and the wrong one for everything that needs the roll to actually move.
 *
 * So the tests that need headroom get capacity, and nothing else changes —
 * same build, same attributes, same purchases, same synergy. The variation is
 * one field, which is what keeps the two from drifting into unrelated states.
 */
function mountRoomy(): void {
  const rig = f8Rig({
    budgets: budgetsWith({
      Finishing: { equipSlots: 6, points: 30 },
      Shooting: { equipSlots: 5, points: 24 },
      Playmaking: { equipSlots: 5, points: 24 },
      Defense: { equipSlots: 5, points: 24 },
      Rebounding: { equipSlots: 4, points: 16 },
      Physicals: { equipSlots: 4, points: 16 },
    }),
  });
  expect(writeAutosave(rig).ok).toBe(true);
  render(<App />);
}

function panel(): HTMLElement {
  const found = document.querySelector(".roll-panel");
  if (!(found instanceof HTMLElement)) throw new Error("roll panel not rendered");
  return found;
}

function fillRemaining(): HTMLButtonElement {
  return within(panel()).getByRole("button", { name: "Fill remaining" }) as HTMLButtonElement;
}

function report(): HTMLElement | null {
  return document.querySelector(".roll-report");
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("2 — the roll panel and its report", () => {
  it("2.1 — `Fill remaining` is NEVER disabled, and the lede is present", SLOW, () => {
    mount();
    // §4.3's H4 ruling: no control in this app is ever disabled because of the
    // Budget class. It can be a NO-OP, and the report says so per category.
    expect(fillRemaining().disabled).toBe(false);
    fireEvent.click(fillRemaining());
    expect(fillRemaining().disabled).toBe(false);
    // Roll again into an already-filled build: still not disabled.
    fireEvent.click(fillRemaining());
    expect(fillRemaining().disabled).toBe(false);
    expect(panel().querySelector(".roll-panel__lede")?.textContent ?? "").toContain(
      "Badge Tokens",
    );
  });

  it("2.2 — the report names one line per category, INCLUDING the successes", SLOW, () => {
    mountRoomy();
    expect(report()).toBeNull();
    fireEvent.click(fillRemaining());

    const lines = report()?.querySelectorAll(".roll-report__line") ?? [];
    // Silence is never an outcome: every category in scope gets a line, in
    // category order, whether it rolled or declined.
    expect([...lines].map((line) => line.querySelector(".roll-report__cat")?.textContent)).toEqual(
      [...CATEGORIES],
    );
    // At least one line NAMES the badges it added — that is what replaces a
    // per-row `rolled` marker (§14.1 item 9).
    const added = [...lines].filter((line) => line.textContent?.includes("added"));
    expect(added.length).toBeGreaterThan(0);
    const heading = report()?.querySelector(".roll-report__heading");
    expect(heading?.textContent).toContain("Rolled with seed");
    expect(heading?.textContent).toContain("categories filled");
  });

  it("2.3 — every decline arm renders from its TYPED discriminant", SLOW, () => {
    const height = `5'11"`;
    const arms: [RollDecline, string][] = [
      [{ kind: "badgeSlotsCapacityUnset" }, "nothing rolled — Badge Slots capacity not set"],
      [{ kind: "alreadyOverspent", overBy: 2 }, "nothing rolled — already over by 2, nothing to fill"],
      [
        { kind: "pinnedOverPoints", pinnedNetCost: 19, pool: 16, overBy: 3 },
        "nothing rolled — pinned badges cost 19 against a 16-token pool",
      ],
      [
        { kind: "pinnedOverBadgeSlots", pinnedCount: 4, equipSlotCapacity: 3, overBy: 1 },
        "nothing rolled — 4 pinned badges against 3 Badge Slots",
      ],
      [
        { kind: "noEligibleBadges" },
        `no badge in this category is legal for a ${height} build`,
      ],
    ];
    for (const [decline, expected] of arms) {
      expect(declineText(decline, height), decline.kind).toBe(expected);
    }
  });

  it("2.3b — the component re-derives NO decline condition", SLOW, () => {
    // The structural half. A step enumerator, an affordability test or a
    // maximality check in a .tsx is the breach [seed: Working agreements #1].
    const code = stripComments(srcSources["/src/ui/summary/RollPanel.tsx"] as string);
    for (const forbidden of [
      "legalSteps",
      "exchangeSteps",
      "categoryFeasibility",
      "costForLevel",
      "netCostOf",
      "ceilingSpendFor",
      "remainingPoints <",
      "remainingPoints <=",
    ]) {
      expect(code, `RollPanel re-derives ${forbidden}`).not.toContain(forbidden);
    }
    // It reads the discriminant and nothing else.
    expect(code).toContain("decline.kind");
  });

  it("2.4 — the unset-capacity decline is muted and carries NO warning glyph", SLOW, () => {
    mount();
    fireEvent.click(fillRemaining());
    // The fixture sets Playmaking's points pool but leaves its Badge Slots
    // capacity UNSET — §4.7's independence ruling, deliberately exercised.
    const line = [...(report()?.querySelectorAll(".roll-report__line") ?? [])].find((candidate) =>
      candidate.textContent?.includes("Badge Slots capacity not set"),
    );
    expect(line, "the unset-capacity line renders").toBeDefined();
    const detail = (line as HTMLElement).querySelector(".roll-report__detail");
    // NOT A FAILURE, and it must not read as one.
    expect(detail?.className).toContain("roll-report__detail--unset");
    expect(line?.textContent).not.toContain("⚠");
  });

  it("2.5 — the report ends with the EXACT ratified sentence", SLOW, () => {
    mountRoomy();
    fireEvent.click(fillRemaining());
    const closing = report()?.querySelector(".roll-report__closing");
    expect(closing?.textContent).toBe(ROLL_REPORT_CLOSING_LINE);
    expect(ROLL_REPORT_CLOSING_LINE).toBe(
      "Chosen at random from what fits. There is no ranking here.",
    );
    // It is genuinely LAST in the report.
    expect(report()?.lastElementChild).toBe(closing);
  });

  it("2.7 — focus lands on the report heading, and the report is NOT a live region", SLOW, () => {
    mountRoomy();
    fireEvent.click(fillRemaining());
    const heading = report()?.querySelector(".roll-report__heading") as HTMLElement;
    // §6 allows exactly three live regions and §14.10 rules FOCUS MANAGEMENT
    // in place of a fourth. Both halves are asserted: the move happens, and
    // the region is off so it cannot double-speak.
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(report()?.getAttribute("aria-live")).toBe("off");
  });

  it("2.8 — applying a roll is ONE state write", SLOW, () => {
    mountRoomy();
    // Every applyEdit runs the autosave effect exactly once, so counting
    // setItem calls counts state writes. Eleven sequential writes — the defect
    // this contract exists to prevent — would show up as eleven.
    let writes = 0;
    const real = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = (key: string, value: string) => {
      writes += 1;
      real(key, value);
    };
    fireEvent.click(fillRemaining());
    expect(writes).toBe(1);

    // And the roll genuinely moved something — otherwise "one write" is
    // trivially true and the assertion proves nothing.
    const added = [...(report()?.querySelectorAll(".roll-report__line") ?? [])].filter((line) =>
      line.textContent?.includes("added"),
    );
    expect(added.length).toBeGreaterThan(0);
  });

  it("2.9 — the seed is hidden until a roll, then shows its honesty sentence", SLOW, () => {
    mountRoomy();
    // Nothing to reproduce yet, so no field. A seed over an unrolled build is
    // an invitation to believe a number that means nothing.
    expect(document.querySelector(".roll-seed")).toBeNull();

    fireEvent.click(fillRemaining());
    const seedField = document.querySelector(".roll-seed") as HTMLElement;
    expect(seedField).not.toBeNull();
    expect(seedField.textContent).toContain(SEED_HONESTY_LINE);

    const input = seedField.querySelector("input") as HTMLInputElement;
    const before = input.value;
    expect(before).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    fireEvent.click(within(seedField).getByRole("button", { name: "New seed" }));
    expect((document.querySelector(".roll-seed input") as HTMLInputElement).value).not.toBe(before);
  });

  it("2.10 — Restore is enabled after a roll and disabled WITH A REASON once pins change", SLOW, () => {
    mountRoomy();
    const restore = () =>
      within(panel()).getByRole("button", { name: "Restore" }) as HTMLButtonElement;
    // Before any roll there is nothing to restore.
    expect(restore().disabled).toBe(true);

    fireEvent.click(fillRemaining());
    expect(restore().disabled).toBe(false);

    // Change a pin: the token's inputDigest moves and Restore closes, with a
    // VISIBLE reason (H4's invariant class — never a bare disable).
    const dimer = within(document.querySelector(".summary-roster") as HTMLElement).getAllByRole(
      "button",
      { name: /^(?:Un)?[Pp]in Dimer$/ },
    )[0] as HTMLButtonElement;
    fireEvent.click(dimer);

    expect(restore().disabled).toBe(true);
    const reasonId = restore().getAttribute("aria-describedby");
    expect(reasonId).toBeTruthy();
    const reason = document.getElementById(reasonId as string);
    expect(reason?.textContent).toContain("Restore unavailable");
    expect(reason?.textContent).toContain("pins changed");
    // NEVER labelled undo.
    expect(panel().textContent ?? "").not.toMatch(/\bundo\b/i);
  });

  it("2.11 — NO auto-roll: boot, and a budget change, leave the report absent", SLOW, () => {
    mount();
    // Boot does not roll.
    expect(report()).toBeNull();

    // Neither does changing a budget. A roll happens because the user pressed
    // a button, and for no other reason.
    const numberFields = document.querySelectorAll(".number-field input");
    expect(numberFields.length).toBeGreaterThan(0);
    const field = numberFields[0] as HTMLInputElement;
    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.blur(field);
    expect(report()).toBeNull();

    // And a remount from the autosave does not roll either.
    cleanup();
    installMemoryLocalStorage();
    mount();
    expect(report()).toBeNull();
  });
});
