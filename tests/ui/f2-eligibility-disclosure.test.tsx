// @vitest-environment jsdom
/**
 * F2 docket A — ELIGIBILITY DISCLOSURE (P1×3, code review).
 *
 * (a) A purchased level above the current attribute cap renders as a
 *     distinct "stale purchase" state: flagged pip + the ENGINE's
 *     failing-requirement string on the card. PRE-FIX pipModel returned
 *     "current ✓" before ever consulting levelPasses — zero disclosure.
 * (b) Levels below the purchased level get the same eligibility check as
 *     unpurchased ones: an ineligible gap level renders LOCKED, never
 *     "owned ✓"-and-clickable. PRE-FIX the owned branch short-circuited
 *     before the passes check, so a failing gap level was one-click
 *     purchasable (the state H3's independent-per-level ruling forbids).
 * (c) Card-body tap on an above-cap purchase must NOT remove it: PRE-FIX
 *     the cycle sequence omitted the stale level, indexOf returned -1, and
 *     one tap deleted the entry — irreversibly, since the pip was locked.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { loadDataset, shippedRawDataset } from "../../src/engine/dataset";
import { syntheticAndMidNullGap } from "../../src/engine/__fixtures__/synthetic-badges";
import { validateBadge } from "../../src/engine/eligibility";
import { createDefaultSynergySlots, defaultOverlay } from "../../src/engine/synergy";
import { BadgeCard } from "../../src/ui/grid/BadgeCard";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function floatGamePips() {
  return screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
}

/** Buy Float Game Gold at Close 90 (gold needs 90 Close or 93 Layup), then
 * lower Close to 70 — the purchase is now ABOVE the recomputed cap. */
function buildStalePurchase() {
  render(<App />);
  commitNumber(screen.getByLabelText("Close"), "90");
  fireEvent.click(within(floatGamePips()).getByRole("radio", { name: /^Gold/ }));
  expect(screen.getByText("Now Gold")).toBeTruthy();
  commitNumber(screen.getByLabelText("Close"), "70");
}

describe("A(a) — stale purchase renders disclosed, never as a clean current pip", () => {
  it("the purchased pip is flagged and carries the engine's failing-requirement string", () => {
    buildStalePurchase();
    const pips = floatGamePips();
    // The pip: distinct stale state, still CHECKED (never auto-removed).
    const gold = within(pips).getByRole("radio", {
      name: /^Gold, current level — no longer meets requirements/,
    }) as HTMLInputElement;
    expect(gold.checked).toBe(true);
    // [A6 rider ②] The STALE line gains the parenthetical too, and gains it
    // from the same single builder — ② adds no second string and no second
    // disclosure path. Note there is still exactly ONE dash in the rendered
    // sentence: the parenthetical sits inside the reason, so it cannot read
    // as a second clause of the "Purchased at Gold — …" dash.
    expect(gold.getAttribute("aria-label")).toContain(
      "needs 90 Close (now 70) or 93 Layup (now 0) for Gold",
    );
    expect(pips.querySelector(".pip--stale")).not.toBeNull();
    // The card: the engine's failing-requirement string, rendered.
    expect(
      screen.getByText(
        /Purchased at Gold — no longer meets requirements: needs 90 Close \(now 70\)/,
      ),
    ).toBeTruthy();
  });

  it("the ledger keeps charging the stale purchase (disclosure, not auto-migration)", () => {
    buildStalePurchase();
    // Float Game Gold (tier A) = 6 points, still counted: H8 forbids the
    // tool from silently re-validating the plan away.
    const section = document.querySelector("#cat-finishing");
    const ledger = section?.querySelector(".category-ledger");
    expect(ledger?.textContent).toContain("6 / 0");
  });
});

describe("A(b) — an ineligible level below the purchase is locked, not owned", () => {
  it("shipped-data path: Silver (fails at Close 70) under a Gold purchase is not clickable", () => {
    buildStalePurchase();
    const pips = floatGamePips();
    // PRE-FIX: "Silver, owned" + clickable. POST-FIX: locked with reasons.
    const silver = within(pips).getByRole("radio", { name: /^Silver, locked/ });
    expect(silver.getAttribute("aria-disabled")).toBe("true");
  });

  it("H3 gap-dataset path: a mid-null gap level under a purchase is locked and fires nothing", () => {
    // The engine's own gap fixture (Silver unreachable via null; Bronze /
    // Gold / HOF pass) — scope.md requires correctness "for data 2K has not
    // shipped yet". Loaded through the real loader; test-local only.
    const dataset = loadDataset({
      // Provenance fields + tierCosts come from the shipped raw document.
      ...structuredClone(shippedRawDataset),
      badges: [structuredClone(syntheticAndMidNullGap)],
    });
    const badge = dataset.badges[0];
    if (badge === undefined) throw new Error("fixture badge missing");
    const build = makeBuild(78, 0, { mid: 99, threePt: 99 });
    const onSetLevel = vi.fn();
    render(
      <BadgeCard
        badge={badge}
        build={build}
        eligibility={validateBadge(badge, build)}
        synergyState={{
          loadout: [{ badgeId: badge.id, purchasedLevel: "gold" }],
          synergySlots: createDefaultSynergySlots(null),
        }}
        overlay={defaultOverlay}
        dataset={dataset}
        overBadgeSlotsIfBought={false}
        onSetLevel={onSetLevel}
        onCycle={vi.fn()}
      />,
    );
    const silver = screen.getByRole("radio", { name: /^Silver, locked/ });
    expect(silver.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(silver);
    expect(onSetLevel).not.toHaveBeenCalled();
    // Bronze (passes, below purchase) stays an ordinary owned pip.
    expect(screen.getByRole("radio", { name: "Bronze, owned" })).toBeTruthy();
  });
});

describe("A(c) — card-body tap never removes a stale purchase", () => {
  it("cycle is a no-op on a stale purchase; the pip control (Escape) remains the removal path", () => {
    buildStalePurchase();
    const card = floatGamePips().closest(".badge-card");
    if (!(card instanceof HTMLElement)) throw new Error("card not found");
    // PRE-FIX: one tap removed the entry ("Not purchased") — irreversibly,
    // since the Gold pip was locked at Close 70.
    fireEvent.click(card);
    expect(within(card).queryByText("Not purchased")).toBeNull();
    expect(
      within(card).getByRole("radio", { name: /^Gold, current level — no longer meets/ }),
    ).toBeTruthy();
    // The DELIBERATE removal path still works: Escape on the stale pip.
    fireEvent.keyDown(
      within(card).getByRole("radio", { name: /^Gold, current level — no longer meets/ }),
      { key: "Escape" },
    );
    expect(within(card).getByText("Not purchased")).toBeTruthy();
  });

  it("an ordinary (non-stale) purchase still cycles as before", () => {
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    const card = floatGamePips().closest(".badge-card");
    if (!(card instanceof HTMLElement)) throw new Error("card not found");
    fireEvent.click(card); // none → Bronze
    fireEvent.click(card); // → Silver
    expect(within(card).getByText("Now Silver")).toBeTruthy();
  });
});
