# `src/config/` — the seams

Configuration for the parts of the game that are not yet published.

Where a rule depends on a value that has not been confirmed, the rule is not
hard-coded — it reads from here, behind a named seam with a documented default.
When the real value is published, the change is a config edit, not a rewrite.

## The three seams (M1)

| Seam | Default | Unpublished fact it stands in for |
|---|---|---|
| `refundTrigger` | **`onFuse`** (F4 — official 2K MyPlayer Builder page + user ratification 2026-08-26; the three Legend/HOF triggers remain selectable alternates) | **RESOLVED.** Fusing a badge frees the tokens spent on it |
| `plusTwoSlotIds` | `null` — a DEAD seam, retyped for shape only. Nothing writes it; the designator writes magnitudes onto the slots | **HALF-RESOLVED.** Synergy Slot 7 IS a +2 (ratified, `RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS` in `src/engine/synergy.ts`); which further Synergy Slot carries the second is still unpublished |
| `deriveBudget` strategy | `manual` (user inputs); `derived` throws `NotYetPublishedError` | The attribute → (equipSlots, points) derivation |

When 2K publishes any of these, the change is a value edit here (M5) — never a
rewrite, and never a guess in the meantime.
