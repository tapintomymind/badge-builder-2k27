# `src/config/` — the seams

Configuration for the parts of the game that are not yet published.

Where a rule depends on a value that has not been confirmed, the rule is not
hard-coded — it reads from here, behind a named seam with a documented default.
When the real value is published, the change is a config edit, not a rewrite.

## The three seams (M1)

| Seam | Default | Unpublished fact it stands in for |
|---|---|---|
| `refundTrigger` | `legendByAnyMeans` (the seed's stated default) | The exact refund trigger condition |
| `plusTwoSlotIds` | `null` — user designates two in the Synergy panel (M4) | Which two synergy slots carry +2 |
| `deriveBudget` strategy | `manual` (user inputs); `derived` throws `NotYetPublishedError` | The attribute → (equipSlots, points) derivation |

When 2K publishes any of these, the change is a value edit here (M5) — never a
rewrite, and never a guess in the meantime.
