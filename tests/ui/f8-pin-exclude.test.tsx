// @vitest-environment jsdom
/**
 * F8-R2 group 1 — Pin, Exclude, and the vocabulary ruling that made them.
 *
 * The fixture is `tests/ui/f8-fixture.ts` and it is load-bearing here for a
 * reason worth stating: THREE of its four purchases are IMPLICITLY pinned by
 * the engine (posterizer holds the Fuse, rise-up holds the Reaction, float-game
 * is stale), leaving `dimer` as the only user-pinnable row. That is not a
 * limitation of the fixture — it is the exact shape this group needs, because
 * it puts both implicit-pin arms and the user arm on one screen.
 *
 * The 20s timeouts match the shipped convention for tests/ui/** files that
 * render App. Do not lower them: this repo has a load-dependent flake class
 * where the 5s default trips under full-suite parallelism.
 */

import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { writeAutosave } from "../../src/persist/local-storage";
import { f8Rig } from "./f8-fixture";
import { installMemoryLocalStorage } from "./storage-stub";

const SLOW = { timeout: 20000 };

function mount(): void {
  expect(writeAutosave(f8Rig()).ok).toBe(true);
  render(<App />);
}

function roster(): HTMLElement {
  const found = document.querySelector(".summary-roster");
  if (!(found instanceof HTMLElement)) throw new Error("roster not rendered");
  return found;
}

/** The roster's pin control for one badge, found by ACCESSIBLE NAME rather
 *  than by DOM position — the row order is the dataset's and must stay free to
 *  change without reddening this file. */
function rosterPin(name: string): HTMLButtonElement {
  const matches = within(roster())
    .getAllByRole("button", { name: new RegExp(`^(?:Un)?[Pp]in ${name}$`) });
  expect(matches, `exactly one roster pin for ${name}`).toHaveLength(1);
  return matches[0] as HTMLButtonElement;
}

/** R12 slice 2 — the card's roll controls live behind the expand control now
 *  (they were permanent chrome on all 53 cards; they are roll SESSION state,
 *  not build state). Every assertion below that used to read a card's action
 *  line goes through this, which is the affordance a user takes. */
