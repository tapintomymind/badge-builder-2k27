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
    // STRUCTURAL, not computed: the reason is OUTSIDE the button, so no
    // :disabled treatment on the button's own box can reach it (§6).
    //
    // THE SIBLING CHECK THIS ASSERTION USED TO MAKE HAS BEEN REPLACED, NOT
    // DROPPED, and the replacement is stricter. §6's rule is "never inside a
    // dimmed element"; `reason.parentElement === pin.parentElement` was one
    // way to satisfy it and the roster now satisfies it more strongly — the
    // sentence is not even in the same <td>. It moved because a table column
    // is sized by what is in it, and a 47-character sentence in the pin cell
    // made that column's min-content 286.7px against a 60px budget, taking
    // the table out of its card by up to 179.1px (see the layout assertions
    // in tests/ui/f8-roster.test.tsx). What §6 actually cares about — the
    // sentence is never a descendant of the disabled control and nothing
    // between it and the document dims it — is asserted below, on BOTH hosts.
    expect((reason as HTMLElement).contains(pin)).toBe(false);
    expect(pin.contains(reason as HTMLElement)).toBe(false);
    // …and in the roster the move is deliberate, so pin it: the sentence
    // lives in a spanning row of its own, which is what lets it wrap.
    expect((reason as HTMLElement).closest("td")?.getAttribute("colspan")).toBe("6");
    expect((reason as HTMLElement).closest("tr")?.className).toBe("summary-roster__reason");
    expect(pin.closest("td")?.className).toBe("summary-roster__pin");

    // The CARD host is unchanged and still renders its own sibling span — the
    // opt-out is the roster's alone, and asserting it here stops a later pass
    // "tidying" PinControl into one placement for both.
    const cardPin = [...document.querySelectorAll(".badge-card__action .pin-control")].find(
      (control) => control.hasAttribute("aria-describedby"),
    ) as HTMLButtonElement;
    const cardReason = document.getElementById(
      cardPin.getAttribute("aria-describedby") as string,
    );
    expect(cardReason?.parentElement).toBe(cardPin.parentElement);

    for (const node of [reason, cardReason] as HTMLElement[]) {
      for (
        let cursor: HTMLElement | null = node;
        cursor !== null;
        cursor = cursor.parentElement
      ) {
        expect(cursor.style.opacity, `${cursor.className} dims the reason`).toBe("");
      }
    }
  });

  it("1.5 — every card's action line carries EXACTLY ONE control, Pin xor Exclude", SLOW, () => {
    mount();
    const cards = document.querySelectorAll(".badge-card");
    expect(cards.length).toBeGreaterThanOrEqual(6);
    let purchased = 0;
    let unpurchased = 0;
    for (const card of cards) {
      const action = card.querySelector(".badge-card__action");
      expect(action, "every card has an action line").not.toBeNull();
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
      (candidate) =>
        candidate.getAttribute("data-purchased-level") === null &&
        candidate.querySelector(".pin-control") !== null,
    ) as HTMLElement;
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
      .map((card) => card.querySelector(".pin-control") as HTMLButtonElement);
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
      const chip = card.querySelector(".pin-control");
      if (chip !== null) expect(chip.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("1.8 — `Lock` appears NOWHERE, in rendered text OR accessible names", SLOW, () => {
    mount();
    const BANNED = /\b(?:locks?|locked|unlock(?:ed)?|freeze|frozen|keep|hold)\b/i;
    // §7.4 cross-cutting check 6: accessible NAMES too, not only visible text.
    // A `Lock` that only exists in an aria-label is still H1's failure mode.
    const surfaces = [
      roster(),
      document.querySelector(".roll-panel") as HTMLElement,
      ...[...document.querySelectorAll(".badge-card__action")].map((node) => node as HTMLElement),
    ];
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
