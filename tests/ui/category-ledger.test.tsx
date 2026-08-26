// @vitest-environment jsdom
/**
 * CategoryLedger (design-spec §3.4, §15.8, scope.md §3 H4). The numbers
 * rendered are ENGINE readouts (categoryLedgerAt) — these tests feed real
 * loadouts through the engine and assert the rendering, including the
 * soft-red overflow treatment that never disables anything.
 *
 * F5.3/B re-points this file at the two components the old `CategoryLedger`
 * split into, and adds the FOUR display-only assertions that are the whole
 * safety argument for making a category collapsible.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { createDefaultSynergySlots } from "../../src/engine/synergy";
import { categoryLedgerAt } from "../../src/engine/synergy-ledger";
import type { SynergyLedgerState } from "../../src/engine/synergy-ledger";
import type { Budget } from "../../src/engine/types";
import type { Category } from "../../src/engine/vocabulary";
import { CATEGORIES } from "../../src/engine/vocabulary";
import { defaultAppConfig } from "../../src/config";
import { zeroBonus } from "../../src/engine/budget";
import { shippedDataset } from "../../src/engine/dataset";
import { SAVED_BUILD_SCHEMA_VERSION } from "../../src/engine/serialization";
import type { SavedBuild } from "../../src/engine/types";
import { writeAutosave, writeUiSectionOpen } from "../../src/persist/local-storage";
import { makeBuild } from "../helpers/test-utils";
import {
  CategoryLedgerDigest,
  CategoryLedgerLede,
} from "../../src/ui/grid/CategoryLedger";
import { categorySectionStorageKey } from "../../src/ui/grid/anchors";
import { installMemoryLocalStorage } from "./storage-stub";

function makeBudgets(finishing: Budget): Record<Category, Budget> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      category === "Finishing" ? finishing : { equipSlots: 0, points: 0 },
    ]),
  ) as Record<Category, Budget>;
}

/** Two Finishing badges: Float Game (A, gold = 6) + Aerial Wizard (C,
 * bronze = 1) → spent 7, Badge Slots used 2. All engine-computed. */
