/**
 * F8-E1 group 4 — `src/engine/summary-text.ts` (design-spec §14.5).
 *
 * The property AJ-2's ruling buys is 4.2: because the text is built from the
 * SAME `BuildSummary` the panel renders, panel↔text equality can be ASSERTED
 * rather than hoped. That is the whole reason the builder is not in a
 * component.
 *
 * THREE PLACES THIS DIVERGES FROM §14.5's ILLUSTRATIVE BLOCK, all reported
 * rather than papered over:
 *
 *  1. The stale reason keeps the engine's verbatim string, which ends
 *     `… for Gold`. §14.5's illustration trims that suffix. Trimming it here
 *     would be a SECOND PHRASING of a fact `eligibility.ts` already produces —
 *     a named stop-condition — so the shared builder's output wins and the
 *     divergence is recorded.
 *  2. Rows are in DATASET order (§14.1 item 8); the illustration lists
 *     Posterizer first, which dataset order does not.
 *  3. The illustration prints both the `N of 6 categories` footnote AND the Σ
 *     Badge Slots line. AJ-5 / §4.7 suppress the Σ line entirely whenever any
 *     capacity is unset, so the two can never co-occur. The rule wins.
 */

import { describe, expect, it } from "vitest";
import { shippedDataset } from "../src/engine/dataset";
import { buildSummary, synergyProjections } from "../src/engine/summary";
import type { BuildSummary, SynergySummaryRow } from "../src/engine/summary";
import { formatSummaryText } from "../src/engine/summary-text";
import { createDefaultSynergySlots } from "../src/engine/synergy";
import type { SynergyLedgerState } from "../src/engine/synergy-ledger";
import type { Budget, Build, LoadoutEntry, SynergySlot } from "../src/engine/types";
import type { Category } from "../src/engine/vocabulary";
import { ATTRS, CATEGORIES, LEVEL_LABELS } from "../src/engine/vocabulary";

// ---------------------------------------------------------------------------
// One realistic fixture, chosen so the shipped dataset reproduces §14.5's own
// example badges: Posterizer / Rise Up / Float Game in Finishing, Dimer in
// Playmaking — and Float Game's failure copy is literally the spec's
// "needs 90 Close or 93 Layup".
// ---------------------------------------------------------------------------

function fixtureBuild(): Build {
  const attributes = Object.fromEntries(ATTRS.map((attr) => [attr, 50])) as Build["attributes"];
  return {
    heightInches: 78,
    position: "SF",
    attributes: {
      ...attributes,
      drivingDunk: 93, // Posterizer Gold, not HOF
      vertical: 80,
      standingDunk: 81, // Rise Up Silver, not Gold
      close: 85, // Float Game Silver — so a Gold purchase is STALE
      layup: 70,
      passAcc: 60,
      mid: 60,
      steal: 65,
    },
  };
}

const POINTS: Record<Category, number> = {
  Finishing: 16, Shooting: 5, Playmaking: 6, Defense: 4, Rebounding: 3, Physicals: 2,
};
const CAPACITY: Record<Category, number> = {
  Finishing: 3, Shooting: 3, Playmaking: 2, Defense: 3, Rebounding: 3, Physicals: 3,
};

function budgets(overrides: Partial<Record<Category, Budget>> = {}): Record<Category, Budget> {
  const base = Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      { equipSlots: CAPACITY[category], points: POINTS[category] },
    ]),
  ) as Record<Category, Budget>;
  return { ...base, ...overrides };
}

/** Synergy Slot 5 fuses Posterizer and reacts Rise Up; Slot 7 is unlocked and
 * unassigned; the other six stay locked and must NOT render. */
function fixtureSynergySlots(): SynergySlot[] {
  return createDefaultSynergySlots().map((synergySlot) => {
    if (synergySlot.id === 5) {
      return {
        ...synergySlot,
        unlocked: true,
        fuseBadgeId: "posterizer",
        reactionBadgeId: "rise-up",
      };
    }
    return synergySlot.id === 7 ? { ...synergySlot, unlocked: true } : synergySlot;
  });
}

const FIXTURE_LOADOUT: LoadoutEntry[] = [
  { badgeId: "posterizer", purchasedLevel: "gold" },
  { badgeId: "rise-up", purchasedLevel: "silver" },
  { badgeId: "float-game", purchasedLevel: "gold" },
  { badgeId: "dimer", purchasedLevel: "bronze" },
  { badgeId: "static-middy", purchasedLevel: "bronze" },
  { badgeId: "interceptor", purchasedLevel: "bronze" },
];

function stateOf(overrides: Partial<SynergyLedgerState> = {}): SynergyLedgerState {
  return {
    loadout: FIXTURE_LOADOUT,
    budgets: budgets(),
    synergySlots: fixtureSynergySlots(),
    refundTrigger: "legendByAnyMeans",
    ...overrides,
  };
}

function summarize(state: SynergyLedgerState): {
  summary: BuildSummary;
  synergy: SynergySummaryRow[];
} {
  return {
    summary: buildSummary(state, fixtureBuild(), shippedDataset),
    synergy: synergyProjections(state, shippedDataset),
  };
}