function expandCard(card: Element): void {
  const control = within(card as HTMLElement).getByRole("button", { name: /^Details — / });
  if (control.getAttribute("aria-expanded") === "false") fireEvent.click(control);
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe("1 — the pin control", () => {
  it("1.1 — a purchased row pins and unpins, and the LABEL carries the state", SLOW, () => {
    mount();
    const pin = rosterPin("Dimer");
    // State is carried by the label FIRST and aria-pressed second — never by
    // colour alone (§6).
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(pin.textContent).toBe("Pin");

    fireEvent.click(pin);
    expect(rosterPin("Dimer").getAttribute("aria-pressed")).toBe("true");
    expect(rosterPin("Dimer").textContent).toBe("Pinned");

    fireEvent.click(rosterPin("Dimer"));
    expect(rosterPin("Dimer").getAttribute("aria-pressed")).toBe("false");
    expect(rosterPin("Dimer").textContent).toBe("Pin");
  });

  it("1.2 — the pin-mode radios appear ONLY on pinned rows, as native radios", SLOW, () => {
    mount();
    // Unpinned: no sub-row anywhere in the roster.
    expect(roster().querySelectorAll(".summary-roster__pin-mode")).toHaveLength(0);

    fireEvent.click(rosterPin("Dimer"));
    const subRows = roster().querySelectorAll(".summary-roster__pin-mode");
    expect(subRows).toHaveLength(1);

    // A NATIVE fieldset of radios — arrow-key navigation and group semantics
    // come free, which is why this is not a row of <button>s.
    const group = subRows[0] as HTMLElement;
    expect(group.querySelector("fieldset")).not.toBeNull();
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios.map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)).toEqual([
      "this level",
      "any level",
    ]);
    // Defaults to `this level` — the user's own example is "I select gold
    // posterizer", which means THIS level.
    expect((radios[0] as HTMLInputElement).checked).toBe(true);

    fireEvent.click(radios[1] as HTMLElement);
    expect(
      (within(roster().querySelector(".summary-roster__pin-mode") as HTMLElement)
        .getAllByRole("radio")[1] as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("1.3 — both implicit pins render Pinned + disabled + a reason, and NO title", SLOW, () => {
    mount();
    // A synergy-role holder (clearing it could strand a fuseBadgeId — the F2.1
    // defect class) and a stale purchase (H8: the roll never repairs a
    // disclosure). Both are the ENGINE's pins, not the user's.
    for (const [name, fragment] of [
      ["Posterizer", "holds the Fuse role in Synergy Slot"],
      ["Float Game", "no longer qualifies"],
    ] as const) {
      const pin = rosterPin(name);
      expect(pin.textContent, name).toBe("Pinned");
      expect(pin.disabled, `${name} is disabled`).toBe(true);
      // The reason is reachable, and it is aria-describedby — NEVER a title
      // tooltip, which is unreachable by keyboard and by touch (§3.1).
      expect(pin.getAttribute("title"), `${name} has no title`).toBeNull();
      const reasonId = pin.getAttribute("aria-describedby");
      expect(reasonId, `${name} has a reason id`).toBeTruthy();
      const reason = document.getElementById(reasonId as string);
      expect(reason?.textContent, name).toContain(fragment);
    }
    // No `title` ANYWHERE on the roster's controls.
    for (const control of roster().querySelectorAll(".pin-control")) {
      expect(control.getAttribute("title")).toBeNull();
    }
  });

  it("1.4 — the reason span is NOT inside an opacity-dimmed element", SLOW, () => {
    mount();
    const pin = rosterPin("Posterizer");
    const reason = document.getElementById(pin.getAttribute("aria-describedby") as string);
    expect(reason).not.toBeNull();
    // STRUCTURAL, not computed: the reason is a SIBLING of the button, so no
    // :disabled treatment on the button's own box can reach it (§6).
    expect(reason?.parentElement).toBe(pin.parentElement);
    expect((reason as HTMLElement).contains(pin)).toBe(false);
    expect(pin.contains(reason as HTMLElement)).toBe(false);
    for (
      let node: HTMLElement | null = reason as HTMLElement;
      node !== null;
      node = node.parentElement
    ) {
      expect(node.style.opacity, `${node.className} dims the reason`).toBe("");
    }
  });

  it("1.5 — every card's action line carries EXACTLY ONE control, Pin xor Exclude", SLOW, () => {
    mount();
    const cards = document.querySelectorAll(".badge-card");
    expect(cards.length).toBeGreaterThanOrEqual(6);
    let purchased = 0;
    let unpurchased = 0;
    for (const card of cards) {
      // Collapsed, the card carries no action line at all — that is the R12
      // compaction, asserted rather than assumed…
      expect(card.querySelector(".badge-card__action")).toBeNull();
      expandCard(card);
      const action = card.querySelector(".badge-card__action");
      expect(action, "every expanded card has an action line").not.toBeNull();
      const controls = (action as HTMLElement).querySelectorAll(".pin-control");
      // NEVER BOTH, NEVER NEITHER.
      expect(controls).toHaveLength(1);
      const label = (controls[0] as HTMLElement).textContent;
      const isPurchased = card.getAttribute("data-purchased-level") !== null;
      if (isPurchased) {
        purchased += 1;
        expect(["Pin", "Pinned"]).toContain(label);
      } else {
        unpurchased += 1;
        expect(["Exclude", "Excluded"]).toContain(label);
      }
    }
    // Both arms are genuinely exercised rather than one arm 53 times.
    expect(purchased).toBeGreaterThan(0);
    expect(unpurchased).toBeGreaterThan(0);
  });

  it("1.6 — an excluded card gains NO opacity, NO recede class, NO new card state", SLOW, () => {
    mount();
    const card = [...document.querySelectorAll(".badge-card")].find(
      (candidate) => candidate.getAttribute("data-purchased-level") === null,
    ) as HTMLElement;
    expandCard(card);
    expect(card.querySelector(".pin-control")).not.toBeNull();
    // Measured AFTER the expand, so the only class this can catch is one the
    // EXCLUSION adds — `badge-card--expanded` is the open state, not a state
    // of the plan.
    const before = card.className;

    const chip = card.querySelector(".pin-control") as HTMLButtonElement;
    fireEvent.click(chip);

    // The PRESSED CHIP IS THE MARKER (invariant I2). Nothing else moves.
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.textContent).toBe("Excluded");
    expect(card.className).toBe(before);
    expect(card.style.opacity).toBe("");
  });

  it("1.7 — the roll panel rolls up exclusions and Clear exclusions empties them", SLOW, () => {
    mount();
    const panel = document.querySelector(".roll-panel") as HTMLElement;
    expect(panel).not.toBeNull();
    // Zero-valued advisory suppressed, exactly as §3.4 already has it.
    expect(panel.querySelector(".roll-panel__exclusions")).toBeNull();

    const chips = [...document.querySelectorAll(".badge-card")]
      .filter((card) => card.getAttribute("data-purchased-level") === null)
      .slice(0, 3)
      .map((card) => {
        expandCard(card);
        return card.querySelector(".pin-control") as HTMLButtonElement;
      });
    for (const chip of chips) fireEvent.click(chip);

    const rollUp = document.querySelector(".roll-panel__exclusions") as HTMLElement;
    expect(rollUp.textContent).toContain("3");
    expect(rollUp.textContent).toContain("badges excluded");

    fireEvent.click(within(rollUp).getByRole("button", { name: "Clear exclusions" }));
    expect(document.querySelector(".roll-panel__exclusions")).toBeNull();
    // EXCLUDE controls only. The purchased cards carry PIN controls, three of
    // which are implicitly pinned by the engine and must stay pressed —
    // clearing exclusions has nothing to do with them, and asserting over both
    // kinds at once would quietly couple the two sets.
    for (const card of document.querySelectorAll(".badge-card")) {
      if (card.getAttribute("data-purchased-level") !== null) continue;
      // Only the cards the test actually opened carry a control; a collapsed
      // card has none, and `if (chip !== null)` was always the guard here.
      const chip = card.querySelector(".pin-control");
      if (chip !== null) expect(chip.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("1.8 — `Lock` appears NOWHERE, in rendered text OR accessible names", SLOW, () => {
    mount();
    const BANNED = /\b(?:locks?|locked|unlock(?:ed)?|freeze|frozen|keep|hold)\b/i;
    // §7.4 cross-cutting check 6: accessible NAMES too, not only visible text.
    // A `Lock` that only exists in an aria-label is still H1's failure mode.
    for (const card of document.querySelectorAll(".badge-card")) expandCard(card);
    const surfaces = [
      roster(),
      document.querySelector(".roll-panel") as HTMLElement,
      ...[...document.querySelectorAll(".badge-card__action")].map((node) => node as HTMLElement),
    ];
    // The sweep is only worth anything if it reaches all 53 action lines.
    expect(document.querySelectorAll(".badge-card__action")).toHaveLength(
      document.querySelectorAll(".badge-card").length,
    );
    for (const surface of surfaces) {
      expect(surface).not.toBeNull();
      expect(surface.textContent ?? "", surface.className).not.toMatch(BANNED);
      for (const node of surface.querySelectorAll("[aria-label]")) {
        expect(node.getAttribute("aria-label") ?? "", "aria-label").not.toMatch(BANNED);
      }
    }
    // POSITIVE CANARY: the matcher can actually fire.
    expect(BANNED.test("Lock")).toBe(true);
    expect(BANNED.test("Unlock badge")).toBe(true);
  });
});
