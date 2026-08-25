/**
 * Architecture tripwires (tech-strategy.md §2, §5, §9). These mechanize the
 * seed's working agreements: engine/UI separation, no backend, no network
 * egress, no runtime filesystem access.
 */

import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { srcSources, stripComments } from "./helpers/test-utils";

const srcFiles = Object.keys(srcSources);
const engineFiles = srcFiles.filter((file) => file.startsWith("/src/engine/"));

function importSpecifiersOf(code: string): string[] {
  return [...code.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] as string,
  );
}

describe("architecture: engine purity (a)", () => {
  it("scans a non-trivial engine", () => {
    expect(engineFiles.length).toBeGreaterThan(4);
  });

  for (const file of engineFiles) {
    it(`${file} imports nothing from src/ui/ and nothing from react`, () => {
      const code = stripComments(srcSources[file] as string);
      for (const specifier of importSpecifiersOf(code)) {
        expect(
          /(^|\/)ui(\/|$)/.test(specifier),
          `${file} imports "${specifier}" — the engine must not import from src/ui/`,
        ).toBe(false);
        expect(
          specifier === "react" ||
            specifier.startsWith("react/") ||
            specifier === "react-dom" ||
            specifier.startsWith("react-dom/"),
          `${file} imports "${specifier}" — the engine must not import react`,
        ).toBe(false);
      }
    });
  }
});

describe("architecture: runtime dependency allowlist (b)", () => {
  it("package.json dependencies are a subset of {react, react-dom}", () => {
    const dependencies = Object.keys(packageJson.dependencies ?? {});
    for (const dependency of dependencies) {
      expect(
        ["react", "react-dom"],
        "runtime dependencies must stay exactly {react, react-dom} — anything " +
          "else (a network client, an SDK, a UI kit) is an escalation, not an install",
      ).toContain(dependency);
    }
  });
});

describe("architecture: zero network egress (c)", () => {
  for (const file of srcFiles) {
    it(`${file} contains no fetch / XMLHttpRequest / WebSocket`, () => {
      const code = stripComments(srcSources[file] as string);
      const match = /\b(?:fetch|XMLHttpRequest|WebSocket)\b/.exec(code);
      expect(
        match,
        `"${match?.[0]}" found — this app has zero outbound network by design`,
      ).toBeNull();
    });
  }
});

describe("architecture: position-height access route (e)", () => {
  // scope.md §0.1 A2 / impl-brief F3: the engine's positionHeightRange() is
  // the ONLY route by which the UI may learn a height range. No file outside
  // src/engine/ (src/data/ itself excepted) may import the data module — a
  // component holding a copy of the table is a rule in the view layer.
  const nonEngineFiles = srcFiles.filter(
    (file) => !file.startsWith("/src/engine/") && !file.startsWith("/src/data/"),
  );

  it("scans the UI layer", () => {
    expect(nonEngineFiles.length).toBeGreaterThan(10);
  });

  for (const file of nonEngineFiles) {
    it(`${file} does not import src/data/position-heights`, () => {
      const code = stripComments(srcSources[file] as string);
      for (const specifier of importSpecifiersOf(code)) {
        expect(
          specifier.includes("position-heights"),
          `${file} imports "${specifier}" — the UI must learn height ranges ` +
            "ONLY through the engine's positionHeightRange() accessor",
        ).toBe(false);
      }
    });
  }
});

describe("architecture: no runtime filesystem access (d)", () => {
  // scripts/generate-badges-cli.ts is the ONE build-time fs consumer in the
  // repo, and it is exempt by location. Nothing under src/ may touch fs.
  for (const file of srcFiles) {
    it(`${file} has no fs / path imports and no process.cwd()`, () => {
      const code = stripComments(srcSources[file] as string);
      for (const specifier of importSpecifiersOf(code)) {
        expect(
          ["fs", "node:fs", "fs/promises", "node:fs/promises", "path", "node:path"],
          `${file} imports "${specifier}" — src/ is bundled, browser-only code`,
        ).not.toContain(specifier);
      }
      expect(code.includes("process.cwd("), "process.cwd() found under src/").toBe(false);
    });
  }
});

