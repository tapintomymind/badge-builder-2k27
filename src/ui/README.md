# `src/ui/` — the shell

React components. **Contains zero rules.**

Components render what `src/engine/` returns. If a component needs a number the
engine does not expose, that is the moment a rule is about to be hard-coded into
the view — stop, and extend the engine contract instead. Do not compute it here.

## Layout (M3)

- `primitives/` — Button, Toggle, NumberField, HeightField, SegmentedControl,
  Chip, Section, Banner, Hint, Meter (design-spec §3.1)
- `shell/` — AppHeader, ProvenanceChip, DriftBanner, AutosaveWarning (§3.2)
- `build/` — BuildPanel (+ PhysiqueSection), AttributeGrid, BudgetGrid
  (+ BudgetTotalRow) (§3.3)
- `grid/` — JumpNav, CategoryLedgerDigest, CategoryLedgerLede, BadgeGridSection, BadgeCard
  (+ LevelPipRow) (§3.4)
- `builds/` — BuildSwitcher + BuildManagerDialog (§3.6)

Hard contract: every card renders its level via the engine's
`effectiveLevel(state, badgeId, overlay)` — never `purchasedLevel` directly.
`window.localStorage` is untouchable here; all storage I/O goes through
`src/persist/`.
