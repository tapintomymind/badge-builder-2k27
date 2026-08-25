/**
 * Generator ↔ dataset agreement, and the generator's never-guess posture.
 *
 * The deepEqual test makes the 2K27-launch data refresh a one-file edit with
 * a reviewable diff. NOTE what it does and does not prove: it proves the
 * generator agrees with its own checked-in output — nothing more. The two
 * controls that catch a systematically-wrong-but-self-consistent dataset are
 * tests/alias-bijection.test.ts and tests/spot-check.test.ts (scope.md §3 H7).
 */

import { describe, expect, it } from "vitest";
import { generate, serializeDataset } from "../scripts/generate-badges.ts";
import datasetText from "../src/data/badges.json?raw";
import sourceText from "../src/data/badges.source.txt?raw";

describe("generate(badges.source.txt) vs the checked-in badges.json", () => {
  it("deep-equals the checked-in dataset (a data refresh is: edit source, re-run generator, review diff)", () => {
    expect(generate(sourceText)).toEqual(JSON.parse(datasetText));
  });

  it("serializes byte-for-byte to the checked-in file (no hand edits to badges.json can survive)", () => {
    expect(serializeDataset(generate(sourceText))).toBe(datasetText);
  });
});

describe("the generator never guesses — malformed input throws, always", () => {
  it("throws on an unknown attribute label instead of guessing a canonical attr", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Dunk Rating 60/70/80/90";
    expect(() => generate(line)).toThrowError(/unknown attribute label/);
  });

  it("throws on a threshold count other than 4", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80";
    expect(() => generate(line)).toThrowError(/expected 4 thresholds/);
  });

  it("throws on an unparseable threshold token instead of coercing", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80/9x";
    expect(() => generate(line)).toThrowError(/unparseable threshold token/);
  });

  it("throws on an unrecognized line instead of skipping it", () => {
    expect(() => generate("some stray prose")).toThrowError(/unrecognized line/);
  });

  it("throws when a category header's promised count does not match the badges listed", () => {
    const text = "**Finishing (2):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80/90";
    expect(() => generate(text)).toThrowError(/promises 2 badges but 1/);
  });

  it("max-split-1 on the em dash: a null token inside the attr spec does NOT break the name/attr split (the Unpluckable hazard)", () => {
    const text = "**Playmaking (1):**\n- Fake Badge [A] 5'9–7'4 — Post Ctrl 65/86/96/— OR Ball Hdl 65/80/92/97";
    const dataset = generate(text);
    const badge = dataset.badges[0];
    expect(badge?.name).toBe("Fake Badge");
    expect(badge?.requirements.attrs).toEqual([
      { attr: "postControl", perLevel: [65, 86, 96, null] },
      { attr: "ballHandle", perLevel: [65, 80, 92, 97] },
    ]);
  });
});
