// @vitest-environment jsdom
/**
 * F4 group 5 — the dataVersion bump is CLEAN drift.
 *
 * EVERY existing saved build — including the user's own autosave — hits this
 * path the first time F4 runs, because F4 bumps `dataVersion`
 * 2026-08-25.1 → 2026-08-26.1. Only DESCRIPTIONS and NEW FLAGS were added:
 * no threshold moved, no badge left the dataset. So the drift banner must
 * appear (H8: never silently re-validate a plan) and then report NOTHING
 * wrong.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

const PRE_F4_DATA_VERSION = "2026-08-25.1";

beforeEach(() => {
  installMemoryLocalStorage();
});

/** A saved build stamped with the PRE-F4 dataVersion, holding real purchases. */
function stampedRig() {
  return makeRig({
    dataVersion: PRE_F4_DATA_VERSION,
    attributes: { close: 90, mid: 92, steal: 93 },
    budgets: {
      Finishing: { points: 16, equipSlots: 3 },
      Shooting: { points: 16, equipSlots: 3 },
    },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "deadeye", purchasedLevel: "gold" },
    ],
  });
}

describe("F4 group 5 — a pre-F4 saved build under the bumped dataset", () => {
  it("the dataset really did bump (otherwise this whole group is vacuous)", () => {
    expect(shippedDataset.dataVersion).toBe("2026-08-26.1");
    expect(shippedDataset.dataVersion).not.toBe(PRE_F4_DATA_VERSION);
  });

  it("the DriftBanner appears — H8 never silently re-validates a plan away", () => {
    expect(writeAutosave(stampedRig()).ok).toBe(true);
    render(<App />);
    expect(screen.getByText(/Planned against dataset/i)).toBeTruthy();
    expect(screen.getByText(PRE_F4_DATA_VERSION)).toBeTruthy();
    expect(screen.getByText(shippedDataset.dataVersion)).toBeTruthy();
  });

  it("the re-check reports ZERO purchased badges newly failing — only descriptions were added", () => {
    expect(writeAutosave(stampedRig()).ok).toBe(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /re-check eligibility/i }));
    // Both purchases still qualify: no threshold moved in the F4 bump.
    expect(
      screen.getByText("Every purchased badge still qualifies at the level you planned."),
    ).toBeTruthy();
    expect(screen.queryByText(/no longer qualifies/i)).toBeNull();
    expect(screen.queryByText(/removed from the dataset/i)).toBeNull();
  });

  it("no loadout entry is dropped", () => {
    expect(writeAutosave(stampedRig()).ok).toBe(true);
    render(<App />);
    // Both badges are still purchased: their cards carry a checked pip.
    const checked = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(
      (input) => input.checked && input.name.length > 0,
    );
    expect(checked.length).toBeGreaterThan(0);
    expect(screen.queryByText(/removed from the dataset/i)).toBeNull();
  });

  it("the build's own stamp stays 2026-08-25.1 — STICKY, never rewritten on load", () => {
    expect(writeAutosave(stampedRig()).ok).toBe(true);
    render(<App />);
    // The banner still names the OLD version after the render: App.tsx's own
    // rule is that a load never re-stamps the build.
    expect(screen.getByText(PRE_F4_DATA_VERSION)).toBeTruthy();
  });
});
