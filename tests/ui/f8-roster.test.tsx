// @vitest-environment jsdom
/**
 * F8-S2 group 1 — the loadout roster, the Synergy digest, and everything the
 * slice promised NOT to break.
 *
 * EVERY EXPECTED VALUE IS COMPUTED, NOT TRANSCRIBED (§14.5.1). The fixture is
 * `tests/ui/f8-fixture.ts`; the expectations come from `buildSummary`,
 * `synergyProjections`, `validateBadge` and `CategoryLedger`'s exported
 * over-by builders — the same calls the panel makes. Where a literal appears
 * it is STRUCTURAL (a heading exists, a row is absent, a tally is an
 * identity), which is the only class §14.5.1 leaves hand-written.
 *
 * The 20s timeouts match the shipped convention for `tests/ui/**` files that
 * render `App`: this repo has a load-dependent flake class where the 5s
 * default trips under full-suite parallelism. Do not lower them.
 */

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { costForLevel } from "../../src/engine/cost";
import { badgeById, shippedDataset } from "../../src/engine/dataset";
import { validateBadge } from "../../src/engine/eligibility";
import { buildSummary, synergyProjections } from "../../src/engine/summary";
import type { BuildSummary, CategorySummary } from "../../src/engine/summary";
import type { SavedBuild } from "../../src/engine/types";
import { CATEGORIES, LEVELS, LEVEL_LABELS } from "../../src/engine/vocabulary";
import { overByBadgePoints, overByBadgeSlots } from "../../src/ui/grid/CategoryLedger";
import { rosterDigestParts } from "../../src/ui/summary/LoadoutRoster";
import { writeAutosave } from "../../src/persist/local-storage";
import { F8_BADGES, f8EmptyRig, f8LedgerState, f8Rig } from "./f8-fixture";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

function mount(rig: SavedBuild): BuildSummary {
  expect(writeAutosave(rig).ok).toBe(true);
  render(<App />);
  return buildSummary(f8LedgerState(rig), rig.build, shippedDataset);
}

function roster(): HTMLElement {
  const found = document.querySelector(".summary-roster");
  if (!(found instanceof HTMLElement)) throw new Error("roster not rendered");
  return found;
}

