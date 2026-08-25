# `src/data/` — the dataset

Read-only at runtime. Consumed as a bundled module import, never via `fs` or any
absolute path.

The shipped dataset is **generated**, not hand-edited. The checked-in source text
is the single place a number may be typed, and a test asserts that regenerating
from that source reproduces the shipped dataset byte-for-byte. This removes
hand-transcription as a failure mode and makes a data refresh a one-file edit
with a reviewable diff.

**Never invent data.** An unknown value stays unknown (`null`) — it is never
guessed, rounded, or filled in from intuition.

_Empty until the data milestone. This stub exists to fix the convention in place
before any numbers land._
