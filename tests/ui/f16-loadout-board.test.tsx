// @vitest-environment jsdom
/**
 * F16 — the Loadout board.
 *
 * The board is a READ-PLUS-NAVIGATE surface. It renders the plan and it
 * navigates; it dispatches no change to the build at all. So every case here
 * is either "does it show what state says", "does it REFUSE to show what
 * state cannot say", or "does pressing it land the user in the right place".
 * There is deliberately no Remove case and no synergy-assignment case,
 * because both were designed for a detail region this cut does not build.
 *
 * The cases that are really ship gates in disguise:
 *
 *  - THE ADDITIVE GUARANTEE. The user's ask was explicit that this is an
 *    ADDITIONAL view. Case group 6 asserts the grid still renders all 53
 *    cards, the Synergy Slots panel still renders its eight rows and its
 *    board, and the Summary still renders — with the board mounted.
 *  - 0 = CAPACITY NOT SET. A discipline the user has not entered must show
 *    NO fence, NO empty cells and NO over-by. A fence with every cell outside
 *    it is the false alarm that ruling exists to prevent, in a new costume.
 *  - THE OVER-BY STRING IS THE SHIPPED ONE. Group 3 reads the fence label and
 *    the ledger overview's own text and asserts they are character-identical.
 *    Two surfaces rendering the same fact in two phrasings is design-review
 *    P0-1, and a new surface is exactly where it comes back.
 *  - PER-METRIC COLOUR. A discipline over on Badge Slots but UNDER on Badge
 *    Points must not paint the points metric red. That is P0-1's original
 *    defect and it is asserted directly.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { costForLevel } from "../../src/engine/cost";
import { shippedDataset } from "../../src/engine/dataset";
import type { Category } from "../../src/engine/vocabulary";
import { writeAutosave, writeUiSectionOpen } from "../../src/persist/local-storage";
import { categoryAnchorId, categorySectionStorageKey } from "../../src/ui/grid/anchors";
import { makeRig } from "./m4-rig";
import type { RigOptions } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

function seed(options: RigOptions) {
  expect(writeAutosave(makeRig(options)).ok).toBe(true);
}

function board(): HTMLElement {
  const found = document.querySelector(".loadout-board");
  if (found === null) throw new Error("the Loadout board did not render");
  return found as HTMLElement;
}

function panel(category: string): HTMLElement {
  const found = document.querySelector(`.board-panel[data-category="${category}"]`);
  if (found === null) throw new Error(`no board panel for ${category}`);
  return found as HTMLElement;
}

function tileNames(category: string): string[] {
  return [...panel(category).querySelectorAll(".board-tile__name")].map(
    (node) => node.textContent ?? "",
  );
}

function emptyTiles(category: string): HTMLElement[] {
  return [...panel(category).querySelectorAll(".board-tile--empty")] as HTMLElement[];
}

/**
 * FOUR DISCIPLINES IN FOUR DIFFERENT CAPACITY STATES, in one render — the
 * combination is the point, because every capacity bug in this project's
 * history has been a state rendering correctly in isolation and wrongly
 * beside its neighbour.
 *
 *   Finishing    3 badges in 2 Badge Slots      -> OVER (and over on points)
 *   Shooting     2 badges in 2 Badge Slots      -> exactly AT capacity
 *   Playmaking   1 badge  in 4 Badge Slots      -> room to spare
 *   Defense      1 badge, capacity NOT SET      -> no fence, no empty cells
 *   Rebounding   0 badges, 2 Badge Slots        -> two empty cells
 *   Physicals    0 badges, capacity NOT SET     -> the browse note
 *
 * Attributes are high enough for every purchase to be legitimate, so nothing
 * here renders stale by accident and the stale case can be isolated.
 */
