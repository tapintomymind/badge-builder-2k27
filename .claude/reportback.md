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

─────────────────────────────────────────────
2026-08-25 — M1 complete: data + cost + eligibility engine, 154 tests green
Type: milestone-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: M1

WHAT
M1.1 shipped per `impl-briefs/m1-data-cost-eligibility-engine.md`. The entire correctness
surface is computed and unit-tested before any pixel exists: verbatim `badges.source.txt` +
generator (max-split-1 on the U+2014 hazard — Unpluckable parses correctly), generated
`badges.json` with H8 provenance (`gameVersion: null`, never guessed), 14 data-integrity
assertions (CONTRACT 1–6 / TRIPWIRE 7–14 with ask-the-user messaging), both H7
anti-transcription ship gates (alias bijection + 13-badge hand-transcribed spot-check),
arity-only loader (paired positive test: mid-array-null fixture loads), cost engine
(Legend throws), pure-of-state per-category ledger behind the refundTrigger seam,
validateBadge with independent per-level evaluation (all five H3 fixtures incl. the gap
fixture returning HOF), recheckEligibility (recompute, no diff), SavedBuild serializer
(schemaVersion 1, dataVersion stamping, synergy round-tripped opaquely, type-only),
config seams (legendByAnyMeans default, plusTwoSlotIds null, deriveBudget manual/derived
stub), and the M3/M4 test-env groundwork (jsdom + RTL devDeps, guarded setup-dom,
tests/ui/dom-env.test.tsx probe green in the same run as node-env tests).

EVIDENCE
Commit a5c8301 on `dev` (branch `main` untouched). `npm test`: 154 passed / 14 files.
`npm run typecheck`: clean. `npm run build`: green. Verbose run output with the asserted
counts (53 / 11-9-10-12-5-6 / 22-15-16 / 22-31) saved to `docs/proof/m1-test-output.txt`.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files:
  README.md · package.json · package-lock.json · vite.config.ts (additive: test.setupFiles)
  src/config/{index.ts, README.md} · src/data/{badges.source.txt, badges.json, README.md}
  src/engine/{vocabulary,types,errors,dataset,cost,ledger,eligibility,serialization}.ts
  src/engine/__fixtures__/synthetic-badges.ts · src/engine/README.md
  scripts/{generate-badges.ts, generate-badges-cli.ts}
  tests/{data-integrity,generate-badges,alias-bijection,spot-check,vocabulary,architecture,
  loader,cost,ledger,eligibility,serialization,config}.test.ts · tests/setup-dom.ts
  tests/helpers/test-utils.ts · tests/ui/dom-env.test.tsx
  docs/vocabulary.md · docs/proof/m1-test-output.txt
  — all within the brief's Allowed paths. tsconfig.json left untouched.
