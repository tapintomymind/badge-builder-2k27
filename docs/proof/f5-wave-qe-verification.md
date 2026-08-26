# QE verification record — F2.1 → F3 → F5.0 → F5 wave

Date: 2026-08-25 · Agent: Quality Engineer (runtime axis) · Branch `dev` @ `2a55cf2`
Dev server: pre-existing `npm run dev` at `http://localhost:5173` (HTTP 200; not restarted).
Commits under test: `830d64c` (F2.1) · `a2e37f4` (F3) · `3a12f64` (F5.0) · `ad4d382` (F5).

All numbers below were hand-derived from the sealed seed
(`workspace/badge-builder-2k27/seed.md`) and then checked against the running
UI — never read off the UI and accepted.

## Screenshot note

Same limitation as the M4 record: the browser tooling available to this agent
renders live screenshots for in-session inspection but cannot write PNG files
to disk. Screens were inspected live at 1280; this record carries the measured
DOM/computed-style values instead, which are the load-bearing evidence.

## 1. Regression floor — PASS

| Gate | Result |
|---|---|
| `npm test` | **40 files / 623 tests, all passed** (28.67s) |
| `npm run typecheck` | clean, exit 0 |
| `npm run build` | `tsc --noEmit` clean + vite build ok — 64 modules; `index.html` 0.40 kB, CSS 34.63 kB (gzip 6.61), JS 272.84 kB (gzip 82.94); 95ms |
| Runtime deps | **exactly `{react@19.2.8, react-dom@19.2.8}`** — `npm ls --omit=dev --depth=0` lists only those two |

Re-run after rebasing onto `b22f8ab` (F6), which added two test files:
**40 files / 631 tests, all passed**; typecheck still clean. The dependency
tripwire is unchanged.

Dataset integrity re-derived from the seed: 53 badges · per-category
11/9/10/12/5/6 · tiers 22 A / 15 B / 16 C · exactly one null threshold
(`unpluckable`) · all heights within 69–88 · `tierCosts` A[3,5,6,7]
B[2,4,5,6] C[1,3,4,5]. All match.

## 2. H2 guardrail — PASS (highest-value check)

Fixture: height 78, all attributes 99, every category `{equipSlots 5, points 20}`.
Loadout — `posterizer` HOF (A=7), `aerial-wizard` HOF (C=5), `limitless-range`
HOF (A=7), `interceptor` Gold (B=5), `glove` Gold (B=5).
Synergy — slot 1 **temporary** fuse=`posterizer` reaction=`interceptor`;
slot 5 **permanent** fuse=`aerial-wizard` reaction=`glove`;
slot 6 **permanent** fuse=`limitless-range`.

Primary ledger row, **bit-identical in all four overlay combinations**
(reactions off/on × season-reset off/on):

```
Finishing 12/20 · 2/5   Shooting 7/20 · 1/5   Playmaking 0/20 · 0/5
Defense   10/20 · 2/5   Rebounding 0/20 · 0/5 Physicals  0/20 · 0/5
```

Projection row — appears **only** under season-reset (identical whether
reactions are on or off), and **only one row in the whole document**:

```
⟳ After season reset · Badge Points 12 / 20 · left 13 · refunded 5   [Finishing only]
```

Hand-derivation: season reset disables temporary slot 1, so `posterizer`
(HOF) loses its +1 and is no longer Legend → its 7-point refund drops out →
Finishing refunded 12 → 5 and left 20 → 13. Shooting's Legend comes from
**permanent** slot 6, so Shooting is unchanged and correctly renders **no**
projection row. Defense's two badges hold reaction roles only, which the
ledger structurally ignores.

**`data-*` leak audit.** Zero `data-*` attributes exist anywhere inside
`.ledger-overview`, `.category-ledger`, or any summary subtree — measured in
all four combinations. Source-side, the only `data-*` in `src/ui/**` are
`data-permanence` (SynergyPanel), `data-level` / `data-state` (pips), and
`data-purchased-level` / `data-tier` / `data-stale` (BadgeCard root).
`data-purchased-level` carries the **committed purchased** level, not an
effective/overlay-variant one. Nothing F5 added is keyed to an overlay value,
and nothing reached a ledger or summary node.

