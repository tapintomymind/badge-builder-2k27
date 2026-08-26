# Badge Builder — NBA 2K27 MyCareer Badge Loadout Planner

A local tool for planning your NBA 2K27 MyCareer badge loadout before you spend a single point
in-game. You enter your build — height and full attribute spread — and it shows you exactly which
of the 53 badges you qualify for and at what level, tracks your per-category Badge Token spend and
refunds live, and lets you wire up the 8 Synergy Slots' fuse/reaction system to see what your badges
actually look like once boosts are applied.

**Nothing leaves your machine.** No account, no server, no network call anywhere in the running app
— see [Posture](#posture-static-and-client-side-no-backend) below, which the test suite enforces
rather than merely promising.

## Features

- **Build entry.** Height; a position (Any / PG / SG / SF / PF / C) that sets which heights you can
  pick from — no badge requires a specific position, but the height range a position sets does gate
  badges, so a position switch can matter (see [Data integrity](#data-integrity)); and the full
  20-attribute spread as 2K-style sliders — drag to preview, release to commit, `Shift`+arrow to
  jump by 10 — each paired with an exact-entry numeric field. Every attribute shows its full name
  ("Standing Dunk," not "St Dunk"), and each of the six categories has its own color running through
  its sliders, legend, and section title.
- **Eligibility gating.** Every badge card shows which level your current build qualifies for, with
  the failing requirement spelled out — naming both the threshold and your current value (`needs 90
  Close (now 88) or 93 Layup (now 72) for Gold`) — and a full grey-out with reason when your height
  blocks the badge entirely. Cards carry 2K's own one-line description (click to see the whole
  thing) and flag the 19 badges that are new this cycle. If a build change costs you a badge you
  already bought, the badge doesn't vanish — it's flagged "no longer meets requirements" and stays
  exactly as spent until you decide what to do.
- **Per-category Badge Token planning, with a feasibility readout.** Live status bars per category —
  spent, remaining, refunded, Badge Slots used — plus a line telling you how many upgrades are still
  affordable at your current spend (e.g. `6 pts left → nothing else fits at these prices.`), and a
  soft check of your Badge Slots total against the game's published 20-Badge-Slot starting baseline.
  Overspend is a warning (red, not blocked); this is a planning tool, not a gatekeeper.
- **Bonus Badge Slots and Badge Tokens.** The ones you earn beyond the starting 20 — Build
  Specialization, Seasons, Crew — recorded as a separate layer: two earned totals, then placed per
  category, with the composed capacity shown live (`Badge Tokens 12 base + 4 bonus`). Versatile and
  freely reassignable, exactly as the game has them; nothing locks, and no cap is modelled because
  none is published.
- **Synergy Slots (fuse + reaction).** A 2×8 board to read and navigate the whole system at a
  glance, then all 8 Synergy Slots in detail — temporary (1–4) vs permanent (5–8), fuse/reaction
  badge pickers, and a "Reactions activated" toggle to preview in-game ceilings. Fusing a badge
  frees the points you spent on it back to its category pool, immediately — not only once it reaches
  Legend. Synergy Slot 7 (the Build Specialization reward) defaults to +2 and locks to one
  discipline you choose; one more Synergy Slot is still yours to designate as the second +2 — 2K
  hasn't published which one.
- **See what's actually feasible.** Five filters (tier, "Affordable at ≥", category, "Legal for my
  build," and "Purchased"), live status bars, and per-badge pip cost deltas that are always visible
  — not hidden behind a hover — so you can see what every level costs before you touch anything
  in-game.
- **Read the plan back out.** A Summary panel with a per-category loadout roster naming every badge
  you bought, a Synergy digest, and the whole plan as copyable plain text — the artifact you read
  beside the console while re-entering it into the game.
- **Named builds + JSON export/import, built to not lose your work.** Autosave to your browser,
  multiple named builds you can load, rename, duplicate, or delete (Duplicate is how you branch a
  variation — there's no separate compare view), and file-based export/import to back up a build or
  move it to another machine. If a saved build ever becomes unreadable, it's quarantined
  byte-for-byte rather than silently overwritten, and the app tells you so with a way to get the raw
  bytes back.

## Quickstart

Node **22.x** (declared in `package.json` `engines`).

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

**On your phone, next to the console.** The dev server already binds to your LAN, not just
`localhost` — no setup needed. Find your computer's LAN IP (on a Mac: System Settings → Wi-Fi →
Details…, or `ipconfig getifaddr en0` in Terminal) and open `http://<that-IP>:5173` from your
phone's browser on the same network.

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on a pinned port (5173, `strictPort`) |
| `npm run build` | `tsc --noEmit` then `vite build` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run generate:badges` | Regenerate `badges.json` from the checked-in source listing |

### A note on window size

At large window sizes the app becomes a fixed shell: the page itself doesn't scroll, and the
attribute rail and the main column scroll independently instead, so the build controls never leave
the screen. It needs the window to be both wide enough and tall enough — and the height requirement
is *derived* from the measured header, strip, padding and sticky-stack heights rather than chosen,
so that the badge cards still clear their minimum share of the viewport. Below either threshold the
app degrades gracefully to ordinary document scrolling with nothing hidden, only rearranged. The
exact figures live in `tests/layout-arithmetic.test.ts`, which asserts the formula, so they move
when the chrome does.

## Posture: static and client-side, no backend

The app can be hosted (on Vercel) so it can be shared, but nothing about it is server-side. What
ships is a static bundle; everything happens in the visitor's browser.

- **No backend.** No server code, no API, no database, no accounts.
- **No network egress at runtime.** No `fetch`, no CDN calls, no web fonts (the type stack is the
  system one), no analytics, no telemetry — even the render-error handler logs to the console and
  nowhere else. `tests/architecture.test.ts` fails if `fetch`, `XMLHttpRequest` or `WebSocket`
  appears anywhere in the source, so this is enforced, not promised. Once loaded, the app works
  offline.
- **No secrets.** Nothing in this repo reads an environment variable or a key. An `.env` file
  appearing here is a defect, not a configuration step — the Vercel project needs no environment
  variables either.
- **Persistence is `localStorage`** — client-side, in each visitor's own browser, and nowhere else.
  Nothing anyone saves ever leaves their machine. Export and import are a plain file download and
  file picker, not an upload.

Runtime dependencies are exactly `react` and `react-dom`. Everything else is a dev dependency. That
constraint is load-bearing: it makes an accidental network call or service integration something you
have to argue for explicitly rather than something that arrives by drift.

## Stack

- **Vite + React + TypeScript.** No backend — the entire app runs from `npm run dev`.
- **Pure rules engine** in `src/engine/` — framework-agnostic TypeScript, no DOM, no React. Every
  rule (costs, eligibility, synergy, refunds, budget composition) lives here and nowhere else, and a
  dependency-direction test asserts nothing in the engine imports from the UI or from React.
- **Data** in `src/data/badges.json`, generated from a checked-in plain-text listing at
  `src/data/badges.source.txt` — never hand-edited directly. Regenerate with
  `npm run generate:badges`.
- **Vitest** for the full suite — `npm test`, engine and DOM-level UI tests together.

## Data integrity

The badge dataset — all 53 badges, spanning Finishing (11), Shooting (9), Playmaking (10), Defense
(12), Rebounding (5), and Physicals (6) — is transcribed pre-release NBA 2K27 data, sourced from
official 2K material and NBA2KLab as captured in the project's sealed spec, cross-checked and
extended against 2K's own MyPlayer-builder feature page. It ships with provenance fields on
`badges.json` (currently stamped `dataVersion: "2026-08-26.1"`, `confidence: "pre-release"`,
`gameVersion: null` because the patch it reflects genuinely isn't known) — so any saved build can be
traced back to the exact snapshot it was planned against.

The position→height table is a **separate**, separately-provenanced dataset entirely — user-supplied
from the in-game builder, dated 2026-08-26 — disclosed the same way, alongside the badge dataset's
own provenance. If you reopen a saved build and its dataset version doesn't match the app's current
one, a non-blocking banner tells you requirements may have moved — it never silently rewrites your
plan. The same banner discloses two narrower cases: a badge that's left the dataset entirely, or a
Synergy Slot assignment pointing at a badge no longer in your loadout — both healed or stripped
automatically and always disclosed, never silently dropped.

**This app never invents 2K27 data.** Anything not yet published stays `null`/TBD rather than
guessed. What's known and what isn't, as it stands:

1. **Refund trigger — RESOLVED.** 2K's own page confirms fusing a badge frees the points spent on it
   back to its category pool, at any level and either magnitude — that's the default. The three
   Legend/HOF-reaching triggers this app shipped with originally remain selectable alternates.
2. **Which two Synergy Slots carry +2 — half-resolved.** Synergy Slot 7 (the Build Specialization
   reward) is confirmed, so it defaults to +2 and can't be switched back. The second is still
   unpublished and stays yours to designate.
3. **The attribute → per-category (Badge Slots, Badge Tokens) derivation — UNPUBLISHED.** These stay
   manual inputs per category. The page does confirm the *starting total* of 20 Badge Slots, so the
   app annotates your entered total against it as a plain, non-blocking `/ 20 default` — a checksum
   on what you typed, never a formula for what you should type, and never a guess at what a
   difference means.
4. **The cap-breaker → boost mapping — UNPUBLISHED, and deliberately never computed.** A cap breaker
   raises an attribute above the slider ceiling and counts for badge eligibility; it grants no Badge
   Slots and no Badge Tokens. One breaker does not reliably add +1 (an observed case took a
   Three-Point of 60 to 83 across five), so the app stores the *absolute* value you read off the 2K
   builder and honours it, rather than modelling the mapping. **The engine does this today; the
   in-app control to declare a cap breaker has not shipped yet**, so a cap-broken value currently
   reaches a build only through an imported or hand-edited JSON file.

None of these block using the tool today; they're seams the app is built around, not missing
features.

Two rules from the sealed spec govern day-to-day work on this repo, and are worth restating:

1. **Never invent game data.** Unknown values stay unknown. Nothing is guessed, rounded, or filled
   in from memory.
2. **Engine and UI stay separated.** Every rule flows from data plus config, and never gets
   hard-coded into a component.

The requirements document itself is the sealed `seed.md` held in the planning workspace alongside
the scope and tech-strategy documents. It is not copied into this repo — there is one authoritative
copy, and it lives outside the codebase so it cannot drift.

## Layout

```
src/engine/   pure TypeScript. Every rule. No DOM, no React, no I/O.
src/data/     the dataset. Generated, read-only at runtime.
src/config/   seams for game mechanics that are not yet published.
src/ui/       React. Renders engine output. Zero rules.
src/persist/  the single localStorage owner.
tests/        the suite.
```

Each of the four directories above under `src/` carries a `README.md` describing its contract. The
engine/UI separation is the architecture — it is what makes the arithmetic testable without a
browser.

## Deploying (Vercel)

The app deploys to Vercel as a static build. `vercel.json` carries the whole configuration and
states every value rather than inheriting it from the Vite framework preset — `buildCommand`
(`npm run build`, i.e. `tsc --noEmit && vite build`) and `outputDirectory` (`dist`, which is what
`vite build` really emits: `vite.config.ts` sets no `build.outDir`). The preset defaults were
already correct; writing them down means a dashboard-side preset change cannot silently retarget a
directory that does not exist.

### The caching posture, and why it is the shape it is

| Path | `Cache-Control` | Why |
|---|---|---|
| `/assets/(.*)` | `public, max-age=31536000, immutable` | Every file Vite emits there is content-hashed (`index-<hash>.js`, `index-<hash>.css`), so the URL changes whenever the bytes do. |
| `/` and `/index.html` | `public, max-age=0, must-revalidate` | index.html is the one unhashed file that names the hashed ones. Pin it and a returning visitor asks for asset hashes that no longer exist — a permanently broken app, not a stale one. |
| `/favicon.svg` | Vercel default (revalidating) | Unhashed, and deliberately **outside** `/assets/`, so it never picks up `immutable`. |

The two `Cache-Control` rules cannot collide: `/assets/(.*)`, `/` and `/index.html` are mutually
exclusive paths, so it does not matter whether Vercel resolves duplicate header keys first-match or
last-match — a question this repo cannot test locally and therefore does not depend on. The
catch-all `/(.*)` rule sets only the three security headers (`X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`) and no `Cache-Control`, so it cannot overwrite either.

The SPA fallback rewrite stays even though the app has **no router** — every destination is `/` plus
a hash fragment, and fragments never reach the server. It exists only so a stale or mistyped path
lands on the app instead of a 404.

### One-time setup

1. In the [Vercel dashboard](https://vercel.com/new), import this GitHub repo. No environment
   variables to set — the app reads none, by design.
2. **Settings → Deployment Protection.** If Vercel Authentication is enabled on production, the
   URL returns **401 to everyone without a Vercel account**, which reads as a broken app rather
   than a locked one. Confirm production is public before sending the link to anyone. Note that
   Vercel's *Standard Protection* leaves production public but protects **preview** URLs — so a
   preview link from a pull request will 401 even when production is fine. Share the production
   URL, not a preview one.
3. Deploy. From then on, every push to `main` deploys to production and every pull request gets its
   own preview URL.

### Custom domain

Decide this **before** sharing the link, not after — see the origin note under
[Known constraints](#known-constraints). Moving from `*.vercel.app` to a custom domain later
orphans every build anyone has saved.

1. In the Vercel project, go to **Settings → Domains** and add your domain.
2. At your registrar, add the DNS records Vercel shows you — an `A`/`ALIAS` record for an apex
   domain, or a `CNAME` for a subdomain. Vercel provisions TLS automatically once DNS resolves.

`npm run build` runs `tsc --noEmit` before `vite build`, so a type error fails the deploy. That is
intentional — Vercel's build is the only gate there is.

## Known constraints

- **Saved builds live in one browser on one device.** There are no accounts and no sync: what you
  save on your phone is not on your laptop, and nobody sees anyone else's builds. It is per-*browser*
  rather than per-*person*, too — two people sharing one laptop profile share one build. Sharing a
  build means sharing the file, not the data store. **The app now says this itself**, in the build
  manager and at the foot of the Summary panel, because the person who loses a build is by
  definition the person who did not read this file.
- **Clearing browsing data destroys saved builds.** Export is the only backup, and it writes the
  build you are working on — one build, not the whole store. Same two surfaces say so.
- **`localStorage` is keyed to origin.** In production that is the deployed hostname — so moving
  from `*.vercel.app` to a custom domain, or between domains, orphans everything saved against the
  old one. Pick the origin once, before sharing the link. The same rule is why the dev port is
  pinned to 5173 with `strictPort`: a silent roll to 5174 would orphan local saves and read as data
  loss, so a port collision fails loudly instead.
- **Data is pre-release.** Some 2K27 mechanics are unpublished. The dataset carries provenance so a
  value's confidence is always visible, and saved builds record which dataset version they were
  planned against.
- **Multi-tab is last-write-wins.** Two tabs on the same origin will clobber each other's autosave.
  Accepted for a tool of this size.
- **The build switcher treats every page reload as unsaved work,** because the app doesn't yet
  remember which saved build a reload came from. Your data is fine — autosave still has it; the
  label is what's stale.

## Branches

`main` is the trunk and reflects known-good state. Work lands on `dev` and is merged to `main` — no
direct commits on `main`.

## More

- [`EXPLANATION.md`](EXPLANATION.md) — how the game's rules work and how the app models them.
- [`GUIDE.md`](GUIDE.md) — step-by-step usage, task by task.
- [`docs/vocabulary.md`](docs/vocabulary.md) — the one-page Badge Slots vs. Synergy Slots glossary
  the codebase enforces.
- [`docs/proof/`](docs/proof/) — screenshots and verification records, regenerated with each shipped
  slice.

## License

Personal project. Not affiliated with, endorsed by, or sourced from any game publisher.
