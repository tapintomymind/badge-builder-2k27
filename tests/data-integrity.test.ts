/**
 * The 14 data-integrity assertions (scope.md §2.1). ALL 14 run against the
 * parsed src/data/badges.json ONLY. None is a loader guard — the loader's
 * guards are arity-only, and the H3 synthetic fixtures deliberately violate
 * assertions 11/12 and MUST stay loadable.
 *
 * Two classes, deliberately labelled differently:
 *  - CONTRACT (1–6): the seed states them. A failure means the dataset is wrong.
 *  - TRIPWIRE (7–14): properties 2K never promised. A failure means 2K
 *    published something new, and the response is ASK THE USER, not "fix" the
 *    data. Never edit badges.json by hand — fix badges.source.txt via the
 *    generator, or stop and ask.
 */

import { describe, expect, it } from "vitest";
import datasetText from "../src/data/badges.json?raw";
import type { RawBadgeDataset } from "../src/engine/types";
import { ATTRS, CATEGORIES, LEVELS, TIERS } from "../src/engine/vocabulary";

const TRIPWIRE =
  "TRIPWIRE: this property was never promised by 2K. A failure means 2K published " +
  "something new — the response is ASK THE USER, not \"fix\" the data.";

const CONTRACT = "CONTRACT: the seed states this. A failure means the dataset is wrong.";

const dataset = JSON.parse(datasetText) as RawBadgeDataset;
const badges = dataset.badges;

function kebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("data-integrity: CONTRACT assertions 1-6 (seed: Data-integrity tests)", () => {
  it("1. contains exactly 53 badges", () => {
    expect(badges.length, CONTRACT).toBe(53);
  });

  it("2. per-category counts are 11 / 9 / 10 / 12 / 5 / 6", () => {
    const byCategory = new Map<string, number>();
    for (const badge of badges) {
      byCategory.set(badge.category, (byCategory.get(badge.category) ?? 0) + 1);
    }
    expect(byCategory.get("Finishing"), CONTRACT).toBe(11);
    expect(byCategory.get("Shooting"), CONTRACT).toBe(9);
    expect(byCategory.get("Playmaking"), CONTRACT).toBe(10);
    expect(byCategory.get("Defense"), CONTRACT).toBe(12);
    expect(byCategory.get("Rebounding"), CONTRACT).toBe(5);
    expect(byCategory.get("Physicals"), CONTRACT).toBe(6);
  });

  it("3. tier distribution is 22 A / 15 B / 16 C", () => {
    const byTier = new Map<string, number>();
    for (const badge of badges) {
      byTier.set(badge.tier, (byTier.get(badge.tier) ?? 0) + 1);
    }
    expect(byTier.get("A"), CONTRACT).toBe(22);
    expect(byTier.get("B"), CONTRACT).toBe(15);
    expect(byTier.get("C"), CONTRACT).toBe(16);
  });

  it("4. every badge has requirements", () => {
    for (const badge of badges) {
      expect(badge.requirements, `${CONTRACT} (badge ${badge.id})`).toBeDefined();
      expect(badge.requirements.attrs.length, `${CONTRACT} (badge ${badge.id})`).toBeGreaterThan(0);
    }
  });

  it("5. all heights are within 69-88 inches", () => {
    for (const badge of badges) {
      const { heightMinInches, heightMaxInches } = badge.requirements;
      expect(heightMinInches, `${CONTRACT} (badge ${badge.id})`).toBeGreaterThanOrEqual(69);
      expect(heightMaxInches, `${CONTRACT} (badge ${badge.id})`).toBeLessThanOrEqual(88);
    }
  });

  it("6. exactly one badge (unpluckable) contains a null threshold", () => {
    const withNulls = badges.filter((badge) =>
      badge.requirements.attrs.some((line) => line.perLevel.includes(null)),
    );
    expect(withNulls.map((badge) => badge.id), CONTRACT).toEqual(["unpluckable"]);
  });
});