const MIXED: RigOptions = {
  attributes: {
    close: 95,
    layup: 95,
    drivingDunk: 95,
    standingDunk: 95,
    postControl: 95,
    mid: 95,
    threePt: 95,
    passAcc: 95,
    ballHandle: 95,
    speedWithBall: 95,
    interiorDef: 95,
    perimeterDef: 95,
    steal: 95,
    block: 95,
    offReb: 95,
    defReb: 95,
    speed: 95,
    agility: 95,
    strength: 95,
    vertical: 95,
  },
  budgets: {
    Finishing: { points: 4, equipSlots: 2 },
    Shooting: { points: 20, equipSlots: 2 },
    Playmaking: { points: 20, equipSlots: 4 },
    Rebounding: { points: 8, equipSlots: 2 },
    // Defense and Physicals are left at the zero record: capacity NOT SET.
  },
  loadout: [
    { badgeId: "float-game", purchasedLevel: "gold" },
    { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
    { badgeId: "ghost-stepper", purchasedLevel: "silver" },
    { badgeId: "deadeye", purchasedLevel: "silver" },
    { badgeId: "arc-cadence", purchasedLevel: "bronze" },
    { badgeId: "dimer", purchasedLevel: "gold" },
    { badgeId: "challenger", purchasedLevel: "bronze" },
  ],
};

/* ------------------------------------------------------------ 1: shape -- */

describe("F16 1 — shape: six panels, always, in vocabulary order", () => {
  it("renders all six disciplines even when four of them are empty", () => {
    seed({});
    render(<App />);
    const panels = [...board().querySelectorAll(".board-panel")];
    expect(panels).toHaveLength(6);
    expect(panels.map((node) => node.getAttribute("data-category"))).toEqual([
      "finishing",
      "shooting",
      "playmaking",
      "defense",
      "rebounding",
      "physicals",
    ]);
  });

  it("names each panel with an <h3> that its <section> is labelled by", () => {
    seed(MIXED);
    render(<App />);
    for (const category of ["Finishing", "Shooting", "Playmaking"]) {
      const node = panel(category.toLowerCase());
      const heading = node.querySelector("h3");
      expect(heading?.textContent).toBe(category);
      expect(node.getAttribute("aria-labelledby")).toBe(heading?.id);
    }
    // No heading level is skipped: h1 app title -> h2 section -> h3 panel.
    expect(board().querySelectorAll("h1, h2, h4, h5, h6")).toHaveLength(0);
  });

  it("the MIXED fixture is genuinely legal — no tile is stale by accident", () => {
    // The fixture's comment claims every purchase in it qualifies. Claims in
    // fixture comments rot silently, so it is asserted: a mistyped attribute
    // key would leave a rating at 0 and quietly turn half the board stale,
    // which would make several assertions below pass for the wrong reason.
    seed(MIXED);
    render(<App />);
    expect(board().querySelectorAll('[data-stale="true"]')).toHaveLength(0);
    expect(board().querySelectorAll("a.board-tile")).toHaveLength((MIXED.loadout ?? []).length);
  });

  it("orders tiles by the DATASET, never by the loadout and never by rank", () => {
    // The loadout below is seeded in a deliberately different order from the
    // dataset. A board that followed the loadout would make tiles jump around
    // as the plan is edited, which defeats the whole point of a picture.
    const datasetOrder = shippedDataset.badges
      .filter((badge) => badge.category === "Finishing")
      .map((badge) => badge.name);
    seed({
      ...MIXED,
      loadout: [
        { badgeId: "ghost-stepper", purchasedLevel: "silver" },
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "aerial-wizard", purchasedLevel: "bronze" },
      ],
    });
    render(<App />);
    const shown = tileNames("finishing");
    expect(shown).toHaveLength(3);
    expect(shown).toEqual(datasetOrder.filter((name) => shown.includes(name)));
  });
});

/* --------------------------------------------------------- 2: capacity -- */

