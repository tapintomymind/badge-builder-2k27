// @vitest-environment jsdom
/**
 * R12 slice 3 — the phone tab shell (user ruling 2026-08-26; the phone
 * column of docs/mockups/workbench-recut.html).
 *
 * WHAT THIS FILE IS FOR. Below 768 the workbench's three columns become
 * three tabs, and every one of the properties that makes that safe is
 * invisible to a test that only reads the DOM tree: whether the inactive
 * stations are actually HIDDEN, whether the anchors that point into them are
 * dead, whether the tab bar is reachable by keyboard, and whether the Build
 * station is folded shut behind a latch that was designed for a different
 * layout. Each one shipped broken at least once during this slice, and two
 * were found by looking at the screen rather than at the tree.
 *
 * THE `[hidden]` PIN (case 4) IS THE LOAD-BEARING ONE. `hidden` hides through
 * the UA rule `[hidden] { display: none }`, and ANY author `display`
 * declaration outranks it — so `.mobile-panel { display: block }` silently
 * un-hides every inactive tab while the attribute, `aria-selected` and every
 * DOM-level assertion stay correct and green. That is exactly what happened;
 * all three stations painted on top of one another. The assertion below reads
 * the STYLESHEET, because jsdom has no cascade to measure.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import App from "../../src/App";
import appCss from "../../src/styles/app.css?raw";
import { installMemoryLocalStorage } from "./storage-stub";

/** The phone: below the M seam, which App reads as `isWide === false`. */
const PHONE = ["(max-width: 767px)", "(max-width: 1279px)"];
/** The workbench: neither max-query matches. */
const DESKTOP: string[] = [];

function stubMatchMedia(matching: string[]) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function tabs(): HTMLElement[] {
  return screen.getAllByRole("tab");
}
function tabNamed(name: string): HTMLElement {
  return screen.getByRole("tab", { name });
}
/** Every station wrapper, in DOM order. */
function panels(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".mobile-panel")];
}
/** The stations NOT carrying `hidden` — i.e. what the user can see. */
function shownPanelIds(): string[] {
  return panels()
    .filter((panel) => !panel.hasAttribute("hidden"))
    .map((panel) => panel.id);
}

beforeEach(() => {
  // The suite's own in-memory storage stub — a fresh one per case, so a
  // persisted Section preference from one tab test cannot decide another's.
  installMemoryLocalStorage();
});

afterEach(() => {
  cleanup();
});

