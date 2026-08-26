// @vitest-environment jsdom
/**
 * F4 group 6 — the card description, and the control that reveals it.
 *
 * ORIGINALLY (F4) a native <details> on the card whose collapsed state was a
 * 3-line CSS clamp, so the full string was always in the DOM and AT read it
 * once. R12 slice 2 (user ruling 2026-08-26, mockup-approved) makes THE CARD
 * ITSELF the disclosure: the compact tile carries no description at all, and
 * the description is the first thing inside the expanded card — unclamped.
 *
 * EVERY F4 CONTRACT SURVIVES THE MOVE, and this file follows it rather than
 * dropping the assertions:
 *   6.1  the description renders in full, and the text node exists ONCE, so
 *        53 cards cannot double-announce it;
 *   6.2  THE HIGHEST-VALUE TEST IN THE SLICE — operating the disclosure must
 *        not BUY A LEVEL. The card root still carries the pointer-cycle
 *        handler, so the expand control and the expanded region both stop
 *        propagation, and this is the test that proves it;
 *   6.3  the expanded state is reachable, and it is carried by ONE mechanism
 *        (now `aria-expanded` on a real button, where before it was the
 *        <details> `open` property — the note about not hand-authoring
 *        aria-expanded on a <summary> travels with the element that had it);
 *   6.4  the NEW chip.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badgeById, shippedDataset } from "../../src/engine/dataset";
import { validateBadge } from "../../src/engine/eligibility";
import { createDefaultSynergySlots, defaultOverlay } from "../../src/engine/synergy";
import type { Badge, LoadoutEntry } from "../../src/engine/types";
import { BadgeCard } from "../../src/ui/grid/BadgeCard";
import { makeBuild } from "../helpers/test-utils";

function requireBadge(id: string): Badge {
  const badge = badgeById(shippedDataset, id);
  if (badge === undefined) throw new Error(`missing badge ${id}`);
  return badge;
}

function renderCard(badge: Badge, loadout: LoadoutEntry[] = []) {
  const handlers = { onSetLevel: vi.fn(), onCycle: vi.fn() };
  const build = makeBuild(78, 0, { close: 99, mid: 99, threePt: 99 });
  render(
    <BadgeCard
      badge={badge}
      build={build}
      eligibility={validateBadge(badge, build)}
      synergyState={{ loadout, synergySlots: createDefaultSynergySlots(null) }}
      overlay={defaultOverlay}
      dataset={shippedDataset}
      overBadgeSlotsIfBought={false}
      onSetLevel={handlers.onSetLevel}
      onCycle={handlers.onCycle}
    />,
  );
  return handlers;
}

/** The card's expand control — a native <button aria-expanded>, found by role
 *  and accessible name rather than by class. */
function control(): HTMLButtonElement {
  const found = screen.getByRole("button", { name: /^Details — / });
  return found as HTMLButtonElement;
}

function expandedRegion(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".badge-card__expanded");
}

describe("F4 6.1 — the card renders its badge's description, in full", () => {
  it("the FULL description string is in the DOM once the card is opened (no clamp any more)", () => {
    const badge = requireBadge("float-game");
    expect(badge.description).toBe("Floater finishing");
    renderCard(badge);
    // The compact tile carries no prose but a gate line — that is the whole
    // point of the re-cut, so it is asserted rather than assumed.
    expect(screen.queryByText(badge.description)).toBeNull();
    fireEvent.click(control());
    expect(screen.getByText(badge.description)).toBeTruthy();
  });

  it("the text node appears exactly ONCE, so AT never double-announces it across 53 cards", () => {
    const badge = requireBadge("deadeye");
    renderCard(badge);
    fireEvent.click(control());
    const matches = screen.getAllByText(badge.description);
    expect(matches).toHaveLength(1);
    // …and it lives in the expanded region, which is the only place it is
    // rendered from. A second copy left on the tile is the exact regression
    // F4's empty <details> body existed to prevent.
    expect(expandedRegion()?.contains(matches[0] as HTMLElement)).toBe(true);
  });
});

