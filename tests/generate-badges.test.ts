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
import enrichmentText from "../src/data/badges.enrichment.source.txt?raw";
import sourceText from "../src/data/badges.source.txt?raw";

/** A minimal one-badge roster + its matching enrichment, for the throw cases. */
const ONE_BADGE = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80/90";
const ONE_ENRICHMENT = "Fake Badge |  | A fake ability";

describe("generate(badges.source.txt, badges.enrichment.source.txt) vs the checked-in badges.json", () => {
  it("deep-equals the checked-in dataset (a data refresh is: edit source, re-run generator, review diff)", () => {
    expect(generate(sourceText, enrichmentText)).toEqual(JSON.parse(datasetText));
  });

  it("serializes byte-for-byte to the checked-in file (no hand edits to badges.json can survive)", () => {
    expect(serializeDataset(generate(sourceText, enrichmentText))).toBe(datasetText);
  });

  it("F4 group 1.1 — all 53 badges carry a non-empty description and a boolean isNew", () => {
    const dataset = generate(sourceText, enrichmentText);
    expect(dataset.badges).toHaveLength(53);
    for (const badge of dataset.badges) {
      expect(badge.description, `${badge.name} has no description`).toBeTruthy();
      expect(typeof badge.isNew, `${badge.name}.isNew is not a boolean`).toBe("boolean");
    }
    expect(dataset.badges.filter((badge) => badge.isNew)).toHaveLength(19);
  });
});

describe("F4 group 1.2 — the enrichment join never guesses either", () => {
  it("throws on a name in the enrichment that is not in the roster", () => {
    expect(() => generate(ONE_BADGE, "Ghost Badge |  | Not in the roster")).toThrowError(
      /which is not a badge in the roster/,
    );
  });

  it("throws on a roster name absent from the enrichment", () => {
    const twoBadges =
      "**Finishing (2):**\n" +
      "- Fake Badge [A] 5'9–7'4 — Close 60/70/80/90\n" +
      "- Other Badge [A] 5'9–7'4 — Close 60/70/80/90";
    expect(() => generate(twoBadges, `${ONE_ENRICHMENT}\nGhost |  | x`)).toThrowError(
      /which is not a badge in the roster/,
    );
  });

  it("throws on a duplicate name in the enrichment", () => {
    expect(() => generate(ONE_BADGE, `${ONE_ENRICHMENT}\n${ONE_ENRICHMENT}`)).toThrowError(
      /duplicate row/,
    );
  });

  it("throws on a field count other than 3", () => {
    expect(() => generate(ONE_BADGE, "Fake Badge | NEW")).toThrowError(
      /must have 3 pipe-delimited fields/,
    );
  });

  it("throws on a NEW token that is neither NEW nor empty", () => {
    expect(() => generate(ONE_BADGE, "Fake Badge | new | x")).toThrowError(
      /NEW token must be "NEW" or empty/,
    );
  });

  it("throws on an empty description instead of defaulting one", () => {
    expect(() => generate(ONE_BADGE, "Fake Badge | NEW | ")).toThrowError(/empty description/);
  });

  it("throws on a row count that does not match the badge count", () => {
    const twoBadges =
      "**Finishing (2):**\n" +
      "- Fake Badge [A] 5'9–7'4 — Close 60/70/80/90\n" +
      "- Other Badge [A] 5'9–7'4 — Close 60/70/80/90";
    expect(() => generate(twoBadges, ONE_ENRICHMENT)).toThrowError(/does not match badge count/);
  });

  it("every join failure carries the never-guess instruction", () => {
    expect(() => generate(ONE_BADGE, "Ghost |  | x")).toThrowError(
      /Never guess — if the source text changed shape, ask the user\./,
    );
  });
});

describe("F4 group 1.3 — parse precedes join", () => {
  it("an unknown attribute label throws ITS OWN error, not a join error", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Dunk Rating 60/70/80/90";
    // The enrichment here is deliberately ALSO broken (wrong name). If the
    // join ran first, this would report the join failure instead.
    expect(() => generate(line, "Ghost Badge |  | x")).toThrowError(/unknown attribute label/);
  });
});

