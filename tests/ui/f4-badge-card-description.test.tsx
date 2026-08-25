// @vitest-environment jsdom
/**
 * F4 group 6 — the card description disclosure (design-spec §10.3 + §10.8
 * item 1: the reveal control is F4's, and F5 must not invent one).
 *
 * The disclosure is a native <details> whose COLLAPSED state IS the 3-line
 * clamp. The clamp is CSS-only, so the full string is always in the DOM and
 * AT reads it ONCE — the <details> body is deliberately empty, because
 * duplicating the text would double-announce it on 53 cards.
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

function disclosure(): HTMLDetailsElement {
  const found = document.querySelector<HTMLDetailsElement>("details.badge-card__desc");
  if (found === null) throw new Error("the description disclosure did not render");
  return found;
}

describe("F4 6.1 — the card renders its badge's description, in full", () => {
  it("the FULL description string is in the DOM (the clamp is CSS-only, so AT is unaffected)", () => {
    const badge = requireBadge("float-game");
    expect(badge.description).toBe("Floater finishing");
    renderCard(badge);
    expect(screen.getByText(badge.description)).toBeTruthy();
  });

  it("the <details> body is EMPTY — the text node appears exactly ONCE, so AT never double-announces it", () => {
    const badge = requireBadge("deadeye");
    renderCard(badge);
    const matches = screen.getAllByText(badge.description);
    expect(matches).toHaveLength(1);
    // The only element child of <details> is the <summary>.
    expect(disclosure().children).toHaveLength(1);
    expect(disclosure().children[0]?.tagName).toBe("SUMMARY");
  });
});

describe("F4 6.2 — TOGGLING THE DISCLOSURE DOES NOT BUY A LEVEL", () => {
  /**
   * The highest-value test in the slice. BadgeCard's root carries the
   * pointer-cycle handler (`onClick={() => onCycle(badge.id)}`), so without
   * `stopPropagation` on the <details>, EVERY EXPAND OF A DESCRIPTION WOULD
   * BUY A LEVEL. This is not a defensive assertion; it is the reason the
   * handler exists.
   */
  it("clicking the <summary> fires neither onCycle nor onSetLevel, and leaves the loadout byte-identical", () => {
    const badge = requireBadge("float-game");
    const loadout: LoadoutEntry[] = [{ badgeId: "float-game", purchasedLevel: "silver" }];
    const before = JSON.stringify(loadout);
    const handlers = renderCard(badge, loadout);

    const summary = disclosure().querySelector("summary");
    expect(summary).not.toBeNull();
    fireEvent.click(summary as HTMLElement);

    expect(handlers.onCycle).not.toHaveBeenCalled();
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
    expect(JSON.stringify(loadout)).toBe(before);
  });

  it("the card body itself DOES still cycle — the stopPropagation is scoped to the disclosure, not a blanket mute", () => {
    const badge = requireBadge("float-game");
    const handlers = renderCard(badge);
    fireEvent.click(document.querySelector(".badge-card__meta") as HTMLElement);
    expect(handlers.onCycle).toHaveBeenCalledWith("float-game");
  });
});

describe("F4 6.3 — disclosure state, asserting ONLY what is reachable in jsdom", () => {
  /**
   * [A4/R14] jsdom 30 implements NO <summary> keyboard-activation behaviour:
   * a synthesized click DOES toggle `details.open`, but `keydown Enter` and
   * `keyup Space` do NOT. The real keyboard path is proved in the browser
   * proof (docs/proof/), where design-spec §6's "toggle on Enter/Space
   * natively" is actually true — not faked here with fireEvent.click.
   *
   * The `tabIndex === 0` assertion is deliberately ABSENT: jsdom's
   * focusable-element list is not the browser's, and replacing one
   * unimplementable assertion with another is not a fix.
   */
  it("a click toggles the `open` property, and fires no purchase handler", () => {
    const badge = requireBadge("deadeye");
    const handlers = renderCard(badge);
    const details = disclosure();
    expect(details.open).toBe(false);

    fireEvent.click(details.querySelector("summary") as HTMLElement);
    expect(details.open).toBe(true);
    expect(handlers.onCycle).not.toHaveBeenCalled();
    expect(handlers.onSetLevel).not.toHaveBeenCalled();
  });

  it("the full text is in the DOM in BOTH the collapsed and the expanded state (the clamp is CSS-only)", () => {
    const badge = requireBadge("deadeye");
    renderCard(badge);
    const details = disclosure();
    expect(screen.getByText(badge.description)).toBeTruthy();
    fireEvent.click(details.querySelector("summary") as HTMLElement);
    expect(details.open).toBe(true);
    expect(screen.getByText(badge.description)).toBeTruthy();
  });

  it("expanded state lives on `open`; `aria-expanded` on the <summary> is null — asserted as DOCUMENTATION OF REALITY", () => {
    // A future reader must not "add the missing ARIA": aria-expanded is not a
    // valid attribute on <summary>, and it would double-report the state that
    // `open` already carries.
    renderCard(requireBadge("deadeye"));
    const summary = disclosure().querySelector("summary") as HTMLElement;
    expect(summary.getAttribute("aria-expanded")).toBeNull();
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