describe("F4 6.2 — TOGGLING THE DISCLOSURE DOES NOT BUY A LEVEL", () => {
  /**
   * The highest-value test in the slice. BadgeCard's root carries the
   * pointer-cycle handler (`onClick={() => onCycle(badge.id)}`), so without
   * `stopPropagation` on the expand control, EVERY EXPAND OF A CARD WOULD BUY
   * A LEVEL. This is not a defensive assertion; it is the reason the handler
   * exists — and R12 slice 2 widened its blast radius, because the expanded
   * region now holds the roll controls too.
   */
  it("clicking the control fires neither onCycle nor onSetLevel, and leaves the loadout byte-identical", () => {
    const badge = requireBadge("float-game");
    const loadout: LoadoutEntry[] = [{ badgeId: "float-game", purchasedLevel: "silver" }];
    const before = JSON.stringify(loadout);
    const handlers = renderCard(badge, loadout);

    fireEvent.click(control());

    expect(handlers.onCycle).not.toHaveBeenCalled();
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
    expect(JSON.stringify(loadout)).toBe(before);
  });

  it("nor does clicking INSIDE the expanded region — the description, the ladder, the action line", () => {
    const badge = requireBadge("float-game");
    const loadout: LoadoutEntry[] = [{ badgeId: "float-game", purchasedLevel: "silver" }];
    const handlers = renderCard(badge, loadout);
    fireEvent.click(control());
    fireEvent.click(screen.getByText(badge.description));
    fireEvent.click(expandedRegion() as HTMLElement);
    expect(handlers.onCycle).not.toHaveBeenCalled();
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
  });

  it("the card body itself DOES still cycle — the stopPropagation is scoped, not a blanket mute", () => {
    const badge = requireBadge("float-game");
    const handlers = renderCard(badge);
    fireEvent.click(document.querySelector(".badge-card__title-row") as HTMLElement);
    expect(handlers.onCycle).toHaveBeenCalledWith("float-game");
  });
});

describe("F4 6.3 — disclosure state, asserting ONLY what is reachable in jsdom", () => {
  /**
   * [A4/R14] jsdom 30 implements NO <summary> keyboard-activation behaviour,
   * which is why F4's own version of this block could assert so little. R12
   * slice 2's control is a native <button>, so the keyboard path IS the click
   * path (Enter and Space activate a button by definition) and `aria-expanded`
   * is the state — one mechanism, readable here, and still proved end-to-end
   * in the browser proof (docs/proof/).
   */
  it("the control toggles both ways, and fires no purchase handler in either direction", () => {
    const badge = requireBadge("deadeye");
    const handlers = renderCard(badge);
    expect(control().getAttribute("aria-expanded")).toBe("false");
    expect(expandedRegion()).toBeNull();

    fireEvent.click(control());
    expect(control().getAttribute("aria-expanded")).toBe("true");
    expect(expandedRegion()).not.toBeNull();

    fireEvent.click(control());
    expect(control().getAttribute("aria-expanded")).toBe("false");
    expect(expandedRegion()).toBeNull();

    expect(handlers.onCycle).not.toHaveBeenCalled();
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
  });

  it("the control NAMES ITS CARD — 53 buttons called `Details` would be 53 identical names", () => {
    const badge = requireBadge("deadeye");
    renderCard(badge);
    expect(control().getAttribute("aria-label")).toBe(`Details — ${badge.name}`);
    // aria-expanded is on the BUTTON, where it is valid. F4's note about not
    // hand-authoring it on a <summary> travels with the element that had it:
    // there is no <details> on the card any more, and no `open` property to
    // double-report.
    expect(document.querySelector("details.badge-card__desc")).toBeNull();
    expect(control().getAttribute("aria-controls")).toBeTruthy();
  });
});

describe("F4 6.4 — the NEW chip", () => {
  it("a NEW-flagged badge renders the chip (every Rebounding badge is NEW)", () => {
    const badge = requireBadge("crasher");
    expect(badge.isNew).toBe(true);
    renderCard(badge);
    expect(screen.getByText("NEW")).toBeTruthy();
  });

  it("a non-NEW badge does not", () => {
    const badge = requireBadge("deadeye");
    expect(badge.isNew).toBe(false);
    renderCard(badge);
    expect(screen.queryByText("NEW")).toBeNull();
  });
});
