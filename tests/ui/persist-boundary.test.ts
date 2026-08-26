/**
 * Persistence boundary lint (tech-strategy §2, scope.md §2 M3 NB-2):
 * `src/persist/` is the ONLY module in the codebase permitted to touch
 * `window.localStorage`. Everything else — components included — goes
 * through its wrapped, typed API, which is what makes the "no silent
 * autosave failure" mandate enforceable at exactly one point.
 */

import { describe, expect, it } from "vitest";
import { srcSources, stripComments } from "../helpers/test-utils";

describe("persistence boundary: localStorage only inside src/persist/", () => {
  const files = Object.keys(srcSources);

  it("scans a non-trivial set of source files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    if (file.startsWith("/src/persist/")) continue;
    it(`${file} does not touch localStorage`, () => {
      const code = stripComments(srcSources[file] as string);
      expect(
        /\blocalStorage\b/.test(code),
        `localStorage found in ${file} — all storage I/O goes through src/persist/`,
      ).toBe(false);
    });
  }

  it("positive canary: the lint regex matches a violation", () => {
    expect(/\blocalStorage\b/.test("window.localStorage.setItem('k', 'v')")).toBe(true);
  });

  it("src/persist/local-storage.ts exists and touches localStorage", () => {
    const persist = srcSources["/src/persist/local-storage.ts"];
    expect(persist).toBeDefined();
    expect(/\blocalStorage\b/.test(stripComments(persist as string))).toBe(true);
  });
});
