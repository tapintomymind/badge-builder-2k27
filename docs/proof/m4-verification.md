# M4 verification record — synergy UI, overlays, feasibility, summary, mobile

Date: 2026-08-25 · Slice M4.1 (constrained mode) · dev server: `npm run dev` at
`http://localhost:5173` (HTTP 200, see `m4-test-output.txt`).

## Screenshot substitution note (batch mode)

This run was executed in autonomous batch mode. The browser tooling available
to the implementer renders live screenshots for in-session inspection but
cannot write PNG files to disk, so the five contracted PNGs
(`m4-390.png`, `m4-768.png`, `m4-1280.png`, `m4-synergy-fuse.png`,
`m4-season-reset-projection.png`) are substituted by this verification record
per the dispatch's batch-mode note. **Every state below was verified live in a
real browser at the stated viewport** — the QE pass captures the actual PNGs.

## 1280 (L) — desktop

- Three-column layout: build rail / grid / right rail (Ledger overview +
  Synergy Slots + Summary).
- Header row: title · build switcher · provenance chip · `Reactions
  activated` + `Season-reset preview` overlay toggles · `Export JSON` /
  `Import JSON`.
- FilterBar: tier chips (A/B/C) · **`Affordable at ≥` as the second
  control** · `Category · 6` disclosure · `Legal for my build` toggle ·
  `0 filters · Clear all` · `53 of 53 badges shown` status line.
- CategoryLedger feasibility line rendering (e.g.
  `6 pts left → nothing else fits at these prices.` on a 3/3-Badge-Slot
  category with no passing upgrades).

### First proof — synergy fuse flow (contract: by minute 60)

1. Unlocked `Synergy Slot 1` via its toggle → `⚡ Fuse` / `↺ Reaction`
   pickers appeared (grouped by Category, `name — level` labels).
2. Assigned `Float Game — Silver` as Fuse → card gained the
   `⚡ Fuse · Synergy Slot 1 +1` chip, solid accent left edge, status
   `Now Silver · Fused to Gold`, accent halo on the Gold pip while the
   Silver pip kept its purchased ring. Ledger unchanged (no Legend, no
   refund).
3. Designated Slot 1 `+2` (banner counter `+2 designated: 1 of 2`) and set
   Fuse to `Ghost Stepper — Gold` → `LEGEND` chip, Legend pip filled,
   Finishing ledger showed `refunded 4`, `left 10` — the Legend refund
   flowing per the committed (all-unlocked) basis.

### Season-reset preview — the H2 visual proof

With the Gold+2→Legend fuse on TEMPORARY Slot 1, toggling
`Season-reset preview` produced, simultaneously:

- PreviewModeStrip, exact copy: `Preview: season reset. Synergy Slots 1–4
  disabled. Primary points are unchanged; 1 of 6 categories show a
  projection.`
- PRIMARY Finishing row **unchanged**: `Badge Points 10 / 16 · left 10 ·
  refunded 4`.
- A second, labelled projection row below a dashed rule, in the info color
  one size down: `⟳ After season reset · Badge Points 10 / 16 · left 6 ·
  refunded 0`.
- Synergy Slot 1 row dimmed with `⟳ Disabled by season-reset preview`,
  controls still operable.
- No other category rendered a projection row (their projections are
  identical to their primaries).

## 768 (M) — tablet

- Two columns; right rail dissolved: `#panel-synergy` and `#panel-summary`
  render full-width BELOW the grid (verified via DOM order +
  `getComputedStyle`), Ledger overview hidden.
- Jump nav gained the `Synergy` / `Summary` chips (8 links total).
- FilterBar wraps to two lines; ledger + projection row intact.

## 390 (S) — mobile

- Single column, DOM order; no horizontal scroll
  (`document.scrollWidth === 390 === innerWidth`).
- Header stacks to three rows; strip, Build digest
  (`6'6" · 28 pts · 5 Badge Slots`), sticky jump nav all present.
- Synergy panel: designator banner first (counter live), full-width native
  selects (system picker sheets on device), locked rows show
  `Locked — unlock to assign badges` with no pickers.
- Summary: `Badges by level` table with `Legend (boost) 1` as a separate
  row (Legend never bought), `Spend by category` with `Total 10 / 28`
  headline, Export/Import buttons.
- Nothing removed at mobile — all filters, overlays, panels operable.

## Automated gates (see m4-test-output.txt)

- `npm test`: 28 files, 443 tests, all green — including BOTH H2 UI
  regressions (`tests/ui/overlays.test.tsx`): the reactions-only ledger
  regression and the primary-row invariance regression across all 4 overlay
  combinations, plus the projection-row-exactly-when-seasonReset assertion.
  The `basis → OverlayState` totality test (reactionsActive a literal false
  in both cases) lives in the M2 suite (`tests/synergy-ledger.test.ts`,
  item 12) and runs green in the same command.
- `npm run typecheck`: clean.
- `npm run build`: succeeds (tsc + vite build).
- Runtime `dependencies`: exactly `{react, react-dom}` (tripwire test green).
- Vocabulary lint green — no bare "slot" in `src/**`.
- No `tierCosts` read and no ranking/"best/recommended/optimal" language
  anywhere in `src/ui/**` (grep-verified; only a prohibition-documenting
  comment mentions the words).
