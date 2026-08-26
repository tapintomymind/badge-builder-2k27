// @vitest-environment jsdom
/**
 * F2.3 R1 — THE HIGHEST-RISK ASSUMPTION IN THE WHOLE FIX, PINNED PER
 * COMPONENT.
 *
 * The unload flush now writes only when the blur it performs actually
 * committed something (`workingRef.current` moved). That test is correct
 * ONLY because every commit-on-blur field commits SYNCHRONOUSLY, inside its
 * own blur handler. A field that committed in a microtask — `queueMicrotask`,
 * a `.then()`, an `await`, a `setTimeout(0)` — would make the comparison a
 * FALSE NEGATIVE: the flush would see nothing changed, write nothing, and the
 * tail edit would be lost. That is a brand-new instance of exactly the class
 * this slice exists to close.
 *
 * So the property is pinned PER COMPONENT rather than once at the app level,
 * which is precisely the difference between this fix and the earlier one that
 * created two new defects by verifying each change only against the scenario
 * it was written for.
 *
 * THREE LAYERS HERE, and they are not redundant:
 *   A. the METHOD's own canary — a deliberately microtask-deferred component,
 *      driven identically, watched NOT committing synchronously. Without it
 *      "the spy was called" proves nothing about WHEN.
 *   B. per-component synchrony, on the two primitives that commit on blur.
 *   C. the CENSUS — the frozen set of source files that contain an `onBlur`
 *      at all, so a THIRD commit-on-blur component cannot be added without
 *      landing on this contract.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttributeSlider } from "../../src/ui/primitives/AttributeSlider";
import { NumberField } from "../../src/ui/primitives/NumberField";
import { srcSources, stripComments } from "../helpers/test-utils";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

/* ------------------------------------------------- A. the method's canary -- */

/** A NumberField-shaped field that commits one microtask late. Nothing in the
 * app looks like this — it exists only to prove the assertions below can TELL,
 * because `fireEvent` wraps in the synchronous `act()`, which flushes React
 * state but does NOT await the microtask queue. */
function MicrotaskCommitField({ onCommit }: { onCommit: (value: number) => void }) {
  return (
    <input
      aria-label="Deferred"
      type="number"
      onBlur={(event) => {
        const parsed = Number.parseInt(event.currentTarget.value, 10);
        void Promise.resolve().then(() => {
          onCommit(parsed);
        });
      }}
    />
  );
}

describe("R1/A — the synchrony assertion can actually fail", () => {
  it("a microtask-deferred commit is NOT seen synchronously, and IS seen after a tick", async () => {
    const onCommit = vi.fn();
    render(<MicrotaskCommitField onCommit={onCommit} />);
    const field = screen.getByLabelText("Deferred");
    fireEvent.change(field, { target: { value: "42" } });
    fireEvent.blur(field);

    // THE CANARY. If this ever reads 1, the method below has stopped
    // distinguishing "committed in the blur" from "committed eventually",
    // and every per-component assertion in this file is vacuous.
    expect(onCommit).toHaveBeenCalledTimes(0);

    await Promise.resolve();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------- B. per component, per field -- */

describe("R1/B1 — NumberField commits INSIDE its blur handler", () => {
  it("the commit is observable the instant fireEvent.blur returns", () => {
    const onCommit = vi.fn();
    render(<NumberField label="Close" value={0} min={0} max={99} onCommit={onCommit} />);
    const input = screen.getByLabelText("Close");
    fireEvent.change(input, { target: { value: "77" } });

    expect(onCommit).toHaveBeenCalledTimes(0); // typing alone never commits
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(77);
  });

  it("a no-change blur still commits the SAME value, so the flush sees `prev` returned", () => {
    // This is the other half of layer 1's correctness: tabbing through a
    // field fires onCommit with an unchanged value, and every App handler
    // returns `prev` for it — which is what makes reference identity a sound
    // "this flush had nothing to add".
    const onCommit = vi.fn();
    render(<NumberField label="Close" value={40} min={0} max={99} onCommit={onCommit} />);
    const input = screen.getByLabelText("Close");
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(40);
  });
});

describe("R1/B2 — AttributeSlider commits INSIDE its blur handler, both tiers", () => {
  it("a pending POINTER preview is flushed synchronously on blur", () => {
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = screen.getByRole("slider", { name: "Close" });
    fireEvent.input(range, { target: { value: "66" } });
    expect(onCommit).toHaveBeenCalledTimes(0); // preview tier never commits

    fireEvent.blur(range);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(66);
  });

  it("a pending KEYBOARD debounce is flushed synchronously on blur — WITHOUT the timer", () => {
    // The debounce is the one place in the app where a commit is genuinely
    // deferred, so this is the assertion R1 is really about. No fake-timer
    // advance anywhere: if the commit needed the 120ms timer to land, layer 1
    // would see nothing changed and drop the edit.
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
      const range = screen.getByRole("slider", { name: "Close" });
      fireEvent.keyDown(range, { key: "ArrowUp", shiftKey: true });
      expect(onCommit).toHaveBeenCalledTimes(0); // still inside the debounce

      fireEvent.blur(range);
      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith(60);
    } finally {
      vi.useRealTimers();
    }
  });
});

/* --------------------------------------------------------- C. the census -- */

/**
 * The frozen set of source files carrying an `onBlur` at all (comments
 * stripped, so prose about blurring does not count). Two of the three commit
 * build state; the third is named and excused.
 *
 * A NEW FILE HERE IS A STOP-AND-READ, not a number to bump: it means someone
 * added a fourth blur handler, and layer 1's correctness now depends on
 * whether that handler commits synchronously.
 */
const BLUR_CENSUS: Record<string, string> = {
  "/src/ui/primitives/NumberField.tsx":
    "commits the clamped value synchronously — pinned by R1/B1 above",
  "/src/ui/primitives/AttributeSlider.tsx":
    "flushes the pending preview / debounce synchronously — pinned by R1/B2 above",
  "/src/ui/build/BuildPanel.tsx":
    "NOT a build commit: the §5.3 auto-collapse latch, which writes a UI " +
    "preference and never touches the working build or the autosave",
};

describe("R1/C — the commit-on-blur census is frozen", () => {
  it("exactly these source files contain an onBlur, and each is accounted for", () => {
    const found = Object.keys(srcSources)
      .filter((file) => /onBlur/.test(stripComments(srcSources[file] as string)))
      .sort();
    expect(
      found,
      "a source file gained (or lost) an onBlur. If it COMMITS BUILD STATE, " +
        "layer 1's flush test — 'did this blur change workingRef?' — is only " +
        "correct while that commit is SYNCHRONOUS. Add a per-component " +
        "synchrony assertion above before adding it here.",
    ).toEqual(Object.keys(BLUR_CENSUS).sort());
  });

  it("POSITIVE CANARY: the census scan sees onBlur in real source, not in prose", () => {
    // If stripComments ever stopped stripping, every file mentioning blur in
    // a doc comment would join the census and the frozen list would be
    // meaningless.
    const numberField = stripComments(
      srcSources["/src/ui/primitives/NumberField.tsx"] as string,
    );
    expect(/onBlur/.test(numberField)).toBe(true);
    expect(/onBlur/.test(stripComments("// onBlur={() => commit()}\n"))).toBe(false);
    expect(/onBlur/.test(stripComments("/* onBlur */\n"))).toBe(false);
  });
});
