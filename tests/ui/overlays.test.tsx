// @vitest-environment jsdom
/**
 * H2 UI regressions (scope.md §3 H2, §2 M4) — BOTH ARE SHIP GATES.
 *
 * (a) Reactions-only regression: toggling "reactions activated" changes card
 *     levels and PROVABLY nothing else — every ledger DOM node's text is
 *     bit-identical.
 * (b) Primary-row invariance — THE ONE THAT ACTUALLY MATTERS: across EVERY
 *     combination of the two overlay toggles, including seasonReset: true,
 *     the PRIMARY ledger rows' rendered totals are bit-identical; the
 *     labelled projection row is the only thing that may differ, and it is
 *     present-and-distinctly-labelled EXACTLY when seasonReset is on.
 *     `seasonReset` IS deliberately routed into ledger math via the parallel
 *     basis channel, so the reachable failure is a one-line UI bug on the
 *     primary row — only this test can see it. The engine property test
 *     cannot (ledger("current") cannot receive an overlay at all).
 *
 * The rig makes the projection REALLY differ: a TEMPORARY synergy slot
 * (id 1, +2 designated) fuses Float Game (purchased Gold) to Legend, so the
 * committed ledger carries a refund that the post-season-reset basis loses.
 *
 * (The cheap secondary — the basis → OverlayState totality test with
 * `reactionsActive` a literal false in both cases — ships in the M2 engine
 * suite: tests/synergy-ledger.test.ts.)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

/** Committed picture: Float Game Gold (A: 6) + Aerial Wizard Bronze (C: 1),
 * Finishing pool 16 / 3 Badge Slots. Fuse +2 → Legend → refund 6:
 * spent 7 · refunded 6 · remaining 15. Post season reset: the temporary
 * slot's boost dies → no refund → remaining 9. */
function seedRig() {
  const rig = makeRig({
    attributes: { close: 90, drivingDunk: 80 },
    budgets: { Finishing: { points: 16, equipSlots: 3 } },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    ],
    synergyPatches: {
      1: { unlocked: true, magnitude: 2, fuseBadgeId: "float-game" },
      5: { unlocked: true, reactionBadgeId: "aerial-wizard" },
    },
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

function setSwitch(name: string, on: boolean) {
  const control = screen.getByRole("switch", { name }) as HTMLInputElement;
  if (control.checked !== on) fireEvent.click(control);
}

/** Every ledger surface, whole-node text (test a). */
function allLedgerTexts(): string[] {
  return [...document.querySelectorAll(".category-ledger, .ledger-overview, .summary")].map(
    (node) => node.textContent ?? "",
  );
}

/** PRIMARY rows + feasibility + overview + summary — everything that must be
 * bit-identical under every overlay combination (test b). Deliberately
 * EXCLUDES only the labelled projection row. */
function primaryTexts(): string[] {
  return [
    ...document.querySelectorAll(
      ".category-ledger__row, .category-ledger__feasibility, .ledger-overview__row, .summary",
    ),
  ].map((node) => node.textContent ?? "");
}

function projectionRows(): HTMLElement[] {
  return [...document.querySelectorAll(".category-ledger__projection")] as HTMLElement[];
}

beforeEach(() => {
  installMemoryLocalStorage();
  seedRig();
});

describe("H2(a) — reactions-only regression (ship gate)", () => {
  it("toggling reactions changes card levels and NO ledger DOM node", () => {
    render(<App />);
    // The committed rig is live: refund visible on the primary row.
    expect(screen.getByText("15")).toBeTruthy(); // remaining 16 − 7 + 6
    const before = allLedgerTexts();
    expect(before.length).toBeGreaterThanOrEqual(8);

    setSwitch("Reactions activated", true);

    // Proof the toggle DID something: the reaction card's level changed.
    expect(screen.getByText("Now Bronze · Activated: Silver")).toBeTruthy();
    // The strip announces the preview, in the spec's exact words.
    expect(
      screen.getByText(
        /Preview: reactions activated\. Card levels show in-game ceilings\. Points are unchanged\./,
      ),
    ).toBeTruthy();
    // …and every ledger DOM node's text is unchanged, bit for bit.
    expect(allLedgerTexts()).toEqual(before);
  });
});

describe("H2(b) — primary-row invariance regression (the real control, ship gate)", () => {
  it("primary rows are bit-identical under ALL 4 overlay combinations; the labelled projection row appears exactly when seasonReset is on", () => {
    render(<App />);
    const baseline = primaryTexts();
    expect(baseline.length).toBeGreaterThanOrEqual(13); // 6×2 rows + feasibility + overview + summary

    const combos: { reactions: boolean; season: boolean }[] = [
      { reactions: false, season: false },
      { reactions: true, season: false },
      { reactions: false, season: true },
      { reactions: true, season: true },
    ];
    for (const combo of combos) {
      setSwitch("Reactions activated", combo.reactions);
      setSwitch("Season-reset preview", combo.season);

      // The PRIMARY rows never move. Not one character.
      expect(primaryTexts(), JSON.stringify(combo)).toEqual(baseline);

      // The projection row: present, labelled, and only under seasonReset.
      const rows = projectionRows();
      if (combo.season) {
        expect(rows, JSON.stringify(combo)).toHaveLength(1); // only Finishing differs
        expect(rows[0]?.textContent).toContain("After season reset");
        // The projection shows the refund dying: 16 spent-equivalent? No —
        // spent stays 7; refund drops to 0 → left 9.
        expect(rows[0]?.textContent).toContain("Badge Points 7 / 16");
        expect(rows[0]?.textContent).toContain("left 9");
        expect(rows[0]?.textContent).toContain("refunded 0");
      } else {
        expect(rows, JSON.stringify(combo)).toHaveLength(0);
      }
    }
  });

  it("the season-reset strip copy is exact and counts projected categories", () => {
    render(<App />);
    setSwitch("Season-reset preview", true);
    expect(
      screen.getByText(
        "Preview: season reset. Synergy Slots 1–4 disabled. Primary points are unchanged; 1 of 6 categories show a projection.",
      ),
    ).toBeTruthy();
    // Both overlays on → both sentences, joined.
    setSwitch("Reactions activated", true);
    expect(
      screen.getByText(
        "Preview: reactions activated. Card levels show in-game ceilings. Points are unchanged. Preview: season reset. Synergy Slots 1–4 disabled. Primary points are unchanged; 1 of 6 categories show a projection.",
      ),
    ).toBeTruthy();
    // Both off → the strip is gone entirely.
    setSwitch("Reactions activated", false);
    setSwitch("Season-reset preview", false);
    expect(document.querySelector(".preview-strip")).toBeNull();
  });

  it("season reset marks the temporary slot's card and synergy row as preview-disabled, controls stay operable", () => {
    render(<App />);
    setSwitch("Season-reset preview", true);
    // Card status: the fuse from temporary Synergy Slot 1 is not live.
    expect(screen.getByText("Now Gold · Synergy Slot 1 disabled by preview")).toBeTruthy();
    // Synergy row note present.
    expect(screen.getByText("⟳ Disabled by season-reset preview")).toBeTruthy();
  });
});
