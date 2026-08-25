/**
 * H1 vocabulary lint. The bare token "slot" is BANNED in identifiers and
 * user-visible copy: per-category capacity is `equipSlots` ("Badge Slots"),
 * the 8 fuse/reaction pairs are `synergySlots` ("Synergy Slots").
 *
 * The lint greps src/**\/*.{ts,tsx} (comments stripped — code and string copy
 * are what ship) for the banned bare identifiers `slot` / `slots` /
 * `slotCount` / `numSlots` standing alone, i.e. not embedded in an
 * equip-/synergy-prefixed compound like `equipSlots` or `SynergySlotId`
 * (word-boundary matching gives compounds a pass; the banned four never have
 * a qualifying prefix by construction).
 *
 * THE CANARY REQUIREMENT: a lint that cannot fail on its own canary is worse
 * than no lint. The positive canaries below are strings that SHOULD fail the
 * regex, asserted to fail.
 */

import { describe, expect, it } from "vitest";
import { srcSources, stripComments } from "./helpers/test-utils";

/** Bare slot-word identifiers and copy. Word boundaries mean equipSlots /
 * synergySlots / SynergySlotId / plusTwoSlotIds (interior, prefixed
 * compounds) do NOT match; the lookbehinds permit the two CANONICAL
 * user-visible copy forms — "Badge Slots" and "Synergy Slots" (H1 table). */
const BANNED = /(?<!badge )(?<!synergy )\b(?:slots?|slot_?count|num_?slots)\b/i;

describe("H1 vocabulary lint: bare `slot` banned in src/**", () => {
  const files = Object.keys(srcSources);

  it("scans a non-trivial set of source files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} has no bare slot identifiers or copy`, () => {
      const code = stripComments(srcSources[file] as string);
      const match = BANNED.exec(code);
      expect(
        match,
        `bare "${match?.[0]}" found — use equipSlots ("Badge Slots") or synergySlots ("Synergy Slots")`,
      ).toBeNull();
    });
  }

  it("POSITIVE CANARY: strings that SHOULD fail the regex do fail it", () => {
    // If any of these stops matching, the lint has gone self-bypassing and is
    // worse than no lint (memory/lessons-learned.md 2026-05-19).
    expect(BANNED.test("const slotCount = 3;")).toBe(true);
    expect(BANNED.test("const numSlots = 5;")).toBe(true);
    expect(BANNED.test("build.slots = 2")).toBe(true);
    expect(BANNED.test('label = "3 slots remaining"')).toBe(true);
    expect(BANNED.test("interface Slot {}")).toBe(true);
  });

  it("negative canary: the canonical prefixed vocabulary passes", () => {
    expect(BANNED.test("const equipSlots = 3;")).toBe(false);
    expect(BANNED.test("const equipSlotsUsed = 2;")).toBe(false);
    expect(BANNED.test("const synergySlots: SynergySlot[] = [];")).toBe(false);
    expect(BANNED.test("type X = SynergySlotId;")).toBe(false);
    expect(BANNED.test('copy = "Badge Slots 2/3"')).toBe(false);
    expect(BANNED.test('copy = "Synergy Slot 5 · Permanent · +2"')).toBe(false);
  });
});