const GOLDEN = `## Badge Builder — 2K27 · Slasher v2
6'6" (78 in) · SF · dataset 2026-08-26.1
Badge Points and Badge Slots are unverified — 2K has not published the derivation.

### Finishing — 15 / 16 pts · left 1 · 3 / 3 Badge Slots
- Float Game [A] Gold — 6   !! no longer qualifies: needs 90 Close or 93 Layup for Gold
- Posterizer [A] Gold -> HOF (Fuse, Synergy Slot 5) — 6
- Rise Up [C] Silver — 3

### Shooting — 3 / 5 pts · left 2 · 1 / 3 Badge Slots
- Static Middy [A] Bronze — 3

### Playmaking — 1 / 6 pts · left 5 · 1 / 2 Badge Slots
- Dimer [C] Bronze — 1

### Defense — 2 / 4 pts · left 2 · 1 / 3 Badge Slots
- Interceptor [B] Bronze — 2

Nothing purchased in Rebounding or Physicals.

### Synergy
- Synergy Slot 5 · Permanent · +1 — Fuse: Posterizer -> HOF / Reaction: Rise Up -> Gold when activated
- Synergy Slot 7 · Permanent · +2 — not assigned
- 2 of 8 Synergy Slots unlocked · 1 fully assigned

### Totals
- Badges: Bronze 3 · Silver 1 · Gold 1 · HOF 1 · Legend 0 (boost)
- Spend: 21 / 36
- Badge Slots: 17 of the 20 a build starts with

Roll seed 7F3A-91C2 — reproduces only against this same build, budgets and pins.
`;

describe("4.1 — golden output: one realistic fixture → §14.5's block, byte for byte", () => {
  it("reproduces the format line-shape for line-shape", () => {
    const { summary, synergy } = summarize(stateOf());
    expect(
      formatSummaryText(summary, { buildName: "Slasher v2", rollSeed: "7F3A-91C2" }, synergy),
    ).toBe(GOLDEN);
  });

  it("is deterministic — the builder reads no clock and no ambient state", () => {
    const { summary, synergy } = summarize(stateOf());
    expect(formatSummaryText(summary, {}, synergy)).toBe(formatSummaryText(summary, {}, synergy));
  });
});

describe("4.2 — PANEL ↔ TEXT EQUALITY, asserted rather than hoped", () => {
  it("every cost and every effective level in the text equals its RosterRow field", () => {
    const { summary, synergy } = summarize(stateOf());
    const text = formatSummaryText(summary, {}, synergy);
    let checked = 0;
    for (const category of summary.categories) {
      for (const row of category.rows) {
        const line = text
          .split("\n")
          .find((candidate) => candidate.startsWith(`- ${row.name} [`));
        expect(line, `no text line for ${row.name}`).toBeDefined();
        expect(line).toContain(`— ${row.cost}`);
        expect(line).toContain(LEVEL_LABELS[row.purchasedLevel]);
        if (row.committedEffectiveLevel !== row.purchasedLevel) {
          expect(line).toContain(`-> ${LEVEL_LABELS[row.committedEffectiveLevel]}`);
        } else {
          expect(line).not.toContain("->");
        }
        checked += 1;
      }
    }
    expect(checked).toBe(FIXTURE_LOADOUT.length);
  });

  it("the per-category digest numbers equal the ledger readout", () => {
    const { summary, synergy } = summarize(stateOf());
    const text = formatSummaryText(summary, {}, synergy);
    for (const category of summary.categories.filter((entry) => entry.rows.length > 0)) {
      expect(text).toContain(
        `### ${category.category} — ${category.readout.spent} / `,
      );
    }
  });
});

describe("4.3 — every honesty marker survives into the text", () => {
  it("carries unverified, no longer qualifies, and the dataset version", () => {
    const { summary, synergy } = summarize(stateOf());
    const text = formatSummaryText(summary, {}, synergy);
    expect(text).toContain("unverified — 2K has not published the derivation");
    expect(text).toContain("!! no longer qualifies:");
    expect(text).toContain(`dataset ${shippedDataset.dataVersion}`);
  });

  it("carries capacity not set and the N of 6 footnote when a capacity is unset", () => {
    const state = stateOf({
      budgets: budgets({ Playmaking: { equipSlots: 0, points: 6 } }),
    });
    const { summary, synergy } = summarize(state);
    const text = formatSummaryText(summary, {}, synergy);
    expect(text).toContain("### Playmaking — 1 / 6 pts · left 5 · capacity not set");
    expect(text).toContain("(1 of 6 categories has no capacity set)");
  });

  it("the footnote pluralizes honestly", () => {
    const state = stateOf({
      budgets: budgets({
        Playmaking: { equipSlots: 0, points: 6 },
        Rebounding: { equipSlots: 0, points: 3 },
      }),
    });
    const { summary, synergy } = summarize(state);
    expect(formatSummaryText(summary, {}, synergy)).toContain(
      "(2 of 6 categories have no capacity set)",
    );
  });
});

