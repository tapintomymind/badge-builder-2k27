# Test-harness verification record — shared label index

Date: 2026-08-25 · Branch `test-harness-labels` · Base `b94d403` (`origin/dev`)
· Files touched: `tests/setup-dom.ts`, `tests/ui/shared-label-index.test.tsx`,
this record. `vite.config.ts` untouched; runtime `dependencies` untouched
(still exactly `{react, react-dom}`); the `{ timeout: 20000 }` values F2.2
added are untouched.

Machine: 10-core Darwin 25.5.0, node v25.9.0, vitest 4.1.11, jsdom 30.x. Other
agents were active in the same checkout family throughout, so load average sat
between 10 and 21. Every timing below is therefore INTERLEAVED before/after in
the same loop, not measured in separate blocks.

## 1. The cause, measured independently

A throwaway probe (`tests/ui/zz-probe-labels.test.tsx`, deleted after use)
rendered the real `<App />` and measured:

```
SHAPE      nodes=3951  elements=2371  <label>=309  labelable=317  (56 labels carry `for`)
CLEAN      getByLabelText, no intervening mutation ......  34.4, 31.9, 30.0, 29.3, 28.7 ms
DIRTY      getByLabelText, immediately after a mutation .. 683.9, 678.4, 682.5, 717.6, 666.3 ms
ROLE       getAllByRole, after a mutation ...............  117.9, 63.5, 60.9, 58.8, 58.6 ms
RAW        querySelectorAll, after a mutation ...........    4.4, 6.1, 7.1, 3.6, 4.8 ms
```

The element/label/labelable counts and the clean/raw figures reproduce the
prior agent's numbers exactly. The post-mutation figure is ~15% higher here
(666–718 ms vs the reported 565–583 ms), consistent with the heavier machine
load; the ratio — ~20x — is the same.

**One reported measurement did NOT reproduce as stated.** "Pre-touching
`.labels` then querying = 35 ms (cost fully absorbed)" is only true if you
pre-touch every element AND count the pre-touch as free:

```
TOUCH_ALL   touching .labels.length on all 317 labelable elements ..  574.0, 541.0, 540.3 ms
AFTER_TOUCH the getByLabelText that follows ......................    48.3, 32.2, 29.3 ms
```

The cost is **moved, not absorbed** — and touching `.labels` on a *single*
element costs 0.0 ms, because jsdom's getter only hands back the NodeList; the
walk happens later, inside `NodeList._update()`, on the first `length`/index
read. That distinction is what makes the fix below possible.

### Mechanism, read out of jsdom's source

- `jsdom/living/helpers/form-controls.js → getLabelsForLabelable()` builds a
  live NodeList per element whose query is
  `for (const d of treeIterator(root)) if (d.control === labelable) …` — a full
  document walk.
- `jsdom/living/nodes/NodeList-impl.js → _update()` re-runs that query whenever
  `this._version < this._element._version`, where `_element` is the ROOT node.
- `jsdom/living/nodes/Node-impl.js → _modified()` bumps `_version` on the
  mutated node *and every ancestor*, so any mutation anywhere bumps the
  document's counter and invalidates all 317 NodeLists at once.
- `@testing-library/dom/label-helpers.js → getRealLabels()` reads
  `element.labels` for every labelable element, and `getLabels()` immediately
  does `Array.from(...)` — which triggers `_update()`. Hence 317 walks per
  query. It is quadratic in grid size: elements x labelable elements.

`HTMLElement.prototype.labels` does not exist, incidentally. jsdom defines the
getter on the seven concrete interfaces (`HTMLInputElement`,
`HTMLButtonElement`, `HTMLSelectElement`, `HTMLTextAreaElement`,
`HTMLMeterElement`, `HTMLOutputElement`, `HTMLProgressElement`); the patch
targets those.

## 2. The fix, and the alternative that was rejected

All 317 walks compute slices of ONE relation: label → control. `setup-dom.ts`
now builds that relation once per DOM version in a single pass and serves every
element from it. Measured cost of the pass: **0.8–2.1 ms**, versus 540–718 ms
for the 317 walks it replaces.

**Rejected: a `MutationObserver.takeRecords()` dirty check.** The dirty check
instead reads `document[Symbol("impl")]._version` — the very counter jsdom's
own NodeList compares against. Three reasons:

