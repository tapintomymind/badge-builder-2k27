// @vitest-environment jsdom
/**
 * SummaryPanel + ExportImportControls + ImportDialog (design-spec §3.6,
 * impl-brief M4 #9–#10).
 *
 * Pins: counts by committed effective level with `Legend N (boost)` listed
 * separately (Legend is never bought), the spend table with its Total row,
 * the H4/NB-3 disclosure (over-capacity warning chip fires IN THE SUMMARY
 * when a synergy-role holder sits in an over-capacity category), file-based
 * export (Blob + <a download>, no network), and the import confirm flow —
 * drift copy inlined on mismatch, parse failure keeps the dialog open.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { serializeSavedBuild } from "../../src/engine/serialization";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

/** Finishing over capacity (2 badges / 1 Badge Slot) with Float Game
 * holding a fuse role at +2 → committed Legend → refund 6. Deadeye Silver
 * in Shooting. Effective counts: Bronze 1 (Aerial Wizard), Silver 1
 * (Deadeye), Legend 1 (Float Game, boost). */
function seedSummaryRig() {
  const rig = makeRig({
    attributes: { close: 90, mid: 85, drivingDunk: 80 },
    budgets: {
      Finishing: { points: 16, equipSlots: 1 },
      Shooting: { points: 12, equipSlots: 2 },
    },
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
      { badgeId: "deadeye", purchasedLevel: "silver" },
    ],
    synergyPatches: { 5: { unlocked: true, magnitude: 2, fuseBadgeId: "float-game" } },
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

function summary(): HTMLElement {
  const found = document.querySelector(".summary");
  if (!(found instanceof HTMLElement)) throw new Error("summary not rendered");
  return found;
}

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SummaryPanel — badges by level and spend by category", () => {
  it("counts committed effective levels; Legend is a separate (boost) row", () => {
    seedSummaryRig();
    render(<App />);
    const byLevel = within(summary()).getByRole("table", { name: "Badges by level" });
    const rowText = (name: string) =>
      within(byLevel).getByRole("rowheader", { name }).closest("tr")?.textContent;
    expect(rowText("Bronze")).toBe("Bronze1");
    expect(rowText("Silver")).toBe("Silver1");
    expect(rowText("Gold")).toBe("Gold0"); // Float Game plays Legend, not Gold
    expect(rowText("HOF")).toBe("HOF0");
    expect(rowText("Legend (boost)")).toBe("Legend (boost)1");
  });

  it("renders spent / pool per category and the Total row", () => {
    seedSummaryRig();
    render(<App />);
    const spend = within(summary()).getByRole("table", { name: "Spend by category" });
    // Finishing: Float Game gold (6) + Aerial Wizard bronze (1) = 7 / 16.
    expect(
      within(spend).getByRole("rowheader", { name: "Finishing" }).closest("tr")?.textContent,
    ).toContain("7 / 16");
    // Total: 7 + Deadeye silver (A: 5) = 12 / 28.
    expect(
      within(spend).getByRole("rowheader", { name: "Total" }).closest("tr")?.textContent,
    ).toContain("12 / 28");
  });

  it("H4/NB-3: the over-capacity chip fires IN THE SUMMARY when a synergy-role holder sits in an over-capacity category", () => {
    seedSummaryRig();
    render(<App />);
    const warning = summary().querySelector(".summary__warning");
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain("Over Badge Slots");
    expect(warning?.textContent).toContain("Finishing");
    expect(warning?.textContent).toContain("2/1");
    expect(warning?.textContent).toContain("synergy-role badge");
  });

  it("no summary chip when the over-capacity category holds no synergy role", () => {
    const rig = makeRig({
      attributes: { close: 90, drivingDunk: 80 },
      budgets: { Finishing: { points: 16, equipSlots: 1 } },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
      ],
    });
    expect(writeAutosave(rig).ok).toBe(true);
    render(<App />);
    expect(summary().querySelector(".summary__warning")).toBeNull();
  });
});

describe("Export (file-based, no network)", () => {
  it("builds a Blob download named {buildName}-{dataVersion}.json", () => {
    seedSummaryRig();
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function noop() {});
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Export JSON" })[0] as HTMLElement);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("ImportDialog — confirm before replacing, honest about drift", () => {
  function importFile(contents: string, name = "import.json") {
    const input = screen.getAllByLabelText("Import JSON")[0] as HTMLInputElement;
    const file = new File([contents], name, { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
  }

  it("valid same-dataset file: shows name / savedAt / dataset, then replaces on confirm", async () => {
    render(<App />);
    const incoming = makeRig({
      name: "Imported rig",
      attributes: { close: 90 },
      budgets: { Finishing: { points: 16, equipSlots: 3 } },
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
    });
    importFile(serializeSavedBuild(incoming));

    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    expect(within(dialog).getByText("Imported rig")).toBeTruthy();
    expect(within(dialog).getByText("2026-08-25T12:00:00.000Z")).toBeTruthy();
    expect(within(dialog).getByText(incoming.dataVersion)).toBeTruthy();
    // Same dataset — no drift copy.
    expect(within(dialog).queryByText(/Planned against dataset/)).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));
    // The working build was replaced: the loadout came in.
    expect(screen.getByText("Now Gold")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Import build" })).toBeNull();
  });

  it("dataVersion mismatch: the DriftBanner copy is inlined in the confirm", async () => {
    render(<App />);
    const incoming = makeRig({ name: "Old plan", dataVersion: "2020-01-01.1" });
    importFile(serializeSavedBuild(incoming));

    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    expect(within(dialog).getByText(/Planned against dataset/).textContent).toContain(
      "2020-01-01.1",
    );
    expect(within(dialog).getByText(/Requirements may have changed/)).toBeTruthy();
  });

  it("parse failure: danger banner inside the dialog, dialog stays open", async () => {
    render(<App />);
    importFile("this is not json");

    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    expect(within(dialog).getByText(/Couldn't read that file/)).toBeTruthy();
    // No replace action on the error surface; the dialog stays open.
    expect(within(dialog).queryByRole("button", { name: "Replace working build" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Import build" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Import build" })).toBeNull();
    });
  });
});
