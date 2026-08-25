# `src/ui/` — the shell

React components. **Contains zero rules.**

Components render what `src/engine/` returns. If a component needs a number the
engine does not expose, that is the moment a rule is about to be hard-coded into
the view — stop, and extend the engine contract instead. Do not compute it here.

_Empty until the UI milestone. This stub exists to fix the boundary in place
before any code lands._
