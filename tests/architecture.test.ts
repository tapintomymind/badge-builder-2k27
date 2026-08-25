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
