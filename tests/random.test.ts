/**
 * F8-E2 — `src/engine/random.ts`. INV-1b (the PRNG golden vector) and INV-10
 * (pickUniform is unbiased).
 *
 * INV-10 is worth the 60,000 draws. `% n` is biased for every n that does not
 * divide 2^32, and the bias is small, systematic and completely invisible in
 * ordinary use — the exact shape of defect the quality-blindness argument
 * exists to rule out. A test that only checked "it returns one of the items"
 * would pass against a biased picker forever.
 */

import { describe, expect, it } from "vitest";
import { EmptyCandidateSetError } from "../src/engine/errors";
import { createRng, pickUniform, stableDigest } from "../src/engine/random";

describe("INV-1b — the PRNG golden vector", () => {
  it("createRng('badge-builder') produces the checked-in stream", () => {
    // If this array ever has to change, EVERY HISTORICAL SEED IS INVALIDATED.
    // That is the point of pinning it: the change becomes a decision with a
    // visible diff, not a silent consequence of "tidying up" the hash.
    const rng = createRng("badge-builder");
    const first10 = Array.from({ length: 10 }, () => rng.nextUint32());
    expect(first10).toEqual([
      970862100, 723468513, 3366361262, 3485145008, 814780240,
      1445049048, 978648718, 1859069169, 3355951680, 4071567883,
    ]);
  });

  it("every output is a uint32", () => {
    const rng = createRng("range check");
    for (let draw = 0; draw < 2000; draw += 1) {
      const value = rng.nextUint32();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("the same seed string replays exactly; a different one diverges", () => {
    const a = Array.from({ length: 50 }, () => createRng("same").nextUint32());
    expect(a.every((value) => value === a[0])).toBe(true); // fresh Rng each time
    const one = createRng("seed-A");
    const two = createRng("seed-A");
    const three = createRng("seed-B");
    const streamOne = Array.from({ length: 50 }, () => one.nextUint32());
    const streamTwo = Array.from({ length: 50 }, () => two.nextUint32());
    const streamThree = Array.from({ length: 50 }, () => three.nextUint32());
    expect(streamOne).toEqual(streamTwo);
    expect(streamOne).not.toEqual(streamThree);
  });

  it("a one-character seed change produces a completely different stream", () => {
    const near = Array.from({ length: 10 }, (_unused, index) => {
      const rng = createRng(`seed-${index}`);
      return rng.nextUint32();
    });
    expect(new Set(near).size).toBe(near.length);
  });
});

describe("INV-10 — pickUniform is unbiased, and rejection-sampled", () => {
  it("3-way over 60,000 draws: every bucket within ±1.5%", { timeout: 20000 }, () => {
    const items = ["a", "b", "c"] as const;
    const rng = createRng("uniform-3");
    const counts = new Map<string, number>(items.map((item) => [item, 0]));
    const draws = 60000;
    for (let i = 0; i < draws; i += 1) {
      const picked = pickUniform(rng, items);
      counts.set(picked, (counts.get(picked) as number) + 1);
    }
    for (const item of items) {
      const share = (counts.get(item) as number) / draws;
      expect(Math.abs(share - 1 / 3), `bucket ${item} share ${share}`).toBeLessThan(0.015);
    }
  });

  it("7-way over 60,000 draws: every bucket within ±1.5%", { timeout: 20000 }, () => {
    // 7 does not divide 2^32, so a `% n` picker fails to be uniform here in
    // principle. The rejection sampler makes every residue exactly equal.
    const items = [0, 1, 2, 3, 4, 5, 6];
    const rng = createRng("uniform-7");
    const counts = new Array<number>(items.length).fill(0);
    const draws = 60000;
    for (let i = 0; i < draws; i += 1) {
      const index = pickUniform(rng, items);
      counts[index] = (counts[index] as number) + 1;
    }
    for (const [index, count] of counts.entries()) {
      const share = count / draws;
      expect(Math.abs(share - 1 / 7), `bucket ${index} share ${share}`).toBeLessThan(0.015);
    }
  });

  it("n === 1 consumes ZERO draws — pinned, not incidental", () => {
    const control = createRng("zero-draw");
    const subject = createRng("zero-draw");
    for (let i = 0; i < 20; i += 1) {
      expect(pickUniform(subject, ["only"])).toBe("only");
    }
    // The subject's stream must be untouched by twenty single-item picks.
    expect(subject.nextUint32()).toBe(control.nextUint32());
  });

  it("an empty array THROWS — never a silent undefined (H6)", () => {
    const rng = createRng("empty");
    expect(() => pickUniform(rng, [])).toThrowError(EmptyCandidateSetError);
  });

  it("the rejection loop terminates for every arity from 1 to 64", () => {
    const rng = createRng("arity sweep");
    for (let n = 1; n <= 64; n += 1) {
      const items = Array.from({ length: n }, (_unused, index) => index);
      const picked = pickUniform(rng, items);
      expect(items).toContain(picked);
    }
  });
});

describe("stableDigest — canonical, order-insensitive on keys, order-SENSITIVE on arrays", () => {
  it("two structurally equal values digest identically regardless of key order", () => {
    expect(stableDigest({ a: 1, b: [2, 3], c: { d: 4 } })).toBe(
      stableDigest({ c: { d: 4 }, b: [2, 3], a: 1 }),
    );
  });

  it("array order is meaningful — a reordered loadout is a DIFFERENT input", () => {
    expect(stableDigest([1, 2])).not.toBe(stableDigest([2, 1]));
  });

  it("any change to the value changes the digest", () => {
    const base = { build: { heightInches: 78 }, pins: {} };
    const digests = new Set([
      stableDigest(base),
      stableDigest({ ...base, build: { heightInches: 79 } }),
      stableDigest({ ...base, pins: { x: "exact" } }),
    ]);
    expect(digests.size).toBe(3);
  });

  it("null and undefined members do not collapse into each other", () => {
    expect(stableDigest({ a: null })).not.toBe(stableDigest({ a: 0 }));
    expect(stableDigest([null])).not.toBe(stableDigest([]));
  });
});