Engine-side control confirmed by reading `src/engine/synergy-ledger.ts`:
`ledger(state, basis)` takes a `LedgerBasis`, a different type from
`OverlayState`, so the signature cannot accept `reactionsActive`;
`overlayForBasis` is total over its two cases with `reactionsActive` a literal
`false` in both.

## 3. F3 slider commit semantics — PASS

Driven on the 3PT slider against purchased `limitless-range`
(seed: 3Pt 83/89/93/99, purchased at HOF).

| Check | Evidence |
|---|---|
| No recompute mid-drag | 5 consecutive `input` events 99→50 with **no** `change`: slider + numeric echo tracked to 50, but the card stayed `B ✓ S ✓ G ✓ H ✓` with `data-stale` **null** — grid did not recompute |
| Recompute on release | dispatching native `change` → card became `🔒 — 🔒 — 🔒 — H ⚠`, `data-stale="true"` |
| Stale disclosure on release | fired exactly on the release event, not during the drag |
| ←/→ = 1 | ArrowRight 50 → **51** |
| Shift+Arrow = 10 | Shift+ArrowRight 52 → **62**; Shift+ArrowLeft 62 → **52** |
| Commit lands in state | autosave `build.attributes.threePt` = 52 after the keyboard commits |
| Paired numeric commits | typed `95` + Tab → slider 95, persisted 95, grid recomputed to `B ✓ S ✓ G ✓ H ⚠` (95 clears Gold's 93, misses HOF's 99 — matches the seed) |

## 4. F3 position clamping — PASS

Bounds in `src/data/position-heights.ts` match the user-supplied table exactly:
PG 69–79 · SG 72–80 · SF 76–82 · PF 77–84 · C 79–88.

| Case | Result |
|---|---|
| SF from 6'2" | 74 → **76**; notice `⚠ Height adjusted 6'2" → 6'4" to fit SF's range (6'4"–6'10").`; SR announce `Position set to SF. Height adjusted to 6'4".` |
| PG from 7'4" | 88 → **79**; notice `⚠ Height adjusted 7'4" → 6'7" to fit PG's range (5'9"–6'7").` |
| C from 6'6" | 78 → **79** (nearest bound, clamps up) |
| "Any" / unset | hint reads `5'9"–7'4", the range this dataset covers.` — full dataset range |
| Round-trip | all five positions **and** unset survive `serialize → deserialize` exactly; `position: "SF"` also survived a real file import through the Import JSON dialog |

See DEFECT-1 for a wording issue in the clamp notice's trailing sentence.

## 5. Eligibility spot-check — PASS (4/4)

Hand-derived from the seed with a deliberately discriminating build
(layup 95, strength 75, mid 95, threePt 60, postControl 99, ballHandle 50,
height 78), then read off the cards:

