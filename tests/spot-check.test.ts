/**
 * Anti-transcription control 2 of 2 (scope.md §3 H7) — SHIP GATE.
 *
 * The 13-badge verbatim spot-check: the FULL parsed record of 13 badges is
 * asserted against hand-written literals.
 *
 * These literals are transcribed by hand from `seed.md`. Regenerating them
 * from `badges.source.txt` defeats the entire control.
 *
 * (The generator + deepEqual pipeline only proves the generator agrees with
 * its own output. These literals are the independent second transcription:
 * for the two to agree AND be wrong, the same error must be made twice,
 * independently.) The set spans all 20 attribute aliases, all 3 tiers, all 3
 * logic modes, all 6 categories, and four non-default height ranges — the
 * meta-assertions at the bottom keep that coverage claim honest.
 */

import { describe, expect, it } from "vitest";
import datasetText from "../src/data/badges.json?raw";
import type { RawBadge, RawBadgeDataset } from "../src/engine/types";

const dataset = JSON.parse(datasetText) as RawBadgeDataset;

/** Hand-transcribed from seed.md — NOT generated. See file header. */
type RequirementsBearingBadge = Omit<RawBadge, "description" | "isNew">;

/** [F4] Strip the DISPLAY-ONLY fields before comparing. This control's job is
 * the THRESHOLD transcription (H7); doubling its hand-typed surface with 13
 * more strings would DILUTE it, and the descriptions have their own,
 * separately-transcribed control (tests/enrichment-spot-check.test.ts). */
function requirementsBearing(badge: RawBadge): RequirementsBearingBadge {
  const { description: _description, isNew: _isNew, ...rest } = badge;
  return rest;
}

