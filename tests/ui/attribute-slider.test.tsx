// @vitest-environment jsdom
/**
 * AttributeSlider (F3, design-spec §3.1) — the two commit tiers and their
 * split, keyboard steps, a11y names, and the slider-drag → stale-purchase
 * interplay through the whole App.
 *
 * PRE-F3 these fail because the 20 attribute inputs were NumberFields: no
 * role="slider" exists, no preview tier exists, and no build-change
 * announcement fires on a stale-count change.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { AttributeSlider } from "../../src/ui/primitives/AttributeSlider";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.useRealTimers();
});

function slider(name: string): HTMLInputElement {
  return screen.getByRole("slider", { name }) as HTMLInputElement;
}

describe("AttributeSlider — structure and accessible names (§3.1)", () => {
  it("is a native range 0–99 step 1 (plain arrows = 1 is the native contract)", () => {
    render(<AttributeSlider label="Close" value={50} onCommit={vi.fn()} />);
    const range = slider("Close");
    expect(range.type).toBe("range");
    expect(range.getAttribute("min")).toBe("0");
    expect(range.getAttribute("max")).toBe("99");
    expect(range.getAttribute("step")).toBe("1");
    expect(range.getAttribute("aria-valuetext")).toBe("50");
  });

  it("pairs a MANDATORY always-visible numeric field with a distinct accessible name", () => {
    render(<AttributeSlider label="Close" value={50} onCommit={vi.fn()} />);
    const numeric = screen.getByLabelText("Close, exact value") as HTMLInputElement;
    expect(numeric.type).toBe("number");
    expect(numeric.value).toBe("50");
  });

  it("editing the numeric field commits (two views of one value; either writes it)", () => {
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const numeric = screen.getByLabelText("Close, exact value");
    fireEvent.change(numeric, { target: { value: "77" } });
    fireEvent.blur(numeric);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(77);
  });
});

describe("AttributeSlider — preview tier vs commit tier (§3.1)", () => {
  it("drag ticks (input events) preview locally and NEVER commit", () => {
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = slider("Close");
    fireEvent.input(range, { target: { value: "55" } });
    fireEvent.input(range, { target: { value: "62" } });
    fireEvent.input(range, { target: { value: "70" } });
    expect(onCommit).not.toHaveBeenCalled();
    // The numeric echo tracks the pending value, flagged as uncommitted.
    const numeric = screen.getByLabelText("Close, exact value") as HTMLInputElement;
    expect(numeric.value).toBe("70");
    expect(document.querySelector(".attr-slider__num--pending")).not.toBeNull();
  });

  it("pointer release (change event) commits exactly once, immediately", () => {
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = slider("Close");
    fireEvent.input(range, { target: { value: "60" } });
    fireEvent.input(range, { target: { value: "64" } });
    fireEvent.change(range, { target: { value: "64" } });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(64);
  });

  it("blur flushes a pending preview (the App's tail-edit flush relies on this)", () => {
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = slider("Close");
    fireEvent.input(range, { target: { value: "58" } });
    fireEvent.blur(range);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(58);
  });
});

describe("AttributeSlider — keyboard (§3.1: Shift+Arrow = 10, bounded 0–99)", () => {
  it("Shift+ArrowUp steps +10 and commits after the 120ms coalescing window", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = slider("Close");
    fireEvent.keyDown(range, { key: "ArrowUp", shiftKey: true });
    expect(onCommit).not.toHaveBeenCalled(); // trailing debounce pending
    vi.advanceTimersByTime(120);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(60);
  });

  it("held Shift+Arrow coalesces to ONE commit (never one recompute per tick)", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<AttributeSlider label="Close" value={50} onCommit={onCommit} />);
    const range = slider("Close");
    fireEvent.keyDown(range, { key: "ArrowUp", shiftKey: true });
    fireEvent.keyDown(range, { key: "ArrowUp", shiftKey: true });
    fireEvent.keyDown(range, { key: "ArrowUp", shiftKey: true });
    vi.advanceTimersByTime(120);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(80);
  });

  it("is bounded at 99 and 0", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { unmount } = render(
      <AttributeSlider label="Close" value={95} onCommit={onCommit} />,
    );
    fireEvent.keyDown(slider("Close"), { key: "ArrowUp", shiftKey: true });
    vi.advanceTimersByTime(120);
    expect(onCommit).toHaveBeenLastCalledWith(99);
    unmount();

    const onCommitDown = vi.fn();
    render(<AttributeSlider label="Close" value={5} onCommit={onCommitDown} />);
    fireEvent.keyDown(slider("Close"), { key: "ArrowDown", shiftKey: true });
    vi.advanceTimersByTime(120);
    expect(onCommitDown).toHaveBeenLastCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// Slider-drag → stale-purchase interplay (impl-brief F3 §4.3). The stale
// treatment itself is BadgeCard's (M4/F2 — a denied path); this test only
// PINS that a slider commit reaches it and that the announcement fires once,
// on commit.
// ---------------------------------------------------------------------------

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function floatGamePips() {
  return screen.getByRole("radiogroup", { name: "Float Game — purchase level" });
}

/** The §6 build-change live region (App-level, sr-only). */
function buildChangeRegion(): HTMLElement {
  const region = document.querySelector('.app > p.sr-only[role="status"]');
  if (!(region instanceof HTMLElement)) throw new Error("build-change region not found");
  return region;
}