denied_paths_checked:
  I did not touch src/ui/** (its pre-existing README.md is unmodified), src/persist/**,
  src/App.tsx, src/main.tsx, src/styles/**, index.html, or any .env*. This entry is the
  channel-mandated completion report; no other .claude/ file was touched.
first_proof_result:
  `npm test` green at minute ~12 with all 14 data-integrity assertions passing and the
  asserted counts visible in the verbose test names (53 badges · 11/9/10/12/5/6 ·
  22 A/15 B/16 C · 22 single/31 dual). Saved to docs/proof/m1-test-output.txt.
verification_evidence:
  Test Files 14 passed (14) · Tests 154 passed (154) · `tsc --noEmit` exit 0 ·
  `vite build` ✓ built (190.67 kB bundle) · `git status --porcelain` empty after commit.
heartbeats_emitted: batch-mode (live 5-minute heartbeats waived for this autonomous run)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / design-spec.md / H-rulings. Three implementation
judgment calls, all inside Tier-2 latitude (tech-strategy.md §6), recorded for audit:
(1) @types/node was NOT added — the generator's fs shell lives in
    scripts/generate-badges-cli.ts (outside the tsc include graph; node runs the .ts
    directly), and tests read files via Vite's typed `?raw` / `import.meta.glob` instead
    of node:fs. Keeps the devDependency additions to exactly the two the brief names.
(2) `generate:badges` npm script added (additive package.json edit) so the README's
    data-refresh workflow is runnable.
(3) src/data/README.md's scaffold-era over-claim ("removes hand-transcription as a
    failure mode") was aligned with the ratified NB-7 correction (relocates + two
    controls). Contract stubs extended, none deleted.
Ledger shape note: totalCost is the whole-loadout gross total; spent/refunded/
remainingPoints are per-category (seed formula pool − spent + refunds). The
`effectiveLevelFor` seam is where M2 wires synergy into refund triggering without
signature changes.

NEXT
M2 (synergy engine) is unblocked and ready to dispatch against
`workspace/badge-builder-2k27/impl-briefs/m2-*.md`. Nothing is waiting on the user.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — M2 complete: synergy engine, 231 tests green (77 new)
Type: milestone-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: M2

WHAT
M2.1 shipped per `impl-briefs/m2-synergy-engine.md`. The hidden-complexity layer is fully
modelled and unit-tested before any UI depends on it: SynergySlot model (8 slots, 1–4
temporary / 5–8 permanent, per-slot magnitude as DATA — all 8 default magnitude 1,
plusTwoSlotIds still null, nothing guessed per OQ-A1); assignSynergy/clearSynergy with the
four H4 hard invariants as typed results (pure — never a silent throw, never a partial
mutation; NO equip-slot check anywhere in them, per the H4 ruling); synergyRoleFor (at
most one role, ever); effectiveLevel EXCLUSIVE not additive (H5) with clampToLegend
(HOF+2 → Legend); the H2 ledger/overlay separation — ledger(state, basis) takes
LedgerBasis, a different type from OverlayState, so reactionsActive structurally cannot
reach any ledger function; overlayForBasis total over its 2 cases with reactionsActive a
literal false in both; refunds derive from committed state (all-unlocked-slots basis,
H2(a) as ratified) through M1's effectiveLevelFor seam with zero M1 signature changes;
legendByPermanentBoostOnly pre-wired via permanent-only filtering; validateLoadout as the
single enforcement surface (HARD invariant errors vs SOFT budget warnings — equip-slot
overflow and points overspend warn, never block).

All seven required test groups: the 53-badge × 4-overlay exhaustive property test with an
independent oracle (boost ∈ {0,1,2}, never a sum of two roles); ledger("current")
invariance (kept, honestly labelled near-tautological — the M4 primary-row regression is
the real control); basis-mapping totality incl. a source-text pin that synergy-ledger.ts
writes `reactionsActive: false` exactly twice and never true; the replay test; the
enumerated refund pairs asserted exactly {(gold,2), (hof,1), (hof,2)} with gold+1 and
silver+2 explicitly excluded; the H4/NB-3 over-capacity pin (assignSynergy SUCCEEDS on an
over-capacity badge, its refund COUNTS in the ledger, validateLoadout reports the overflow
as a SoftViolation in the same state); all four invariant rejections plus
reaction-in-temporary-slot inert under seasonReset.

EVIDENCE
Commit c250842 on `dev` (branch `main` untouched). `npm test`: 231 passed / 18 files
(154 M1 baseline + 77 new). `npm run typecheck`: clean. `npm run build`: green. Verbose
run output with all six brief-required test items visible saved to
`docs/proof/m2-test-output.txt`.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files:
  src/engine/types.ts (additive: SynergyRole/SynergyRoleKind/OverlayState/LedgerBasis)
  src/engine/synergy.ts · src/engine/synergy-ledger.ts · src/engine/validate-loadout.ts
  tests/{synergy,synergy-overlays,synergy-ledger,validate-loadout}.test.ts
  docs/proof/m2-test-output.txt
  — all within the brief's Allowed paths (src/engine/**, tests/**, docs/proof/**).
  src/config/** untouched: M1 already shipped both required seams (refundTrigger default
  legendByAnyMeans, plusTwoSlotIds null); nothing new was needed there.
denied_paths_checked:
  I did not touch src/ui/**, src/persist/**, src/data/**, scripts/**, src/App.tsx,
  src/main.tsx, src/styles/**, index.html, package.json, package-lock.json,
  tsconfig.json, vite.config.ts (or any *.config.*), or any .env*. This entry is the
  channel-mandated completion report; no other .claude/ file was touched.
  `git status --porcelain` before commit listed only the nine changed_files above.
first_proof_result:
  `npm test` green at ~minute 20 of the run — 231 passed (18 files) with the 4-overlay
  property test, the enumerated refund-pair test, the basis-mapping totality test, and
  the over-capacity synergy test all visible by name in the verbose output. Saved to
  docs/proof/m2-test-output.txt.
verification_evidence:
  Test Files 18 passed (18) · Tests 231 passed (231) · `tsc --noEmit` exit 0 ·
  `vite build` ✓ built (190.67 kB bundle — unchanged; the engine is not yet imported by
  the M3 shell) · `git status --porcelain` clean after commit.
heartbeats_emitted: batch-mode (live 5-minute heartbeats waived for this autonomous run)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / design-spec.md / H-rulings. Four implementation
judgment calls inside Tier-2 latitude, recorded for audit:
(1) H1 naming: the sealed spec's `slotActive` ships as `synergySlotActive` — the bare
    `slot` prefix is banned by the H1 ruling even though the lint regex would not catch
    the compound. Doc comments cross-reference the spec name.
(2) clearSynergy enforces the slot-unlocked invariant too (the brief binds the invariant
    list to "assignSynergy / clearSynergy" jointly). A synergy assignment SITTING on a
    locked slot is however valid state (assign-then-relock), reported by validateLoadout
    as no violation — the lock invariant guards the action, not the state; the boost is
    simply not live. A test pins this.
(3) assignSynergy uses "set" semantics (assigning badge B to an occupied position
    replaces the previous occupant, which loses its role — per the seed's "set a slot's
    fuse or reaction badge"), and re-assigning a badge to the exact position it already
    holds is an idempotent success, not a rejected "second role".
(4) validateLoadout's SOFT warnings include pointsOverspend alongside equipSlotOverflow
    (H4 puts both in the Budget class; one enforcement surface, one rule). A refund can
    lift a category out of overspend since warnings derive from the committed ledger.
Magnitude-2 values in tests are test-local hypotheticals exercising the per-slot-data
seam; the shipped default remains 8×(+1) / plusTwoSlotIds null.

NEXT
M3 (UI: build panel, badge grid, ledger bars) is unblocked — its hard contract
(every card renders via effectiveLevel(badgeId, defaultOverlay)) now has its M2
function, exported with a shipped `defaultOverlay`. Nothing is waiting on the user.
─────────────────────────────────────────────