function makeState(finishingBudget: Budget): SynergyLedgerState {
  return {
    loadout: [
      { badgeId: "float-game", purchasedLevel: "gold" },
      { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    ],
    budgets: makeBudgets(finishingBudget),
    synergySlots: createDefaultSynergySlots(null),
    refundTrigger: "legendByAnyMeans",
  };
}

function renderLedger(finishingBudget: Budget) {
  const state = makeState(finishingBudget);
  const readout = categoryLedgerAt(state, "current", "Finishing");
  // F5.3/B: the component split in two along a seam that already existed —
  // the digest is now the <summary> of BadgeGridSection's <details>, and the
  // lede is ordinary disclosure content. A <summary> outside a <details>
  // still renders in jsdom, so the digest needs no wrapper here.
  render(
    <>
      <CategoryLedgerDigest
        category="Finishing"
        readout={readout}
        budget={finishingBudget}
        headingId="h-fin"
      />
      <CategoryLedgerLede
        category="Finishing"
        readout={readout}
        budget={finishingBudget}
      />
    </>,
  );
  return readout;
}

describe("CategoryLedgerDigest + CategoryLedgerLede — engine readouts rendered", () => {
  it("renders spent / pool, left, and Badge Slots used; `refunded 0` is suppressed", () => {
    renderLedger({ points: 16, equipSlots: 3 });
    expect(screen.getByRole("heading", { name: "Finishing" })).toBeTruthy();
    expect(screen.getByText("7 / 16")).toBeTruthy(); // spent / pool
    expect(screen.getByText("9")).toBeTruthy(); // left = 16 − 7 + 0
    // `refunded 0` is noise (design-review P2) — the token renders only when
    // a refund exists.
    expect(screen.queryByText(/refunded/)).toBeNull();
    expect(screen.getByText("2 / 3")).toBeTruthy(); // Badge Slots
    expect(document.querySelector(".category-ledger--over")).toBeNull();
    // §5.3 rev 2: the sticky digest is title + one row; meter and
    // feasibility live in the scrolling lede.
    expect(document.querySelector(".category-ledger .category-ledger__lede")).toBeNull();
    expect(document.querySelector(".category-ledger__lede [role='meter']")).not.toBeNull();
  });

  it("meter reflects spent against the pool", () => {
    renderLedger({ points: 16, equipSlots: 3 });
    const meter = screen.getByRole("meter", { name: "Finishing Badge Tokens" });
    expect(meter.getAttribute("aria-valuenow")).toBe("7");
    expect(meter.getAttribute("aria-valuemax")).toBe("16");
  });
});

describe("CategoryLedgerDigest — H4 soft overflow: red warning, no blocking", () => {
  it("points overspend renders `over by N ⚠` soft-red, never a disabled control", () => {
    // Pool 5 < spent 7 → over by 2; capacity 1 < used 2 → over by 1.
    renderLedger({ points: 5, equipSlots: 1 });
    expect(screen.getByText("over by 2 ⚠")).toBeTruthy();
    expect(screen.getByText("over by 1 ⚠")).toBeTruthy();
    expect(document.querySelector(".category-ledger--over")).not.toBeNull();
    // The over-by texts carry the danger class (soft-red), and there is no
    // disabled control anywhere in the ledger — it is a status bar, and the
    // H4 ruling forbids the Budget class from ever disabling anything.
    for (const el of document.querySelectorAll(".ledger-over")) {
      expect(el.className).toContain("ledger-over");
    }
    expect(document.querySelector("[disabled]")).toBeNull();
    // Overflow is shape too: the meter grows its hatched over-bar.
    expect(document.querySelector(".meter__overflow")).not.toBeNull();
  });
});

/**
 * F5.3/B — COLLAPSE IS DISPLAY-ONLY, asserted FOUR ways.
 *
 * THE JSDOM NOTE THAT WOULD OTHERWISE COST AN HOUR: content inside a CLOSED
 * <details> is still in the DOM, and jsdom applies no UA `display: none`, so
 * `getByText` and `textContent` still find it. Collapse is therefore asserted
 * via `details.open`, NEVER via visibility — and this is also exactly why no
 * H2 overlay ship-gate test can break under this slice.
 */
describe("F5.3/B — a collapsed category is hidden, never subtracted", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  /** A real Shooting purchase, seeded through the autosave rather than
   * clicked: the assertions below are about what a COLLAPSED category still
   * contributes, so the build has to be identical across renders. Deadeye is
   * Shooting, tier B; Three-Point Shot 99 clears every one of its gates. */
  function seedShootingBuild(shootingBudget: Budget = { equipSlots: 4, points: 20 }): void {
    const seeded: SavedBuild = {
      schemaVersion: SAVED_BUILD_SCHEMA_VERSION,
      dataVersion: shippedDataset.dataVersion,
      savedAt: "2026-01-01T00:00:00.000Z",
      name: "Collapse fixture",
      build: makeBuild(78, 0, { threePt: 99, mid: 99 }),
      budgets: Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          category === "Shooting" ? shootingBudget : { equipSlots: 0, points: 0 },
        ]),
      ) as Record<Category, Budget>,
      bonus: zeroBonus(),
      loadout: [{ badgeId: "deadeye", purchasedLevel: "bronze" }],
      synergy: createDefaultSynergySlots(null),
      // [F4/A4] refundTrigger passed EXPLICITLY, never inherited.
      config: { ...defaultAppConfig, refundTrigger: "legendByAnyMeans" as const },
    };
    expect(writeAutosave(seeded).ok).toBe(true);
  }

  /** Seed the persisted preference so the section renders already collapsed —
   * which exercises the persisted-reload reader at the same time. */
  function collapseShooting(): void {
    writeUiSectionOpen(categorySectionStorageKey("Shooting"), false);
  }

  function shootingDisclosure(): HTMLDetailsElement {
    const details = document.querySelector("#cat-shooting details");
    if (!(details instanceof HTMLDetailsElement)) throw new Error("no #cat-shooting details");
    return details;
  }

  function shootingDigest(): HTMLElement {
    const digest = document.querySelector("#cat-shooting .category-ledger");
    if (!(digest instanceof HTMLElement)) throw new Error("no Shooting digest");
    return digest;
  }

  it("(0) the persisted preference collapses it, and the id never left .grid-section", () => {
    seedShootingBuild();
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    // The --cat chain: #cat-shooting is on .grid-section, and the <details>
    // carries no id of its own. Moving the id is the one failure §15.8 exists
    // to prevent, and it would go dark silently.
    const section = document.querySelector("#cat-shooting");
    expect(section?.className).toBe("grid-section");
    expect(shootingDisclosure().hasAttribute("id")).toBe(false);
    // The other five stay open — collapse is per category, and the default is
    // open (the zero state renders the full instrument).
    const finishing = document.querySelector("#cat-finishing details");
    expect((finishing as HTMLDetailsElement).open).toBe(true);
  });

  it("(1) a collapsed category STILL SPENDS Badge Tokens, in its own digest", () => {
    seedShootingBuild();
    render(<App />);
    const spentOpen = shootingDigest().textContent;
    expect(spentOpen).toContain("Badge Tokens");
    // cleanup() first: a second render() APPENDS a container, so a
    // document-scoped query would silently keep reading the open instance.
    cleanup();
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    expect(shootingDigest().textContent).toBe(spentOpen);
  });

  it("(2) a collapsed category STILL COUNTS Badge Slots", () => {
    seedShootingBuild();
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    // One purchased Deadeye against a capacity of 4.
    expect(shootingDigest().textContent).toContain("Badge Slots");
    expect(shootingDigest().textContent).toContain("1 / 4");
  });

  it("(2b) a collapsed category that is OVERSPENT still shows --danger and `over by N ⚠`", () => {
    // Collapse can never hide an H4 overspend: the --over modifier lives on
    // the digest, which IS the summary and is visible when closed.
    // Deadeye is tier B: Bronze costs 2. A pool of 1 is over by 1.
    seedShootingBuild({ equipSlots: 1, points: 1 });
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    expect(shootingDigest().className).toContain("category-ledger--over");
    expect(shootingDigest().textContent).toContain("over by");
    expect(shootingDigest().textContent).toContain("⚠");
  });

  it("(3) a collapsed category STILL APPEARS in the rail TotalsStrip and the Summary", () => {
    seedShootingBuild();
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    // R12: the rail Ledger overview is retired; the rail's always-visible
    // readout is its successor, the TotalsStrip — a collapsed category still
    // holds its cell there, and its Badge Slot is still counted (1 of 4).
    const cell = document.querySelector('.totals-strip__cell[data-category="Shooting"]');
    expect(cell?.textContent).toContain("Shooting");
    expect(cell?.textContent).toContain("1/4");
    expect(document.querySelector(".summary")?.textContent).toContain("Shooting");
    // And `N of 53` stays the FILTER's count: a collapsed category's badges
    // are still SHOWN, otherwise the readout lies about the filter.
    expect(document.querySelectorAll("#cat-shooting .badge-card").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".badge-card")).toHaveLength(53);
  });

  it("(4) a collapsed category STILL EXPORTS — the envelope is byte-identical", async () => {
    async function exportText(): Promise<string> {
      let captured: Blob | null = null;
      Object.defineProperty(URL, "createObjectURL", {
        value: vi.fn((blob: Blob) => {
          captured = blob;
          return "blob:test";
        }),
        configurable: true,
      });
      Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function noop() {});
      fireEvent.click(screen.getAllByRole("button", { name: "Export" })[0] as HTMLElement);
      if (captured === null) throw new Error("no export blob");
      return (captured as Blob).text();
    }

    seedShootingBuild();
    render(<App />);
    const openEnvelope = JSON.parse(await exportText()) as Record<string, unknown>;
    cleanup();
    collapseShooting();
    render(<App />);
    expect(shootingDisclosure().open).toBe(false);
    const collapsedEnvelope = JSON.parse(await exportText()) as Record<string, unknown>;
    // savedAt is a timestamp, not plan state — everything else must match.
    delete openEnvelope.savedAt;
    delete collapsedEnvelope.savedAt;
    expect(collapsedEnvelope).toEqual(openEnvelope);
    expect((collapsedEnvelope.loadout as unknown[]).length).toBe(1);
  });
});
