// @vitest-environment jsdom
/**
 * Staleness guard for the shared label index installed by tests/setup-dom.ts.
 *
 * The index replaces jsdom's per-element `.labels` tree walk with one
 * document-wide label→control pass, memoised against jsdom's own DOM version
 * counter. That trades ~670 ms per post-mutation label query for ~1 ms — and
 * buys a brand-new way to be wrong: serving a snapshot taken before the
 * mutation.
 *
 * EVERY case here calls `primeIndex()` (which forces the memo to be BUILT at
 * the pre-mutation DOM version), then mutates and re-queries IN THE SAME
 * SYNCHRONOUS BLOCK. Without the priming step a case whose first `.labels`
 * read happens after its mutation would pass even against a memo that never
 * invalidates at all.
 *
 * Verified by sabotage (docs/proof/shared-label-index.md): disabling the
 * version comparison in `snapshotFor()` fails 8 of these 12; removing the
 * detached-element fall-through fails the detached case; dropping the
 * `type="hidden"` rule fails the hidden case.
 *
 * The final case cross-checks the index against an independent oracle —
 * `HTMLLabelElement.control`, which setup-dom.ts does NOT patch — over every
 * labelable element in the real App, so a fresh-but-wrong index is caught too.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { installMemoryLocalStorage } from "./storage-stub";

/**
 * Nodes attached by hand live here, not on `document.body` — RTL's `cleanup()`
 * only removes ITS container, so body-level fixtures would leak across cases
 * and collide on `id`.
 */
let fixture: HTMLElement;

beforeEach(() => {
  fixture = document.createElement("div");
  document.body.append(fixture);
});

afterEach(() => {
  fixture.remove();
});

function attachControl(labelText: string, controlId: string): HTMLInputElement {
  const label = document.createElement("label");
  label.setAttribute("for", controlId);
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = controlId;
  fixture.append(label, input);
  return input;
}

function labelsOf(control: Element): HTMLLabelElement[] {
  return Array.from(
    (control as unknown as { labels: ArrayLike<HTMLLabelElement> | null }).labels ?? [],
  );
}

/** Builds the memo at the CURRENT DOM version. See the file docblock. */
function primeIndex(): void {
  const sentinel = attachControl("Index priming sentinel", "index-priming-sentinel");
  expect(sentinel.labels).toHaveLength(1);
}

