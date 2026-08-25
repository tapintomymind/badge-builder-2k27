# Vocabulary — badge-builder-2k27 (H1 glossary)

One page. These words mean exactly one thing each, everywhere — identifiers,
tests, and user-visible copy. `tests/vocabulary.test.ts` lints the codebase
against the one banned token.

## The banned token: bare `slot`

Two unrelated resources both want the word "slot." They never share it:

| Concept | Code identifiers | UI copy |
|---|---|---|
| Per-category capacity for equipped badges | `equipSlots`, `equipSlotsUsed` | **"Badge Slots"** — e.g. `Finishing — Badge Slots 2/3` |
| The 8 global fuse/reaction pair slots | `synergySlots`, `SynergySlot`, `SynergySlotId` | **"Synergy Slots"** — e.g. `Synergy Slot 5 · Permanent · +2` |

Bare `slot` / `slots` / `slotCount` / `numSlots` — without an `equip` or
`synergy` prefix (or, in copy, the "Badge " / "Synergy " qualifier) — is a
lint failure.

## Equipped

**A badge is EQUIPPED iff it has a `LoadoutEntry` — purchased ≡ equipped.**
There is no benched state and no `equipped` flag: the loadout record is
`{ badgeId, purchasedLevel }` and nothing else.

- `equipSlotsUsed(category)` = the number of loadout entries whose badge is in
  that category.
- A badge occupies an equip slot at ANY level — a badge boosted to Legend
  still occupies one.
- **Removal (not downgrade) is the only way to free an equip slot.**
  Downgrading to Bronze returns points but keeps the equip slot occupied. The
  UI therefore needs a remove affordance distinct from its downgrade
  affordance.

## Levels

| Term | Values | Notes |
|---|---|---|
| `Level` | bronze · silver · gold · hof · legend | The full 5-level ladder. |
| `PurchasableLevel` | bronze · silver · gold · hof | `Exclude<Level, "legend">`. **Legend is boost-only** — it can never be purchased, and cost tables have no Legend entry. `costForLevel` throws on Legend. |

## Tier vs Category vs AttrGroup

| Term | Values | What it groups |
|---|---|---|
| `Tier` | A · B · C | Cost band of a badge. |
| `Category` (capitalized, 6) | Finishing · Shooting · Playmaking · Defense · Rebounding · Physicals | **Badges** — and the per-category points/equip-slot pools. |
| `AttrGroup` (lowercase, 6) | finishing · shooting · playmaking · defense · rebounding · physicals | **Attributes** — layout grouping for the build panel. |

`Category` and `AttrGroup` are SEPARATE constants and must never be derived
from one another: cross-group badges exist (Physical Finisher is category
`Finishing` but requires `strength`, a Physicals attribute).

## Attr

The canonical 20-value attribute union (`close` … `vertical`), exactly the
seed's `Attr` type. The source text's short labels ("Dr Dunk", "3Pt", "SWB")
map to it via the generator's alias map — a tested bijection.

## Ledger words

| Term | Meaning |
|---|---|
| `spent(category)` | Σ total-to-own cost of the category's loadout entries. Derived from state — never accumulated. |
| `refunded(category)` | Σ cost of entries whose refund trigger currently fires. Returns to that badge's own category pool. |
| `remainingPoints(category)` | `pool − spent + refunded`. May go negative — overspend is a SOFT warning, never a block. |
| `whatIf(badgeId, target)` | Cost delta of moving one badge to a target level (upgrades pay the difference; downgrades return it). |

## Provenance words (H8)

| Term | Meaning |
|---|---|
| `dataVersion` | Monotonic date-sequence id of the dataset snapshot (e.g. `2026-08-25.1`). Stamped into every `SavedBuild`. |
| `gameVersion` | The 2K27 patch the dataset reflects — `null` until known. **Never guessed.** |
| `confidence` | `pre-release` · `launch` · `patched`. |