| Case | Badge | Derived | Card |
|---|---|---|---|
| **AND** | Physical Finisher [B] — Layup 60/80/90/96 AND Str 60/70/80/90 | max **Silver** (Str 75 < 80 binds at Gold) | `B +2  S +4  🔒  🔒` · *"needs 80 Str for Gold"* |
| **OR** | Deadeye [A] — Mid 65/85/92/99 OR 3Pt 65/85/92/99 | max **Gold** (Mid 95 carries; 3PT 60 alone would cap at Bronze) | `B +3  S +5  G +6  🔒` · *"needs 99 Mid or 99 3Pt for HOF"* |
| **null HOF** | Unpluckable [A] — Post Ctrl 65/86/96/**—** OR Ball Hdl 65/80/92/97 | max **Gold**; HOF unreachable via Post Ctrl at *any* value | `B +3  S +5  G +6  🔒` · *"needs 97 Ball Hdl for HOF"* — correctly never offers Post Control as an HOF route |
| **height-blocked** | Mini Marksman [C] 5'9"–6'4" at 6'6" | blocked entirely | all levels `🔒` · *"Blocked — requires height 5'9"–6'4" (build is 6'6")"* |

Pip costs match the seed's tier table on every card. The F5 restyle did not
regress gating: pip `data-state` is eligibility-derived, not overlay-derived.

## 6. F2.1 heal + load-route disclosure — PASS

**Boot route.** Seeded an autosave whose slot-1 fuse referenced
`limitless-range` and whose slot-5 reaction referenced `glove` — neither in
the loadout. App booted **clean** (no crash, no `MalformedSavedBuildError`) and
disclosed:

> 2 synergy assignments referenced badges not in this build's loadout:
> Synergy Slot 1 Fuse → Limitless Range, Synergy Slot 5 Reaction → Glove — cleared.

Plan intact: loadout byte-identical to the original; the *valid* slot-5 fuse
(`aerial-wizard`) survived; ledger hand-checks (Finishing 11/20 = posterizer
HOF 7 + aerial-wizard Gold 4; Defense 4/20 = interceptor Silver 4; left 9 =
20 − 11 + 0, no Legend so no refund).

**On the "original is not silently destroyed" clause:** the autosave envelope
*is* rewritten on boot with the healed version (`savedAt` 2026-08-20 → boot
time). Nothing the user authored is lost — only the two stranded, unusable
references — and the clearing is disclosed loudly and specifically before any
further edit. Not silent. Recorded here so the behaviour is on the record.

**Named-build LOAD route.** Loaded a named build carrying *both* failure
classes — a loadout entry absent from the dataset and a stranded synergy ref:

> 1 badge from this build no longer exists in the dataset:
> ghost-badge-removed-from-dataset — removed from the plan.
> 1 synergy assignment referenced a badge not in this build's loadout:
> Synergy Slot 1 Fuse → Limitless Range — cleared.

Both classes disclosed on the load route. Post-load ledger hand-checks
(Finishing 7/20 · 1/5 with refunded 7 — slot-5 fuse pushes posterizer HOF to
Legend; Defense 4/20 · 1/5).

**F2 switcher guard** verified in passing: loading over a dirty working build
prompts `Replace the working build "…" with "…"? Unsaved changes will be lost.`
and the passive default keeps the user's work.

## 7. F5 metallic identity (1280, quick confirmation) — PASS + one note

Measured `.pip__dot` computed styles per level:

- **Zero state — locked-pip rim ladder present.** Each pip is a hollow ring
  (`background-image: none`, dark fill) with a distinct per-level rim:
  bronze `#CD8B47` · silver `#C9D1D9` · gold `#E3B341` · HOF `#A371F7` ·
  legend `#F778BA`. No grey wall.
- **Owned — metallic face.** `linear-gradient(160deg, <-hi> 0%, <base> 55%,
  <base> 100%)` per level, darker per-level border, `#0D1117` glyph
  (`--fg-on-accent`). Five metals visually distinct.
- **Role treatments distinct:** `badge-card--fuse`, `badge-card--reaction`,
  `badge-card--blocked` all resolve to different card classes; `⚡ Fuse` /
  `↺ Reaction` chips and the `LEGEND` chip render.
- **Stale reads as flat tarnish:** stale pip carries `⚠` with no specular
  highlight.
- **Collision audit — clean.** Every `.banner--warning`, `.chip--warning` and
  `.btn--danger-ghost` computes `background-image: none`. A whole-document
  sweep found **zero** gradients on any element whose class matches
  `danger|warning|error|stale|tarnish`. Semantic states cannot be confused
  with the gold/bronze chrome.
- **Console: zero application errors** across the entire session (only Vite
  HMR chatter, the React DevTools notice, and the harness's own
  native-dialog-suppression warnings).

## Findings

### DEFECT-1 — clamp notice can attribute a pre-existing disqualification to the clamp (P3, low)

`src/App.tsx:490-497`:

```ts
const staleBefore = stalePurchaseCount(prev.loadout, prev.build);
const staleAfter  = stalePurchaseCount(prev.loadout, nextBuild);
const staleChanged = staleAfter !== staleBefore;
staleCount: staleChanged && staleAfter > 0 ? staleAfter : null,
```

The sentence fires when the count **changed**, but reports the **total after**
(`staleAfter`) with the causal wording *"N purchased badge(s) no longer
qualify"*. When a clamp *reduces* the disqualified count but leaves ≥1
standing, the surviving badge — disqualified for an unrelated reason — is
announced as though the height change broke it.

**Repro.** Loadout `posterizer` HOF, `glove` Gold, `limitless-range` HOF;
3PT = 95 (so `limitless-range` is already attribute-stale: seed needs 99 for
HOF). Position unset, height 7'4" → `glove` (5'9"–7'0") is height-blocked, so
2 are disqualified. Click **PG** → height clamps to 6'7", which *fixes* Glove;
1 remains (Limitless Range, on an attribute threshold the clamp never
touched). Notice reads:

> ⚠ Height adjusted 7'4" → 6'7" to fit PG's range (5'9"–6'7"). **1 purchased badge no longer qualifies.**

Control cases confirming the mechanism: with 3PT = 99 the same PG clamp goes
1 → 0 and correctly prints no sentence; a C clamp 6'6" → 6'7" that changes
nothing goes 1 → 1 and correctly prints no sentence.

**Suggested fix** — either report only the newly-disqualified delta, or drop
the causal framing, e.g. *"1 purchased badge does not qualify at this height."*
Seed/scope citation: seed §"Working agreements" (never invent, disclose
accurately); the count itself is accurate as a total — only the causation is
wrong. No ledger impact, no data loss.

### OBSERVATION-1 — informational `--warning` banners carry no `⚠` (P3, spec ruling needed)

design-spec §2.7.4 rule 2 (line 615): *"Every warning state keeps `⚠`."* The
three `.banner--warning` instances and the `.chip--warning` ("Temporary") badge
carry no `⚠` in text or in `::before` / `::after`. The unambiguous warning
*states* do carry it (stale pip `H ⚠`, clamp notice `⚠`, `over by N ⚠`), and
the never-gradient half of the rule passes everywhere. Designer should rule
whether informational `--warning` banners fall under "warning state" or are a
separate class.

## Coverage — what was NOT tested

Dropped under a mid-run scope narrowing because F5.2 re-cuts the layout:

- 768 and 390 viewports (both unverified this pass).
- Slider hit area ≥44px at S, and vertical page scroll when a drag starts on a
  slider — **unverified**, and the only F3 acceptance items left open.
- JumpNav chip placement; right-rail contents; 3-up/2-up/1-up card counts at
  768/390.

Deliberately not exercised per dispatch: **Rename** and **Clear saved data**
(known P0/P1 data-loss defects under repair in F2.2).

Known and excluded from findings: the 176px right rail's ragged wrapping, and
the three §10 items that could not ship presentation-only.

### 1280 geometry — measured at `2a55cf2`, since SUPERSEDED by F6 (`b22f8ab`)

- `.layout` `grid-template-columns` = **`280px 768px 176px`** (F5.0's re-cut).
- **Left rail `scrollWidth` 280 === `clientWidth` 280** — no horizontal
  overflow. The user-reported Position-control overflow bug is **fixed**.
- Document `scrollWidth` 1280 === `clientWidth` 1280 — no page-level h-scroll.
- `.segmented__track` — 6 children across 2 distinct row-tops → **2 rows of 3**.
- `.grid-section__cards` = `248px 248px 248px` → **3-up**.

**Superseded.** `b22f8ab` (F6, right-rail re-cut) landed on `dev` while this
pass was running and moves L to **258 / 204** with a new XL tier. The rail
widths and the 3-up card count above therefore describe `2a55cf2` only. The
load-bearing result — that the left rail no longer overflows — must be
re-confirmed against the new geometry; it is **not** carried forward by this
record.

## Ship call

**SHIP** for the eventual `dev → main` promotion. 623/623 green, typecheck and
build clean, dependency tripwire intact, and the two highest-risk invariants —
the H2 ledger/overlay separation and F3's preview/commit split — both hold
exactly as specified. The one defect is a P3 wording issue in a disclosure
sentence; no blocker. Promotion should carry the caveat that 768/390 and the
slider touch-target items are unverified this pass and want a follow-up once
F5.2 lands.
