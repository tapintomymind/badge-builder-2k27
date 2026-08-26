/**
 * Test-environment setup, wired via `test.setupFiles` in vite.config.ts and
 * run before EVERY test file.
 *
 * GUARDED TO BE INERT UNDER THE NODE ENVIRONMENT: the default environment is
 * "node" (engine tests stay fast and DOM-free); only files that opt in with a
 * `// @vitest-environment jsdom` docblock get a `document`, and only then does
 * this file register React Testing Library's cleanup. The convention for UI
 * tests (M3/M4): put them under tests/ui/** with that docblock.
 *
 * It also installs the shared label index described below — an O(1)-per-element
 * replacement for jsdom's per-element `.labels` walk.
 */

import { afterEach } from "vitest";

/* ────────────────────────────────────────────────────────────────────────────
 * SHARED LABEL INDEX
 *
 * THE PROBLEM. React Testing Library resolves `*ByLabelText` by reading
 * `element.labels` on every labelable element in the container
 * (@testing-library/dom → label-helpers.js → getRealLabels). jsdom backs
 * `.labels` with a LIVE NodeList whose query is
 *
 *     for (const descendant of treeIterator(root))
 *       if (descendant.control === labelable) nodes.push(descendant);
 *
 * (jsdom/living/helpers/form-controls.js → getLabelsForLabelable). The NodeList
 * caches its result against `root._version`, a counter that jsdom bumps on
 * EVERY DOM mutation anywhere in the document. So one mutation invalidates all
 * of them at once, and the next label query re-walks the whole document once
 * per labelable element. This app renders ~2371 elements / 309 <label> / 317
 * labelable elements, so a single post-mutation `getByLabelText` costs ~317
 * full-document walks. Measured here: 29–34 ms with no intervening mutation,
 * 666–718 ms immediately after one. It is quadratic in badge-grid size.
 *
 * THE FIX. The 317 walks all compute slices of ONE relation: label → control.
 * Build that relation once per DOM version with a single pass and serve every
 * element from it. Measured cost of the pass: 0.8–2.1 ms.
 *
 * WHY `_version` AND NOT MutationObserver. The dirty check reads the very
 * counter jsdom's own NodeList checks (`document[Symbol(impl)]._version`).
 * That makes the index EXACTLY as fresh as unpatched jsdom — it cannot go
 * stale in any case where native `.labels` would not, which is the property
 * that keeps the pass/fail set identical. A MutationObserver dirty check would
 * be a DIFFERENT signal than the one jsdom uses: it can diverge in both
 * directions (jsdom bumps `_version` for option selectedness with no mutation
 * record; observers retain removed nodes in undrained records), so it would
 * have to be argued correct on its own terms rather than by construction. The
 * internal read is fenced by `versionCounterTracksEveryStructuralMutation()`
 * below: if the counter is missing, is not a number, or misses ANY mutation
 * class that can move a control, nothing is patched and jsdom is left alone.
 *
 * SCOPE. Only elements whose root node IS their own document are served from
 * the index. Detached subtrees, shadow roots and foreign documents fall
 * through to jsdom's native getter unchanged.
 *
 * KNOWN DEVIATION. Native `.labels` is a live NodeList; the index returns a
 * frozen array-like snapshot for the current DOM version. Re-reading
 * `element.labels` always yields a current answer, but a reference CACHED
 * across a mutation will not self-update. Nothing in src/, tests/,
 * @testing-library/dom or dom-accessibility-api holds such a reference — all
 * three consumers null-check and immediately copy into an array.
 * ──────────────────────────────────────────────────────────────────────────── */

const HTML_NS = "http://www.w3.org/1999/xhtml";
const INSTALL_MARKER = "__badgeBuilderSharedLabelIndex__";

type LabelSnapshot = readonly HTMLLabelElement[];
type NativeLabelsGetter = (this: Element) => NodeListOf<HTMLLabelElement> | null;

let indexDocument: Document | null = null;
let readDocumentVersion: (() => number) | null = null;
let indexVersion = Number.NaN;
let indexMap = new Map<Element, LabelSnapshot>();

const EMPTY_LABELS: LabelSnapshot = sealSnapshot([]);