describe("F4 group 4.3 — join shuffle-invariance (the MECHANICAL join control)", () => {
  /**
   * A correct name-keyed join is shuffle-invariant. Any ordinal or positional
   * coupling is not. This fires on a row shift, an index-based pairing, a
   * sort-order dependency, or a map-by-position bug — NONE of which any
   * transcription control can see, and all of which are the SYSTEMATIC
   * failure mode (one wrong pairing implies 52 wrong pairings).
   *
   * It requires no transcription and no discipline, which is exactly why it
   * is here alongside the hand-transcribed control in
   * tests/enrichment-spot-check.test.ts rather than instead of it.
   */
  const reversedEnrichment = enrichmentText
    .split("\n")
    .filter((line) => line.trim() !== "")
    .reverse()
    .join("\n");

  it("reversing the enrichment rows produces a byte-identical dataset", () => {
    expect(serializeDataset(generate(sourceText, reversedEnrichment))).toBe(
      serializeDataset(generate(sourceText, enrichmentText)),
    );
  });

  it("reversing the ROSTER rows within their categories preserves the badge SET", () => {
    // serializeDataset IS order-sensitive (the emitted array follows the
    // source order), so this leg asserts on the SET, not the array — stated
    // here rather than sorted away to make the test pass.
    const blocks: string[][] = [];
    for (const line of sourceText.split("\n")) {
      if (line.trim() === "") continue;
      if (line.startsWith("**")) blocks.push([line]);
      else blocks[blocks.length - 1]?.push(line);
    }
    const reversedSource = blocks
      .map(([header, ...badgeLines]) => [header, ...badgeLines.reverse()].join("\n"))
      .join("\n");
    const shuffled = generate(reversedSource, enrichmentText);
    const straight = generate(sourceText, enrichmentText);
    const key = (badge: { id: string; description: string; isNew: boolean }) =>
      `${badge.id}|${badge.isNew ? "NEW" : ""}|${badge.description}`;
    expect(new Set(shuffled.badges.map(key))).toEqual(new Set(straight.badges.map(key)));
  });
});

describe("the generator never guesses — malformed input throws, always", () => {
  it("throws on an unknown attribute label instead of guessing a canonical attr", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Dunk Rating 60/70/80/90";
    expect(() => generate(line, ONE_ENRICHMENT)).toThrowError(/unknown attribute label/);
  });

  it("throws on a threshold count other than 4", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80";
    expect(() => generate(line, ONE_ENRICHMENT)).toThrowError(/expected 4 thresholds/);
  });

  it("throws on an unparseable threshold token instead of coercing", () => {
    const line = "**Finishing (1):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80/9x";
    expect(() => generate(line, ONE_ENRICHMENT)).toThrowError(/unparseable threshold token/);
  });

  it("throws on an unrecognized line instead of skipping it", () => {
    expect(() => generate("some stray prose", ONE_ENRICHMENT)).toThrowError(/unrecognized line/);
  });

  it("throws when a category header's promised count does not match the badges listed", () => {
    const text = "**Finishing (2):**\n- Fake Badge [A] 5'9–7'4 — Close 60/70/80/90";
    expect(() => generate(text, ONE_ENRICHMENT)).toThrowError(/promises 2 badges but 1/);
  });

  it("max-split-1 on the em dash: a null token inside the attr spec does NOT break the name/attr split (the Unpluckable hazard)", () => {
    const text = "**Playmaking (1):**\n- Fake Badge [A] 5'9–7'4 — Post Ctrl 65/86/96/— OR Ball Hdl 65/80/92/97";
    const dataset = generate(text, ONE_ENRICHMENT);
    const badge = dataset.badges[0];
    expect(badge?.name).toBe("Fake Badge");
    expect(badge?.requirements.attrs).toEqual([
      { attr: "postControl", perLevel: [65, 86, 96, null] },
      { attr: "ballHandle", perLevel: [65, 80, 92, 97] },
    ]);
  });
});
