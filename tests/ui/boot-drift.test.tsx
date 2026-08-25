// @vitest-environment jsdom
/**
 * F1 item 2 pinning test — a stored autosave containing a badge id that left
 * the dataset (H8 drift, e.g. a launch-day rename) must boot CLEAN: the
 * deserializer strips the unknown id at read time, so no requireBadge render
 * path ever sees it. PRE-FIX, this exact boot threw UnknownBadgeError inside
 * the first render (white-screen crash-loop, escapable only by manually
 * clearing localStorage) — the state H8's DriftBanner exists to survive.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import {
  readAutosave,
  readAutosaveWithReport,
  writeAutosave,
} from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

/** An autosave written against a pre-refresh dataset: one surviving badge
 * (Float Game, Gold) and one whose id no longer exists — which also held a
 * fuse role on unlocked Synergy Slot 5. */
function seedDriftedAutosave(): void {
  const rig = makeRig({
    attributes: { close: 90 },
    budgets: { Finishing: { points: 16, equipSlots: 3 } },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "vanished-badge", purchasedLevel: "hof" },
    ],
    synergyPatches: { 5: { unlocked: true, fuseBadgeId: "vanished-badge" } },
    dataVersion: "2026-01-01.1",
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

describe("boot with a drifted autosave (H8): strip + report, never crash-loop", () => {
  it("readAutosaveWithReport strips the unknown id into droppedEntries and clears its synergy reference", () => {
    seedDriftedAutosave();
    const result = readAutosaveWithReport();
    expect(result).not.toBeNull();
    expect(result!.droppedEntries).toEqual([
      { badgeId: "vanished-badge", purchasedLevel: "hof" },
    ]);
    expect(result!.saved.loadout).toEqual([{ badgeId: "float-game", purchasedLevel: "gold" }]);
    expect(result!.saved.synergy.find((entry) => entry.id === 5)?.fuseBadgeId).toBeNull();
    // The report-free form returns the same stripped build.
    expect(readAutosave()).toEqual(result!.saved);
  });

  it("the app BOOTS CLEAN from that autosave: full first render, surviving purchases intact", () => {
    seedDriftedAutosave();
    // Pre-fix: this render threw UnknownBadgeError (ledger requireBadge /
    // validateLoadout) before any banner could mount.
    render(<App />);
    expect(screen.getByRole("heading", { name: "Badge Builder — 2K27" })).toBeTruthy();
    // The surviving purchase still renders at its planned level.
    expect(screen.getByText("Now Gold")).toBeTruthy();
    // The vanished id is gone from the PLAN (no card, no synergy reference)…
    for (const card of document.querySelectorAll(".badge-card")) {
      expect(card.textContent).not.toContain("vanished-badge");
    }
    // …but the strip is DISCLOSED, never silent (F2 wiring of F1's
    // droppedEntries report into the DriftBanner path).
    expect(
      screen.getByText(
        "1 badge from this build no longer exists in the dataset: vanished-badge — removed from the plan.",
      ),
    ).toBeTruthy();
    // The H8 drift banner (dataVersion mismatch) renders, non-blocking.
    expect(screen.getByText(/Planned against dataset/)).toBeTruthy();
  });
});