describe("F16 2 — capacity as a SHAPE: empty cells, and the fence", () => {
  it("renders one empty cell per unused Badge Slot, and none when full", () => {
    seed(MIXED);
    render(<App />);
    // Rebounding: nothing bought, two Badge Slots entered -> two empty cells.
    expect(emptyTiles("rebounding")).toHaveLength(2);
    // Playmaking: one bought of four -> three empty cells.
    expect(tileNames("playmaking")).toHaveLength(1);
    expect(emptyTiles("playmaking")).toHaveLength(3);
    // Shooting: exactly at capacity -> NO empty cells.
    expect(tileNames("shooting")).toHaveLength(2);
    expect(emptyTiles("shooting")).toHaveLength(0);
    // Finishing: over capacity -> NO empty cells either.
    expect(emptyTiles("finishing")).toHaveLength(0);
  });

  it("puts the badges beyond capacity BELOW a fence, and only those", () => {
    seed(MIXED);
    render(<App />);
    const finishing = panel("finishing");
    expect(finishing.querySelectorAll(".board-panel__fence")).toHaveLength(1);
    const over = [...finishing.querySelectorAll('li[data-over-capacity="true"]')];
    // Three badges in two Badge Slots: exactly one sits outside.
    expect(over).toHaveLength(1);
    // …and it is the LAST in dataset order, not an arbitrary one.
    expect(over[0]?.querySelector(".board-tile__name")?.textContent).toBe(
      tileNames("finishing").at(-1),
    );
    // The fence appears in NO panel that is within capacity.
    for (const category of ["shooting", "playmaking", "rebounding"]) {
      expect(panel(category).querySelectorAll(".board-panel__fence")).toHaveLength(0);
    }
  });

  it("the fence changes NO behaviour — the badge outside it is a live link", () => {
    // Overspend is allowed and disclosed, never prevented. Nothing below the
    // fence is disabled, dimmed or removed from the tab order.
    seed(MIXED);
    render(<App />);
    const outside = panel("finishing").querySelector(
      'li[data-over-capacity="true"] .board-tile',
    ) as HTMLElement;
    expect(outside.tagName).toBe("A");
    expect(outside.getAttribute("href")).toMatch(/^#badge-/);
    expect(outside.hasAttribute("aria-disabled")).toBe(false);
    expect(outside.getAttribute("tabindex")).toBeNull();
    // …and it still counts. The engine's own readout includes it.
    expect(panel("finishing").querySelector(".board-panel__metrics")?.textContent).toContain(
      "3/2",
    );
  });
});

/* ------------------------------------------------------ 3: no drift -- */

describe("F16 3 — one string builder, N surfaces (P0-1)", () => {
  it("the fence label is CHARACTER-IDENTICAL to the ledger overview's", () => {
    seed(MIXED);
    render(<App />);
    const fence = panel("finishing").querySelector(".board-panel__fence-label")?.textContent;
    const railText =
      document.querySelector(".ledger-overview__row .ledger-overview__capacity")?.textContent ??
      "";
    expect(fence).toBeTruthy();
    expect(railText).toContain(fence as string);
    // …and it is the shipped phrasing, not a lookalike.
    expect(fence).toBe("over by 1 ⚠");
  });

  it("PER-METRIC, NEVER PER-ROW: an over-capacity panel under budget on points", () => {
    // P0-1's original defect: a row painted entirely red because ONE of its
    // two numbers was over, so a value under budget rendered as overspend.
    seed({
      ...MIXED,
      // Roomy on points, tight on Badge Slots.
      budgets: { ...MIXED.budgets, Finishing: { points: 40, equipSlots: 2 } },
    });
    render(<App />);
    const metrics = [...panel("finishing").querySelectorAll(".board-panel__metric")];
    const points = metrics.find((node) => node.textContent?.includes("Badge Tokens"));
    const capacity = metrics.find((node) => node.textContent?.includes("Badge Slots"));
    expect(capacity?.className).toContain("board-panel__metric--over");
    expect(points?.className).not.toContain("board-panel__metric--over");
    // And the mirror case: over on points, within capacity.
    expect(points?.textContent).not.toMatch(/over by/);
  });

  it("renders `left N` only while the pool is not over — the builder decides", () => {
    seed(MIXED);
    render(<App />);
    // Finishing is over on points (4 in the pool, three badges bought).
    const finishing = panel("finishing").querySelector(".board-panel__metrics")?.textContent ?? "";
    expect(finishing).toMatch(/over by \d+ ⚠/);
    expect(finishing).not.toContain("left");
    // Playmaking has room.
    expect(panel("playmaking").querySelector(".board-panel__metrics")?.textContent).toContain(
      "left",
    );
  });
});

/* ------------------------------------------------- 4: what it will not say -- */

describe("F16 4 — 0 = capacity not set, honoured exactly", () => {
  it("an un-entered discipline gets the SHIPPED hint and no capacity shapes", () => {
    seed(MIXED);
    render(<App />);
    const defense = panel("defense");
    expect(defense.querySelector(".board-panel__hint")?.textContent).toBe(
      "Badge Slots capacity not set",
    );
    // NO fence, NO empty cells, NO over-by — a fence with every cell outside
    // it is the false alarm the ruling exists to prevent.
    expect(defense.querySelectorAll(".board-panel__fence")).toHaveLength(0);
    expect(emptyTiles("defense")).toHaveLength(0);
    // …no over-by on the CAPACITY metric. The Badge TOKENS pool is a separate
    // number with its own (shipped, app-wide) behaviour: an un-entered pool
    // with purchases against it does read as overspend, on the board exactly
    // as it does in the rail overview. The 0 = unset ruling is about Badge
    // Slots, and reading it wider here would make the board disagree with
    // every other surface.
    const capacityMetric = [...defense.querySelectorAll(".board-panel__metric")].find((node) =>
      node.textContent?.includes("Badge Slots"),
    );
    expect(capacityMetric?.textContent).not.toMatch(/over by/);
    expect(capacityMetric?.className).not.toContain("board-panel__metric--over");
    // The badge the user DID buy is still shown — the capacity is unknown,
    // the purchase is not.
    expect(tileNames("defense")).toEqual(["Challenger"]);
    // …and the capacity reads as an em dash rather than a fabricated zero.
    expect(defense.querySelector(".board-panel__metrics")?.textContent).toContain("1/—");
  });

  it("does NOT claim the build has zero Badge Slots — the app cannot know that", () => {
    // 2K's own screen says "Your Build Has No Rebounding Badge Slots". Ours
    // cannot honestly say it: there is no channel that distinguishes a
    // genuine zero from a field the user has not filled in, and the ruling in
    // force is that the two render IDENTICALLY until one exists. Inventing
    // the distinction here would be inventing 2K27 data.
    seed(MIXED);
    render(<App />);
    for (const banned of [/has no .* Badge Slots/i, /no Badge Slots/i, /0 Badge Slots/i]) {
      expect(board().textContent ?? "").not.toMatch(banned);
    }
  });

  it("an un-entered, un-purchased discipline offers the browse link and nothing else", () => {
    seed(MIXED);
    render(<App />);
    const physicals = panel("physicals");
    expect(physicals.textContent).toContain("No badges purchased.");
    expect(physicals.querySelectorAll(".board-tile")).toHaveLength(0);
    expect(physicals.querySelector(".board-panel__hint")?.textContent).toBe(
      "Badge Slots capacity not set",
    );
  });

  it("a fully zero build renders six panels and not one warning", () => {
    seed({});
    render(<App />);
    expect(board().querySelectorAll(".board-panel")).toHaveLength(6);
    expect(board().querySelectorAll(".board-panel__fence")).toHaveLength(0);
    expect(board().querySelectorAll(".board-tile")).toHaveLength(0);
    expect(board().textContent).not.toMatch(/over by/);
    expect(board().querySelectorAll(".board-panel__hint")).toHaveLength(6);
  });
});

/* ------------------------------------------------------------ 5: tiles -- */

describe("F16 5 — the tile: level, cost, role and staleness, each with two carriers", () => {
  it("carries the purchase level as a LETTER as well as a metal edge", () => {
    seed(MIXED);
    render(<App />);
    const gold = [...panel("finishing").querySelectorAll(".board-tile")].find((node) =>
      node.querySelector(".board-tile__name")?.textContent === "Float Game",
    ) as HTMLElement;
    expect(gold.getAttribute("data-level")).toBe("gold");
    expect(gold.querySelector(".board-tile__level")?.textContent).toBe("G");
    expect(gold.querySelector(".board-tile__edge")).toBeTruthy();
    // …and the accessible name spells the level out in full.
    expect(gold.getAttribute("aria-label")).toContain("Float Game, Gold");
  });

  it("prices the badge from the engine — the tier's own cost, never a guess", () => {
    seed(MIXED);
    render(<App />);
    const tile = [...panel("finishing").querySelectorAll(".board-tile")].find((node) =>
      node.querySelector(".board-tile__name")?.textContent === "Float Game",
    ) as HTMLElement;
    // Float Game is tier A. The expected number comes from the ENGINE's own
    // pricing function over the SHIPPED table, so a change to either moves
    // the assertion with it rather than leaving a stale literal behind.
    const expected = costForLevel("A", "gold", shippedDataset);
    expect(tile.querySelector(".board-tile__cost")?.textContent).toBe(`${String(expected)} pts`);
    expect(tile.getAttribute("aria-label")).toContain(`${String(expected)} Badge Tokens`);
    // THE SPOKEN STRING TAKES THE SINGULAR; the visible chip keeps the unit.
    // "pts" is a unit abbreviation and does not inflect — the app's own
    // feasibility line writes "N pts left" at every N — but the aria-label is
    // read aloud, and "1 Badge Tokens" is a seam a screen-reader user notices
    // immediately. The two channels are allowed to differ for that reason.
    const onePoint = [...board().querySelectorAll("a.board-tile")].find(
      (node) => node.querySelector(".board-tile__cost")?.textContent === "1 pts",
    );
    expect(onePoint, "no 1-point badge in the fixture to check").toBeTruthy();
    expect(onePoint?.getAttribute("aria-label")).toContain(", 1 Badge Token ");
    expect(onePoint?.getAttribute("aria-label")).not.toContain("1 Badge Tokens");
  });

  it("marks a synergy role with an edge SHAPE, a glyph and words — never hue alone", () => {
    seed({
      ...MIXED,
      synergyPatches: { 5: { unlocked: true, fuseBadgeId: "float-game" } },
    });
    render(<App />);
    const fused = [...panel("finishing").querySelectorAll(".board-tile")].find(
      (node) => node.querySelector(".board-tile__name")?.textContent === "Float Game",
    ) as HTMLElement;
    expect(fused.getAttribute("data-role")).toBe("fuse");
    expect(fused.querySelector(".board-tile__role")?.textContent).toBe("⚡");
    expect(fused.getAttribute("aria-label")).toContain("Fuse in Synergy Slot 5");
    // Every other tile carries no role at all.
    const roles = [...board().querySelectorAll(".board-tile[data-role]")];
    expect(roles).toHaveLength(1);
  });

  it("DISCLOSES a stale purchase and never repairs it", () => {
    // H8: nothing anywhere clamps, removes or silently downgrades a stale
    // entry. The tile keeps showing the level the user planned.
    seed({
      attributes: { close: 40, layup: 40 },
      budgets: { Finishing: { points: 20, equipSlots: 3 } },
      loadout: [{ badgeId: "float-game", purchasedLevel: "hof" }],
    });
    render(<App />);
    const tile = panel("finishing").querySelector(".board-tile") as HTMLElement;
    expect(tile.getAttribute("data-stale")).toBe("true");
    expect(tile.querySelector(".board-tile__level")?.textContent).toContain("H");
    expect(tile.querySelector(".board-tile__warn")?.textContent).toBe("⚠");
    expect(tile.getAttribute("aria-label")).toContain("no longer qualifies at this level");
  });
});

/* -------------------------------------------------------- 6: additive -- */

describe("F16 6 — ADDITIVE: the existing view is untouched", () => {
  it("all 53 cards, the eight Synergy rows, the Synergy board and the Summary all still render", () => {
    seed(MIXED);
    render(<App />);
    expect(document.querySelectorAll(".badge-card")).toHaveLength(53);
    expect(document.querySelectorAll(".synergy-row")).toHaveLength(8);
    expect(document.querySelectorAll(".synergy-board")).toHaveLength(1);
    expect(document.querySelector("#panel-summary")).toBeTruthy();
    expect(document.querySelector("#panel-synergy")).toBeTruthy();
    // …and the board borrowed none of their classes, so no scoped query in
    // any other suite can see it.
    expect(board().querySelectorAll(".badge-card, .synergy-row, .category-ledger")).toHaveLength(
      0,
    );
  });

  it("sits BETWEEN the grid and the Synergy Slots panel, as a sibling <details>", () => {
    seed(MIXED);
    render(<App />);
    const mount = document.querySelector("#panel-board") as HTMLElement;
    expect(mount).toBeTruthy();
    const grid = document.querySelector("main#badge-grid") as HTMLElement;
    const synergy = document.querySelector("#panel-synergy") as HTMLElement;
    expect(grid.compareDocumentPosition(mount) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mount.compareDocumentPosition(synergy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mount.parentElement?.className).toBe("col-right");
    // The <Section>'s own <summary> is the keyboard bypass for every board
    // tab stop — one Tab, one Enter, and they all leave the tab order.
    expect(mount.querySelector("details.section > summary")).toBeTruthy();
  });

  it("holds NO element whose entire text is a bare numeral", () => {
    // THE CLASS, CLOSED — not the one instance. `getByText` matches an
    // element's whole textContent and THROWS on a second match, and the
    // shipped suite carries global bare-numeral queries against ledger
    // values, one of them inside a declared RUN-never-edit gate. A new
    // surface that renders `<span>15</span>` reddens a test it has no other
    // relationship with, from across the document. Asserted here so the next
    // addition to the board finds out from this file rather than from that
    // gate.
    seed(MIXED);
    render(<App />);
    for (const node of board().querySelectorAll("*")) {
      expect(
        /^\d+$/.test((node.textContent ?? "").trim()),
        `bare numeral "${node.textContent ?? ""}" in ${node.className}`,
      ).toBe(false);
    }
    // POSITIVE CANARY: the pattern really does catch what it claims to.
    expect(/^\d+$/.test("15")).toBe(true);
    expect(/^\d+$/.test("7/4")).toBe(false);
    expect(/^\d+$/.test("6 pts")).toBe(false);
  });

  it("adds NO live region and NO dialog", () => {
    seed(MIXED);
    render(<App />);
    expect(
      board().querySelectorAll('[role="status"],[role="alert"],[aria-live]'),
    ).toHaveLength(0);
    expect(board().querySelectorAll('[role="dialog"], dialog')).toHaveLength(0);
  });

  it("adds NO control that can change the build", () => {
    seed(MIXED);
    render(<App />);
    // Every interactive node on the board is a link or a filter/browse
    // button. No radio, no select, no checkbox, no text input — the pip row
    // and the synergy pickers stay the single implementation of each.
    expect(board().querySelectorAll("input, select, textarea")).toHaveLength(0);
    expect(board().querySelectorAll('[role="radiogroup"], [role="radio"]')).toHaveLength(0);
    for (const node of board().querySelectorAll("button")) {
      expect(node.className).toMatch(/board-tile--empty|board-panel__browse/);
    }
  });
});

/* ------------------------------------------------------- 7: navigate -- */

describe("F16 7 — navigate: the board arranges, the grid is where you spend", () => {
  it("a tile links to its own card, and that anchor exists in the grid", () => {
    seed(MIXED);
    render(<App />);
    const tile = panel("finishing").querySelector(".board-tile") as HTMLAnchorElement;
    const href = tile.getAttribute("href") as string;
    expect(href).toBe("#badge-aerial-wizard");
    const target = document.getElementById(href.slice(1));
    expect(target).toBeTruthy();
    // …and the target is the card's own <li>, in the grid.
    expect(target?.querySelector(".badge-card")).toBeTruthy();
    expect(target?.closest("main#badge-grid")).toBeTruthy();
  });

  it("every purchased tile's anchor resolves — no dead links at any capacity", () => {
    seed(MIXED);
    render(<App />);
    const tiles = [...board().querySelectorAll("a.board-tile")] as HTMLAnchorElement[];
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      const href = tile.getAttribute("href") as string;
      expect(document.getElementById(href.slice(1)), `dead link ${href}`).toBeTruthy();
    }
  });

  it("an empty Badge Slot FILTERS the grid to its discipline and moves focus there", () => {
    seed(MIXED);
    render(<App />);
    const before = document.querySelectorAll(".badge-card").length;
    expect(before).toBe(53);
    fireEvent.click(emptyTiles("rebounding")[0] as HTMLElement);
    // The grid now shows Rebounding only…
    const after = [...document.querySelectorAll(".badge-card")];
    const rebounding = shippedDataset.badges.filter(
      (badge) => badge.category === "Rebounding",
    ).length;
    expect(after).toHaveLength(rebounding);
    // …and focus is in the grid, not left behind on the board.
    expect(document.activeElement?.id).toBe("badge-grid");
    // IT BOUGHT NOTHING. The plan is byte-identical.
    expect(tileNames("rebounding")).toHaveLength(0);
    expect(emptyTiles("rebounding")).toHaveLength(2);
  });

  it("browsing CLEARS the filters that would hide what it just asked to show", () => {
    // `purchasedOnly` would show an empty grid by construction, and a
    // navigation that lands you somewhere empty reads as a broken link.
    seed(MIXED);
    render(<App />);
    fireEvent.click(screen.getByRole("switch", { name: "Purchased" }));
    expect(document.querySelectorAll(".badge-card").length).toBeLessThan(53);
    fireEvent.click(emptyTiles("rebounding")[0] as HTMLElement);
    const rebounding = shippedDataset.badges.filter(
      (badge) => badge.category === "Rebounding",
    ).length;
    expect(document.querySelectorAll(".badge-card")).toHaveLength(rebounding);
  });

  it("the browse link in an untouched discipline does the same thing", () => {
    seed(MIXED);
    render(<App />);
    fireEvent.click(
      within(panel("physicals")).getByRole("button", { name: /Browse Physicals badges/ }),
    );
    const physicals = shippedDataset.badges.filter(
      (badge) => badge.category === "Physicals",
    ).length;
    expect(document.querySelectorAll(".badge-card")).toHaveLength(physicals);
  });
});

/* --------------------------------------------------------- 8: reveal -- */

describe("F16 8 — a tile reveals a card in a COLLAPSED discipline", () => {
  /** Seed the persisted preference so the section renders already collapsed.
   * That is the shipped precedent (category-ledger.test.tsx does the same),
   * and it exercises the persisted-reload reader at the same time. Driving it
   * with a click instead would depend on jsdom firing `toggle` — which the
   * spec queues ASYNCHRONOUSLY, so React's state would still say "open" and
   * the test would be measuring the harness rather than the app. */
  function collapse(category: Category): void {
    writeUiSectionOpen(categorySectionStorageKey(category), false);
  }

  function disclosure(category: Category): HTMLDetailsElement {
    const found = document.querySelector(`#${categoryAnchorId(category)} details`);
    if (!(found instanceof HTMLDetailsElement)) throw new Error(`no ${category} disclosure`);
    return found;
  }

  it("opens the target's own grid section when the fragment lands inside it", () => {
    seed(MIXED);
    collapse("Finishing");
    render(<App />);
    expect(disclosure("Finishing").open).toBe(false);

    // Follow a board tile's link. jsdom performs no fragment navigation on a
    // click, so the hash is set and the event dispatched the way a browser
    // would — what is under test is the LISTENER, which is the half that
    // would otherwise leave the user staring at a card that is still hidden.
    window.location.hash = "#badge-float-game";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(disclosure("Finishing").open).toBe(true);
  });

  it("leaves every OTHER discipline exactly as the user left it", () => {
    seed(MIXED);
    collapse("Finishing");
    collapse("Shooting");
    render(<App />);

    window.location.hash = "#badge-float-game";
    fireEvent(window, new HashChangeEvent("hashchange"));
    // Finishing opened; Shooting stayed collapsed. A reveal that opened
    // everything would undo a deliberate collapse.
    expect(disclosure("Finishing").open).toBe(true);
    expect(disclosure("Shooting").open).toBe(false);
  });

  it("the shipped #cat-* jump still opens its section — the old path is intact", () => {
    // The listener was WIDENED, not replaced. A regression here would be a
    // dead JumpNav chip at every breakpoint.
    seed(MIXED);
    collapse("Shooting");
    render(<App />);
    window.location.hash = "#cat-shooting";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(disclosure("Shooting").open).toBe(true);
  });

  it("a hash that names nothing opens nothing", () => {
    seed(MIXED);
    collapse("Finishing");
    render(<App />);
    window.location.hash = "#not-a-thing";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(disclosure("Finishing").open).toBe(false);
  });
});
