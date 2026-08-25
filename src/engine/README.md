# `src/engine/` — the rules

Pure TypeScript. **No DOM, no React, no I/O.** Nothing here imports from `src/ui/`
or from `react`.

Every rule in this project lives here: costs, eligibility, the points ledger,
synergy resolution, effective level. If a number appears on screen, it was
computed in this directory.

Fully unit-testable in isolation — that is the point. The entire correctness
surface of the tool sits behind a DOM-free boundary so it can be covered by fast
unit tests rather than browser assertions.

_Empty until the engine milestone. This stub exists to fix the boundary in place
before any code lands._
