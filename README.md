# Badge Builder 2K27

A local badge planner for NBA 2K27 MyCareer. You describe a build — height and
attributes — and the tool tells you which badges you qualify for, at which
levels, what they cost, and how your badge points and synergy slots add up.

Single user, single machine. The whole point is that the numbers reconcile with
what the game actually shows you.

> **Status: M1 — data + cost + eligibility engine.** The 53-badge dataset, the
> cost and eligibility engines, and the full correctness test suite are in.
> No UI yet (M3); no synergy behavior yet (M2).

---

## Posture: local-only, no deploy

This is deliberate, not a stage on the way to something hosted.

- **No backend.** No server, no API, no database, no accounts.
- **No hosting, no deploy target, no CI.** It runs on `localhost` via `npm run dev`.
- **No network egress at runtime.** No `fetch`, no CDN, no analytics. The app
  works offline.
- **No secrets.** Nothing in this repo reads an environment variable or a key.
  An `.env` file appearing here is a defect, not a configuration step.
- **Persistence is `localStorage`** — client-side, on your own machine, and
  nowhere else.

Runtime dependencies are exactly `react` and `react-dom`. Everything else is a
dev dependency. That constraint is load-bearing: it makes an accidental network
call or an accidental service integration something you have to argue for
explicitly rather than something that arrives by drift.

## Requirements

The requirements document for this project is the sealed `seed.md` held in the
planning workspace alongside the scope and tech-strategy documents. It is not
copied into this repo — there is one authoritative copy, and it lives outside the
codebase so it cannot drift.

Two rules from it are worth restating here, because they govern day-to-day work:

1. **Never invent game data.** Unknown values stay unknown. Nothing is guessed,
   rounded, or filled in from memory.
2. **Engine and UI stay separated.** Every rule flows from data plus config, and
   never gets hard-coded into a component.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest, single run
npm run build    # typecheck + production bundle
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on a pinned port |
| `npm run build` | `tsc --noEmit` then `vite build` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run generate:badges` | Regenerate `src/data/badges.json` from the source text |
| `npm test` | Vitest, single run — the entire correctness surface |
| `npm run test:watch` | Vitest in watch mode |

## The dataset and how to refresh it

`src/data/badges.json` is **generated, never hand-edited**. The pipeline:

```
src/data/badges.source.txt   the seed's 53-badge listing, checked in VERBATIM —
                             the one file where a game number may be typed
scripts/generate-badges.ts   the parser (pure; unit-tested)
scripts/generate-badges-cli.ts  the fs shell — the repo's ONLY fs consumer
src/data/badges.json         the generated output, with provenance fields
```

**When 2K publishes or patches badge data** (launch day, title updates):

1. Edit `src/data/badges.source.txt` with the new values — nothing else.
2. Bump `DATA_VERSION` / `AS_OF` (and `GAME_VERSION` / `CONFIDENCE` once known)
   in `scripts/generate-badges.ts`.
3. `npm run generate:badges` — then review the `badges.json` diff; it
   enumerates every changed number.
4. `npm test` — the data-integrity suite re-validates the dataset. A
   **TRIPWIRE** failure (assertions 7–14) means 2K published something the
   tool never assumed; the right response is to re-read the data, not to
   force the test green.

Guard rails you will hit if you stray:

- A test asserts `generate(badges.source.txt)` reproduces `badges.json`
  byte-for-byte, so hand edits to the JSON cannot survive.
- A 13-badge spot-check asserts hand-transcribed literals from the sealed
  requirements doc, and the parser's alias map is asserted to be a bijection
  onto the 20 canonical attributes — so a wrong abbreviation cannot ship
  silently.
- The parser throws on anything it does not recognize. Unknown values stay
  `null`; nothing is guessed.

## Layout

```
src/engine/   pure TypeScript. Every rule. No DOM, no React, no I/O.
src/data/     the dataset. Generated, read-only at runtime.
src/config/   seams for game mechanics that are not yet published.
src/ui/       React. Renders engine output. Zero rules.
scripts/      the badge generator (build-time only).
tests/        the suite. tests/ui/ carries a jsdom docblock; all else runs node.
docs/         vocabulary.md (the glossary) and proof artifacts.
```

Each directory carries a `README.md` describing its contract. The engine/UI
separation is the architecture — it is what makes the arithmetic testable
without a browser.

## Known constraints

- **The dev port is pinned to 5173 with `strictPort`.** `localStorage` is keyed
  to origin *including port*, so a silent roll to 5174 would orphan every saved
  build and read as data loss. A port collision fails loudly instead.
- **Data is pre-release.** Some 2K27 mechanics are unpublished. The dataset
  carries provenance so a value's confidence is always visible, and saved builds
  record which dataset version they were planned against.
- **Multi-tab is last-write-wins.** Two tabs on the same origin will clobber each
  other's autosave. Accepted for an audience of one.

## Branches

`main` is the trunk and reflects known-good state. Work lands on `dev` and is
merged to `main` — no direct commits on `main`.

## License

Private, personal, unpublished. Not affiliated with, endorsed by, or sourced from
any game publisher.
