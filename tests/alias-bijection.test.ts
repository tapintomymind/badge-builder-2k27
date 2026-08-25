/**
 * Anti-transcription control 1 of 2 (scope.md §3 H7) — SHIP GATE.
 *
 * The generator RELOCATES transcription risk into its abbreviation map rather
 * than removing it: one wrong alias produces a self-consistent, fully-green,
 * systematically WRONG dataset, and the deepEqual test cannot see it. This
 * test pins the map as a bijection onto the canonical 20-value Attr union.
 */

import { describe, expect, it } from "vitest";
import { ATTR_ALIASES } from "../scripts/generate-badges.ts";
import { ATTRS, ATTR_LABELS } from "../src/engine/vocabulary";

const SOURCE_LABELS = [
  "3Pt",
  "Aglty",
  "Ball Hdl",
  "Block",
  "Close",
  "Def Reb",
  "Dr Dunk",
  "Int Def",
  "Layup",
  "Mid",
  "Off Reb",
  "Pass Acc",
  "Per Def",
  "Post Ctrl",
  "SWB",
  "Spd",
  "St Dunk",
  "Steal",
  "Str",
  "Vert",
] as const;

describe("alias-map bijection onto the 20-value Attr union (H7 ship gate)", () => {
  const aliasEntries = Object.entries(ATTR_ALIASES);

  it("has exactly the 20 source labels as keys", () => {
    expect(Object.keys(ATTR_ALIASES).sort()).toEqual([...SOURCE_LABELS].sort());
  });

  it("every alias maps to a DISTINCT Attr (injective)", () => {
    const values = aliasEntries.map(([, attr]) => attr);
    expect(new Set(values).size).toBe(values.length);
  });

  it("every one of the 20 Attr values is reachable from some alias (surjective)", () => {
    const values = new Set<string>(Object.values(ATTR_ALIASES));
    for (const attr of ATTRS) {
      expect(values.has(attr), `Attr "${attr}" is unreachable from any source alias`).toBe(true);
    }
    expect(values.size).toBe(ATTRS.length);
  });

  it("is the exact inverse of the engine's independently-transcribed ATTR_LABELS (two transcriptions, one truth)", () => {
    // ATTR_ALIASES (scripts/) and ATTR_LABELS (src/engine/) were transcribed
    // separately from the seed. If they disagree, one of them is wrong.
    for (const [label, attr] of aliasEntries) {
      expect(ATTR_LABELS[attr], `label "${label}" → attr "${attr}"`).toBe(label);
    }
  });
});
