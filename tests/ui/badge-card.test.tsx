// @vitest-environment jsdom
/**
 * BadgeCard + LevelPipRow (design-spec §3.4, scope.md §2 M3).
 *
 * Pins, in order: the HARD CONTRACT (cards render via effectiveLevel, never
 * purchasedLevel), locked pips carrying the engine's failing-requirement
 * strings, height-blocked grey-out with the engine reason, the pointer cycle
 * capped at maxPurchasableLevel, and H4's soft class — an over-Badge-Slots
 * card warns but every control stays enabled.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badgeById, shippedDataset } from "../../src/engine/dataset";
import { validateBadge } from "../../src/engine/eligibility";
import { createDefaultSynergySlots, defaultOverlay } from "../../src/engine/synergy";
import type { SynergyState } from "../../src/engine/synergy";
import type { Badge, LoadoutEntry } from "../../src/engine/types";
import { BadgeCard } from "../../src/ui/grid/BadgeCard";
import { makeBuild } from "../helpers/test-utils";

function requireBadge(id: string): Badge {
  const badge = badgeById(shippedDataset, id);
  if (badge === undefined) throw new Error(`missing badge ${id}`);
  return badge;
}

function renderCard(
  badge: Badge,
  build = makeBuild(78, 0),
  synergyState: SynergyState = { loadout: [], synergySlots: createDefaultSynergySlots(null) },
  overBadgeSlotsIfBought = false,
  handlers = { onSetLevel: vi.fn(), onCycle: vi.fn() },
) {
  render(
    <BadgeCard
      badge={badge}
      build={build}
      eligibility={validateBadge(badge, build)}
      synergyState={synergyState}
      overlay={defaultOverlay}
      dataset={shippedDataset}
      overBadgeSlotsIfBought={overBadgeSlotsIfBought}
      onSetLevel={handlers.onSetLevel}
      onCycle={handlers.onCycle}
    />,
  );
  return handlers;
}

describe("BadgeCard — the effectiveLevel hard contract", () => {
  it("shows the BOOSTED level when a fuse is live, purchased pip unchanged", () => {
    // Float Game purchased Gold; synergy slot 5 (permanent) unlocked, fusing
    // it +1. Under the neutral overlay the card's status must carry the
    // effectiveLevel (HOF) — as the M4 synergy phrase `Fused to HOF`
    // (design-spec §3.4) — while the radiogroup's checked value stays Gold
    // (the purchase control).
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    const loadout: LoadoutEntry[] = [{ badgeId: "float-game", purchasedLevel: "gold" }];
    const synergySlots = createDefaultSynergySlots(null).map((synergySlot) =>
      synergySlot.id === 5
        ? { ...synergySlot, unlocked: true, fuseBadgeId: "float-game" }
        : synergySlot,
    );
    renderCard(badge, build, { loadout, synergySlots });
    expect(screen.getByText("Now Gold · Fused to HOF")).toBeTruthy();
    const gold = screen.getByRole("radio", { name: /^Gold, current level/ });
    expect((gold as HTMLInputElement).checked).toBe(true);
  });

  it("with no boost, effective level equals the purchased level", () => {
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    renderCard(badge, build, {
      loadout: [{ badgeId: "float-game", purchasedLevel: "silver" }],
      synergySlots: createDefaultSynergySlots(null),
    });
    expect(screen.getByText("Now Silver")).toBeTruthy();
  });

  it("unpurchased badge reads as not purchased (effectiveLevel null)", () => {
    renderCard(requireBadge("float-game"));
    expect(screen.getByText("Not purchased")).toBeTruthy();
  });
});

describe("BadgeCard — eligibility rendering (engine strings, never invented)", () => {
  it("a locked pip carries the engine's failing-requirement string", () => {
    // Close 90 passes Bronze/Silver/Gold for Float Game; HOF needs 96 Close
    // or 95 Layup — the engine's words, selected, not recomputed.
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    renderCard(badge, build);
    const hofPip = screen.getByRole("radio", { name: /^HOF, locked/ });
    expect(hofPip.getAttribute("aria-label")).toContain("needs 96 Close or 95 Layup for HOF");
    expect(hofPip.getAttribute("aria-disabled")).toBe("true");
    // The card's eligibility line names the NEXT failing level only.
    expect(screen.getByText(/needs 96 Close or 95 Layup for HOF/)).toBeTruthy();
  });

  it("a height-blocked card is greyed with the engine reason and no cycling", () => {
    // Paint Prodigy needs 6'3"–7'4"; a 6'2" build is blocked entirely.
    const badge = requireBadge("paint-prodigy");
    const build = makeBuild(74, 99);
    const handlers = renderCard(badge, build);
    const card = document.querySelector(".badge-card");
    expect(card?.className).toContain("badge-card--blocked");
    expect(
      screen.getByText(/Blocked — requires height 6'3"–7'4" \(build is 6'2"\)/),
    ).toBeTruthy();
    fireEvent.click(card as Element);
    expect(handlers.onCycle).not.toHaveBeenCalled();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.getAttribute("aria-disabled")).toBe("true");
    }
  });
});

describe("BadgeCard — pips as the canonical control, cycle on top", () => {
  it("selecting an unlocked pip calls onSetLevel; a locked pip does not", () => {
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    const handlers = renderCard(badge, build);
    fireEvent.click(screen.getByRole("radio", { name: /^Gold/ }));
    expect(handlers.onSetLevel).toHaveBeenCalledWith("float-game", "gold");
    handlers.onSetLevel.mockClear();
    fireEvent.click(screen.getByRole("radio", { name: /^HOF, locked/ }));
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
  });

  it("Escape on the selected pip clears to none", () => {
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    const handlers = renderCard(badge, build, {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergySlots: createDefaultSynergySlots(null),
    });
    fireEvent.keyDown(screen.getByRole("radio", { name: /^Gold, current level/ }), {
      key: "Escape",
    });
    expect(handlers.onSetLevel).toHaveBeenCalledWith("float-game", null);
  });

  it("card-body click cycles; pip clicks do not double-fire the cycle", () => {
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    const handlers = renderCard(badge, build);
    fireEvent.click(document.querySelector(".badge-card") as Element);
    expect(handlers.onCycle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("radio", { name: /^Bronze/ }));
    expect(handlers.onCycle).toHaveBeenCalledTimes(1); // still 1 — stopPropagation
  });

  it("what-if cost deltas are ALWAYS visible on the cost line", () => {
    // Tier A totals 3/5/6/7 — an empty loadout shows +3/+5/+6 deltas, no
    // hover required (hover does not exist on touch; design-spec §8.1 C6).
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 96, layup: 95 });
    renderCard(badge, build);
    const row = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    const costs = [...row.querySelectorAll(".pip__cost")].map((el) => el.textContent);
    expect(costs).toEqual(["+3", "+5", "+6", "+7", "boost"]);
  });

  it("the Legend pip is never an interactive control", () => {
    const badge = requireBadge("float-game");
    renderCard(badge);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(
      screen.getByRole("img", { name: "Legend — boost only, cannot be purchased" }),
    ).toBeTruthy();
  });
});

describe("BadgeCard — H4 soft class: warn, never disable", () => {
  it("Would-go-over Badge Slots shows the warning chip and every pip stays enabled", () => {
    const badge = requireBadge("float-game");
    const build = makeBuild(78, 0, { close: 90 });
    const handlers = renderCard(
      badge,
      build,
      { loadout: [], synergySlots: createDefaultSynergySlots(null) },
      true,
    );
    // Unpurchased card: buying WOULD go over — the phrasing says so.
    expect(screen.getByText("Would go over Badge Slots")).toBeTruthy();
    const card = screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
    for (const radio of within(card).getAllByRole("radio")) {
      expect((radio as HTMLInputElement).disabled).toBe(false);
    }
    // Purchase still permitted — the whole point of the soft class.
    fireEvent.click(screen.getByRole("radio", { name: /^Gold/ }));
    expect(handlers.onSetLevel).toHaveBeenCalledWith("float-game", "gold");
  });
});