describe("4.4 — the omitted-categories tail, with correct grammar", () => {
  const cases: { drop: Category[]; tail: string }[] = [
    { drop: ["Rebounding", "Physicals"], tail: "Nothing purchased in Rebounding or Physicals." },
  ];

  for (const testCase of cases) {
    it(`renders "${testCase.tail}"`, () => {
      const { summary, synergy } = summarize(stateOf());
      expect(formatSummaryText(summary, {}, synergy)).toContain(testCase.tail);
    });
  }

  it("one omitted category takes no conjunction", () => {
    const loadout: LoadoutEntry[] = [
      ...FIXTURE_LOADOUT,
      { badgeId: "sync-snatcher", purchasedLevel: "bronze" },
    ];
    const { summary, synergy } = summarize(stateOf({ loadout }));
    expect(formatSummaryText(summary, {}, synergy)).toContain(
      "Nothing purchased in Physicals.",
    );
  });

  it("three or more use a comma series with a final `or`", () => {
    const loadout: LoadoutEntry[] = [{ badgeId: "posterizer", purchasedLevel: "gold" }];
    const { summary, synergy } = summarize(stateOf({ loadout }));
    expect(formatSummaryText(summary, {}, synergy)).toContain(
      "Nothing purchased in Shooting, Playmaking, Defense, Rebounding or Physicals.",
    );
  });

  it("an empty build says so, and still renders its totals (full chrome)", () => {
    const { summary, synergy } = summarize(stateOf({ loadout: [] }));
    const text = formatSummaryText(summary, {}, synergy);
    expect(text).toContain("No badges purchased yet.");
    expect(text).not.toContain("Nothing purchased in");
    expect(text).toContain("### Totals");
  });
});

describe("4.5 — the roll seed footer", () => {
  it("is absent when no seed is passed", () => {
    const { summary, synergy } = summarize(stateOf());
    expect(formatSummaryText(summary, {}, synergy)).not.toContain("Roll seed");
  });

  it("is exactly §14.5's sentence when one is", () => {
    const { summary, synergy } = summarize(stateOf());
    expect(formatSummaryText(summary, { rollSeed: "7F3A-91C2" }, synergy)).toContain(
      "Roll seed 7F3A-91C2 — reproduces only against this same build, budgets and pins.",
    );
  });
});

describe("4.6 — H1: no bare `slot` in the PRODUCED STRING, at any fixture", () => {
  // Asserted on the OUTPUT, not only via the source lint: a template literal
  // can assemble a banned word out of pieces no source grep would catch.
  const BARE = /(?<!badge )(?<!synergy )\b(?:slots?|slot_?count|num_?slots)\b/i;

  const fixtures: { name: string; state: SynergyLedgerState }[] = [
    { name: "the realistic fixture", state: stateOf() },
    { name: "an empty build", state: stateOf({ loadout: [] }) },
    {
      name: "an unset capacity",
      state: stateOf({ budgets: budgets({ Playmaking: { equipSlots: 0, points: 6 } }) }),
    },
    { name: "no synergy at all", state: stateOf({ synergySlots: createDefaultSynergySlots() }) },
  ];

  for (const fixture of fixtures) {
    it(`is clean for ${fixture.name}`, () => {
      const { summary, synergy } = summarize(fixture.state);
      const text = formatSummaryText(summary, { rollSeed: "AAAA-1111" }, synergy);
      const match = BARE.exec(text);
      expect(match, `bare "${match?.[0]}" in the produced text`).toBeNull();
    });
  }

  it("POSITIVE CANARY: the regex used above really does catch a bare slot", () => {
    expect(BARE.test("- 3 slots left")).toBe(true);
    expect(BARE.test("- Badge Slots: 17 of the 20 a build starts with")).toBe(false);
    expect(BARE.test("- Synergy Slot 5 · Permanent · +1")).toBe(false);
  });
});

describe("4.7 — the Σ line is ABSENT when badgeSlotsBaselineText returns null", () => {
  it("an unset capacity suppresses the Badge Slots total entirely", () => {
    const state = stateOf({
      budgets: budgets({ Playmaking: { equipSlots: 0, points: 6 } }),
    });
    const { summary, synergy } = summarize(state);
    const text = formatSummaryText(summary, {}, synergy);
    expect(text).not.toContain("a build starts with");
    expect(text).toContain("### Totals"); // the rest of the block still renders
  });
});

describe("containment — the text block makes no ranking claim of any kind", () => {
  it("no banned quality token appears in any produced string", () => {
    const BANNED = /\b(?:best|optimal|recommend\w*|suggest\w*|ideal|smart|score|rank\w*|tier list|meta)\b/i;
    const { summary, synergy } = summarize(stateOf());
    const text = formatSummaryText(summary, { rollSeed: "AAAA-1111" }, synergy);
    const match = BANNED.exec(text);
    expect(match, `banned token "${match?.[0]}" in the produced text`).toBeNull();
  });
});