1. **It cannot be staler than unpatched jsdom, by construction.** Any mutation
   class the counter misses is a class native `.labels` also misses, so the
   694 existing tests already depend on it being complete. A MutationObserver
   is a *different* signal: it can diverge in both directions (jsdom bumps
   `_version` for `<option>` selectedness with no mutation record; observers
   see records for things the counter ignores). Diverging toward *fresher than
   native* is still a behaviour change, and "identical pass/fail set" is the
   requirement.
2. Undrained `childList` records retain removed nodes via
   `MutationRecord.removedNodes`, which is a retention hazard across a 46-file
   suite that unmounts a large tree per test.
3. It adds per-mutation record allocation to every DOM test.

The internal read is fenced. `versionCounterTracksEveryStructuralMutation()`
runs at setup time and requires the counter to move for insertion, removal,
move (`insertBefore`), replacement (`replaceChild`), subtree removal, and
attribute set / change / removal. If the symbol is missing, `_version` is not a
number, or **any** of those classes fails to bump, nothing is patched and jsdom
is left exactly as it is — slow, but untouched. Measured coverage:

```
appendChild=BUMP  setAttr=BUMP  changeAttr=BUMP  removeAttr=BUMP  setId=BUMP
appendText=BUMP   textContent=BUMP  insertBefore=BUMP  replaceChild=BUMP
removeChild=BUMP  innerHTML=BUMP  classList=BUMP  inputTypeAttr=BUMP
removeSubtree=BUMP
charData=NOBUMP   detachedMutation=NOBUMP
```

`charData` is deliberately not required: the relation is element-identity only,
so text edits cannot change it. `detachedMutation` is why elements whose root
node is not their own document (detached subtrees, shadow roots, foreign
documents) bypass the index entirely and fall through to the native getter.

Only the `for` branch of `HTMLLabelElement.control` is reimplemented (as
`getElementById`, which `jsdom/living/helpers/by-id-cache.js` documents as
returning the first element in tree order — the same thing jsdom's own scan
returns, but O(1) amortised instead of a full walk). The no-`for` branch calls
native `label.control` unchanged, because it only scans the label's own
subtree. A `for` target that is a custom element also defers to native, since
form-associated-ness is not visible from the wrapper.

## 3. Correctness evidence

### Fidelity against an independent oracle

`tests/ui/shared-label-index.test.tsx` recomputes the relation from
`HTMLLabelElement.control` — which is **not** patched — over the whole rendered
App and compares it element by element:

```
FIDELITY checked=317 mismatches=0
```

### Staleness guard, and proof it can fail

Twelve cases, each priming the memo at the pre-mutation DOM version and then
mutating + re-querying in the same synchronous block. Priming matters: without
it, a case whose first `.labels` read happens after its mutation passes against
a memo that never invalidates at all.

Three sabotages were applied to `tests/setup-dom.ts` and the guard re-run:

| Sabotage | Result |
|---|---|
| Version comparison in `snapshotFor()` disabled (memo never invalidates) | **8 of 12 fail** |
| Detached-element fall-through removed | detached case fails |
| `type="hidden"` rule dropped | hidden case fails |

The four cases that survive sabotage 1 do not exercise invalidation (shape
reads, detached fall-through, the install check, and the hidden-input case,
whose labelable test is evaluated live rather than memoised).

### Identical pass set

`vitest run --reporter=json` at base `b94d403` and on this branch, keyed by
`file :: full test name`:

```
baseline entries: 694
after entries:    706  (694 pre-existing + 12 in the new guard file)
missing after:      0
added (not in baseline, excluding the new file): 0
status changed in either direction:              0
baseline all passed: true   after (pre-existing files) all passed: true
```

One caveat worth recording: the very first baseline run of the session — cold
Vite transform cache, load average ~21 — produced 693/694, and a later
default-reporter baseline run produced 687/694. Both were the known F2.2 flake
class (heavy files crossing a timeout under parallel load); the failing file
passed standalone immediately after. Three clean interleaved baseline runs at
694/694 were used for the comparison above. No post-change run has flaked.

## 4. Timings (interleaved, 3 runs each)

