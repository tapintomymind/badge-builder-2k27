# Badge Builder 2K27

A local badge planner for NBA 2K27 MyCareer. You describe a build — height and
attributes — and the tool tells you which badges you qualify for, at which
levels, what they cost, and how your badge points and synergy slots add up.

Everything runs in the browser, and each visitor's saved builds stay in their
own browser. The whole point is that the numbers reconcile with what the game
actually shows you.

> **Status: skeleton.** Toolchain only — no dataset, no engine, no UI yet.
> Implementation begins after the plan is approved.

---

## Posture: static and client-side, no backend

The app is hosted (on Vercel) so it can be shared, but nothing about it is
server-side. What ships is a static bundle; everything happens in the visitor's
browser.

- **No backend.** No server code, no API, no database, no accounts.
- **No network egress at runtime.** No `fetch`, no CDN calls, no analytics.
  Once loaded, the app works offline.
- **No secrets.** Nothing in this repo reads an environment variable or a key.
  An `.env` file appearing here is a defect, not a configuration step — the
  Vercel project needs no environment variables either.
- **Persistence is `localStorage`** — client-side, in each visitor's own
  browser, and nowhere else. Nothing anyone saves ever leaves their machine.

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
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |

## Deploying (Vercel)

The app deploys to Vercel as a static build. `vercel.json` carries the whole
configuration: the framework preset, an SPA fallback rewrite, immutable caching
for hashed assets, and a small set of security headers.

One-time setup:

1. In the [Vercel dashboard](https://vercel.com/new), import this GitHub repo.
   Vite is auto-detected and the defaults are correct (`npm run build`, output
   `dist`). No environment variables to set.
2. Deploy. From then on, every push to `main` deploys to production and every
   pull request gets its own preview URL.

Custom domain:

1. In the Vercel project, go to **Settings → Domains** and add your domain.
2. At your registrar, add the DNS records Vercel shows you — an `A`/`ALIAS`
   record for an apex domain, or a `CNAME` for a subdomain. Vercel provisions
   TLS automatically once DNS resolves.

`npm run build` runs `tsc --noEmit` before `vite build`, so a type error fails
the deploy. That is intentional — Vercel's build is the only gate there is.

## Layout

```
src/engine/   pure TypeScript. Every rule. No DOM, no React, no I/O.
src/data/     the dataset. Generated, read-only at runtime.
src/config/   seams for game mechanics that are not yet published.
src/ui/       React. Renders engine output. Zero rules.
tests/        the suite.
```

Each directory carries a `README.md` describing its contract. The engine/UI
separation is the architecture — it is what makes the arithmetic testable
without a browser.

## Known constraints

- **Saved builds live in one browser on one device.** There are no accounts and
  no sync: what a visitor saves on their phone is not on their laptop, and
  nobody sees anyone else's builds. Sharing a build means sharing the app, not
  the data.
- **`localStorage` is keyed to origin.** In production that is the custom
  domain — so changing the domain later orphans everything visitors have saved.
  Pick the domain once. The same rule is why the dev port is pinned to 5173
  with `strictPort`: a silent roll to 5174 would orphan local saves and read as
  data loss, so a port collision fails loudly instead.
- **Data is pre-release.** Some 2K27 mechanics are unpublished. The dataset
  carries provenance so a value's confidence is always visible, and saved builds
  record which dataset version they were planned against.
- **Multi-tab is last-write-wins.** Two tabs on the same origin will clobber each
  other's autosave. Accepted for a tool of this size.

## Branches

`main` is the trunk and reflects known-good state. Work lands on `dev` and is
merged to `main` — no direct commits on `main`.

## License

Personal project. Not affiliated with, endorsed by, or sourced from any game
publisher.
