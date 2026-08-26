/**
 * CONSOLE GUARD — a `console.error` / `console.warn` during a test fails it.
 *
 * Wired via `test.setupFiles` in vite.config.ts and run before EVERY test file,
 * so the guard is suite-wide rather than something each new UI test has to
 * remember to opt into.
 *
 * WHY THIS EXISTS. React reports render-integrity defects on the console and
 * NOWHERE else: duplicate/missing `key`s, invalid DOM nesting, state updates
 * outside `act()`, bad prop types. None of them throw, so a test that asserts
 * on rendered output passes while React is complaining underneath. That is not
 * hypothetical here — a duplicate-key defect in src/ui/synergy/SynergyBoard.tsx
 * (all eight <td> cells in a row keyed by the ROLE, not by the Synergy Slot id)
 * survived the whole F11 slice and its 23-test suite, and only surfaced under a
 * cold Vite cache with CPU contention. Fixed in e2a1fbb; this file is the
 * mechanical guard that makes the class non-recurring.
 *
 * ORDERING. This file is listed BEFORE tests/setup-dom.ts in `setupFiles`, and
 * vitest's default `sequence.hooks: "stack"` runs `afterEach` in REVERSE
 * registration order. So the guard's `beforeEach` installs first (before any
 * test-file `beforeEach`) and its `afterEach` asserts last — after React
 * Testing Library's `cleanup()` unmounts, which is where unmount-time warnings
 * are emitted. Both ends of the test are covered.
 *
 * COMPOSITION WITH LOCAL SPIES. `install()` captures whatever `console.error`
 * is CURRENTLY bound and forwards to it, and `uninstall()` puts that same
 * function back. A file that mocks the console in its own `beforeEach` (e.g.
 * tests/ui/recovery-boundary.test.tsx, which silences the boundary's own
 * logging) therefore sits ON TOP of the guard: the guard sees nothing, the test
 * keeps its explicit local assertion, and nothing stacks or leaks between
 * tests. That is deliberate — a local spy is a visible, reviewable opt-out.
 * A blanket suppression in THIS file would not be.
 *
 * `console.log` / `.info` / `.debug` are untouched: tests/randomize.test.ts
 * prints invariant tables on purpose and those are diagnostics, not defects.
 *
 * KNOWN BLIND SPOTS, both outside the beforeEach/afterEach window:
 *   - Anything logged at module-import time or from `beforeAll`. React's render
 *     warnings are not in that class — they fire during render/commit inside a
 *     test body — so this does not weaken the guarantee that matters.
 *   - jsdom's VirtualConsole. `Not implemented: navigation to another Document`
 *     (tests/ui/recovery-boundary.test.tsx, whose recovery screen clicks a Blob
 *     anchor) still prints in a run and is seen by NEITHER this guard nor that
 *     file's own `console.error` mock — jsdom forwards it to a console binding
 *     captured when vitest built the environment, not to the `console.error`
 *     visible from test code. It needs no tolerance entry because it never
 *     reaches the guard.
 */

import { afterEach, beforeEach } from "vitest";

type GuardedMethod = "error" | "warn";

const GUARDED_METHODS: readonly GuardedMethod[] = ["error", "warn"];

interface Tolerance {
  /** Matched against the rendered `method: text` line. */
  readonly pattern: RegExp;
  /** Named reason. A tolerance without one is not a tolerance, it is a hole. */
  readonly why: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * TOLERATED MESSAGES
 *
 * EMPTY, AND THAT IS THE POINT. Every one of the 72 test files passes with no
 * entries here, so the guard currently has ZERO holes. The mechanism exists so
 * that a future genuine exception has a sanctioned, narrow, reviewable shape —
 * a pinned pattern plus a named reason — instead of someone reaching for a
 * blanket suppression. Adding an entry must stay harder than fixing the cause:
 * (a) pin text specific enough that a real React warning cannot slip past it,
 * and (b) say why the message is not a defect.
 * ──────────────────────────────────────────────────────────────────────────── */
const TOLERATED: readonly Tolerance[] = [];

interface Capture {
  readonly method: GuardedMethod;
  readonly text: string;
}

let captured: Capture[] = [];
let uninstallers: Array<() => void> = [];

function renderArgument(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * React logs through printf-style format strings — the duplicate-key warning is
 * literally `console.error("...same key, `%s`...", key)`. Substituting the
 * placeholders (as node's console does) is what makes the failure message read
 * as the warning a developer would recognise, and it is what TOLERATED patterns
 * are matched against. Unconsumed arguments are appended, same as node.
 */
function renderMessage(args: readonly unknown[]): string {
  const [first, ...rest] = args;
  if (typeof first !== "string" || !first.includes("%")) {
    return args.map(renderArgument).join(" ");
  }

  let next = 0;
  const formatted = first.replace(/%[sdifoOjc%]/g, (token) => {
    if (token === "%%") return "%";
    if (next >= rest.length) return token;
    const value = rest[next++];
    if (token === "%c") return ""; // CSS styling directive — no textual output.
    if (token === "%d" || token === "%i") return String(Math.trunc(Number(value)));
    if (token === "%f") return String(Number(value));
    return renderArgument(value);
  });

  return [formatted, ...rest.slice(next).map(renderArgument)].join(" ").trimEnd();
}

function line(entry: Capture): string {
  return `${entry.method}: ${entry.text}`;
}

function isTolerated(entry: Capture): boolean {
  return TOLERATED.some((tolerance) => tolerance.pattern.test(line(entry)));
}

function install(): void {
  captured = [];
  uninstallers = GUARDED_METHODS.map((method) => {
    const previous = console[method];
    const guarded = (...args: unknown[]): void => {
      captured.push({ method, text: renderMessage(args) });
      // Forward, so the message still lands in the run output where it is
      // readable in full alongside the failure this guard is about to raise.
      previous.apply(console, args);
    };
    console[method] = guarded;
    // Unconditional restore. If a test installed its own spy and never took it
    // down, dropping it here is the right end-of-test cleanup; keeping it would
    // let guards stack one layer deeper on every subsequent test.
    return () => {
      console[method] = previous;
    };
  });
}

function uninstall(): void {
  for (const undo of uninstallers) undo();
  uninstallers = [];
}

/** One React defect fires once per rendered child, so collapse repeats. */
const DISTINCT_SHOWN = 5;

function report(offences: readonly Capture[]): string {
  const tally = new Map<string, number>();
  for (const entry of offences) {
    const text = line(entry);
    tally.set(text, (tally.get(text) ?? 0) + 1);
  }

  const shown = [...tally].slice(0, DISTINCT_SHOWN).map(([text, count], index) => {
    const times = count > 1 ? ` (x${count})` : "";
    return `  ${index + 1}.${times} ${text}`;
  });
  const hidden = tally.size - shown.length;
  if (hidden > 0) shown.push(`  ...and ${hidden} more distinct message(s).`);

  return (
    `This test wrote ${offences.length} console message(s) that the suite treats as a failure.\n` +
    "React reports duplicate/missing keys, invalid DOM nesting and act() violations here and " +
    "nowhere else, so the console is an assertion surface. Fix the cause; only add a pinned " +
    "entry to TOLERATED in tests/setup-console-guard.ts if it is genuinely not a defect.\n\n" +
    shown.join("\n\n")
  );
}

beforeEach(() => {
  install();
});

afterEach(() => {
  const offences = captured.filter((entry) => !isTolerated(entry));
  captured = [];
  uninstall();
  if (offences.length > 0) throw new Error(report(offences));
});
