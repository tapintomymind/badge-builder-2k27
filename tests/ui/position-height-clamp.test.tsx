// @vitest-environment jsdom
/**
 * Position → height range (F3, scope.md §0.1 A2 / design-spec §3.3 rev 3).
 *
 * The engine owns the rule (positionHeightRange); the UI clamps at the
 * point of change and DISCLOSES — visible persistent notice + the §6
 * build-change announcement — and the switch always succeeds
 * (non-blocking). "Any" = position unset = the dataset's own 69–88.
 *
 * PRE-F3 these fail: no Any segment exists, position never touches height,
 * and the PhysiqueSection still carries the withdrawn "Cosmetic" treatment.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { defaultAppConfig } from "../../src/config";
import { shippedDataset } from "../../src/engine/dataset";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import type { Budget, SavedBuild } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeBuild } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function pickPosition(name: string) {
  fireEvent.click(screen.getByRole("radio", { name }));
}

function heightFt(): HTMLInputElement {
  return screen.getByLabelText("ft") as HTMLInputElement;
}

function heightIn(): HTMLInputElement {
  return screen.getByLabelText("in") as HTMLInputElement;
}

function zeroBudgets(): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, { equipSlots: 0, points: 0 }]),
  ) as Record<Category, Budget>;
}

/** The VISIBLE persistent clamp notice (distinct from the sr-only
 * announcement region, which also says "Height adjusted"). */
function clampNoticeText(): string | null {
  return document.querySelector(".height-field__notice")?.textContent ?? null;
}

describe("position clamp — out-of-range height snaps to the NEAREST bound and says so", () => {
  it("SF at 6'10\" → PG clamps DOWN to 6'7\" with a visible persistent notice", { timeout: 20000 }, () => {
    render(<App />);
    pickPosition("SF");
    commitNumber(heightIn(), "10"); // 6'10" = 82, inside SF 76–82
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("10");

    pickPosition("PG"); // PG range 69–79 excludes 82
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("7"); // clamped to 79 = 6'7"
    expect(
      screen.getByText(/Height adjusted 6'10" → 6'7" to fit PG's range \(5'9"–6'7"\)\./),
    ).toBeTruthy();
    // Announced through the §6 build-change region.
    const region = document.querySelector('.app > p.sr-only[role="status"]');
    expect(region?.textContent).toBe("Position set to PG. Height adjusted to 6'7\".");
  });

  it("a height INSIDE the new range is not touched and shows no notice", { timeout: 20000 }, () => {
    render(<App />);
    pickPosition("PG"); // default 6'6" (78) is inside PG 69–79
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("6");
    pickPosition("SG"); // 78 is inside SG 72–80 too
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("6");
    expect(clampNoticeText()).toBeNull();
  });

  it("clamping UP works symmetrically (PG 5'9\" → C snaps to 6'7\")", { timeout: 20000 }, () => {
    render(<App />);
    pickPosition("PG");
    commitNumber(heightFt(), "5"); // 5'6" → blur-clamps into PG range → 5'9"
    commitNumber(heightIn(), "9");
    expect(heightFt().value).toBe("5");
    expect(heightIn().value).toBe("9");
    pickPosition("C"); // C range 79–88; 69 clamps UP to 79 = 6'7"
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("7");
    expect(
      screen.getByText(/Height adjusted 5'9" → 6'7" to fit C's range \(6'7"–7'4"\)\./),
    ).toBeTruthy();
  });

  it("the notice holds until the next height change, then clears", { timeout: 20000 }, () => {
    render(<App />);
    pickPosition("SF");
    commitNumber(heightIn(), "10");
    pickPosition("PG");
    expect(clampNoticeText()).toContain("Height adjusted");
    commitNumber(heightIn(), "0"); // user edits height → notice released
    expect(clampNoticeText()).toBeNull();
  });
});

describe("no position selected (\"Any\") — the dataset's 69–88, today's behavior", () => {
  it("zero state defaults to Any with the dataset-range hint, and nothing clamps", { timeout: 20000 }, () => {
    render(<App />);
    const any = screen.getByRole("radio", { name: "Any" }) as HTMLInputElement;
    expect(any.checked).toBe(true);
    expect(
      screen.getByText(`5'9"–7'4", the range this dataset covers.`),
    ).toBeTruthy();
    // The full dataset range commits unclamped at both extremes.
    commitNumber(heightFt(), "7");
    commitNumber(heightIn(), "4");
    expect(heightFt().value).toBe("7");
    expect(heightIn().value).toBe("4"); // 88 held
    expect(clampNoticeText()).toBeNull();
    commitNumber(heightFt(), "5");
    commitNumber(heightIn(), "9");
    expect(heightIn().value).toBe("9"); // 69 held
    expect(clampNoticeText()).toBeNull();
  });

  it("switching back to Any never clamps (§3.3: its range is the dataset's own)", { timeout: 20000 }, () => {
    render(<App />);
    pickPosition("C");
    commitNumber(heightIn(), "10"); // 6'10" → C blur-clamp keeps 82? no: C is 79–88, 82 ok
    pickPosition("Any");
    expect(heightFt().value).toBe("6");
    expect(heightIn().value).toBe("10");
    expect(clampNoticeText()).toBeNull();
  });
});

describe("the withdrawn \"Cosmetic\" treatment (scope.md §0.1 A2 copy consequence)", () => {
  it("the new hint states the range-setting truth; the Cosmetic chip is gone", { timeout: 20000 }, () => {
    render(<App />);
    expect(screen.queryByText("Cosmetic")).toBeNull();
    expect(
      screen.getByText(/Sets the available height range \(Any: 5'9"–7'4"\)\. No badge has a position requirement; badges gate on height and attributes only\./),
    ).toBeTruthy();
    pickPosition("SF");
    expect(
      screen.getByText(/Sets the available height range \(SF: 6'4"–6'10"\)\./),
    ).toBeTruthy();
  });
});

describe("engine violation surfaces in PhysiqueSection (HARD-DISCLOSED)", () => {
  it("a restored out-of-range build renders the warning Banner, un-mutated", { timeout: 20000 }, () => {
    // A build saved before F3 (or imported): 7'0" PG. The deserializer must
    // NOT reject it and the UI must NOT silently re-clamp it (H8) — it
    // disclosures via validateBuild's reasons[] string.
    const saved: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2026-08-25T12:00:00.000Z",
      name: "old build",
      build: { ...makeBuild(84, 50), position: "PG" },
      budgets: zeroBudgets(),
      loadout: [],
      synergy: createDefaultSynergySlots(null),
      config: defaultAppConfig,
    };
    writeAutosave(saved);
    render(<App />);
    expect(heightFt().value).toBe("7");
    expect(heightIn().value).toBe("0"); // NOT re-clamped on load
    expect(
      screen.getByText(`7'0" is outside the PG range 5'9"–6'7"`),
    ).toBeTruthy();
  });
});
