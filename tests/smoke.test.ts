import { describe, expect, it } from "vitest";

/**
 * Trivial smoke test. Its only job is to prove the toolchain is wired:
 * TypeScript compiles, Vitest discovers `tests/**`, and the runner exits 0.
 *
 * Real coverage — the data-integrity assertions and the engine suite — arrives
 * with the first implementation milestone.
 */
describe("toolchain smoke", () => {
  it("runs a test and evaluates TypeScript", () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 2)).toBe(4);
  });
});
