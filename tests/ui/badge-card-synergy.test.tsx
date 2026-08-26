// @vitest-environment jsdom
/**
 * BadgeCard M4 states (design-spec §3.4, impl-brief M4 #3 + #8a).
 *
 * Synergy treatments — each carries a TEXT label, never color alone:
 * Fuse (solid accent edge + role chip + `Fused to X` + accent halo on the
 * effective pip), Reaction (dashed info edge + chip + `activates to X` /
 * `Activated: X`), Legend-effective (filled Legend pip + LEGEND chip).
 *
 * Per-pip affordability (§3.6): an upgrade pip whose whatIf delta exceeds
 * the category's remaining tokens renders dashed with `+N⚠` — and stays
 * fully clickable (H4: the Budget class never disables anything).
 *
 * F5.3/I12: the space before the glyph is GONE (`+N ⚠` -> `+N⚠`). The pip is
 * the narrowest box in the app and the space cost 6 of the 34px the widest
 * cost string needed; the glyph itself is untouched.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badgeById, shippedDataset } from "../../src/engine/dataset";
import { validateBadge } from "../../src/engine/eligibility";
import { createDefaultSynergySlots, defaultOverlay } from "../../src/engine/synergy";
import type { SynergyState } from "../../src/engine/synergy";
import type { Badge, OverlayState, SynergySlot } from "../../src/engine/types";
import { BadgeCard } from "../../src/ui/grid/BadgeCard";
import { makeBuild } from "../helpers/test-utils";

function requireBadge(id: string): Badge {
  const badge = badgeById(shippedDataset, id);
  if (badge === undefined) throw new Error(`missing badge ${id}`);
  return badge;
}

function patchedSynergySlots(
  patches: Partial<Record<number, Partial<SynergySlot>>>,
): SynergySlot[] {
  return createDefaultSynergySlots(null).map((synergySlot) => ({
    ...synergySlot,
    ...(patches[synergySlot.id] ?? {}),
  }));
}

function renderCard(
  badge: Badge,
  synergyState: SynergyState,
  overlay: OverlayState = defaultOverlay,
  remainingPoints?: number,
) {
  const build = makeBuild(78, 0, { close: 90, drivingDunk: 80 });
  render(
    <BadgeCard
      badge={badge}
      build={build}
      eligibility={validateBadge(badge, build)}
      synergyState={synergyState}
      overlay={overlay}
      dataset={shippedDataset}
      overBadgeSlotsIfBought={false}
      remainingPoints={remainingPoints}
      onSetLevel={vi.fn()}
      onCycle={vi.fn()}
    />,
  );
}

describe("fuse state", () => {
  it("solid accent edge + role chip + Fused-to status + halo on the effective pip", () => {
    renderCard(requireBadge("float-game"), {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergySlots: patchedSynergySlots({ 5: { unlocked: true, fuseBadgeId: "float-game" } }),
    });
    expect(document.querySelector(".badge-card--fuse")).not.toBeNull();
    // Compact visible chip (design-review P1-5) + the H1-correct long form
    // as the accessible name (sr-only).
    expect(screen.getByText(/⚡ Fuse · SS5 \+1/)).toBeTruthy();
    expect(screen.getByText("Fuse · Synergy Slot 5 +1")).toBeTruthy();
    expect(screen.getByText("Now Gold · Fused to HOF")).toBeTruthy();
    // Purchased pip keeps its ring; the effective (HOF) pip carries the
    // halo. That pip is LOCKED for purchase (Close 90 caps at Gold) — the
    // boost plays above the attribute cap by design (seed: Gating
    // semantics), so the halo sits on a locked pip and both stay legible.
    expect(document.querySelector(".pip--current")?.textContent).toContain("G");
    const halo = document.querySelector(".pip--halo-fuse input");
    expect(halo?.getAttribute("aria-label")).toMatch(/^HOF/);
  });

  it("a fuse on a LOCKED synergy slot is not live: chip present, level unboosted", () => {
    renderCard(requireBadge("float-game"), {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergySlots: patchedSynergySlots({ 5: { unlocked: false, fuseBadgeId: "float-game" } }),
    });
    expect(screen.getByText(/⚡ Fuse · SS5/)).toBeTruthy();
    expect(screen.getByText("Fuse · Synergy Slot 5 +1")).toBeTruthy();
    expect(screen.getByText("Now Gold")).toBeTruthy();
    expect(document.querySelector(".pip--halo-fuse")).toBeNull();
  });
});

describe("reaction state", () => {
  const synergySlots = patchedSynergySlots({
    5: { unlocked: true, reactionBadgeId: "aerial-wizard" },
  });
  const loadout = [{ badgeId: "aerial-wizard", purchasedLevel: "bronze" as const }];

  it("reactions OFF: dashed info edge + chip + base level plus `activates to X`", () => {
    renderCard(requireBadge("aerial-wizard"), { loadout, synergySlots });
    expect(document.querySelector(".badge-card--reaction")).not.toBeNull();
    expect(screen.getByText(/↺ Reaction · SS5 \+1/)).toBeTruthy();
    expect(screen.getByText("Reaction · Synergy Slot 5 +1")).toBeTruthy();
    expect(screen.getByText("Now Bronze — activates to Silver")).toBeTruthy();
    expect(document.querySelector(".pip--halo-reaction")).toBeNull();
  });

  it("reactions ON: `Activated: X` + info halo on the effective pip", () => {
    renderCard(
      requireBadge("aerial-wizard"),
      { loadout, synergySlots },
      { reactionsActive: true, seasonReset: false },
    );
    expect(screen.getByText("Now Bronze · Activated: Silver")).toBeTruthy();
    expect(document.querySelector(".pip--halo-reaction")?.textContent).toContain("S");
  });

  it("season reset + temporary slot: `Synergy Slot N disabled by preview`", () => {
    renderCard(
      requireBadge("aerial-wizard"),
      {
        loadout,
        synergySlots: patchedSynergySlots({
          2: { unlocked: true, reactionBadgeId: "aerial-wizard" },
        }),
      },
      { reactionsActive: true, seasonReset: true },
    );
    expect(screen.getByText("Now Bronze · Synergy Slot 2 disabled by preview")).toBeTruthy();
  });
});

describe("Legend-effective state", () => {
  it("fills the Legend pip and shows the LEGEND chip (always via boost)", () => {
    renderCard(requireBadge("float-game"), {
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergySlots: patchedSynergySlots({
        5: { unlocked: true, magnitude: 2, fuseBadgeId: "float-game" },
      }),
    });
    expect(screen.getByText("LEGEND")).toBeTruthy();
    expect(screen.getByText("Now Gold · Fused to Legend")).toBeTruthy();
    expect(document.querySelector(".pip--legend-effective")).not.toBeNull();
    expect(
      screen.getByRole("img", { name: "Legend — effective level via boost" }),
    ).toBeTruthy();
  });
});

describe("per-pip affordability (§3.6) — warned, never disabled (H4)", () => {
  const emptyState: SynergyState = {
    loadout: [],
    synergySlots: createDefaultSynergySlots(null),
  };

  it("deltas beyond remaining render dashed with ⚠; within remaining stay plain", () => {
    // Float Game (A: 3/5/6/7 total-to-own), remaining 5: Bronze +3 and
    // Silver +5 fit; Gold +6 and HOF +7 do not. Close 90 caps at Gold, so
    // HOF is locked (not an affordability question).
    // F5.3/I12: `+6⚠`, no space — see the file header.
    renderCard(requireBadge("float-game"), emptyState, defaultOverlay, 5);
    const costs = [...document.querySelectorAll(".pip__cost")].map((el) => el.textContent);
    expect(costs).toEqual(["+3", "+5", "+6⚠", "—", "boost"]);
    expect(document.querySelectorAll(".pip--unaffordable")).toHaveLength(1);
    const gold = screen.getByRole("radio", { name: /^Gold/ });
    expect(gold.getAttribute("aria-label")).toContain("exceeds remaining tokens");
    // H4: unaffordable is a warning, not a block — the pip still works.
    expect((gold as HTMLInputElement).disabled).toBe(false);
  });

  it("with no remainingPoints provided (unit contexts), no affordability styling", () => {
    renderCard(requireBadge("float-game"), emptyState);
    expect(document.querySelector(".pip--unaffordable")).toBeNull();
  });
});