describe("R12 slice 3 — the phone tab shell", () => {
  it("1 — three tabs, in loop order, with real tab semantics", () => {
    stubMatchMedia(PHONE);
    render(<App />);

    // The order IS the loop, and it matches the column order at L: set the
    // body, shop for badges, pair what you bought.
    expect(tabs().map((tab) => tab.textContent?.replace(/[^A-Za-z]/g, ""))).toEqual([
      "Build",
      "Badges",
      "Synergy",
    ]);
    // A tablist, not three loose buttons — the role is what buys arrow-key
    // navigation and the "1 of 3" announcement.
    expect(screen.getByRole("tablist")).toBeTruthy();
    // Each tab points at its panel, and the panel points back.
    for (const tab of tabs()) {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = document.getElementById(panelId as string);
      expect(panel, `no panel for ${tab.textContent ?? ""}`).toBeTruthy();
      expect(panel?.getAttribute("role")).toBe("tabpanel");
      expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
    }
  });

  it("2 — EXACTLY ONE station is shown, and switching moves it", () => {
    stubMatchMedia(PHONE);
    render(<App />);

    // Badges is the default — the surface the app exists for.
    expect(shownPanelIds()).toEqual(["mobile-panel-badges"]);
    expect(tabNamed("Badges").getAttribute("aria-selected")).toBe("true");

    fireEvent.click(tabNamed("Build"));
    expect(shownPanelIds()).toEqual(["mobile-panel-build"]);

    fireEvent.click(tabNamed("Synergy"));
    expect(shownPanelIds()).toEqual(["mobile-panel-synergy"]);
    // …and exactly one tab claims selection at every step.
    expect(tabs().filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  it("3 — panels are HIDDEN, never unmounted: the anchors stay alive", () => {
    stubMatchMedia(PHONE);
    render(<App />);

    // On the Build tab, the catalog is hidden — and still IN THE TREE. If it
    // were unmounted, the skip link's target and every #cat-* anchor would
    // stop existing while another tab is active: a dead link, not a slow one.
    fireEvent.click(tabNamed("Build"));
    expect(document.getElementById("badge-grid")).toBeTruthy();
    expect(document.getElementById("cat-finishing")).toBeTruthy();
    // The skip link itself still points somewhere real.
    const skip = document.querySelector('a[href="#badge-grid"]');
    expect(skip).toBeTruthy();
  });

  it("4 — THE CASCADE PIN: an author display rule must not un-hide a panel", () => {
    // jsdom has no cascade, so this reads the stylesheet. `.mobile-panel`
    // declares `display: block` at S; without an explicit `[hidden]` rule
    // beside it, that declaration beats the UA sheet's `[hidden] { display:
    // none }` and all three stations paint at once — with every DOM
    // assertion above still green. This shipped, and was caught by eye.
    expect(appCss).toContain(".mobile-panel[hidden]");
    const hiddenRule = /\.mobile-panel\[hidden\]\s*\{([^}]*)\}/.exec(appCss);
    expect(hiddenRule).not.toBeNull();
    expect((hiddenRule as RegExpExecArray)[1]).toContain("display: none");

    // …and it must be declared AFTER the rule it defends against, so the
    // later-wins half of the cascade is on its side too.
    expect(appCss.indexOf(".mobile-panel[hidden]")).toBeGreaterThan(
      appCss.indexOf(".mobile-panel {"),
    );
  });

  it("5 — the jump nav drops the panel chips: no anchor into a hidden tab", () => {
    stubMatchMedia(PHONE);
    render(<App />);

    // Board / Synergy / Summary live on ANOTHER TAB now. An anchor into a
    // `hidden` subtree scrolls nowhere while looking live, which is worse
    // than a missing control. The category chips stay — they navigate the
    // catalog, which is the tab the user is on.
    const nav = document.querySelector(".jump-nav");
    expect(nav).toBeTruthy();
    expect(nav?.querySelectorAll(".jump-nav__panel")).toHaveLength(0);
    expect(nav?.querySelector('a[href="#cat-finishing"]')).toBeTruthy();
  });

  it("6 — the Build tab is NOT folded shut behind the auto-collapse latch", () => {
    stubMatchMedia(PHONE);
    render(<App />);
    fireEvent.click(tabNamed("Build"));

    const build = document.getElementById("mobile-panel-build");
    expect(build).toBeTruthy();
    // The panel is UNWRAPPED here: no outer "Build" <summary>, because the
    // tab's own label already says Build and the latch would collapse the
    // entire station into a 54px grey row (measured at 375×812).
    const summaries = [...(build as HTMLElement).querySelectorAll("summary")].map((s) =>
      s.textContent?.trim(),
    );
    expect(summaries.some((text) => text === "Build")).toBe(false);
    // …while the three INNER sections keep their own collapse controls, so a
    // phone user can still fold the twenty-slider stack away.
    expect(summaries.some((text) => text?.startsWith("Physique"))).toBe(true);
    expect(summaries.some((text) => text?.startsWith("Attributes"))).toBe(true);
    expect(summaries.some((text) => text?.startsWith("Badge Tokens"))).toBe(true);
    // The controls are really there — the assertion above cannot pass by the
    // station being empty.
    expect((build as HTMLElement).querySelectorAll('input[type="range"]')).toHaveLength(20);
  });

  it("7 — arrow keys move between tabs and wrap, per the WAI-ARIA pattern", () => {
    stubMatchMedia(PHONE);
    render(<App />);
    const list = screen.getByRole("tablist");

    // Badges (index 1) → ArrowRight → Synergy.
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(shownPanelIds()).toEqual(["mobile-panel-synergy"]);
    // …and it WRAPS rather than dead-ending at the last tab.
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(shownPanelIds()).toEqual(["mobile-panel-build"]);
    fireEvent.keyDown(list, { key: "End" });
    expect(shownPanelIds()).toEqual(["mobile-panel-synergy"]);
    fireEvent.keyDown(list, { key: "Home" });
    expect(shownPanelIds()).toEqual(["mobile-panel-build"]);

    // Roving tabindex: exactly ONE tab is in the tab order. Three tab stops
    // for one control group is what the pattern exists to avoid.
    expect(tabs().filter((tab) => tab.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("8 — the totals bar is the RAIL's strip, not a second readout", () => {
    stubMatchMedia(PHONE);
    render(<App />);

    // One component, two arrangements. A phone-only totals component is how
    // two surfaces come to disagree about whether a discipline is over —
    // the exact defect R12 collapsed five surfaces to two to prevent.
    const bar = document.querySelector(".totals-strip--bar");
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute("aria-label")).toBe("Build totals");
    expect(bar?.querySelectorAll(".totals-strip__cell")).toHaveLength(6);
    // The three-letter labels are an ABBREVIATION, and the full category
    // name rides beside each one for assistive tech.
    expect(bar?.textContent).toContain("FIN");
    expect(bar?.textContent).toContain("PHY");
    expect(bar?.textContent).toContain("Finishing");
    expect(bar?.textContent).toContain("Physicals");
  });

  it("9 — NONE of it exists above the phone seam", () => {
    stubMatchMedia(DESKTOP);
    render(<App />);

    // The tab shell is rendered only below 768. Above it the wrappers are
    // `display: contents` and carry no tab semantics at all, so the
    // workbench's own measurements are untouched.
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(document.querySelector(".mobile-dock")).toBeNull();
    expect(document.querySelector(".totals-strip--bar")).toBeNull();
    for (const panel of panels()) {
      expect(panel.hasAttribute("hidden")).toBe(false);
      expect(panel.getAttribute("role")).toBeNull();
    }
    // …and the rail's own strip IS there, spelling the categories out.
    const rail = document.querySelector(".totals-strip");
    expect(rail).toBeTruthy();
    expect(rail?.textContent).toContain("Finishing");
  });
});
