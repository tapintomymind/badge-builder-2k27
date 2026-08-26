# DB Register — badge-builder-2k27

**Status:** DECLARED EMPTY — not skipped, not pending.
**Last reviewed:** 2026-08-25 (Architect, at Tier 2 scaffold time)
**Authority:** `tech-strategy.md` §7 "db-register N/A — declared, not skipped";
`agents/architect.md` scaffold checklist; `protocols/destructive-data-ops.md`.

---

```yaml
databases: []              # none — there is no server and no shared persistent state
branches: []               # N/A — no database, therefore no branch topology
sentinel_verification: n/a # nothing to sentinel-verify
persistence: localStorage  # per-origin, client-side, on the user's own machine only
destructive_ops_routing: n/a
```

## Why this file exists with nothing in it

The Tier 1 conductor refuses to route any destructive operation until a `db-register.md` is in
place. This project has no database — no server, no shared persistent state of any kind, and no
network egress at all (`tech-strategy.md` §9). Every one of the six structural destructive-ops
checks is vacuous here.

**A declared-empty register makes that gate resolvable. A missing file would make it ambiguous —
and ambiguity is exactly how the 2026-05-06 cross-branch-wipe class got in**
(`memory/incidents.md` 2026-05-06). The eight lines above cost nothing and remove the question.

## What counts as persistence here

`window.localStorage`, origin-keyed **including port** — which is why `vite.config.ts` pins
`port: 5173, strictPort: true`. It is single-user, client-side, on the user's own machine. It is not
shared state, it is not multi-tenant, and no agent operation can destroy another party's data
through it. Multi-tab is last-write-wins and accepted as-is for an audience of one
(`tech-strategy.md` §9).

All `localStorage` access is confined to **one module**, `src/persist/local-storage.ts` (created at
M3), so the wrapped-write / quota-throw mandate has a single enforcement point.

## Escalation clause — read this before assuming it still applies

Under Tier 2 Option A there is no Tier 2 conductor to carry a `## Destructive Data Operations`
binding section, so this register carries it.

**If this project ever grows persistent shared state — a server, a hosted database, a sync backend,
a shared cache, anything more than one user's own browser storage — STOP.** Do not run a migration,
a schema change, a `drizzle-kit` operation, a `TRUNCATE` / `DELETE` / `DROP`, or any other
destructive operation against it. Route the proposal through Tier 1 `db-admin` as a
`DestructiveOpRequest`, populate this register with the real topology, and sentinel-verify at least
one branch before anything runs. `protocols/destructive-data-ops.md` is the governing document.

Adding shared persistent state is also a **must-escalate** change under `tech-strategy.md` §6
("adding a backend, a server, a build-and-serve step, CI, or a deploy target"), so the escalation
should have already fired before this clause becomes relevant. If it did not, that is itself the
finding — report it on `reportback.md` as a `scope-deviation`.