`tests/ui/f2-builds-persistence.test.tsx` in isolation:

| Run | Before wall | Before `tests` | After wall | After `tests` |
|---|---|---|---|---|
| 1 | 25.65 s | 24.48 s | 7.13 s | 5.93 s |
| 2 | 26.11 s | 24.93 s | 7.14 s | 5.93 s |
| 3 | 25.97 s | 24.77 s | 7.43 s | 6.07 s |
| spread | 0.46 s | 0.45 s | 0.30 s | 0.14 s |

Full suite (`npm test`):

| Run | Before wall | Before `tests` | After wall | After `tests` |
|---|---|---|---|---|
| 1 | 35.52 s | 148.55 s | 11.30 s | 54.23 s |
| 2 | 36.09 s | 151.11 s | 12.84 s | 64.02 s |
| 3 | 34.67 s | 144.36 s | 11.27 s | 54.84 s |
| spread | 1.42 s | 6.75 s | 1.57 s | 9.79 s |

`tests` is vitest's summed per-file test time across the worker pool, so it
exceeds wall time; the "after" column also carries 12 extra tests. Roughly 3.0x
on full-suite wall, 3.6x on the isolated file's wall, 4.1x on its test time.

## 5. The F2.2 timeouts now look generous — your call

Not changed, per the dispatch. For the record, slowest individual tests in a
full run:

| | Before | After |
|---|---|---|
| slowest single test | 13 444 ms | 2 695 ms |
| tests over 5 000 ms | 4 | 0 |
| tests over 3 000 ms | 18 | 0 |
| tests over 1 000 ms | 45 | 14 |
| slowest file | f2-builds-persistence 34.7 s | f2-builds-persistence 10.1 s |

Before, the worst case sat 13.4 s into a 20 s budget — 6.6 s of headroom under
an already-loaded machine, which is why it flaked at the 5 s default in the
first place. After, the worst case is 2.7 s: comfortably under even the 5 s
default, with 7.4x headroom against the 20 s override. The overrides are now
much larger than needed, but they are also harmless, and removing 20+
annotations is a separate change with its own review surface.

## 6. Residual risk

**Native `.labels` is a live NodeList; the index returns a frozen array-like
snapshot for the current DOM version.** Re-reading `element.labels` always
yields a current answer — that is what the guard tests assert — but a reference
*cached in a local variable across a mutation* will not self-update, where the
native NodeList would.

Surveyed consumers: `src/**` and `tests/**` use `.labels` zero times;
`@testing-library/dom` null-checks then immediately `Array.from`s;
`dom-accessibility-api` null-checks then immediately copies. None holds a
reference across a mutation. The returned object carries `length`, index
access, `item()`, and iteration, so it is NodeList-shaped for every realistic
read; what it is not is `instanceof NodeList`.

If that trade is unacceptable, the fallback is to delete `installSharedLabelIndex()`
and its call — `tests/setup-dom.ts` reverts to its previous behaviour with no
other coupling, and the guard file's "is actually installed" case is the thing
that will tell you loudly that it happened.

## 7. Forward check against a moved `origin/dev`

`origin/dev` advanced from `b94d403` to `9bd851c` while this work was in
flight (`e11e8f1` F5.2 layout re-cut — `src/App.tsx`, `src/styles/app.css`,
`tests/layout-arithmetic.test.ts`, `tests/ui/f2-source-pins.test.ts`,
`tests/helpers/test-utils.ts`; then `9bd851c`). This branch is still based on
`b94d403`, per the dispatch, and was NOT merged. A throwaway trial merge
(`git merge --no-commit --no-ff origin/dev`, aborted afterwards) confirms:

- merges cleanly, no conflicts;
- full suite on the merged tree: **713/713** (701 pre-existing at the new dev
  tip + the 12 guard tests);
- the win survives the layout re-cut, and grows — the re-cut made the
  unpatched baseline slower:

| | Before | After |
|---|---|---|
| full suite wall | 36.97 s / 38.76 s | 11.21 s / 12.47 s |
| f2-builds-persistence wall | 29.14 s / 30.64 s | 7.27 s / 7.87 s |

Whoever merges should re-run the pass-set diff against the actual merge base
at that time; the 694-name comparison in §3 is against `b94d403`.
