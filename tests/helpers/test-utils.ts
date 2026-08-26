/**
 * Shared test helpers.
 *
 * File access rides Vite's own typed facilities (`import.meta.glob`, `?raw`
 * imports) rather than node:fs, so the whole repo typechecks against browser
 * types with zero Node ambient types — the ONLY fs consumer anywhere is
 * scripts/generate-badges-cli.ts (tech-strategy.md §9).
 */

import type { Build } from "../../src/engine/types";
import type { Attr } from "../../src/engine/vocabulary";
import { ATTRS } from "../../src/engine/vocabulary";

/**
 * Every TypeScript source file under src/, keyed by root-relative path
 * ("/src/engine/cost.ts" → file contents). Eager raw glob: resolved at
 * transform time by Vite, available synchronously to lint-style tests.
 */
export const srcSources = import.meta.glob("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Strips // and /* *​/ comments so lints inspect identifiers and strings
 * (code + user-visible copy), not prose documentation. */
export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/** The css block for one selector heading (naive but stable: from the
 * selector to its closing brace). */
export function cssBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

/**
 * A Build with every attribute at `value` (override per-attribute as needed).
 *
 * [A6] `capBroken` is the ONE optional param cap breakers add. It is OMITTED
 * from the returned object when not supplied — not set to `{}`, not set to
 * `undefined` — so every pre-A6 call site keeps producing a byte-identical
 * `Build` and the "absent key" shape (the normal state of every build with no
 * cap breaker) is what the existing 1200-odd assertions keep exercising. That
 * every one of those call sites still compiles untouched is the direct
 * dividend of A6-R5's optionality ruling.
 */
export function makeBuild(
  heightInches: number,
  value: number,
  overrides: Partial<Record<Attr, number>> = {},
  capBroken?: Partial<Record<Attr, number>>,
): Build {
  const attributes = Object.fromEntries(ATTRS.map((attr) => [attr, value])) as Record<
    Attr,
    number
  >;
  return {
    heightInches,
    attributes: { ...attributes, ...overrides },
    ...(capBroken === undefined ? {} : { capBrokenAttributes: capBroken }),
  };
}