describe("shared label index — the memo is never stale", () => {
  it("a <label> added in the same tick is queryable immediately", () => {
    primeIndex();
    expect(screen.queryByLabelText("Added mid-tick")).toBeNull();

    const input = attachControl("Added mid-tick", "added-mid-tick");

    expect(screen.getByLabelText("Added mid-tick")).toBe(input);
  });

  it("a <label> removed in the same tick stops matching immediately", () => {
    const input = attachControl("Removed mid-tick", "removed-mid-tick");
    primeIndex();
    expect(screen.getByLabelText("Removed mid-tick")).toBe(input);

    (fixture.querySelector('label[for="removed-mid-tick"]') as HTMLLabelElement).remove();

    expect(screen.queryByLabelText("Removed mid-tick")).toBeNull();
    expect(input.labels).toHaveLength(0);
  });

  it("re-pointing `for` in the same tick moves the label to the new control", () => {
    const first = attachControl("Moving target", "target-one");
    const second = document.createElement("input");
    second.id = "target-two";
    fixture.append(second);
    primeIndex();
    expect(screen.getByLabelText("Moving target")).toBe(first);

    const label = fixture.querySelector('label[for="target-one"]') as HTMLLabelElement;
    label.setAttribute("for", "target-two");

    expect(screen.getByLabelText("Moving target")).toBe(second);
    expect(first.labels).toHaveLength(0);
    expect(labelsOf(second)).toEqual([label]);
  });

  it("renaming the control's `id` in the same tick re-resolves the association", () => {
    const input = attachControl("Renamed id", "id-before");
    primeIndex();
    expect(input.labels).toHaveLength(1);

    input.id = "id-after";
    expect(input.labels).toHaveLength(0);
    expect(screen.queryByLabelText("Renamed id")).toBeNull();

    (fixture.querySelector('label[for="id-before"]') as HTMLLabelElement).setAttribute(
      "for",
      "id-after",
    );
    expect(screen.getByLabelText("Renamed id")).toBe(input);
  });

  it("an implicit (wrapping) label added in the same tick resolves", () => {
    primeIndex();
    const label = document.createElement("label");
    label.append("Wrapped control");
    const input = document.createElement("input");
    label.append(input);
    fixture.append(label);

    expect(screen.getByLabelText("Wrapped control")).toBe(input);
    expect(labelsOf(input)).toEqual([label]);
  });

  it("moving a control out of its wrapping label in the same tick clears it", () => {
    const label = document.createElement("label");
    label.append("Escaping control");
    const input = document.createElement("input");
    label.append(input);
    fixture.append(label);
    primeIndex();
    expect(input.labels).toHaveLength(1);

    fixture.append(input);
    expect(input.labels).toHaveLength(0);
  });

  it("flipping `type` to hidden in the same tick makes `.labels` null, per jsdom", () => {
    const input = attachControl("Hideable", "hideable");
    primeIndex();
    expect(input.labels).toHaveLength(1);

    input.setAttribute("type", "hidden");
    expect(input.labels).toBeNull();

    input.setAttribute("type", "text");
    expect(input.labels).toHaveLength(1);
  });

  it('`for=""` associates with nothing, and two labels stack in document order', () => {
    const input = attachControl("First label", "stacked");
    primeIndex();
    expect(input.labels).toHaveLength(1);

    const empty = document.createElement("label");
    empty.setAttribute("for", "");
    empty.textContent = "Empty for";
    const second = document.createElement("label");
    second.setAttribute("for", "stacked");
    second.textContent = "Second label";
    fixture.append(empty, second);

    expect(labelsOf(input).map((l) => l.textContent)).toEqual(["First label", "Second label"]);
    expect(screen.queryByLabelText("Empty for")).toBeNull();
  });

  it("serves NodeList-shaped reads: length, index, item(), iteration", () => {
    const input = attachControl("Shape check", "shape-check");
    primeIndex();
    const labels = input.labels as NodeListOf<HTMLLabelElement>;

    expect(labels.length).toBe(1);
    expect(labels[0]?.textContent).toBe("Shape check");
    expect(labels.item(0)?.textContent).toBe("Shape check");
    expect(labels.item(9)).toBeNull();
    expect([...labels]).toHaveLength(1);
  });

  it("detached and foreign-document controls fall through to jsdom untouched", () => {
    primeIndex();

    const label = document.createElement("label");
    label.append("Detached");
    const input = document.createElement("input");
    label.append(input);
    // Never attached to `document` — the index must not answer for it.
    expect(labelsOf(input)).toEqual([label]);

    const other = document.implementation.createHTMLDocument("other");
    const otherLabel = other.createElement("label");
    otherLabel.setAttribute("for", "foreign");
    const otherInput = other.createElement("input");
    otherInput.id = "foreign";
    other.body.append(otherLabel, otherInput);
    expect(labelsOf(otherInput)).toEqual([otherLabel]);
  });

  it("is actually installed — a connected control is served from the index", () => {
    const input = attachControl("Installed", "installed");
    primeIndex();
    expect(
      Array.isArray(input.labels),
      "setup-dom.ts stopped serving `.labels` from the shared index — jsdom's " +
        "per-element tree walk is back and UI files will slow by ~20x. If a " +
        "jsdom upgrade tripped the version-counter fence in setup-dom.ts, " +
        "re-verify it.",
    ).toBe(true);
  });
});

describe("shared label index — agrees with jsdom's own control resolution", () => {
  it("matches `label.control` for every labelable element in the real App", { timeout: 60000 }, () => {
    installMemoryLocalStorage();
    render(<App />);

    // Oracle: `HTMLLabelElement.control` is NOT patched by setup-dom.ts, so
    // bucketing by it is an independent computation of the same relation.
    const oracle = new Map<Element, HTMLLabelElement[]>();
    for (const label of document.querySelectorAll("label")) {
      const control = label.control;
      if (!control) continue;
      const bucket = oracle.get(control);
      if (bucket) bucket.push(label);
      else oracle.set(control, [label]);
    }

    const controls = document.querySelectorAll(
      "button,input,meter,output,progress,select,textarea",
    );
    expect(controls.length).toBeGreaterThan(100);
    expect(oracle.size).toBeGreaterThan(100);

    for (const control of controls) {
      expect(
        labelsOf(control),
        `mismatch for <${control.localName}> ${control.id || "(no id)"}`,
      ).toEqual(oracle.get(control) ?? []);
    }

    // …and it still agrees after a mutation, in the same tick.
    const labelled = [...oracle.keys()].find((el) => el.id !== "") as HTMLElement;
    expect(labelsOf(labelled)).toHaveLength(1);
    const extra = document.createElement("label");
    extra.setAttribute("for", labelled.id);
    extra.textContent = "Appended oracle label";
    fixture.append(extra);

    const reoracled = [...document.querySelectorAll("label")].filter(
      (label) => label.control === labelled,
    );
    expect(reoracled).toHaveLength(2);
    expect(labelsOf(labelled)).toEqual(reoracled);
  });
});