/* ------------------------------------------------- F8-E1: engine purity (f) -- */

/**
 * INV-2 — the engine reads no clock, no DOM and no ambient randomness.
 *
 * Scoped to a NAMED LIST rather than all of `src/engine/**` on purpose:
 * `serialization.ts` takes `savedAt: string = new Date().toISOString()` as an
 * explicit, injectable default, and a blanket clock ban would redden correct
 * shipped code. F8-E2 appends `random.ts` and `randomize.ts` to this list —
 * it does NOT duplicate the group and does NOT touch groups (a)–(e).
 */
const PURE_ENGINE_MODULES = [
  "/src/engine/steps.ts",
  "/src/engine/summary.ts",
  "/src/engine/summary-text.ts",
];

/**
 * The ONE place under `src/` allowed to call `Math.random`, named so a new one
 * anywhere reddens loudly.
 *
 * The brief asks for `Math.random` to appear NOWHERE under `src/**`. It
 * already does — `local-storage.ts` mints build ids with it — and that call is
 * correct: a persisted id SHOULD be unpredictable, it is not engine code, and
 * `src/persist/**` is a denied path in this slice. So the ban is expressed as
 * an EXPLICIT ALLOWLIST instead of a blanket rule that cannot pass: the engine
 * is unconditionally forbidden, and every non-engine occurrence must be
 * listed here on purpose. Reported as a brief↔code divergence rather than
 * silently weakened.
 */
const MATH_RANDOM_ALLOWLIST = ["/src/persist/local-storage.ts"];

describe("architecture: engine purity (f) — no clock, no DOM, no ambient randomness", () => {
  const FORBIDDEN = /\b(?:Math\.random|crypto|window|document|new Date\(|Date\.now\()/;

  for (const file of PURE_ENGINE_MODULES) {
    it(`${file} reads no clock, no DOM and no ambient randomness`, () => {
      const source = srcSources[file];
      expect(source, `${file} is missing — the F8-E1 module set changed`).toBeDefined();
      const code = stripComments(source as string);
      const match = FORBIDDEN.exec(code);
      expect(
        match,
        `"${match?.[0]}" found in ${file} — the engine is pure and I/O-free, and a hidden ` +
          "input here makes every determinism test flaky-green",
      ).toBeNull();
    });
  }

  it("NO file under src/engine/ calls Math.random — the seeded PRNG is the only source", () => {
    for (const file of engineFiles) {
      const code = stripComments(srcSources[file] as string);
      expect(code.includes("Math.random"), `${file} calls Math.random`).toBe(false);
    }
  });

  it("every Math.random under src/ is on the explicit allowlist", () => {
    const callers = srcFiles.filter((file) =>
      stripComments(srcSources[file] as string).includes("Math.random"),
    );
    expect(callers.sort()).toEqual([...MATH_RANDOM_ALLOWLIST].sort());
  });

  it("POSITIVE CANARY: the forbidden pattern really does catch what it claims to", () => {
    // A lint that cannot fail on its own canary is worse than no lint.
    expect(FORBIDDEN.test("const x = Math.random();")).toBe(true);
    expect(FORBIDDEN.test("const t = Date.now();")).toBe(true);
    expect(FORBIDDEN.test("const d = new Date();")).toBe(true);
    expect(FORBIDDEN.test("window.location")).toBe(true);
    expect(FORBIDDEN.test("document.body")).toBe(true);
    expect(FORBIDDEN.test("crypto.getRandomValues(a)")).toBe(true);
    // …and does not fire on the vocabulary the pure modules legitimately use.
    expect(FORBIDDEN.test("const dataVersion = dataset.dataVersion;")).toBe(false);
    expect(FORBIDDEN.test("const rows = summary.categories;")).toBe(false);
  });
});