function groupFor(summary: CategorySummary): HTMLElement {
  return within(roster()).getByRole("table", { name: summary.category }) as HTMLElement;
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("1 — the roster names every badge you own", () => {
  it(
    "1.1 — one real <table> per NON-EMPTY category, with caption, thead, row headers and a tfoot",
    SLOW,
    () => {
      const summary = mount(f8Rig());
      const populated = summary.categories.filter((category) => category.rows.length > 0);
      // The fixture is two categories; the assertion is that the DOM matches
      // whatever the engine says, not that it matches "two".
      expect(populated.length).toBeGreaterThanOrEqual(2);
      expect(within(roster()).getAllByRole("table")).toHaveLength(populated.length);

      for (const category of populated) {
        const table = groupFor(category);
        expect(table.querySelector("caption")?.textContent).toBe(category.category);
        expect(table.querySelector("thead")).not.toBeNull();
        expect(table.querySelector("tfoot")).not.toBeNull();
        expect(within(table).getAllByRole("rowheader")).toHaveLength(category.rows.length);
      }

      // The a11y ban, asserted on the rendered tree rather than on the CSS:
      // a <tr> flipped to display:block would have stripped these roles.
      expect(within(roster()).getAllByRole("table").length).toBeGreaterThan(0);
    },
  );

  it("1.2 — rows are in DATASET ORDER and contain ONLY purchased badges", SLOW, () => {
    const summary = mount(f8Rig());
    for (const category of summary.categories.filter((entry) => entry.rows.length > 0)) {
      const rendered = within(groupFor(category))
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent);
      // The engine emits dataset order; assert the DOM reproduces it AND
      // that the order really is the dataset's, not the loadout's.
      expect(rendered).toEqual(category.rows.map((row) => row.name));
      const datasetOrder = shippedDataset.badges
        .filter(
          (badge) =>
            badge.category === category.category &&
            category.rows.some((row) => row.badgeId === badge.id),
        )
        .map((badge) => badge.name);
      expect(rendered).toEqual(datasetOrder);
    }
    // …and the 49 unpurchased badges are nowhere in the roster.
    const purchased = new Set(summary.categories.flatMap((c) => c.rows.map((r) => r.badgeId)));
    for (const badge of shippedDataset.badges) {
      if (purchased.has(badge.id)) continue;
      expect(within(roster()).queryByRole("rowheader", { name: badge.name })).toBeNull();
    }
  });

  it("1.2b — the level, effective-level and cost cells are the engine's", SLOW, () => {
    const summary = mount(f8Rig());
    for (const category of summary.categories.filter((entry) => entry.rows.length > 0)) {
      const table = groupFor(category);
      for (const row of category.rows) {
        const tr = within(table).getByRole("rowheader", { name: row.name }).closest("tr");
        expect(tr).not.toBeNull();
        const text = tr?.textContent ?? "";
        expect(text).toContain(LEVEL_LABELS[row.purchasedLevel]);
        expect(text).toContain(row.tier);
        // Cost from the engine's cost table, never from the row object alone.
        expect(row.cost).toBe(costForLevel(row.tier, row.purchasedLevel, shippedDataset));
        expect(text).toContain(String(row.cost));
        if (row.committedEffectiveLevel !== row.purchasedLevel) {
          expect(text).toContain(`→ ${LEVEL_LABELS[row.committedEffectiveLevel]}`);
          if (row.synergyRole !== null) {
            expect(text).toContain(String(row.synergyRole.synergySlotId));
          }
        }
      }
    }
    // The Reaction holder is the §14.6 trap: its committed level is
    // UNBOOSTED under the neutral overlay, so its eff cell is the em dash.
    const reacting = summary.categories
      .flatMap((category) => category.rows)
      .find((row) => row.badgeId === F8_BADGES.reacting);
    expect(reacting?.synergyRole?.kind).toBe("reaction");
    expect(reacting?.committedEffectiveLevel).toBe(reacting?.purchasedLevel);
  });

  it("1.3 — the <tfoot> is the SHARED builder's output, four consumers deep", SLOW, () => {
    const rig = f8Rig();
    const summary = mount(rig);
    const budgets = f8LedgerState(rig).budgets;
    for (const category of summary.categories.filter((entry) => entry.rows.length > 0)) {
      const budget = budgets[category.category];
      const foot = groupFor(category).querySelector("tfoot")?.textContent ?? "";
      const parts = rosterDigestParts(category, budget);

      // Every token, computed from the engine readout / the shared builders.
      expect(parts.badges).toBe(
        `${category.rows.length} badge${category.rows.length === 1 ? "" : "s"}`,
      );
      expect(foot).toContain(parts.badges);
      expect(foot).toContain(`${category.readout.spent} / ${budget.points} pts`);
      expect(foot).toContain(
        overByBadgePoints(category.readout) ?? `left ${category.readout.remainingPoints}`,
      );
      expect(foot).toContain(parts.badgeSlots);
      const over = overByBadgeSlots(category.readout, budget);
      if (over === null) expect(foot).not.toContain("over by");
      else expect(foot).toContain(over);
    }
  });

  it("1.4 — an unset capacity reads `capacity not set`: no fraction, no ⚠, no red", SLOW, () => {
    const rig = f8Rig();
    const summary = mount(rig);
    const unset = summary.categories.filter((category) => category.badgeSlotsCapacityUnset);
    expect(unset.length).toBeGreaterThan(0);
    const withRows = unset.filter((category) => category.rows.length > 0);
    expect(withRows.length).toBe(1); // Playmaking, by construction
    for (const category of withRows) {
      const table = groupFor(category);
      const foot = table.querySelector("tfoot") as HTMLElement;
      expect(foot.textContent).toContain("capacity not set");
      // §4.7: an unset capacity constrains nothing, so no comparison exists.
      expect(foot.textContent).not.toContain("Badge Slots");
      expect(foot.textContent).not.toContain("⚠");
      expect(foot.querySelector(".ledger-over")).toBeNull();
      // The pool is SET in the same category — §4.7's independence ruling.
      expect(foot.textContent).toContain(`${category.readout.spent} / `);
    }
  });

  it("1.5 — an overspend is PER-METRIC, and the caption is never red (I10)", SLOW, () => {
    // Same fixture, one budget lowered: the overspend is the ENGINE's
    // conclusion about this state, not a second hand-built build.
    const rig = f8Rig({
      budgets: { Finishing: { points: 10, equipSlots: 2 }, Playmaking: { points: 8, equipSlots: 0 } },
    });
    const summary = mount(rig);
    const budgets = f8LedgerState(rig).budgets;
    const finishing = summary.categories.find((c) => c.category === "Finishing") as CategorySummary;
    expect(finishing.pointsOverBy).toBeGreaterThan(0);
    expect(finishing.equipSlotsOverBy).toBeGreaterThan(0);

    const table = groupFor(finishing);
    const foot = table.querySelector("tfoot") as HTMLElement;
    expect(foot.textContent).toContain(overByBadgePoints(finishing.readout) as string);
    expect(foot.textContent).toContain(
      overByBadgeSlots(finishing.readout, budgets.Finishing) as string,
    );
    // PER-METRIC: each over-by sits on its own node, and the ones that are
    // not over carry no danger class.
    const flagged = [...foot.querySelectorAll(".ledger-over")].map((node) => node.textContent);
    expect(flagged).toEqual([
      overByBadgePoints(finishing.readout),
      overByBadgeSlots(finishing.readout, budgets.Finishing),
    ]);
    // I10 — identity never becomes state.
    const caption = table.querySelector("caption") as HTMLElement;
    expect(caption.className).toBe("summary-roster__caption");
    expect(caption.className).not.toContain("ledger-over");
    expect(caption.className).not.toContain("danger");
  });

  it("1.6 — the stale row carries THE ENGINE'S OWN reason string", SLOW, () => {
    const rig = f8Rig();
    const summary = mount(rig);
    const stale = summary.categories
      .flatMap((category) => category.rows)
      .filter((row) => row.stale);
    expect(stale).toHaveLength(1);
    const row = stale[0]!;
    expect(row.badgeId).toBe(F8_BADGES.stale);

    const disclosure = roster().querySelector(".summary-roster__stale") as HTMLElement;
    expect(disclosure).not.toBeNull();
    // It spans the table rather than sitting in a column.
    expect(disclosure.querySelector("td")?.getAttribute("colspan")).toBe("5");

    // ASSERTED AGAINST THE ENGINE, NOT A LITERAL: recompute the reasons from
    // validateBadge and require each one to appear verbatim.
    const badge = badgeById(shippedDataset, row.badgeId)!;
    const eligibility = validateBadge(badge, rig.build);
    expect(row.staleReasons.length).toBeGreaterThan(0);
    for (const reason of row.staleReasons) {
      expect(disclosure.textContent).toContain(reason);
      // …and the reason really is one the eligibility engine authored.
      expect(eligibility.reasons).toContain(reason);
    }
    expect(disclosure.textContent).toContain(LEVEL_LABELS[row.purchasedLevel]);
    // H8 — DISCLOSE, NEVER REPAIR: the purchase is still in the roster at the
    // level it was bought at.
    expect(within(groupFor(summary.categories.find((c) => c.category === badge.category)!))
      .getByRole("rowheader", { name: badge.name })).toBeTruthy();
  });

  it("1.7 — zero purchases: one panel, and FULL CHROME everywhere else", SLOW, () => {
    mount(f8EmptyRig());
    expect(roster().textContent).toContain("No badges purchased yet.");
    expect(roster().querySelectorAll("table")).toHaveLength(0);
    // Everything else in the Summary still renders.
    const summaryEl = document.querySelector(".summary") as HTMLElement;
    expect(within(summaryEl).getByRole("table", { name: "Badges by level" })).toBeTruthy();
    expect(within(summaryEl).getByRole("table", { name: "Spend by category" })).toBeTruthy();
    expect(within(summaryEl).getByRole("textbox", { name: /plain text/i })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Export JSON" })).toHaveLength(1);
  });

  it("1.8 — empty categories are omitted and NAMED, with correct grammar", SLOW, () => {
    // One / two / three omissions, each produced by changing the LOADOUT and
    // letting the engine decide which categories are empty.
    const cases: { loadout: SavedBuild["loadout"]; expected: RegExp }[] = [
      {
        loadout: [{ badgeId: F8_BADGES.fused, purchasedLevel: "gold" }],
        expected: /Nothing purchased in Shooting, Playmaking, Defense, Rebounding or Physicals\./,
      },
    ];
    for (const scenario of cases) {
      installMemoryLocalStorage();
      const summary = mount(f8Rig({ loadout: scenario.loadout }));
      const emptyNames = summary.categories
        .filter((category) => category.rows.length === 0)
        .map((category) => category.category);
      // The LIST is the engine's; only the conjunction is authored here.
      expect(roster().textContent).toMatch(scenario.expected);
      for (const name of emptyNames) expect(roster().textContent).toContain(name);
      expect(emptyNames).toHaveLength(5);
    }
  });

  it("1.8b — the grammar is right at one, two and three omissions", SLOW, () => {
    // Purchase in five / four / three categories so the tail names 1 / 2 / 3.
    const oneEach = (categories: readonly string[]) =>
      shippedDataset.badges
        .filter((badge) => categories.includes(badge.category))
        .filter(
          (badge, index, all) =>
            all.findIndex((other) => other.category === badge.category) === index,
        )
        .map((badge) => ({ badgeId: badge.id, purchasedLevel: "bronze" as const }));

    const expectations: [string[], RegExp][] = [
      [CATEGORIES.slice(0, 5), /Nothing purchased in Physicals\./],
      [CATEGORIES.slice(0, 4), /Nothing purchased in Rebounding or Physicals\./],
      [CATEGORIES.slice(0, 3), /Nothing purchased in Defense, Rebounding or Physicals\./],
    ];
    for (const [categories, expected] of expectations) {
      installMemoryLocalStorage();
      document.body.innerHTML = "";
      mount(
        f8Rig({
          loadout: oneEach(categories),
          budgets: Object.fromEntries(
            CATEGORIES.map((category) => [category, { points: 20, equipSlots: 4 }]),
          ),
          // Height/attribute gates must not block the Bronze buys.
          attributes: Object.fromEntries(
            shippedDataset.badges.flatMap((badge) =>
              badge.requirements.attrs.map((line) => [line.attr, 99]),
            ),
          ),
        }),
      );
      expect(roster().textContent).toMatch(expected);
    }
  });
});

describe("1.9 — the Synergy digest is read-only, complete and honest", () => {
  it("lists full `Synergy Slot N` forms, renders unassigned, omits locked", SLOW, () => {
    const rig = f8Rig();
    mount(rig);
    const rows = synergyProjections(f8LedgerState(rig), shippedDataset);
    const digest = document.querySelector(".synergy-digest") as HTMLElement;
    expect(digest).not.toBeNull();

    const unlocked = rows.filter((row) => row.unlocked);
    const locked = rows.filter((row) => !row.unlocked);
    expect(unlocked.length).toBeGreaterThan(0);
    expect(locked.length).toBeGreaterThan(0);

    for (const row of unlocked) {
      expect(digest.textContent).toContain(`Synergy Slot ${row.synergySlotId}`);
    }
    for (const row of locked) {
      expect(digest.textContent).not.toContain(`Synergy Slot ${row.synergySlotId} ·`);
    }
    // The unlocked-but-unassigned arm.
    const unassigned = unlocked.filter((row) => row.fuse === null && row.reaction === null);
    expect(unassigned.length).toBeGreaterThan(0);
    expect(digest.textContent).toContain("— not assigned");
    // The tail count, from the engine's own row set.
    expect(digest.textContent).toContain(
      `${unlocked.length} of ${rows.length} Synergy Slots unlocked`,
    );
    // READ-ONLY: no control of any kind lives in this component.
    expect(digest.querySelectorAll("button, input, select, textarea")).toHaveLength(0);
    // H1: never a bare "Slot".
    expect(digest.textContent).not.toMatch(/(?<!Synergy )\bSlot\b/);
  });

  it("`— frees N pts to {Category}` fires under onFuse and not under legendByAnyMeans", SLOW, () => {
    // BOTH REFUND-TRIGGER ARMS, so the copy is proven to need no change when
    // the default flips — which is §14.4's own stated test of the design.
    for (const trigger of ["legendByAnyMeans", "onFuse"] as const) {
      installMemoryLocalStorage();
      document.body.innerHTML = "";
      const rig = f8Rig({ refundTrigger: trigger });
      mount(rig);
      const rows = synergyProjections(f8LedgerState(rig), shippedDataset);
      const digest = document.querySelector(".synergy-digest") as HTMLElement;
      const fused = rows.find((row) => row.fuse !== null);
      expect(fused).toBeDefined();
      const category = badgeById(shippedDataset, fused!.fuse!.badgeId)!.category;
      if (fused!.freesPointsToCategory > 0) {
        expect(digest.textContent, trigger).toContain(
          `— frees ${fused!.freesPointsToCategory} pts to ${category}`,
        );
      } else {
        expect(digest.textContent, trigger).not.toContain("frees");
      }
    }
    // The two arms genuinely differ on this fixture — otherwise the loop
    // above asserts one thing twice.
    const onFuse = synergyProjections(f8LedgerState(f8Rig({ refundTrigger: "onFuse" })));
    const legend = synergyProjections(
      f8LedgerState(f8Rig({ refundTrigger: "legendByAnyMeans" })),
    );
    const freed = (rows: ReturnType<typeof synergyProjections>) =>
      rows.reduce((sum, row) => sum + row.freesPointsToCategory, 0);
    expect(freed(onFuse)).not.toBe(freed(legend));
  });
});

describe("1.10–1.13 — nothing shipped was removed, and nothing banned was added", () => {
  it("1.10 — F4's and M4's surfaces all still render", SLOW, () => {
    mount(f8Rig());
    const summaryEl = document.querySelector(".summary") as HTMLElement;
    expect(within(summaryEl).getByRole("table", { name: "Badges by level" })).toBeTruthy();
    expect(within(summaryEl).getByRole("table", { name: "Spend by category" })).toBeTruthy();
    // ExportImportControls renders EXACTLY ONCE in the document (F5.2's
    // inventory pinned the count at 1).
    expect(screen.getAllByRole("button", { name: "Export JSON" })).toHaveLength(1);
    // F4's [N6] lead-in removal survives — the sentence must stay ABSENT.
    expect(document.body.textContent).not.toContain(
      "can only come from an externally edited or imported build",
    );
  });

  it("1.11 — countsByLevel is the engine's and the rendered table matches it", SLOW, () => {
    // Three fixtures, INCLUDING a Legend-by-boost case, all read off the same
    // selector the panel now uses.
    const rigs: SavedBuild[] = [
      f8Rig(),
      f8EmptyRig(),
      // Legend by boost: a +2 Fuse on a Gold purchase reaches Legend, so the
      // Gold row must fall to 0 and the Legend (boost) row to 1.
      f8Rig({
        loadout: [{ badgeId: F8_BADGES.fused, purchasedLevel: "gold" }],
        synergyPatches: { 5: { unlocked: true, magnitude: 2, fuseBadgeId: F8_BADGES.fused } },
      }),
    ];
    for (const rig of rigs) {
      installMemoryLocalStorage();
      document.body.innerHTML = "";
      const summary = mount(rig);
      const table = within(document.querySelector(".summary") as HTMLElement).getByRole(
        "table",
        { name: "Badges by level" },
      );
      for (const level of LEVELS) {
        const label = level === "legend" ? "Legend (boost)" : LEVEL_LABELS[level];
        expect(
          within(table).getByRole("rowheader", { name: label }).closest("tr")?.textContent,
        ).toBe(`${label}${summary.countsByLevel[level]}`);
      }
      // The tally is the purchase count, by construction (§14.5.1's
      // structural literal).
      const total = LEVELS.reduce((sum, level) => sum + summary.countsByLevel[level], 0);
      expect(total).toBe(rig.loadout.length);
    }
    // …and the boost case really did move a badge off Gold.
    const boosted = buildSummary(f8LedgerState(rigs[2]!), rigs[2]!.build, shippedDataset);
    expect(boosted.countsByLevel.legend).toBe(1);
    expect(boosted.countsByLevel.gold).toBe(0);
  });

  it("1.12 — AJ-10: no description, no <details>, no NEW chip in any roster row", SLOW, () => {
    mount(f8Rig());
    expect(roster().querySelectorAll("details")).toHaveLength(0);
    expect(within(roster()).queryByText("NEW")).toBeNull();
    for (const badge of shippedDataset.badges) {
      if (badge.description === "") continue;
      expect(roster().textContent).not.toContain(badge.description);
    }
  });

  it("1.13 — AJ-5: no Σ-vs-20 row anywhere in the summary panel DOM", SLOW, () => {
    const rig = f8Rig({
      // Every capacity entered, so the Σ line WOULD be comparable if a
      // surface were rendering it — the assertion is worthless otherwise.
      budgets: Object.fromEntries(
        CATEGORIES.map((category) => [category, { points: 20, equipSlots: 3 }]),
      ),
    });
    const summary = mount(rig);
    expect(summary.equipSlotsBaselineComparable).toBe(true);
    const panel = document.querySelector(".summary") as HTMLElement;
    // The whole-panel DOM, minus the text block — which is the ONE place the
    // Σ line legitimately lives, because the pasted text leaves the app and
    // BudgetTotalRow cannot travel with it.
    const copy = panel.querySelector(".summary__copy");
    copy?.remove();
    expect(panel.textContent).not.toContain("a build starts with");
    expect(panel.textContent).not.toContain(`of the ${summary.equipSlotsBaseline}`);
  });

  it("the App always supplies the summary — the optional props are never left off", SLOW, () => {
    mount(f8Rig());
    // If App.tsx ever drops `summary`/`synergy`, these three regions vanish
    // silently and every other assertion above would still pass on a panel
    // that renders two tables. This is the guard for that.
    expect(document.querySelector(".summary-roster")).not.toBeNull();
    expect(document.querySelector(".synergy-digest")).not.toBeNull();
    expect(document.querySelector(".summary__copy")).not.toBeNull();
  });
});
