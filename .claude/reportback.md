# Reportback — badge-builder-2k27 · Tier 2 → Tier 1 channel

**Location:** `badge-builder-2k27/.claude/reportback.md`
**Project:** `badge-builder-2k27`
**Tier 1 workspace:** `<framework-root>/.claude/workspace/badge-builder-2k27/`
**Established:** 2026-08-25
**Tier 2 shape:** **A — bare.** This file plus `db-register.md` are the entire `.claude/` set. There
are no project agents, no project hooks, and no `settings.json`. Tier 1 dispatches implementers
directly against `workspace/badge-builder-2k27/impl-briefs/m<N>-*.md`
(`tech-strategy.md` §7, ratified 2026-08-25).

---

## How this channel works

Append an entry here when an event below occurs. Tier 1's Conductor reads on next invocation and
surfaces relevant entries to the user via EA. **Append-only — never edit or delete a prior entry.**

**Required events:** `milestone-complete`, `scope-deviation`, `blocked`, `risk-realized`,
`decision-needed`, `stop-condition-triggered`.
**Optional FYI:** `fyi`, `lesson-learned`, `refactor`.

Full protocol: Tier 1 `protocols/reportback-protocol.md`.

---

## Project-specific reporting rules

These exist because of how this project is built. They are not optional.

1. **Constrained mode is the default dispatch shape.** Every milestone brief (M1-M4) runs
   `Mode: constrained` per `protocols/dispatch-efficiency.md` §7. Your completion entry MUST carry
   the §7.1 reportback fields: `changed_files`, `denied_paths_checked`, `first_proof_result`,
   `verification_evidence`, `heartbeats_emitted`, `stop_conditions_triggered`.
2. **`changed_files` must be a subset of the brief's Allowed paths.** Run
   `git status --porcelain` before reporting done (§7.4). If any changed path is outside the
   allowlist, do **not** claim completion — report
   `stop_conditions_triggered: [out-of-scope-edit-detected]` with the offending paths, and stop.
3. **Never invent 2K27 data.** The seed's #1 non-negotiable. If a threshold, a slot magnitude, or a
   refund trigger is ambiguous, **stop and file a `decision-needed` entry**. Do not guess, do not
   round, do not infer a plausible value. Unknown stays `null`.
4. **`src/data/badges.json` is generated, never hand-edited.** Every number enters through
   `src/data/badges.source.txt` + `scripts/generate-badges.ts`. A hand edit to the JSON is a
   `scope-deviation` even if the number is right. (A PreToolUse hook enforcing this was considered
   and deliberately deferred — `tech-strategy.md` §7. A direct JSON edit is the recurrence trigger
   that re-opens that decision, so report it.)
5. **Work lands on `dev`. Never commit to `main`.** One commit per milestone with `npm test` green
   `[seed: Working agreements]`.
6. **No new runtime dependencies.** `package.json` `dependencies` must stay exactly
   `{react, react-dom}`; a test asserts it. A dependency need is a stop-and-report, not a judgment
   call. This includes CSS frameworks, icon packages, and headless-UI packages.

---

## Entry format

```
─────────────────────────────────────────────
<ISO date> — <one-line summary>
Type: <milestone-complete | scope-deviation | blocked | risk-realized | decision-needed | stop-condition-triggered | fyi>
Actor: <agent role / model>
Slice: <M1 | M2 | M3 | M4 | M5 | n/a>

WHAT
<what happened>

EVIDENCE
<test output, commands run, screenshot paths, commit SHA, branch>

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files:
denied_paths_checked:
first_proof_result:
verification_evidence:
heartbeats_emitted:
stop_conditions_triggered:

SCOPE / PLAN IMPACT
<does this change scope.md, tech-strategy.md, design-spec.md, or an H-ruling?>
<required for scope-deviation, risk-realized, decision-needed>

DECISION NEEDED FROM TIER 1
<specific question + options>
<required for decision-needed, scope-deviation, blocked>

NEXT
<what happens next, or what you are waiting on>
─────────────────────────────────────────────
```

---

## Reference index

| Artifact | Path (Tier 1 workspace) | What it governs |
|---|---|---|
| `seed.md` | `workspace/badge-builder-2k27/seed.md` | **Sealed, immutable.** The requirements document — there is no PRD (compressed phasing). |
| `scope.md` | `workspace/badge-builder-2k27/scope.md` | Milestones, allowlists, the eight H-rulings, the 14 data-integrity assertions. |
| `tech-strategy.md` | `workspace/badge-builder-2k27/tech-strategy.md` | Stack, architecture layers, risk register, runtime assumptions. |
| `design-spec.md` | `workspace/badge-builder-2k27/design-spec.md` | **Binding for M3/M4 UI** — component inventory, tokens, layout, a11y bar. |
| Impl briefs | `workspace/badge-builder-2k27/impl-briefs/m<N>-*.md` | The constrained-mode contract for each slice. |

---

## Entries

<!-- Append below this line. Newest last. Append-only. -->

─────────────────────────────────────────────
2026-08-25 — Tier 2 channel established (Option A, bare)
Type: fyi
Actor: architect (Tier 1)
Slice: n/a

WHAT
`.claude/` scaffolded on `dev` with Option A (bare): this channel plus a declared-empty
`db-register.md`. No agents, no hooks, no `settings.json` — Tier 1 dispatches implementers directly.
Plan approved 2026-08-25 with Critic's three amendments ratified (B1 executable allowlists, B2
primary-row invariance test, B3 complete approval surface); `design-spec.md` accepted and binding
for M3/M4.

EVIDENCE
App scaffold at `444d034` (Vite + React + TS + Vitest; runtime deps exactly react + react-dom;
port 5173 with `strictPort`; `noUncheckedIndexedAccess` on; contract-stub READMEs in
`src/engine|data|config|ui`; smoke test green). Branch `dev`.

SCOPE / PLAN IMPACT
None. Records the ratified Tier 2 shape decision (`tech-strategy.md` §7, `scope.md` §0).

NEXT
M1 (data + cost + eligibility engine) is ready to dispatch against
`workspace/badge-builder-2k27/impl-briefs/m1-data-cost-eligibility-engine.md`.
─────────────────────────────────────────────