describe("slider drag → stale purchase (App integration)", () => {
  it("driving a gating attribute below threshold discloses on COMMIT, once", { timeout: 20000 }, () => {
    render(<App />);
    // Buy Float Game Gold at Close 90 (gold needs 90 Close or 93 Layup).
    commitNumber(screen.getByLabelText("Close"), "90");
    fireEvent.click(within(floatGamePips()).getByRole("radio", { name: /^Gold/ }));
    expect(screen.getByText("Now Gold")).toBeTruthy();

    // Drag Close down through intermediate values: PREVIEW only — no card
    // state change, no announcement per intermediate value.
    const close = screen.getByLabelText("Close");
    fireEvent.input(close, { target: { value: "85" } });
    fireEvent.input(close, { target: { value: "78" } });
    expect(screen.queryByText(/Purchased at Gold — no longer meets requirements/)).toBeNull();
    expect(buildChangeRegion().textContent).not.toContain("Close set to");

    // Release (change) = the single commit.
    fireEvent.change(close, { target: { value: "70" } });

    // The card enters the stale-purchase state with the engine's string.
    expect(
      screen.getByText(/Purchased at Gold — no longer meets requirements: needs 90 Close/),
    ).toBeTruthy();
    // Points stay spent (H8: disclosure, never auto-migration)…
    const section = document.querySelector("#cat-finishing");
    expect(section?.querySelector(".category-ledger")?.textContent).toContain("6 / 0");
    // …the Badge Slot stays occupied (the purchase is retained, pip checked)…
    const gold = within(floatGamePips()).getByRole("radio", {
      name: /^Gold, current level — no longer meets requirements/,
    }) as HTMLInputElement;
    expect(gold.checked).toBe(true);
    // …and the pips stay operable (Bronze still passes at Close 70).
    const bronze = within(floatGamePips()).getByRole("radio", { name: /^Bronze/ });
    expect(bronze.getAttribute("aria-disabled")).not.toBe("true");

    // The announcement fired ONCE, on commit — with the changed stale count.
    expect(buildChangeRegion().textContent).toBe(
      "Close set to 70. 1 purchased badge no longer qualifies.",
    );
  });

  it("a commit that does NOT change the stale count stays silent (§6)", { timeout: 20000 }, () => {
    render(<App />);
    const close = screen.getByLabelText("Close");
    fireEvent.change(close, { target: { value: "40" } });
    fireEvent.change(close, { target: { value: "50" } });
    expect(buildChangeRegion().textContent).toBe("");
  });
});