const EXPECTED: RequirementsBearingBadge[] = [
  {
    // seed: "Aerial Wizard [C] 5'9–7'4 — Dr Dunk 60/70/80/94 OR St Dunk 60/70/80/93"
    id: "aerial-wizard",
    name: "Aerial Wizard",
    tier: "C",
    category: "Finishing",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "or",
      attrs: [
        { attr: "drivingDunk", perLevel: [60, 70, 80, 94] },
        { attr: "standingDunk", perLevel: [60, 70, 80, 93] },
      ],
    },
  },
  {
    // seed: "Float Game [A] 5'9–7'4 — Close 65/80/90/96 OR Layup 65/85/93/95"
    id: "float-game",
    name: "Float Game",
    tier: "A",
    category: "Finishing",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "or",
      attrs: [
        { attr: "close", perLevel: [65, 80, 90, 96] },
        { attr: "layup", perLevel: [65, 85, 93, 95] },
      ],
    },
  },
  {
    // seed: "Unpluckable [A] 5'9–7'4 — Post Ctrl 65/86/96/— OR Ball Hdl 65/80/92/97"
    // The U+2014 hazard badge: the em dash is BOTH the name/attr separator and
    // the null token. The HOF null on the Post Ctrl line is the control.
    id: "unpluckable",
    name: "Unpluckable",
    tier: "A",
    category: "Playmaking",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "or",
      attrs: [
        { attr: "postControl", perLevel: [65, 86, 96, null] },
        { attr: "ballHandle", perLevel: [65, 80, 92, 97] },
      ],
    },
  },
  {
    // seed: "Deadeye [A] 5'9–7'4 — Mid 65/85/92/99 OR 3Pt 65/85/92/99"
    id: "deadeye",
    name: "Deadeye",
    tier: "A",
    category: "Shooting",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "or",
      attrs: [
        { attr: "mid", perLevel: [65, 85, 92, 99] },
        { attr: "threePt", perLevel: [65, 85, 92, 99] },
      ],
    },
  },
  {
    // seed: "Physical Finisher [B] 5'9–7'4 — Layup 60/80/90/96 AND Str 60/70/80/90"
    // Cross-group badge: category Finishing, requires Str (a Physicals attr).
    id: "physical-finisher",
    name: "Physical Finisher",
    tier: "B",
    category: "Finishing",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "and",
      attrs: [
        { attr: "layup", perLevel: [60, 80, 90, 96] },
        { attr: "strength", perLevel: [60, 70, 80, 90] },
      ],
    },
  },
  {
    // seed: "Lightning Launch [A] 5'9–6'11 — SWB 68/75/86/91"
    id: "lightning-launch",
    name: "Lightning Launch",
    tier: "A",
    category: "Playmaking",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 83,
      logic: "single",
      attrs: [{ attr: "speedWithBall", perLevel: [68, 75, 86, 91] }],
    },
  },
  {
    // seed: "Ankle Braces [B] 5'9–6'9 — Per Def 60/86/93/95 AND Aglty 65/82/89/92"
    id: "ankle-braces",
    name: "Ankle Braces",
    tier: "B",
    category: "Defense",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 81,
      logic: "and",
      attrs: [
        { attr: "perimeterDef", perLevel: [60, 86, 93, 95] },
        { attr: "agility", perLevel: [65, 82, 89, 92] },
      ],
    },
  },
  {
    // seed: "Paint Patroller [A] 6'5–7'4 — Int Def 60/71/77/84 AND Block 70/84/93/99"
    id: "paint-patroller",
    name: "Paint Patroller",
    tier: "A",
    category: "Defense",
    requirements: {
      heightMinInches: 77,
      heightMaxInches: 88,
      logic: "and",
      attrs: [
        { attr: "interiorDef", perLevel: [60, 71, 77, 84] },
        { attr: "block", perLevel: [70, 84, 93, 99] },
      ],
    },
  },
  {
    // seed: "Glove [B] 5'9–7'0 — Steal 70/83/93/99"
    id: "glove",
    name: "Glove",
    tier: "B",
    category: "Defense",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 84,
      logic: "single",
      attrs: [{ attr: "steal", perLevel: [70, 83, 93, 99] }],
    },
  },
  {
    // seed: "Sync Snatcher [C] 5'9–7'4 — Off Reb 55/70/82/90 OR Def Reb 55/70/82/90"
    id: "sync-snatcher",
    name: "Sync Snatcher",
    tier: "C",
    category: "Rebounding",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "or",
      attrs: [
        { attr: "offReb", perLevel: [55, 70, 82, 90] },
        { attr: "defReb", perLevel: [55, 70, 82, 90] },
      ],
    },
  },
  {
    // seed: "Bail Out [A] 5'9–7'4 — Pass Acc 85/93/96/99"
    id: "bail-out",
    name: "Bail Out",
    tier: "A",
    category: "Playmaking",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "single",
      attrs: [{ attr: "passAcc", perLevel: [85, 93, 96, 99] }],
    },
  },
  {
    // seed: "Flash [A] 5'9–7'4 — Spd 70/82/87/95 AND Aglty 60/78/81/91"
    id: "flash",
    name: "Flash",
    tier: "A",
    category: "Physicals",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "and",
      attrs: [
        { attr: "speed", perLevel: [70, 82, 87, 95] },
        { attr: "agility", perLevel: [60, 78, 81, 91] },
      ],
    },
  },
  {
    // seed: "Posterizer [A] 5'9–7'4 — Dr Dunk 73/87/93/99 AND Vert 65/75/80/90"
    id: "posterizer",
    name: "Posterizer",
    tier: "A",
    category: "Finishing",
    requirements: {
      heightMinInches: 69,
      heightMaxInches: 88,
      logic: "and",
      attrs: [
        { attr: "drivingDunk", perLevel: [73, 87, 93, 99] },
        { attr: "vertical", perLevel: [65, 75, 80, 90] },
      ],
    },
  },
];

describe("13-badge verbatim spot-check against hand-transcribed seed literals (H7 ship gate)", () => {
  for (const expected of EXPECTED) {
    it(`${expected.name}: full parsed record matches the hand transcription`, () => {
      const actual = dataset.badges.find((badge) => badge.id === expected.id);
      expect(actual, `badge ${expected.id} missing from badges.json`).toBeDefined();
      expect(requirementsBearing(actual as RawBadge)).toEqual(expected);
    });
  }

  it("meta: the 13 badges' attribute lines union to ALL 20 canonical attrs", () => {
    const union = new Set(
      EXPECTED.flatMap((badge) => badge.requirements.attrs.map((line) => line.attr)),
    );
    expect(union.size).toBe(20);
  });

  it("meta: the set spans all 3 tiers, all 3 logic modes, and all 6 categories", () => {
    expect(new Set(EXPECTED.map((badge) => badge.tier)).size).toBe(3);
    expect(new Set(EXPECTED.map((badge) => badge.requirements.logic)).size).toBe(3);
    expect(new Set(EXPECTED.map((badge) => badge.category)).size).toBe(6);
  });

  it("meta: the set includes four non-default height ranges", () => {
    const nonDefault = EXPECTED.filter(
      (badge) =>
        badge.requirements.heightMinInches !== 69 || badge.requirements.heightMaxInches !== 88,
    );
    expect(nonDefault.length).toBe(4);
  });
});
