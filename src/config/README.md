# `src/config/` — the seams

Configuration for the parts of the game that are not yet published.

Where a rule depends on a value that has not been confirmed, the rule is not
hard-coded — it reads from here, behind a named seam with a documented default.
When the real value is published, the change is a config edit, not a rewrite.

_Empty until the engine milestone. This stub exists to fix the convention in
place before any code lands._