describe("data-integrity: TRIPWIRE assertions 7-14 (properties 2K never promised)", () => {
  it("7. arity: logic single has 1 attr line; and/or have exactly 2", () => {
    for (const badge of badges) {
      const { logic, attrs } = badge.requirements;
      const expected = logic === "single" ? 1 : 2;
      expect(attrs.length, `${TRIPWIRE} (badge ${badge.id}, logic ${logic})`).toBe(expected);
      expect(["single", "and", "or"], `${TRIPWIRE} (badge ${badge.id})`).toContain(logic);
    }
  });

  it("8. arity counts: exactly 22 single-attr and 31 dual-attr badges", () => {
    const single = badges.filter((badge) => badge.requirements.attrs.length === 1).length;
    const dual = badges.filter((badge) => badge.requirements.attrs.length === 2).length;
    expect(single, TRIPWIRE).toBe(22);
    expect(dual, TRIPWIRE).toBe(31);
  });

  it("9. attr union: every attr is a member of the canonical 20-value Attr union", () => {
    const canonical = new Set<string>(ATTRS);
    for (const badge of badges) {
      for (const line of badge.requirements.attrs) {
        expect(canonical.has(line.attr), `${TRIPWIRE} (badge ${badge.id}, attr "${line.attr}")`).toBe(
          true,
        );
      }
    }
  });

  it("10. category union: every category is a member of the canonical capitalized 6-value Category union", () => {
    const canonical = new Set<string>(CATEGORIES);
    for (const badge of badges) {
      expect(
        canonical.has(badge.category),
        `${TRIPWIRE} (badge ${badge.id}, category "${badge.category}")`,
      ).toBe(true);
    }
  });

  it("10b. cross-group badges exist: Physical Finisher is category Finishing but requires strength (a Physicals attribute) — Category must NEVER be derived from AttrGroup", () => {
    const physicalFinisher = badges.find((badge) => badge.id === "physical-finisher");
    expect(physicalFinisher, TRIPWIRE).toBeDefined();
    expect(physicalFinisher?.category, TRIPWIRE).toBe("Finishing");
    expect(
      physicalFinisher?.requirements.attrs.map((line) => line.attr),
      TRIPWIRE,
    ).toContain("strength");
  });

  it("11. nulls are suffix-only: once a line goes null, all higher levels are null (badges.json ONLY — the H3 fixtures deliberately violate this and stay loadable)", () => {
    for (const badge of badges) {
      for (const line of badge.requirements.attrs) {
        let seenNull = false;
        for (const threshold of line.perLevel) {
          if (threshold === null) {
            seenNull = true;
          } else {
            expect(
              seenNull,
              `${TRIPWIRE} (badge ${badge.id}, ${line.attr}: non-null after null in ${JSON.stringify(line.perLevel)})`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("12. thresholds non-decreasing: per line, every non-null threshold >= the previous non-null one (badges.json ONLY)", () => {
    for (const badge of badges) {
      for (const line of badge.requirements.attrs) {
        let previous = -Infinity;
        for (const threshold of line.perLevel) {
          if (threshold === null) continue;
          expect(
            threshold,
            `${TRIPWIRE} (badge ${badge.id}, ${line.attr}: decreasing in ${JSON.stringify(line.perLevel)})`,
          ).toBeGreaterThanOrEqual(previous);
          previous = threshold;
        }
      }
    }
  });

  it("13. provenance present: dataVersion / source / asOf non-empty; gameVersion null-or-string (never guessed); confidence in {pre-release, launch, patched}", () => {
    expect(typeof dataset.dataVersion, TRIPWIRE).toBe("string");
    expect(dataset.dataVersion.length, TRIPWIRE).toBeGreaterThan(0);
    expect(typeof dataset.source, TRIPWIRE).toBe("string");
    expect(dataset.source.length, TRIPWIRE).toBeGreaterThan(0);
    expect(typeof dataset.asOf, TRIPWIRE).toBe("string");
    expect(dataset.asOf.length, TRIPWIRE).toBeGreaterThan(0);
    expect(
      dataset.gameVersion === null || typeof dataset.gameVersion === "string",
      `${TRIPWIRE} (gameVersion must be null until 2K publishes — NEVER a guessed value)`,
    ).toBe(true);
    expect(["pre-release", "launch", "patched"], TRIPWIRE).toContain(dataset.confidence);
  });

  it("14. structural: ids unique + kebab-case of name; heightMin <= heightMax; levels = canonical 5-tuple; every tierCosts and perLevel array has length 4", () => {
    const ids = badges.map((badge) => badge.id);
    expect(new Set(ids).size, TRIPWIRE).toBe(badges.length);
    for (const badge of badges) {
      expect(badge.id, `${TRIPWIRE} (badge "${badge.name}")`).toBe(kebabCase(badge.name));
      expect(
        badge.requirements.heightMinInches,
        `${TRIPWIRE} (badge ${badge.id})`,
      ).toBeLessThanOrEqual(badge.requirements.heightMaxInches);
      for (const line of badge.requirements.attrs) {
        expect(line.perLevel.length, `${TRIPWIRE} (badge ${badge.id}, ${line.attr})`).toBe(4);
      }
    }
    expect(dataset.levels, TRIPWIRE).toEqual([...LEVELS]);
    for (const tier of TIERS) {
      expect(dataset.tierCosts[tier].length, `${TRIPWIRE} (tier ${tier})`).toBe(4);
    }
  });
});
