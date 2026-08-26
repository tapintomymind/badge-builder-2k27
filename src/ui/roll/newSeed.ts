/**
 * newSeed — the roll's seed generator (impl-brief F8-R2 §1(e)).
 *
 * UI-OWNED BECAUSE IT IS NONDETERMINISTIC. `src/engine/**` is a pure,
 * reproducible surface and `crypto` is banned there: an engine that can reach a
 * randomness source cannot be replayed from its inputs, and replay is the whole
 * contract `ReproducibilityToken` exists to carry. Seed CONSUMPTION is the
 * engine's (`RollRequest.seed`); seed CREATION is the caller's, and this is the
 * caller.
 *
 * FORMAT: `XXXX-XXXX`, uppercase hex, one dash. 32 bits of entropy — chosen to
 * be TRANSCRIBABLE rather than unguessable. Nothing here is a secret; the seed
 * exists so a user can write it down, type it back, and get the same build. A
 * UUID would be more entropy and strictly worse at the only job this string
 * has. The dash is a grouping aid for exactly that reason.
 *
 * `crypto.getRandomValues` is native in every browser this app targets and in
 * jsdom, so there is no dependency and no fallback branch to keep honest.
 */

/** Uppercase hex, `XXXX-XXXX`. */
export function newSeed(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}