/** Adds NodeList's `item()` accessor, then freezes so the cache cannot be edited. */
function sealSnapshot(labels: HTMLLabelElement[]): LabelSnapshot {
  Object.defineProperty(labels, "item", {
    value: (index: number): HTMLLabelElement | null => labels[index] ?? null,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return Object.freeze(labels);
}

/** jsdom stores the impl object behind `Symbol("impl")` on every wrapper. */
function documentVersionReader(doc: Document): (() => number) | null {
  const implSymbol = Object.getOwnPropertySymbols(doc).find((s) => s.description === "impl");
  if (implSymbol === undefined) return null;
  const impl = (doc as unknown as Record<symbol, unknown>)[implSymbol];
  if (typeof impl !== "object" || impl === null) return null;
  const holder = impl as { _version?: unknown };
  if (typeof holder._version !== "number") return null;
  return () => holder._version as number;
}

/**
 * Refuses the optimisation unless the counter moves for every mutation class
 * that can change which control a <label> labels: insertion, removal, move,
 * replacement, and attribute set/change/removal (`for`, `id`, `type`).
 * Character data is deliberately NOT required — jsdom does not bump for it and
 * it cannot change the relation, which is element-identity only.
 */
function versionCounterTracksEveryStructuralMutation(doc: Document, read: () => number): boolean {
  const body = doc.body;
  if (!body) return false;

  const host = doc.createElement("div");
  const child = doc.createElement("span");
  const sibling = doc.createElement("span");
  const replacement = doc.createElement("span");
  let complete = true;

  const requireBump = (mutate: () => void): void => {
    const before = read();
    mutate();
    if (!(read() > before)) complete = false;
  };

  requireBump(() => body.appendChild(host));
  requireBump(() => host.setAttribute("data-shared-label-index-probe", "1"));
  requireBump(() => host.setAttribute("data-shared-label-index-probe", "2"));
  requireBump(() => host.removeAttribute("data-shared-label-index-probe"));
  requireBump(() => host.appendChild(child));
  requireBump(() => host.insertBefore(sibling, child));
  requireBump(() => host.replaceChild(replacement, sibling));
  requireBump(() => host.removeChild(child));
  requireBump(() => host.remove());

  if (host.parentNode) host.remove();
  return complete;
}

/**
 * jsdom's `isLabelable` (form-controls.js), for the subset we can decide from
 * the wrapper. Returns `undefined` for a custom-element name, whose labelable
 * -ness depends on an upgrade-time definition we cannot see — those defer to
 * jsdom itself rather than being guessed at.
 */
function labelable(element: Element): boolean | undefined {
  if (element.namespaceURI !== HTML_NS) return false;
  switch (element.localName) {
    case "button":
    case "meter":
    case "output":
    case "progress":
    case "select":
    case "textarea":
      return true;
    case "input":
      return (element as HTMLInputElement).type !== "hidden";
    default:
      return element.localName.includes("-") ? undefined : false;
  }
}

/**
 * jsdom's `HTMLLabelElement.control`, with the expensive branch replaced.
 *
 * The `for` branch natively scans the whole tree for the first element in tree
 * order carrying that id; `getElementById` is defined to return exactly that
 * (jsdom/living/helpers/by-id-cache.js says so in its header comment) and is
 * O(1) amortised. The no-`for` branch natively scans only the label's own
 * subtree, which is already cheap — it is called unchanged.
 */
function controlOf(label: Element, doc: Document): Element | null {
  if (!("control" in label)) return null;
  const native = label as HTMLLabelElement;

  const forValue = native.getAttribute("for");
  if (forValue === null) return native.control;
  if (forValue === "") return null;

  const target = doc.getElementById(forValue);
  if (target === null) return null;

  const verdict = labelable(target);
  if (verdict === undefined) return native.control;
  return verdict ? target : null;
}

function buildIndex(doc: Document): Map<Element, LabelSnapshot> {
  const buckets = new Map<Element, HTMLLabelElement[]>();
  for (const label of doc.querySelectorAll("label")) {
    const control = controlOf(label, doc);
    if (control === null) continue;
    const bucket = buckets.get(control);
    if (bucket) bucket.push(label);
    else buckets.set(control, [label]);
  }
  const sealed = new Map<Element, LabelSnapshot>();
  for (const [control, bucket] of buckets) sealed.set(control, sealSnapshot(bucket));
  return sealed;
}

/** `undefined` means "no fast path for this element" — the caller falls back. */
function snapshotFor(element: Element): LabelSnapshot | undefined {
  const doc = indexDocument;
  const read = readDocumentVersion;
  if (doc === null || read === null) return undefined;
  if (element.getRootNode() !== doc) return undefined;

  const version = read();
  if (version !== indexVersion) {
    indexMap = buildIndex(doc);
    indexVersion = version;
  }
  return indexMap.get(element) ?? EMPTY_LABELS;
}

function resetSharedLabelIndex(): void {
  indexMap = new Map();
  indexVersion = Number.NaN;
}

function patchLabelsGetter(prototype: object | undefined, isLabelable: (el: Element) => boolean): void {
  if (!prototype) return;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "labels");
  if (!descriptor?.get || !descriptor.configurable) return;
  const nativeGet = descriptor.get as NativeLabelsGetter;

  Object.defineProperty(prototype, "labels", {
    ...descriptor,
    get(this: Element): NodeListOf<HTMLLabelElement> | LabelSnapshot | null {
      if (!isLabelable(this)) return null;
      return snapshotFor(this) ?? nativeGet.call(this);
    },
  });
}

function installSharedLabelIndex(): void {
  const view = document.defaultView as (Window & typeof globalThis) | undefined;
  if (!view) return;
  const flags = view as unknown as Record<string, boolean>;
  if (flags[INSTALL_MARKER]) return;

  const read = documentVersionReader(document);
  if (!read || !versionCounterTracksEveryStructuralMutation(document, read)) return;

  indexDocument = document;
  readDocumentVersion = read;
  resetSharedLabelIndex();

  const alwaysLabelable = (): boolean => true;
  patchLabelsGetter(view.HTMLButtonElement?.prototype, alwaysLabelable);
  patchLabelsGetter(view.HTMLMeterElement?.prototype, alwaysLabelable);
  patchLabelsGetter(view.HTMLOutputElement?.prototype, alwaysLabelable);
  patchLabelsGetter(view.HTMLProgressElement?.prototype, alwaysLabelable);
  patchLabelsGetter(view.HTMLSelectElement?.prototype, alwaysLabelable);
  patchLabelsGetter(view.HTMLTextAreaElement?.prototype, alwaysLabelable);
  patchLabelsGetter(
    view.HTMLInputElement?.prototype,
    (el) => (el as HTMLInputElement).type !== "hidden",
  );

  flags[INSTALL_MARKER] = true;
}

if (typeof document !== "undefined") {
  // React act() environment flag for RTL under a manual runner setup.
  (globalThis as Record<string, unknown>)["IS_REACT_ACT_ENVIRONMENT"] = true;
  installSharedLabelIndex();
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
    // Drop element references between tests; the next access rebuilds.
    resetSharedLabelIndex();
  });
}
