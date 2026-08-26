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
 *
 * F8-E3 adds no module: `exchangeSteps` lives in `steps.ts` and the walk in
 * `randomize.ts`, both already listed. A NAMED LIST only protects what someone
 * remembered to name, so the drift guard below asserts the coverage instead of
 * assuming it — put the roll's machinery in a new file and this group reddens.
 */
const PURE_ENGINE_MODULES = [
  "/src/engine/steps.ts",
  "/src/engine/summary.ts",
  "/src/engine/summary-text.ts",
  // F8-E2 appended these two rather than adding a second group. `random.ts` is
  // the point of the whole rule: the seeded PRNG is the ONLY randomness, and
  // `crypto` is banned here precisely because seed GENERATION is the UI's job.
  "/src/engine/random.ts",
  "/src/engine/randomize.ts",
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

  it("DRIFT GUARD: every module carrying the roll's machinery is ON the pure list", () => {
    // The roll's whole surface: the two enumerators, the selection primitive
    // and the walk. Whichever files hold them must be covered by the group
    // above, or a future slice moves one out and quietly loses the lint.
    const MACHINERY = ["exchangeSteps", "legalSteps", "pickUniform", "rollIterationBound"];
    for (const token of MACHINERY) {
      const carriers = engineFiles.filter((file) =>
        new RegExp(`(?:export (?:function|const)|function) ${token}\\b`).test(
          stripComments(srcSources[file] as string),
        ),
      );
      expect(carriers.length, `no engine module defines ${token}`).toBeGreaterThan(0);
      for (const file of carriers) {
        expect(
          PURE_ENGINE_MODULES.includes(file),
          `${file} defines ${token} but is not on PURE_ENGINE_MODULES`,
        ).toBe(true);
      }
    }
  });

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

/* ------------------------------------------- A6: Cap Breakers containment (g) -- */

/**
 * A6-R2's containment ruling, mechanised — and the reason it is not style.
 *
 * `BuildPanel` passes `build.attributes` down to `AttributeGrid`, whose
 * slider renders a value and, on commit, calls back with the value it is
 * showing. So if an EFFECTIVE value ever reaches that component, the next
 * nudge of any touched slider writes the cap-broken number over the user's
 * entered one: they typed 60, see 83, nudge, and 60 is gone — no error, no
 * banner, no undo, green suite. That is the worst defect shape this project
 * has (the four before it REFUSED data; this one REWRITES it), and these
 * lints are one of its three independent binders
 * [engine-data-design §3.4 · scope.md §0.1 A6-R6].
 *
 * BRIEF ↔ CODE DIVERGENCE, REPORTED RATHER THAN SILENTLY WEAKENED — the same
 * disclosure the `MATH_RANDOM_ALLOWLIST` above makes about its own rule.
 * A6-R9 test 2.1 asks for `capBrokenAttributes` in EXACTLY ONE `src/` file.
 * It cannot be one, and the two extra sites are structural rather than
 * sloppy: `types.ts` must DECLARE the field, and `serialization.ts` must name
 * the wire KEY on an untyped JSON record before any `Build` exists to read it
 * through. Neither is a second read path — the ruling that actually matters
 * ("one composition point, and no component may reach it") is enforced whole
 * by the allowlist below plus the `.tsx` ban. Expressed as an EXPLICIT
 * ALLOWLIST with a why per entry, not as a blanket rule that cannot pass.
 */
const CAP_BROKEN_ALLOWLIST: Record<string, string> = {
  "/src/engine/attributes.ts":
    "THE one composition point — the only file that READS the field (A6-R2)",
  "/src/engine/types.ts": "the field's DECLARATION; declaring is not reading",
  "/src/engine/serialization.ts":
    "the wire KEY on an untyped JSON record, at the boundary where no Build exists yet",
};

describe("architecture: Cap Breakers containment (g)", () => {
  it("2.1 capBrokenAttributes appears ONLY in the explicit allowlist", () => {
    const namers = srcFiles.filter((file) =>
      stripComments(srcSources[file] as string).includes("capBrokenAttributes"),
    );
    expect(namers.sort()).toEqual(Object.keys(CAP_BROKEN_ALLOWLIST).sort());
  });

  it("2.1b every allowlist entry still exists and still names the field", () => {
    // An allowlist that outlives its entries silently stops protecting
    // anything — the drift guard the Math.random group learned to want.
    for (const [file, why] of Object.entries(CAP_BROKEN_ALLOWLIST)) {
      const source = srcSources[file];
      expect(source, `${file} is on the A6 allowlist but does not exist`).toBeDefined();
      expect(
        stripComments(source as string).includes("capBrokenAttributes"),
        `${file} no longer names capBrokenAttributes — drop it from the allowlist (${why})`,
      ).toBe(true);
    }
  });

  it("2.1c NO .tsx file references capBrokenAttributes or effectiveAttribute", () => {
    // THE DATA-DESTRUCTION BINDER. A component may only ever hold the ENTERED
    // record. A6-U relaxes this to the one control file, BY NAME — never by
    // deleting the rule.
    const componentFiles = srcFiles.filter((file) => file.endsWith(".tsx"));
    expect(componentFiles.length).toBeGreaterThan(10);
    for (const file of componentFiles) {
      const code = stripComments(srcSources[file] as string);
      for (const forbidden of ["capBrokenAttributes", "effectiveAttribute"]) {
        expect(
          code.includes(forbidden),
          `${file} references ${forbidden} — a component must only ever hold the ` +
            "ENTERED record, or the next slider commit overwrites the user's own number",
        ).toBe(false);
      }
    }
  });

  it("2.2 src/engine/eligibility.ts contains ZERO `.attributes[`", () => {
    // The gate cannot read the entered value even by accident.
    const code = stripComments(srcSources["/src/engine/eligibility.ts"] as string);
    expect(code.includes(".attributes["), "the gate can still reach the entered value").toBe(
      false,
    );
    expect(code.includes("effectiveAttribute("), "the gate does not use the composed value").toBe(
      true,
    );
  });

  it("2.3 POSITIVE CANARY: the pattern catches what it claims to", () => {
    // A lint that cannot fail on its own canary is worse than no lint.
    const GATE = ".attributes[";
    expect("return build.attributes[line.attr] >= threshold;".includes(GATE)).toBe(true);
    expect("return effectiveAttribute(build, line.attr) >= threshold;".includes(GATE)).toBe(
      false,
    );
    // …and the .tsx ban really does fire on the hazard it exists to stop.
    expect("<AttributeGrid attributes={effectiveAttributes} />".includes("effectiveAttribute")).toBe(
      true,
    );
    expect("<AttributeGrid attributes={build.attributes} />".includes("effectiveAttribute")).toBe(
      false,
    );
  });
});

/* -------------------------------- A6 SHIP GATE 1.6: never invent 2K27 data -- */

/**
 * The cap-breaker COUNT → per-attribute BOOST mapping is published NOWHERE.
 * 5 cap breakers took the user's Three-Point 60 → 83: not +1 each, not evenly
 * divided, and varying by attribute and by build. Computing it — a constant, a
 * table, an interpolation, a per-attribute formula, at ANY level of
 * indirection — is a direct violation of the seed's #1 non-negotiable, and
 * would put a plausible-looking invented number on screen, which is this
 * project's named cardinal failure shape. SHIP GATE [scope.md §0.1 A6-R9 1.6].
 */
const COUNT_TO_BOOST_VOCABULARY =
  /per[_-]?breaker|breakers?[_-]?boost|boost[_-]?per|BOOST_PER|breakers?[_-]?to[_-]?(?:boost|value)|capBreakerCount|breakerCount/i;

function stripStringLiterals(code: string): string {
  return code
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

describe("architecture: A6 SHIP GATE 1.6 — no invented cap-breaker arithmetic", () => {
  it("no file under src/ carries count → boost mapping vocabulary", () => {
    for (const file of srcFiles) {
      const code = stripComments(srcSources[file] as string);
      const match = COUNT_TO_BOOST_VOCABULARY.exec(code);
      expect(
        match,
        `"${match?.[0]}" found in ${file} — the cap-breaker → boost mapping is UNPUBLISHED ` +
          "and may never be computed, derived, tabulated or interpolated",
      ).toBeNull();
    }
  });

  it("src/engine/attributes.ts performs NO arithmetic at all", () => {
    // The composition point SELECTS a value (Math.max); it never computes
    // one. No operator and no numeric literal but the `?? 0` floor can exist
    // here, so there is nowhere for a boost figure to hide.
    const code = stripStringLiterals(
      stripComments(srcSources["/src/engine/attributes.ts"] as string),
    );
    for (const operator of ["+", "-", "*", "/", "%"]) {
      expect(
        code.includes(operator),
        `"${operator}" found in attributes.ts — the composition point selects, never computes`,
      ).toBe(false);
    }
    const literals = [...code.matchAll(/\b\d+(?:\.\d+)?\b/g)].map((match) => match[0]);
    expect(
      [...new Set(literals)].sort(),
      "a numeric literal other than the `?? 0` floor appeared in the composition point",
    ).toEqual(["0"]);
  });

  it("POSITIVE CANARY: the 1.6 pattern catches what it claims to", () => {
    expect(COUNT_TO_BOOST_VOCABULARY.test("const BOOST_PER_BREAKER = 4.6;")).toBe(true);
    expect(COUNT_TO_BOOST_VOCABULARY.test("const perBreakerBoost = delta / count;")).toBe(true);
    expect(COUNT_TO_BOOST_VOCABULARY.test("function breakersToBoost(n: number) {}")).toBe(true);
    expect(COUNT_TO_BOOST_VOCABULARY.test("const capBreakerCount = 5;")).toBe(true);
    // …and does NOT fire on A6's own shipped, count-free vocabulary.
    expect(COUNT_TO_BOOST_VOCABULARY.test("export type CapBreakerStrategy = 'manual';")).toBe(
      false,
    );
    expect(
      COUNT_TO_BOOST_VOCABULARY.test("const DEFAULT_CAP_BREAKER_STRATEGY = 'manual';"),
    ).toBe(false);
    expect(COUNT_TO_BOOST_VOCABULARY.test("build.capBrokenAttributes?.[attr]")).toBe(false);
    expect(COUNT_TO_BOOST_VOCABULARY.test("export function deriveCapBrokenAttributes()")).toBe(
      false,
    );
  });
});
