/**
 * THE ONLY RANDOMNESS IN THE APP, and it is deterministic.
 *
 * `Math.random()` is banned everywhere under `src/engine/` (enforced by
 * `tests/architecture.test.ts` group (f)) because a hidden input makes every
 * determinism test flaky-GREEN, which is the worst kind of green. The roll's
 * reproducibility promise -- this seed, this build, this result, forever -- is
 * only worth the sentence if the stream is a pure function of a string.
 *
 * NO DEPENDENCY. `seedrandom` is 2 KB and the reasoning feels harmless, which
 * is exactly why runtime `dependencies` staying `{react, react-dom}` is a
 * stop-and-report rather than a judgment call [scope.md 0.1 A1 precedent].
 * xmur3 and mulberry32 are ~20 lines together and are written here as the
 * CANONICAL PUBLISHED ALGORITHMS, not improvised variants: `createRng`'s first
 * ten outputs are checked in as a golden vector (INV-1b) so a future refactor
 * cannot silently invalidate every historical seed.
 */

import { EmptyCandidateSetError } from "./errors";

/** A deterministic uint32 source. */
export interface Rng {
  nextUint32(): number;
}

/** xmur3 -- the canonical string-to-seed hash. Returns a stateful 32-bit source. */
function xmur3(seedString: string): () => number {
  let h = 1779033703 ^ seedString.length;
  for (let index = 0; index < seedString.length; index += 1) {
    h = Math.imul(h ^ seedString.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 -- the canonical 32-bit PRNG. Same seed, same stream, forever. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** The seam every roll draws from. Same string, same stream, forever. */
export function createRng(seedString: string): Rng {
  const next = mulberry32(xmur3(seedString)());
  return { nextUint32: next };
}

/**
 * Uniform selection from a non-empty array.
 *
 * REJECTION-SAMPLED, never `% n`. Plain modulo is biased whenever `n` does not
 * divide 2^32 -- the low residues get one extra representative each -- and a
 * candidate set of 7 or 11 is completely ordinary here. The bias would be
 * small, systematic and invisible: exactly the shape of defect the whole
 * quality-blindness argument exists to rule out.
 *
 * `n === 1` short-circuits and consumes ZERO draws. That is PINNED, not
 * incidental: "no choice means no randomness consumed" is what keeps a roll
 * reproducible when a category's candidate set happens to collapse to one.
 *
 * An empty array THROWS. A caller that reaches here with nothing to pick has a
 * bug, and a silent `undefined` is precisely the H6 silent-wrong shape.
 */
export function pickUniform<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new EmptyCandidateSetError();
  if (items.length === 1) return items[0] as T;
  const n = items.length;
  // The largest multiple of n that fits in a uint32. Draws at or above it are
  // rejected, which makes every residue class exactly equally likely.
  const limit = Math.floor(0x100000000 / n) * n;
  let draw = rng.nextUint32();
  while (draw >= limit) draw = rng.nextUint32();
  return items[draw % n] as T;
}

/** Canonical serialization: sorted object keys, fixed array order, so two
 * structurally equal inputs always digest identically regardless of how they
 * were built. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

/**
 * A 64-bit (2 x xmur3) stable digest of a canonically-serialized value, base36.
 *
 * 64 bits is honestly 64 bits. For an audience of one comparing a handful of
 * tokens the collision risk is nil, and the digest's job is to say "your inputs
 * changed, this seed will not reproduce that roll" -- a false negative there is
 * a MISSED WARNING, not a wrong result.
 */
export function stableDigest(value: unknown): string {
  const canonical = canonicalize(value);
  const high = xmur3(canonical)();
  const low = xmur3(`${canonical} salt`)();
  return `${high.toString(36)}${low.toString(36).padStart(7, "0")}`;
}
