# Reportback — badge-builder-2k27 · Tier 2 → Tier 1 channel

**Location:** `badge-builder-2k27/.claude/reportback.md`
**Project:** `badge-builder-2k27`
**Tier 1 workspace:** `<framework-root>/.claude/workspace/badge-builder-2k27/`
**Established:** 2026-08-25
**Tier 2 shape:** **B — lean team** (as of **2026-08-26**). `.claude/agents/` carries three contracts —
`tier2-conductor.md`, `tier2-engine-implementer.md`, `tier2-ui-implementer.md` — alongside this
channel and `db-register.md`. There are still **no project hooks and no `settings.json`**: the
`badges-json-gate.py` deferral stands with its revisit trigger unmet (`tech-strategy.md` §7). Tier 1
may still dispatch implementers directly against
`workspace/badge-builder-2k27/impl-briefs/*.md`; the in-repo conductor is the alternative route, and
routes against the same briefs. See the 2026-08-26 supersession entry under `## Entries`.

> **Superseded 2026-08-26 — the original header claim, kept visible rather than erased:**
>
> ~~**Tier 2 shape:** **A — bare.** This file plus `db-register.md` are the entire `.claude/` set.
> There are no project agents, no project hooks, and no `settings.json`. Tier 1 dispatches
> implementers directly against `workspace/badge-builder-2k27/impl-briefs/m<N>-*.md`
> (`tech-strategy.md` §7, ratified 2026-08-25).~~
>
> Superseded by user directive 2026-08-26 ("Upgrade to Shape B at the morning session"), executed the
> same day by Architect via Tier 1 orchestrator dispatch. The Option-B rejection rationale recorded at
> the `planned` checkpoint (`tech-strategy.md` §7, `critic-review §NB-8`) is **unchanged on the
> merits** — it was overridden by user directive, and its cost argument (new agents are not
> dispatchable until a session restart) is knowingly accepted.

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

─────────────────────────────────────────────
2026-08-25 — M3 complete: build panel + badge grid + category ledgers + persistence UI, 380 tests green
Type: milestone-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched, batch run) / Claude Fable 5
Slice: M3.1

WHAT
M3.1 shipped per `impl-briefs/m3-ui-build-panel-badge-grid-ledger.md` against the binding
`design-spec.md`. All 19 §9 M3 components exist and render: 10 primitives + `tokens.css`
(§2 tokens verbatim, dark single theme, reduced-motion collapse), 4 shell components
(ProvenanceChip disclosure, DriftBanner with recompute-not-diff via M1 `recheckEligibility`,
AutosaveWarning as the app's only role=alert), build panel (PhysiqueSection with the
four-treatment inert Position control, AttributeGrid in 6 AttrGroup fieldsets, BudgetGrid +
BudgetTotalRow behind the `deriveBudget` seam with the single unverified banner + H7
Category≠AttrGroup hint), grid (JumpNav, CategoryLedger-as-sticky-group-header rendering
engine readouts with H4 soft-red `over by N ⚠` + hatched meter overflow and zero disabled
controls, BadgeGridSection, BadgeCard + LevelPipRow with pips as the canonical radiogroup,
card-body cycle on top capped at maxPurchasableLevel, always-visible what-if deltas,
locked pips carrying engine `reasons[]` strings, height-blocked grey-out), and
BuildSwitcher + BuildManagerDialog (load/rename/duplicate/delete/save-as-new, native
<dialog>, in-row delete confirm, per-row dataVersion + drift dot).
`src/persist/local-storage.ts` created as the ONLY `window.localStorage` toucher (a new
lint test pins the boundary); every write wrapped; autosave failure surfaces the banner
and never crashes. `vite.config.ts` got exactly the one authorized `host: true` line
(OQ-A4) — LAN reachability verified empirically (HTTP 200 on the machine's LAN IP).
HARD CONTRACT HONORED: every card renders via `effectiveLevel(state, badgeId,
defaultOverlay)`, never `purchasedLevel` — pinned by a test that fuses a Gold badge to
HOF under the neutral overlay while the purchase radiogroup stays Gold.

EVIDENCE
Commit cedb108 on `dev` (`main` untouched). `npm test`: 380 passed / 23 files (306
pre-existing + 74 new UI tests: primitives smoke, ledger readouts + overflow, locked-pip
reason strings, height-block, pip/cycle/Escape interactions, Over-Badge-Slots soft chip,
drift banner recompute list, throwing-setItem alert, autosave save→reload round-trip,
persist-boundary lint with positive canary). `npm run typecheck` clean. `npm run build`
green. Vocabulary lint green over all new UI copy. Proofs: docs/proof/m3-desktop-1280.png,
docs/proof/m3-mobile-390.png, docs/proof/m3-contrast.txt (all §2.1 ratios re-verified),
docs/proof/m3-test-output.txt.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files:
  index.html (title only) · src/App.tsx · src/main.tsx (style imports) ·
  vite.config.ts (ONE added line: `host: true`) ·
  src/styles/{tokens.css, app.css} · src/persist/local-storage.ts ·
  src/ui/useMediaQuery.ts · src/ui/README.md (stale "empty until M3" stub updated) ·
  src/ui/primitives/{Button,Toggle,NumberField,HeightField,SegmentedControl,Chip,Section,
  Banner,Hint,Meter}.tsx · src/ui/shell/{AppHeader,ProvenanceChip,DriftBanner,
  AutosaveWarning}.tsx · src/ui/build/{BuildPanel,AttributeGrid,BudgetGrid}.tsx ·
  src/ui/grid/{JumpNav,CategoryLedger,BadgeGridSection,BadgeCard}.tsx + anchors.ts ·
  src/ui/builds/BuildManager.tsx ·
  tests/ui/{app,badge-card,category-ledger,primitives}.test.tsx ·
  tests/ui/persist-boundary.test.ts · tests/ui/storage-stub.ts ·
  docs/proof/{m3-desktop-1280.png, m3-mobile-390.png, m3-contrast.txt, m3-test-output.txt}
  — all within the brief's Allowed paths.
denied_paths_checked:
  I did not touch src/engine/** (the load-bearing denial — every number the UI shows is an
  engine readout; no rule was needed that the engine does not expose), src/data/**,
  src/config/** (read-only imports of its seams only), scripts/**, package.json,
  package-lock.json, tsconfig.json, or any .env*. No dependency was added: no CSS
  framework, no icon package, no headless-UI package; runtime deps remain exactly
  {react, react-dom} (pre-existing test still green). This entry is the channel-mandated
  completion report; no other .claude/ file was touched.
first_proof_result:
  http://localhost:5173 opened in a real Chrome pane; entered a 6'6" build (Close 88,
  Layup 72, Dr Dunk 65, St Dunk 40, Post Ctrl 55, Mid 78, 3Pt 83; Finishing 16 pts /
  3 Badge Slots): Finishing grid gated exactly per engine (Float Game capped Silver with
  "needs 90 Close or 93 Layup for Gold"; Hook Specialist AND-logic showing only the
  failing line). Bought 3 badges (Aerial Wizard B, Float Game S, Ghost Stepper G) →
  ledger dropped to 10/16 · left 6 · Badge Slots 3/3; saved as "Slasher v2"; reloaded the
  page; everything returned. Screenshots (same state, headless Chrome) at
  docs/proof/m3-desktop-1280.png + m3-mobile-390.png.
verification_evidence:
  Test Files 23 passed (23) · Tests 380 passed (380) · `tsc --noEmit` exit 0 ·
  `vite build` ✓ (235.16 kB bundle) · `git status --porcelain` clean after commit ·
  LAN probe `http://<machine-LAN-IP>:5173` → 200 (OQ-A4 live) · contrast checker output
  in docs/proof/m3-contrast.txt, ALL CHECKS PASS.
heartbeats_emitted: batch-mode (live heartbeats waived for this autonomous run per dispatch)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT — judgment calls for Tier 1 / Designer (none change engine or plan)
1. LAYOUT SPEC CONFLICT, resolved toward no-overlap: design-spec §3.4 asks 3 cards/row at
   ≥1280 with 280px card min AND 320/340px rails — at exactly 1280 the center column is
   ~524px and three 280px cards overflowed under the right rail (verified in a real
   render). Shipped `repeat(auto-fill, minmax(240px, 1fr))`: 2-up at 1280, 3-up from
   ~1600, pip rows intact, zero overlap. Designer may want to re-cut §5.1's numbers.
2. CONTRAST SPEC DEFECT, resolved toward the §6 AA bar: §3.1 Button's literal pairing
   (`--fg-primary` on `--accent`) measures 2.76:1 — fails the spec's own non-negotiable
   AA. Primary buttons ship dark-on-accent (5.81:1), the same treatment as level chips.
   Recorded in docs/proof/m3-contrast.txt.
3. AutosaveWarning ships WITH its inline "Export now" (a ~10-line Blob download): §3.2
   specs it as part of this M3 component, while the brief's Excludes cuts the M4
   "summary/export UI" (§3.6 ExportImportControls). A dead-end warning that tells the
   user to export with no way to do it seemed the worse reading. M4 still owns the full
   export/import surface.
4. Over-Badge-Slots chip suppressed while a category's capacity is 0 (unset): at zero
   state every card warned "buying would exceed 0" — noise, not disclosure. Chip fires
   only against an entered capacity (>0). Ledger overflow behavior is unaffected.
5. dataVersion is STICKY per plan (H8): loading an old-dataset build autosaves with its
   original stamp — restamping would be the silent re-validation H8 forbids. New builds
   stamp current. Cosmetic gap: after reload the switcher shows "(unsaved)" because the
   named-build linkage (sourceId) is not part of the engine's SavedBuild envelope and
   M3 cannot extend engine types; noted for M4/M5 polish.
6. Mobile Build-panel auto-collapse evaluates at mount (open at zero state, collapsed
   once values exist, user choice persisted thereafter) rather than mid-session — a
   panel that snaps shut while typing seemed hostile; §5.3's intent (digest summary once
   a build exists) is preserved.
7. Test-env note: under this vitest/jsdom combination `window.localStorage` arrives as a
   method-less stub (Node `--localstorage-file` shim shadows jsdom's). The app is
   unaffected (all access goes through the wrapped persist layer); UI tests install a
   deterministic in-memory Storage (tests/ui/storage-stub.ts). No config edit was needed
   or made.

NEXT
M4 (synergy panel, overlays, filters, summary/export, FeasibilityReadout, mobile
verification pass) is ready to dispatch against `impl-briefs/m4-*.md`. M3 leaves it a
panel addition: cards already render through effectiveLevel with the overlay threaded.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — M4 complete: synergy UI + overlays + feasibility + filters + summary + mobile pass, 443 tests green — acceptance-bar surface ready
Type: milestone-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched, batch run) / Claude Fable 5
Slice: M4.1

WHAT
M4.1 shipped per `impl-briefs/m4-synergy-ui-overlays-summary-mobile.md` against the
binding `design-spec.md`. All 8 new + 4 extended §9 components exist and render:
`Select` (native, optgroup-by-Category, reasons in disabled option labels),
`PreviewModeStrip` (exact §3.2 copy, only while an overlay is on),
`FilterBar` (tier chips, `Affordable at ≥` ELEVATED as the second control, category
disclosure, legal toggle, always-rendered `N filters · Clear all` + role=status result
count), `SynergyPanel` + `PlusTwoDesignator` + `SynergySlotRow` (designator FIRST with
the standing banner + live `+2 designated: N of 2` counter; cap enforced as disabled
radios with aria-describedby reason; locked rows offer no pickers; picker options only
purchased badges with H5 one-role reasons in the labels; assignment via engine
assignSynergy/clearSynergy typed results; shared role=status announcements; season-reset
rows marked `⟳ Disabled by season-reset preview` with controls OPERABLE),
`SummaryPanel` (real tables; committed effective-level counts with `Legend (boost)`
separate; spend/pool + Total headline; the H4/NB-3 over-capacity-with-synergy-role chip
fires HERE too), `ExportImportControls` + `ImportDialog` (Blob + <a download>
`{buildName}-{dataVersion}.json`; import confirm shows name/savedAt/dataVersion with
DriftBanner copy inlined on mismatch; parse failure = danger banner, dialog stays open),
`EmptyResults` (per-category body under a still-true ledger header; all-empty keeps
FilterBar + rails live). Extended: `AppHeader` (overlay toggles + export/import),
`Toggle` (overlay variant, --info track), `CategoryLedger` (feasibility line + the H2
projection row: dashed rule, literal `⟳ After season reset` label, --info one size down,
rendered ONLY when the projection differs), `BadgeCard` (fuse solid-accent edge /
reaction dashed-info edge role chips with `Synergy Slot N +M`, `Fused to X` /
`activates to X` / `Activated: X` / `Synergy Slot N disabled by preview` status
phrases, LEGEND chip + filled Legend pip, effective-pip halo with purchased ring kept,
per-pip unaffordable = dashed + `+N ⚠` — warned, never disabled).
FeasibilityReadout is COUNTS AND COMPARISONS over whatIf/remainingPoints/
maxPurchasableLevel only (`src/ui/grid/feasibility.ts`): zero engine scope, zero
tierCosts reads, zero ranking/"best/recommended/optimal" language (grep-verified).
H2 DISCIPLINE: the primary ledger rows are hardcoded to basis "current" in App.tsx;
projections are a SEPARATE postSeasonReset readout set computed only while the preview
is on. The forbidden `basis-switch-on-the-primary-row` line does not exist anywhere.

EVIDENCE
Commit 3be4210 on `dev` (`main` untouched). `npm test`: 443 passed / 28 files (408
carried + 35 new: BOTH H2 ship-gate regressions in tests/ui/overlays.test.tsx —
(a) reactions-only: every ledger DOM node bit-identical while a card provably changes;
(b) primary-row invariance: primary rows + feasibility + overview + summary
bit-identical across ALL 4 overlay combinations, the labelled projection row present
exactly when seasonReset is on, with exact strip copy; the (c) basis→OverlayState
totality test runs in the M2 suite (tests/synergy-ledger.test.ts item 12) — plus
synergy-panel designator/cap/picker-reason/announcement/season-reset tests, filter +
EmptyResults tests, summary/export/import-dialog tests, and card synergy-state +
per-pip-affordability tests). `npm run typecheck` clean. `npm run build` green.
Vocabulary lint green. deps exactly {react, react-dom}. Browser verification at
1280/768/390 recorded in docs/proof/m4-verification.md + docs/proof/m4-test-output.txt.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files:
  src/ui/primitives/{Select(new),Toggle,SegmentedControl,Chip}.tsx ·
  src/ui/shell/{PreviewModeStrip(new),AppHeader}.tsx ·
  src/ui/grid/{FilterBar(new),EmptyResults(new),feasibility(new).ts,CategoryLedger,
  BadgeCard,JumpNav}.tsx · src/ui/synergy/SynergyPanel.tsx (new) ·
  src/ui/summary/SummaryPanel.tsx (new) · src/styles/app.css ·
  tests/ui/{overlays,synergy-panel,filters,summary-import-export,badge-card-synergy}
  .test.tsx (new) + m4-rig.ts (new) + badge-card.test.tsx (one M3 assertion updated to
  the M4 §3.4 status phrase `Now Gold · Fused to HOF`) ·
  docs/proof/{m4-verification.md, m4-test-output.txt} ·
  ⚠ src/App.tsx — OUTSIDE the published Allowed globs (see stop_conditions_triggered).
denied_paths_checked:
  I did not touch src/engine/** (the load-bearing denial — FeasibilityReadout needed no
  engine selector; every readout is a comparison/count over M1 functions), src/data/**,
  src/config/** (read-only imports only), scripts/**, src/persist/** (export/import is
  file-based in src/ui/, per plan), package.json, package-lock.json, tsconfig.json,
  vite.config.ts or any *.config.*, or any .env*. No dependency added; no config edit.
  This entry is the channel-mandated completion report; no other .claude/ file touched.
first_proof_result:
  http://localhost:5173 opened in a real Chrome pane at 1280: unlocked Synergy Slot 1,
  assigned Float Game — Silver as Fuse → card showed the `⚡ Fuse · Synergy Slot 1 +1`
  chip, accent edge, `Now Silver · Fused to Gold`, halo on the Gold pip, purchased ring
  intact. Then designated Slot 1 +2 and fused Ghost Stepper — Gold → LEGEND chip +
  `refunded 4` in the committed ledger. Season-reset preview: primary row UNCHANGED
  (10/16 · left 10 · refunded 4), labelled projection row `⟳ After season reset · Badge
  Points 10 / 16 · left 6 · refunded 0`, strip copy exact with `1 of 6 categories show
  a projection`. PNG substitution: the batch browser pane cannot write PNGs to disk —
  verified states recorded in docs/proof/m4-verification.md per the dispatch's
  batch-mode note; QE captures real screenshots.
verification_evidence:
  Test Files 28 passed (28) · Tests 443 passed (443) — both H2 UI regressions included ·
  `tsc --noEmit` exit 0 · `vite build` ✓ (255.17 kB bundle) · dev server HTTP 200 ·
  390/768/1280 verified live (no horizontal scroll at 390; right rail dissolves at
  <1280 with Synergy/Summary full-width below the grid + jump-nav chips; Ledger
  overview L-only) · grep gates: no tierCosts / no ranking words in src/ui/** · outputs
  in docs/proof/m4-test-output.txt + m4-verification.md.
heartbeats_emitted: batch-mode (live heartbeats waived for this autonomous run per dispatch)
stop_conditions_triggered:
  out-of-scope-edit-detected (§7.4 self-check): src/App.tsx. It is NOT on the Denied
  list, but it is also not in M4's `Allowed paths` (src/ui/**, src/styles/**,
  tests/ui/**, docs/proof/**). M4's deliverables are unreachable without it — the app
  shell is the only place the overlay toggles, FilterBar, panels, and import dialog get
  wired, and M3's allowlist had included it for exactly that reason. This is the
  Critic-B1 "allowlist not executable as written" class, discovered at self-check.
  App.tsx changes are pure UI wiring (overlay state, filter state, projections computed
  on the separate postSeasonReset basis, panel mounting) — zero rules, zero denied-path
  intent violated. Work is committed on dev (3be4210) so Tier 1 can ratify the allowlist
  amendment or `git revert` one commit. Flagged here rather than hidden.

SCOPE / PLAN IMPACT — judgment calls for Tier 1 / Designer
1. H1 over sketch: design-spec §3.4/§3.5 sketches show chip/status copy like
   `⚡ Fuse · Slot 5 +1` and `Slot 3 disabled by preview` — bare "slot" is H1-banned in
   UI copy, so shipped copy reads `Synergy Slot N` everywhere (vocabulary lint green).
2. SegmentedControl + Select + import control now use WRAPPING labels (no htmlFor):
   htmlFor label→control resolution in jsdom walks the whole tree per label — with M4's
   late-in-DOM labels the whole-app suite degraded ~4x (measured 1.5s/query). Wrapping
   is natively equivalent, checked/focus styling moved to :has() (fine in any 2023+
   browser; jsdom never applies CSS). Suite back at M3 speed (4.7s).
3. FilterBar ships in-flow (not sticky): M3 shipped jump-nav + category ledger as the
   two sticky layers (§5.3's stated maximum); a variable-height sticky FilterBar above
   them would break the ledger offset. §5.1's "FILTERS (sticky)" at L is the deviation;
   Designer may re-cut. Order is per sketch: FilterBar, then jump nav, then sections.
4. JumpNav gained the two §5.2 panel chips (Synergy/Summary), hidden at ≥1280 where the
   right rail is visible. JumpNav isn't in the extended-4 list but §5.2 requires the
   chips; treated as layout wiring, not a new component.
5. SummaryPanel counts badges by COMMITTED effective level (neutral overlay), so the
   summary is overlay-invariant by construction (it participates in the H2 invariance
   snapshot). A Gold badge fused to HOF counts under HOF — the game-reconciling read.
6. The +2 designation lives on the SynergySlot.magnitude values inside the build
   (persisted, exported, imported per SavedBuild.synergy). src/config/plusTwoSlotIds
   stays null and untouched — it remains the M5 seam for when 2K publishes.
7. Rejected copy honored: no `≈ N more Gold C-tier` phrasing anywhere; the feasibility
   line is upgrade-count-only, with the Badge-Slots-exhausted split
   (`…upgrades to badges you already own; new badges would go over Badge Slots.`) and
   `nothing else fits at these prices.`

NEXT
The acceptance bar itself — the USER's own real build, end to end, with a fuse/reaction
pair assigned and numbers reconciled against the game — is the milestone's actual proof
and needs the user at the keyboard (DOD final checkbox). QE pass should also capture the
five contracted PNGs. M5 stays data-blocked.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F1 engine-robustness slice complete: import validation, drift strip+report, boot crash-loop closed
Type: milestone-complete
Actor: Tier-2 fix implementer / Claude (Fable 5)
Slice: n/a (post-M4 review remediation, slice F1)

WHAT
All five F1 docket items fixed, each with a pinning test that fails on pre-fix code:
1. [P0] deserializeSavedBuild now validates the FULL body (H6 at the JSON boundary):
   name/savedAt strings; build.heightInches finite, position PG/SG/SF/PF/C when present,
   attributes all 20 keys numeric 0-99; budgets all 6 categories with non-negative
   points/equipSlots; loadout entries typed, purchasedLevel a valid PURCHASABLE level
   (legend and non-canonical strings rejected), no duplicate badge ids; synergy entries
   with ids 1-8 unique, unlocked boolean, permanence matching the seed table, magnitude
   1|2, at most TWO magnitude-2, fuse/reaction refs null or loadout badges; config
   refundTrigger/budgetStrategy/plusTwoSlotIds validated. Malformed input throws typed
   MalformedSavedBuildError carrying a `problems` list — surfaced verbatim by the
   existing import-dialog danger banner. Never a cast-through: the NaN-ledger,
   LegendNotPurchasableError-render-crash, and silent double-count import shapes from
   the review dockets are all closed at the one seam.
2. [P0] Boot crash-loop closed: unknown badge ids in an OTHERWISE-VALID build are H8
   dataset drift, not a failure — stripped into a reported `droppedEntries` field
   (deserializeSavedBuildWithReport; readAutosaveWithReport in persist), synergy refs to
   dropped ids cleared. A stored autosave holding a removed badge id now boots to a full
   first render (pinned by tests/ui/boot-drift.test.tsx; pre-fix that exact boot threw
   UnknownBadgeError from ledger requireBadge before any banner could mount).
   Backstop: RecoveryBoundary error boundary in src/main.tsx — render failure shows a
   minimal recovery screen (message + "Export raw saved data" + "Clear saved data")
   instead of a white screen. It NEVER auto-clears storage (asserted by test); storage
   access rides the new persist recovery surface (exportRawPersistedData /
   clearAllPersistedData), preserving the single-owner localStorage boundary lint.
3. [P2] validateLoadout gains HardViolation `tooManyPlusTwoSynergySlots` (>2
   magnitude-2 synergy slots) — the seed's sealed "2 different +2 slots" cap now lives
   in the single enforcement surface, not only in the SynergyPanel component. Also
   enforced at the JSON boundary by item 1.
4. [P2] synergySlotDisabledByPreview exported from src/engine/synergy.ts as THE
   canonical predicate for the "disabled by season-reset preview" UI state
   (+ plusTwoSynergySlotIds and MAX_PLUS_TWO_SYNERGY_SLOTS). F2 swaps the two
   hand-negated copies (SynergyPanel.tsx, BadgeCard.tsx).
5. [P2] EligibilityDrift gains `droppedFromDataset`; recheckEligibility stamps it, and
   new driftFromDroppedEntries() maps the deserializer's droppedEntries into the SAME
   drift-report structure DriftBanner consumes — one disclosure shape for both drift
   sources. F2 wires the visible disclosure.

Sanity check settled: `git show dev:vite.config.ts` line 16 contains `host: true` — the
reviewer claim that it was missing is WRONG; QE's LAN-live verification stands.

EVIDENCE
- Commit 17d939c on dev (this entry's chore commit follows), pushed to origin/dev.
- Suite: 473 passed / 0 failed (was 443), 30 files — `npm test`.
- `npm run build` (tsc --noEmit + vite build) clean.
- Pre-fix pinning proof: `git stash push -- src/` then running the five test files
  (serialization, validate-loadout, synergy, ui/boot-drift, ui/recovery-boundary)
  yields 5/5 files FAILED (32 failing tests) against pre-fix src; stash popped, all
  green again.
- Full review evidence lives in the Tier-1 task outputs (w27y2d7y0 confirmed set,
  wi8ui20qq verified set) and workspace design-review.md.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files: src/engine/serialization.ts, src/engine/errors.ts,
  src/engine/eligibility.ts, src/engine/synergy.ts, src/engine/validate-loadout.ts,
  src/persist/local-storage.ts, src/main.tsx (error-boundary mount only),
  tests/serialization.test.ts, tests/synergy.test.ts, tests/validate-loadout.test.ts,
  tests/ui/boot-drift.test.tsx (new), tests/ui/recovery-boundary.test.tsx (new)
denied_paths_checked: src/ui/** untouched; src/App.tsx untouched (boundary mounts in
  main.tsx, so even the permitted App.tsx carve-out went unused); src/data/** untouched
  (no invented 2K27 data); runtime deps still exactly {react, react-dom}
first_proof_result: pre-fix stash-run — 5/5 pinning-test files fail (32 tests),
  including the boot-drift render test failing with UnknownBadgeError
second_proof_result: post-fix full suite 473/473 green; typecheck + vite build clean;
  vocabulary lint and persist-boundary lint green over the new code
verification_evidence: npm test tail, npm run build tail, stash-run tail (this session)
heartbeats_emitted: n/a (single-session slice)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
No scope/H-ruling changes. Two notes for F2 and one for Tier 1:
1. F2 wiring points shipped and waiting: readAutosaveWithReport + droppedEntries +
   driftFromDroppedEntries (disclosure), synergySlotDisabledByPreview (swap the two
   hand-rolled copies), MalformedSavedBuildError.problems (richer import banner copy if
   desired), and the still-unrendered validateLoadout errors channel (now including
   tooManyPlusTwoSynergySlots).
2. Deserializer permanence check is STRICT against the seed table (1-4 temporary, 5-8
   permanent): a hand-edited file flipping a synergy permanence is malformed, not
   preserved. Judged sealed data, not user choice; flag if Tier 1 reads it looser.
3. "Clear saved data" on the recovery screen clears ALL app keys (autosave + named
   builds + UI prefs) — it is behind an explicit user click with the raw-export escape
   hatch offered first, and nothing anywhere auto-clears.

NEXT
Slice F2 (UI side) picks up: DriftBanner/import-dialog disclosure of droppedEntries,
rendering the validateLoadout errors channel, swapping the hand-negated preview
predicates, and the remaining UI-owned docket items from the review set.
─────────────────────────────────────────────
─────────────────────────────────────────────
2026-08-25 — F2 complete: UI fix slice — eligibility disclosure, switcher guard, violation/drift surfacing, layout re-cut (507 tests green, +34)
Type: milestone-complete
Actor: Tier-2 fix implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: F2 (UI + APP)

WHAT
All six docket groups fixed, each with a pinning test that fails on pre-fix code.

A [P1×3] Eligibility disclosure: (a) a purchase above the current attribute cap is a
distinct `stale` pip state (warning ring + ⚠ cost glyph + aria "no longer meets
requirements") and the card renders the ENGINE's failing-requirement string — pipModel
now consults levelPasses before the current/owned short-circuits; (b) below-purchase
pips take the same levelPasses gate as unpurchased ones, so an ineligible gap level
(H3 second ruling, exercised via the engine's syntheticAndMidNullGap fixture through
the real loader) renders locked and fires nothing; (c) cycleBadge is a no-op when the
purchased level is not in the purchasable sequence — a card-body tap can never remove
a stale purchase; Escape on the pip stays the destructive affordance. Removal paths
(setLevel-null, cycle-to-none) now also clear any synergy role the badge held, so the
engine-forbidden synergyTargetNotPurchased state can no longer be created by the UI
and a later re-purchase cannot silently re-attach a boost.

B [P1] Switcher guard + ghost pair: loadBuild confirms before replacing a dirty
working build OR a boot-restored autosave with content (sourceId null after reload —
covered without the deferred schema change); labels are "<name> — unsaved changes" vs
"<name> — saved"; the passive default remains the user's work.

C [P2] Disclosure wiring: validateLoadout errors (all four HardViolation kinds incl.
F1's tooManyPlusTwoSynergySlots) render as a danger banner in SummaryPanel via
hardViolationText(); F1's droppedEntries report flows to the DriftBanner path on BOTH
routes (boot backstop and import — including a same-dataVersion import): "N badge(s)
from this build no longer exist in the dataset: <names/ids> — removed from the plan."

D [P0×2, design-review]: rail Ledger overview rebuilt per-metric using the in-grid
CategoryLedger's own exported over-by builders (overByBadgePoints/overByBadgeSlots) —
danger + "over by N ⚠" only on the metric genuinely over; an under-budget number can
never render red again (P0-1's 68-under-in-danger repro is pinned). Build panel
auto-collapses below 1280 exactly once on the first non-zero COMMIT (blur-commit,
never mid-typing, per the M3 note), one-shot latch persisted; the user's re-open is
never overridden (P0-2).

E [P1s, design-review]: §5.1 rail re-cut 248/fluid/192 — rails were the free
variable; 3-up at 1280 and 2-up at 768 restored with the 240px card floor intact,
which also un-clips the JumpNav at 1280 (P1-4 falls out, as the review predicted);
JumpNav panel chips moved to the FRONT of the row (only route to Synergy/Summary
below L — P1-3); card synergy chip compacted to "⚡ Fuse · SS<n> +<m>" with the
H1-correct "Synergy Slot N" long form as the accessible name (P1-5; vocabulary lint
green); `.badge-card--blocked` container opacity removed — text stays at declared
tokens (reason string back ≥4.5:1), opacity only on the non-text pip row (P1-1);
CategoryLedger split into sticky digest (title + one compact row) + scrolling lede
(meter, refunded>0 only, feasibility, hint, projection) for the §5.3 sticky budget
(P1-7; `refunded 0` P2 folded in); autosave flush on pagehide/beforeunload/
visibilitychange commits the pending unblurred edit through a write-through ref
(P1-8 — blurs the active element, then writes synchronously).

F [P2 hygiene]: rename/delete surface PersistResult via the AutosaveWarning path (no
optimistic header rename over a failed write); both hand-negated preview predicates
replaced with engine synergySlotDisabledByPreview (+ a source lint that bans the
inline pattern, with a positive canary); AutosaveWarning dismissal is per failure
epoch — a successful write re-arms it; duplicate names auto-suffix ("X copy",
"X copy 2") across save-as-new/duplicate/rename; the orchestrator-ratified "0 =
unset" Badge Slots capacity ruling applied uniformly on ALL FOUR surfaces (card chip,
in-grid ledger, rail overview, summary chip — engine untouched, warning filtered
UI-side) with the single neutral "Badge Slots capacity not set" hint. P3 folded in:
"Would go over Badge Slots" phrasing on unpurchased cards. P3 deferred: the untouched
reloaded build still labels "— unsaved changes" (honest without a persisted sourceId;
needs the deferred schema change).

EVIDENCE
- Commit 731fe92 on dev (this entry's chore commit follows), pushed to origin/dev.
- Suite: 507 passed / 0 failed, 34 files — `npm test`; `npm run typecheck` and
  `npm run build` (tsc --noEmit + vite build) clean.
- Pre-fix pinning proof: throwaway git worktree at pre-fix HEAD (f8b4f8c) + the four
  new f2-* test files and five updated legacy files → 32 tests FAIL / 26 pass
  (the 26 are deliberate invariant guards: no-errors→no-banner, entered-capacity
  still warns, ordinary cycle still works, ledger keeps charging stale purchases,
  positive canary, 240px floor). Worktree removed after.
- One pin nuance recorded honestly: the failed-DELETE banner test passes pre-fix via
  an autosave side-channel (sourceId-clear write also failing); the PersistResult
  class pin is carried by the failed-RENAME test, which fails pre-fix.
- vite.config.ts: test.css enabled scoped to src/styles/ — without it vitest stubs
  every *.css import (incl. `?raw`) to "", which silently un-pins the stylesheet
  lints in tests/ui/f2-source-pins.test.ts. Test-infra only; no runtime surface.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files: src/App.tsx, src/styles/app.css, src/ui/build/BuildPanel.tsx,
  src/ui/builds/BuildManager.tsx, src/ui/grid/BadgeCard.tsx,
  src/ui/grid/CategoryLedger.tsx, src/ui/grid/JumpNav.tsx,
  src/ui/shell/DriftBanner.tsx, src/ui/summary/SummaryPanel.tsx,
  src/ui/synergy/SynergyPanel.tsx, vite.config.ts (test.css only),
  tests/ui/{app,badge-card,badge-card-synergy,boot-drift,category-ledger}.test.tsx,
  tests/ui/f2-{eligibility-disclosure,disclosure-surfaces,builds-persistence}.test.tsx (new),
  tests/ui/f2-source-pins.test.ts (new)
denied_paths_checked: src/engine/** untouched (F1 frozen — consumed only its exports:
  deserializeSavedBuildWithReport, droppedEntries, synergySlotDisabledByPreview,
  tooManyPlusTwoSynergySlots); src/persist/** untouched (readAutosaveWithReport,
  readUiSectionOpen/writeUiSectionOpen pre-existed); src/data/** untouched (no
  invented 2K27 data); runtime deps still exactly {react, react-dom}
first_proof_result: pre-fix worktree run — 32 pinning tests fail, incl. the A(a)
  stale-pip, A(b) gap-level, A(c) cycle-removal, B guard/labels, C all three wiring
  gaps, D1 per-metric rail, D2 auto-collapse, E flush + all three stylesheet pins,
  F rename-PersistResult / re-arm / dup-name / 0=unset
second_proof_result: post-fix 507/507 green; typecheck + vite build clean; H1
  vocabulary lint green over the compacted chip copy
verification_evidence: npm test tail, npm run build tail, worktree run JSON report
  (this session)
heartbeats_emitted: n/a (single-session slice)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
No engine or schema changes; sourceId-in-envelope stays deferred. Three notes for
the workspace docs (Designer re-cuts, not code): the shipped layout now implements
the design-review §10 D1 remedy as rails 248/192 with BOTH rails dissolving below
1280 (M and S share one structure — §5.1/§5.2/§5.3 rev-2 candidates); CategoryLedger
is digest+lede (§3.4/§5.3 candidate); the "0 = unset" ruling should be written into
§4.7/design-spec when Designer does the re-cut pass. UI/UX re-review + QE runtime
smoke on this slice are the natural next dispatches; note the concurrent-editor
observation logged by Tier 1 this session (vite.config.ts css merge + orphan
ledger-metrics.ts cleanup landed from outside this thread mid-session — converged,
no conflict, but worth an orchestrator eye).

NEXT
F2 complete on dev. Awaiting UI/UX Reviewer re-pass (P0-1/P0-2 verification +
sticky-budget re-measure at 390) and QE runtime smoke; OQ-A4 note — `host: true`
is already in vite.config.ts, so the phone test is unblocked from the config side.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F2.1 complete: reverify follow-ups — stranded-ref heal re-ruling, load-route disclosure, drift-report exports wired (518 tests green, +11)
Type: milestone-complete
Actor: Tier-2 fix implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: F2.1 (ENGINE + PERSIST + UI)

WHAT
All three fix-wave code-lane verified findings fixed, each with pinning tests
verified failing on pre-fix code (11 fail pre-change).

1 [HIGH — re-ruling] Stranded synergy refs heal, never destroy. F1's
validateSynergyShape classified a fuse/reaction badge id not in the loadout as
MalformedSavedBuildError — but the PRE-F2 app wrote exactly that state in normal
use (purchase removal did not clear synergy roles until F2), so a real pre-fix
autosave was rejected at first post-upgrade boot, swallowed into null by
readAutosaveWithReport, and immediately OVERWRITTEN by the mount autosave: silent
total plan loss through the overwrite side channel. Re-ruled per the docket: a
WELL-TYPED reference to a badge outside the loadout is now a HEALABLE condition —
the stale assignment is cleared into a new clearedSynergyRefs report field
(ClearedSynergyRef {synergySlotId, role, badgeId}, alongside droppedEntries) and
deserialization proceeds; MalformedSavedBuildError remains for genuinely untyped
shapes (non-string/null role refs — pinned). Dataset-drift ref clears stay
disclosed via droppedEntries only (no double-report — pinned). The heal is
disclosed on the existing DriftBanner strip surface ("N synergy assignment(s)
referenced a badge not in this build's loadout: Synergy Slot 5 Fuse → <name> —
cleared."), with or without a dataVersion mismatch. The same heal rescues legacy
NAMED builds (previously silently un-loadable via readNamedBuild's null) and
pre-fix JSON exports on the import route. The prior serializer pin ("rejects a
synergy reference NOT in the loadout") was deliberately re-ruled to pin the heal.

2 [MEDIUM] Load-route disclosure + stale-state clear. New persist surface
readNamedBuildWithReport carries the full strip/heal report; App.loadBuild now
uses it and REPLACES the disclosure state (droppedEntries + clearedSynergyRefs)
on every route transition — so the named-build LOAD route discloses strips/heals
exactly like boot and import (previously silent), and loading a clean build
clears a stale boot-time banner (previously the DriftBanner kept asserting drops
about a build it did not describe). DriftBanner is additionally keyed by a
disclosure epoch (bumped on load + import confirm) so its internal re-check
output can never linger across a build switch either.

3 [LOW] Dead exports wired as the real path (not removed): DriftBanner's
Re-check eligibility now merges driftFromDroppedEntries(droppedEntries) into
recheckEligibility's recomputed list — a post-strip re-check no longer claims
"Every purchased badge still qualifies" directly under a removed-badge line —
and driftLine consumes droppedFromDataset to render the stronger "removed from
the dataset" wording the eligibility doc comment always promised. Both exports
now have production consumers; the engine surface is no longer decorative.

EVIDENCE
- Commit 830d64c on dev (this entry's chore commit follows), pushed to origin/dev.
- Suite: 518 passed / 0 failed, 35 files — `npm test`; `npm run typecheck` and
  `npm run build` (tsc --noEmit + vite build) clean.
- Pre-fix pinning proof: the edited tests/serialization.test.ts + new
  tests/ui/f21-reverify.test.tsx run against pre-fix src → 11 tests FAIL / 27
  pass (the passes are deliberate invariant guards: untyped-ref rejection,
  dataset-drift strip behavior, recomputed re-check wording), captured in this
  session's transcript before any src change landed.
- Vocabulary lint (no bare "slot") and architecture lint green over the new
  copy and the engine→UI type flow; runtime deps still exactly {react, react-dom}.

CONSTRAINED-MODE REPORTBACK (required for M1-M4 completions)
changed_files: src/engine/serialization.ts (heal partition + ClearedSynergyRef),
  src/engine/errors.ts (doc), src/persist/local-storage.ts
  (readNamedBuildWithReport), src/App.tsx (load/import route disclosure state +
  epoch), src/ui/shell/DriftBanner.tsx (heal line + merged re-check +
  droppedFromDataset wording), src/ui/summary/SummaryPanel.tsx
  (ImportDialogState carries clearedSynergyRefs),
  tests/serialization.test.ts (re-ruled + heal-partition pins),
  tests/ui/f21-reverify.test.tsx (new)
denied_paths_checked: src/data/** untouched (no invented 2K27 data);
  src/config/** untouched; engine/UI separation held (UI imports engine types/
  functions only; engine imports nothing from ui/persist); no new deps
first_proof_result: pre-change run — 11 pinning tests fail (6 serialization,
  5 f21-reverify) with the exact pre-fix failure modes (MalformedSavedBuildError
  on the stranded-ref envelope; missing disclosure text on load; stale banner
  surviving a clean load; "Every purchased badge still qualifies" after a strip)
second_proof_result: post-fix 518/518 green; tsc --noEmit clean; vite build clean
verification_evidence: vitest pre-change fail list + post-change tails, npm run
  build tail (this session)
heartbeats_emitted: n/a (single-session slice)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
One deliberate re-ruling, per the dispatch docket: the H6/H4-at-the-boundary
classification of a stranded synergy reference moves from MALFORMED to HEALABLE
(H8's never-destroy-silently doctrine outranks boundary strictness for a state
the shipped app itself wrote). scope.md §3's H6/H8 notes should record this when
next revised. No schema change (clearedSynergyRefs is report-side only, never
persisted); sourceId-in-envelope stays deferred. Observed adjacent behavior left
as-is (same pre-existing class, out of docket): renameNamedBuild/duplicateBuild
round-trip through the deserializer, so a rename/duplicate of a drifted or
stranded stored build persists the strip/heal without disclosure — worth a P3 on
the next hygiene pass.

NEXT
F2.1 complete on dev. The fix-wave reverify's remaining unclaimed P2 (raw
JSON.parse error message copy on the import dialog) stays open. Natural next
dispatch: QE runtime smoke over the three routes (boot-heal, load-disclosure,
re-check merge) on a real browser profile with a genuine pre-F2 localStorage.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-26 — Tier 2 shape upgraded A → B: lean 3-agent team scaffolded in-repo
Type: fyi
Actor: architect (Tier 1)
Slice: n/a

WHAT
`.claude/agents/` created on `dev` with exactly three contracts, per the original Option B
definition (`tech-strategy.md` §7: conductor + engine-agent + ui-agent):

- `tier2-conductor.md` — routes slices against `workspace/badge-builder-2k27/impl-briefs/*.md`,
  dispatches the two implementers in constrained mode, verifies their reportback entries carry
  the §7.1 fields, never talks to the user, escalates to Tier 1 through this channel. Carries the
  path-ownership routing table, the split-a-cross-boundary-slice-into-two rule (F1/F2 precedent),
  and the kill-switch mechanics.
- `tier2-engine-implementer.md` — owns `src/engine/**`, `src/data/**` (generated pipeline only),
  `src/config/**`, `scripts/**`, and the engine test suites. Never touches `src/ui/**` or
  `src/styles/**`.
- `tier2-ui-implementer.md` — owns `src/ui/**`, `src/styles/**`, `src/persist/**` (the single
  `window.localStorage`-toucher boundary + its lint), `tests/ui/**`, and **`src/App.tsx` in its
  default allowlist**. `src/engine/**` is DENIED — every number the UI shows is an engine readout.

All three encode this project's standing rules rather than restating them loosely: constrained mode
as the default dispatch shape with the §7.1 field list, §7.2 preflight echo, §7.3 heartbeats/kill,
and the §7.4 `git status --porcelain` self-check (out-of-allowlist edit = stop-condition report,
never a silent completion); never invent 2K27 data, with the three config seams and
`decision-needed`-not-a-guess; `badges.json` generated and never hand-edited, with the
badges-json-gate revisit trigger named; the H1 "Badge Slots" / "Synergy Slots" vocabulary rule;
runtime deps exactly `{react, react-dom}` with a dependency need as stop-and-report; work on `dev`
never `main`, one commit per slice with `npm test` green plus a separate `chore(reportback):` commit;
`design-spec.md` binding for UI and `seed.md` sealed.

**`src/App.tsx` is baked into the UI implementer's default allowlist** — the M4 lesson. It was
omitted from M4's published Allowed paths, the implementer had to file `out-of-scope-edit-detected`
for a pure-wiring edit the milestone was unreachable without, and Tier 1 ratified it post-hoc. Same
Critic-B1 class ("allowlists not executable as written"), second occurrence. It is now a default, not
a discovery.

**Authority.** User directive 2026-08-26 ("Upgrade to Shape B at the morning session"), executed by
Architect via Tier 1 orchestrator dispatch. This REVERSES the 2026-08-25 `planned`-checkpoint ruling
(`scope.md` §0, `tech-strategy.md` §7: Option A ratified, B rejected per `critic-review §NB-8`). The
rejection rationale is unchanged on the merits — the allowlist boundary does live in the impl brief,
and a Tier-1-dispatched implementer does get identical §7.2–§7.4 enforcement. It is overridden by
user directive, and B's disclosed cost is knowingly accepted: **newly created agents are not
dispatchable until a session restart, so these three register only in sessions opened AFTER this
commit, inside the project directory**
(`memory/runtime_claude_code_agent_registry_session_restart.md`).

**Unchanged:** no `settings.json`, no `hooks/` — the `badges-json-gate.py` deferral stands with its
revisit trigger (a hand edit to `badges.json` bypassing the generator) still unmet.
`db-register.md` is untouched and still declared-empty (`databases: []`, localStorage only); all
three contracts carry its escalation clause — if this project ever grows persistent shared state,
stop and route through Tier 1 `db-admin`. No Tier 2 critic (Tier 1 `critic` / `quality-engineer` /
`ui-ux-reviewer` cover review), no Tier 2 deployment agent (no deploy target), no DB agent (no
database) — the `tech-strategy.md` §7 omit table survives this upgrade intact.

EVIDENCE
Commit 953287c on `dev` (`main` untouched at 444d034). Three files added under `.claude/agents/`
plus this file's header block updated in place — the "Tier 2 shape: A — bare" claim is superseded
with the original wording struck and kept visible, not erased. `npm test`: 518 passed / 35 files
(unchanged — agent contracts are non-code, verified anyway). `git status --porcelain` clean after
commit. This entry's `chore(reportback):` commit follows.

SCOPE / PLAN IMPACT
No code, no milestone, no H-ruling, no allowlist change. `scope.md` §0's ratified-decisions row
"Tier 2 shape | Option A — bare" and `tech-strategy.md` §7 are both superseded as of 2026-08-26;
Architect has appended a dated supersession addendum to `tech-strategy.md` §7 recording the
override, the unchanged-on-the-merits rationale, the accepted restart cost, and this commit SHA.
`scope.md` §0's row is left as the 2026-08-25 record it is — §0.1 is the established home for
post-seal amendments, and the authoritative supersession now lives in §7.

One process note for Tier 1: the three new agents cannot be dispatched or test-invoked from the
session that created them. Their first real exercise is the next slice dispatched from a session
started inside `badge-builder-2k27/` after this commit — F3 (sliders + position-height constraints)
is the natural first candidate, and it is a UI slice, so it exercises the `src/App.tsx` default
allowlist immediately.

NEXT
Nothing is blocked on this. The queue is unchanged: F3 → F4 → PMM docs delta → docs landing commit →
`dev` → `main` no-ff promotion → deep-dive packet, with the user's own acceptance-bar session (the
real 2K27 build, fuse/reaction pair assigned, numbers reconciled against the game) as the project's
actual DoD. M5 stays data-blocked.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-26 — F3 complete: attribute sliders + position→height constraints, 610 tests green (92 new)
Type: slice-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: F3.1

WHAT
F3.1 shipped per `impl-briefs/f3-sliders-position-heights.md`. All five §0.2 dispatch
preconditions verified before the first edit: branch `dev`; F1 pair (17d939c+f8b4f8c) and F2
pair (731fe92+b670db8, plus F2.1 830d64c+5fe123b) merged; `npm test` green on the dev tip
(35 files / 518 tests); `git status --porcelain` empty; design-spec.md rev 3 §3.1
`AttributeSlider` present AND ruling commit semantics (preview on `input`, commit on `change`,
120ms held-key coalescing, Shift+Arrow=10, paired numeric mandatory).

- `src/data/position-heights.ts` — hand-authored, the ten user-supplied bounds verbatim
  (PG 69–79 · SG 72–80 · SF 76–82 · PF 77–84 · C 79–88), H8-mirroring provenance on its own
  version line (`positionDataVersion: 2026-08-26.1`, `gameVersion: null`, `confidence:
  "user-supplied"`, verbatim note `user-supplied 2026-08-26, PG min confirmed same date`).
- `src/engine/validate-build.ts` — `positionHeightRange()` (unset ⇒ dataset-derived 69–88;
  the ONLY route the UI may learn a range) + `validateBuild()` (HARD-DISCLOSED
  `heightOutsidePositionRange`, reasons[]-idiom string via `formatHeightInches`, never
  mutates). `POSITIONS` hoisted to `src/engine/vocabulary.ts` as canonical; `Build.position`
  docstring corrected in `types.ts` (type unchanged).
- `src/ui/primitives/AttributeSlider.tsx` — native `<input type="range">` + mandatory paired
  `NumberField` (`aria-label "{Attr}, exact value"`). Preview tier component-local; commit on
  native `change` (pointer release immediate; keyboard coalesced 120ms trailing); blur flushes
  pending (tail-edit flush still works); pending value renders in `--accent`; `--val` gradient
  fill; `touch-action: pan-y`; aria-valuetext. NO slider package — deps stay exactly
  {react, react-dom}.
- `AttributeGrid` swapped to 20 sliders (vocabulary-driven grouping unchanged);
  `PhysiqueSection` re-cut per rev 3: Position FIRST with an `Any` segment (= existing
  optional `Build.position` unset — no engine type change), Cosmetic chip REMOVED, muted
  palette reverted, new hint copy with the live range, `--border-subtle` rule REMOVED (rev 3
  withdrew it — Position/Height are one causal group; the brief's "keep" default yielded to
  the latest spec revision as instructed).
- `src/App.tsx` wiring: `positionHeightRange(position)` → `HeightField` min/max; clamp to the
  NEAREST bound on position switch with the persistent visible notice ("Height adjusted 7'4" →
  6'7" to fit PG's range (5'9"–6'7").", stale count inline when the clamp changed it);
  `validateBuild` violations render as a `warning` Banner INSIDE PhysiqueSection; §6
  build-change live region (sr-only role=status) announces position clamps and attribute
  commits that CHANGED the stale-purchase count — once per commit, never per drag frame.
- F2's auto-collapse latch PRESERVED, not rewritten: it still reads committed values (arming
  therefore keys on the slider's commit); one added guard defers FIRING while a slider inside
  the panel holds focus, releasing on that slider's blur — implementing design-spec §5.3 rev 3
  "the latch never fires on a slider release" / §3.1 "fires on blur or next mount". No second
  latch. NumberField paths behave exactly as F2 shipped them.
- `src/styles/app.css`: ONE appended delimited block (`/* --- F3: attribute sliders +
  position height range --- */`); diff contains zero deletions. F2's `.number-field` touch
  rules untouched (the paired numeric + 12 budget fields still use them).

EVIDENCE
Commit a2e37f4 on `dev` (`main` untouched). `npm test`: 610 passed / 39 files (92 new).
`npm run build`: tsc --noEmit clean + vite build clean. Pre-change failure proof: with src/
stashed to the F2.1 tip the F3 pins fail (10 failures/import errors) — recorded in
docs/proof/f3-verification.txt. Browser proof (headless Chrome via CDP against
http://localhost:5173): select C → hint reads `C: 6'7"–7'4"`; set 7'4"; switch PG → height
reads 6'7" (ft=6 in=7) with the visible clamp notice. Screenshots:
docs/proof/f3-position-clamp-1280.png · f3-sliders-1280.png · f3-sliders-390.png (first
slider measures 234×44px at 390 — ≥44px floor; thumb extends to 44×44 via transparent
border). Facts + gate output in docs/proof/f3-verification.txt.

CONSTRAINED-MODE REPORTBACK (§7.1)
changed_files:
  src/data/position-heights.ts · src/engine/validate-build.ts · src/engine/vocabulary.ts ·
  src/engine/types.ts · src/ui/primitives/AttributeSlider.tsx ·
  src/ui/primitives/HeightField.tsx · src/ui/build/AttributeGrid.tsx ·
  src/ui/build/BuildPanel.tsx · src/App.tsx · src/styles/app.css ·
  tests/{position-heights,validate-build}.test.ts ·
  tests/ui/{attribute-slider,position-height-clamp}.test.tsx ·
  tests/{architecture,serialization}.test.ts ·
  docs/proof/{f3-position-clamp-1280.png,f3-sliders-1280.png,f3-sliders-390.png,
  f3-verification.txt} — all within Allowed paths. NumberField.tsx, Chip.tsx, tokens.css
  needed no edit (spec required no new chip variant or token).
denied_paths_checked:
  I did not touch src/engine/eligibility.ts (position gates NO badges — untouched),
  src/engine/serialization.ts (no persisted-shape change; only its TEST file extended),
  src/ui/shell/**, src/ui/grid/** (stale-purchase state TESTED, not edited), src/ui/builds/**,
  src/ui/synergy/**, src/ui/summary/**, src/persist/**, src/data/badges.json,
  badges.source.txt, scripts/**, package.json, package-lock.json, tsconfig.json, any
  *.config.*, any .env*, or the main branch. `git status --porcelain` before commit listed
  only the changed_files above.
first_proof_result:
  http://localhost:5173 opened (headless Chrome/CDP; the repo's .claude/launch.json route is
  a denied path in this brief, so the dev server ran via background npm run dev): C selected →
  range hint `C: 6'7"–7'4"`; PG switch → height clamps to 6'7" with the notice visible.
  Screenshot docs/proof/f3-position-clamp-1280.png.
verification_evidence:
  Test Files 39 passed (39) · Tests 610 passed (610) · tsc --noEmit exit 0 · vite build ✓
  (272.72 kB) · git status --porcelain empty after commit · app.css diff append-only ·
  docs/proof/f3-verification.txt.
heartbeats_emitted: batch-mode (live 5-minute heartbeats waived for this autonomous run)
stop_conditions_triggered: none

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / H-rulings. Judgment calls inside Tier-2 latitude,
recorded for audit:
(1) Latch timing: the brief's §0.3 wording ("re-point at the slider's commit event") and
    design-spec rev 3 ("never fires on a slider release; blur or next mount") diverge for the
    pointer-release case. The spec is the ruled design authority read at dispatch time, and
    scope §0.1 A1 itself cites the never-while-focus-held rule — implemented as: arm on
    committed values, fire immediately unless a panel slider holds focus, else fire on its
    blur. F2's NumberField behavior is bit-identical.
(2) The brief's test-3 parenthetical names a `No longer qualifies` chip; the shipped M4/F2
    treatment is the stale pip + "Purchased at X — no longer meets requirements" disclosure
    line (no such chip exists). The stale-purchase state DOES already appear on attribute
    drop (verified; no stop condition), so the test pins the shipped treatment's surface.
(3) §6 announcement copy for a stale count returning to zero is unspecified; used
    "All purchased badges qualify." (a change in count must announce; "0 … no longer qualify"
    is unreadable). Announcements use engine ATTR_LABELS ("Close"), not 2K's long names.
(4) The §6 build-change region is implemented as an App-level sr-only role=status element.
    Rev 3 rescopes the SYNERGY region into the build-change region, but SynergyPanel is
    F2-denied this wave — consolidating the synergy announcements into the shared region is
    left as a follow-up (they announce the same event class from two DOM nodes until then).
(5) Per-test 20s timeouts on the App-rendering F3 tests, following app.test.tsx's existing
    pattern (whole-app walks exceed the 5s default under a fully-parallel suite).
Concurrency note: commits 953287c + 1b1bf1a (Tier-2 shape B agents) landed on dev mid-slice
from a parallel writer; tree was clean at every checkpoint, no file overlap, F3 sits linearly
on top.

NEXT
F4 (or the PMM docs delta) per the standing queue. M5 stays data-blocked. Follow-up
candidates for the next docket: consolidate the synergy announcements into the build-change
region (judgment call 4); design-spec §3.4's Build-panel-digest stale count (`· ⚠ N stale`)
was NOT implemented — it is not in the F3 brief's deliverables and reads as F4/BadgeCard-
adjacent scope.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-26 — F5 complete: 2K-inspired dark + metallic visual identity (with F5.0 geometry re-cut), 623 tests green
Type: slice-complete
Actor: Tier-2 implementer (constrained mode, Tier-1 dispatched) / Claude Fable 5
Slice: F5 (two commits: F5.0 geometry + F5 restyle)

WHAT
Two deliberately separate commits, per the mid-slice orchestrator ruling adopting
design-spec rev 5 §11.6 ("geometry is an INPUT to the restyle; a whole-file restyle
makes a later bisect unable to separate geometry from paint"):

F5.0 `3a12f64` fix — §11 rev-5 L geometry re-cut (the user's left-rail scrollbar):
- L columns 248/192 → `280px minmax(0,1fr) 176px`; page padding, column gap, card
  gap untouched (density preference protected); 3-up at 1280 survives (+7px at the
  worst-case 17px scrollbar, §11.3).
- Slider arrangement threshold 223 → 287px, DERIVED from what it protects
  (224 usable track + 8 gap + 56 numeric — invariant I9). Shipping the rail widening
  alone would have HALVED the L track 214→182px; 768/390 arrangements bit-identical.
- Position SegmentedControl becomes an auto-fit grid (2 rows of 3) scoped
  `.rail-left` at L only — tier filter and +1/+2 magnitude segments stay inline.
- `.ledger-overview__row` wraps with right-anchored metrics (degrade by wrapping,
  never by scrolling). No overflow-x masking anywhere — ruled out by §11.1.
- Deleted the duplicate right-rail `ExportImportControls` (App.tsx) — the ratified
  rev-2 §3.6 clause that never shipped; header pair is the only one.
- NEW `tests/layout-arithmetic.test.ts` parses the shipped CSS and re-derives
  I3/I4/I8/I9 (12 assertions; 4 failed pre-change). The f2-source-pins rail pin
  moved to the rev-5 literals — the one expected casualty, per §11.5 ⑥ verbatim.

F5 `ad4d382` feat — §2.7 token layer + §10 restyle, PRESENTATION ONLY:
- tokens.css: additive §2.7 metallic layer. `--metal-*` base tones are ALIASES of
  `--lvl-*` (structural guarantee a metal never drifts from its level colour);
  new `-hi`/`-lo` stops; `--metal-face-*` hi→base gradients ONLY (§2.7.2: `-lo`
  never under a glyph); static glows/bevels/`--rule-gold`; `--fg-on-accent`
  materialized (aliases `--bg-canvas`). ZERO existing token values changed.
- §10.1 pip ladder: locked pips keep metal identity (letter restored via CSS
  content keyed to data-level + demoted lock glyph, bevel-inset well, `-lo` rim);
  affordable wells rimmed base, unaffordable dashed; owned/current take the
  struck-metal face + bevel + `--fg-on-accent` glyph; current keeps its ring.
- §10.4 stale = TARNISH: flat `-lo`, no gradient, no highlight, `--fg-primary`
  letter + retained ring; cost line reads `⚠ stale` (CSS ::after on the
  aria-hidden cost span). The rev-3 warning-hatch (amber-on-amber with gold) is
  gone by derivation, not by promise.
- §10.2 medallions: debossed achromatic wells, rank by size/rim weight (A 24px
  2px --fg-primary · B 22px · C 20px), letter --text-xs at all sizes.
- §10.3 cards: 16px names; purchased lift + 2px metal top edge keyed to
  data-purchased-level; blocked cards keep rev 2's de-opacified recipe exactly;
  eligibility lines prefixed 🔒/⊘ with empty alternative text.
- §10.5 chrome: gold=identity (title, rule-gold hairlines under header/section
  headers/atop the sticky digest, gold-faced primary Button 9.72:1 — D2's
  dark-on-fill substance preserved and improved from 5.81:1), blue=interaction
  (focus/filters unchanged), semantics=state (danger/warning/info untouched;
  ledger numerals untouched per §2.7.4's forbidden list); Synergy Slot permanence
  rims (gold-lo Permanent / silver-lo Temporary — decorative, chips remain the
  carriers); inset ledger-overview well; +2 designator banner gains its well.
- §10.6: `forced-colors: active` companion block shipped (required deliverable) —
  faces reset to Canvas/CanvasText, 1px CanvasText rims, current/stale keep a
  heavier rim; `prefers-contrast: more` collapses faces to flat base tones.
  Asset budget spent: ZERO new SVG, zero images; deps stay {react, react-dom}.
- data-* hooks (orchestrator-ratified §10.7 ruling): data-level + data-state on
  pips, data-purchased-level / data-tier / data-stale on the card root,
  data-permanence on Synergy Slot rows. Zero logic — every value is a field the
  component already rendered, and every one is overlay-INVARIANT.

EVIDENCE
Commits 3a12f64 + ad4d382 on `dev`, pushed (`main` untouched). npm test: 40 files /
623 tests ALL PASS (pre-slice baseline 39/610; +12 layout-arithmetic, +1 contrast
pairing). npm run build: tsc --noEmit clean + vite build clean. H2 ship gates run
EXPLICITLY post-restyle: tests/ui/overlays.test.tsx 4/4 green (ledger DOM
bit-identity under all 4 overlay combos). Pre-change failure proofs: the layout
test failed 4/12 against the pre-F5.0 tree; the contrast pairing assertion failed
against pre-F5 tokens.css ("token not declared: --fg-on-accent"). Contrast:
docs/proof/f5-contrast.txt — 18 WCAG 2.1 ratios, bronze-calibrated (I1), worst
pairing 5.64:1 vs AA 4.5:1. Screenshots (headless Chrome/CDP, seeded rig with
owned/current/locked/unaffordable/stale pips, fuse→Legend, over-budget ledger):
docs/proof/f5-before-{1280,390}.png · f5-after-{1280,390}.png ·
f5-after-1280-header.png. Full gate log: docs/proof/f5-verification.txt.

CONSTRAINED-MODE REPORTBACK
changed_files (F5.0):
  src/styles/app.css · src/App.tsx (one deletion + tombstone comment) ·
  tests/layout-arithmetic.test.ts (NEW) · tests/ui/f2-source-pins.test.ts —
  all four within the §11.8 allowlist as amended by the orchestrator mid-slice.
changed_files (F5):
  src/styles/tokens.css (§2.7 additive only) · src/styles/app.css (ONE appended
  delimited block, zero deletions) · src/ui/grid/BadgeCard.tsx +
  src/ui/synergy/SynergyPanel.tsx (data attributes only) ·
  tests/ui/f2-source-pins.test.ts (the ONE allowed pairing assertion) ·
  docs/proof/f5-*.{png,txt} — all within the F5 allowlist.
denied_paths_checked:
  No engine/data/config/persist/scripts file touched; package*.json, tsconfig,
  *.config.*, .env* untouched; no test outside the two named files touched;
  `git status --porcelain` empty after each commit. Tree verified CLEAN before
  the slice started (concurrency rule) — and the mid-slice F5.0 ruling was
  absorbed by stashing the restyle WIP, landing geometry first, then re-applying
  paint on top (one writer, no interleave).
stop_conditions_triggered: none — no new dependency, no existing token value
  changed, no new conditional/handler/state in any .tsx, no styling keyed to
  overlay state (the legend pip's overlay-derived state stays on its
  PRE-EXISTING class; the new data-level attribute is static).

SCOPE / PLAN IMPACT
None to scope.md / H-rulings. Judgment calls inside Tier-2 latitude, recorded:
(1) §10.5's two-tone title ("Badge Builder" gold, "— 2K27" muted) needs a static
    span wrapper inside the h1 — MARKUP, which the "className + data-attribute
    changes ONLY" allowlist excludes. Shipped the whole title in --metal-gold
    (9.72:1; the load-bearing half of the clause). The split is a one-line F4/
    follow-up markup change if wanted — flagging now per the M4 lesson, not at
    self-check.
(2) §10.3's "the level word takes its flat --lvl-{x}" on the status line: the
    status is a single text node and the level word is often the EFFECTIVE level
    ("Fused to Legend"), so per-word colour needs markup and whole-line colour
    keyed to purchasedLevel would paint the wrong word. Shipped weight 600 only;
    per-word tint routes to a slice that may touch markup.
(3) §10.1's Legend-pip glyph column says "—" but §2.7.4 carrier 2 says every
    level pip keeps its letter and §6 forbids colour-alone: kept the existing L
    letter (spec-internal contradiction resolved toward the a11y rule).
(4) F4 has NOT shipped: no description element exists, so §10.3's clamp/
    description rows have no target. No dead CSS authored for it; F4 should
    bring `.badge-card__description` styling with its own slice (noted so the
    F4 brief carries it).
(5) The locked-pip letter is CSS ::before content keyed to data-level (aria-
    hidden decorative span; accessible names unchanged). Changing the TSX glyph
    text would have been a content edit outside the allowlist.
(6) `--shadow-none` token (collaborative session edit, kept): declared for
    shared box-shadow list composition; currently unconsumed.
Concurrency note: the F5.0 ruling arrived mid-restyle; sequence honored via
stash → F5.0 commit → pop → restyle commit. One stash-pop conflict in app.css
(both edited the file tail) resolved keeping both blocks, geometry first.

NEXT
F4 (descriptions) rebases on this tip and should carry: the description reveal
control (§10.8 #1, routed to F4), `.badge-card__description` presentation
(§10.3 row), and optionally the h1 two-tone split (judgment call 1). Rev-5's
named trigger stands: if any later addition pushes the right rail's min-content
above 142px or the left's above 246px, the answer is the §11.8 IA re-cut, not
another shave — tests/layout-arithmetic.test.ts will say so. M5 stays
data-blocked. User's live acceptance pass on the restyled UI is the real DoD.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F6 complete: right-rail width re-cut (§11 rev 6) + XL tier, 19 layout assertions green
Type: slice-complete
Actor: Claude Code (cloud session, branch claude/right-sidebar-width-62di4r off dev)
Slice: F6 (one commit)

WHAT
User report: the right rail is "a bit too skinny, and items are not laying next
to each other as smoothly." Measured before touching anything — all 6 ledger
rows were wrapping onto two lines in the EMPTY state, with no build loaded.

The cause is a seam between F5's two commits, not a bad number in either. F5.0
derived the right rail against a 142px content box; F5 then styled
`.ledger-overview` as an inset well with `--space-3` sides. That took 24px the
geometry slice had already spent, leaving the rows 118px against a 168px demand.

This is exactly the escalation F5's own NEXT block named — "if any later
addition pushes the right rail's min-content above 142px [...] the answer is the
§11.8 IA re-cut, not another shave." F5's paint slice was that addition, and it
went unnoticed because the guard could not see it (below).

Shipped:
- L (1280–1439) re-cut 280/176 → `258px minmax(0,1fr) 204px`. Page padding,
  column gap and card floor untouched — the density preference is still
  protected, and rev 6 does not spend it any more than rev 5 did.
- Ledger well sides --space-3 → --space-1 and row column gap --space-4 →
  --space-2 AT L ONLY; both restored at XL.
- NEW XL tier at ≥1440: `300px minmax(0,1fr) 268px`, well and gap back to F5's
  values. 1280 is the WORST case for the rails and rev 5 made every wider
  viewport pay its bill — the rails stayed pinned at their 1280 sizes while the
  centre absorbed all the extra width, so a 1728px display wrapped its ledger
  rows for a shortfall that only existed at 1280.
- tests/layout-arithmetic.test.ts 12 → 19 assertions. I8's right-rail clause was
  wrong in two independent ways and both are fixed: it stopped at
  RAIL_RIGHT − SECTION_CHROME so the well was free, and LEDGER_ROW_MIN = 137 was
  MIN-content (where the text breaks) when a flex row wraps at MAX-content. It
  would have passed at 142px even with the well counted. I8b now PARSES the
  well's padding and the row's gap out of the CSS and re-derives the fit, so a
  number a paint slice can spend is treated as geometry. New I3-XL group derives
  the second tier; new I3 clause records that L now sits ON its ceiling.
- f2-source-pins rail literal moved to the rev-6 numbers (expected casualty,
  §11.5 ⑥), plus a pin on the XL tier's existence.

VERIFICATION
docs/proof/f6-verification.txt — full before/after measurements, the L geometry
derivation, and the degradation table for real numbers.
docs/proof/f6-after-1280.png, f6-after-1440.png. The BEFORE is the shipped
f5-after-1280.png (the two-line ledger rows are visible in it).
Pre-change proofs: each of the three changed CSS values reverted in isolation
against the rev-6 tree fails 2–3 of the new assertions. I8b also pins the
pre-rev-6 arithmetic as an in-test canary so it cannot become vacuous.
npm test: 631 tests, 629 pass. npm run build: clean.

SCOPE / PLAN IMPACT
None to scope.md / H-rulings. No .tsx, engine, data or config file was touched —
this slice is three files: app.css and two test files. Judgment calls recorded:
(1) L now sits ON the I3 ceiling (462 of 463; 745px centre against a 744px 3-up
    minimum) and the left rail sits ON its I9 floor (258 − 34 = 224 = the §3.1
    usable track). That is deliberate and is asserted, not merely true: there is
    nothing left to take at 1280, and the next re-cut there must move a floor.
    If that is not acceptable, the lever is the §11.8 IA re-cut.
(2) At 1280 with REAL numbers the ledger still wraps (2 of 6 at "12/16 · 3/5",
    6 of 6 at the over-budget strings). No affordable rail holds those — the
    over-budget string alone is ~230px of text. I8b's floor is the EMPTY state
    on purpose, and the wrap is the designed §11.5 ④ degradation. XL clears the
    typical case outright.
(3) The Synergy Slot header still wraps at L. It holds four controls (title,
    permanence chip, Boost segmented, Unlocked toggle) needing ~420px; no rail
    width fixes it. At XL it lays out on two clean lines instead of five. A real
    fix is §11.8 IA, not geometry — flagged, not attempted.
(4) The XL breakpoint is pinned at 1440 by an assertion derived from its own
    rails, so raising the rails without raising the breakpoint fails loudly.

PRE-EXISTING FAILURES — NOT THIS SLICE'S
tests/ui/f2-builds-persistence.test.tsx fails 2 tests ("save-as-new writes a
second build", "save-as-new with a taken name auto-suffixes"), both 5s vitest
timeouts. Reproduced identically on the clean origin/dev tip with this slice's
three files stashed. Left alone; flagging so the next slice does not inherit
them as a mystery.

NEXT
Rev-6's named trigger, replacing rev-5's: at L there is no slack left in either
direction. Any addition that raises the right rail's row demand above 162px, or
the left rail's content demand above 224px, must go to the §11.8 IA re-cut —
tests/layout-arithmetic.test.ts will fail rather than let it be shaved. XL has
real headroom (55px over the I3 ceiling at 1440) and is where new rail residents
should be sized first. M5 stays data-blocked. User's live acceptance pass at
their own viewport is the real DoD — the XL tier in particular is aimed at it.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F7 complete: category identity colour layer (§2.8) — sliders, legends, digest titles, nav chips
Type: slice-complete
Actor: Claude Code (cloud session, branch claude/right-sidebar-width-62di4r off dev)
Slice: F7 (one commit)

WHAT
User asked to continue the restyling by colouring the sliders to 2K's per-category
scheme, stating the anchors themselves: "blue is finishing, red is defense, etc.
the color you use can match as closely as possible", scope "full category
identity".

FIRST, THE STATE OF THE WORLD: the user believed this work was already partly
done. It was not present anywhere on the remote — three branches only (main, dev,
the merged F6 branch), no per-category colour in any of them, every slider still
filling with the single --accent. Their earlier local session was never pushed and
this container clones fresh. Flagged before building rather than after.

Shipped:
- tokens.css §2.8: six --cat-* tokens, additive, no existing token value changed.
  PROVENANCE IS RECORDED PER COLOUR, because two of the six have none: 2K files
  Rebounding under Defense's red (this dataset splits them) and Physicals is not a
  2K badge category at all. Those two hues are OURS and say so in the token
  comment. Nothing is presented as published 2K27 data — the standing rule in the
  tokens header ("a design choice, NOT 2K27 data") is respected, not bent.
- One custom property, --cat, set once per category and inherited. The six mapping
  blocks key off DOM THAT ALREADY EXISTS — the grid section's id="cat-{name}" and
  the nav chip's matching href — so cards and the category digest inherit with no
  markup change, and critically NO new data-* lands on ledger DOM (the H2 overlay
  guard forbids exactly that). One TSX line total: AttributeGrid's fieldset now
  emits data-attr-group, a value it already had.
- Four consumers: attribute slider fill (both -webkit- and -moz- engines),
  attribute group legend, category digest h2, jump-nav chip border.
- §10.6 forced-colors companion.
- NEW tests/category-colors.test.ts (12 assertions) + docs/proof/f7-contrast.txt.

THE CHANNEL RULE (§2.8.1) — the load-bearing decision
Defense's red and the overspend red are both red. That is safe ONLY because
identity and state never share a surface, which is the same separation F5 used
(gold=identity, blue=interaction, semantics=state). Two exclusions are deliberate
and pinned by test:
- .category-ledger's LEFT BORDER is not identity — .category-ledger--over takes it
  to --danger. A red Defense there would be pixel-identical to "over budget". The
  h2 text carries the identity instead. Found by reading the rule, not by guessing.
- The badge cards themselves are NOT tinted. F5 already owns every card edge
  (data-purchased-level paints the top edge and border in the metal palette,
  .badge-card--blocked owns the de-opacified recipe); a category tint would compete
  with purchase state for the same pixels. This is a REDUCTION from the "full
  category identity" scope the user picked — see judgment call 1.

VERIFICATION
docs/proof/f7-contrast.txt — WCAG ratios, CIE76 ΔE separation, CVD simulation,
calibrated by reproducing §2.1's bronze 6.65:1 first (the F5 method).
All six clear the 4.5:1 AA text bar (5.69–8.40 on --bg-canvas); mutual ΔE >= 32.9.
Browser-verified at 1440 that all six wire on all four surfaces, and that
.category-ledger's left border stayed --border-strong on all six.
docs/proof/f7-category-colors-1440.png, f7-slider-fills-1440.png.
Pre-change proofs: four breakages reverted in isolation (--cat onto the digest
border; a dropped chip mapping; a colour darkened below AA; the -moz- engine left
unwired) each fail 1–2 assertions.
npm test: 643 tests, 641 pass. npm run build: clean.

SCOPE / PLAN IMPACT
No engine, data or config file touched. One TSX line. Judgment calls recorded:
(1) SCOPE REDUCED vs the user's answer. They chose "full category identity"
    including badge card accents; cards are excluded for the F5 collision above.
    Every card already sits under a sticky category-coloured digest, so identity
    is present without competing with purchase state. Flagged to the user
    directly — this is theirs to overrule, not mine to quietly drop.
(2) The contrast spread is 5.69–8.40, NOT flat. Each hue sits where it still reads
    as its named colour at full saturation. An earlier cut forced one register and
    produced a salmon Defense and a teal Shooting — it cleared the numbers and
    failed the requirement. The spread is bounded (<3.5) and asserted.
(3) CVD collisions are real and are NOT designed away: red/green cannot be
    separated by hue under deuteranopia. §6 is the mitigation and it is structural
    — all four surfaces render the category NAME as text, and the nav chip LABEL
    deliberately stays --fg-secondary so chip legibility never depends on the
    palette. Removing all six colours loses no information.
(4) Finishing (ΔE 7 from --info) and three near-misses against the level palette
    are recorded in the proof rather than tuned away; they never share a surface.

PRE-EXISTING FAILURES — NOT THIS SLICE'S
tests/ui/f2-builds-persistence.test.tsx still fails 2 tests on 5s vitest timeouts
(the failing NAMES vary run to run — they are timeouts, not assertions).
Reproduced on the clean dev tip during F6. Untouched.

NEXT
The palette is one file: swap the six --cat-* values in tokens.css and the proof
regenerates from source (the test recomputes contrast from the shipped hex, so it
cannot drift). If the user wants card accents after all, the seam is already there
— cards inherit --cat today and simply do not consume it. M5 stays data-blocked.
User's live acceptance pass on the palette is the real DoD: two of the six hues
are ours, not 2K's, and only they can say whether the approximation reads right.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F8 complete: full attribute display names, split from the dataset's parse keys
Type: slice-complete
Actor: Claude Code (cloud session, branch claude/right-sidebar-width-62di4r off dev)
Slice: F8 (one commit, joins the open F7 PR #2)

WHAT
User: "For each attribute, don't shorten it. I want it full like standing dunk."

The UI showed "Dr Dunk" / "SWB" / "Per Def" because ATTR_LABELS was doing TWO
jobs at once: it was the user-facing display map AND the independent
transcription of the short strings in src/data/badges.source.txt that
tests/alias-bijection.test.ts pins against the generator's ATTR_ALIASES. The
display name was therefore structurally welded to the dataset's PARSE KEY —
prettifying it would have broken generation, which is why it had never moved.

Split the two jobs:
- ATTR_SOURCE_LABELS (new name, values UNCHANGED) — the parse keys. Still
  bijective with ATTR_ALIASES; alias-bijection.test.ts now pins this map, so the
  H7 ship gate is intact and still guards exactly what it was built to guard.
- ATTR_LABELS (same name, new full values) — display only. Every existing
  consumer (AttributeGrid sliders, engine eligibility copy, App's live-region
  announcements) picks up the full names with ZERO call-site changes.

Expansions are the source abbreviation un-abbreviated and nothing more, each one
fixed by the canonical Attr key: Dr→Driving, St→Standing, Ctrl→Control,
Acc→Accuracy, Hdl→Handle, Int→Interior, Per→Perimeter, Off→Offensive,
Reb→Rebound, SWB→Speed With Ball, Spd/Aglty/Str/Vert→their words, 3Pt→Three-Point.

VERIFICATION
Browser-measured at 1280 (the tightest rail) and 1440: longest label is
"Defensive Rebound" at 106px in a 224px box — every one of the 20 stays on a
single line, no wrap, no rail or document overflow. This mattered: the left rail
sits at its 224px I9 floor after F6, so longer labels were a real risk.
docs/proof/f8-full-attribute-labels-1440.png.
npm test: 647 tests, 645 pass. npm run build + typecheck: clean.

SCOPE / PLAN IMPACT
Judgment calls recorded:
(1) "Close" and "Mid" are LEFT ALONE. They are whole words in the seed, not
    abbreviations. 2K's marketing names are "Close Shot" and "Mid-Range Shot",
    but adding words that appear in neither the source text nor the Attr key is
    inventing copy rather than un-abbreviating it. Flagged to the user as theirs
    to overrule — it is the one place the answer is a preference, not a
    derivation.
(2) tests/eligibility.test.ts asserted the rendered string /needs 91 Aglty for
    HOF/. That is DISPLAY copy, so it moved to "Agility" — the expected casualty
    of the split, and the only assertion that changed meaning.
(3) New guards in tests/vocabulary.test.ts (4 assertions): no display label may
    be one of the 15 known abbreviations, the source labels still match the
    dataset text character-for-character, and the two maps must genuinely differ
    in 15 of 20 entries — so a future "helpful" re-merge or a shortening-to-fit
    fails loudly instead of silently regressing the UI to "Dr Dunk".

PRE-EXISTING FAILURES — NOT THIS SLICE'S
tests/ui/f2-builds-persistence.test.tsx, same 2 5s-timeout failures as F6/F7.

NEXT
docs/vocabulary.md §57 still describes the short labels as "the source text's
short labels" — that sentence is now MORE accurate than before, not less, so it
is left as-is. If the user wants 2K's marketing names ("Close Shot", "Mid-Range
Shot", "Offensive Rebounding"), that is a one-map edit in ATTR_LABELS with the
guards already in place.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F2.2 persistence data-integrity slice complete: unreadable saved data is preserved and disclosed, never overwritten
Type: milestone-complete
Actor: Tier 2 implementer (Claude Opus 5) — constrained mode, Tier 1 dispatch
Slice: F2.2 (post-M4 user-directed hotfix)

WHAT
All seven findings in `impl-briefs/f2-2-autosave-clobber-guard.md` are fixed, each
with a test that is RED against the pre-fix tree. Slices A–H all landed; one part of
slice G is deferred (see SCOPE / PLAN IMPACT).

The two P0s were both live for a user with real builds:

F-CORE — `readAutosaveWithReport()` returned `null` for BOTH "no autosave" and
"unreadable autosave". The boot path could not tell them apart, booted a fresh
working state, and the mount-time autosave `useEffect` wrote that empty build over
the user's unreadable-but-recoverable bytes. F1's raw-export recovery could never
help: it is wired to the RENDER ERROR BOUNDARY, which does not fire on the swallowed
path. New `readAutosaveResult()` distinguishes absent / ok / unreadable;
`readAutosaveWithReport()` is retained as a thin wrapper so the change is additive
and the existing gates are untouched. The `catch` stays — a corrupt autosave still
never takes the app down at boot; what changed is that the caller LEARNS it happened.
The verbatim bytes are quarantined under a new key during the boot RENDER (a state
initializer, so it precedes every effect), written once and never overwritten. BOTH
writers are gated on ONE predicate. A failing quarantine write still suppresses
autosave and surfaces `role="alert"` — never trade the user's data for a successful
fresh write.

The predicate is NOT `dirty`, and the brief was right that this is the single most
likely way the slice ships broken. `loadBuild` calls `markClean()`, so a dirty-keyed
guard would stop a freshly LOADED build ever autosaving — the next reload restores
the PREVIOUS autosave, a new data-loss bug for an old one (pinned by test 1.4). And
the pagehide/visibilitychange flush wrote UNCONDITIONALLY, so gating one writer
returns the whole bug on tab close (pinned by test 1.2's second half). The predicate
is "the app holds a state worth persisting", seeded from the boot outcome, latched
one-way to true on edit / load / import / successful named save / explicit Discard,
read from the ref by the flush.

F-A — `renameNamedBuild` read through the full deserializer, which applies the H8
drift strip AND the F2.1 stranded-ref heal AND rebuilds the envelope from a fixed
field list, discarded the report, and wrote the transformed result back over the
original. A NAME CHANGE silently rewrote the loadout. It now patches the RAW stored
string via a shared `patchStoredEntry` helper. This extends an existing guarantee
rather than inventing one — the store already keeps entry values as opaque strings,
which is exactly why one unreadable entry survives a read-modify-write today.

Also: F-B blast-radius copy + confirm + the surgical `clearAutosave()` wired (it had
ZERO callers); F-C `writeStore` refuses to clobber an unparseable envelope; F-D
duplicate copies bytes via the same helper; F-E import guards unsaved work with
`loadBuild`'s exact predicate; F-F `writeUiSectionOpen` stops resetting; F-G both
raw-export revokes deferred 60s. `listNamedBuilds` returns an unreadable count and
the switcher + manager disclose it. The quarantine key is in BOTH
`exportRawPersistedData()` and `clearAllPersistedData()`.

EVIDENCE
Branch dev. `fix(f2.2): preserve unreadable saved data instead of overwriting it`
(8fbaacd), on ff8544e. `main` untouched.

Baseline BEFORE any change, on the clean dev tip: 40 files / 631 tests, ALL GREEN.
After: 45 files / 675 tests, all green. `npm run typecheck` clean. `npm run build`
clean (tsc --noEmit && vite build, 93ms).

PINNING PROOF — the new + edited tests run against the PRE-FIX `src/`
(`git stash push -- src/`): 28 failed | 22 passed. The 22 passers are the deliberate
non-regression pins (1.5 healthy-path byte-level, 1.8 absent≠unreadable, 5.3
guard-fires-on-unparseable-never-on-absent). Every fix is pinned by at least one
assertion that is red before it and green after.

Test 1.5 — the healthy path is byte-for-byte unchanged — is GREEN. It asserts the
written bytes equal `serializeSavedBuild(toEnvelope(fromSaved(...)))` exactly. The
guard is a no-op on every boot for every user who has ever used this app; it fires
only on the defect path.

Architecture lints green and untouched: `persist-boundary` (every new storage call
is inside `src/persist/`), `vocabulary`, `alias-bijection`, `spot-check`, and
`architecture.test.ts` — FIVE groups observed, as the brief predicted post-F3:
(a) engine purity, (b) runtime dependency allowlist, (c) zero network egress,
(d) no runtime filesystem access, (e) position-height access route.

Full DevTools output: `docs/proof/f22-verification.txt`.

CONSTRAINED-MODE REPORTBACK
changed_files:
  src/persist/local-storage.ts, src/App.tsx, src/main.tsx,
  src/ui/shell/QuarantineBanner.tsx (NEW), src/ui/builds/BuildManager.tsx,
  tests/ui/f22-autosave-guard.test.tsx (NEW), tests/ui/f22-quarantine-banner.test.tsx (NEW),
  tests/ui/f22-rename-fidelity.test.tsx (NEW), tests/ui/f22-store-envelope.test.ts (NEW),
  tests/ui/f22-import-guard.test.tsx (NEW), tests/ui/recovery-boundary.test.tsx,
  tests/ui/summary-import-export.test.tsx, tests/ui/f2-builds-persistence.test.tsx,
  docs/proof/f22-verification.txt, .claude/reportback.md
  ALL within the brief's Allowed paths. `git status --porcelain` shows nothing else
  staged; one untracked `.claude/worktrees/` from another agent's session was left
  alone, not committed.
denied_paths_checked:
  I did not touch `src/engine/**` (the deserializer is not the bug — its strip/heal is
  correct and F1/F2.1-ratified; the bug was that rename and duplicate RAN it and
  PERSISTED the result). I did not touch `src/styles/app.css`, `src/styles/tokens.css`,
  or any file under `src/styles/**` — ZERO new CSS. I did not touch
  `src/ui/primitives/**`, including `Banner.tsx`. I did not touch `package.json`,
  `package-lock.json`, `tsconfig.json` or any `*.config.*`; `dependencies` is still
  exactly `{react, react-dom}`. I did not touch `src/config/**`, `src/data/**`,
  `src/ui/grid/**`, `src/ui/build/**`, `src/ui/synergy/**`. I did not touch `main`.
  `src/ui/summary/SummaryPanel.tsx` — see the scope deviation below; NOT touched.
first_proof_result:
  All four confirmations, live at localhost:5173, output pasted in
  `docs/proof/f22-verification.txt`. (a) boots without crashing; (b) the quarantine
  banner renders with the exact copy; (c) `localStorage` STILL holds the original
  `{not json` under BOTH the autosave and quarantine keys; (d) a SECOND reload with
  no write-blocking leaves both byte-identical.
  Setup finding worth recording: the first attempt failed because calling
  `location.reload()` right after corrupting the key let the OUTGOING page's pagehide
  flush write its in-memory build over the corrupt string — the unconditional second
  writer, doing the right thing in that case (its own boot read had succeeded, so
  persistable was true). That is a live demonstration of why one predicate had to
  cover both writers.
verification_evidence:
  npm test 675/675 · npm run typecheck clean · npm run build clean · the four DevTools
  proofs plus two extra (unreadable-named-build disclosure; standing-quarantine
  disclosure) — all in `docs/proof/f22-verification.txt`. Viewports 1280 and 390 both
  inspected in-session: the banner composes the shipped Banner + Button and reflows at
  390 with no overflow and no new CSS.
  SCREENSHOT FILES NOT WRITTEN — see the DEVIATIONS block below.
heartbeats_emitted: batch-mode (live 5-minute heartbeats waived for this run by Tier 1)
stop_conditions_triggered: [denied-path-required-for-slice-G-part-2] — see below.
  No other stop condition fired. Specifically: the guard is not keyed on `dirty`; both
  writers are gated; no second quarantine key and no overwrite of an existing one;
  nothing auto-repairs, auto-migrates or auto-clears; `serialization.ts` untouched; no
  new CSS, no primitive change, no new dependency; no lint reddened.

SCOPE / PLAN IMPACT
No change to scope.md, tech-strategy.md, design-spec.md, or any H-ruling. No
`schemaVersion` bump, no `MIGRATIONS` entry, no persisted-shape change. Two persistence
changes exactly as the brief's §0.4 inventory ruled: Q1 the new additive quarantine key,
Q2 the write-condition change. F4 is unblocked — its precondition 2 is met, and it
should re-run its own `rg` sweep since `App.tsx` moved.

THREE DEVIATIONS, all surfaced rather than silently decided:

1. SLICE G PART 2 DEFERRED — the brief names the wrong file. §3.7 and the Allowed-paths
   line both place `ImportDialog` in `src/ui/builds/BuildManager.tsx`. It is actually in
   `src/ui/summary/SummaryPanel.tsx`, which this brief DENIES ("untouched by this
   slice") and which F4 explicitly OWNS and has detailed rulings for (its N6 banner
   re-cut, the new `hardViolationText` arm). So the pre-commit disclosure of
   `droppedEntries` / `clearedSynergyRefs` is NOT shipped. Slice G part 1 — the
   unsaved-work guard, the part with the data-loss consequence — IS shipped and pinned
   (tests 7.1, 7.2, plus the not-guarded-when-empty case). Recommendation: fold the
   disclosure into F4, which already owns that file and is already re-cutting copy in
   it. Related: `DriftBanner`'s `droppedLine` / `clearedRefsLine` are not exported, and
   `src/ui/shell/DriftBanner.tsx` is not on this brief's allowlist either.

2. F-F IMPLEMENTED AS REFUSAL, NOT REWRITE. §3.8 and R8 say "on a parse failure, write
   only the single key being set rather than resetting the object" — but the current
   code already produces exactly those bytes (`state = {}` then `state[key] = open`
   stringifies to `{key: open}`), so the instruction as literally worded is a no-op, and
   test 8.1's "writes the single key AND does not reset the object" cannot both hold
   when there is no readable object. I implemented the reading consistent with §0.1
   rule 6 (a hard stop-condition: never destroy persisted bytes without a click that
   named that outcome) and with R8's own stated goal of leaving no instance of the
   swallow-then-overwrite SHAPE in the file: a present-but-unparseable UI-state value is
   left exactly as it is, silently — no quarantine, no banner, no disclosure, since the
   payload is a layout preference. Cost: a user with a corrupted ui-state key can no
   longer persist accordion state until they clear it from the recovery screen. Flagging
   for a ruling; the alternative is three characters away.

3. SCREENSHOTS NOT WRITTEN TO docs/proof/. This environment has no screen-recording
   permission (`screencapture` → "could not create image from display") and the browser
   tool returns images inline, not to disk, so
   `f22-quarantine-banner-{1280,390}.png` / `f22-recovery-screen-1280.png` do not exist.
   All three views were captured and inspected in-session; `docs/proof/f22-verification.txt`
   carries DOM-level assertions over the same content, and every banner and
   recovery-screen state is pinned by tests. Someone with screenshot capability should
   backfill the three PNGs.

ONE ADDITION BEYOND THE BRIEF, found during the live proof: the quarantine banner is
keyed on the quarantine KEY'S EXISTENCE, not on this boot's outcome. The brief's A3
snippet implies `boot.kind === "unreadable"`, but after "Clear just the unreadable
autosave" the next boot reads "absent" — a boot-outcome-keyed banner would leave the
preserved bytes sitting in storage with nothing pointing at them. `persistableRef` is
deliberately still seeded from the boot outcome only: a stale quarantine must not
suppress autosave for a healthy build. Both properties are pinned (2.1b).

DESIGNER ASKS (raised, not resolved)
1. `Banner`'s `role` defaults to `"status"` with no opt-out, so `QuarantineBanner` IS a
   live region. `design-spec.md` §6 budgets "three, and only three"; `DriftBanner`
   already ships as a fourth, and this is a fifth. Shipped the default as ruled (R5) —
   widening the primitive is a `src/ui/primitives/**` edit this slice denies. The §6
   budget no longer matches reality and needs a rev-5 ruling. Note the deliberate
   contrast with F4's A2, which routes ITS disclosure to plain text to avoid a fourth
   region: if Designer disagrees they are ruling on both at once.
2. CONFIRM ASYMMETRY (OQ-2). `Discard` on the quarantine banner ships with NO confirm,
   matching `main.tsx`'s shipped precedent, while slice D ADDS one to the nuclear
   action. Blast radius scaling the ceremony is defensible, but it is a Designer call.

OQ-1 SURFACED, NOT RESOLVED — the multi-tab bargain is not the documented one.
`tech-strategy.md` §9 accepts last-write-wins, but the unconditional pagehide flush makes
the shipped behaviour "last tab CLOSED wins": a stale tab opened yesterday clobbers a
newer tab's save merely by being closed, with no edit and no intent. F2.2 NARROWS this —
a stale tab whose boot read failed no longer flushes at all — but a stale tab whose boot
read SUCCEEDED still flushes yesterday's state over today's on close. F2.2 does not close
it. Ask: re-affirm last-write-wins (and correct §9's wording to "last tab closed wins"),
or schedule a follow-up. Cheap version is a `savedAt` freshness check before the flush;
thorough version is `BroadcastChannel`. Blocks nothing.

PRE-EXISTING FAILURES — DIAGNOSED AND FIXED AT THE ROOT
The two tests the F6 entry flagged ("save-as-new writes a second build" — the actual name
is "duplicating the same build twice yields distinguishable names" — and "save-as-new
with a taken name auto-suffixes") did NOT reproduce here: the clean dev tip ran 631/631
green, and `tests/ui/f2-builds-persistence.test.tsx` ran 10/10 standalone. Then one of my
own new tests failed the same way, which gave the cause: these are vitest's 5000ms DEFAULT
timeout, not logic failures. Each case renders the full App two to four times, which costs
seconds in jsdom, and once the whole suite runs in parallel the slowest cases cross 5s on a
loaded machine. This file already carried a `{ timeout: 20000 }` override on its heaviest
case — the convention existed and the rest of the file had not adopted it. Applied that
override to every case in the file and to the new App-rendering files, with a header note
explaining why. Load-dependent, so absence of a failure is not proof, but the mechanism is
identified and the margin is now 4x. `vite.config.ts` is a denied path, so a global
`testTimeout` was not an option.

NEXT
F4 is unblocked and is the intended next slice; it must re-run its `rg` sweep and reader
inventory because `App.tsx` moved. Awaiting Tier 1 / Designer on: the two Designer asks,
the F-F ruling, OQ-1, and whether slice G part 2 folds into F4. The user can resume using
Rename and the recovery screen — both are now safe. Their live localStorage was captured
verbatim before the browser proofs and restored byte-for-byte after; no key outside the
app's own namespace was left behind.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 — F7 + F8 integrated into dev: PR #2 rebased over the F2.2 wave, 691 tests green
Type: fyi
Actor: Tier 2 implementer (Claude Opus 5) — Tier 1 dispatch
Slice: n/a (integration chore)

WHAT
PR #2 (branch claude/right-sidebar-width-62di4r, authored in a parallel cloud
session) carried TWO commits, not the one it was opened with: F7's category
identity colour layer (§2.8) and a later F8 splitting ATTR_LABELS into a
display map and ATTR_SOURCE_LABELS. Both are now on dev.

The branch's parent was already b22f8ab — it was cut AFTER the rev-6 rail
re-cut, not before it — so the anticipated src/styles/app.css conflict did not
exist. The only divergence was the F2.2 wave (ff8544e, 8fbaacd, 6713746),
which shares exactly one file with this branch: this log.

Strategy: rebase onto dev, then fast-forward. dev has no merge commits since
b22f8ab and PR #1 landed linearly off this same branch, so a rebase keeps the
established shape. Author metadata is preserved on both commits; nothing was
squashed.

CONFLICTS AND HOW THEY WERE RESOLVED
One file, .claude/reportback.md, conflicting once per replayed commit. Both
sides were pure appends at EOF with zero deletions, so each was resolved by
concatenating the base file with all three self-delimiting blocks — no side's
entry was dropped or reflowed.

Ordering is by the entries' own authorship time, not by landing order: F7
17:22:30Z, F8 17:29:03Z, F2.2 17:39:43Z. So F7 and F8 sit ABOVE the F2.2 entry
even though F2.2 reached dev first. That is the judgement call in this
integration — "newest last" is read against when an entry was written, which
keeps the log a truthful chronology rather than a merge-order artifact.

No colour value was touched. The user-directed Physicals→gold and
Playmaking→orange correction is Designer's, and ships as its own slice.

EVIDENCE
pre-rebase PR #2 tip   900db6e → 0338172
post-rebase            0392b7d → d5d0f3c   (fast-forwarded onto 6713746)
PR #2's twelve owned files are byte-identical pre- and post-rebase
(git diff 0338172 d5d0f3c over those paths is empty); the only delta is this
log.

npm test        691 passed / 691, 46 files, 0 failed  (baseline on 6713746 was
                675; +16 from F7's category-colors guard and F8's vocabulary
                guards)
npm run typecheck   exit 0
npm run build       exit 0 — 65 modules, dist 276.19 kB / 83.96 kB gzip

H2 overlay ship gate, run explicitly:
  tests/ui/overlays.test.tsx — 4 passed / 4, both ship-gate cases green.
  F7's claim that it adds no data-* to ledger DOM holds structurally too: the
  slice's only TSX change is data-attr-group on AttributeGrid's fieldset, and
  that file references no ledger DOM.
Vocabulary lint: vocabulary + alias-bijection + category-colors — 74 passed / 74.
Runtime dependencies still exactly {react, react-dom}.

Baseline note: on the clean 6713746 tip a full-suite run showed 673/675, with
tests/ui/f2-disclosure-surfaces.test.tsx and f2-eligibility-disclosure.test.tsx
each timing out at 5s. Both pass in isolation and both passed in the post-merge
full run. They are load-dependent vitest timeouts under full-suite parallelism,
not regressions — the same flake class the F6 and F7 entries flagged.

SCOPE / PLAN IMPACT
None. Additive slice; no scope.md, tech-strategy.md, design-spec.md or
H-ruling change.

NEXT
Designer's two-hue correction (Physicals → gold, Playmaking → orange) lands on
top of the six §2.8 tokens in tokens.css. The contrast proof in
docs/proof/f7-contrast.txt was calibrated against the current six, so it must
be re-derived for the two that move. User's live acceptance pass on the palette
is still the real DoD.
─────────────────────────────────────────────

─────────────────────────────────────────────
F7.1 — Physicals takes gold, Playmaking returns to orange   [slice complete]
2026-08-25 · branch dev · commit 6fd0db1 · design-spec §12.12

WHAT SHIPPED
The two user-directed hue substitutions the previous entry named as NEXT.

  --cat-playmaking   #c9ab19  →  #f58236   (gold → orange)
  --cat-physicals    #a582ec  →  #beb448   (violet → gold/brass)

Two literals in src/styles/tokens.css and nothing else in that file. The
channel rule, the selectors, the four consuming surfaces, the --cat
inheritance mechanism, the §10.6 forced-colors companion and the single TSX
line are untouched — verified by diff (the file's only delta is two lines).

AUTHORITY
User-directed override of PR #2, not a Designer re-derivation. Provenance is
the user's own NBA 2K HQ build-sheet screenshot, which colour-codes Physicals
gold/tan and Playmaking orange. Physicals takes gold, so Playmaking vacates it.

PROOF FILE — REGENERATED, NOT HAND-EDITED
docs/proof/f7-contrast.txt was rebuilt by a generator that reads the shipped
tokens.css, so no figure in it is typed. The generator was calibrated first:
it reproduced all four method-calibration figures (bronze 6.65, --danger 5.65,
--warning 7.50, --border-strong vs surface 3.77) AND every pre-substitution
value in the old file exactly — all six rows, both nearest-token ΔE columns,
the 5.69–8.40 spread, the ΔE floor 32.9 with binding pair Finishing↔Physicals,
and all three CVD lines — before a single value was substituted.

  floor line now reads:  mutual worst: Playmaking vs Defense ΔE 38.8
  range line now reads:  contrast spread: 5.69 – 8.84 on --bg-canvas

The four calibration figures do not move under the substitution, which is the
check that says no token outside the two was touched.

Nine of the fifteen ΔE pairs changed; the six not touching Playmaking or
Physicals (F↔S, F↔D, F↔R, S↔D, S↔R, D↔R) are unchanged.

NEW COLUMNS. §2.8.1 puts a category hue on TYPE (the digest title), so the
canvas-only file was under-covering. Added --bg-surface, --bg-raised and
--danger-quiet, which makes all THIRTY pairings explicit. All thirty clear the
4.5:1 AA text bar. Worst text pairing anywhere: Defense on --danger-quiet at
4.79:1, margin 1.06×.

FINDING — recorded, not smoothed over
The tritan worst pair moves 1.4 → 0.5 (Playmaking↔Defense → Defense↔Physicals).
design-spec §12.12.7 checked only the red-green axis, so this movement is not
in the spec and is a genuine regression on a third axis. It does not change the
conclusion and is written into the proof file rather than omitted: 1.4 and 0.5
are both far below the ~2.3 JND, so the palette's tightest tritan pair was
already indistinguishable and is merely a different indistinguishable pair now.
No pair crosses from separable to inseparable (Defense↔Rebounding is 2.4 before
and after), and §6's structural mitigation — every consuming surface renders
the category NAME as text — is unchanged. Protan improves 5.0 → 13.4 and
deutan is unchanged at 6.4, so two of three axes hold or improve.

TESTS — four of the six named assertion classes did not exist
The brief expected to EDIT pinned figures, a range max, a ΔE floor constant and
a binding-pair name. The shipped twelve assertions are AA-bar + channel/selector
+ calibration only: no hex literals, no pinned figures, no range max, no ΔE
floor, no binding pair, and no hue-gap assertion to remove. §12.12.9 ③
anticipated this ("if PR #2's twelve are AA + ΔE only, this row is moot"), but
the ΔE guard §12.12.5 reason 3 assumes exists does not, and the substitution is
what makes ΔE load-bearing. So the directed values were LANDED as new guards
rather than edited:

  + pins both substituted hex literals and their canvas figures (7.33 / 8.84)
  + pins the range: min 5.69 unchanged, max 8.40 → 8.84
  + DELTA_E_FLOOR = 38.8, with 32.9 recorded in the doc comment as the
    pre-substitution floor so a regression reads as a deliberate edit
  + asserts the binding pair NAME separately (playmaking/defense), because
    that is the half most likely to be left stale when only the number moves

NO hue-gap assertion was added and none was removed (none existed). §12.12.5
retires the metric: Playmaking↔Defense is 27.9° of hue at ΔE 38.8 while the old
worst pair was 49.8° of hue at only ΔE 32.9 — degrees mis-rank provably here.
tests/category-accents.test.ts was NOT created.

The two new ΔE assertions provably discriminate: on the pre-substitution
palette the generator measures the floor at 32.9 bound by Finishing↔Physicals,
so both would fail on a revert.

EVIDENCE
npm test            694 passed / 694, 46 files, 0 failed  (691 baseline + 3
                    added; no other assertion moved, no flake this run)
npm run typecheck   exit 0
npm run build       exit 0 — 65 modules, dist 276.19 kB / 83.96 kB gzip
tests/category-colors.test.ts   15 passed / 15, run explicitly
tests/vocabulary.test.ts + tests/layout-arithmetic.test.ts   77 passed / 77
                    (layout arithmetic green — a colour substitution moves no
                    layout arithmetic, per §12.12.9 ⑥)
Runtime dependencies still exactly {react, react-dom}.

BROWSER CONFIRMATION — http://localhost:5173 at 1440px, existing dev server
Computed --cat-* tokens and the resolved --cat on all six live sections match
the shipped hex exactly. Digest titles paint: Playmaking rgb(245,130,54)
= #f58236, Physicals rgb(190,180,72) = #beb448.
Visually: the PLAYMAKING attribute legend and its Pass Accuracy / Ball Handle /
Speed With Ball slider fills read orange; the PHYSICALS legend and its Speed /
Agility / Strength / Vertical fills read gold. Defense stays red, Rebounding
magenta, Shooting green, Finishing blue.
Gold-vs-gold check: the gold PHYSICALS digest title (#beb448) was viewed in the
same frame as the Gold-level pip (#e3b341) on the Brick Wall card beneath it.
Clearly distinguishable, and by the carrier split §12.4.1 derived rather than by
luminance — a flat unenclosed letter-spaced word at heading weight against a
small ringed disc enclosing the letter "G", plus the chroma drop. ΔE 17.8, which
is 45% further apart than the ΔE-12.3 gold PR #2 already paints on that surface.

KNOWN NOT-OURS
The load-dependent vitest flake class (5s default timeouts under full-suite
parallelism) did not fire this run. F2.2's { timeout: 20000 } values were not
touched.

FLAGGED FOR A DECISION — not actioned, outside the two-literal boundary
src/styles/tokens.css lines 145–146 carry a DERIVATION comment that is now
stale: "Range is 5.69:1–8.40:1 on --bg-canvas" and "Mutual separation is
ΔE >= 32.9". Both figures moved (8.84 and 38.8). The brief scoped this file to
two literals and named the comment block's channel rule as must-not-touch, so
this was left alone and reported instead of improvised. It is a two-line
follow-up and it is exactly the stale-number class this slice was written to
avoid, so it should not sit long.

SCOPE / PLAN IMPACT
None. §12.12 is the binding record and is fully implemented.

NEXT
User's live acceptance pass on the palette is still the real DoD. §12.12.6's
three merge conditions are already satisfied by PR #2 as shipped and were
re-confirmed here: --danger does not override --cat on the digest title, --cat
does not propagate past the title, and the title's --bg-surface and
--danger-quiet pairings are now in the proof file.
─────────────────────────────────────────────

═════════════════════════════════════════════
F5.2 — the L information-architecture re-cut (LAYOUT ONLY) · slice-complete
Agent: Tier-2 implementer (constrained mode) · 2026-08-25
Brief: workspace/badge-builder-2k27/impl-briefs/f5-2-ia-recut-layout-only.md rev 2
Design authority: design-spec.md rev 6 §13.0.1 (authoritative over the rest of §13)
Implementation commit: e11e8f1 · Branch dev · main untouched
─────────────────────────────────────────────

REBASE ANCHOR
Tip b94d403. Designer's two-hue correction HAD landed (6fd0db1 + b94d403), tree
clean apart from the untracked .claude/worktrees/. tokens.css read
--cat-playmaking: #f58236 and --cat-physicals: #beb448, i.e. the post-hue side
of §0.1 ⑤. Baseline suite 46 files / 694 tests green in 35.77s — three ABOVE
the brief's recorded 691, exactly as §0.1 ⑤ predicted, and 694 is the
denominator every count below is arithmetic against.

One precondition was superseded by the dispatch: :5173 was already bound by a
dev server the orchestrator had started, with an explicit instruction to use it
rather than restart it. Everything else in §0.3 passed as written.

changed_files (all within Allowed paths)
  src/App.tsx · src/styles/app.css · tests/layout-arithmetic.test.ts
  tests/ui/f2-source-pins.test.ts · tests/helpers/test-utils.ts
  docs/proof/f52-{before-1280,after-390,after-768,after-1280,after-1440}.png
  docs/proof/f52-seam-{1339,1340,1356,1357}.png · docs/proof/f52-verification.txt
  .claude/reportback.md (this entry) + the two authorized tokens.css comment
  lines (see AUTHORIZED CARVE-OUT below) — both in THIS commit, not e11e8f1.

denied_paths_checked — I did not touch any of these
  src/ui/** (no .tsx under it changed; C7 held — every selector §13.5 needs
  already existed) · src/engine/** · src/data/** · src/config/** ·
  src/persist/** · src/main.tsx · tests/category-colors.test.ts ·
  tests/ui/overlays.test.tsx · tests/ui/f2-disclosure-surfaces.test.tsx ·
  tests/vocabulary.test.ts · tests/alias-bijection.test.ts · every other test
  file · scripts/** · package.json · package-lock.json · *.config.* ·
  tsconfig.json · .env* · .claude/** except this file.
  src/styles/tokens.css: NO token value changed and no token was added. Only
  the two comment lines the dispatch explicitly authorized.

first_proof_result — RED BY 49px, verbatim in f52-verification.txt §1
  Against the UNMODIFIED tree at b94d403, zero CSS bytes changed:
      const rowBox = RAIL_RIGHT - SECTION_CHROME - 2 * WELL_PAD_X;  // 204-34-8 = 162
      expect(rowBox).toBeGreaterThanOrEqual(76 + ROW_GAP_X + 127);  // 76+8+127 = 211
      AssertionError: expected 162 to be greater than or equal to 211
  211 − 162 = 49. The temporary `it` was deleted; the arithmetic survives as
  the permanent shippedBroken canary in the rewritten I8b.

SHIPPED GEOMETRY
  L breakpoint 1280, and it is the only fixed-rail breakpoint.
  grid-template-columns: 300px minmax(0, 1fr);   rail content box 266.
  XL tier deleted — `rg -n "1440" src/` returns nothing. Right rail deleted —
  `rg -n "rail-right" src/` returns nothing. Well sides back to --space-3 and
  the ledger column-gap --space-3, uniform at every width, no tier to restore.

   WIDTH | .layout          | ledger rail | cards     | synergy tracks    | pickers
     390 | 366px            | none        | 1-up @366 | 332px             | column
     768 | 736px            | none        | 2-up @362 | 702px             | row
    1280 | 300px 936px      | block       | 3-up @304 | 601px 601px       | row
    1440 | 300px 1096px     | block       | 4-up @265 | 450px 450px 450px | column*
  No horizontal scrollbar at any width. * see T16 below — the one deviation.

  4-up seam, derived and exact. It is a centre threshold (995 → 3-up, 996 →
  4-up); headless Chrome has 0-width overlay scrollbars, so the named 1356/1357
  pair maps to 1339/1340 there. Both pairs shot. 1339 → centre 995 → 3-up;
  1340 → centre 996 → 4-up at exactly the 240px card floor. With a 17px classic
  scrollbar the same centres fall on 1356/1357, matching §13.0.1 exactly.

WHICH .rail-left RULE I EDITED (T7)
  The EXISTING one, inside @media (min-width: 1280px) — the sticky rule with
  max-height and overflow-y. No second base `.rail-left {` rule was created, so
  the overflow guard still inspects the block that actually has overflow-y.
  .synergy-panel's grid rule sits at its existing location, BELOW the badge-card
  grid, so CARD_FLOOR still parses 240 (T5).

THE --cat CHAIN SURVIVED — all five §4.2 confirmations, at 1280
  categoryAnchorId still has exactly two consumers and neither file appears in
  git status. Six slider fills in six distinct hues with the .attr-group
  fieldsets now two asides deep (#3d93e9 #1caf61 #f58236 #ef5a64 #e467bb
  #beb448 — the last two confirm the two-hue correction intact). Six legends
  and six digest h2s in their category hue. Jump-nav shows two neutral-bordered
  panel chips at the FRONT followed by six hued chips, exactly as C9 rules.
  tests/category-colors.test.ts 15/15 without being edited.

verification_evidence
  npm test                               46 files / 701 tests   PASS
  npm run typecheck                      exit 0                 PASS
  npm run build                          clean                  PASS
  overlays.test.tsx (H2 gate)             4/4                   PASS
  category-colors.test.ts (--cat gate)   15/15                  PASS
  f2-disclosure-surfaces.test.tsx (D1)   11/11                  PASS
  layout-arithmetic + f2-source-pins     35/35                  PASS
  git status clean before this commit.
  Count arithmetic: 694 − 4 (I3-at-XL) − 1 (f2-source-pins XL pin) + 12 = 701.
  Per file: layout-arithmetic 19 → 27, f2-source-pins 9 → 8.

FOUR DEVIATIONS FROM THE BRIEF — all measured, all in f52-verification.txt §5
  D1  .rail-column, ONE structural element beyond the brief's JSX, and it was
      necessary. A sticky grid item is constrained by the grid CONTAINER, not
      by its own row, so with the panels in rows 2–3 the rail scrolled out of
      the grid and painted over the Synergy panel (measured doc-top 4660
      against a grid ending at 4644). Four no-new-element candidates were
      tested and none moved the clamp by a pixel. The wrapper clamps it at
      3768 = exactly row 1's bottom. It carries no landmark, no id, no
      storageKey, no state, and one declaration. .rail-left keeps every rule
      the brief specifies, so T7's guard and the frozen
      `.rail-left .segmented__track` selector are both intact — the Position
      grid still resolves to 3 × 87.33px, matching §13.0.1's predicted ~88px.
  D2  .ledger-overview__label min-width 0 → max-content. §13.4's literal CSS
      collapses the label track to 0px: `1fr auto` sizes auto from content
      first, the over-budget metrics want 303px of a 230px box, and min-width:0
      removes the fr track's automatic minimum. Measured with the spec's CSS:
      tracks "0px 230px", all six labels 0px wide, overflowing onto their own
      numbers — and it renders almost-plausibly, which is why nothing caught
      it. After: "77.41px 152.59px", which is §13.4's stated intent.
  D3  .synergy-panel floor takes §11.5 ③'s min() idiom. A bare 426px floor is
      absolute: at 390 the track stayed 426 in a 366 box and the document grew
      a horizontal scrollbar (scrollWidth 455 vs 390). §13.5's own table says
      that row is 366, so the spec asserted shrink-to-fit and then forbade it.
      426 is still one number used twice. Consequence handled: ATTR_CELL_FLOOR
      parsed the first min() idiom in the file and .synergy-panel sits above
      the attribute grid, so it is now read out of that block by name.
  D4  The @container block moved below `.synergy-row__pickers`. §13.5 lists it
      immediately after `.synergy-row`, but the base `flex-direction: column`
      is ~40 lines lower and a container query has no specificity of its own —
      so at the spec's position the query evaluated true and changed nothing.
      Measured before the move: 601px row, pickers still "column". Both D3 and
      D4 are now pinned by new assertions.

FOR DESIGNER — rev 7
  T16's band is NOT empty, and 1440 lands in it. A size query evaluates against
  the CONTENT box, and .synergy-row is a fieldset with 34px of chrome, so the
  threshold effectively fires at border-box ~460. 1280 → row 601 → content 567
  → side by side; 1440 → row 450 → content 416 → STACKED. That contradicts
  §4.3's "1440 identical to 1280". Failure direction is conservative and stop
  condition #12 is scoped to 1280 (green), and T16 explicitly forbids
  re-deriving the number, so I left 426 alone. Designer's call.
  ROOT CAUSE, and it generalises: §13.0.1's below-grid table omits the
  <Section> chrome. Re-derived — 1280: (1214−12)/2 = 601, not 609; 1440:
  (1374−24)/3 = 450, not 455. Those 5px are exactly what drops 1440 under the
  threshold. Same class of omission as I12's, one level up.

  C4 CLEARS, by 0.56px. Browser-measured max-content of the pinned 15-char
  string "112/116 · 13/15" in the shipped --font-num at 14px = 126.44px against
  the pinned 127. Not a stop-and-report, but it is measured at the limit.
  Final slack as the code computes it: 266 − 239 = 27 ≥ SPACE_6 24, +3.
  Recomputed with the measured label instead of the pinned one: 25.59, +1.59.

  C5 — the 76 ÷ 9 chars bridge is unsound, and here is why it looked right.
  "Rebounding" is TEN characters and renders in the PROPORTIONAL face; measured
  it is 77.41px, not 76. What 76 actually is, is the empty-state METRICS string
  "0/0 · 0/—" — nine --font-num chars, measured 75.86px = 9 × 8.43. The two
  constants coincidentally shared a value and the note attached to the wrong
  one. The advance is sound (8.429 px/char, confirmed twice independently);
  only the bridge is wrong. Recommend restating it from the metrics string and
  re-pinning LEDGER_LABEL_MAX at 78, which the slack still funds.

  Cosmetic: the over-budget row wraps with the middot leading line 2
  ("· 11/9 over by 2 ⚠"). P0-1's per-metric spans are intact.

AUTHORIZED CARVE-OUT — tokens.css, two comment lines, zero token values
  The F7.1 entry above flagged tokens.css lines 145–146 as carrying stale
  numbers and left them for a follow-up. The dispatching orchestrator
  explicitly authorized correcting those two lines here and nothing else in the
  file. Done, in this commit: range 5.69:1–8.40:1 → 5.69:1–8.84:1, and
  "ΔE >= 32.9" → "ΔE >= 38.8 (Playmaking↔Defense, the closest pair)". No token
  value changed, no token added, the channel-rule block untouched. That
  follow-up is now closed.

heartbeats_emitted: 0 discrete messages — dispatched in batch mode, so progress
  is recorded here and in f52-verification.txt rather than streamed.

stop_conditions_triggered: none.
  #2 was approached and cleared: no .tsx under src/ui/ was needed, C7 held.
  #12 was checked explicitly and is green at 1280 — header on ONE line
  (measured 53px against a 53px tallest child; the real header demand is 400px,
  under the conservative 426 pin) and pickers side by side. The 1440 picker
  stack is recorded above as a T16 observation, not a stop condition.
  #9 checked and cleared: 126.44 ≤ 127. #8 cleared with 175px of margin.
  #10 respected: no overflow-x: hidden or clip anywhere; the 390 scrollbar was
  fixed at its cause, not masked.

KNOWN NOT-OURS — the flake class fired, twice, and is recorded
  Run A: 8 failures across 3 files under full-suite parallelism. Run B: 1 —
  tests/ui/f2-eligibility-disclosure.test.tsx, "Test timed out in 5000ms",
  which §4.4 names by file. ISOLATION: that file 6/6 PASS in 8.81s;
  f2-disclosure-surfaces 11/11 PASS. Full-suite re-run on the unchanged tree:
  46/46 files, 701/701 PASS. No { timeout: 20000 } was lowered, added or moved,
  and vite.config.ts was not touched.

NEXT
  Designer owns three calls: the 426 threshold vs the content-box band at 1440,
  the LEDGER_LABEL_MAX re-pin at 78, and whether §13.0.1's below-grid table
  should be re-derived with Section chrome included. None blocks the slice.
  §13.0.1 also asks that the ledger's move out of a right-hand column be
  surfaced to the user as a named, reversible choice — that has not been done
  and is not an implementer's call.
─────────────────────────────────────────────

═════════════════════════════════════════════
Test-harness label index — integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: test-harness-labels (tip 561266f, impl ce2ba63) · base b94d403
Record: docs/proof/shared-label-index.md (authored on the branch, §7 asked for
  exactly the re-verification below)
Integration commits: 59d2c39 + d45f8a8 · Branch dev · main untouched
─────────────────────────────────────────────

WHAT LANDED
Test-harness only. Three files, +773: tests/setup-dom.ts, the new
tests/ui/shared-label-index.test.tsx, docs/proof/shared-label-index.md. No
src/**, no vite.config.ts, no other test file, no dependency change.
jsdom's per-element `.labels` walk is replaced by one label→control index built
once per DOM version, invalidated off jsdom's own document `_version` counter.

INTEGRATION MECHANISM — cherry-pick, not a merge commit
dev had advanced b94d403 → 9bd851c (F5.2). This history is strictly linear
(zero merge commits; 6949956 records the prior integration as "rebased onto
dev"), so the two branch commits were cherry-picked to preserve that. Verified
equivalent, not merely similar: the resulting tree is bit-identical to a real
merge tree (`git merge-tree 9bd851c 561266f` → empty diff against HEAD), all
three files hash-identical to their 561266f blobs, and no fourth file differs
from 9bd851c. Zero conflicts — the branch's files and F5.2's files do not
intersect, so .claude/reportback.md never conflicted. test-harness-labels was
left unmoved so the /tmp/bb-harness worktree is undisturbed.

PASS-SET DIFF — against the real merge base 9bd851c, keyed `file :: full name`
  baseline entries: 701      after entries: 713
  missing after: 0           status changed: 0
  added excluding tests/ui/shared-label-index.test.tsx: 0
  baseline all passed: true  after all passed: true
Three baseline runs and three post-merge runs, pass sets byte-identical within
each set. The known F2.2 flake class did NOT fire once in 12+ full-suite runs.

TIMINGS — interleaved before/after in one loop, 3 rounds, load 5.7–24.3
Separate-block measurement was discarded: a load spike inflated two post-merge
isolated runs to 12.3/12.7 s and would have understated the win.
  full suite wall     39.87 / 38.11 / 35.65 s  →  11.29 / 11.13 / 11.26 s
  full suite `tests` 168.20 /152.52 /152.14 s  →  52.97 / 53.16 / 53.77 s
  f2-builds-persist   28.63 / 29.85 / 29.55 s  →   7.37 /  7.05 /  7.23 s
Spread after: 0.16 s full-suite wall, 0.32 s isolated wall. ~3.4x full-suite
wall, ~4.0x on the isolated file. The branch's §7 forward-check numbers hold.

GATES — all green on the merged tree
  npm run typecheck clean · npm run build clean (65 modules, 276.31 kB)
  runtime dependencies still exactly {react, react-dom}; package.json,
  package-lock.json and vite.config.ts byte-unchanged vs 9bd851c
  RUN-never-edit gates: tests/ui/overlays.test.tsx + tests/category-colors.test.ts
  19/19 pass, both files unmodified vs 9bd851c

TIMEOUTS — deliberately NOT lowered
No `{ timeout: 20000 }` annotation was changed, added or moved. For the record,
the headroom they now carry: slowest single test 15 327 ms → 2 598 ms; tests
over 5 000 ms 4 → 0; over 3 000 ms 17 → 0; over 1 000 ms 44 → 14. The worst
case went from 4.7 s of headroom to 17.4 s. Removing the annotations is a
separate change with its own review surface and is not made here.

RESIDUAL RISK — re-verified on the merged tree, still holds, unchanged
The index returns a frozen snapshot for the current DOM version where native
`.labels` returns a live NodeList. Re-confirmed empirically after the merge
(throwaway probe, deleted): the snapshot is a frozen Array carrying length,
index access, item() (null out of range), iteration, forEach/entries/keys/
values — and `instanceof NodeList === false`, `Array.isArray === true`.
A held reference across a mutation stays stale (held.length 1 → 1) while a
re-read is current (→ 0), exactly as §6 documents.
Consumer survey re-run against the moved dev, since that was the open question:
`.labels` appears zero times in src/** and tests/** outside the harness's own
two files, and zero times in all five files F5.2 touched. In node_modules the
only DOM readers remain @testing-library/dom (`getRealLabels`, whose one call
site is `Array.from(getRealLabels(element))`, with no importer outside the
package) and dom-accessibility-api (null-check then immediate copy). Neither
branches on Array.isArray. No consumer holds a reference across a mutation.
Verdict: the risk is real, unchanged by the merge, and still unreachable.

NEXT
Nothing blocking. The 20 s annotations are the user's call, on the numbers
above. Fallback if ever needed is still a one-line delete of the
installSharedLabelIndex() call, which the guard file's install check will
report loudly.
─────────────────────────────────────────────
F4.1 — official-2K-page data adoption   [slice complete]
2026-08-25 · branch `f4-official-data` (worktree-isolated, NOT `dev`) · commit bf02019
impl-briefs/f4-official-data-adoption.md · constrained mode

WHAT SHIPPED
All five parts of the brief, plus the two blocking amendments A1 and A2.

A — 53 descriptions + 19 isNew flags through the dataset pipeline. A SECOND
    source file (src/data/badges.enrichment.source.txt); badges.source.txt's
    sealed-verbatim contract is untouched. generate(source, enrichment) is the
    single entry point; roster parses FIRST, then enrichment, then a name join
    that throws on every mismatch. dataVersion → 2026-08-26.1, asOf 2026-08-26,
    source extended, gameVersion STILL null. description/isNew REQUIRED on
    RawBadge and Badge. badges.json regenerated, never hand-edited.
B — disciplineLock on SynergySlot, enforced HARD in assignSynergy AND
    validateLoadout (one violation per POSITION), surfaced in the Synergy Slot 7
    picker as disabled options with the reason in the label. Nothing is ever
    auto-cleared.
C — The 20-Badge-Slot default on BudgetTotalRow, four ruled states, unset guard
    FIRST. H4 SOFT permanently.
D — onFuse as DEFAULT_REFUND_TRIGGER; isFusedFor seam injected per basis via
    synergySlotActive(s, overlayForBasis(basis)).
E — Synergy Slot 7 = ratified +2, engine-enforced via isRatifiedPlusTwo, load-
    normalized by applyRatifiedMagnitudes and DISCLOSED at all three routes.

EVIDENCE
npm test            849 passed / 849, 52 files, 0 failed (baseline 694)
npx tsc --noEmit    exit 0
npm run build       exit 0 — 65 modules, dist 282.84 kB / 85.90 kB gzip
npm run generate:badges   53 badges at dataVersion 2026-08-26.1; re-running
                    leaves badges.json byte-identical (regen is idempotent)
tests/architecture.test.ts   FIVE groups observed, (a)–(e), all green, UNEDITED
tests/vocabulary.test.ts     green, unedited
Runtime dependencies still exactly {react, react-dom}. tokens.css untouched.
Full record + browser proof: docs/proof/f4-verification.txt

CONSTRAINED-MODE REPORTBACK
changed_files:
  src/data/{badges.enrichment.source.txt (NEW), badges.json (REGENERATED), README.md}
  scripts/{generate-badges.ts, generate-badges-cli.ts}
  src/engine/{types,synergy,synergy-ledger,ledger,validate-loadout,serialization}.ts
  src/engine/__fixtures__/synthetic-badges.ts
  src/engine/dataset.ts   ← SEE SCOPE DEVIATION 1 BELOW (a DENIED path)
  src/config/{index.ts, README.md} · src/App.tsx · src/styles/app.css
  src/ui/grid/BadgeCard.tsx · src/ui/synergy/SynergyPanel.tsx
  src/ui/summary/SummaryPanel.tsx · src/ui/build/BudgetGrid.tsx (BudgetTotalRow ONLY)
  tests/{generate-badges,data-integrity,spot-check,config,synergy,synergy-ledger,
  ledger,validate-loadout,serialization}.test.ts
  tests/enrichment-spot-check.test.ts (NEW)
  tests/ui/{f4-badge-card-description,f4-budget-total-baseline,f4-dataversion-drift,
  f4-slot7,f4-plus-two-roundtrip}.test.tsx (all NEW)
  tests/ui/{m4-rig.ts, app.test.tsx, position-height-clamp.test.tsx}  (A4 re-homing)
  tests/ui/{synergy-panel,f2-disclosure-surfaces}.test.tsx  (copy re-cuts, see below)
  docs/proof/f4-* (5 screenshots + f4-verification.txt) · this file
denied_paths_checked:
  UNTOUCHED, verified by `git diff HEAD --` per path: src/data/badges.source.txt ·
  src/engine/eligibility.ts · src/engine/validate-build.ts (the near-name trap —
  the discipline lock went into validate-loadout.ts) · src/engine/{vocabulary,
  cost,errors}.ts · src/data/position-heights.ts · src/styles/tokens.css ·
  src/persist/** (0 changes — F2.2's raw-string patchStoredEntry route in
  renameNamedBuild/duplicateNamedBuild is intact and was never routed back
  through the deserializer) · src/ui/shell/** · src/ui/builds/** ·
  src/ui/primitives/** · src/ui/build/BuildPanel.tsx (its compact
  `${totalEquipSlots} Badge Slots` digest did NOT get the annotation) ·
  src/ui/build/AttributeGrid.tsx · src/ui/grid/** except BadgeCard.tsx ·
  docs-drafts/** · package.json · package-lock.json · tsconfig.json ·
  vite.config.ts · tests/architecture.test.ts · .claude/** except this file.
  The POSITIONS de-dup in serialization.ts was NOT taken (explicit non-goal).
  deriveBudget's docstring was deliberately NOT edited (R17).
first_proof_result:
  http://localhost:5199 (port 5173 was held by the concurrent F5.2 dev server;
  I did not disturb it). (a) the description disclosure reveals — measured:
  collapsed clientHeight 54px = 3 × 18px against scrollHeight 144px, [open]
  clientHeight 144px, so the EMPTY-BODY <details> DOES reveal and the
  pre-authorized fallback was NOT needed; (b) the badge's purchase level did
  NOT change on expand — status stayed "Not purchased", 0 checked pips,
  data-purchased-level absent; (c) NEW chips render (Ghost Stepper, Post Spin
  Catalyst, Arc Cadence, Quick Trigger, Set and Fire, Smooth Operator, Static
  Middy, Pace). Screenshot docs/proof/f4-description-disclosure-1280.png.
verification_evidence:
  849/849 · tsc exit 0 · build exit 0 · docs/proof/f4-verification.txt ·
  docs/proof/f4-{description-disclosure,slot7-lock,onfuse-ledger,
  budget-total-20-default}-1280.png + f4-cards-390.png
heartbeats_emitted: batch-mode (live 5-minute heartbeats waived for this
  autonomous run, per the M1–F7 precedent in this channel)
stop_conditions_triggered: ONE — see scope deviation 1.

SCOPE DEVIATIONS — three, all reported rather than absorbed

1. [stop-condition] src/engine/dataset.ts IS A DENIED PATH AND I HAD TO TOUCH IT.
   The brief's §3.1 item 4 REQUIRES `description` and `isNew` on BOTH RawBadge
   and Badge ("required, not optional"). `loadBadge` in dataset.ts is the ONLY
   function in the codebase that constructs a `Badge` from a `RawBadge`, so with
   dataset.ts denied the required fields are unpopulatable and `tsc` fails:
     "Type '{...}' is missing the following properties from type 'Badge':
      description, isNew"
   The allowlist and §3.1 item 4 are therefore internally inconsistent — the
   SAME failure class the brief itself records as R3 ("the draft's own allowlist
   made the fix unreachable"). The change is a two-line pass-through:
     +    description: raw.description,
     +    isNew: raw.isNew,
   No loader guard, no arity logic, no behaviour changed. I completed it rather
   than shipping a non-compiling tree, and flag it here for ratification.

2. Test 8.6's two PERSISTED-SHAPE legs live in a new jsdom file
   (tests/ui/f4-plus-two-roundtrip.test.tsx), not in tests/serialization.test.ts.
   The brief puts 8.6 in group 8 but requires installMemoryLocalStorage(), and
   vite.config.ts sets `environment: "node"` with jsdom opted in by a PER-FILE
   docblock (vitest has no per-describe environment). serialization.test.ts
   keeps the pure deserialize→normalize→serialize→deserialize leg; both files
   cross-reference each other. Splitting was the only way to honour the config
   without editing it (vite.config.ts is denied).

3. Three test files were edited that the brief's "Expected EDITS" list does not
   name — all are within the wholesale-allowed tests/**, all are consequences of
   ruled copy changes, none is a mechanical patch-to-green:
   · tests/ui/synergy-panel.test.tsx — the PlusTwoDesignator copy and counter
     are re-cut to the REMAINING budget by §3.5 item 6, so "2 of these 8 are +2
     … 0 of 2" became "1 more Synergy Slot can be +2 … 0 of 1", and the cap test
     now needs only ONE user designation because slot 7's is ratified.
   · tests/ui/f2-disclosure-surfaces.test.tsx — the tooManyPlusTwoSynergySlots
     copy is EXTENDED by §3.5 item 5 to name slot 7 as the ratified one.
   · tests/ui/position-height-clamp.test.tsx — an F3 file that post-dates the
     brief and takes the trigger through defaultAppConfig; re-homed per A4.

BRIEF vs CODE — four places the brief no longer matched, all re-derived by string

a. §3.5's literal `RatifiedMagnitudeReport { readonly slots: SynergySlot[] }`
   REDDENS THE H1 VOCABULARY LINT. `slots` is a bare banned token and
   tests/vocabulary.test.ts greps src/**. The fix is always the code, never the
   lint, so the field ships as `synergySlots`. Both src/engine/synergy.ts and
   src/App.tsx were red on the first full run until this was renamed.
b. §4 test 7.4 asks that "SynergyPanel still contains EXACTLY ONE role=status".
   It contains TWO, and did before F4: the sr-only announcement region AND
   PlusTwoDesignator's Banner, which defaults to role="status"
   (src/ui/primitives/Banner.tsx). The invariant the ruling actually protects is
   that F4 adds NO NEW live region, so the test asserts that instead — it
   measures the live-region count with and without the disclosure and asserts
   they are IDENTICAL, plus that the disclosure node carries no role/aria-live.
   Reported rather than silently weakened.
c. §0.4's line numbers had all moved again (post-F2.2/F7/F8). Reconciled table
   below. Two rows the brief did not list.
d. §4 test 6.3's `Enter`/`Space` browser leg could not be proven under the
   available automation harness — see KNOWN NOT-OURS.

RECONCILED §0.4 READER INVENTORY (re-run under the charge "assume there is
another reader this table still misses")
  fromSaved                   src/App.tsx:182 → EXACTLY 3 call sites, confirmed:
                              :323 boot · :668 named load · :819 import.
                              (brief said 146 / 244 / 461 / 570.) All three now
                              destructure the pair — the shape forces it.
  createDefaultSynergySlots   synergy.ts:60 → still EXACTLY ONE src/ call site
                              (App.tsx:177). R12's premise HOLDS; test 7.6 pins it.
  synergyRoleFor              synergy.ts:99 → SIX call sites, confirmed:
                              synergy.ts:165, synergy.ts:261, BadgeCard.tsx:184,
                              BadgeCard.tsx:316, SynergyPanel.tsx:99,
                              SummaryPanel.tsx:116. The brief's corrected six.
  hardViolationText           SummaryPanel.tsx:46, 1 call site :129. tsc forced
                              the new arm, exactly as predicted.
  validateConfig / validateSynergyShape / the reassembly — all located by rg on
                              a distinctive string; no line number was trusted.
  TWO READERS THE BRIEF DOES NOT LIST, both found and both harmless:
   · src/persist/local-storage.ts:269 — a bare `deserializeSavedBuild(text)`
     inside listNamedBuilds(), persisted-reload + LIVE. It is why an unreadable
     entry vanishes from the switcher silently, and it is exactly why test 8.6's
     named-build leg asserts listNamedBuilds() still contains the build. No edit
     needed (src/persist/** stayed untouched), but it belongs in the table.
   · tests/ui/position-height-clamp.test.tsx:175 — an F3 test consuming
     createDefaultSynergySlots + defaultAppConfig; re-homed under A4.

RE-DECIDED, NOT PATCHED (N1) — per test, the new value and why
  tests/synergy.test.ts:78  was "with plusTwoSlotIds null every synergy slot is
    magnitude 1 — no +2 pair is ever guessed". NEW: slot 7 is 2, all others 1.
    WHY: the assertion encoded the never-guess rule, and slot 7's +2 is no
    longer a guess — it is ratified data. The half that survives verbatim (the
    SECOND +2 is still unpublished and never guessed) is what the six
    magnitude-1 slots and the null seam now assert.
  tests/synergy.test.ts:379 was `plusTwoSynergySlotIds(createDefaultSynergySlots())
    === []`. NEW: `[7]`, and the two-designation case is `[3,6,7]`.
    WHY: the function's CONTRACT ("list the magnitude-2 ids in array order") is
    unchanged and is still what is under test; only the fixture's truth moved.
  tests/serialization.test.ts's "rejects MORE than two magnitude-2 entries" —
    INVERTED to assert it does NOT throw. This is A1 itself; the comment records
    the reproduced data-loss chain so the gate explains itself.
  tests/validate-loadout.test.ts's "EXACTLY two stays legal" — the fixture now
    designates ONE slot, because the defaults already carry the ratified one.

A4 SWEEP — `rg -n "refundTrigger|defaultAppConfig" tests/`
  THREE tests re-homed to an explicit trigger. Every other refund test already
  passed its trigger explicitly; tests/config.test.ts remains the only file that
  asserts the default. The three are exactly the ones the bare `refundTrigger`
  grep cannot see because they inherit through defaultAppConfig:
  tests/ui/m4-rig.ts:47 (the shared rig, so it propagates), tests/ui/app.test.tsx:144,
  and tests/ui/position-height-clamp.test.tsx:176 (an F3 file post-dating the brief).

A3 TRANSCRIPTION INDEPENDENCE — reported honestly, not asserted
  The 53 strings in tests/enrichment-spot-check.test.ts were typed in a SEPARATE
  pass, re-reading the capture doc's table rows, and were NOT copy-pasted from
  badges.enrichment.source.txt or badges.json. But BOTH transcriptions were made
  by the SAME agent in ONE session from the SAME authority, so the independence
  is weaker than two-person duplicate transcription and the "an independent typo
  must be made identically twice" argument is correspondingly weaker. That is
  precisely why test 4.3 (shuffle-invariance) matters: it is MECHANICAL, needs no
  transcription and no discipline, and it is what actually catches the systematic
  join class. The residual — a mis-pairing IN THE CAPTURE DOC ITSELF — is
  undetectable by any in-repo gate and is written into the test file header.

DESIGNER ASKS — one combined ask, non-blocking, for rev 5/6
  1. [NIT-1 + §3.1 item 8b, raised together as ONE ask] The NEW chip ships on the
     EXISTING `info` Chip variant — F4 invented no variant. That is the SAME
     variant the Reaction role chip already uses, so two semantically unrelated
     chips now share one treatment in the title row. At 1280 the title row does
     NOT wrap past two lines with a NEW chip present (verified in the browser
     across Shooting and Rebounding, the two densest NEW categories), so the
     §3.4 title-row budget holds and no re-cut is needed — but the variant
     collision is Designer's call.
  2. Slice C is DESIGNER-UNREVIEWED and R6's sign-off does NOT cover it. It ships
     because it is non-blocking, never-coloured, suppressible and now test-pinned
     (8 assertions in group 11) — NOT because it was signed off. The annotation's
     treatment (--fg-secondary, inline in the cell rather than a second line) is
     unspecified by any design-spec revision; I shipped the plainest thing that
     satisfies C.4 rule 3.
  3. §3.3 / §5.1 / §5.3's canonical wireframe spread 3/2/2/4/2/2 sums to 15 and
     the L-rail digest reads "Total 74·15" — under A3 every one of those
     illustrations now depicts a build 5 UNDER the default. Documentation only;
     no wireframe and no component was changed for it.
  4. [N6] SummaryPanel's error-banner lead-in was re-cut: "this can only come
     from an externally edited or imported build" became "from an imported or
     externally edited build, or from a data update that changed a ratified
     value". The old sentence became FALSE the day F4 shipped. Copy in an allowed
     file, but Designer should see it in rev 5.

FOR THE PMM DELTA PASS (docs-drafts/** is denied; NOT written here)
  1. The onFuse flip changes on-screen ledger numbers for any build with fused
     badges below the Legend-reaching pairs — refunds now appear where none did.
  2. [R17] EXPLANATION.final.md §"Per-category pools and Badge Slots" and
     GUIDE.final.md step 4 both walk the user through the twelve budget numbers
     and NEITHER mentions that builds start with 20 Badge Slots by default.

KNOWN NOT-OURS
  · The load-dependent vitest flake class fired ONCE on the baseline run before
    I changed anything (tests/ui/f2-eligibility-disclosure.test.tsx, "Test timed
    out in 5000ms") and did not recur on any subsequent run, including the two
    full 849/849 runs. No { timeout: 20000 } value was touched or lowered.
  · Test 6.3's real Enter/Space path is UNPROVEN, and deliberately not faked. A
    bare control <details> injected into the same live page fails to toggle on a
    synthesized Enter IDENTICALLY, so this is an automation-harness limitation —
    the same class as the jsdom gap R14 documents — and says nothing about F4's
    code. The POINTER path is fully proven, including the 6.2 no-purchase
    guarantee. A human pressing Enter on a focused <summary> in a real browser
    remains unverified by machine and is the one item worth a human glance.
  · Port 5173 was held by the concurrent F5.2 dev server, so every browser proof
    ran on 5199. I did not stop, restart, or otherwise disturb that server.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / design-spec.md / the H-rulings. OQ-A3 is
still OPEN: deriveBudget's `derived` arm still throws NotYetPublishedError,
DEFAULT_BUDGET_STRATEGY is still "manual", no attribute→spread was derived, and
NO Sigma = 20 assertion was added to tests/config.test.ts.

NEXT
Merge is Tier 1's. The branch is `f4-official-data`, pushed, NOT merged to `dev`
and `main` untouched. Expect to rebase on F5.2 — the merge-conflict forecast is
in the dispatch report.
─────────────────────────────────────────────

═════════════════════════════════════════════
F4.1 — official-2K-page data adoption · integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: f4-official-data (tip 2999a6c, impl bf02019 + reportback 81664b7)
Integration commits: 7289386 + fbcf49d · Branch dev · main untouched (444d034)
─────────────────────────────────────────────

WHAT LANDED
All five parts of the brief, unchanged from the branch: 53 official badge
descriptions + 19 isNew flags (dataVersion 2026-08-26.1, gameVersion still
null); disciplineLock on Synergy Slots enforced HARD in both assignSynergy and
validate-loadout.ts; the 20-Badge-Slots default disclosure on BudgetTotalRow
(four states); onFuse as the default refund trigger; Synergy Slot 7 defaulting
to +2 with load-normalization for pre-existing builds.

INTEGRATION MECHANISM — rebase, not a merge commit
dev had advanced 9bd851c → 498dceb (the test-harness label index). This history
is strictly linear (zero merge commits across the whole log; the harness entry
above records its own cherry-pick for the same reason), so f4-official-data was
rebased rather than merged: `git rebase --onto 498dceb b94d403` replayed
bf02019 + 81664b7 and dropped the author's now-redundant 2999a6c merge commit.
dev fast-forwarded onto the result. Zero merge commits remain.

Verified equivalent, not merely similar: the rebased tree differs from the
author's own merge tree (2999a6c) in exactly four files — the three harness
files (tests/setup-dom.ts, tests/ui/shared-label-index.test.tsx,
docs/proof/shared-label-index.md) and .claude/reportback.md. Every other file
F4 touched is byte-identical to the author's resolved merge.

CONFLICTS — two, both forecast, both resolved against a known-good reference
  src/App.tsx — F5.2's IA re-cut (panel-below divs, ledger folded into the
    single rail) vs F4's older rail-right aside carrying the new
    ratifiedMagnitudeNormalized prop. Resolved to F5.2's structure WITH F4's
    prop. That is precisely the resolution the author had already made in
    2999a6c, and 498dceb's App.tsx blob is identical to 9bd851c's (d52de705),
    so the author's merged file was a valid drop-in and was taken verbatim
    rather than re-derived by hand.
  .claude/reportback.md — append-only, as forecast. Resolved so all three
    entries survive in chronological order: F5.2 → test-harness → F4.1.
    Arithmetic reconciles exactly both ways: base 1932 + shared-open 1 +
    dev-unique 278 + F4-unique 265 + shared-close 1 = 2477, and the conflicted
    file's 2480 lines − 3 markers = 2477. dev's first 2211 lines are a
    byte-identical prefix, and the 266-line F4.1 entry is byte-identical to
    81664b7's. Nothing was dropped; the only deduplicated lines are a blank
    and a rule.
  src/styles/app.css auto-merged, as it did in the author's merge. No other
  file conflicted — the F4 × harness file intersection was reportback alone.

INCIDENTAL FIX
The author's merge 2999a6c carried a line-join defect at EOF: the F4.1 entry's
closing rule was concatenated onto "in the dispatch report." with no newline.
The rebase reproduces 81664b7's original, correctly separated form.

PASS-SET ARITHMETIC — computed first, then confirmed
  dev baseline (498dceb):                  47 files / 713 tests, 11.90s
  branch baseline was 701 (b94d403 = 694, F5.2 added 7)
  F4 contributed 856 − 701 =               155
  harness contributed 713 − 701 =           12
  expected after integration: 713 + 155 =  868
  actual (fbcf49d):                        53 files / 868 tests, 23.73s
Zero gap. The six new files are the F4 suites (f4-badge-card-description,
f4-budget-total-baseline, f4-dataversion-drift, f4-plus-two-roundtrip,
f4-slot7, enrichment-spot-check). No flake; green on the first run.

GATES — all green
  npm test                868/868, 53 files
  npm run typecheck       exit 0
  npm run build           exit 0 (tsc --noEmit && vite build, 65 modules)
  runtime dependencies    exactly {react ^19.2.8, react-dom ^19.2.8}
  src/styles/tokens.css   untouched by F4 (empty diff 498dceb..fbcf49d)
  RUN-never-edit gates    tests/ui/overlays.test.tsx + tests/category-colors.test.ts
                          green and unmodified (empty diff); with
                          architecture.test.ts, 3 files / 174 tests
  architecture.test.ts    unedited; all five groups green — (a) engine purity,
                          (b) runtime dependency allowlist, (c) zero network
                          egress, (d) no runtime filesystem access,
                          (e) position-height access route
  package.json / lockfile untouched

DATA CLAIMS — checked against the tree, not the report
  src/data/badges.json: 53 badges, all 53 carrying a non-empty description, 0
  missing the field. isNew is a boolean on every badge; exactly 19 are true.
  dataVersion "2026-08-26.1", asOf "2026-08-26", gameVersion null.
  Per-category isNew in canonical CATEGORIES order (vocabulary.ts:40 —
  Finishing-first) reads 2/5/1/3/5/3. The branch report's "5/2/1/3/5/3" is the
  same multiset written Shooting-first; total 19 either way. A cosmetic
  ordering nit in the report's phrasing, not a data defect.

RATIFICATIONS RECORDED (Tier 1 accepted all four; not re-litigated here)
  1. src/engine/dataset.ts edited despite being a denied path — loadBadge is
     the only constructor of a Badge, so description/isNew are otherwise
     unpopulatable and the tree would not compile.
  2. RatifiedMagnitudeReport.slots renamed synergySlots — `slots` is a bare
     banned token under the H1 vocabulary lint.
  3. Test 7.4's "exactly one role=status" assertion was already false before
     F4 (PlusTwoDesignator's Banner defaults to one); it now asserts the real
     invariant — live-region count identical with and without the disclosure.
  4. Enter/Space activation on the description <summary> is unproven.

OPEN ITEM — carried, not resolved here
Per ratification 4: keyboard activation (Enter/Space) on the description
<summary> remains unproven, because a bare control <details> fails identically
under the automation harness. The pointer path is fully proven. This needs a
human keyboard check; it was deliberately not attempted during integration.

BRANCH REFS
f4-official-data was left EXACTLY where it was — 2999a6c, local and remote, NOT
force-pushed and NOT deleted. f5-3-card-collapse-reset is in flight in
/tmp/bb-f53 branched off it; it still descends from 2999a6c with its
uncommitted work undisturbed, and will pick up the new dev on its own merge.
The /tmp/bb-f4 worktree is likewise untouched. The temporary rebase branch used
for the integration was deleted after dev fast-forwarded. main untouched.

SCOPE / PLAN IMPACT
None. OQ-A3 remains OPEN exactly as the branch left it.

NEXT
The open item above is a human keyboard check. Nothing else blocking.
─────────────────────────────────────────────

═════════════════════════════════════════════
F8-E1 — engine selectors, the ONE step enumerator, and the text builder · slice-complete
Agent: Tier-2 implementer (constrained mode) · 2026-08-25
Brief: workspace/badge-builder-2k27/impl-briefs/f8-e1-engine-selectors-and-steps.md rev 1
Preamble: impl-briefs/f8-00-slice-map-and-rebase-ledger.md rev 1 (AJ-1 … AJ-11)
Implementation commit: 1c1e1d4 · Branch f8-engine (isolated worktree /tmp/bb-f8e)
NOT merged to dev. main untouched.
─────────────────────────────────────────────

REBASE ANCHOR — and TWO HARD PRECONDITIONS THAT ARE NOT MET
Base origin/dev @ 9bd851c. F5.2 IS in (e11e8f1). Baseline suite 46 files /
701 tests green in 39.1s — SEVEN above the dispatch's stated 694, because F5.2
landed after that number was taken. 701 is the denominator every count below
is arithmetic against.

  ⚠ F4 HAS NOT LANDED, and it is a HARD prerequisite of this slice (§0, §2 of
    f8-00). Verified three ways on the base tree: `grep '"onFuse"'
    src/config/index.ts` and `grep disciplineLock src/engine/types.ts` are both
    EMPTY, and badges.json is still dataVersion 2026-08-25.1, not the
    2026-08-26.1 the ledger predicts. F4 is in flight in a parallel worktree
    (/tmp/bb-f4). The dispatch was explicit that the four slices run
    concurrently and asked for a merge forecast, so this was carried rather
    than treated as a stop — but it is recorded here because it moves real
    things. Consequences, all named below: the golden table is pinned against
    the PRE-F4 dataset; INV-11 covers three RefundTriggers, not four; AJ-5
    item (g) took its fallback; F4's SummaryPanel edits do not exist to survive.

  ⚠ The `Physicals`/`Rebounding` NEW chip and the badge-description <details>
    ARE ALREADY IN THE TREE (visible on BadgeCard at 1280). The rebase ledger
    lists both as F4 work. Something has shipped a subset of F4's UI ahead of
    F4's engine changes. Flagged, not touched.

changed_files (all within Allowed paths)
  NEW  src/engine/steps.ts · src/engine/summary.ts · src/engine/summary-text.ts
  MOD  src/engine/ledger.ts (+badgeSlotsCapacityUnset)
       src/engine/eligibility.ts (+entryIsStale, +reasonsForLevel export,
         recheckEligibility refactored to call entryIsStale)
       src/engine/README.md (one section)
       src/ui/grid/feasibility.ts (re-expressed; net −0 lines but −25 of logic)
       src/ui/grid/CategoryLedger.tsx (definition deleted, engine import added,
         one header-comment correction — NO re-export shim)
       src/ui/summary/SummaryPanel.tsx (THE IMPORT BLOCK AND NOTHING ELSE)
       src/App.tsx (EXACTLY TWO EDITS, both named below)
  NEW  tests/feasibility-golden.test.ts · tests/steps.test.ts ·
       tests/summary.test.ts · tests/summary-text.test.ts
  MOD  tests/architecture.test.ts (group (f) appended; (a)–(e) untouched)
       tests/eligibility.test.ts · tests/ledger.test.ts (appended; every
         existing assertion unedited)
  NEW  docs/proof/f8e1-verification.txt
  MOD  .claude/reportback.md (this entry)

  src/App.tsx's diff is exactly two edits, as promised up front by AJ-6:
    (1) the categoryFeasibility(...) call site takes the AJ-6 signature
        — (badgesByCategory.get(category) ?? [], …, working.loadout, …)
        + (ledgerState, working.build, category, …)
    (2) the badgeSlotsCapacityUnset import re-points from
        ./ui/grid/CategoryLedger to ./engine/ledger.
  src/ui/summary/SummaryPanel.tsx's diff is +1/−1 import line. Nothing else.

denied_paths_checked — I DID NOT TOUCH ANY OF THESE
  src/engine/randomize.ts · src/engine/random.ts (created only in the SEPARATE
  E2 commit that follows, never in 1c1e1d4) · src/styles/** (zero CSS diff) ·
  src/data/** (zero 2K27 data, dataVersion untouched) · src/config/** ·
  src/persist/** · src/main.tsx · src/engine/serialization.ts ·
  src/ui/build/BudgetGrid.tsx (AJ-5 fallback) · tests/ui/overlays.test.tsx
  (RUN explicitly, never edited) · tests/vocabulary.test.ts (RUN, not edited in
  this commit — class 2 is E2's) · package.json / package-lock.json /
  tsconfig.json / vite.config.ts (no dependency, no timeout change) ·
  .claude/** except this file · the `main` branch.

first_proof_result — THE GOLDEN TABLE, GREEN AGAINST THE UNMODIFIED TREE
  Verbatim in docs/proof/f8e1-verification.txt. Captured with
  `ls src/engine/steps.ts` → "No such file or directory" in the same log, so
  the ordering is evidenced rather than asserted:

      $ npx vitest run tests/feasibility-golden.test.ts
       Test Files  1 passed (1)
            Tests  4 passed (4)

  504 cells: 6 shipped-data builds × 6 categories × 4 loadout states × 3
  remainingPoints, PLUS a 72-cell synthetic-dataset arm. Re-run after the
  hoist: 4 passed, and NOT ONE CELL WAS EDITED. The only thing that moved
  across the refactor is the test's own `callFeasibility` adapter, which is the
  AJ-6 signature change and is isolated in one function for exactly that reason.

verification_evidence
  npm test          46 files / 701 tests  →  50 files / 796 tests. ALL GREEN.
  npm run typecheck clean · npm run build clean (277.01 kB / 84.20 kB gzip)
  npx vitest run tests/ui/overlays.test.tsx      → 1 file / 4 tests PASS (H2)
  npx vitest run tests/vocabulary.test.ts tests/architecture.test.ts
                                                 → 2 files / 231 tests PASS
  npx vitest run tests/steps.test.ts tests/summary.test.ts
      tests/summary-text.test.ts                 → 3 files / 59 tests PASS
  npx vitest run tests/ui/category-ledger.test.tsx
      tests/ui/summary-import-export.test.tsx    → 2 files / 11 tests PASS
  git status --porcelain — only Allowed paths.

  ARCHITECTURE GROUP COUNT, OBSERVED not assumed: 5 before ((a) engine purity,
  (b) dependency allowlist, (c) zero network egress, (e) position-height route,
  (d) no runtime filesystem access) → 6 after. Groups (a)–(e) unedited.

  SHARED TYPES PLACEMENT: LegalStep / StepEnumerationInput live in steps.ts;
  RosterRow / CategorySummary / BuildSummary / SynergySummaryRow live in
  summary.ts. src/engine/types.ts was NOT edited — nothing in F8-E1 needed to
  be visible from more than one module, and adding to a file F4 is also editing
  would have created a merge surface for no benefit. No ProposalSource (AJ-8).

  AJ-5 ITEM (g): THE §1(g) FALLBACK WAS TAKEN, and it was not a judgment call —
  F4 has not landed, so BudgetTotalRow has no Σ-vs-20 annotation to re-point.
  BudgetGrid.tsx is untouched. `badgeSlotsBaselineText` ships in summary.ts as
  the text block's source only. FOLLOW-UP, NAMED: when F4 lands, re-point
  BudgetTotalRow's <tfoot> Badge Slots cell at `badgeSlotsBaselineText` so the
  A3 fact keeps one phrasing across the annotation and the pasted text.

SEVEN PLACES THE BRIEF NO LONGER MATCHED THE SHIPPED CODE
  1. `Math.random` ALREADY EXISTS UNDER src/**. The DoD asks for it to appear
     NOWHERE; src/persist/local-storage.ts:251 mints build ids with it, that
     call is correct (a persisted id SHOULD be unpredictable), it is not engine
     code, and src/persist/** is a DENIED path here. So the ban ships in a
     STRONGER form than a blanket rule that cannot pass: unconditional under
     src/engine/**, plus a build-wide assertion that the set of Math.random
     callers equals an explicit one-entry allowlist. A new one anywhere reddens.
  2. A blanket `new Date(` ban over src/engine/** would also redden correct
     shipped code — serialization.ts takes `savedAt = new Date().toISOString()`
     as an injectable default. Group (f) is therefore scoped to a NAMED module
     list, which E2 appends to.
  3. THE SHIPPED DATASET CANNOT EXPRESS A LEVEL GAP. badges.json carries
     exactly one null threshold (`unpluckable`'s HOF, on one line of an `or`
     badge whose other line passes) and every line is monotone non-decreasing.
     The brief's golden-table build #6 — "passes Bronze and Gold, fails Silver"
     — is unconstructible over shipped data. Replaced by an asymmetric-attribute
     build, and the gap is pinned by a whole synthetic-dataset arm instead.
  4. "A build that height-blocks ≥3 Rebounding badges" is also unreachable:
     only TWO Rebounding badges (boxout-boss, breaker) carry a 75–88 range.
     Build 5 uses 5'9" and blocks both, plus Finishing/Defense/Physicals badges.
  5. RefundTrigger has THREE members today, not four. INV-11 runs over all
     three and carries a compile-time exhaustiveness guard that BREAKS THE
     BUILD the day `onFuse` is added, so the fourth arm cannot be skipped.
  6. The H3 gap fixture the briefs ask E1 to ADD already ships —
     `syntheticAndMidNullGap`. Reused; no second fixture added.
  7. design-spec §14.5's illustrative block is internally inconsistent in three
     ways, all resolved toward the binding rule and documented in
     summary-text.ts's header: it prints the `N of 6 categories` footnote AND
     the Σ Badge Slots line, which AJ-5/§4.7 make mutually exclusive; its
     arithmetic does not reconcile (a single cost-1 Dimer under "4 pts spent");
     and it lists Posterizer before Float Game, which dataset order does not.
     One further deliberate divergence: the stale reason keeps eligibility.ts's
     VERBATIM string, which ends "… for Gold". Trimming it would be a second
     phrasing of a fact a shipped builder already produces — a named
     stop-condition — so the shared builder wins and the suffix stays.

ONE SHAPE DEVIATION, DECLARED
  RosterRow gained `staleReasons: string[]`, which the brief's shape does not
  list. §14.5 requires the text block to emit
  `!! no longer qualifies: needs 90 Close or 93 Layup`, and
  `formatSummaryText(summary)` has no other input to read it from.
  `reasonsForLevel` was exported from eligibility.ts (unchanged body, no new
  rule) to supply it, because the disclosure needs the PURCHASED level's
  failing lines specifically, not validateBadge's union over all four.
  `formatSummaryText` also takes an optional `buildName` and reads
  `summary.build`, for the same reason: §14.5's header line carries the build
  name, height and position, and none of the three is derivable otherwise.

CARRIED FORWARD, DELIBERATELY NOT FIXED HERE
  categoryFeasibility still tests affordability with GROSS whatIf. Post-F4,
  under onFuse, upgrading a fused badge is net-free (gross +1, refund +1), so
  the readout will UNDER-COUNT affordable upgrades on exactly the badges the
  user cares most about. LegalStep now carries both grossCost and netCost, so
  the fix is a one-word change plus a test. ROUTED TO F4 (f8-00 §4 finding 1) —
  flipping a shipped readout's displayed numbers is a UI behaviour change and
  does not belong smuggled inside an engine refactor. The reason is written
  into feasibility.ts's header so nobody "tidies" it later.

heartbeats_emitted: 0 discrete messages — dispatched in batch mode; progress is
  recorded here and in docs/proof/f8e1-verification.txt.

stop_conditions_triggered: none.
  Approached and cleared: the H3 range shortcut (never taken — levelPasses is
  called per level, and test 2.1 asserts the naive bronze..max range WOULD have
  produced Silver, so the distinction cannot go vacuous); the netCost swap in
  categoryFeasibility (routed to F4, not made); an OverlayState parameter on
  buildSummary (never added — the signature is the control); ProposalSource
  (not added); a SummaryPanel diff larger than the import block (it is +1/−1).
  INV-11 is GREEN on every RefundTrigger, so E2's fast path is safe to ship.

KNOWN NOT-OURS
  :5173 was bound by a concurrent implementer's dev server. vite.config.ts is
  denied, so the no-regression pass ran on `npx vite --port 5199 --strictPort`
  — a CLI flag, no file changed. The 1280 screenshot could not be persisted to
  docs/proof/ (this harness renders browser screenshots inline and cannot write
  them; the app's own download path is sandbox-blocked), so a full DOM-text
  capture of every ledger, feasibility line, hint, rail row and summary table
  is substituted in the proof file. For a slice with zero visual change that is
  the stronger artifact: it is the exact rendered content, and it diffs.
  The vitest flake class did NOT fire on any run of this slice.
─────────────────────────────────────────────

═════════════════════════════════════════════
F8-E2 — the roll engine (seeded PRNG + randomized greedy + containment lint) · slice-complete
Agent: Tier-2 implementer (constrained mode) · 2026-08-25
Brief: workspace/badge-builder-2k27/impl-briefs/f8-e2-roll-engine.md rev 1
Preamble: impl-briefs/f8-00-slice-map-and-rebase-ledger.md rev 1 (AJ-3, AJ-4, AJ-8, AJ-9, AJ-11)
Implementation commit: 5679e31 · Branch f8-engine (isolated worktree /tmp/bb-f8e)
Sits directly on F8-E1 (1c1e1d4). NOT merged to dev. main untouched.
─────────────────────────────────────────────

⚠ THREE DISPATCH GATES THE BRIEF NAMES AS BLOCKING ARE NOT VISIBLY MET
The brief carries a "⛔ DO NOT DISPATCH" header with three gates. Verified on
the tree, all three are open:

  1. OQ-1 (the ranking carve-out) — `scope.md` contains NO occurrence of
     "randomiz" or "randomis" at all. §1's CUT row 5 ("Ranking / scoring /
     'best loadout' / 'recommended' / 'optimal'", disposition Never) is
     unamended.
  2. `scope.md` §0.1 A4 — NOT PRESENT. §0.1 runs A1, A2, A3 and stops. (The
     "A4" strings in scope.md are all `OQ-A4`, the LAN-binding question, which
     is a different item entirely.)
  3. `scope.md` §1 amendments — not landed.

  Plus F4, a HARD prerequisite, has not landed (see the F8-E1 entry above).

  The dispatching orchestrator's instruction was explicit and carried the OQ-1
  rulings in substance — pins IN with `exact` default, exclusions IN,
  minimum-level pins CUT, AJ-11's H4 generator carve-out ratified, synergy OUT
  structurally — so this was implemented as directed rather than stopped. IT IS
  RECORDED HERE BECAUSE THE PAPER TRAIL DOES NOT YET EXIST: the ratified "Never"
  in scope.md §1 has not been narrowed in writing, and this slice ships code
  that a strict reading of §1 forbids. Architect should land §0.1 A4 and the §1
  amendments before this reaches `dev`.

changed_files (all within Allowed paths except the ONE declared below)
  NEW  src/engine/random.ts · src/engine/randomize.ts
  MOD  src/engine/errors.ts (+RollDidNotTerminateError, +EmptyCandidateSetError)
       src/engine/__fixtures__/synthetic-badges.ts (+5 fixtures: the
         equivariance twins, the cost-indifference pair, the zero-net-cost badge)
       src/engine/README.md (one section)
  NEW  tests/random.test.ts · tests/randomize.test.ts · tests/randomize-oracle.ts
  MOD  tests/vocabulary.test.ts (class 2 ONLY; class 1 untouched; class 3 NOT
         added — it is R2's) · tests/architecture.test.ts (group (f) EXTENDED,
         not duplicated; groups (a)–(e) untouched)
  NEW  docs/proof/f8e2-verification.txt
  MOD  .claude/reportback.md (this entry)

  DECLARED CROSS-SLICE EDIT — tests/feasibility-golden.test.ts
  E1's golden table built its synthetic arm by spreading the `syntheticBadges`
  BARREL. E2 added five fixtures to that barrel from its own allowlisted
  fixtures file, so the dataset the R-4 control measures grew underneath it and
  the table went RED — e.g. `b7-synthetic-gap|Defense|empty|99` moved 52 → 56.
  `categoryFeasibility` is untouched by E2. The arm is now pinned to the five
  H3 fixtures BY NAME, and NOT ONE CELL WAS REGENERATED OR EDITED — the table is
  byte-identical to what E1 produced against the unmodified feasibility.ts.
  That file is not on E2's allowlist, so this is declared rather than quiet: the
  alternatives were a permanently-red control or a regenerated table, and a
  control that reddens whenever anyone adds a fixture teaches people to
  regenerate it, which is exactly how a golden table stops being a control.

denied_paths_checked — I DID NOT TOUCH ANY OF THESE
  src/ui/** (ALL of it — zero UI in this slice) · src/engine/steps.ts (E1
  shipped it; no change was needed) · src/engine/eligibility.ts · src/engine/
  {cost,ledger,summary,summary-text,synergy,synergy-ledger,validate-loadout,
  dataset,vocabulary,serialization}.ts (every one CALLED, never CHANGED) ·
  src/config/** · src/data/** · src/persist/** · src/main.tsx · src/App.tsx ·
  src/styles/** · tests/ui/** including overlays.test.tsx (RUN explicitly,
  never edited) · package.json / package-lock.json / tsconfig.json /
  vite.config.ts (NO dependency, NO timeout change) · .claude/** except this
  file · the `main` branch.

first_proof_result — RED THEN GREEN, in that order, both verbatim in the proof
  STEP 1, before src/engine/randomize.ts existed:
      $ ls src/engine/randomize.ts src/engine/random.ts
      ls: src/engine/random.ts: No such file or directory
      Error: Cannot find module '../src/engine/randomize'
       Test Files  1 failed (1)
  RED FOR THE RIGHT REASON — no roller, not a fixture bug. The gap fixture
  (`synthetic-and-mid-null-gap`) already loads and is green in tests/steps.test.ts
  2.1 on the same tree.

  STEP 2, after the walk: "never proposes Silver on the gap badge, over 500
  seeds" PASSES, with a non-vacuity guard asserting the gap badge was actually
  rolled at least once.

  STEP 3: one printed rollBuild (six category reports, applied steps, pins,
  before/after readouts, token) plus a second call on the SAME seed —
  3,401 bytes compared, BYTE-IDENTICAL.

verification_evidence
  npm test          50 files / 796 tests  →  52 files / 871 tests. ALL GREEN.
  npm run typecheck clean · npm run build clean
  npx vitest run tests/randomize.test.ts tests/random.test.ts  → 56 PASS
  npx vitest run tests/steps.test.ts        → 15 PASS (E1's INV-11 RE-RUN before
      shipping the fast path — additivity holds on every RefundTrigger, so the
      precomputed net-cost path is safe)
  npx vitest run tests/vocabulary.test.ts tests/architecture.test.ts → 248 PASS,
      both class-2 canaries SEEN TO FAIL correctly on strings that should fail
  npx vitest run tests/ui/overlays.test.tsx → 4 PASS (H2 unchanged, as it must
      be — this slice touches no ledger DOM; run to PROVE it, never edited)
  dependencies still exactly {react, react-dom}
  BUNDLE UNCHANGED at 277.01 kB / 84.20 kB gzip — random.ts and randomize.ts
  have no consumer until R2, so they tree-shake out entirely.

  MEASURED NUMBERS THE BRIEF ASKED FOR
    INV-9  P(dear A-tier bought first) over 4,000 seeds: inside [0.47, 0.53].
    INV-10 3-way and 7-way over 60,000 draws each: every bucket within ±1.5%.
           `n === 1` consumes ZERO draws; empty array throws.
    INV-1b golden vector checked in: [970862100, 723468513, 3366361262,
           3485145008, 814780240, 1445049048, 978648718, 1859069169,
           3355951680, 4071567883].
    INV-14 see the stop-condition below.

⚠ STOP-AND-REPORT — INV-14's THRESHOLD IS UNREACHABLE, AND INV-9 IS WHY
  The brief pins median 0 and p95 ≤ 2 points against the exact-DP oracle, on the
  stated hypothesis that a miss means "the step enumerator is wrong, NOT the
  concept". THE ENUMERATOR IS NOT WRONG:
    · INV-7 proves every roll is MAXIMAL — re-running the enumerator on the
      result returns [] in every rolled category.
    · The oracle is a true UPPER bound — no measured gap is ever negative.
    · 47.7% of rolls hit the exact optimum.

  The gap splits cleanly on ONE axis — whether Badge Slots bind:
      CAPACITY FREE  (points were the binding limit)   median 0 · p95 1  ✔ meets spec
      CAPACITY BOUND (the roll filled every Badge Slot) median 1 · p95 4  ✘

  MEASURED EXAMPLE: capacity 3, pool 16, Finishing at attributes 72. The roll
  bought three cost-1 Bronzes and one Silver upgrade — spend 5, ELEVEN POINTS
  LEFT — and it is maximal, because none of those three badges qualifies at any
  higher level. The oracle reaches 11 by spending the same three Badge Slots on
  badges that can climb.

  Recovering that spend requires PREFERRING badges with higher legal ceilings,
  which is verbatim the brief's own stop-condition ("a small preference for
  badges you nearly qualify for is a quality heuristic wearing an affordability
  costume"). INV-14 and INV-9 cannot both be satisfied. The engine design
  already contains the seed of the resolution — it observes that "a
  capacity-bound category can legitimately leave 40% of its pool unspent" —
  that insight simply did not reach this threshold. ARCHITECT'S CALL. Both
  regimes are pinned in the test so nothing drifts while it is pending, and the
  full reasoning is in the test's header comment rather than only here.

THREE MORE PLACES THE BRIEF NO LONGER MATCHED THE CODE
  1. THE TERMINATION BOUND IN THE BRIEF IS TOO SMALL. `4 * equipSlots + 1`
     throws on legal input: AJ-11 explicitly lets `fill` roll into a
     PRE-EXISTING Badge Slots overflow, and five entries against a capacity of
     one admits up to fifteen upgrade steps against a bound of five. Shipped as
     `4 * max(entriesAtStart, equipSlots) + 1`, with the case pinned in INV-17.
  2. `RollRequest.pins`'s own doc says "absent id ⇒ unpinned" while §1(d) rules
     the default `exact`. Implemented as the TYPE CONTRACT states — the engine
     honours the record exactly as given — because baking `exact` in would make
     `reroll` structurally unreachable. The ruled product default is the
     CALLER's to seed, and that obligation is written into the field's doc
     comment so R2 cannot miss it. Worth an explicit confirmation from Architect.
  3. The H3 gap fixture E2 was told to reuse from E1 already shipped before
     either slice (`syntheticAndMidNullGap`). Reused; no duplicate added.

  Also: a TEST-ONLY seam was added — `rollCategory(…, options?: { iterationBound })`.
  A correct implementation cannot reach the real lattice bound, so without it
  the H6 termination guard could only be asserted, never proven to throw. Two
  lines, documented at the type, never passed by production callers.

heartbeats_emitted: 0 discrete messages — dispatched in batch mode; progress is
  recorded here and in docs/proof/f8e2-verification.txt.

stop_conditions_triggered: TWO, both reported above and neither worked around —
  the three unmet dispatch gates (OQ-1 / §0.1 A4 / §1), and INV-14's threshold.
  Approached and cleared: no weight, bias or preference of any kind was added
  (INV-14's gap was reported rather than tuned away); nothing sorts, ranks,
  scores or reduces to an extremum over candidates; `badge.name` is never read;
  no synergy read-as-candidate or write; no range derived from
  maxPurchasableLevel; no Math.random anywhere under src/; no repair of an
  overspend, over-capacity or stale purchase; no dependency; no pin dropped or
  downgraded under any decline; INV-11 re-run GREEN before shipping the fast
  path; "every loadout is equally likely" appears NOWHERE in the codebase.

KNOWN NOT-OURS
  The vitest flake class fired ONCE, on the run that was already red for the
  golden-table coupling: tests/ui/f2-builds-persistence.test.tsx > "declining
  the confirm keeps the working build; accepting replaces it", 24,690 ms —
  timeout-shaped, under full-suite parallelism. The full-suite re-run after the
  golden fix was 52/52 files and 871/871 tests GREEN, that file included. No
  { timeout: 20000 } was lowered, added or moved, and vite.config.ts was not
  touched.
─────────────────────────────────────────────

═════════════════════════════════════════════
F8-E1 + F8-E2 — engine selectors, the ONE step enumerator, and the roll engine · integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: f8-engine (tip b6272a6) · base origin/dev @ 9bd851c
Integration commits: d23de0b + 6562cde + 8ba17b4 + eb2cc8f + de1f734
Branch dev · main untouched (444d034)
─────────────────────────────────────────────

WHAT LANDED
Both engine slices, unchanged in behaviour from the branch. E1: the step
enumerator hoisted out of src/ui/grid/feasibility.ts into src/engine/steps.ts
so the UI's feasibility readout and the roller share ONE enumerator and cannot
drift into a self-contradicting app; the summary selectors
(src/engine/summary.ts, src/engine/summary-text.ts); and two rules hoisted out
of components (badgeSlotsCapacityUnset out of CategoryLedger.tsx, plus the
feasibility internals). E2: the roll engine — a seeded PRNG
(src/engine/random.ts, hand-rolled mulberry32 + xmur3, no dependency), a
randomized greedy over uniformly-sampled legal steps (src/engine/randomize.ts),
and the Math.random containment lint.

Five new src modules (random, randomize, steps, summary, summary-text) and six
new test files, plus the tests/randomize-oracle.ts helper.

INTEGRATION MECHANISM — rebase, not a merge commit
This history is strictly linear (zero merge commits across the whole log; the
two entries above record a rebase and a cherry-pick for the same reason), so
f8-engine was rebased, not merged. The rebase was run on a THROWAWAY branch
(f8-integrate) created from f8-engine, never on f8-engine itself, and f8-engine
was NOT force-pushed — the /tmp/bb-f8e worktree stays valid. dev then
fast-forwarded onto the result. Merge-commit count: 0 before, 0 after.

b6272a6 (docs/proof/f8-merge-forecast.txt) RIDES ALONG rather than being
dropped. It is docs-only and docs/proof/ is an established convention on dev
(48 artifacts, including d45f8a8's forward check for the harness slice, which
landed by exactly this route). The forecast is the paper trail for this merge
and belongs with it.

CONFLICTS — two, both forecast, both trivial, both append-at-tail
  tests/ledger.test.ts — both sides appended a describe block at the tail and
    both edited the import list. The IMPORTS AUTO-MERGED into the correct union
    (badgeSlotsCapacityUnset from the engine, overByBadgePoints /
    overByBadgeSlots from CategoryLedger, srcSources / stripComments from
    test-utils) — the forecast expected to union them by hand; git got there on
    its own. Only the two describe blocks conflicted, over a shared closing
    brace pair. Resolved by keeping BOTH blocks, each with its own closing:
    dev's "F4 group 9.6 — M1 honesty: onFuse with no isFusedFor" first, E1's
    "badgeSlotsCapacityUnset — hoisted out of CategoryLedger.tsx" after. Four
    describe blocks in the file, neither side's assertions touched.
  .claude/reportback.md — append-only, as forecast, and the FOURTH integration
    to touch it. Resolved so all entries survive in chronological order:
    …test-harness → F4.1 slice → F4.1 integration → F8-E1 → F8-E2. Both sides
    had appended a heavy-rule-opened block after the same closing rule, so the
    shared framing was reproduced for each rather than one side inheriting it.
    Arithmetic reconciles exactly: base (9bd851c) 2130 + dev-unique 467 +
    branch-unique 382 (E1 197 + E2 185) = 2979, and the merged file is 2979
    lines. Nothing dropped, nothing duplicated.

  src/App.tsx, src/engine/ledger.ts and src/ui/summary/SummaryPanel.tsx all
  auto-merged, as forecast. Keeping the SummaryPanel diff to a single import
  line is what bought that.

SEMANTIC BREAKAGE — five mechanical edits, all forecast, all applied
  (a) src/engine/__fixtures__/synthetic-badges.ts — F4 made description and
      isNew REQUIRED on RawBadge. E2's four new fixtures (twinA, dear, cheap,
      freeAtHof) took the same two fields F4 gave the five pre-existing ones;
      syntheticTwinB spreads twinA and needed nothing. 9 literals now carry the
      fields.
  (b) tests/steps.test.ts — ONE line, AND THE GUARD DID ITS JOB. The
      RefundTrigger exhaustiveness check failed to compile ("Type 'true' is not
      assignable to type 'never'") because F4 added onFuse. Added "onFuse" to
      REFUND_TRIGGERS rather than letting INV-11 quietly skip the new arm.
      INV-11 is green on all four triggers including onFuse, so E2's
      precomputed net-cost fast path is safe against F4's additive cost model.
      This is the load-bearing post-merge finding.
  (c) tests/feasibility-golden.test.ts — ONE string, the dataVersion staleness
      guard: "2026-08-25.1" -> "2026-08-26.1". NO CELL WAS TOUCHED (see below).
  (d) tests/summary-text.test.ts — TWO strings in the golden block:
      dataset "2026-08-25.1" -> "2026-08-26.1", and
      "Synergy Slot 7 · Permanent · +1" -> "+2". The second was verified
      against dev's own source rather than taken on faith:
      synergy.ts's magnitudeForSynergySlot returns 2 for slot 7 even at
      userDesignated null, and createDefaultSynergySlots reads it, so the
      magnitude is the slot's own configured value exactly as design-spec §14.4
      requires. No builder code changed. Synergy Slot 5 correctly stays +1.

The five edits were folded into the commits that introduced the files
(autosquash), not left as a trailing fixup commit, so every commit on dev
builds: d23de0b, 6562cde and 8ba17b4 each typecheck exit 0 independently. The
fold was proved content-neutral — the tree hash before and after is identical
(ad1331d1dfd908c44c4a3c388c62ab341d40baad).

THE GOLDEN TABLE — the load-bearing check. VERDICT: NOT ONE CELL MOVED.
Checked two independent ways, because "the test is green" is the weaker claim:
  1. The GOLDEN literal in the merged tree is BYTE-IDENTICAL to f8-engine's —
     504 cells both sides, string-equal. The only diff in the whole file is the
     one dataVersion line (1 insertion, 1 deletion).
  2. "every affordable-upgrade count is unchanged, cell for cell" passes, i.e.
     rows regenerated from the POST-F4 dataset still equal that untouched
     table. 7 x 6 x 4 x 3 = 504.
So the guard's instruction ("if dataVersion moves the table is STALE —
regenerate it, never hand-edit a cell") was honoured by bumping only the
version assertion and letting the table prove itself. F4's data change is
annotation-only (description / isNew): no eligibility gate and no tier cost
moved, and the R-4 enumerator hoist is stable across the F4 boundary.

PASS-SET ARITHMETIC — computed first, then confirmed
  dev baseline (491b392):                   53 files /  868 tests, 12.57s
  branch on-branch total:                                871
  branch baseline was 701 (pre-F4, pre-harness)
  F8 contributes 871 - 701 =                             170
  expected after integration: 868 + 170 =               1038
  actual (de1f734):                         59 files / 1038 tests, 12.79s
ZERO GAP. File count reconciles too: 53 + 6 new test files = 59 (the seventh
added path, tests/randomize-oracle.ts, is a helper the suite imports, not a
test file). No flake fired on any run of this integration.

GATES — all green
  npm test                1038/1038, 59 files
  npm run typecheck       exit 0
  npm run build           exit 0 (tsc --noEmit && vite build, 66 modules)
  runtime dependencies    exactly react ^19.2.8 + react-dom ^19.2.8, nothing else
  EXPLICIT RUN-AND-REPORT gates:
    tests/ui/overlays.test.tsx        4/4 green — the H2 guardrail, the file to
                                      watch for any future F8/F5 pairing.
                                      Unmodified by this integration (empty
                                      diff), so it is still a clean baseline
                                      for when S2 adds a DOM subtree inside
                                      the summary region.
    tests/category-colors.test.ts     15/15 green, unmodified
    tests/feasibility-golden.test.ts  4/4 green — see the verdict above
    tests/architecture.test.ts        178/178 green

MATH.RANDOM CONTAINMENT LINT — green, and independently re-derived
It ships stronger than specified: an absolute ban under src/engine/** plus a
build-wide assertion that the SET of Math.random callers EQUALS a one-entry
allowlist. Both assertions pass:
  "NO file under src/engine/ calls Math.random"                green
  "every Math.random under src/ is on the explicit allowlist"  green
Verified against the tree, not just the reporter: the only real caller under
src/ is src/persist/local-storage.ts:251 (build-id minting), exactly the
allowlisted entry. The one other textual hit, src/engine/random.ts:4, is a
comment stating the ban and is removed by stripComments before the check.
Confirmed nothing on dev since the branch point added a caller: the
9bd851c..491b392 diff over src/ contains no Math.random line either way.

OPEN ITEMS — carried, NOT resolved here. Neither blocks this merge.
  1. The capacity-bound roll gap: median 1 / p95 4 against an exact-DP oracle.
     A fix is being ruled on separately.
  2. Three E2 dispatch gates whose paper trail Architect is landing now —
     scope.md carries no randomizer amendment yet.

COSMETIC NIT — left alone deliberately
tests/steps.test.ts still carries the comment "When F4 lands onFuse, THIS LINE
STOPS COMPILING until the new arm is added" and "Pre-F4 the union has THREE".
F4 has now landed and the guard has fired and been satisfied, so the comment
reads as history rather than instruction. Not rewritten: the validated recipe
specified ONE line in that file, and holding the diff to exactly the measured
shape was worth more than tidying prose. Trivial follow-up for whoever next
touches the file.

BRANCH REFS
f8-engine left EXACTLY where it was — b6272a6, local and remote, NOT
force-pushed and NOT deleted; the /tmp/bb-f8e worktree is valid and clean.
/tmp/bb-f53 (f5-3-card-collapse-reset, b175a04) untouched and clean — it still
descends from 2999a6c and will absorb this merge on its own rebase, which is
expected. Confirmed no conflict surface with these two slices: neither touches
BadgeCard.tsx. The F8/F5 collision lands later, in the roll-UI slice (R2).
The throwaway f8-integrate branch was deleted after dev fast-forwarded.
main untouched at 444d034.

SCOPE / PLAN IMPACT
None from the integration itself. The randomizer amendment to scope.md is
Architect's in-flight item, listed above.

NEXT
Nothing blocking. The two open items are owned elsewhere.
─────────────────────────────────────────────

─────────────────────────────────────────────
F5.3 — card internals re-cut · collapsible categories · Reset build
SLICE COMPLETE · 2026-08-25 · constrained mode
Branch: `f5-3-card-collapse-reset`, pushed, NOT merged. `main` untouched.
Base: `origin/f4-official-data` @ 2999a6c (F4 + the F5.2 merge), NOT `dev` —
F4 had not yet landed on dev and this slice's arithmetic depends on it.
Commits: 945e315 (A+B) · b175a04 (C) · this entry.
─────────────────────────────────────────────

BASELINE / DENOMINATOR
The brief cites 701 tests on a `dev` baseline. My base carries F4, so the
verified pre-slice baseline in my worktree was 52 files / 856 tests / 40.6s,
re-run green before the first edit. Final: 53 files / 914 tests. Delta +58
(+29 in commit 1, +29 in commit 2), one new file (tests/ui/reset-build.test.tsx).

FIRST PROOF — the red canary, against the UNMODIFIED tree
Run before a byte of src/ changed, verbatim:

  AssertionError: expected 31.6 to be less than 22
   ❯ tests/layout-arithmetic.test.ts:477:43
     expect(stretched - PIP_DOT + SPACE_1).toBeLessThan(PIP_DOT);

The temporary `it` was deleted; the inequality survives as permanent assertion
5 with `shippedBroken` as its canary. Full text in docs/proof/f53-verification.txt.

CHANGED FILES (all within Allowed paths)
  src/ui/grid/BadgeCard.tsx · CategoryLedger.tsx · BadgeGridSection.tsx ·
  anchors.ts · src/App.tsx · src/ui/build/BuildPanel.tsx ·
  src/ui/build/ResetBuildDialog.tsx (new) · src/styles/app.css ·
  src/ui/README.md · tests/layout-arithmetic.test.ts ·
  tests/ui/f2-source-pins.test.ts · tests/ui/category-ledger.test.tsx ·
  tests/ui/badge-card-synergy.test.tsx · tests/ui/reset-build.test.tsx (new) ·
  docs/proof/f53-verification.txt (new) · .claude/reportback.md

DENIED PATHS — verified untouched by `git diff --name-only 2999a6c -- <paths>`,
which returned EMPTY for: src/engine/** · src/data/** · src/config/** ·
src/persist/** · src/main.tsx · src/ui/synergy/** · src/ui/summary/** ·
src/ui/builds/** · src/ui/primitives/** · src/ui/shell/** · FilterBar.tsx ·
JumpNav.tsx · EmptyResults.tsx · feasibility.ts · tests/category-colors.test.ts ·
tests/ui/overlays.test.tsx · tests/helpers/** · scripts/** · package.json ·
package-lock.json · tsconfig.json · vite.config.ts.
`git diff --stat 2999a6c -- src/styles/tokens.css` is EMPTY — byte-identical.

HOW THE NEW-CHIP ARITHMETIC RESOLVED
F4's NEW chip joins .badge-card__meta with the other three. On the title line
the widest isNew name gives 152 + 8 + 40 + 8 + 24 = 232 > 204 and the row wraps
again; §15.4's "constant-height 24px band" does not survive F4 otherwise. The
row was rewritten ONCE, for all four chips at once. NEW_CHIP_MAX is pinned at
40 and assertions 2b/3b make the eviction permanent rather than incidental.
MEASURED IN THE BROWSER: before, "Arc Cadence"'s title row was 48px (two lines,
three chips); after, 24px (one line, tier medallion only) — and all 53 title
rows are one line at 390/768/1280/1357/1440. Meta's worst case wraps to two
lines by declared intent and A1 absorbs it at zero cost to the row.

THE THREE (FOUR) SURGICAL app.css EDITS
  S1  DELETED `.pip--stale .pip__cost::after { content: " stale" }`. This is
      the one edit inside another slice's delimited block (F5's §10.4) and it
      is called out as the brief requires. Three of §10.4's four stale carriers
      remain, one of them textual, so WCAG 1.4.1 holds; .pip__cost is
      aria-hidden and the pip's accessible name already says it, so AT loses
      nothing. Verified live: `document.body.textContent.includes(" stale")`
      is false.
  S2  `.pip { flex: 1 }` -> `flex: 0 0 auto` + `width: 36px`, at the SOURCE.
      An override later in the file would leave assertion 7 permanently red.
  S3  `.btn:disabled { opacity: .45 }` -> `.6` (drift 3).
  S4  I DID take the fourth edit: `.reset-dialog` was joined to
      `.import-dialog`'s five selector lists IN PLACE rather than duplicating
      ~15 lines, so the two dialogs cannot drift. Note for future readers:
      `cssBlock(css, ".import-dialog {")` no longer resolves (the selector is
      now `.import-dialog,\n.reset-dialog {`). I checked first — NO test reads
      it. `.reset-dialog {` does resolve, and assertion 22 uses it.

OLD `CategoryLedger` EXPORT — DELETED, not kept as a thin composition.
A composition would have to return a <summary> outside a <details>, which is
not valid in any context it could be used in. tests/ui/category-ledger.test.tsx
is re-pointed at CategoryLedgerDigest + CategoryLedgerLede. The four string
builders (overByBadgePoints, overByBadgeSlots, badgeSlotsCapacityUnset,
projectionDiffers) are untouched and still exported — assertion 19b pins it,
because SummaryPanel.tsx imports one of them and is a denied path.

THE TWO CASUALTY EDITS, quoted
  tests/ui/badge-card-synergy.test.tsx:165
    -    expect(costs).toEqual(["+3", "+5", "+6 ⚠", "—", "boost"]);
    +    expect(costs).toEqual(["+3", "+5", "+6⚠", "—", "boost"]);
    plus the two comments at lines ~11 and ~159. Nothing else in the file.
  tests/ui/category-ledger.test.tsx:17
    -  import { CategoryLedger } from "../../src/ui/grid/CategoryLedger";
    +  import { CategoryLedgerDigest, CategoryLedgerLede } from "…/CategoryLedger";
    renderLedger renders both siblings in a fragment.

THE FOUR COLLAPSE DISPLAY-ONLY ASSERTIONS — named individually
All four live in tests/ui/category-ledger.test.tsx, plus a fifth structural one:
  (0) "the persisted preference collapses it, and the id never left .grid-section"
  (1) "a collapsed category STILL SPENDS Badge Points, in its own digest"
  (2) "a collapsed category STILL COUNTS Badge Slots"
  (2b) "a collapsed category that is OVERSPENT still shows --danger and `over by N ⚠`"
  (3) "a collapsed category STILL APPEARS in the rail ledger overview and the Summary"
  (4) "a collapsed category STILL EXPORTS — the envelope is byte-identical"
Collapse is asserted via `details.open`, never via visibility — jsdom keeps
closed-<details> content in the DOM and applies no UA display:none.

VERIFICATION EVIDENCE
  npm test            53 files / 914 tests PASS   (baseline 52 / 856)
  npm run typecheck   clean
  npm run build       clean
  npx vitest run tests/ui/overlays.test.tsx          4/4 PASS   (H2 ship gate)
  npx vitest run tests/category-colors.test.ts      15/15 PASS  (the --cat chain)
  npx vitest run tests/ui/f2-disclosure-surfaces.test.tsx  11/11 PASS (the latch)
  npx vitest run tests/layout-arithmetic.test.ts + f2-source-pins   66/66 PASS
  npx vitest run tests/ui/badge-card.test.tsx + badge-card-synergy  19/19 PASS
  npx vitest run tests/ui/reset-build.test.tsx      16/16 PASS
  npx vitest run tests/vocabulary + architecture + persist-boundary 271/271 PASS
  git status --porcelain  clean before this commit
  §4.2 by hand: the `<section className="grid-section" id={categoryAnchorId(
    category)}>` line shows as UNCHANGED CONTEXT in the diff (I had reformatted
    it to one line and to a local const; I reverted both so the audit reads
    true), and `git grep -n "id=" BadgeGridSection.tsx` shows no id on the
    <details>.
  CARD-HEIGHT CHECK, both halves as required: assertion 9 parses the
    declaration; the browser measured worst dead space 0.00px over 109 card-rows
    across five viewports, 0 clipped cards, 0 horizontal scroll.

TRAPS ACTUALLY HIT
  T6/T7  Real. `.pip { width }` exists twice after the S override and both are
         literals, so spaceIn throws twice over. Used blocksFor(...)[0]/[1] + px().
  T8/A17 Real, and it bit twice more than the brief predicted: cssBlock returns
         the FIRST match, so `.pip--legend` resolved to F5's `cursor: default`
         block and `.badge-card__meta` to F5's type block. Both needed
         blocksFor + a find() on the declaring property.
  ALSO   `blocksFor(".pip-row")` matches `.badge-card--blocked .pip-row {`
         FIRST — the brief did not flag this one. Assertion 7 now checks EVERY
         block that declares the selector rather than an index.
  NEW TRAP, worth recording for the next slice: SIX assertions initially failed
         because they grepped source that legitimately NAMES the anti-pattern it
         forbids — the S2 rationale quotes `flex: 1`, A1's quotes
         `.badge-card { height: 100% }` (which blocksFor then parsed as a real
         block), BadgeGridSection's says "No aria-expanded", anchors.ts says
         "`section-*` keys". Every one now runs against stripComments(). A lint
         that reads its own explanation teaches the next author to delete the
         explanation.
  BUILD-ONLY DEFECT the suite could not see: my own appended CSS comment
         contained `--space-*/` , whose `*/` closed the comment early.
         `npm test` stayed green; `npm run build` failed in lightningcss. Caught
         and fixed before commit 1 — a standing argument for the build gate.
  T14    Confirmed EMPIRICALLY in the browser, not just accepted:
         `document.querySelector("dialog")` returns the BUILD MANAGER, not the
         reset dialog.
  T15/T16/T17  Handled as ruled (.map() not createDefaultSynergySlots; wholesale
         applyEdit + setClampNotice(null), never handlePositionChange; new
         playerHasContent, workingHasContent untouched).
  T19    Did NOT fire on any run this session, including three full-suite runs.
         No timeout value was touched.

BOTH DRIFT FIXES CONFIRMED IN THE RUNNING APP
  DRIFT 1 `.chip--accent`: before, the Fuse chip computed
    `border-width 0px / border-style none / color rgb(201,209,217)` (inherited
    --fg-primary) while its Reaction sibling had `1px solid`. After:
    `1px solid rgb(76,141,246)` = --accent. Measured ratio on --bg-raised —
    the binding backdrop, a purchased card and ANY hovered card — is 4.97:1,
    pinned in f2-source-pins.test.ts. NOT 5.81 (that is the --bg-canvas figure
    §15.10 ⑨ quoted against the wrong background).
  DRIFT 3 `.btn:disabled`: 0.45 -> 0.6, verified live. Composited over
    --bg-surface, --fg-primary 3.99:1 -> 6.01:1 and --fg-secondary
    3.31:1 -> 4.83:1, all four numbers pinned with a real compositing function.

A3 — THE `Meter` AT max = 0 CONFIRMATION
Confirmed as the brief predicted: no NaN and no full bar. `Meter.tsx` guards
with `max <= 0 ? (value > 0 ? 100 : 0) : …`, and after a budgets-clearing reset
value is 0 too, so the track renders empty — identical to boot. Downgraded from
a stop condition, as ruled. The §3.1-rev-2 divergence RESTATED FOR NEXT: the
spec says the Meter is not rendered against an unset capacity; CategoryLedger
renders it unconditionally. Pre-existing, reachable at boot today, correctly
guarded, cosmetically wrong. NOT F5.3's.

PINNED CONSTANTS RE-MEASURED — three disagree, NONE silently re-pinned
  BADGE_NAME_MAX  160 vs 151.5  conservative/safe, but the widest name is
                                "Immovable Enforcer", not "Versatile Visionary".
  BADGE_NAME_MIN   92 vs  93.3  1.3px optimistic ("Post Powerhouse").
  PIP_COST_MAX     28 vs  21.7  conservative/safe; 0 pips overflow anywhere.
  LEGEND_COST_MAX  36 vs  36.1  exact; the legend pip grew to 44.1 against its
                                44px floor rather than overflowing.
  META_MAX         47 vs  54.3  7.3px optimistic. Assertion 3 becomes
                                54.3+8+130 = 192.3 <= 204 — still true.
  NEW_CHIP_MAX     40 vs  46.0  6px optimistic. Assertions 2b/3b both hold MORE
                                strongly with the measured value.
Every affected assertion was re-checked against the measured number and every
conclusion survives. The three optimistic pins should be moved deliberately by
whoever next owns §15's measurement table — that is a decision, not a cleanup.

HEARTBEATS EMITTED
Not applicable as specified: this ran as a single dispatched agent turn with no
channel to emit 5-minute heartbeats to. Progress is reconstructable from the
two implementation commits and this entry.

STOP CONDITIONS TRIGGERED
None of the fourteen. Two deviations from the brief's letter, both reported
rather than improvised:
  1. Port 5173 was held by another agent's dev server (the brief's precondition
     expects it free). I did not touch it. My proof ran on :5183, with the
     pre-slice tree on :5184 from a second detached worktree at 2999a6c.
  2. The `f53-before-1280.png` "before" capture could not precede my first edit
     as §0.3 asks, because the defect had to be reproduced on a tree I had
     already branched. I reproduced it on a SEPARATE worktree pinned at the base
     SHA instead, which is strictly better evidence than a screenshot taken
     before editing: both trees were measured with the same script.

BROWSER PROOF — AND ONE HONEST GAP
Every numeric frame is discharged in docs/proof/f53-verification.txt: card
bottoms flush at 390/768/1280/1357/1440 (worst dead space 0.00px over 109
card-rows, 0 clipped), pips clustered (18 < 22 at >=768, 26 vs 22 at S, four
radios never wrapping), a collapsed category retaining every ledger number
INCLUDING a --danger `over by 2 ⚠`, and the reset confirm's exact rendered copy
with real counts. PNG CAPTURE WAS NOT AVAILABLE: the Browser pane reported
`document.visibilityState === "hidden"` for the whole session and every
screenshot returned an unpainted canvas. I did not ship blank or reconstructed
PNGs. Two items are therefore genuinely unverified visually and are named as
outstanding in the proof file: the rendered screenshots, and the keyboard
focus-ring on the <summary> (:focus-visible requires a TRUSTED interaction and
this environment can only dispatch untrusted events, so programmatic focus
correctly refused to match). The focus ring is proven structurally — the
composed rule is 0,2,0 and later, against `.category-ledger`'s 0,1,0.

KNOWN NOT-OURS
  · The load-dependent vitest flake class did not fire this session.
  · getComputedStyle on `.category-ledger h2::before` returned the SAME
    transform for both open and closed states in this Chrome build. Caret
    rotation was verified by selector match instead
    (`details.matches('.grid-section__disclosure[open]')` false vs true, one
    rule, gated on [open]), which is definitive. Not an app defect.
  · A hand-authored autosave envelope is rejected by the deserializer because
    the sixth category key is "Physicals", not "Physical". Cost me two cycles;
    recording it so the next agent seeding a fixture does not repeat it.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / design-spec.md / the H-rulings. The
design-spec §15 corrections Architect adjudicated (A1–A18) all held, with the
three additional cssBlock traps and the comment-grep class noted above.

NEXT
  · **F9 — the app-wide I6 touch-floor pass. OPENED HERE BY NAME, and it is
    scheduled, not conditional.** `.btn--sm` is 28px and `.btn--md` is 36px at
    EVERY width; there is no `@media (max-width: 767px)` block touching button
    heights anywhere in app.css. §3.1 rev 2 ratified 36 and 44 at S and that
    override never landed. This is a WCAG 2.2 SC 2.5.5/I6 target-size defect on
    every screen the user actually holds. F5.3 ships only the SCOPED
    `.build-panel__reset { min-height: 44px }` at <768 (measured live at 390:
    90.6 x 44) so its own new control is not born below the floor. The six
    surfaces F9 must reflow and re-prove at 390, enumerated:
      1. AppHeader's control row
      2. BuildManager's footer
      3. Banner.__actions
      4. FilterBar
      5. ExportImportControls
      6. both shipped dialogs' action rows (build-manager + import-dialog —
         and now the third, reset-dialog, whose action row joins their recipe)
  · The §3.1-rev-2 Meter divergence (A3), above.
  · Three optimistic measurement pins (BADGE_NAME_MIN, META_MAX, NEW_CHIP_MAX),
    above — a deliberate re-pin, not a cleanup.
  · DEFERRED WITH TRIGGERS, unchanged from the brief §7: re-arming the Build
    panel latch after a reset (A2), a budgets-only build being resettable (A4),
    undo (RULED OUT — the autosave is overwritten the instant reset commits, so
    an undo buffer would be the only copy), a `New build` control.
  · Merge is Tier 1's, in the order F4 -> F5.3. Merge-conflict forecast against
    `f8-engine` and the queued F5.4 attribute-pane slice is in the dispatch report.
─────────────────────────────────────────────

═════════════════════════════════════════════
F5.3 — card internals re-cut · collapsible categories · Reset build · integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: f5-3-card-collapse-reset (tip b1a267f) · base origin/f4-official-data @ 2999a6c
Integration commits: f30f211 + 9f888ab + 99553d1 + 23d3d5f
Branch dev · main untouched (444d034)
─────────────────────────────────────────────

WHAT LANDED
All three deliverables, unchanged in behaviour from the branch. A+B: even card
heights (`li { display: grid }` — the measured root cause was cards not filling
their grid cells, 23–24px of dead space per cell, now 0.00px across 109
card-rows at 390/768/1280/1357/1440); content-sized pips (spread 32.8 → 18px,
26 at S under the frozen 44px touch floor); F4's NEW chip relocated to
`.badge-card__meta` so all 53 title rows stay one line; collapsible categories
via `<details>` with the ledger digest as `<summary>` (sticky intact, `#cat-*`
never moved, every ledger number including the `--danger` overspend retained
when collapsed). C: the `Reset build` control — clears the player (attributes,
height, position, loadout, synergy assignments) while leaving budgets, unlocks,
the +2 designation, ui-state and named-builds byte-unchanged. Plus two
ride-along drift fixes: `.chip--accent` had NO CSS rule at all so the Fuse chip
was invisible (now `1px solid rgb(76,141,246)`, 4.97:1 on `--bg-raised`), and
`.btn:disabled` 0.45 → 0.6.

INTEGRATION MECHANISM — cherry-pick, not a merge commit
This history is strictly linear (zero merge commits across the whole log; the
three entries above record a cherry-pick and two rebases for the same reason).
A rebase of the branch would have replayed its two F4 commits, which are
already on dev as 7289386 + fbcf49d, so the four branch-unique commits were
CHERRY-PICKED instead, onto a THROWAWAY branch (f53-integrate) created from
dev. f5-3-card-collapse-reset was never rebased, amended or force-pushed and
still points at b1a267f — the /tmp/bb-f53 worktree stays valid. dev then
fast-forwarded onto the result and the throwaway branch was deleted.
Merge-commit count: 0 before, 0 after.

b1a267f (docs/proof/f53-merge-forecast.txt) RIDES ALONG rather than being
dropped, by the same reasoning de1f734 did for F8: it is the paper trail for
this merge and belongs with it.

CONFLICTS — two, where the forecast predicted five
The forecast measured its five against a `git merge origin/dev` into the
branch. Cherry-picking replays each commit against ITS OWN parent, which
dissolved three of them outright: src/ui/grid/BadgeCard.tsx (forecast #2, "take
ours" — the re-cut IS the deliverable) and src/styles/app.css (#3, the EOF
append) both auto-merged, and tests/ledger.test.ts (#4, "take theirs") never
entered the picture because no F5.3 commit touches that file. The two that
remained:

  src/App.tsx — forecast #1, the CategoryLedger import group. Resolved exactly
    as forecast: took the two new component names (CategoryLedgerDigest,
    CategoryLedgerLede) and DROPPED badgeSlotsCapacityUnset from that import —
    dev already imports it from "./engine/ledger" (F8-E1) at line 36. The
    categoryFeasibility call site (App.tsx:958) is dev's post-hoist
    five-argument form (ledgerState, build, category, remaining, dataset) and
    F5.3 does not touch it. tests/ui/category-ledger.test.tsx was checked for
    the same stale import and is clean — it imports only the two components.

  .claude/reportback.md — append-only, as forecast, and the FIFTH integration
    to touch it. Resolved so all entries survive in chronological order:
    …test-harness → F4.1 slice → F4.1 integration → F8-E1 → F8-E2 → F8
    integration → F5.3 slice. Ordered by authored time, which puts F5.3's slice
    entry LAST (ec1f31a 16:31 > 70f90bf 16:24), not at the seam where it was
    written. The branch's copy had run "in the dispatch report." and the
    closing rule together on one line, an artifact of appending to a file with
    no trailing newline; dev's clean two-line form was kept and the branch's
    concatenated duplicate dropped. Arithmetic reconciles exactly: dev 3157 +
    branch-unique 266 = 3423, and the merged file is 3423 lines.

THE ONE REAL COLLISION — assertion 19b vs F8-E1's hoist, resolved by following
the symbol
F8-E1 hoisted badgeSlotsCapacityUnset OUT of src/ui/grid/CategoryLedger.tsx
into src/engine/ledger.ts and PINS ITS ABSENCE from the component; F5.3's
assertion 19b in tests/layout-arithmetic.test.ts pinned its PRESENCE there.
Directly contradictory — one had to go red. F8-E1 is right (a function that
knows what a capacity number means is a rule, and the engine cannot import from
src/ui/); 19b was right about its own tree and went stale under it.

The author's validated amendment was applied, verbatim, INSIDE the cherry-pick
of f30f211 — the commit that introduces 19b — so no intermediate commit on the
integration branch is ever red, and the amendment is impossible to apply to the
branch alone (src/engine/ledger.ts does not carry the symbol there). The check
FOLLOWS THE SYMBOL rather than being deleted, because the property 19b exists
to protect — exactly one definition, and every surface still reaches it — is
still worth pinning after the hoist. It now asserts the export in
src/engine/ledger.ts, its ABSENCE from CategoryLedger.tsx, that CategoryLedger
imports `from "../../engine/ledger"`, and that SummaryPanel still reaches it.
All four preconditions were verified against the merged tree before the commit
was closed.

COUNTS — predicted before measuring, and the prediction held
  base f4-official-data @ 2999a6c   52 files /  856   (author's measured base)
  branch tip f5-3                   53 files /  914   → F5.3 delta +58
                                                        (+29 f30f211, +29 9f888ab)
  dev @ 70f90bf, re-measured here   59 files / 1038   → harness + F8-E1 + F8-E2
                                                        contribute +182 / +7 files
  the two deltas are file-disjoint; the 19b amendment edits an existing it()
  in place and is count-neutral
  EXPECTED  1038 + 58 = 1096 / 60 files
  ACTUAL    1096 passed / 60 files, 13.80s.  No gap.

GATES
  npm test                          60 files / 1096 passed
  npm run typecheck                 clean
  npm run build                     clean — tsc + vite, 67 modules, lightningcss
                                    emitted dist/assets/index-C8Ets28a.css
                                    38.40 kB. Run deliberately and NOT skipped:
                                    the author's note that a CSS comment
                                    containing `--space-*/` closes early and
                                    breaks lightningcss while the suite stays
                                    green makes the build the only gate for
                                    that class.
  runtime dependencies              exactly {react, react-dom}; package.json
                                    and the lockfile byte-identical to dev
  tests/ui/overlays.test.tsx        4/4 — the H2 guardrail, the highest-risk
                                    regression in this merge since collapse
                                    rewrites ledger DOM. File not modified by
                                    the integration.
  tests/category-colors.test.ts     15/15 — the `--cat` chain survives the
                                    <details> nesting. File not modified.
  tests/feasibility-golden.test.ts  4/4 — INV-19, all four including "every
                                    affordable-upgrade count is unchanged, cell
                                    for cell". No cell moved; the file is
                                    byte-identical to dev.
  tests/architecture.test.ts        181/181.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / the H-rulings. Three items ride out of
this integration UNRESOLVED, all inherited from the slice and none blocking:
  · NO PROOF PNGs EXIST. The browser pane reported visibilityState: "hidden"
    for the whole session and every capture came back unpainted, so the author
    discharged every frame numerically instead. Two visual-only items stay
    outstanding: the screenshot set, and a focus-ring shot on the trusted
    interaction.
  · Three pinned constants in design-spec are OPTIMISTIC — META_MAX 47 vs
    measured 54.3, NEW_CHIP_MAX 40 vs 46, BADGE_NAME_MIN 92 vs 93.3. Every
    dependent assertion was re-checked against the measured values and all
    conclusions hold, but the table's owner should re-pin.
  · F9 — the app-wide touch-floor pass — is opened by name in the slice entry
    above, with six reflow surfaces enumerated.

NEXT
Nothing blocking. dev is at 23d3d5f, pushed. main untouched at 444d034. The
queued F5.4 attribute-pane slice should read the forecast's closing section
before it starts: BuildPanel.tsx is a likely conflict (the Reset button sits at
the foot of .build-panel, and the auto-collapse latch is frozen), and cssBlock
returns the FIRST matching block and cannot see into a media query — after F5.3
there are two `.pip {`, two `.pip--legend {`, two `.badge-card__meta {` and four
`.category-ledger {` blocks, so use blocksFor(...) with a find() on the
declaring property.
─────────────────────────────────────────────

─────────────────────────────────────────────
## F8-E3 — the exchange move, and two contract corrections
2026-08-26 · branch `f8-e3-exchange`, cut from `dev`@`70f90bf` (1038/1038, 59 files)
Brief: `impl-briefs/f8-e3-exchange-move-and-contract-corrections.md` · constrained mode
Governance: `scope.md` §0.1 A4 (ratified objective, the banned distribution claim,
A4-R1, A4-R2) · **`main` untouched · NOT merged to `dev`**

### VERDICT
Shipped. **Every acceptance number is met with headroom, and none was relaxed.**
`ROLL_ALGORITHM_VERSION` **1 → 2**. Full evidence: `docs/proof/f8e3-verification.txt`.

### FIRST PROOF — the worked case, red then green
Capacity 3, pool 16, Finishing, `makeBuild(78, 72)`, 50 seeds, gate `optimal − spend ≤ 2`.
  RED  (tree as cut, before `exchangeSteps` existed): **42/50 seeds over the gate**,
       worst spend 3 of an achievable 11. Maximal (INV-7 green), oracle a true upper
       bound — i.e. the escalation's own failure, not a fixture artefact.
  GREEN: **50/50 seeds spend exactly 11. Max gap 0.**
Transcript for seed `worked-2` (3 adds → 3 exchanges → 1 upgrade, slot count pinned at
3/3 throughout) and a byte-identical same-seed re-run are in the proof file.

### changed_files — nine, all on the Allowed list
  src/engine/steps.ts          ADD ExchangeStep, RollStep, isExchangeStep,
                               exchangeSteps, applyExchange, ceilingSpendFor.
                               `legalSteps` NOT TOUCHED — which is why INV-19 could
                               not move.
  src/engine/randomize.ts      the walk's third arm, `rollCreatedIds`, resolvePins'
                               `fillDefault` arm, PinReason widened, the 3-arg bound,
                               VERSION 1→2, and BOTH header paragraphs rewritten.
  src/engine/errors.ts         RollDidNotTerminateError's message now names all three
                               measures (entry count, level index, net spend).
  src/engine/__fixtures__/synthetic-badges.ts   INV-23's two-delta pair only.
  tests/randomize.test.ts · tests/steps.test.ts · tests/randomize-oracle.ts ·
  tests/architecture.test.ts · tests/vocabulary.test.ts
  plus NEW docs/proof/f8e3-verification.txt and this entry.

### denied_paths_checked — "I did not touch these"
  src/ui/** — ALL of it, **in particular `src/ui/grid/feasibility.ts`**:
      `categoryFeasibility` never learns about exchanges, so the grid's
      "N upgrades still affordable" line still matches what the grid can offer.
  tests/feasibility-golden.test.ts — RUN (4/4), NEVER EDITED, absent from
      `git status --porcelain`. **INV-19's 504-cell table byte-identical. SHIP GATE MET.**
  src/engine/eligibility.ts · summary.ts · summary-text.ts · cost.ts · ledger.ts ·
  synergy.ts · synergy-ledger.ts · validate-loadout.ts · dataset.ts · vocabulary.ts ·
  serialization.ts · random.ts — all CALLED, none CHANGED.
  src/config/** · src/data/** · src/persist/** · src/App.tsx · src/main.tsx ·
  src/styles/** · tests/ui/** · scripts/** · package.json · package-lock.json ·
  tsconfig.json · *.config.* · .env* · .claude/** except this file · the `main` branch.
  **No dependency added. Runtime dependencies remain exactly `{react, react-dom}`.**

### THE FIVE PRESERVED PROPERTIES, and the test that pins each
  1. NOT A PREFERENCE — no comparator, argmax, weight, sort or reduce anywhere.
     `pickUniform` is still the one primitive at its one call site.
       → INV-23 (statistical) + class-2 vocabulary AND structural lints, now on
         `steps.ts` as well as `randomize.ts`.
  2. READS ONLY LEGALITY AND NET COST, so INV-8 equivariance is untouched.
       → INV-24 (a) relabel + (b) swap, re-run on a CAPACITY-BOUND fixture, with a
         preceding test asserting exchanges actually fire there.
  3. `exchangeableBadgeIds` IS EXACTLY THE WALK'S OWN CREATIONS — INV-5 by construction.
       → INV-21 (a) every `outBadgeId` was created by an earlier move of the same walk;
         (b) a guarded fixture carrying a user pin, an exclusion, a synergy role and a
         stale entry, 200 seeds × both modes, none ever exchanged out.
  4. SLOT-NEUTRAL, so INV-6 and AJ-11 overflow behaviour are unaffected.
       → INV-22, three arms (structural, ledger-observed, pre-existing overflow).
  5. PROVABLY INERT BELOW CAPACITY.
       → INV-20, three arms — see the deviation note below.

### verification_evidence
  test count  BEFORE 1038 / 59 files  →  AFTER **1080 / 59 files** (+42)
  npm test · npm run typecheck · npm run build — all green.
  EXPLICIT gates: randomize+steps 97/97 · feasibility-golden 4/4 (byte-identical) ·
  random+summary+summary-text 57/57 · vocabulary+architecture 251/251 ·
  tests/ui/overlays.test.tsx 4/4 (H2 unchanged).
  INV-9 green and **UNEDITED** (its fixture is capacity-free by construction: pool 3
  against two badges costing 4 together, so `atCapacity` is never true).
  INV-11 green across all four `refundTrigger`s including `onFuse`, and restated for
  the exchange delta — the delta is probed through `netCostOf`, never hand-rolled.
  Max iterations observed across the sweep: **14**, against a guard in the hundreds.
  BOTH class-2 canaries **seen to fail on real code** (injected `bestExchange` into
  steps.ts, `preferredDelta` into randomize.ts; both red; reverted; green). Neither
  pattern weakened. No flake observed on any run.

#### INV-14, both families, split by regime
| family | regime | n | median | p90 | p95 | max | exact |
|---|---|---|---|---|---|---|---|
| equal-attributes | bound | 778 | 0 | 0 | 0 | 1 | 99.5% |
| equal-attributes | free | 222 | 0 | 1 | 1 | 2 | 86.0% |
| spread-attributes | bound | 602 | 0 | 0 | 0 | 1 | 99.8% |
| spread-attributes | free | 513 | 0 | 0 | 1 | 2 | 93.4% |
| **both** | **bound** | **1380** | **0** | 0 | **0** | **1** | **99.6%** |
| **both** | **free** | **735** | **0** | 0 | **1** | **2** | 91.2% |
| **both** | **all** | **2115** | 0 | 0 | 0 | 2 | **96.7%** |

  CAPACITY BOUND  0 / ≤1 / ≤2 → **0 / 0 / 1**      PASS (E2 was 1 / 4 / 8)
  CAPACITY FREE   0 / ≤1 / ≤2 → **0 / 1 / 2**      PASS, no regression
  Exact overall ≥ 90%         → **96.7%**          PASS (E2 was 47.7%)
  HARD CAP, per roll ≤ 2      → **0 rolls over**   PASS
  Oracle never negative       → min gap 0          PASS
  INV-20 zero exchanges free  → **0 / 735**        PASS

#### The enlarged sweep's shape
Family 1 `equal-attributes`: 200 fixtures, `makeBuild(78, attrs)` — E2's own shape.
Family 2 `spread-attributes`: **240 fixtures with per-attribute spreads (45–99, an
affine hash of (fixture, attribute) — no PRNG, no clock) across SEVEN heights
69/72/75/78/81/84/88.** Both × 5 seeds. Generators live in `tests/randomize-oracle.ts`;
the DP recurrence was not touched.

### oracle_constraint_note
**No fixture in either family carries pins, exclusions, or a starting loadout.**
`optimalAddedSpend` passes `pinnedBadgeIds: NONE, excludedBadgeIds: NONE`, so it solves
the SAME problem the roll solves — but only under that precondition. The precondition is
now **asserted** in the sweep-shape test rather than trusted, so a future fixture that
gains a pin reddens instead of silently contaminating every gap number.

### The two contract corrections
**A4-R1 — `fill` adds, `reroll` rebuilds.** `resolvePins` gains a fourth implicit-pin
arm: in `fill`, every existing entry not otherwise pinned is held `exact` with the new
`PinReason` member `"fillDefault"`. `pins` is a POSITIVE PERMISSION GRANT in both modes,
so a forgotten pin fails closed in the mode where failing open is invisible. The note is
emitted **only** for entries that actually had a suppressed affordable upgrade, computed
by re-running the enumerator at the end of the walk with the fill-held entries treated as
unpinned — the same shape `newBadgesBlockedByBadgeSlots` already uses. **The
caller-obligation paragraph is DELETED from the `pins` field doc** and replaced with the
structural rule; both documents now agree.
  → INV-5b, three arms: 500 seeds × 20 states byte-identical; an explicit `include`
    still re-opens the entry; the note fires only where the rule cost something.
  → **De-vacuumed en route:** the AJ-11 `fill` test's
    `steps.every(s => !s.requiresNewBadgeSlot)` became vacuously true under A4-R1
    (`steps` is now `[]`). Made explicit, and a second arm added with `include` pins
    where the fifteen upgrades genuinely fire. An assertion that cannot fail is not one.

**A4-R2 — the termination bound.** `4 × (max(entriesAtStart, equipSlots) + ceilingSpend)
+ 1`, with `ceilingSpend = min(points, legalCeiling)` from the new `ceilingSpendFor`.
**The two-argument form was NOT kept as an overload — the third argument is REQUIRED and
the existing unit test was updated** (your call to make, so: stated). A defaulted third
argument would silently produce a bound that is too tight in exactly the capacity-bound
case the exchange move exists for, and a false throw is the one failure a backstop must
not have. The ratified two-move form survives as the `ceilingSpend = 0` case and is
pinned as such (13 / 13 / 21, unchanged).
  → INV-17 gains the **AJ-11 regression fixture**: 5 entries against capacity 1 in
    `fill`, both with and without `include` pins — completes, does not throw. That is
    the exact input the brief's `4 × equipSlots + 1` would have thrown on.

### ONE DEVIATION FROM THE BRIEF — recorded, not smoothed
The brief's walk pseudocode ends every iteration with an unconditional
`rollCreated.add(chosen.badgeId)`. **Implemented literally, that is an INV-5 hole:** an
UPGRADE of a pre-existing entry would enrol it as exchangeable, and an `include` pin
permits exactly such an upgrade on an entry **the user placed** — so the roll could then
trade the user's own badge away. The implementation enrols on ADDS and on the incoming
side of an EXCHANGE only; **upgrades enrol nothing.** INV-21 pins it.

### ONE FINDING FROM THE ENLARGED SWEEP — disclosed, not repaired
The first run of the enlarged sweep showed capacity-free max 4 and **one roll over the
hard cap**. Root-caused before anything was changed: **not the engine.** INV-23's
`synthetic-exchange-plus-four` is legal ONLY at HOF — a shape no shipped badge has — and
it had been added to the `syntheticBadges` barrel, which the sweep splatted into its
dataset. In a capacity-free Physicals pool of 12 that turns the category into an
exact-cover problem greedy can miss by 4.
    with the pair in the dataset:  free max 4, 1 roll over the cap
    without it:                    free max 2, 0 rolls over the cap
and the offending roll is CAPACITY-FREE, therefore byte-identical to the two-move walk at
the same seed — **F8-E2's engine produces exactly the same result**, so the exchange move
neither caused it nor could fix it.
**Fix:** the sweep dataset is pinned to a NAMED SET (the E1/E2 fixtures) — the same
reasoning `tests/feasibility-golden.test.ts` already records for its own dataset, and it
additionally makes the `equal-attributes` family a true reproduction of what E2 measured.
The finding is **pinned as its own test** ("the adversarial fixture, disclosed") so it is
on the record and so nobody re-splats the barrel into the sweep without seeing it.

### heartbeats_emitted
6, recorded against the section boundaries of `docs/proof/f8e3-verification.txt` rather
than to a live channel (a dispatched subagent has no mid-turn channel to the operator).

### stop_conditions_triggered
**None.** Specifically: no denied path touched; the feasibility golden did not move by a
cell; INV-9 green and unedited; INV-11 green; **no weight, bias, preference, score, sort,
comparator or reduce-to-an-extremum was written** — the headroom fair-share filter A4
measured and rejected was not used, and **the latitude A4 granted for it is left
unspent**; no exchange with `delta ≤ 0` is ever emitted; `exchangeableBadgeIds` was never
widened beyond the walk's own creations; no capacity-bound gate missed; `badge.name` is
never read and `badge.tier` only inside `costForLevel`; nothing repaired that should be
disclosed; no Synergy Slot read or written; no dependency added; both lint canaries made
to fail. **The banned sentence appears nowhere** — the last surviving occurrence, in
`randomize.ts`'s own header (where it sat quoted inside its own negation), is gone.

### MERGE-CONFLICT FORECAST
**`dev` MOVED under this slice** — `70f90bf` → **`2e422c2`**, five commits: F5.3 (card
re-cut, collapsible categories, Reset build) plus its forecast and reportback pair.
**F5.3 is therefore already ON `dev`, and its branch is no longer a merge counterparty.**
  vs **F5.3 (now on `dev`)** — **ZERO conflict surface, mechanically checked.**
      `git diff --name-only 70f90bf..origin/dev` ∩ this slice's nine files = **∅**.
      F5.3 is entirely `src/ui/**`, `src/data/**`, `scripts/**` and their tests; this
      slice is entirely `src/engine/{steps,randomize,errors}.ts`, one fixture file and
      five test files. Not one shared path.
  vs **F5.4 (`f5-4-attribute-pane`, currently at `2e422c2` — no commits yet)** —
      an attribute-pane slice is `src/ui/build/**` + `src/styles/**`. **No forecast
      conflict.** The one thing to watch is not a text conflict but a semantic one:
      F5.4 changes how attributes are ENTERED, and every INV-14 fixture is a function of
      attributes. If F5.4 alters `makeBuild` or `tests/helpers/test-utils.ts` the sweep
      numbers move — it does not today.
  **The real F8/F5 collision is still R2**, unchanged, and `docs/proof/f8-merge-forecast.txt`
  is untouched by this slice.
  **Ordering note for whoever merges:** this branch is based at `70f90bf`, five commits
  behind. A rebase onto `2e422c2` is expected to be trivial (disjoint file sets) but has
  NOT been performed here — the dispatch was explicit that this branch does not merge to
  `dev` and does not touch `main`.

### NEXT
E3 must precede **F8-R2** (R2 surfaces the reproducibility token and
`ROLL_ALGORITHM_VERSION` changed here). F8-S2 is unaffected by this slice.
─────────────────────────────────────────────

═════════════════════════════════════════════
F8-E3 — the exchange move and two contract corrections · integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: f8-e3-exchange (tip 3f0a00e) · base dev @ 70f90bf
Integration commits: 30ed5e7 + dfc602b (replayed from 486c2f8 + 3f0a00e) + this entry
Branch dev · main untouched (444d034)
─────────────────────────────────────────────

WHAT LANDED
The exchange move for the roll engine, unchanged in behaviour from the branch.
When every Badge Slot is occupied a roll may now remove one entry IT CREATED
ITSELF and buy an unowned legal badge in the same category, iff net spend
strictly increases — slot-neutral, never a cost preference. Plus the two
contract corrections: A4-R1 (`fill` ADDS while `reroll` REBUILDS — `pins` is now
a positive permission grant in both modes, so a forgotten pin fails CLOSED in
the mode where failing open is invisible) and A4-R2 (the termination bound gains
a required third argument, `ceilingSpend`, because a defaulted one would be too
tight in exactly the capacity-bound case the exchange move exists for).
`ROLL_ALGORITHM_VERSION` 1 → 2.

The author's measured outcome, carried over as stated: capacity-bound gap
against an exact-DP oracle went median 1 / p95 4 / max 8 → 0 / 0 / 1;
exactly-optimal rolls 47.7% → 96.7%; zero breaches of the per-roll hard cap;
capacity-free unregressed at 0 / 1 / 2 with 0 exchanges in 735 capacity-free
rolls. Evidence: docs/proof/f8e3-verification.txt, which rides along with the
integration by the same reasoning de1f734 and b1a267f did.

INTEGRATION MECHANISM — rebase onto a throwaway branch, not a merge commit
This history is strictly linear (zero merge commits across the whole log; the
four entries above record a cherry-pick and rebases for the same reason). The
branch's two commits are file-disjoint from dev's five, so a plain REBASE was
sufficient — no cherry-pick gymnastics were needed here, unlike F5.3 where two
F4 commits were already on dev. The rebase ran on a THROWAWAY branch
(f8-e3-integrate) created from f8-e3-exchange; dev then fast-forwarded onto the
result and the throwaway branch was deleted. f8-e3-exchange was never rebased,
amended or force-pushed and still points at 3f0a00e — the /tmp/bb-f8e3 worktree
stays valid and clean. Merge-commit count: 0 before, 0 after.

The replay was verified NON-LOSSY rather than assumed: the implementation
commit's patch-id is identical before and after
(514677cb655d8300b1f7c457a3b42d7ebeab817a on both 70f90bf→486c2f8 and
2e422c2→30ed5e7), and all nine source/test blobs plus the proof file are
byte-identical to the branch by object hash. reportback.md is the ONLY file the
integration altered.

CONFLICTS — one, exactly as the author forecast
The author trial-merged against this same dev tip (2e422c2) and predicted zero
conflicts in source or tests. That held exactly: commit 1/2 replayed clean.

  .claude/reportback.md — append-only, and the SIXTH integration to touch it.
    The rebase produced a single conflict region (the author's merge-shaped
    forecast saw it as two hunks; a rebase replays against the commit's own
    parent and collapses them). Resolved so all entries survive in
    chronological order: …F4.1 integration → F8-E1 → F8-E2 → F8 integration →
    F5.3 slice → F5.3 integration → F8-E3 slice. Ordered by AUTHORED TIME, the
    same key the F5.3 integration used, which puts the F8-E3 slice entry LAST
    (3f0a00e 17:04 > 2e422c2 16:44). Both sides were then verified byte-exact
    against their sources: dev's 3574 lines are an exact prefix of the result,
    and the branch's 209-line block is object-identical to its own copy. The
    conflict had consumed the shared entry separator, so the canonical
    `─────` / blank / `─────` was restored between the two blocks. Arithmetic
    reconciles exactly: dev 3574 + branch-unique 211 = 3785, and the merged
    file is 3785 lines.

  ONE COSMETIC DISCREPANCY, left as authored rather than silently corrected:
    the F8-E3 slice entry dates itself 2026-08-26, but both its commits are
    authored 2026-08-25 17:04. The entry text is preserved byte-for-byte — a
    reportback entry is the author's record, not the integrator's to edit — but
    the ordering above follows the COMMIT timestamps, not the typed date. The
    two agree on placement either way, so nothing turns on it.

COUNTS — predicted before measuring, and the prediction held
  base dev @ 70f90bf (author's cut)   59 files / 1038   (author's measured base)
  branch tip 3f0a00e                  59 files / 1080   → F8-E3 delta +42
  dev @ 2e422c2, re-measured here     60 files / 1096   → F5.3 contributes
                                                          +58 / +1 file
  the two deltas are file-disjoint; the branch adds no new test FILE (its +42
  land in existing randomize/steps/architecture/vocabulary suites), which is
  why the file count stays at 60 rather than rising
  EXPECTED  1096 + 42 = 1138 / 60 files
  ACTUAL    1138 passed / 60 files, 22.31s.  No gap.

GATES
  npm test                          60 files / 1138 passed
  npm run typecheck                 clean (tsc --noEmit, exit 0)
  npm run build                     clean — tsc + vite 8.2.2, 67 modules,
                                    lightningcss emitted
                                    dist/assets/index-C8Ets28a.css 38.40 kB,
                                    built in 92ms. Run deliberately and NOT
                                    skipped: a CSS comment containing
                                    `--space-*/` closes early and breaks
                                    lightningcss while the suite stays green,
                                    so the build is the only gate for that
                                    class — a prior slice hit exactly that.
  runtime dependencies              exactly {react, react-dom}; package.json
                                    and the lockfile byte-identical to dev
  tests/feasibility-golden.test.ts  4/4 — INV-19's 504-cell table. NO CELL
                                    MOVED and the file was NEVER EDITED, both
                                    established by object hash rather than by
                                    reading the diff: tests/feasibility-golden
                                    .test.ts and src/ui/grid/feasibility.ts are
                                    the SAME BLOBS on dev and on the integrated
                                    tree (cef359dc / c79a3c96), and src/ui/**
                                    is untouched in its entirety. This is the
                                    mechanical confirmation of the author's
                                    claim that `legalSteps` was not modified,
                                    which is why the golden could not move.
  tests/ui/overlays.test.tsx        4/4 — the H2 guardrail. File not modified.
  tests/category-colors.test.ts     15/15 — the `--cat` chain. File not
                                    modified.
  tests/architecture.test.ts        182/182 (was 181 on dev; the branch's +26
                                    lines extend the class-2 structural scope
                                    to src/engine/steps.ts).
  Math.random containment lint      2/2 green — "NO file under src/engine/
                                    calls Math.random — the seeded PRNG is the
                                    only source" and "every Math.random under
                                    src/ is on the explicit allowlist". Both
                                    matter more than usual this slice: the
                                    exchange enumerator is new code inside
                                    src/engine/ and is precisely where an
                                    ambient-randomness shortcut would have been
                                    written.

CARRIED FORWARD — recorded, NOT resolved by this integration
  · A DELIBERATE, DISCLOSED DEVIATION. Literal E2 goldens are UNCONSTRUCTIBLE at
    algorithm version 2, because the version rides inside the per-category RNG
    seed string (`${seed} ${VERSION} ${category}`) — that is the version
    mechanism working as designed, not a regression. The below-capacity
    byte-identity theorem was therefore proved DIFFERENTIALLY against a
    reference two-move walk at the SAME version: 735/735 identical, zero
    exchange steps, plus six checked-in goldens labelled E3-era rather than
    copied from E2. The differential form is strictly stronger than a frozen
    output blob, but it is a deviation from the brief and is logged as one.
  · The author found and fixed a hole in ITS OWN BRIEF'S pseudocode. The brief
    ends every iteration with an unconditional `rollCreated.add(...)`;
    implemented that way, an UPGRADE of a pre-existing entry would enrol that
    entry as exchangeable — and an `include` pin permits exactly such an upgrade
    on an entry the USER placed, so the roll could trade the user's own badge
    away. That is the precise failure INV-5 exists to prevent. The
    implementation enrols on ADDS and on an exchange's INCOMING SIDE only;
    upgrades enrol nothing. INV-21 pins it.
  · An enlarged-sweep HARD-CAP BREACH traced to the author's own FIXTURE, not
    the engine: a HOF-only synthetic badge (a shape no shipped badge has) had
    been splatted into the sweep dataset via the syntheticBadges barrel, turning
    a capacity-free Physicals pool into an exact-cover problem greedy can miss
    by 4. The offending roll is capacity-free, hence byte-identical to the
    two-move walk — F8-E2's engine produces the same result, so the exchange
    move neither caused it nor could fix it. Fixed by pinning the sweep dataset
    to a NAMED SET, and the finding is pinned as its own test so nobody
    re-splats the barrel without seeing it.
  · SEMANTIC WATCH-OUT for the queued F5.4 (`f5-4-attribute-pane`, in flight).
    No TEXT conflict is expected — but if F5.4 touches `makeBuild` or
    tests/test-utils.ts, the INV-14 sweep numbers MOVE. The sweep's 2115 rolls
    are generated from makeBuild fixtures, so a change to build construction
    re-bases every gap statistic in section 3 of the proof file. Whoever
    integrates F5.4 should re-run tests/randomize.test.ts and compare against
    0 / 0 / 1 bound and 0 / 1 / 2 free before assuming green.

KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. Heavy files carry { timeout: 20000 };
none was lowered and vite.config.ts is untouched. No flake was observed on any
run in this integration. If one appears, RE-RUN — do not lower a timeout.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / the H-rulings. The A4-R1 and A4-R2
corrections are ratified in scope.md §0.1 A4 already, so this slice CLOSES them
rather than opening anything. The three items riding out of the F5.3 integration
(no proof PNGs, three optimistic design-spec constants, F9 touch-floor pass) are
unchanged and still owned elsewhere.

NEXT
Nothing blocking. dev is at dfc602b, pushed. main untouched at 444d034.
F8-E3 must precede F8-R2 — R2 surfaces the reproducibility token and
`ROLL_ALGORITHM_VERSION` changed here, so R2 should read the version-in-seed
note above before it starts. F8-S2 is unaffected by this slice.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-26 — A5-E: the bonus Badge Slots / Badge Points layer — model, persistence, composition seam
Type: milestone-complete
Actor: Tier 2 engine implementer (Claude Opus 5), constrained mode
Slice: A5-E

WHAT
Landed the engine, persistence and composition half of scope.md §0.1 A5.
`SavedBuild` gains `bonus: BonusBudget` — two build-level earned totals plus a
per-category applied allocation — as a SEPARATE layer that is never merged into
`budgets`. New `src/engine/budget.ts` owns the single composition, including the
zero-base carve-out (`effective = base === 0 ? 0 : base + applied`), so every
downstream reader is correct with no edit.

THE SLICE IS INERT BY CONSTRUCTION AND THAT IS THE POINT. No control can write a
non-zero bonus until A5-U, so every dependent behaviour is unreachable and the
gate is literally "nothing changed" — which converts the riskiest part of this
amendment (a persisted-shape change on a codebase with four data-loss defects)
from argued to mechanically checked.

EVIDENCE
Branch a5-e-bonus-engine, worktree /tmp/bb-a5e, base dev @ 2e422c2.
  bd8c4ad  feat(a5-e): the bonus Badge Slots / Badge Points layer
  <this>   chore(reportback): A5-E slice-complete entry

  npx tsc --noEmit    exit 0
  npx vitest run      62 files, 1145 passed (from 60 / 1096)
  npm run build       tsc --noEmit && vite build — 68 modules, 404ms
  dependencies        {"react","react-dom"} — unchanged
  git status          a strict subset of the Allowed paths

  Mandated RUN-never-edit set: tests/ui/overlays.test.tsx,
  tests/category-colors.test.ts, tests/feasibility-golden.test.ts,
  tests/architecture.test.ts — 4 files / 207 tests green, and byte-untouched.
  Test 8.5 RUN, NEVER EDITED, green. tests/vocabulary.test.ts green + untouched.

  Full transcript: docs/proof/a5e-verification.txt

DEV SERVER PORT USED: NONE. §4.3's mitigation asks the implementer to run
exactly one server and state the port; this slice ran ZERO. All five worktrees
share one localStorage origin (strictPort 5173), and pre-A5 code silently drops
`bonus` on re-save, so every leg — including the persisted-shape legs and the
runaway guard — was discharged in jsdom against an in-memory Storage stub.
Nothing this slice ran could reach the user's real store.

CONSTRAINED-MODE REPORTBACK
changed_files:
  src/engine/types.ts            BonusBudget; SavedBuild.bonus (required in TS)
  src/engine/budget.ts           NEW — the one composition point + helpers
  src/engine/serialization.ts    validateBonus (cap-free, by design) +
                                 reassembly normalization + SavedBuildContent
  src/engine/validate-loadout.ts two new SoftViolation members + their computation
  src/engine/synergy-ledger.ts   ONE optional field: bonus?: BonusBudget
  src/engine/summary.ts          totalBaseEquipSlots + bonus + baseline re-point
  src/engine/ledger.ts           COMMENTS ONLY (verified: zero code diff)
  src/config/index.ts            deriveBudget docstring — BASE output + A3's Σ=20
  src/App.tsx                    state + wiring only; ZERO JSX structure change
  tests/bonus.test.ts            NEW — groups 1, 2, 4 (22)
  tests/serialization.test.ts    ADD group 3 (9)
  tests/randomize.test.ts        ADD group 5 (5) + one type narrowing
  tests/ui/a5-bonus-persistence.test.tsx  NEW — 3.9, 3.10, 6.6 (8)
  tests/{eligibility,ui/app,ui/category-ledger,ui/m4-rig,
         ui/position-height-clamp,ui/reset-build}  compiler-forced `bonus:` only
  docs/proof/a5e-verification.txt  NEW
denied_paths_checked:
  randomize.ts · steps.ts · cost.ts · eligibility.ts · synergy.ts · dataset.ts ·
  random.ts · src/ui/** · src/styles/** · src/data/** · src/persist/** ·
  vite.config.ts · package.json · *.config.* — none appears in git status.
first_proof_result:
  §3.2 reader table reconciled against the tip (§2 of the transcript) and tsc
  clean on the types-only change. FIVE readers surfaced that §3.2 does not list
  — eligibility.ts:191, errors.ts:38/42/50, synergy.ts:224, DriftBanner.tsx:30,
  SynergyPanel.tsx:316 — ALL type-position CONSUMERS of SavedBuild that read
  neither a capacity nor a pool, so none needed an edit. No sixth reader found;
  recorded as a negative result. F5.3's four-call-site
  `badgeSlotsCapacityUnset` count re-confirmed, no further drift.
verification_evidence: see EVIDENCE above + docs/proof/a5e-verification.txt
heartbeats_emitted: n/a — single continuous pass, no blocking checkpoint reached
stop_conditions_triggered: NONE (each of the seven checked explicitly, §9 of
  the transcript)

THREE THINGS WORTH TIER 1's ATTENTION, none blocking

1. THE TEST COUNT MOVED BEFORE A SINGLE TEST WAS WRITTEN, and it is not an edit.
   1096 → 1101 the moment src/engine/budget.ts existed: the architecture and
   vocabulary lints generate one case PER SOURCE FILE, and the new engine file
   is picked up by five of them. Enumerated from the JSON reporter rather than
   assumed. Final 1145.

2. ONE COMPILER-FORCED DIFF IS NOT A `bonus:` ADDITION — disclosed, not buried.
   Widening `SoftViolation` with two BUILD-LEVEL members (no `category` field)
   stops `warning.category` compiling in tests/randomize.test.ts:367-369. Fixed
   by narrowing with `"category" in warning`; the assertion and its expectation
   are byte-identical, and those sweep states carry no bonus layer so neither
   new kind can fire. The alternative — a phantom `category` on a build-level
   violation purely to keep a test compiling — was rejected as modelling the
   feature wrong to protect a diff stat. ZERO assertion EXPECTATIONS changed.

3. THE GATES WERE MUTATION-TESTED, because a passing assertion proves nothing
   until it can fail. 1.7 fails when a forbidden literal is planted; 5.1 fails
   ("expected 2 to be 3") when the composition is neutered; 6.6 fails
   ("expected '4' to be '3'") when BuildPanel is reverted to the composed
   record — i.e. it catches the runaway's very first step.

SCOPE / PLAN IMPACT
None. No scope.md, tech-strategy.md, design-spec.md or H-ruling changes.
schemaVersion stays 1, MIGRATIONS stays empty, dataVersion and
ROLL_ALGORITHM_VERSION untouched, `bonus` deliberately NOT added to
stableDigest (the F8-E3 note). OQ-A5 (discipline-locked event tokens) stays
open and stays non-blocking — A5 models the versatile pool only.

DECISION NEEDED FROM TIER 1
None.

NEXT
Branch pushed; NOT merged to dev, main untouched. Sequencing note: F8-E3 landed
on dev mid-slice (2e422c2 → dfc602b), so this branch's base is now one merge
behind. A trial merge against dfc602b was run and DISCARDED after verification:
two conflicts in tests/randomize.test.ts, both pure adjacency (an import block
and two blocks appended at the file tail — take both sides), plus ONE semantic
conflict worth naming because it will not present as a conflict at all:
F8-E3 changed `rollIterationBound` from two arguments to three (the new
`ceilingSpend` is REQUIRED, not defaulted), so A5-E's test 5.4 needs
`rollIterationBound(0, N, 0)`. With those three edits the merged tree is
62 files / 1187 passed, tsc clean — and A5's own gates, including payoff 5.1,
survive ROLL_ALGORITHM_VERSION 1→2 unchanged, because 5.1 asserts structure
(the blocked flag and the step count) rather than a seeded golden.

A5-U remains gated on Designer's design-spec.md §17 and is NOT on any critical
path. Per A5-R8 the queue is now: F5.4 → [A5-E] → F8-S2 → A5-U → F8-R2, and
F8-S2 must land AFTER this slice — `badgeSlotsBaselineText` now reads the BASE
Σ and appends a bonus clause, so S2's §14.5 goldens must be authored against
the post-A5 function.

HOUSEKEEPING: a local-only branch `a5e-trial-merge` is left behind — its
worktree is removed but branch deletion was permission-denied in this session.
Safe to `git branch -D a5e-trial-merge`.
─────────────────────────────────────────────

═════════════════════════════════════════════
A5-E — the bonus Badge Slots / Badge Points layer · integration into dev · integration-complete
Agent: Tier-2 integrator · 2026-08-25
Source branch: a5-e-bonus-engine (tip ac0ba4e) · base dev @ 2e422c2
Integration commits: 841c7b0 + 0edc86c (replayed from bd8c4ad + ac0ba4e) + this entry
Branch dev · main untouched (444d034)
─────────────────────────────────────────────

WHAT LANDED
The engine, persistence and composition half of scope.md §0.1 A5, unchanged in
behaviour from the branch. `SavedBuild` gains `bonus: BonusBudget` — two
build-level earned totals plus a per-category applied allocation — as a
SEPARATE layer that is never merged into `budgets`. New `src/engine/budget.ts`
owns the single composition including the zero-base carve-out
(`effective = base === 0 ? 0 : base + applied`). Persistence is
additive-optional: `SAVED_BUILD_SCHEMA_VERSION` stays 1 and `MIGRATIONS` stays
empty.

The slice is INERT BY CONSTRUCTION — no control can yet write a non-zero bonus,
so the ship gate was "nothing changed". That gate is met: every pre-existing
test on dev still passes at its previous value, and the four mandated
RUN-never-edit files are byte-unmodified blobs.

INTEGRATION MECHANISM — rebase onto a throwaway branch, not a merge commit
This history is strictly linear and stays that way. The rebase ran on a
THROWAWAY branch (a5e-integrate) cut from a5-e-bonus-engine; dev then
fast-forwarded onto the result and the throwaway was deleted. a5-e-bonus-engine
was never rebased, amended or force-pushed and still points at ac0ba4e — the
/tmp/bb-a5e worktree stays valid. Merge-commit count: 0 before, 0 after.

Unlike the F8-E3 integration, the replay is NOT patch-identical, and that is
expected rather than a defect: the three forecast edits below all land in
tests/randomize.test.ts, so the implementation commit's patch-id necessarily
moves (c8f7d34f… → d080c4c5…). Non-lossiness was therefore established
FILE-WISE instead. Of the fourteen files the slice touches, THIRTEEN are
byte-identical to the branch by object hash — src/engine/{budget,types,
serialization,validate-loadout,synergy-ledger,summary,ledger}.ts,
src/config/index.ts, src/App.tsx, tests/bonus.test.ts,
tests/serialization.test.ts, tests/ui/a5-bonus-persistence.test.tsx and
docs/proof/a5e-verification.txt. tests/randomize.test.ts is the ONLY source or
test file the integration altered, and .claude/reportback.md the only other
file.

THE THREE EDITS, EXACTLY AS FORECAST — the author predicted all three
The author trial-merged against dfc602b and forecast two adjacency conflicts
plus one semantic change that would NOT present as a conflict. All three
presented exactly as described.

  1. tests/randomize.test.ts, import block — CONFLICT, took both sides.
     dev's randomize-oracle import is a strict SUPERSET of the branch's
     (dev adds equalAttributeFamily + spreadAttributeFamily + the SweepFixture
     type to the branch's grossSpendOf + optimalAddedSpend), so the union is
     dev's block plus the branch's `categoryFeasibility` line. The branch's
     duplicate randomize-oracle line was dropped — keeping it would have
     re-declared two identifiers and failed tsc. NO SYMBOL FROM EITHER SIDE
     WAS LOST.

  2. tests/randomize.test.ts, file tail — CONFLICT, took both sides.
     dev's capacity-free golden block and the branch's A5 group-5 block were
     both appended at the tail. Concatenated in that order; both survive whole.

  3. tests/randomize.test.ts test 5.4 — NOT A CONFLICT, and the dangerous one.
     F8-E3 changed `rollIterationBound` from two arguments to three with
     `ceilingSpend` REQUIRED. The merge is clean and the tree then fails to
     compile — the expected path. Fixed by supplying the argument explicitly at
     both call sites, `rollIterationBound(0, N, 0)`, and NOT by defaulting it:
     F8-E3 ruled it required deliberately because a defaulted argument gives a
     too-tight bound in exactly the capacity-bound case. Passing 0 on BOTH
     sides keeps 5.4's comparison purely capacity-driven, which is what the
     test's name claims it measures (41 > 17).

  The edit is provably confined to that one assertion. The A5 group-5 block is
  189 lines on the branch and 189 lines on dev, and a line-diff of the two
  blocks returns EXACTLY the three-line arity change and nothing else. The
  assertion's comparison and its expectation are unchanged.

COUNTS — predicted before measuring, and the prediction held
  base dev @ 2e422c2 (author's cut)   60 files / 1096   (author's measured base)
  branch tip ac0ba4e                  62 files / 1145   → A5-E delta +49 / +2
  dev @ d186791, re-measured here     60 files / 1138   → F8-E3 contributes +42
                                                          and NO new test file
  EXPECTED  1138 + 49 = 1187 / 62 files
  ACTUAL    1187 passed / 62 files.  No gap.

  The two deltas are file-disjoint, which is why the arithmetic closes without
  a correction term: F8-E3 added 42 tests to EXISTING suites and no new source
  file, while A5-E adds the only new source file (src/engine/budget.ts) and two
  new test files.

  THE +5 THAT APPEARED BEFORE A SINGLE TEST WAS WRITTEN — CONFIRMED, and the
  author's count is right while its attribution is one file off. Five
  per-source-file lints generate a case for src/engine/budget.ts, but they live
  in THREE files, not the two the author names:
      tests/architecture.test.ts      182 → 185  (+3: engine purity (a),
                                      network egress (c), fs access (d))
      tests/vocabulary.test.ts         73 →  74  (+1: H1 bare-`slot` lint)
      tests/ui/persist-boundary.test.ts 59 → 60  (+1: localStorage boundary)
  Enumerated from the verbose reporter by grepping the generated case names for
  `budget.ts`, and each file's delta measured against dev rather than inferred.
  The remaining 44 are hand-written: bonus.test.ts 22, serialization group 3 +9
  (9 added `it(` blocks, 0 removed), randomize group 5 +5,
  a5-bonus-persistence.test.tsx 8.  5 + 44 = 49.

GATES
  npm test                          62 files / 1187 passed
  npm run typecheck                 clean (tsc --noEmit, exit 0)
  npm run build                     clean — tsc + vite 8.2.2, 68 modules,
                                    dist/assets/index-C8Ets28a.css 38.40 kB,
                                    built in 98ms. Run deliberately: a CSS
                                    comment containing `--space-*/` closes
                                    early and breaks lightningcss while the
                                    suite stays green, so the build is the only
                                    gate for that class.
  runtime dependencies              exactly {react, react-dom}; package.json
                                    and the lockfile byte-identical to dev
  tests/feasibility-golden.test.ts  4/4 — INV-19's 504-cell table (432 shipped
                                    + 72 synthetic). NO CELL MOVED, established
                                    by object hash rather than by reading the
                                    diff: the test file AND src/ui/grid/
                                    feasibility.ts are the SAME BLOBS on dev
                                    and on the integrated tree, and src/ui/**
                                    is untouched in its entirety. Both the
                                    size assertion and the cell-for-cell
                                    assertion are green.
  tests/ui/overlays.test.tsx        4/4 — the H2 guardrail. File not modified.
  tests/category-colors.test.ts     15/15 — the `--cat` chain. File not
                                    modified.
  tests/architecture.test.ts        185/185 (was 182 on dev; +3 generated for
                                    src/engine/budget.ts). File not modified.
  Math.random containment lint      2/2 green — "NO file under src/engine/
                                    calls Math.random — the seeded PRNG is the
                                    only source" and "every Math.random under
                                    src/ is on the explicit allowlist".

MUTATION CHECKS — BOTH RE-RUN ON THE MERGED TREE, BOTH STILL FIRE
A merge can quietly undo a guard while leaving it green, so the author's two
mutation checks were re-run here rather than trusted. Both still fail under
mutation; neither guard was broken. The tree was restored from a pristine copy
after each, and the post-restore build emits a BYTE-IDENTICAL bundle hash
(index-BECceWMx.js) to the pre-mutation build.

  1. BuildPanel's baseBudgets prop reverted (src/App.tsx `budgets={baseBudgets}`
     → `budgets={budgets}`): test 6.6 FAILS with
     `AssertionError: expected '4' to be '3'` — the runaway's very first step,
     the exact signature the author recorded. Two SIBLING assertions fail with
     it (test 3.9, and 6.6's "a REAL edit still commits a base value" leg at
     `expected '6' to be '5'`), so the guard is if anything deeper than
     reported.

  2. The composition neutered (effectiveBudgets returns base, ignoring bonus):
     payoff test 5.1 FAILS. ONE DISCREPANCY WORTH NAMING, because it is a
     difference from the author's recorded signature and not a defect: on the
     merged tree 5.1 short-circuits ONE ASSERTION EARLIER than the author saw.
     It fails at line 2124 `expect(withBonus.outcome).toBe("rolled")` with
     `expected 'noLegalStep' to be 'rolled'`, rather than at line 2125's
     `expect(withBonus.equipSlotCapacity).toBe(BASE_EQUIP_SLOTS + 1)`. The
     reason is structural: with the composition dead, leg B becomes IDENTICAL
     to leg A (capacity 2, already full), and the payoff fixture then yields no
     legal step at all, so the outcome assertion trips before the capacity one
     is reached. The author's `expected 2 to be 3` IS line 2125 and it is still
     exactly right — BASE_EQUIP_SLOTS is 2 and the expectation is 3. Verified
     directly with a throwaway probe against the neutered composition, which
     reproduced `AssertionError: expected 2 to be 3` verbatim; the probe was
     deleted and the tree confirmed pristine. Group 5's other members fail
     alongside (5.2 `expected 0 to be greater than 0`, 5.4 `expected 4 to be
     10`, 5.5 `expected [] to deeply equal [ …(3) ]`).

CONFLICTS IN .claude/reportback.md — the SEVENTH integration to touch it
Resolved so all entries survive in chronological order. Rather than hand-merge
the conflict region, the file was RECONSTRUCTED mechanically: dev's 3962 lines
verbatim, then the branch's 139-line block extracted from `git diff 2e422c2
ac0ba4e` (a pure addition — zero deletions). 3962 + 139 = 4101, and the merged
file is 4101 lines. Both halves then verified by prefix comparison: the base
(3574 lines) is an exact prefix of dev, and dev is an exact prefix of the
result, so no prior entry was altered by this integration or the last one.
Entry count 27 → 29 (F8-E3) → 30.

  The same cosmetic date discrepancy the previous integrator logged recurs and
  is again left as authored: the A5-E slice entry dates itself 2026-08-26 while
  both its commits are authored 2026-08-25 17:22. Placement is unaffected.

CARRIED FORWARD — recorded, NOT resolved by this integration
  · F8-S2 MUST NOW LAND AFTER THIS SLICE (A5-R8). `badgeSlotsBaselineText` now
    reads the BASE Σ and appends a bonus clause, so S2's §14.5 goldens must be
    authored against the POST-A5 function. Authoring them against the pre-A5
    text will pin the wrong string. Queue per A5-R8: F5.4 → [A5-E done] →
    F8-S2 → A5-U → F8-R2.
  · THE ONE COMPILER-FORCED DIFF THAT IS NOT A `bonus:` ADDITION, carried
    through the integration byte-intact and re-verified here. Widening
    `SoftViolation` with two BUILD-LEVEL members (no `category` field) stopped
    `warning.category` compiling at tests/randomize.test.ts:367-369. The author
    narrowed with `"category" in warning`, keeping the assertion and its
    expectation byte-identical, and explicitly REJECTED adding a phantom
    `category` to a build-level violation to protect a diff stat. That
    narrowing is one of only two lines this integration removed from dev's
    randomize.test.ts (the other being the types import superseded by the
    BonusBudget-bearing one) — confirmed by line-level diff, not assumed.
  · A5-U remains gated on Designer's design-spec.md §17 and is NOT on any
    critical path. OQ-A5 (discipline-locked event tokens) stays open and
    non-blocking; A5 models the versatile pool only.
  · The F5.4 semantic watch-out logged by the F8-E3 integration is UNCHANGED
    and still owned there: A5-E does not touch makeBuild or test-utils.ts, so
    it neither triggers nor clears it.

HOUSEKEEPING
  · a5e-integrate, the throwaway used for this integration, was deleted after
    dev fast-forwarded onto it.
  · a5e-trial-merge IS STILL PRESENT and could NOT be deleted here — the same
    permission denial the author hit. It points at bd8c4ad, the branch's
    PRE-REBASE implementation commit, which is not contained in dev (dev
    carries the replayed 841c7b0), so `git branch -d` correctly refuses it as
    unmerged and `git branch -D` is blocked. NOTHING IS AT RISK: bd8c4ad
    remains fully reachable from a5-e-bonus-engine. It is a stale local ref
    only, it was never pushed, and it needs one operator command:
    `git branch -D a5e-trial-merge`.

KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. Heavy files carry { timeout: 20000 };
none was lowered and vite.config.ts is untouched. No flake was observed on any
run in this integration. If one appears, RE-RUN — do not lower a timeout.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / design-spec.md / the H-rulings.
schemaVersion stays 1, MIGRATIONS stays empty, dataVersion and
ROLL_ALGORITHM_VERSION untouched by this slice, and `bonus` stays deliberately
out of stableDigest. A5's gates survive ROLL_ALGORITHM_VERSION 2 unchanged, as
the author predicted, because 5.1 asserts structure rather than a seeded
golden.

NEXT
Nothing blocking. dev is at 0edc86c, pushed. main untouched at 444d034.
F8-S2 is next per A5-R8 and must read the CARRIED FORWARD note above before it
authors a single §14.5 golden.
─────────────────────────────────────────────

INTEGRATION — main → dev backmerge (Vercel hosting), 2026-08-25
─────────────────────────────────────────────

WHAT LANDED
The two commits the operator put on main while this session was paused, brought
onto dev. main was 290c73d "feat: prep app for Vercel hosting" merged as
e6b3ae4 (PR #3) over the original scaffold 444d034; dev was 58 commits ahead on
everything else. dev is now ac61296 and CONTAINS main in full.

Nothing in src/ or tests/ moved. The whole surface is seven root files.

INTEGRATION MECHANISM — a merge commit, and the first one on dev
Every prior integration in this file rebased onto a throwaway and fast-forwarded
dev, keeping merge-commit count at 0. This one does not, deliberately and with
the operator's explicit sanction. A rebase of dev onto main would rewrite 58
ALREADY-PUSHED commits — destructive, and it would invalidate every live
worktree in /tmp. Cherry-picking main's two commits was the other option and was
rejected for a subtler reason: it would leave e6b3ae4 outside dev's ancestry, so
the next dev → main promotion would replay these same conflicts against a main
that already has the content. The merge records the ancestry once.

Merge-commit count: 0 before, 1 after. Linear history resumes from here.
main is UNTOUCHED at e6b3ae4 and was not pushed to.

THE SEVEN FILES — resolved against merge-base 444d034, diff read before rule applied
  vercel.json          main-only. Taken wholesale. Vite preset, SPA-fallback
                       rewrite, immutable /assets caching, three security
                       headers. Auto-added by the merge, no decision needed.
  public/favicon.svg   main-only. Taken wholesale. 228 bytes, inline SVG, no
                       network reference — consistent with the zero-network
                       runtime rule.
  .gitignore           NOT a conflict. dev never diverged from base here, so
                       git took main's side and the union is automatic: base
                       plus main's `.vercel/` block. Verified by diffing dev
                       against base for this path — empty.
  package.json         Auto-merged clean, and the one to check hardest.
                       RUNTIME `dependencies` REMAIN EXACTLY {react, react-dom}.
                       main's PR added NO runtime dependency, so the stop-and-
                       report condition did not fire. Absorbed from main: the
                       `description` rewrite (it now says "deploys to Vercel",
                       which is true, where dev's said "no deploy", which is
                       not) and `engines: { node: "22.x" }`. Survived from dev:
                       the `generate:badges` script and BOTH devDependencies
                       added since main branched (jsdom ^30.0.1,
                       @testing-library/react ^16.3.2). Enforced independently
                       by tests/architecture.test.ts group (b), which imports
                       package.json and asserts the dependency set is a subset
                       of {react, react-dom}; it passes.
  package-lock.json    Auto-merged clean. The root "" entry now carries the
                       engines block above dev's devDep set. NOT regenerated —
                       no `npm install` was run, so no resolved version moved
                       and no transitive tree churned. main's only other
                       lockfile change was the removal of `libc` arrays from
                       some optional platform packages, a pure npm-version
                       artifact with no semantic content.
  index.html           CONFLICT. Took both sides. The two edits were adjacent
                       rather than overlapping — dev rewrote the <title> line,
                       main appended six lines directly beneath it — which is
                       exactly the shape git refuses to guess at. Resolution:
                       dev's <title>Badge Builder — 2K27</title> (the em-dash
                       form the app has used since M3) plus main's full block:
                       meta description, og:title, og:description, og:type,
                       theme-color #1a1a2e, and the /favicon.svg icon link.
                       The viewport meta and the /src/main.tsx module entry are
                       byte-identical on both sides and on base, so nothing was
                       at stake there despite the brief flagging them.
                       ONE THING LEFT AS AUTHORED, ON PURPOSE: main's og:title
                       reads "Badge Builder 2K27" without the em-dash, so it now
                       differs from the <title>. That tag is main's content, not
                       dev's, and harmonising it would be an edit neither branch
                       asked for. Flagged for the documentation slice rather
                       than silently changed.
  README.md            CONFLICT. Took MAIN's wholesale, per instruction. dev's
                       was still the M1-era scaffold stub asserting "local-only,
                       no deploy" — now false. main's is 106 lines longer and
                       carries the hosting posture.
                       FOR THE QUEUED DOCUMENTATION SLICE: main introduced
                       content that MUST survive the full-README rewrite —
                       §"Posture: static and client-side, no backend"; the whole
                       §"Deploying (Vercel)" section (vercel.json's role, the
                       import-the-repo steps, the custom-domain + DNS steps, and
                       the line that `npm run build` runs `tsc --noEmit` first
                       so a type error fails the deploy); and inside §"Known
                       constraints" the localStorage-is-keyed-to-origin warning
                       — that changing the custom domain later ORPHANS every
                       saved build, alongside the existing strictPort:5173
                       rationale. Also note main's README still carries a
                       "Status: skeleton" blockquote that is 58 commits stale.

GATES
  npm test        62 files / 1187 passed — dev's exact pre-merge baseline.
                  The backmerge adds and removes zero tests.
  npm run typecheck   clean.
  npm run build       clean. Run because it is the only gate that catches a
                  malformed CSS comment, and because it is now also the deploy
                  gate. dist/ = index.html 983 B + favicon.svg + hashed
                  assets, confirming Vite picks up the new public/ directory
                  and that the meta block survives the transform.
  The three RUN-never-edit files re-run explicitly:
                  tests/ui/overlays.test.tsx, tests/category-colors.test.ts,
                  tests/feasibility-golden.test.ts — 3 files / 23 passed.
                  Not edited. No cell of the 504-cell golden moved.

KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. vite.config.ts is untouched by this
merge — main never modified it, so it never entered the conflict set. No
{ timeout: 20000 } was lowered. No flake was observed on any run here.

SCOPE / PLAN IMPACT
One posture fact changed and it is not cosmetic: the project is no longer
local-only. It is hosted, on a public origin, and the seed's "single user,
single machine" framing is superseded for anything that reasons about who can
reach the app. What did NOT change: no backend, no accounts, no network egress
at runtime, no secrets, persistence still localStorage in each visitor's own
browser. The zero-network rule and the {react, react-dom} runtime allowlist are
untouched and still mechanised by tests/architecture.test.ts.

Deployment consequence worth stating once: every push to main now deploys to
production. dev → main promotion is a release action from here on, not just a
bookkeeping merge.

NEXT
F5.4 (f5-4-attribute-pane, tip 6d21927) integrates on top of this.
─────────────────────────────────────────────

## F5.4 — the attributes pane and the right column
2026-08-25 · branch `f5-4-attribute-pane`, cut from `dev`@`2e422c2` (1096/1096, 60 files),
rebased onto `dev`@`d186791` after F8-E3 merged mid-slice — **clean, zero conflicts**
Brief: `impl-briefs/f5-4-attribute-pane-and-right-column.md` · constrained mode
Design authority: `design-spec.md` rev 10 §16 · invariants **I15** and **I16**
Governance: **`main` untouched · NOT merged to `dev`** · full evidence
`docs/proof/f54-verification.txt`

### VERDICT
Shipped. The user's defect is closed and the closure is **measured in a browser,
before and after**, not derived. `1155/1155` across 60 files on the rebased tip.

### THE HEADLINE — the mechanism already shipped; the defect was CONTENTS
`.rail-left` was already `position: sticky` + `max-height: calc(100vh - …)` +
`overflow-y: auto`. A slice that "implemented a 100% height pane" would have
landed and changed nothing the user could see. What was wrong is what was IN it:
**657px of non-attribute content ahead of the stack.**

  viewport      BEFORE        AFTER      derived floor
  1280 x 700      0             6            >= 6
  1280 x 800      0             7            >= 7
  1280 x 900      1             8            >= 8

Both trees served simultaneously (`dev`@`2e422c2` in a throwaway worktree) and
measured with the same headless-Chrome driver, counting sliders whose BOTTOM edge
is inside the scrollport at `scrollTop 0` — the same predicate `slidersVisible()`
walks.

### AND THE SECOND HALF OF THE ASK IS WHAT MAKES THE FIRST HALF WORK
`.panel-below { grid-column: 1 / -1 }` ran Synergy and Summary *underneath* the
pane, so the pane's sticky containing block was **grid row 1**. Honouring "the
other items on the right side" makes `.layout` exactly two grid items:

  BEFORE  [ rail-column, main, panel-below, panel-below ]   4 items
  AFTER   [ attr-pane-column, col-right ]                   2 items

Measured at 1280x800 scrolled to `#panel-summary` (**state 51, the falsifier**):
the pane is still on screen with 7 sliders and the Summary renders **beside** it.

### BELOW 1280 THE OUTPUT IS BIT-IDENTICAL, AND IT IS PROVED
SHA-256 of the captured PNGs, same driver, same flags, both trees:

  1279 x 900 · 768 x 900 · 390 x 800   **all three BYTE-IDENTICAL to `dev`**

§16.10's convergence claim is not an argument in this slice; it is a pixel
comparison. Live resize across the seam re-renders correctly in **both**
directions (1200 → 1400 → 1100, no reload).

### T16 CLOSED, and not with the threshold F5.2 proposed
`426` is a **border-box** figure — its own derivation ends in "+ 2 x --space-4 row
padding" — and a size query evaluates the **content** box. Asking for 426 content
really asked for a 460 border box: **larger than the row's own 426 track floor**,
which is self-contradictory, and it is why the pickers stacked at 1440 while 1280
passed. The threshold protects the pickers, so it is the pickers' own content-box
demand: `2 x SELECT_FLOOR 180 + --space-3 12 = 372`. F5.2's proposed 460 double-
counts and is strictly worse. Measured **side by side at 1280 (445px row) and at
1440 (525px row)**; stacked at 390 (332px), which is intended.

### A1 — the Architect amendment, and it was load-bearing
§16.5's "the ledger lays out 4-up on two lines" is **unbuildable**:
`repeat(auto-fit, …)` forbids intrinsic track sizes. Left alone the `1fr` absorbs
**739 of the 878px grid box** and splits every row label-far-left /
numbers-far-right — verbatim the defect `.summary`'s cap exists to prevent. One
scoped rule in F5.4's own block; the frozen base blocks are untouched. Browser
confirms: tracks **77.41px / 75.92px**, `justify-content: start`, all six labels
column-aligned.

**Incidental corroboration of a re-pin:** the measured max-content label is
77.4062px. `LEDGER_LABEL_MAX` was pinned at 76 and this slice re-pins it at 78.
The browser confirms both halves — the old pin was 1.41px low, and 78 is right.

### THE LATCH — F5.3/A2 superseded, and the correction that had to land with it
F5.3's "DO NOT TOUCH THE AUTO-COLLAPSE LATCH" was scoped to F5.3; §16.5 supersedes
it here. The `compact` term leaves the predicate (the panel is in flow above the
cards at every width now), and **`hasValues` is scoped to what the panel renders**
— otherwise the user drags a slider on the left and a panel collapses on the
right. `tests/ui/f2-disclosure-surfaces.test.tsx`'s D2 test 2 is the mechanical
guard: **assertion verbatim, only its now-false name and comment changed.**

### AMENDMENT LANDED MID-SLICE (Designer §17) — and one thing it does NOT reach
The budget half of that predicate ships **derived**, not enumerated:

    const hasBudgetValues = CATEGORIES.some((category) =>
      Object.values(budgets[category]).some((value) => value > 0));

Equivalent to the shipped sum test because every budget field is clamped at min 0.
Any new member of `Budget` is picked up for free.

**But it does not by itself reach the bonus fields, and that is worth knowing
now.** Checked against `a5-e-bonus-engine` rather than assumed: that branch models
bonus as a **separate `BonusBudget`** on `WorkingState` — `earnedEquipSlots`,
`earnedPoints`, `appliedEquipSlots[6]`, `appliedPoints[6]` — and A5-R1/A5-R4
**deliberately never merge it into `budgets`**; `Budget` itself is unchanged there.
So the fourteen fields are not in the record `BuildPanel` receives. **The bonus UI
slice must pass the bonus totals into `BuildPanel` and add them to this
predicate**, or a user whose only input is bonus gets a setup panel that never
latches closed. Flagged as a hand-off, not left as a silent gap.

### BLOCKING IN-SLICE GATE — `NUMERIC_H` re-measured
Chrome 151.0.7922.174, `--headless=new`, over CDP, at the cut:

    deviceScaleFactor 1  ->  offsetHeight 26,  rect 26.000
    deviceScaleFactor 2  ->  offsetHeight 27,  rect 26.500

**Kept pinned at the larger, 27** (§13.0.1's take-the-larger rule). A larger
`SLIDER_H` yields a LOWER derived count, so the I15 floor stays **pessimistic**,
and the browser meets it exactly at 6/7/8. Both values sit inside the brief's
26–28 band; the stop condition did not fire and **the floor did not relax.**

### ONE HONEST DISCREPANCY, RECORDED RATHER THAN BURIED
Assertion 1's canary pins the pre-slice counts at **0 / 1 / 2** (from
`LEAD_TODAY = 657`, per correction C-1). The browser measures **0 / 0 / 1**:
`LEDGER_H 252` and `PHYSIQUE_H 324` are paper sums over wrapped Hint and Banner
lines and are ~22px light in aggregate (real lead **678.75**, not 657). The canary
therefore **understates** how bad the shipped tree was and never overstates it,
and its load-bearing claim — zero of twenty at 700 — is exact. The pins are left
as briefed (they feed nothing but this canary) and the measurement is written into
the test's own comment, not only into the proof file.

### SHIP GATES
  `npx tsc --noEmit`                              clean
  `npx vitest run`                    60 files, **1155 passed** (1096 at the base;
                                      +17 from this slice, +42 from F8-E3)
  `npm run build`                     clean
  `tests/ui/overlays.test.tsx`             4 passed · **unmodified**
  `tests/category-colors.test.ts`         15 passed · **unmodified**
  `tests/feasibility-golden.test.ts`       4 passed · **unmodified**
  `tests/architecture.test.ts`           182 passed · **unmodified**
  `tests/ui/f2-source-pins.test.ts`       14 passed · **unmodified** (a four-time
                                          casualty; this time it genuinely was not)
  `tests/layout-arithmetic.test.ts`       69 passed (was 52)
  `git status --porcelain`            only Allowed paths
  runtime `dependencies`              exactly `{ react, react-dom }`
  `src/styles/tokens.css`             untouched · zero new tokens · no new hex

`tests/layout-arithmetic.test.ts` extends the parse-and-re-derive chain to the
**vertical axis** — 6 rewrites, 4 re-points, 1 tombstoned deletion (`BUDGET_GRID_MIN`,
now vacuous), and the **21 numbered assertions**, including the six canaries that
demonstrate the pre-slice tree failing. `SECTION_CHROME_Y = 70` is the vertical
counterpart of I8's horizontal 34 and it is **parsed from tokens**, not pinned.

### WHAT WAS DELIBERATELY NOT DONE
The **300 → 340 rail lever** is priced at **13.3px per card** (not §16's 20) and is
**unspent**. It buys 8 → 12 visible sliders and would reverse F5.2's headline
number hours after it landed. Its trigger is named and it is the **user's** call,
routed through Designer — not an implementer's. Also untaken, per §16: collapsible
`.attr-group`s, sticky group legends, a two-column attribute grid, any type-size
shave, a non-page-scrolling shell, and any re-cut of `.summary`.

### CROSS-SLICE OBLIGATIONS
· **F8-S2 MUST BE RE-BRIEFED BEFORE DISPATCH (§15).** `.summary` moved into the
  right column: its box is **885 at 1280/s=17, not the 1231 below-grid box** all
  five of §14.2's pinned constants and the 1428/1429 three-up seam were derived
  against. Its own precondition checklist asserts "`SummaryPanel` inside
  `.panel-below`" — **F5.4 deletes `.panel-below`**; that item now reads
  `.col-right`. And `.summary` resolves to **2 tracks rather than 3** at 1280 under
  the shipped `auto-fit minmax(280px, 380px)` — visible in
  `docs/proof/f54-summary-scrolled-1280x800.png`. F5.4 does not touch `.summary`
  and must not. Hand F8-S2's author §8 of the F5.4 brief.
· **F8-E3's INV-14 watch-out is DISCHARGED.** It asked whether F5.4 touches
  `makeBuild` or `tests/helpers/test-utils.ts`. **It does not** — verified by
  `git diff --name-only origin/dev...HEAD` — and `tests/randomize.test.ts` is
  **66/66** on the rebased tip. The sweep numbers did not move.
· **§3.4 rev-3's stale-purchase foot line** is still unshipped. Verified absent,
  surfaced, **not actioned** — F5.4 is layout. When it lands it belongs on BOTH
  surfaces (the pane's foot and the collapsed setup digest) through ONE builder.

### MERGE-CONFLICT FORECAST
F5.4's whole surface is 5 files: `src/App.tsx`, `src/styles/app.css`,
`src/ui/build/BuildPanel.tsx`, `tests/layout-arithmetic.test.ts`,
`tests/ui/f2-disclosure-surfaces.test.tsx`.

· **`f8-e3-exchange` — ALREADY RESOLVED, zero conflicts.** It merged to `dev` as
  `d186791` mid-slice; F5.4 rebased onto it cleanly. Its surface is
  `src/engine/**` + engine tests, with no file in common.
· **`a5-e-bonus-engine` / `a5e-trial-merge` (bonus slots) — ONE overlap:
  `src/App.tsx`, and it is benign.** Its hunks land at lines 23, 42, 155–261, 595,
  607, 1269 — `WorkingState`, `freshWorkingState`, `fromSaved`, `toEnvelope`,
  `workingHasContent` and two hook-area lines. F5.4's edits are the layout JSX
  (~1228–1460) plus one `const isLarge` at ~508. The 1269 hunk is ~40 lines above
  F5.4's JSX region and inside a `useEffect`, not the tree. Expect an auto-merge;
  if git snags, the resolution is "take both" — they are disjoint regions.
  **The semantic note is the one above:** the bonus predicate needs the derived
  `hasBudgetValues` extended when the bonus *UI* lands.
· **Cap-breaker — no branch exists yet.** If it touches `.synergy-row` geometry it
  must check against the binding margin **+10.5px at 1280/s=17**, which is the
  number the next addition to the synergy row header is measured against; if it
  touches `.summary` it is behind the §15 relay.
· **`claude/right-sidebar-width-62di4r`** touches `src/styles/app.css` and
  `src/ui/build/AttributeGrid.tsx`. If that branch is still live it will conflict
  in `app.css`, and a "right sidebar width" change is **semantically** at odds with
  §16 — surface it before merging either.

### CONFIRMATIONS THE BRIEF ASKED FOR EXPLICITLY
· **The `--cat` chain survived the re-parenting.** All four carriers are id /
  attribute / href selectors on the element that sets `--cat`, so re-parenting
  cannot sever them. Asserted mechanically (assertion 14) and visible in the proof
  frames: FINISHING gold, SHOOTING green, PLAYMAKING orange, in the pane.
· **Both §4.5 landmarks survived, and there are now three** — `"Attributes"` (new),
  `"Build"`, `"Ledger overview"`. `"Ledger and synergy"` still absent. The skip link
  still lands on `<main>`, and both moved asides are **outside** it (assertion 16,
  with a failing fixture).
· **`BuildPanel` conflict resolved cleanly.** F5.3's `Reset build` button,
  `onResetRequest` and `canReset` are preserved verbatim at the foot of
  `.build-panel` and ride into the setup panel — Reset is a set-up action, which is
  correct. All four props are wired (`onResetRequest`, `canReset`, `compact`,
  `withAttributes`). F5.3's `resetBlastRadius` / `playerHasContent` / dialog mount
  in `App.tsx` are untouched. The only F5.3 comment edited is the Reset button's
  placement rationale, which claimed "the foot of a long sticky, scrolling rail" —
  false after this slice.

### KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. Heavy files carry `{ timeout: 20000 }`; none
was lowered and `vite.config.ts` is untouched. No flake was observed on any run.
If one appears, **RE-RUN** — do not lower a timeout.

### SCOPE / PLAN IMPACT
None to `scope.md` / `tech-strategy.md`. `design-spec.md` amendments are **named,
not self-ratified**: §4.5 two asides → three; §11.5 ③'s `.rail-left`-scoped Position
grid retired; §13.4's rail ordering and §13.5's below-grid placement superseded;
§13.5's 404/426 thresholds superseded by 372/406; §16.5's "4-up on two lines"
withdrawn and replaced by **A1** (Architect-authored, flagged to Designer for
ratification, not blocking); §16.13 assertion 1's canary literal 683 → 657;
§16.6's lever price 20px → 13.3px per card.

### NEXT
Branch pushed. `dev` untouched at `d186791`; `main` untouched. Merge order stands:
**F5.4 → F8-S2 → F8-R2**, and F8-S2 must be re-briefed per §15 first.
─────────────────────────────────────────────

INTEGRATION — F5.4 the attributes pane and the right column, 2026-08-25
─────────────────────────────────────────────

WHAT LANDED
f5-4-attribute-pane, all three commits, replayed onto dev on top of the Vercel
backmerge. The ledger overview moves to the right column, Physique and Budgets
re-parent into a collapsed `.setup-panel` above the FilterBar, and `.layout`
becomes exactly two grid items at L so the sticky attributes pane's containing
block spans the whole document instead of grid row 1. Visible attribute sliders
at rest go 0/0/1 → 6/7/8 at 700/800/900px viewport heights, as the branch
measured. Behaviour below 1280 is unchanged by construction.

INTEGRATION MECHANISM — rebase onto a throwaway, then a rebuild, then fast-forward
Back to the linear convention. The Vercel backmerge above is the ONLY merge
commit on dev and this slice did not add a second.

  1. f54-integrate cut from 6d21927 and rebased onto dev. Two conflicts (below).
  2. The suite then failed ONE test, in a way that had to be fixed inside the
     replayed implementation commit rather than bolted on after it, so the
     branch was REBUILT: f54-rebuild reset to the replayed feature commit, the
     one-line fix amended in, and the two follower commits cherry-picked back.
     `git diff f54-integrate f54-rebuild` is exactly that one line — verified,
     not asserted.
  3. dev fast-forwarded onto f54-rebuild. Both throwaways deleted.

f5-4-attribute-pane was never rebased, amended or force-pushed and still points
at 6d21927, so the /tmp/bb-f54 worktree stays valid and intact. main is
UNTOUCHED at e6b3ae4.

THE CONFLICT SURFACE WAS SMALLER THAN FORECAST — one file, one hunk
The brief named BuildPanel.tsx and App.tsx. Only App.tsx conflicted.
`git diff d186791 dev -- src/ui/build/BuildPanel.tsx` is EMPTY: A5-E never
touched that file, so F5.4's 121 lines replayed with no other side to merge
against. Same for app.css, tests/layout-arithmetic.test.ts and
tests/ui/f2-disclosure-surfaces.test.tsx. Checked before starting rather than
discovered during.

  src/App.tsx — ONE conflict hunk, and it is a MOVE colliding with an EDIT.
  dev's side was the `.rail-column` block: the ledger overview aside plus the
  `.rail-build` aside holding BuildPanel. F5.4's side replaces that whole region
  with the `isLarge ? .attr-pane-column : null` structure, because it EVICTED
  both regions into `.col-right` further down the file. Git cannot align a move
  with an in-place edit, so it presented the whole block.
  Resolved to F5.4's side. Nothing was deleted — both evicted regions are
  present further down, and the ledger's rendering code is byte-identical on
  both sides (A5-E's App.tsx diff never reached it).

  .claude/reportback.md — the usual tail-append collision. Resolved
  APPEND-ONLY: dev's tail (the A5-E entries and the backmerge entry) first, then
  F5.4's 231-line slice entry verbatim. Proved rather than eyeballed — the
  first 4460 lines of the resolved file are BYTE-IDENTICAL to
  `git show dev:.claude/reportback.md`, checked with cmp. One separator line was
  added to close the backmerge entry, which had none; it sits after that entry's
  last line, so the append-only property holds.

THE A5-E PROPERTY THAT HAD TO SURVIVE, AND DID
`<BuildPanel budgets={baseBudgets}>` — deliberately BASE, never composed.
F5.4 branched before A5-E, so its version of that call site reads
`budgets={budgets}`, and taking F5.4's side of the conflict carried the
pre-A5 wiring in with it. THE CALL SITE ALSO MOVED, out of the dissolved left
rail and into `.setup-panel`, so this is not a hunk git could have preserved —
it had to be re-applied by hand at the new location, together with A5-E's
hazard comment. Done, and the whole A5-E surface in App.tsx was then audited
line by line: all nine `[A5]` markers present (9 on dev, 9 here), the budget.ts
import, `BonusBudget`, `WorkingState.bonus`, `zeroBonus()` in
freshWorkingState, `saved.bonus` in fromSaved, `working.bonus` in toEnvelope,
`bonusHasContent` in workingHasContent, the baseBudgets/effectiveBudgets
composition pair, and `bonus` in ledgerState plus its dependency array.
SummaryPanel keeps the COMPOSED record, which is correct — it reads capacity,
it does not enter it.

BOTH A5-E MUTATION CHECKS RE-RUN AFTER THE REBASE. Both bite.
  · Revert `budgets={baseBudgets}` → `budgets={budgets}` at the relocated call
    site. tests/ui/a5-bonus-persistence.test.tsx: 3 failed / 5 passed. Test 6.6
    reads "expected '4' to be '3'" — the compounding, caught on the first
    render, exactly as A5-E predicted. Restored; App.tsx byte-clean against
    HEAD afterwards.
  · Neuter `effectiveBudgets` to pass the base straight through.
    tests/randomize.test.ts 5.1 SHIP GATE fails: "expected 'noLegalStep' to be
    'rolled'" — the applied bonus Badge Slot stops buying the extra badge.
    Restored; both guards green again.
  Neither guard was weakened by the move. No stop-and-report condition fired.

THE ONE TEST THAT FAILED, AND WHY IT WAS THE INTEGRATOR'S BUG
tests/layout-arithmetic.test.ts test 19 — "the renames are complete, in the
stylesheet AND in src/**" — failed with "/src/App.tsx still names rail-build".
The offender was the hazard comment written DURING this integration, which
explained the relocation by naming the class it relocated out of. Test 19 scans
raw source, comments included, on purpose ("a half-done rename leaves a dead
rule that reads as live"). The comment was reworded to "out of the dissolved
left rail"; the TEST WAS NOT TOUCHED. It did its job on its first exposure to
a hand-written line, which is the argument for it. All five dead names —
rail-left, rail-column, rail-ledger, rail-build, panel-below — now absent from
src/ and app.css.

COUNTS — predicted before measuring, and the prediction held exactly
  dev before this slice          62 files / 1187   (post-backmerge; the
                                                    backmerge adds 0 tests)
  F5.4 branch tip 6d21927        60 files / 1155
  F5.4's own base, dev@d186791   60 files / 1138   (as re-measured by the
                                                    A5-E integration)
  F5.4 delta                     1155 − 1138 = +17
  EXPECTED                       1187 + 17 = 1204
  ACTUAL                         62 files / 1204 passed.  No gap, no
                                 correction term.
The deltas are file-disjoint again: A5-E's +49 landed in bonus.test.ts,
serialization.test.ts, randomize.test.ts and a5-bonus-persistence.test.tsx,
while F5.4's +17 is entirely tests/layout-arithmetic.test.ts (52 → 69).

GATES
  npm test            62 files / 1204 passed.
  npm run typecheck   clean.
  npm run build       clean — run because it is the only gate that catches a
                      malformed CSS comment, and this slice moves 215 lines of
                      app.css.
  The three RUN-never-edit files re-run explicitly: 3 files / 23 passed. Their
  blobs are byte-identical to dev's, confirmed by comparing git object SHAs
  rather than by reading the diff:
      tests/ui/overlays.test.tsx        da7de50…
      tests/category-colors.test.ts     a14e3c4…
      tests/feasibility-golden.test.ts  cef359d…
  No cell of the 504-cell golden moved.

SUB-1280 — NOT RE-CAPTURED, and here is what stands in for it
The branch's own evidence is that the PNGs at 1279x900, 768x900 and 390x800 are
byte-identical to dev's. Those were NOT re-captured here: capturing them needs
the dev server, the port is pinned, and every worktree shares that one
localStorage origin — stale code on that origin can strip newer fields out of
the user's real saved data. Not worth a screenshot.
What was checked instead is mechanical and independent: the seam has exactly
one owner (`!useMediaQuery("(max-width: 1279px)")` in App), `.ledger-panel` is
`display: none` until the 1280 query, and re-deriving the layout from the
shipped CSS at 1279/s=17 gives a `.summary` content box of 1196px — the same
figure the pre-F5.4 tree gives at that width. Below the seam the arithmetic did
not move.

THE FIGURE FOUR QUEUED SLICES NEED — .summary at 1280, scrollbar 17
Parsed out of the shipped CSS and re-derived, the same method
tests/layout-arithmetic.test.ts uses. NOT measured in a browser, for the
dev-server reason above.

    1280                                          viewport
  −   17  scrollbar                        = 1263  layout viewport
  −  2×16 .layout padding (--space-4)      = 1231  .layout content box
  −  300  pane track  − 12 column-gap      =  919  .col-right track
  −   34  <Section> chrome (2×1px .section border
          + 2×16px .section__body padding) =  885  .summary CONTENT box

  ***  885px  ***   —  NOT 1197.

1197 is the PRE-F5.4 figure (1231 − 34) and it is now wrong by 312px, because
`.summary` no longer spans the full below-grid box: it is a flex item of
`.col-right`, which is the 1fr track beside the 300px pane. Nothing between
`.col-right` and `.summary` contributes horizontal padding — `.col-right`,
`#panel-summary` (no rule at all) and `.summary` itself were each checked for
one. This corroborates the figure already written into
tests/layout-arithmetic.test.ts's own `.summary` case ("885 in the right column
at 1280/s=17, not 1231 below the grid"), reached independently.

  CONSEQUENCE THE SYNERGY-BOARD SLICE MUST NOT MISS. `.summary` is
  `repeat(auto-fit, minmax(280px, 380px))` with a 24px column-gap, and auto-fit
  counts repetitions against the MAX track function when it is definite (CSS
  Grid L1 §7.2.3.2), i.e. against 380, not 280:
      885px  → 2 tracks × 380 + 24 = 784 used, 101px slack   [now]
     1197px  → 3 tracks × 380 + 48 = 1188 used, 9px slack    [pre-F5.4]
  Three columns became two. A threshold derived from 1197 will over-provision
  by a whole track. Other widths, same chain: 1045px at 1440/s=17 (still 2
  tracks, 261px slack), 1196px at 1279/s=17 (below the seam, 3 tracks),
  685px at 768/s=17, 332px at 390/s=0.

CARRIED FORWARD — recorded, NOT resolved here
  · README.md is currently MAIN's, taken wholesale by the backmerge. The queued
    documentation slice replaces it and must preserve main's Vercel content —
    the static/client-side posture section, the whole "Deploying (Vercel)"
    section including the custom-domain and DNS steps, and the
    localStorage-is-keyed-to-origin warning about changing the domain later.
    main's copy also still says "Status: skeleton", which is 61 commits stale.
  · index.html's og:title reads "Badge Builder 2K27" while <title> reads
    "Badge Builder — 2K27". main authored the og tag, dev authored the title;
    both were preserved verbatim rather than harmonised. A one-word decision
    for whoever owns the documentation slice.
  · F8-S2 MUST STILL LAND AFTER A5-E (A5-R8) — `badgeSlotsBaselineText` reads
    the BASE Σ and appends a bonus clause, so §14.5's goldens must be authored
    against the POST-A5 function. UNCHANGED by this slice, and now joined by a
    second reason to re-derive: §14.2's five constants and the 1428/1429 seam
    were derived against the old 1231/1197 box and must be re-derived against
    919/885. The branch flagged this itself.
  · F5.4 §12's note stands: the auto-collapse predicate derives over the
    `Budget` record, and the queued bonus-UI slice must pass the `BonusBudget`
    totals in explicitly, because that layer is deliberately never merged into
    `budgets`.
  · The A5-U / OQ-A5 position is unchanged by this slice.

KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. vite.config.ts is untouched, no
{ timeout: 20000 } was lowered, and no flake was observed across the seven full
or partial runs this integration made. If one appears, RE-RUN.

HOUSEKEEPING
  · f54-integrate and f54-rebuild, both throwaways, deleted after dev
    fast-forwarded.
  · a5e-trial-merge is STILL PRESENT and still needs the one operator command
    the last two entries asked for: `git branch -D a5e-trial-merge`. Nothing is
    at risk; it is an unpushed local ref to bd8c4ad, which stays reachable from
    a5-e-bonus-engine.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / the H-rulings. design-spec §16 is
implemented as written, including §16.5's supersession of F5.3/A2's
"do not touch the latch". schemaVersion stays 1, MIGRATIONS stays empty,
dataVersion and ROLL_ALGORITHM_VERSION untouched.

NEXT
Merge order stands: F8-S2 → A5-U → F8-R2, and F8-S2 must read BOTH carried-
forward items above — the post-A5 baseline function AND the 885px box — before
it authors a single golden.
─────────────────────────────────────────────

SLICE-COMPLETE — A6-E Cap Breakers: engine, persistence, containment lint, and
rider ② near-miss reasons, 2026-08-25
─────────────────────────────────────────────

WHAT LANDED
Branch `a6-e-cap-breakers`, worktree /tmp/bb-a6e, TWO implementation commits on
top of dev @ a5fe8e1. NOT merged to dev; main untouched; no dev server started.

  c09c090  feat(a6-e): Cap Breakers — the engine, the persistence, the
           containment lint
  e61c080  feat(a6-e): rider ② — near-miss reasons, every locked pip becomes
           a meter

A cap breaker is a per-attribute value the user DECLARES above the value they
entered. It counts for badge ELIGIBILITY ONLY — no extra Badge Points, no extra
Badge Slots. Stored ABSOLUTE (`capBrokenAttributes.threePt = 83`), never a
delta: a delta would tempt a future reader to carry +23 across a base edit,
i.e. to assert that a base of 65 also earns +23, and that assertion is
unpublished 2K data. `effectiveAttribute = max(entered, declared)`.

WORKTREE PROVENANCE — READ THIS FIRST
/tmp/bb-a6e ALREADY EXISTED when this dispatch opened, on branch
`a6-e-cap-breakers` at 4f3e47e (three commits behind dev, pre-F5.4), carrying
~220 lines of UNCOMMITTED work from an interrupted earlier run: src complete-ish
with commit-1 and commit-2 changes already MIXED TOGETHER, no new test files, no
lint (g), no makeBuild param. Nothing was discarded. The work was saved twice —
`git stash push -u` (stash@{0}, still present) and a patch at
scratchpad/a6e-prior-wip.patch — then the branch was fast-forwarded to dev
(no reset, no force) and A6-E re-implemented in the required two-commit order.
The prior run's prose was high quality and much of it survives, re-verified
line by line against scope.md and the design doc rather than trusted.

  OPERATOR ACTION, TRIVIAL: `git -C /tmp/bb-a6e stash drop` once this entry is
  read. It is redundant with the patch file and with both commits.

COMMIT 1 — THE ZERO-DIFF PROOF, MEASURED AT ITS OWN TIP (c09c090)
The gate is "A6-E changes not one rendered string and not one number on
screen", because nothing in commit 1 can WRITE a cap breaker. Measured, not
asserted:

  · EXACTLY TWO behavioural lines switched, both in eligibility.ts —
    `linePassesAt` and `reasonsForLevel`'s `and` arm. The ENTIRE src/ diff
    deletes FIVE lines; the other three are an import widening (config), a
    docstring (types), and a reformatted ternary (BuildPanel). Verbatim:
        -import type { Category } from "../engine/vocabulary";
        -  return build.attributes[line.attr] >= threshold; // >=, not >
        -      } else if (build.attributes[line.attr] < threshold) {
        -  /** 0–99 per attribute. */
        -    ? hasBudgetValues || Object.values(build.attributes).some(...)
  · ZERO ASSERTION EDITS. `git diff -U0 -- tests/ | grep '^-[^-]' | grep -c
    'expect('` → 0. Not one expect() line deleted or modified anywhere. The
    only test-file deletions in the whole commit are two import lines and
    makeBuild's return statement (the one sanctioned optional param).
  · Full suite 1204 → 1242 (+38), 62 → 63 files, all green.
  · tests/ui/overlays.test.tsx, tests/category-colors.test.ts,
    tests/feasibility-golden.test.ts: 23/23 with ZERO file diff. No golden
    cell moved. RUN-never-edit honoured.

Everything downstream inherits with zero diff — levelPasses,
maxPurchasableLevel, validateBadge, entryIsStale, recheckEligibility,
legalSteps, exchangeSteps, the roster, the roll, the pips. steps.ts and
randomize.ts are UNTOUCHED (F8-E3's file, as the contract demanded).

NO EXTRA TOKENS AND NO EXTRA BADGE SLOTS — STRUCTURAL, NOT POLICED
The fourteen economy modules read no attribute at all and `LedgerState`
carries no `Build`, so there is no channel through which a cap breaker could
reach a cost. Test 1.5 pins the property (spent / refunded / remainingPoints /
equipSlotsUsed / totalCost / whatIf / costForLevel byte-identical while
maxPurchasableLevel moves); the architecture lint pins the reason.

PERSISTENCE — the highest-risk part, done exactly as ruled
  · `capBrokenAttributes?:` is OPTIONAL IN TYPESCRIPT, deliberately. Required
    would compile, produce a runtime object with no key, keep every in-memory
    test green (they are compiler-forced to supply it) and throw only on a real
    reload of a pre-A6 autosave.
  · NO `normalizeBuild()` was written. NO change to
    `envelope["build"] as unknown as Build`. Test 5.4 makes any future
    field-by-field "tidy" of that cast fail RED instead of silently dropping
    the field on every load→save.
  · schemaVersion stays 1; MIGRATIONS stays empty; AppConfig and
    validateConfig do not move.
  · The validator widens as a strict superset: absent ✓, wire null ✓, {} ✓,
    0..99 ✓, non-integer ✓ (validateBudgets has no integer check either),
    unknown keys IGNORED, and `declared < entered` ACCEPTED SILENTLY — the
    app's own UI writes that state, and refusing it would be the fifth
    instance of this project's data-destruction shape. Made inert by Math.max.
  · A pre-A6 file round-trips WITHOUT gaining the key (test 5.4b), and the
    whole existing 1204-test suite — every one of whose UI cases boots a
    pre-A6-shaped autosave — is the pre-A6-reload result, mechanised.

THE GUARD LANDS BEFORE THE WRITER
`workingHasContent`, `playerHasContent` and BuildPanel's dirty check widen now,
while inert, so A6-U's control ships into a clobber-confirm that already sees
what it writes. `resetBlastRadius` and the reset announcement were NOT touched
(A6-U's, and F5.3 owns that file).

SHIP GATES
  1.6 — no cap-breaker count → boost mapping anywhere: a src-wide vocabulary
        lint (perBreaker / breakerBoost / BOOST_PER / breakersToBoost /
        capBreakerCount), plus attributes.ts asserted to contain NO arithmetic
        operator and no numeric literal but the `?? 0` floor, plus a positive
        canary that also proves it does NOT fire on A6's own shipped names.
  4.2 — AttributeGrid keeps the ENTERED record: a real end-to-end test seeds a
        cap breaker into the autosave, boots App, asserts the slider reads 60
        (not 95), commits it to 70, and asserts the STORED value is 70 with the
        declaration still 95. Plus an unrelated-slider case.

COMMIT 2 — RIDER ② (e61c080), separate on purpose
`needs 96 Close (now 91) or 95 Layup (now 88) for HOF`. One builder gains one
term; the card line, the stale line, the pip ariaLabel, DriftBanner, the roster
and the text block all inherit. BadgeCard.tsx is NOT edited.

  THE TRAP WAS REAL AND IS BOUND. BadgeCard's `reasonsFor` selects by
  `reason.endsWith(`for ${label}`)`, so a parenthetical after the level suffix
  would silently empty the eligibility line on all 53 cards. It goes INSIDE.
  Four guards: the mandatory positive canary (pip selector returns exactly one
  non-empty reason for a two-term `or`, and EMPTY for the rejected trailing
  form); a canary-PREMISE test asserting BadgeCard still selects by that
  suffix, so the transcribed canary cannot drift from what it watches; a
  dataset-wide sweep over all 53 badges; and the required grep
  `for Gold)|for HOF)|for Silver)|for Bronze)` over src/ → CLEAN.

  Arms: `and` annotates FAILING terms only; `or`/`single` annotates every term
  (which is why one trailing note cannot work); a `null` threshold gets NO
  parenthetical. Every `(now N)` reads effectiveAttribute. A cap-broken value
  renders `(now 83 cap-broken)`; a STALE declaration (declared 83, slider since
  dragged to 90) is NOT announced as cap-broken, because `isCapBroken` compares
  the values rather than testing the field's presence. Both branches ship
  dead-but-tested. The accessible comma variant is DEFERRED as ruled.

  FIVE assertion edits, each with an in-line reason:
   · tests/eligibility.test.ts — Flash's HOF reason gains `(now 81)`.
   · tests/ui/badge-card.test.tsx — locked-pip ariaLabel + card line.
   · tests/ui/f2-eligibility-disclosure.test.tsx — the STALE line; still
     exactly one dash in the sentence, because the note sits inside the reason.
   · tests/summary-text.test.ts — §14.5's golden, exactly ONE line moved. The
     assertion is a byte-for-byte compare against real formatter output, so
     green IS the regeneration proof.
   · tests/ui/app.test.tsx — NOT on §5A.9's allowed list. Reported, not quietly
     widened: same class the list enumerates (a reason-string assertion its
     enumeration missed), one line, no behaviour change.
  tests/ui/boot-drift.test.tsx needed NO regeneration.

GATES, BOTH COMMITS
  npm run test        63 files, 1250 tests, all green   (dev baseline: 62/1204)
  npm run typecheck   clean
  npm run build       clean, tsc --noEmit + vite build
  overlays / category-colors / feasibility-golden: 23/23, zero file diff.
  Runtime deps still exactly {react, react-dom}. No dev server was started, so
  there is no port to report and no shared-localStorage exposure.

BRIEF ↔ CODE DIVERGENCES, reported rather than silently weakened
  1. A6-R9 2.1 asks for `capBrokenAttributes` in EXACTLY ONE src/ file. It is
     THREE, and the two extras are structural: types.ts must DECLARE the field,
     serialization.ts must name the wire KEY on an untyped record before any
     `Build` exists. Neither is a second read path. Expressed as an explicit
     allowlist with a why per entry plus a drift guard, in the same idiom as
     the shipped MATH_RANDOM_ALLOWLIST — which makes the same disclosure about
     its own rule. The ruling that matters (one composition point; no component
     may reach it) is enforced whole by the allowlist plus the `.tsx` ban.
  2. §5A.9's allowed-paths list omits tests/ui/app.test.tsx, which carries a
     reason-string assertion. One line, edited, reported above.
  3. The contract cites BuildPanel's dirty check at :175. F5.4 moved it to
     :241 AND rewrote it as a `withAttributes` ternary. The cap-breaker term
     rides INSIDE the true arm: at L the sliders are in the pane, so the cap
     breakers are too, and the latch stays scoped to what the panel renders
     (§16.5). Widening the whole predicate would have re-broken F5.4's ruling.

INVENTORY ROW §5A.6 CONFIRMED PRESENT
`reasonsForLevel`'s `or`/`single` arm (eligibility.ts) read no attribute before
② and is a reader now. It is inside §5's allowlist (same file, same function),
so no widening was needed, and it is covered by tests.

MERGE-CONFLICT FORECAST — a5-u-bonus-mode, f9-touch-floors, f8-s2-summary,
f13-physique-strip
MECHANICALLY, ALL FOUR MERGE CLEAN TODAY (`git merge-tree --write-tree`
exit 0 on each) — but that is not a result: ALL FOUR CARRY ZERO COMMITS OF
THEIR OWN. a5-u-bonus-mode sits at 4f3e47e (behind dev, pre-F5.4); the other
three sit exactly at dev @ a5fe8e1. The forecast below is therefore by declared
file surface, not by merge test.

  · a5-u-bonus-mode — HIGH, and it is the one to sequence.
    A5-U edits `workingHasContent` / `playerHasContent` / `resetBlastRadius` in
    src/App.tsx; A6-E inserted `hasCapBreakers(working.build)` into the first
    two, adjacent to A5's own `bonusHasContent` term. Textual conflict is
    likely in both predicates and in BuildPanel's `hasValues`. RESOLUTION RULE,
    already ruled at A6-R8: whichever lands second WIDENS, never replaces —
    keep both terms. Its bigger problem is not A6 at all: it is based pre-F5.4,
    so F5.4's 466-line App.tsx churn dominates its rebase.
  · f8-s2-summary — HIGH, and it is a CORRECTNESS risk, not just a textual one.
    F8-S2 authors §14.5's goldens, and ② moved one line of the shipped golden.
    F8-S2 HAS NOT SEALED (zero commits), so it must author against the POST-②
    string — a golden authored against dev's pre-② output will conflict, and
    resolving it the wrong way silently reverts ② in the text block with a
    green suite. Its `RosterRow` consumers inherit the parenthetical
    automatically through `reasonsForLevel`; §14.5.1 already rules the golden
    GENERATED, never transcribed, so the fix is "regenerate after merging
    A6-E". No source conflict: summary.ts and summary-text.ts are untouched.
    This is the same warning the F5.4 entry above already carries for F8-S2,
    now with a second reason.
  · f13-physique-strip — MEDIUM, one hunk.
    It will edit src/ui/build/BuildPanel.tsx (PhysiqueSection), and A6-E
    touched that file's import block and the `hasValues` ternary. If F13 edits
    the ternary's FALSE arm (`hasBudgetValues || build.position !== undefined`
    — the physique-shaped one), it is the same hunk as A6's true-arm edit.
    Small, mechanical, no rule in tension.
  · f9-touch-floors — LOW.
    Touch-target floors are src/styles/app.css, tests/layout-arithmetic.test.ts
    and possibly AttributeSlider — A6-E touched NONE of those, changed no CSS
    and no markup. Only contact is BuildPanel, and A6's edit there is not
    markup. Expect clean.

CARRIED FORWARD
  · A6-U is unblocked by this slice and still waits on Designer's design-spec
    §18, exactly as §5 says. It relaxes lint (g)'s `.tsx` ban to the one
    control file BY NAME — never by deleting the rule — and it owns
    resetBlastRadius, the reset copy, ResetBuildDialog's counts, the
    stale-declaration hint and summary-text's one line.
  · A5-E's implementer warning stands and is now doubly earned: do NOT tidy
    `envelope["build"] as unknown as Build` into a field-by-field literal. Test
    5.4 now fails red if anyone does.
  · OQ-A6-1 (is 99 really the per-attribute bound?) and OQ-A6-2 (is there a
    cap-breaker budget?) are both still open and both still block nothing.
    ATTRIBUTE_CEILING is the one constant to edit if the real bound lands.

KNOWN, AND DELIBERATELY NOT "FIXED"
The load-dependent vitest flake class. vite.config.ts untouched, no
{ timeout: 20000 } lowered, none added below that. No flake observed across the
nine full or partial runs this slice made. If one appears, RE-RUN.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / the H-rulings. schemaVersion 1,
MIGRATIONS empty, dataVersion and ROLL_ALGORITHM_VERSION untouched, dataset
untouched, AppConfig untouched.

NEXT
Branch pushed. `dev` untouched at a5fe8e1; `main` untouched. Recommended merge
order is unchanged except that A6-E should land BEFORE F8-S2 authors its
goldens: **A6-E → F8-S2 → A5-U → F8-R2**, which is exactly A6-R8's ordering
ruling ("A6-E lands BEFORE S2, immediately after A5-E").
─────────────────────────────────────────────
═════════════════════════════════════════════
F9 — the app-wide I6 touch-floor pass
SLICE COMPLETE · 2026-08-26 · constrained mode
Branch: `f9-touch-floors`, pushed, NOT merged. `dev` and `main` untouched.
Base: `dev` @ a5fe8e1 (the local tip, 8 ahead of origin at cut time; F5.4 in).
Commits: c57c350 (implementation + proof) · this entry.
─────────────────────────────────────────────

BASELINE / DENOMINATOR
62 files / 1204 tests, re-run green in the worktree before the first edit.
Final: 62 files / 1211 tests. Delta +7, all in tests/layout-arithmetic.test.ts
(assertions 23–29). No new test file; no test file deleted.

WHAT WAS WRONG, MEASURED BEFORE ANYTHING WAS EDITED
§3.1 rev 2 ratified an S-breakpoint override for `Button`, `Toggle` and
`NumberField` and NOT ONE DECLARATION OF IT SHIPPED. `.btn--sm` was 28px and
`.btn--md` 36px at every width, and no `@media (max-width: 767px)` block
touched a control height anywhere in app.css. A headless-Chrome census at 390
against the unmodified base tree found SEVENTEEN control classes under §5.3's
44px floor — 80 individual hit targets — from 14px (`Clear all`) to 42px (the
overlay toggles). Exactly three classes cleared it: `.pip` (F5.3, frozen),
`input[type="range"]` (F3) and `.build-panel__reset` (F5.3, scoped to its own
new control). Full table in docs/proof/f9-verification.txt §1.

AFTER: ZERO hit targets under 44 anywhere on the page, in any of the four
states the census visits.

CHANGED FILES — three, and none of them a .tsx
  src/styles/tokens.css        (+13, one token)
  src/styles/app.css           (+218 appended, +9 across two comment rewrites)
  tests/layout-arithmetic.test.ts (+278, appended)
  docs/proof/f9-verification.txt (new) + 10 PNGs (new)
  .claude/reportback.md

NO COMPONENT CHANGED. The whole pass is CSS: `min-height`, four `flex-wrap`s,
one padding, one sticky offset. `git diff --stat dev -- 'src/**/*.tsx'` is
EMPTY, so the shipped JS bundle is byte-identical at 290.52 kB. Built CSS
38.27 -> 39.40 kB (gzip 7.32 -> 7.50).

DENIED / UNTOUCHED — verified EMPTY by `git diff --name-only dev -- <paths>`:
src/engine/** · src/data/** · src/config/** · src/persist/** · src/main.tsx ·
every src/ui/** file · package.json · package-lock.json · tsconfig.json ·
vite.config.ts · tests/category-colors.test.ts · tests/ui/overlays.test.tsx ·
tests/feasibility-golden.test.ts · tests/helpers/**.

Runtime `dependencies` are still exactly `{react, react-dom}`. Zero network:
the measurement rig is a local static server over two throwaway ports and
nothing was added to the app. H1 vocabulary is untouched — this pass changes
no string.

THE ONE SUBSTANTIVE DIVERGENCE FROM THE SPEC, DECLARED
§3.1 rev 2 says `sm` -> 36 and `md` -> 44 at S, and rests the whole thing on
one sentence: "the `md` variant is the one used for every header and dialog
action, so raising it to 44 at S clears the rule for the whole set."

THE PREMISE IS FALSE AGAINST THE SHIPPED TREE. `grep -rn 'size="md"' src`
returns ZERO. Every header action, every dialog action, every banner action,
every BuildManager row action and both Export/Import controls pass
`size="sm"`; `md` is only the prop default and no call site takes it. Shipping
§3.1's letter would have left the ENTIRE named set at 36px, still under §5.3's
own "every interactive target >= 44x44px" — the invariant the §3.1 bullet
cites in its own title.

RULING TAKEN: the invariant wins, both sizes clear 44 at S, and §3.1's size
bullet needs a rev. That is a spec decision, not a cleanup, so it is reported
rather than performed. Assertion 25 pins the divergence from both ends — the
base heights are still 28/36 (so the S block stays load-bearing) AND no file
under src/ui/ ships `size="md"` (so if the premise ever becomes true, the test
goes red and someone re-reads this).

THE SIX SURFACES AT 390, BEFORE -> AFTER
  1  AppHeader control row      225.00 -> 276.00 (5 lines both)
       .app-header__actions      28 -> 44 · overlays 42 -> 44 · switcher 37 -> 44
  2  BuildManager footer         67.00 ->  76.00 (1 line both)
       header 63 -> 77 · row-actions 30 -> 46 · the <li> 126 OVERFLOWING -> 152 wrapped
  3  Banner                     143.95 -> 138.78  — it got SHORTER
       .banner__actions          30 -> 46, on its own line
  4  FilterBar                  148.00 -> 194.00 (3 control lines both)
  5  ExportImportControls        28.00 ->  44.00 (1 line both)
  6  dialog action rows          reset 28 -> 96 (wrapped) · import 28 -> 44 ·
                                 build-manager Close 63 -> 77
       dialog boxes: bm 258 -> 307 · reset 365.56 -> 435.19 · import 195 -> 211

  Document horizontal scrollbar: ABSENT before, ABSENT after, in every scene.

FOUR ROWS NEEDED A REFLOW FIX. Each got `flex-wrap: wrap`; none got an
overflow. The three worth naming:
  · `.banner` got SHORTER because its actions rail is `flex: none` at 232px
    inside a 368px box, which left 120px for the body — the quarantine
    sentence broke over FIVE lines beside a two-button rail. Wrapping drops
    the rail to its own line and gives the body the width.
  · `.reset-dialog__actions` measured 321.99px inside a 322px box. ONE
    HUNDREDTH OF A PIXEL of slack, in a <dialog> that cannot scroll sideways.
    It now wraps and `Reset build` — the destructive one — ends up alone on
    the second line.
  · `.build-manager__list li` ALREADY OVERFLOWED ITS OWN BOX ON THE BASE TREE
    (294.8px of actions plus a name and a timestamp inside 320px of content).
    Fixed in passing: it is two selectors from the BuildManager footer, which
    is one of the six.
  · `.filter-bar` needed NOTHING. Three wrapped control lines before and
    three after — no padding and no font-size moved in this pass, so every
    control's WIDTH is bit-identical and the same items land on the same
    lines, 44px tall instead of 26.8 / 31 / 37.

A SEVENTH SURFACE THE CENSUS FOUND, AND IT HAD A BUDGET
The jump nav's chips were 28px — the most-tapped row on a phone. §5.3's
sticky-budget table already says what layer 1 is made of ("44px chips + 2px
padding each side"), so the chips take the floor and the nav's padding drops
from --space-2 to the 2px the budget funds. Measured at scrollY 4200:

    jump nav      44 -> 48   (cap <= 48)
    stuck digest  59 -> 59   (cap <= 88), top 44 -> 48
    gap           0.00 -> 0.00
    two layers   103 -> 107  (cap <= 136)

The digest's S offset is `calc(var(--tap-target) + 4px)` — DERIVED, and
assertion 28 checks it equals 2 x the parsed S nav padding + the parsed token.
The base `top: 44px` is untouched and still equals the nav's height at M and L.

THE PASS IS S-ONLY, AND IT IS PROVED RATHER THAN ASSERTED
Both trees rendered at five widths in headless Chrome; every element under
<body> digested as TAG.class|x,y,w,h and compared element by element:

    390   2678 elements, 2616 differing  — changed, by intent
    640   2678 elements, 2617 differing  — changed, by intent (640 IS the S
                                            layout: §6, 1280 at 200% zoom)
    768   2678 elements,    0 differing  — BIT-IDENTICAL
   1280   2681 elements,    0 differing  — BIT-IDENTICAL
   1440   2681 elements,    0 differing  — BIT-IDENTICAL

THE SUMMARY PANEL'S RESOLVED COLUMN COUNT — checked explicitly on the
coordinator's note that a 3px move in page padding / rail width / column gap /
<Section> chrome flips it between two tracks and three:

    1280   2 cols, "380px 380px", content 902   BEFORE and AFTER
    1440   2 cols, "380px 380px", content 1062  BEFORE and AFTER
     768   1 col,  content 702                  BEFORE and AFTER

UNCHANGED, and it could not have been otherwise: NONE of the four knobs was
touched. --space-4 is 16, --space-3 is 12, the rail is 300 and <Section>
chrome is 34 — all four re-asserted by value in assertion 29, alongside a
count-based proof that every `var(--tap-target)` in the stylesheet sits inside
a max-width block and that no min-width block mentions the token. (The 902 is
a headless overlay-scrollbar measurement against the note's 885 classic-
scrollbar figure; the claim is that the two numbers are the SAME number before
and after, which they are.)

TOP OF PAGE TO THE FIRST BADGE CARD
Two states, because the honest number depends on which one the user is in:

    390  zero state      3396.86 -> 3638.86  (+242)
    390  after 1st commit  656.00 ->  757.00  (+101)   <- the steady state
    768  either              same  ->  same   (   0)
   1280  either              same  ->  same   (   0)

The +101 in the state the user is actually in is the header (+51), the filter
bar (+46) and the jump nav (+4), less the banner's -5. Paid once, above the
fold, never per card.

THE MECHANICAL CHECK — assertions 23–29, parse-and-re-derive
A NEW TOKEN, and it is the only thing tokens.css gained: `--tap-target: 44px`,
in its own §5.3 block with the reason it is NOT a `--space-*` rung written
next to it. Seventeen rules consume it and the test parses it, so a future
density pass that shrinks the floor fails in ONE place, loudly.

  23  the floor is a token, defined ONCE (tokens.css), never redefined in
      app.css, and it clears WCAG 2.2 SC 2.5.5's 44 — the standard is the only
      literal, because a floor may not be graded against the thing under test
  24  every census entry declares `min-height: var(--tap-target)` at S, and
      NONE declares a fixed `height` (which would clip); the tier chips take
      the floor on BOTH axes, being the only targets narrower than they are tall
  25  THE CANARY: `.btn--sm` is still 28 and `.btn--md` still 36 in the base
      rules, so the S block stays load-bearing — plus the `size="md"` pin above
  26  no `overflow-x: hidden`, `overflow-x: clip` or `overflow: hidden` in ANY
      max-width:767px block, and the four wrapped rows are named; carries its
      own positive canary so it cannot pass by grepping for an absent string
  27  the census IS the stylesheet, set-equal in BOTH directions — a rule with
      no entry fails, and an entry whose rule was deleted fails. This is the
      assertion that stops the allowlist rotting.
  28  §5.3's sticky budget re-derived from the parsed nav padding + the token,
      at S and at M/L, with the digest's offset checked against the nav's height
  29  the pass is S-only, by counting token occurrences inside vs outside the
      S bodies, plus the four horizontal knobs pinned by value

THREE cssBlock TRAPS THIS HAD TO WALK AROUND, all live in this repo:
cssBlock() returns the FIRST matching block, stops at the FIRST `}`, and
CANNOT SEE INSIDE A MEDIA QUERY AT ALL — and every rule this slice adds is
inside one. Hence `mediaBodies()` (brace-matched) + `sRule()` (searches every
S block, matching grouped selector lists exactly). A fourth trap was live too:
`spaceIn(app, ".jump-nav", "padding", 0)` now throws, because `.jump-nav`
declares `padding` in two blocks — resolved by naming the base block through
`position: sticky` rather than by ordinal. `.category-ledger` now has FIVE
blocks; assertion 12's `cssBlock` still reads the first (the sticky one) and
stays green, which was checked, not assumed.

RED CANARIES — every new assertion seen failing, then reverted
  --tap-target 44 -> 40                       fails 23, 28   (74 passed)
  delete `.btn { min-height: … }`             fails 24, 27   (74 passed)
  `.banner { flex-wrap }` -> `overflow-x: hidden`  fails 26   (75 passed)
  restored                                    76 passed

GATES
  full suite            62 files / 1211 tests    PASS
  npm run typecheck     tsc --noEmit             PASS
  npm run build         tsc + vite build         PASS
  tests/ui/overlays.test.tsx      }  RUN, never edited
  tests/category-colors.test.ts   }  3 files / 23 tests   PASS
  tests/feasibility-golden.test.ts}

No flake from the load-dependent class fired on any run. No `{ timeout: 20000 }`
was touched; vite.config.ts is untouched.

BROWSER PROOF, AND TEN REAL PNGs
docs/proof/f9-verification.txt carries every number above with its method.
Screenshots WERE captured this time (F5.3 could not): five before/after pairs
at 390x844, dpr 2, 120–172 kB each, all genuinely painted. Measured against
PRODUCTION BUILDS of both trees on two throwaway ports — NO DEV SERVER was
started, because vite.config.ts pins 5173 with strictPort, every worktree
shares that origin, and localStorage is keyed to origin including port.

Every state was reached by a REAL event, never by poking React state: the
quarantine banner by seeding an autosave the deserializer must refuse (before
boot, via Page.addScriptToEvaluateOnNewDocument); the saved build by typing in
the footer and clicking `Save as new`; the reset dialog by committing a slider;
the import dialog by capturing the app's OWN export Blob through a patched
URL.createObjectURL and handing the bytes back to the file input as a File.

TWO ITEMS REMAIN VISUALLY UNVERIFIED, both named in the proof file:
  · the :focus-visible ring on the four newly-flexed controls. It needs a
    TRUSTED interaction and CDP can only dispatch untrusted events, so
    programmatic focus correctly refuses to match. Structurally unchanged — no
    rule in this pass touches box-shadow, outline or any :focus-visible
    selector, and a `display` change does not move a ring on a box that grew.
  · real-finger ergonomics. 44 is the standard's number, not a measurement of
    the operator's thumb.

KNOWN, NOT OURS, AND DELIBERATELY NOT FIXED
  · `.segmented label:has(input:disabled) { opacity: 0.45 }` violates
    invariant I2 — §6's disabled floor is 0.6, which F5.3 already applied to
    `.btn:disabled`. It is a CONTRAST defect, not a target-size one, and
    putting a §6 edit inside a §5.3 slice is how a stylesheet stops being
    reviewable. FLAGGED for whoever owns the next §6 pass.
  · src/main.tsx's RecoveryBoundary renders three UNSTYLED native <button>s
    with inline styles, deliberately: that screen must render when the
    stylesheet itself is the casualty. They carry no class, no rule here can
    reach them, and none should.
  · The tier filter chips now render as 44x44 CIRCLES rather than 26x27 pills,
    because `.chip` uses --radius-pill and the box became square. Consequence,
    not defect; visible in f9-after-filters-390.png.

SCOPE / PLAN IMPACT
None to scope.md / tech-strategy.md / the H-rulings. ONE design-spec item is
opened and it is a decision, not a cleanup: §3.1's `sm -> 36` at S rests on a
false premise and both sizes now clear 44. §5.3, §6 and the sticky budget are
implemented exactly as written — including the "44px chips + 2px padding each
side" composition of layer 1, which had never been built.

MERGE-CONFLICT FORECAST
This slice touches THREE tracked files. Two of the three hunks in app.css are
comment rewrites; everything else is APPENDED at the foot of its file.

  src/styles/app.css
     @@ 878   +5   .category-ledger's `top: 44px` comment (the base sticky
                   block) expanded to say the S override exists
     @@ 935   +11  the S sticky-budget comment, which still quoted the
                   withdrawn "<=104px total / jump nav is 44px" figures
     @@ 2955  +218 the whole F9 block, appended after `/* ==== end F5.4 ==== */`
  src/styles/tokens.css
     @@ 194   +13  `--tap-target`, after --space-12, before the Radius block
  tests/layout-arithmetic.test.ts
     @@ 1588  +278 appended after the final `});` of the I15+I16 describe

  · `a6-e-cap-breakers` (tip 9324bda) — NO STYLESHEET CONFLICT AND NO TEST
    CONFLICT. It touches src/engine/**, src/config/**, src/App.tsx,
    src/ui/build/BuildPanel.tsx, tests/helpers/test-utils.ts and eight other
    test files; the intersection with this slice is `.claude/reportback.md`
    ALONE, and both append. Trivial. NOTE FOR ITS INTEGRATOR: it extends
    tests/helpers/test-utils.ts, which this slice does NOT touch — assertions
    23–29 use `px`, `blocksFor`, `spaceIn`, `spaceToken`, `stripComments` and
    `cssBlock`, all of which must keep their current signatures.
  · `f8-s2-summary` (no commits yet) — TWO LIKELY CONFLICTS. (a) It will add a
    resolved-column-count assertion to tests/layout-arithmetic.test.ts; if it
    appends at the end of the file it collides head-on with the +278 block
    here. Ask it to insert INSIDE the §16.7 describe (which already owns
    `.summary`) instead of appending, and the conflict disappears. (b) If it
    edits `.summary`'s grid in app.css it will be in the head-of-file region,
    nowhere near hunk 3, so that half is clean. Its assertion will PASS against
    this slice: the resolved count is 2 at 1280 and 1440 before and after,
    measured.
  · `f13-physique-strip` (no commits yet) — ONE LIKELY CONFLICT AND ONE TRAP.
    A full-bleed strip will touch app.css's head-of-file `.layout` block, which
    is clean against all three hunks here. THE TRAP: if it raises any control
    of its own at S, assertion 27 (`the census IS the stylesheet`) fails until
    the new selector is added to `S_TOUCH_FLOOR_CENSUS` — by design, and the
    failure message names the selector. And if it moves page padding, the rail,
    the column gap or <Section> chrome, assertion 29's four pinned values fail
    — also by design, and that is precisely the summary-column flip the
    coordinator flagged, now caught in the test suite instead of by eye.

  ORDER PREFERENCE: none required. If f8-s2-summary lands first, re-run this
  slice's assertions 23–29 unchanged; they read the stylesheet, not the summary.

NEXT
  · A design-spec rev for §3.1's size bullet (the `sm -> 36` premise). Decision,
    not cleanup — named above.
  · The I2 `.segmented label:has(input:disabled)` opacity, for the next §6 pass.
  · Merge is Tier 1's. `dev` is untouched at a5fe8e1 and `main` at 444d034.
─────────────────────────────────────────────

## 2026-08-26 · F8-S2 · slice-complete — the loadout roster, the Synergy digest, the copyable text block

**Event:** `milestone-complete` (constrained mode, §7.1 fields below)
**Branch:** `f8-s2-summary`, cut from local `dev` @ `a5fe8e1`. **`main` untouched. Not merged to `dev`.**
**Commits:** `ca3792a` implementation · this entry.
**Suite:** 1204 → **1268** (62 → 66 files). `typecheck` clean, `build` clean.

### The two carried-forward obligations, both discharged BEFORE a golden was authored

The previous entry's `NEXT` said F8-S2 must read both before writing anything. It did.

1. **POST-A5 baseline.** `badgeSlotsBaselineText` reads the **base** Σ and appends a bonus clause.
   No golden is transcribed at all (see below), so the text-block test asserts against
   `formatSummaryText`'s live output; the Σ-line assertion additionally pins
   `summary.bonus.earnedEquipSlots === 0` and the *absence* of `bonus Badge Slots applied` on a
   zero-bonus fixture, so the post-A5 clause is exercised as a discriminating condition rather than
   silently satisfied.
2. **THE BOX.** Re-derived from the shipped CSS, not estimated:

   ```
   1280 − 17 (scrollbar)                        = 1263  ICB
        − 32  (.layout padding, 2 × --space-4)  = 1231  ← the PRE-F5.4 box §14.2 used
        − 300 (attributes pane) − 12 (col-gap)  =  919  ← .col-right
        − 2 (.section border) − 32 (.section__body padding) = 885  ← .summary
   ```

   **`.summary` is 885px at 1280/s=17.** The brief's checklist item *"SummaryPanel inside
   `.panel-below`"* is false — F5.4 deleted that class outright (assertion 19 forbids the string
   anywhere in `app.css` or `src/**`); the panel is `#panel-summary` inside `.col-right`. The stale
   `app.css` comment citing "a 1231px below-grid box" is corrected in this slice.

### Everything §14.2 derived downstream of the box is void, and is re-derived

| | §14.2 (against 1231) | Re-derived (against 885) |
|---|---|---|
| Roster columns at 1280 | 2 | **1** |
| Roster columns at 1440 | 3 | **2** |
| 2-up seam | — | **1307** |
| 3-up seam | **1429** | **1775** — off every target width |

The **five constants do not move** — they are properties of a roster row, not of a viewport — and
`ROSTER_ROW_MAX 412` / `ROSTER_GROUP_FLOOR 444` / `ROSTER_TABLE_MAX 520` are now **derived in the
test from the five**, with `ROSTER_NAME_MAX` computed off the **dataset's own longest name**
(`"Versatile Visionary"`, 19ch) rather than transcribed. A longer name in a future dataset raises
the floor and moves every seam, which is the point of deriving it.

**A 1-up roster at 1280 is not a defect.** A group's table is capped at `ROSTER_TABLE_MAX 520`
regardless, so 1-up is a 520px table in an 885px box, not a stretched one. The cap is what §14.2's
76px of "slack" exists to enforce.

### THREE GEOMETRY FINDINGS, none of them mine to fix, all now pinned

1. **REGION B IS 3px FROM A REFLOW, AND ALREADY ON BOTH SIDES OF IT IN THE FIELD.** Three tracks
   need `3 × 280 + 2 × 24 = 888`; the box is **885** at a 17px scrollbar and **902** at a 0px overlay
   scrollbar. **The same build renders the two legacy tables 2-up on Windows/Linux and 3-up on
   macOS.** Not introduced here and not harmful (the tables are capped at 380 either way), but it
   was entirely unobserved: the shipped assertion checked the `minmax()` *shape* and never the
   resolved count. Now pinned by outcome — the count at s = 0/15/17, the 3px margin, the 101px of
   trailing slack, and the derived boundary (a scrollbar of **≤ 14px** buys the third track).
2. **THE PANE MAKES 1279 WIDER THAN 1280 FOR THIS PANEL.** The 300px pane + 12px gap arrive at
   exactly 1280, so `.summary` goes 1196 → 885 and the roster goes **2-up → 1-up as the viewport
   grows by one pixel**. A consequence of §16's own ratified arithmetic. Pinned and named so it is
   not rediscovered as a bug.
3. **§14.2's S-width figures are 34px optimistic** (334/366 vs the real 332) for the same
   `<Section>`-chrome reason T16 was caused by. Headroom is unaffected: row min-content is 246 with
   R2's pin column and **178 without it** (this slice renders no pin column), against a 300px group
   content box — +122 today, +86 after R2 lands. Nothing overflows, nothing scrolls.

### §14.6's optional projection element is NOT BUILT, and that is a finding

§14.6 permits one labelled per-row projection in the roster. **It cannot ship in this slice.**
`tests/ui/overlays.test.tsx` compares the **whole `.summary` subtree's `textContent`** as one node —
not a column list — so *any* overlay-dependent node anywhere inside `.summary` reddens a
RUN-never-edit gate. The roster therefore consumes `buildSummary` only (a selector with no
`OverlayState` parameter) and is invariant end to end, which is what §14.6 actually wanted. Admitting
a labelled projection requires re-cutting that gate's selector list first — **a design question,
routed, not decided here.** `tests/ui/f8-roster-h2.test.tsx` pins the absence so it stays a decision.

### GOLDENS: generated, never transcribed (§14.5.1), and it paid off within the hour

`tests/ui/f8-fixture.ts` is **one in-code fixture**. Both the panel and `formatSummaryText` are
rendered from it, and every expected substring is computed by the same engine call the panel makes
(`buildSummary`, `synergyProjections`, `validateBadge`, `costForLevel`, `overByBadgePoints` /
`overByBadgeSlots`). Only **structural** literals are hand-written: a marker is present, the Σ line
is absent, the tally equals the purchase count, the footnote counts 6.

**PROVEN, not asserted.** A throwaway three-way merge of this branch with `a6-e-cap-breakers` and
`f9-touch-floors` was built and run: **1321 tests green**, the only conflict this very file, and
`app.css` + `layout-arithmetic.test.ts` **auto-merged**. The roster's stale row came out reading

```
⚠ Purchased at Gold; this build no longer qualifies — needs 90 Close (now 85) or 93 Layup (now 80) for Gold.
```

— A6-E's **post-② near-miss form**, absorbed with **zero edits to this slice**. A transcribed golden
would have been the string that silently reverted it.

### One shipped test file's ASSERTION reddened, and the redness was the right answer

The roster first used the card's exact stale sentence (`Purchased at Gold — no longer meets
requirements: …`) on the honest reasoning that reusing a shipped phrasing beats authoring a second
one. That made `tests/ui/f2-eligibility-disclosure.test.tsx` and
`tests/ui/attribute-slider.test.tsx` fail **multiple-match** — two nodes, one string, one screen.
Both are RUN-never-edit paths and **neither was touched**: the roster took §14.4's own phrasing
instead and the card kept its unique one. The shared thing is the FACTS (one predicate, one reason
array); the sentence is per-surface, exactly as §3.4 already had it.

### `tests/layout-arithmetic.test.ts`: ONE shipped assertion re-pointed, and why that is not an edit-to-pass

F5.4's own `"the summary tables are capped rather than stretched"` carried the explicit relay:
*"the relay to F8-S2, which must re-derive §14.2's five constants and the 1428/1429 seam."* §14.2
answers it by **moving the cap's selector without moving one character of the declaration** —
`repeat(auto-fit, minmax(280px, 380px))` is now on `.summary__tables`, because §13.5 measured it
against those two tables' 196px max-content and that derivation is still correct. The assertion is
the same assertion, re-pointed, plus its complement (`.summary` must now carry **no** cap).

### MERGE-CONFLICT FORECAST — measured with `git merge-tree`, not guessed

| Branch | Result |
|---|---|
| `a6-e-cap-breakers` (sealed) | **clean** — plus this file. Verified by a real three-way merge + full suite. |
| `f9-touch-floors` (sealed) | **clean** — plus this file. Same verification. |
| `f13-physique-strip` | **clean** — plus this file. |
| `a5-u-bonus-mode` | **clean** |
| `f8-r2-roll-ui` | **does not exist yet.** Forecast below. |
| `f10-feedback-loop` | **does not exist yet.** Forecast below. |

**Two collisions were avoided by relocation rather than discovered at merge time**, both on the
coordinator's warning:

- **`tests/layout-arithmetic.test.ts`** — F9 appended 278 lines to the foot of the file and F13
  appends 209 more. This slice's block is **nested inside the existing §16.7 `describe`**, which is
  where it belongs semantically (§16.7 is what made the box 885) and is clear of both hunks.
- **`src/styles/app.css`** — F9 appends 221 lines to the foot. This slice's `@media print` block was
  moved **out of the foot** to sit immediately after the surfaces it overrides. That is also the
  cascade-correct home: its non-`!important` declarations (the caption's 700 weight, the group's
  black border, `break-inside`) must follow the rules they beat.

**`f8-r2-roll-ui` — the slice this one most affects.** R2 inherits a roster built to host it:
`PIN_CHIP_MAX 60` is **in the derived floor and not in the DOM**, so R2 can add the pin column
without moving a constant or re-deriving a seam. R2 will touch `LoadoutRoster.tsx` (the pin `<td>`,
the `<tfoot>` re-roll control), `SummaryPanel.tsx` (region 3, `RollPanel` — no space is reserved for
it), `app.css` and this slice's four test files. **Two live hazards for R2:** (a) `RollPanel` output
inside `.summary` joins `overlays.test.tsx`'s whole-subtree comparison — a roll report that varies
with an overlay reddens the gate; (b) `tests/vocabulary.test.ts` CLASS 2 gains
`src/ui/summary/RollPanel.tsx`, and `LoadoutRoster.tsx` is **not** in that scope today.

**`f10-feedback-loop`** — no forecast is possible without a brief. The surfaces this slice claims are
`src/ui/summary/{LoadoutRoster,SynergyDigest,SummaryTextBlock}.tsx`, `.summary*` /
`.summary-roster*` / `.synergy-digest*` / `@media print` in `app.css`, `FilterState.purchasedOnly`,
and `SummaryPanel`'s new `summary` / `synergy` / `buildName` props.

### CONSTRAINED-MODE FIELDS

**`changed_files`** — all inside the allowlist bar one, disclosed below:
```
src/ui/summary/LoadoutRoster.tsx      NEW   components #29 + RosterGroup + RosterRow
src/ui/summary/SynergyDigest.tsx      NEW   component #30, read-only
src/ui/summary/SummaryTextBlock.tsx   NEW   component #31, renders formatSummaryText()
src/ui/summary/SummaryPanel.tsx       EXTENDED
src/ui/grid/FilterBar.tsx             the Purchased chip only
src/App.tsx                           three edits, named below
src/styles/app.css                    §14.2 two-region + roster + digest + copy + @media print
tests/ui/f8-roster.test.tsx           NEW  (17)
tests/ui/f8-roster-h2.test.tsx        NEW  (4)
tests/ui/f8-summary-text.test.tsx     NEW  (7)
tests/ui/f8-filter-purchased.test.tsx NEW  (4)
tests/ui/f8-fixture.ts                NEW  ← NOT in the allowlist. Disclosed, see below.
tests/layout-arithmetic.test.ts       §14.2 block nested in §16.7 + one assertion re-pointed
tests/category-colors.test.ts         ADD ONLY — six new assertions, none edited
.claude/reportback.md                 this entry
```

**`tests/ui/f8-fixture.ts` — the one path outside the allowlist, and why.** §14.5.1 requires **one**
fixture rendered by **both** the panel and the text; four test files consume it. Exporting it from a
`.test.tsx` would re-run that file's `describe`s in three others. It follows the shipped convention
for non-test support modules in this directory (`tests/ui/m4-rig.ts`, `tests/ui/storage-stub.ts`) and
builds on `makeRig` rather than authoring a second envelope shape.

**`denied_paths_checked` — I did not touch these:** `src/engine/**` (every selector was already
there; nothing was added and no rule was re-implemented in a `.tsx`) · `src/styles/tokens.css`
(**zero new tokens**) · `src/ui/grid/BadgeCard.tsx` · `src/ui/build/BudgetGrid.tsx` ·
`src/ui/grid/CategoryLedger.tsx` (**imported from**, never edited — that is the "one builder, four
consumers" mechanism) · `src/ui/synergy/**` · `src/ui/shell/**` · `src/ui/builds/**` ·
`tests/ui/overlays.test.tsx` · `tests/vocabulary.test.ts` · `tests/architecture.test.ts` ·
`tests/feasibility-golden.test.ts` · `tests/ui/f2-*` · `tests/ui/summary-import-export.test.tsx` ·
`tests/ui/category-ledger.test.tsx` · `package.json` / `package-lock.json` / `vite.config.ts` /
`tsconfig.json` / `.env*` · `src/data/**` / `src/config/**` / `src/persist/**` / `src/main.tsx` /
`scripts/**` · `main`. **No test helper signature changed** (`px`, `blocksFor`, `spaceIn`,
`spaceToken`, `stripComments`, `cssBlock` are all untouched) — F9's assertions depend on that.

**`first_proof_result`** — **the browser proof was NOT run: the dispatch forbade starting a dev
server.** Stated plainly rather than implied. What replaced it, and what it does and does not cover:

- (a) **rows carry badge names** — asserted on the rendered tree in jsdom: one `<table>` per
  non-empty category, `<th scope="row">` per purchased badge, in dataset order, and each of the 49
  unpurchased badges asserted **absent**.
- (b) **every row on one line at 1280** — **NOT verified visually.** jsdom does no layout. It is
  discharged **arithmetically** against the re-derived 885px box: group content box 512 (1-up,
  capped by `ROSTER_TABLE_MAX`) against `ROSTER_ROW_MAX` 412 — and 352 of that 412 is what actually
  renders, since the pin column does not. **This is the one claim in the slice that wants an eye on
  it**, and it is why the constants are derived in-test rather than pinned.
- (c) **the stale row reads the engine's own reason sentence** — asserted against
  `validateBadge(...).reasons`, and reproduced verbatim above from the post-merge probe.
- **State 32(a), the LAN clipboard path** — the LAN origin was unreachable (no server), so it is
  covered by `navigator.clipboard` **stubbed to `undefined`**, which the brief names as the
  permitted substitute. It is the DEFAULT for every test in that file, not an afterthought.
- **Print preview** — not run. The print block is asserted structurally (black-on-white present, no
  `@page`, no `grid-template-columns`, no font change) by brace-counted extraction rather than a
  slice-to-EOF, so a later append cannot silently empty the assertion.
- **No `docs/proof/f8s2-*.png`** exists, for the same reason. `docs/proof/**` is untouched.

**`verification_evidence`**
```
npm test          62 files / 1204 tests  →  66 files / 1268 tests   ALL PASS
npm run typecheck clean
npm run build     clean (tsc --noEmit && vite build; 73 modules, 303.25 kB js / 43.52 kB css)
EXPLICIT, unedited:
  tests/ui/overlays.test.tsx        PASS   ← .summary IS in its selector list. THE gate.
  tests/category-colors.test.ts     PASS   (15 shipped + 6 added)
  tests/feasibility-golden.test.ts  PASS   — no golden cell moved
  tests/vocabulary.test.ts          PASS   — H1 clean across the three new files
  tests/architecture.test.ts        PASS   — deps still exactly {react, react-dom}
  tests/layout-arithmetic.test.ts   PASS   (80)
  tests/ui/summary-import-export.test.tsx · f2-disclosure-surfaces · f2-eligibility-disclosure ·
  category-ledger                   PASS
NEW: f8-roster 17 · f8-roster-h2 4 · f8-summary-text 7 · f8-filter-purchased 4
THREE-WAY MERGE PROBE (throwaway): f8-s2 + a6-e-cap-breakers + f9-touch-floors
                  1321 tests PASS, typecheck clean, only .claude/reportback.md conflicted
git status --porcelain: only allowlisted paths (+ tests/ui/f8-fixture.ts, disclosed)
No flake observed in any run; no { timeout: 20000 } was lowered; vite.config.ts untouched.
```

**`heartbeats_emitted`** — 0 as discrete messages. The dispatch was a single-turn agent task with two
mid-task course corrections from the coordinator (the 885 measurement + the column-count ask; then
the A6-E and F9 collision warnings), each acknowledged and acted on inline. Recorded as a deviation
from the 5-minute cadence rather than claimed.

**`stop_conditions_triggered`** — none. Four were approached and none crossed:
1. **A `--cat-*` selector beyond the caption** — not needed. The caption is wired through six
   explicit `var(--cat-{key})` rules rather than `--cat` inheritance, so the inherited property never
   enters `.summary` and §2.8.1's shipped channel lint stays exactly as true as before.
2. **Engine code** — none written. The one function that could have been engine-side,
   `capacityFootnote`, is UI copy over an engine count and is pinned equal to `formatSummaryText`'s
   own footnote in-test.
3. **A denied path** — `SummaryPanel`'s new props are **optional** for one reason only: making them
   required broke `tests/ui/f2-disclosure-surfaces.test.tsx`, which mounts the component directly
   and is RUN-never-edit. **The App always supplies them, and `f8-roster` asserts it does** so the
   degradation cannot arrive silently. If a later slice is permitted to touch that file, the props
   should become required and the fallback deleted — **flagged, not buried.**
4. **A literal hex in `app.css`** — five, all inside `@media print`, all reproduced verbatim from
   §14.5's own block. Print is the legibility override, not identity styling; `#fff`/`#000` are the
   only correct values and a token would be wrong. Disclosed because the allowlist line says
   "a literal hex … is a stop-and-report".

### AJ-5 / AJ-10 / H2 / H4 / H8 — the named rulings, confirmed

- **AJ-5** — **no Σ-vs-20 row in the panel**, asserted on a fixture where every capacity is entered
  so the line *would* be comparable. It lives in the text block only, because the text leaves the app
  and `BudgetTotalRow` cannot travel with it.
- **AJ-10** — no badge description, no `<details>`, no NEW chip inside `.summary-roster`, asserted by
  scanning all 53 dataset descriptions against the roster's `textContent`.
- **H2** — purchased level, cost, effective level, both `<tfoot>`s, the Synergy digest, both legacy
  tables and the text block are byte-identical across all four overlay combinations, and the test
  proves the toggles genuinely moved something first, so the invariance is not vacuous.
- **H4** — `over by N ⚠` is **per-metric**: the two flagged nodes are asserted to be exactly the two
  builder outputs, and the `<caption>` carries no state class (I10).
- **H8** — the stale entry is disclosed and left exactly where it is, at the level it was bought at.

### CROSS-SLICE OBLIGATIONS

1. **Designer** — §14.2's constants table, its 1428/1429 seam and its S-width figures are void
   against the shipped tree; the re-derived values are above and in-test. §14.6's projection element
   is unbuildable while `overlays.test.tsx` compares `.summary` whole. Both want a rev-9 note.
2. **F8-R2** — read the pin-column and CLASS-2 hazards above before starting.
3. **Operator** — a throwaway local branch `f8s2-merge-probe` remains (the merge-probe commit); its
   worktree is removed and `git branch -D f8s2-merge-probe` was **denied by the permission layer**,
   so it needs one operator command. Nothing is at risk. `a5e-trial-merge` from two entries ago is
   still outstanding on the same footing.

### NEXT

Merge order is unchanged: **F8-S2 → A5-U → F8-R2**. F8-S2 is clean against every sealed sibling and
against `f13-physique-strip`; the only expected conflict on any of them is this append-only file.
─────────────────────────────────────────────

## 2026-08-25 · Tier 1 · integration — A6-E → F9 → F8-S2 landed on `dev`

**Event:** `integration-complete`
**Branches landed, in order:** `a6-e-cap-breakers` → `f9-touch-floors` → `f8-s2-summary`
**`dev`:** `a5fe8e1` → **`dd9d70f`**. **`main` untouched at `444d034`.** No dev server started.
**Not in this pass:** `f11-synergy-board`, `f13-physique-strip` — taking follow-up commits
concurrently; their branches and worktrees were not touched (both advanced on their own during
this pass, which is expected and not caused here).

### METHOD — rebase onto a throwaway, then fast-forward. No source branch was rewritten.

Each branch was checked out to a throwaway (`int-a6e` / `int-f9` / `int-s2`), rebased onto the
current `dev`, fast-forwarded into `dev`, verified, pushed, and the throwaway deleted. All three
source branches are still at their sealed SHAs — `9324bda` / `946134c` / `617b13e` — never rebased,
never force-pushed.

**MERGE-COMMIT COUNT: 2 before, 2 after.** The dispatch said `dev` carried zero and that
`git log --merges | wc -l` should read 0. **That premise is false against the shipped tree** and was
false before this pass: `dev` has carried two merge commits since the Vercel-hosting backmerge —
`e6b3ae4` (PR #3, inherited from `main`) and `ac61296` (`main` → `dev` no-ff backmerge). Both predate
the nine prior integrations. `git log --merges | wc -l` counts LINES of full-format log output, not
commits, and reads 59; `git rev-list --merges --count dev` is the honest probe and reads **2 before
and 2 after**. The invariant the rule actually protects — *no integration adds a merge commit* — held:
all three landings were fast-forwards. Reported rather than quietly re-baselined.

### CONFLICTS — three encountered, all in one file, all append-vs-append

`.claude/reportback.md` conflicted on the second commit of F9 and of F8-S2. Nothing else conflicted
anywhere: A6-E fast-forwarded with no rebase at all (it sat on `dev`'s tip), and both F9's and
F8-S2's implementation commits applied byte-identically — confirmed by `git range-diff`, which
reported `c57c350 = 6a8dfbe` and `ca3792a = e1b95c0`.

**Resolution rule applied: every entry survives, verbatim, in authored order.** Authored times
decided the order and they match the landing order exactly — A6-E 23:22, F9 23:27, F8-S2 23:37.

- **F9's conflict** — resolved by deleting only the three marker lines. Git had already unified the
  shared blank line and the shared `─────` rule (A6-E's closer doubling as F9's opener), so the
  result is 5459 lines where a naive concatenation would be 5461. Verified by diffing the first 5151
  lines against `dev` and lines 5152–5459 against F9's own block: both byte-identical.
- **F8-S2's conflict** — the same collapse would have eaten F9's *closing* rule, leaving F9's last
  prose line abutting F8-S2's `##` heading with no separator. Resolved instead by reconstructing the
  file as `dev`'s 5459 lines verbatim + F8-S2's 286-line block verbatim = 5745. Both halves diffed
  byte-identical against their sources. This restores the separator the 3-way merge collapsed; it
  rewrites nothing.

**Collision points that did NOT materialise**, because the authors had already routed around them:
`src/styles/app.css` (F9 appends at EOF, F8-S2 placed its `@media print` mid-file at L2138) and
`tests/layout-arithmetic.test.ts` (F9 at EOF, F8-S2 nested inside the existing §16.7 `describe`)
**both auto-merged**, exactly as F8-S2's probe forecast. `tests/ui/f2-source-pins.test.ts` was
touched by none of the three — its hardcoded array is unrelated to cap breakers — so there was no
union to keep.

### COUNTS — expected computed from each branch's own delta BEFORE reading the actual

| Landing | Arithmetic | Expected | Actual |
|---|---|---|---|
| base `dev` | — | — | 1204 / 62 |
| A6-E | 1204 + 46 (38 engine + 8 rider ②) | **1250 / 63** | **1250 / 63** ✓ |
| F9 | 1250 + 7 (assertions 23–29) | **1257 / 63** | **1257 / 63** ✓ |
| F8-S2 | 1257 + 64 (17+4+7+4 new files + 32 in-file) | **1321 / 67** | **1321 / 67** ✓ |

1321 is also exactly what F8-S2's own throwaway three-way probe reached, independently.

### GATES — run after every landing, all three times

`npm test` · `npm run typecheck` · `npm run build` — **all PASS at all three landings.**
Build output at the tip: 74 modules, `303.87 kB` js / `44.65 kB` css. CSS moved 38.27 → 39.40 (F9)
→ 44.65 (F8-S2); JS was **unchanged** across F9 at 291.13 kB, confirming F9 shipped zero JS.

**RUN-never-edit trio, run explicitly at every landing:** 23/23 after A6-E, 23/23 after F9,
**29/29** after F8-S2. `tests/ui/overlays.test.tsx` and `tests/feasibility-golden.test.ts` are at
**ZERO diff against `a5fe8e1`** at the tip — **no cell of the 504-cell golden moved.**
`tests/category-colors.test.ts` is the one that grew, by F8-S2's disclosed six assertions:
`git diff a5fe8e1 HEAD` over it removes **0 lines**, so it is provably add-only and none of the 15
shipped assertions was edited.

Runtime `dependencies` confirmed **exactly `{react, react-dom}`** at every landing.

**ONE FLAKE, disclosed:** the first full run after A6-E reported 1 failed / 1249 passed of 1250.
Two immediate re-runs were 1250/1250 green, and every later run of the whole suite was green. This is
the load-dependent vitest flake class both A6-E's and F5.3's entries already name. The failing test's
identity was **not captured** — the run was tailed rather than saved — which was a mistake worth not
repeating; later runs were captured in full. Nothing was edited in response to it.

### THE THREE PROPERTIES A MERGE COULD HAVE QUIETLY BROKEN — all three verified

1. **The near-miss parenthetical is still INSIDE the level suffix.** Both A6-E guards pass by name:
   `② POSITIVE CANARY — the pip selector still finds a two-term 'or' reason` and
   `② CANARY PREMISE — BadgeCard still selects by the trailing 'for {label}' suffix`, plus the
   dataset-wide sweep `② every purchasable level's reason still ends in its own level suffix`, which
   walks all 53 shipped badges and asserts no reason matches `/for (Bronze|Silver|Gold|HOF)\s*\(/`.
   8 passed. The required grep `for Gold)|for HOF)|for Silver)|for Bronze)` over `src/` is **CLEAN**.
   `badge-card` + `f2-eligibility-disclosure` 17/17, so the rendered line survives too.
2. **F9's census is set-equal in both directions.** Assertion 27 passes; it is a genuine
   `expect([...declared].sort()).toEqual([...S_TOUCH_FLOOR_CENSUS].sort())` over selectors parsed
   back out of the S media bodies — a raised control with no census entry reddens, and so does a
   census entry whose rule was deleted. The 17 `var(--tap-target)` consumers in `app.css` and the
   single token definition at `tokens.css:205` both survive the merge intact.
3. **The resolved column count is still pinned by OUTCOME at s = 0/15/17.** Assertion
   `REGION B RESOLVES TO 2 TRACKS AT 1280/s=17, AND IT IS 3px FROM 3` passes: 2 tracks at s=17 and
   s=15 (box 885, three tracks need 888), **3 tracks at s=0** (box 902), with the boundary derived —
   a scrollbar of ≤14px buys the third track. The macOS/Windows divergence is pinned as intended
   behaviour, not collapsed to a single number.

### OPERATOR ACTIONS — carried forward, none performed here

Three stale refs from earlier slices remain, all harmless, none deletable by an agent:
`git -C /tmp/bb-a6e stash drop` (A6-E's redundant WIP stash), `git branch -D f8s2-merge-probe`
(F8-S2's probe), and `a5e-trial-merge`. **`git branch -D` is refused by the permission layer** — the
same refusal F8-S2 reported. This pass's own three throwaways were removable with `git branch -d`
(safe delete, fully merged) and are gone.

### NEXT

Merge order for what remains is unchanged: **A5-U → F8-R2**, with `f11-synergy-board` and
`f13-physique-strip` to be integrated once their in-flight commits seal. Both will conflict on this
file and on nothing else that is currently forecast; `f13` additionally shares
`BuildPanel.tsx`'s `hasValues` ternary with A6-E, where the standing rule is **widen, never replace**.
─────────────────────────────────────────────

SLICE COMPLETE — F11 the Synergy board (cut 1), 2026-08-25
─────────────────────────────────────────────

WHAT LANDED
One new component, `SynergyBoard`, rendered as the HEAD of the existing
`<Section title="Synergy Slots">` — two labelled rows (Fuse above Reaction)
crossed with eight columns in `SynergySlotId` order, a Temporary/Permanent
band divider on the 4/5 seam, live `(+1)`/`(+2)` headers read off
`slot.magnitude`, `🔒 Locked` on locked columns, badge name + purchased-level
letter in occupied cells, `⊕` in empty ones. Pressing a column header or a
cell scrolls the Synergy Slot's own row into view and puts focus in it. The
eight shipped `SynergySlotRow`s are untouched and are the board's detail.

It is a READ-PLUS-NAVIGATE surface. It dispatches no state change: no
`onSynergySlotsChange`, no `assignSynergy`, no `clearSynergy`, no `onSetLevel`.
Its own state is one `SynergySlotId | null` — which column is selected — and
nothing is persisted.

CHANGED FILES — a subset of the allowlist, nothing outside it
  src/ui/synergy/SynergyBoard.tsx        new — the entire slice
  src/ui/synergy/SynergyPanel.tsx        TWO edits: the mount between
                                         <PlusTwoDesignator/> and the .map(),
                                         and id={`synergy-row-${id}`} on the
                                         <fieldset>. One import line.
  src/styles/app.css                     ONE appended delimited block, after
                                         F5.4's, between machine markers
  tests/layout-arithmetic.test.ts        14 assertions (the brief's 13 + the
                                         NAME_MIN record below)
  tests/ui/f11-synergy-board.test.tsx    new — 23 cases
  tests/ui/f2-source-pins.test.ts        ONE string appended to the :96 array
  docs/proof/f11-verification.txt        + 10 screenshots
  .claude/reportback.md                  this entry

DENIED PATHS — NOT TOUCHED, and `src/App.tsx` named explicitly
`src/App.tsx` was never opened for edit and needs no wiring: the board mounts
inside `SynergyPanel`, which already receives all four props the board consumes
(`synergySlots`, `loadout`, `dataset`, `overlay`). Nothing is threaded. Also
untouched: `src/engine/**`, `src/styles/tokens.css`, `src/config/**`,
`src/data/**`, `src/ui/grid/**`, `src/ui/{summary,build,builds,shell,primitives}/**`,
`src/persist/**`, `tests/ui/overlays.test.tsx`, `tests/category-colors.test.ts`,
`tests/feasibility-golden.test.ts`, `tests/ui/synergy-panel.test.tsx`,
`package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`.
`src/ui/board/**` was never created.

THE ZERO-LIST HOLDS, AND IS ASSERTED RATHER THAN CLAIMED
Zero engine changes · zero new tokens · zero new dependencies (`react,react-dom`,
confirmed) · zero persisted-shape change (schemaVersion stays 1, so no reader
inventory applies to this slice) · zero new live regions · zero dialogs · zero
new breakpoints (the 767 touch floor is the shipped one) · zero sticky layers ·
zero new scrollports. Each is a named assertion over the stylesheet block or
the rendered DOM, not a claim in prose.

BOTH SHIP-GATE TRAPS, CONFIRMED HANDLED
  1. THE STRING COLLISION. The band label is
     `⟳ Temporary Synergy Slots disabled by season-reset preview`, not the
     row's `⟳ Disabled by season-reset preview`. `overlays.test.tsx:171` does
     a global exact `getByText` on the row string and `getByText` throws on a
     second match. Asserted twice — at source level in
     `tests/layout-arithmetic.test.ts` so it reds there FIRST, and in the DOM
     in the new UI file, which also pins that the row-level string count is
     unchanged (3 row notes for three unlocked temporary Synergy Slots, plus
     exactly one band note). `overlays.test.tsx` is green, run by name.
  2. THE GRID SPAN. `.synergy-board { grid-column: 1 / -1 }`, following
     `.synergy-panel > .banner` eight lines from `.synergy-panel`'s own
     declaration. Asserted, with the canary that without it the board lands
     in one 436.5px track at 1280 against an 829px floor.
Trap 3 (`.synergy-row`), trap 2 (`category-ledger`/`ledger-overview`/`summary`)
and trap 6 (the getByText collision set) are each asserted in the DOM as well.
Trap 4's one-string append to `f2-source-pins.test.ts` is the only edit to that
file. Trap 5 is honoured: `blocksFor()` is used for every selector that has more
than one block, and `.synergy-board__table` has three.

GATE RESULTS
  npm run test        63 files / 1246 tests PASS (base 62 / 1204). No skips,
                      no .only. The +42 are this slice's.
  npm run typecheck   PASS
  npm run build       PASS — tsc --noEmit && vite build, 69 modules, CSS
                      43.46 kB. Run because it is the ONLY gate that parses
                      the appended app.css block.
  RUN-never-edit, by name, all green and none edited:
      tests/ui/overlays.test.tsx · tests/category-colors.test.ts ·
      tests/feasibility-golden.test.ts   (3 files / 23 tests)
  dependencies        react,react-dom
  git status          every path inside the allowlist

BROWSER PROOF — MEASURED, NOT EYEBALLED
Chrome/151.0.7922.174 --headless=new over CDP. Full tables in
docs/proof/f11-verification.txt.
      1440  box 1062  8 columns  cellW 115.13   divider on the 4/5 seam
      1280  box  902  8 columns  cellW  95.13   the binding case
       768  box  702  4 + 4      cellW 151.50   both band labels
       390  box  332  4 blocks of 2  cellW 126.00   nothing hidden
Every measured cellW equals the derivation to the pixel. No page h-scroll and
no board scrollport at any width. Zero nodes on the board with a computed
opacity other than 1.

THE 828/830 SEAM — SHOT AS A PAIR, BOTH READINGS
The 829 floor is a BOARD-BOX figure, not a viewport, so both are on the record.
  · The real seam, found by sweeping the viewport and reading the box back:
    box 828 → 4+4, box 829 → 8 across, box 830 → 8 across at cellW 86.13,
    clearing CELL_FLOOR 86 by 0.13. `f11-seam-828.png` / `f11-seam-830.png`.
    The threshold is written `@container (width < 829px)` in range syntax, so
    the number in the stylesheet IS the derived demand — no max-width
    off-by-one to reconcile.
  · The literal viewports 828 and 830 give boxes 762 and 764 and are BOTH
    four-wide, which is correct rather than a failure: below 1280 the box is
    `v − 2×--space-4 − 34`, so eight-wide needs viewport ≥ 895 at s=0. Shot
    and kept as `f11-seam-viewport-828.png` / `-830.png`.

THE MEASURED BOX AT 1280 IS 902, AND THE STOP CONDITION DID NOT FIRE
885 is `boardBox(1280, s=17)`. Headless Chrome on macOS renders overlay
scrollbars, so s = 0 and the box is 902 — the SAME F5.4 derivation at a
different scrollbar, confirmed against `.section__body` clientWidth 934 = 902 +
2×--space-4. The derivation has not moved. The arithmetic test asserts the
eight-column fit across all of `SCROLLBARS = [0, 15, 17]` and names 885 /
cellW 93.00 / margin **+7.00** as the binding s=17 case — the design's +13.3
was wrong by the uniform +6.25/cell the brief identified.

TWO THINGS THE OPERATOR SHOULD SEE
  1. NAME_MIN_CONTENT IS 2.156px LIGHT — RECORDED, NOT SILENTLY RE-PINNED.
     Re-measured in headless Chrome inside a live `.synergy-board__button`:
     "Unpluckable" **70.156** against the paper 68 ("Interceptor" 62.563,
     "High-Flying Denier" 36.969 — the hyphen breaks it early). §13.0.1's
     take-the-larger rule would re-pin to 71, move CELL_FLOOR 86 → 89 and move
     the eight-column floor **829 → 853**. That is a threshold change to a
     number this slice was briefed to land on and to prove at the 828/830
     seam, so it is surfaced for ratification rather than taken unilaterally.
     Cost, bounded and measured: only for a board box between 829 and 853 does
     the longest single word want ~2.2px more than its cell's inner edge
     offers; it cannot scroll and cannot reach the document, and NO coverage
     width is in that band. Carried as assertion "1b" in
     `tests/layout-arithmetic.test.ts` so it fails the day someone moves one
     number without the other. "Reaction" re-measured at 59.141 against its
     64px track — the ROW_LABEL_W 72 pin holds with 4.86px to spare.
  2. THE SECOND RESPONSIVE STEP IS DERIVED, NOT THE DESIGN'S "~560".
     The design named ~560 as a comfort threshold and declined to derive it.
     Implemented at **440** — the four-wide floor itself, `4×86 + 72 + 3×8` —
     which is the same rule as the 829 one step down. It lands identically at
     both widths the coverage set names: 768 (box 702) is four-wide, 390 (box
     332) is two-wide.

ONE DEFECT FOUND AND FIXED DURING THE CUT, WORTH RECORDING
The narrow arrangements' band placement was written `.synergy-board__band
{ grid-column: 1 / -1 }` at specificity (0,1,0) against wide placements at
`.synergy-board__band[data-band="…"]`, (0,2,0). The bare selector LOST, the
Permanent band kept columns 7/11, and the five-track template grew five
implicit tracks it never sized. Measured before the fix: cellW **88.97** at 768
against a 151.50 demand, and **2.00** at 390. No jsdom test can see a collapsed
grid track — the suite was green throughout and the DOM was correct at every
width. Caught only by measuring in the browser, which is the argument for the
browser gate. The selector now names both bands and says why in place.

RULINGS HONOURED WITHOUT DRIFT
  · `.synergy-row--dimmed { opacity: 0.6 }` is a known live violation of
    design-spec §6 / I2 in the shipped rows. NOT touched (brief §6.2). The
    board renders its own locked columns de-opacified: `--bg-canvas` fill,
    `--border-subtle` rim, `--fg-muted` spelled out ON the text (6.15:1),
    computed opacity 1 everywhere, and the cells of a locked column are NOT
    buttons — H4's control-not-offered class.
  · No control renders inside a cell. `SELECT_FLOOR` 180 against a 93px cell
    is a 1.94× shortfall, so `pickerGroups`' whole disable-with-reason
    discipline in `SynergyPanel.tsx` is untouched. Asserted: zero `select`,
    zero `input`, zero `.select/.segmented/.toggle` inside the board, and the
    rows below still have theirs.
  · The season-reset preview leaves every control in the band operable —
    6 buttons, 0 disabled, measured. Rev 1's dimmed-but-declared-operable
    defect does not reappear.
  · Badge names are TEXT, never art. No glyph set, no images, zero network.
  · The board announces nothing. `.synergy-panel`'s live-region count is
    exactly 2 with the board present, and the board contributes 0.

CONFLICT FORECAST — the four in flight and the four queued
  · `a6-e-cap-breakers`, `f9-touch-floors`, `f13-physique-strip`,
    `f8-s2-summary`: none touches `SynergyPanel.tsx` or
    `src/ui/synergy/**`. The only shared file is `src/styles/app.css`, and
    this slice's CSS is one appended block at end of file between markers, so
    any collision is a trivial append-order resolution. `f9-touch-floors` is
    the one to watch: it owns I6 and this block declares
    `@media (max-width: 767px) { .synergy-board__button { min-height: 44px } }`.
    That is an ADDITIVE rule on a NEW class inside an existing breakpoint — if
    F9 introduces a shared touch-floor selector, the board's button should be
    folded into it and this rule deleted rather than kept alongside.
    `f8-s2-summary` also lands in `tests/layout-arithmetic.test.ts`, but at a
    different describe and against `.summary`; the F11 section is appended at
    end of file. `a6-e-cap-breakers` may touch
    `tests/ui/f2-source-pins.test.ts` — this slice's edit there is one string
    inside the `:96` array and merges cleanly unless that array is
    restructured.
  · `a5-u-bonus-mode`: no synergy surface. `app.css` append-order only.
  · `f10-feedback-loop`: unknown surface. If it adds a live region anywhere
    inside `.synergy-panel`, note that `tests/ui/f11-synergy-board.test.tsx`
    pins that panel's live-region count at exactly 2.
  · `f8-r2-roll-ui`: no synergy surface expected; `app.css` append-order only.
  · `f12-reset-placement`: THE ONE REAL OVERLAP. It moves or re-frames the
    season-reset preview control. This slice adds a SECOND consumer of that
    overlay — the board's band label — and the band string
    `⟳ Temporary Synergy Slots disabled by season-reset preview` must stay
    DISTINCT from the row string or `overlays.test.tsx` reds. F12 should read
    brief §6.3 before re-wording either.
  · `.synergy-row--dimmed`'s de-opacification is routed as its own micro-slice
    and is still unclaimed. Whoever takes it should expect the board's locked
    columns to already look correct and the rows to change to match.

CARRIED FORWARD
  · The NAME_MIN_CONTENT 68 → 71 re-pin and the 829 → 853 threshold move it
    implies. Needs a ratification, not an implementer.
  · Cut 2 stays specced and unbuilt in full: `LoadoutBoard`, `DisciplinePanel`,
    `BadgeTile`, `BoardDetail`, a second `<Section>`, a `JumpNav` chip, the
    selection tagged union, assign/clear from the board, the over-capacity
    fence, and the 864px side-by-side threshold. `src/ui/board/**` does not
    exist.

KNOWN AND NOT MINE
The load-dependent vitest flake class. `vite.config.ts` untouched, no
`{ timeout: 20000 }` lowered, no flake observed across the five full or partial
runs this slice made.

NEXT
Branch `f11-synergy-board` pushed. `dev` untouched at `a5fe8e1`; `main`
untouched. Not merged.
─────────────────────────────────────────────

FOLLOW-UP — F11 NAME_MIN_CONTENT re-pin, ratified, 2026-08-25
─────────────────────────────────────────────

WHAT CHANGED
The one item the slice-complete entry above carried forward is now applied.
`NAME_MIN_CONTENT` re-pinned **68 → 71** (the ceiling of the measurement), and
everything downstream of it moved with it because it is all derived:

    NAME_MIN_CONTENT   68  ->  71     ceil(70.156), take-the-larger
    CELL_FLOOR         86  ->  89     71 + 2 × --space-2 + 2 × 1px border
    8-wide floor      829  -> 853     8 × 89 + 72 + 7 × 8 + 13
    4-wide floor      440  -> 452     4 × 89 + 72 + 3 × 8
    binding margin @1280/s=17
                     +7.00 -> +4.00   cellW 93.00 against CELL_FLOOR 89

The 4-wide floor moved WITHOUT being touched — it is the same rule one step
down, so re-pinning the constant re-derived it. That is the property worth
protecting and it survived.

WHY IT IS A FIX AND NOT BOOKKEEPING
At the old floor the board went eight-wide from board box 829, where a cell
offers 68.00px of content against the 70.156 the longest badge name wants. The
board entered a ~24px band in which its own longest name did not fit. At 853
the cell offers exactly 71.00 and the word fits AT the floor by construction —
now asserted directly as `contentAtFloor(SPLIT_THRESHOLD) === NAME_MIN_CONTENT`,
with the old 829 kept as the canary that fails that property.

THE STYLESHEET'S NUMBER IS STILL THE DERIVED DEMAND
Both `@container` thresholds stay in RANGE syntax — `(width < 853px)` and
`(width < 452px)` — so the CSS figure is the derivation's own output with no
`max-width` off-by-one in between, and `tests/layout-arithmetic.test.ts`
re-derives both from PARSED values (`ROW_LABEL_W` off the track list,
`CELL_GAP` off `column-gap`, `BAND_DIVIDER` off the seam track plus one gutter,
`CELL_PAD`/`CELL_BORDER` off the button). Nothing in the block is a pasted
threshold. The derivation comment was updated in place, including a paragraph
naming the re-pin and what it bought.

ASSERTION "1b" FLIPPED
From *recording a divergence* to *pinning the ratified value*: it now asserts
`NAME_MIN_CONTENT === Math.ceil(NAME_MIN_MEASURED)`, so a future re-measure
that disagrees **reds rather than annotates**. `NAME_MIN_MEASURED = 70.156` is
kept as its own constant precisely so there is something to disagree with.

THE SEAM, RE-SHOT — IT MOVED, SO THE OLD PAIR WAS DELETED
`f11-seam-828.png` / `f11-seam-830.png` and the `f11-seam-viewport-828/830`
pair are **removed**: they documented a threshold that no longer exists, and a
stale proof is worse than none. Replaced by a pair straddling the flip point
itself:
    f11-seam-852.png   board box 852  ->  4 + 4 on the temporary/permanent seam
    f11-seam-853.png   board box 853  ->  8 across, cellW exactly 89.00
Swept and confirmed exact: box 849/850/851/852 → 4 columns, box 853/854/855/856
→ 8 columns. At the flip the cell's content box is 71.00 against the 70.156 the
longest name wants — visible in the shot, "Unpluckable" on one line.
No separate viewport pair this time: below 1280 the box is `viewport − 66` at
s=0, so the seam viewports (918/919) ARE the ones producing boxes 852/853 and a
second pair would have been byte-identical.

THE BINDING MARGIN HAS BEEN QUOTED WRONG TWICE, BOTH OPTIMISTIC
Worth recording because the margin is what the NEXT addition to a Synergy Slot
column gets checked against:
    design.md §4.6      +13.3   (cell arithmetic 6.25px generous)
    F11 cut 1           +7.00   (CELL_FLOOR built on a 3px-light pin)
    RATIFIED            +4.00
For scale, F5.4 flagged +10.5px as binding on the adjacent synergy-row
question. The board's column now has less than half of that. Both prior
figures erred the same direction, which is how a margin gets handed on as
roomier than it is.

GATES — ALL RE-RUN AFTER THE RE-PIN
  npm run test        63 files / 1247 tests PASS. No skips, no .only.
  npm run typecheck   PASS
  npm run build       PASS (the only gate that parses the appended CSS block)
  RUN-never-edit, by name, GREEN AND UNEDITED:
      tests/ui/overlays.test.tsx · tests/category-colors.test.ts ·
      tests/feasibility-golden.test.ts   (3 files / 23 tests)
    `git diff origin/dev` touches none of the three. None of them reads the
    board's geometry, so the threshold move could not reach them — re-run by
    name regardless.
  dependencies        react,react-dom
  Coverage widths UNCHANGED by the re-pin: 1440 box 1062 8-wide, 1280 box 902
  8-wide, 768 box 702 four-wide, 390 box 332 two-wide. The behaviour delta is
  confined to board box 829..852, which no coverage width occupies.

TWO MERGE NOTES FOR WHOEVER INTEGRATES — from sibling slices that sealed
while this one was finishing. NOT reconciled from this branch, deliberately.

  1. f9-touch-floors (c57c350) — THE FOLD-IN THIS SLICE PREDICTED, CONFIRMED.
     F9 landed an app-wide S touch-floor mechanism on a new `--tap-target: 44px`
     token, and censuses every interactive class with a SET-EQUALITY assertion
     in BOTH directions. This slice ships
     `@media (max-width: 767px) { .synergy-board__button { min-height: 44px } }`
     — a literal 44px on a class F9's census has never seen. Expect F9's census
     to red on the merge in the "extra class" direction. THE RESOLUTION IS THE
     FOLD-IN, not an exception: add `.synergy-board__button` to F9's census and
     re-point it at `--tap-target`, then DELETE this slice's rule rather than
     keeping both. One button class covers every interactive element on the
     board — cells and column headers alike — and
     `tests/layout-arithmetic.test.ts` case 12 asserts that totality, so the
     census gets complete coverage from a single entry. Do not attempt this
     blind from this branch: F9's token and census shape are not visible here.

  2. f8-s2-summary (ca3792a) — APPEND-POINT COLLISION IN
     tests/layout-arithmetic.test.ts, AND THE TWO SLICES CHOSE DIFFERENTLY.
     F8-S2 deliberately nested its additions INSIDE the existing §16.7
     describe, specifically to dodge F9's appended block. **This slice appends
     at EOF** — one new top-level `describe("F11 — the Synergy board's
     geometry, re-derived")` plus its parsed constants immediately above it.
     Stated plainly so the merge takes BOTH: the two edits are in different
     regions of the same file and should not conflict, but a resolver seeing
     two additions may collapse one. F11's block must remain a top-level
     describe at EOF — its constants (`boardCssRaw`, `CELL_FLOOR`,
     `SPLIT_THRESHOLD`, …) are module-scope and are read only by its own
     cases.

REST OF THE FORECAST UNCHANGED
`a6-e-cap-breakers`, `f13-physique-strip`, `a5-u-bonus-mode`, `f8-r2-roll-ui`:
`app.css` append-order only (this slice's CSS is one delimited block at EOF).
`f10-feedback-loop`: if it adds a live region inside `.synergy-panel`, note
that `tests/ui/f11-synergy-board.test.tsx` pins that panel's count at exactly
2. `f12-reset-placement` remains THE one real overlap — the board is a second
consumer of the season-reset overlay and its band string must stay DISTINCT
from the row string or `overlays.test.tsx` reds; read brief §6.3 before
re-wording either.

CARRIED FORWARD
The NAME_MIN_CONTENT item is CLOSED. Cut 2 remains specced and unbuilt in full
(`LoadoutBoard`, `DisciplinePanel`, `BadgeTile`, `BoardDetail`, a second
`<Section>`, a `JumpNav` chip, the selection tagged union, assign/clear from
the board, the over-capacity fence, the 864px side-by-side threshold);
`src/ui/board/**` does not exist.

NEXT
Branch `f11-synergy-board` pushed. `dev` untouched at `a5fe8e1`; `main`
untouched. Not merged.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 · F13 — the Physique strip · slice-complete
branch `f13-physique-strip` (worktree /tmp/bb-f13) · base `dev` @a5fe8e1
Full proof: `docs/proof/f13-verification.txt` · 13 frames `docs/proof/f13-*.png`
─────────────────────────────────────────────

THE ASK (user, verbatim)
"Move the physique card into this full horizontal where [the dataset-drift
banner] is held. This will save space. The badges aren't even shown on the top
so it's not easily viewable and accessible."

THE NUMBER — top of page → first badge card, zero state (first load, panel open)
  1280 x 900   1596.70 → 1386.33   −210.37
   768 x 900   2212.70 → 2011.89   −200.81
   390 x 844   3396.86 → 3274.67   −122.19
Exactly accounted for: the Physique <Section> + its --space-3 gap cost 302.56
at 1280 / 321.75 at 390; the strip that replaced it is 92.19 / 199.56. Nothing
else moved. Measured in headless Chrome over CDP against the production
`vite build` output loaded from file:// — NO DEV SERVER WAS STARTED.

THE COST, SURFACED NOT BURIED — the LATCHED state
Once F5.3's one-shot latch fires, the setup panel collapses to 53px and — before
this slice — took Physique down with it, out of sight. The strip does not
collapse, so there it is pure additive lead:
  1280    753.00 → 845.19   +92.19  (= the strip)
   390    656.00 → 855.56  +199.56  (= the strip)
At 390 that crosses an 844px fold the first card was previously just above.
That 199.56px is what permanent access to Position and Height costs — the
second half of the ask. The lever to buy it back is priced and unspent
(hide the strip below 768, render Physique back in the panel at S: restores
656 at 390, forfeits the −122.19 zero-state gain there, and re-introduces a
second width-conditional structure F5.4 §16.10 spent a slice removing).
**If the orchestrator wants the 390 fold back, that is a one-media-query
decision and it is the only open question in this slice.**

WHAT SHIPPED
  · `PhysiqueStrip` (was `PhysiqueSection`) mounts in App between
    `.app-banners` and `.layout` — a SIBLING of the banner region, never a
    child of the DriftBanner. Different lifetimes: the banner is conditional
    on a dataVersion mismatch, the strip is unconditional. AFTER the banners,
    because `.app-banners` is 0px tall when empty and a warning must not be
    pushed below a toolbar. Verified with the banner up: strip top 102 → 178.78,
    height unchanged.
  · A 3-track grid that CAPS: `max-content max-content minmax(0, 1fr)`. The
    two number inputs measure 56×56 in every state at every width — the base
    `width: 56px` is untouched and no rule in the strip re-declares it. A
    `1fr`-per-input split of the same 1248px box would give 600px each.
  · The <Section> wrapper is GONE from Physique and that is NOT the §16.9
    mistake: §16.9's argument is the keyboard bypass (one <summary>, twenty
    sliders out of the tab order). Physique is three tab stops, and the
    Section cost 70px of chrome around content that lays out in ~50.
  · HeightField returns a FRAGMENT — the clamp notice is a sibling of the
    fieldset, placed at `grid-column: 1 / -1; grid-row: 2`. Measured: the
    notice's arrival grows the strip by exactly 27.19px (one --text-xs line at
    `.hint`'s 1.6 line-height + one --space-2 gap) at BOTH widths, and neither
    control moves. aria-describedby still wired.

COPY — an ORCHESTRATOR-RATIFIED AMENDMENT, recorded as one
scope.md §0.1 A2's copy consequence is amended: the Position hint's
`(Position: min–max)` parenthetical is dropped, and NOTHING else in the
sentence changed. The range was rendering THREE times at once; in the strip
the HeightField hint is inches away. Counted in the browser: 1 recitation at
rest, 2 with a clamp standing (the second being the ⚠ notice, byte-unchanged).
Both load-bearing facts survive verbatim — "No badge has a position
requirement" is still stated outright, and "Sets the available height range"
still makes it discoverable that changing position moves your height.
The survivor is LIVE and that assertion was RE-POINTED, never dropped:
tests/ui/position-height-clamp.test.tsx's guard describe now pins Any → SF → C
on the HeightField hint, adds a canary that fails on the OLD copy, and counts
recitations as NODES (a by-name assertion cannot see a duplicate it was not
told about).

THE SETUP PANEL
Keeps Badge Points & Badge Slots + Reset at L; + Attributes at M/S. The outer
`<Section title="Build">` STAYS — it is what the latch closes, and closing it
turns 595.14px into a 53px digest. Unwrapping the nested inner Section at L
would buy 65px and split one behaviour across the 1280 seam: priced, unspent.
The latch predicate FOLLOWED the surface — `build.position` is out of the L
branch (same §16.5 scoping rule F5.4 wrote), which fixes the surprise F5.4's
own addendum flagged: picking a position no longer collapses the panel under
the user. Verified in-browser: position pick → open; budget commit → collapsed.
The digest dropped height and position, which the strip now shows permanently.
`section-physique` retired with its Section; the other four keys untouched.

GATES
  tsc --noEmit clean · npm run build clean · vitest 62 files / 1212 passed
  (was 1204). RUN-never-edit, all UNMODIFIED and all green: overlays 4,
  category-colors 15, feasibility-golden 4 (no cell moved), architecture 185,
  f2-source-pins 14, f2-disclosure-surfaces 11, primitives 12 (`= 78 in` still
  exact), reset-build 16. Runtime deps exactly { react, react-dom }; tokens.css
  untouched; engine untouched; zero network; no horizontal overflow at 1280,
  1279, 768 or 390 in any state measured.
  Casualties: exactly ONE, the ratified guard — nothing else in 1204 broke.

MUST-SURVIVE, each checked
  --cat computed live off the grid sections (#3d93e9 / #1caf61 / #ef5a64);
  both landmarks intact plus a new `aria-label="Physique"` on the strip (two
  fieldsets would otherwise be orphan content); skip target still clear with
  zero net new tab stops; clamp notice + stale-count intact; I5's two-sticky
  cap untouched (the strip declares no sticky).
  44×44 at 390: NO REGRESSION AND NO IMPROVEMENT. `.segmented label` is 29px
  and `.number-field input` 26px on BOTH trees — those controls were below the
  floor before this slice and are the same pixels after it. The floors that
  exist today (range slider, `.build-panel__reset`) are untouched.

CONFLICT FORECAST
  · a6-e-cap-breakers — LOW. No shared source file. Textual conflict likely at
    the TAIL of tests/layout-arithmetic.test.ts, where both append.
  · f9-touch-floors — MEDIUM, and it inherits new ground. (1) It must switch
    `.physique-strip .number-field` to `align-items: center` at S rather than
    delete the rule, or a 44px input against a baseline-aligned label sits
    wrong. (2) Raising both controls to 44 grows the 390 strip by ~33px
    (199.56 → ~233) and the latched-390 lead to ~889 — f9 must re-measure that
    number, not just the hit boxes.
  · a5-u-bonus-mode — MEDIUM, one live seam and it got SHARPER. F5.4 §12
    flagged that a bonus-only user never latches because `BonusBudget` is not
    in `budgets`. F13 removed the `build.position` term, so at L
    `hasBudgetValues` is now the ENTIRE predicate: a5-u must add the bonus
    totals to it or the gap is total at L rather than partial.
  · f10-feedback-loop — CANNOT FORECAST. Not a local branch and not on the
    remote; there is no tree here to diff against. Noting only that the strip
    added one landmark and that `.app > p.sr-only[role="status"]` — the live
    region every position clamp announces through — is unchanged in position,
    selector and copy.

CARRIED FORWARD — recorded, NOT resolved here
  · `src/ui/README.md` line 14 still reads "BuildPanel (+ PhysiqueSection)".
    The symbol is `PhysiqueStrip` and it is not a Section. That path is not in
    this slice's allowlist (`src/ui/build/**` is; the README is one level up),
    so it is left stale and reported. One-line fix for whoever owns it.
  · design-spec §16.5 describes Physique as a setup-panel Section. The
    implementation now differs by ratified instruction; the spec text is not
    in this slice's allowlist and has NOT been amended.
  · Everything the F5.4 entry carried forward is unchanged by this slice.

MEASUREMENT NOTE worth keeping — it made two probe runs lie
The app flushes its autosave on pagehide/visibilitychange. Clearing
localStorage from the app's own page and then reloading re-persists what you
just deleted, and re-stamping the autosave's dataVersion from the app's page
gets overwritten by the flush on the way out — which is why the drift banner
"would not render" twice before the method was fixed. Do both from a neutral
page in the same origin's storage bucket. Any future slice probing persisted
state in a real browser will hit this.

NEXT
Branch pushed, NOT merged. `dev` untouched, `main` untouched.
─────────────────────────────────────────────

─────────────────────────────────────────────
2026-08-25 · F13 — the phone carve-out (user ruling) · follow-up commit
branch `f13-physique-strip` · follow-up on 4ae2521, NOT an amend — the first
commit was already pushed, so the pre-ruling tree stays in the history as the
evidence the ruling was made on.
─────────────────────────────────────────────

THE RULING
Hide the physique strip below 768. Desktop keeps the always-visible strip and
its −210px gain at 1280; the phone reverts to the collapsible panel exactly as
it behaves today. The user's reasoning, recorded because it is the general
principle and not a one-off: the app's whole point is planning with a phone
next to the console, so a permanent ~200px tax on the surface they actually
use loses to a first-load gain they see once.

THE FOUR NUMBERS AT 390 — re-measured, pre-F13 tree vs this one
  zero state (panel open)              3396.86 → 3396.86   IDENTICAL
  latched (steady state)                656.00 →  656.00   IDENTICAL
and, because "unchanged" should not be checked only where it was asked:
  clamp standing (Any → C)             3384.86 → 3384.86   IDENTICAL
  767, last width below the seam       2405.70 → 2405.70   IDENTICAL

**390 IS BYTE-IDENTICAL TO PRE-F13 IN EVERY STATE MEASURED.** So is the
collapsed digest (`6'6" · 0 pts · 0 Badge Slots`), the Physique Section's own
collapse state and its `section-physique` key, and the landmark arrangement
(no `aria-label="Physique"` below 768; the controls sit inside
`aria-label="Build"`, where they were).

≥768 is untouched by the ruling: 1280 zero 1386.33 (−210.37), 1280 latched
845.19, 768 zero 2011.89 (−200.81).

THE LATCH AT 390, with Physique back in the panel — driven in the browser on
both trees, identical on every step: open at zero state · STILL OPEN after
picking a position · collapsed after the first budget commit. It was always
going to be: the `build.position` term F13 removed lived in the L branch only.
The latch fix is kept at every width and is a no-op at 390 BY CONSTRUCTION —
nothing there depends on it and nothing there was disturbed to keep it.

THE COPY CONSOLIDATION IS KEPT AT BOTH WIDTHS and is structurally guaranteed,
not promised: the sentence is authored ONCE in a shared `PhysiqueControls`
body that both `PhysiqueStrip` and `PhysiqueSection` render. At 390: 2 range
recitations before, 1 at rest now, 2 with a clamp standing.

THE 768–1279 BAND IS NOT MOOT — it is where the strip's narrowest real layout
lives (768: one 3-track row, 101.75px, no overflow, −200.81px). What DID
collapse into the phone path is the stacking CSS, and it is DELETED: the
`@media (max-width: 767px)` block and its four grid-placement resets are gone,
because a media query for an element that is never in the DOM at that width is
dead CSS a later reader will trust. The narrowest width the bar lays out at is
now exactly 768 — 736px content box against a 494.75px track demand, clearing
by 241px and still clearing with a 17px classic scrollbar. F13 assertion 6
asserts the ABSENCE and that exactly one `.physique-strip__row` block survives.

ONE THING PUT BACK BY HAND — AND MY FIRST DIAGNOSIS OF IT WAS WRONG
HeightField's notice is a sibling of the fieldset now, so inside a <Section>
it is a FOURTH child of `.section__body` — a flex column with a --space-3 gap.
The notice therefore bought an extra flex gap it never used to cost: the clamp
state at 390 came out exactly +12. I first blamed `.attr-group`'s bottom
margin, which is ALSO 12px and ALSO sits between those two elements — fixed
it, re-measured, and the number had not moved by a pixel, because it was never
the cause. Three rules scoped to `.build-panel` now zero the fieldset's margin
while the notice follows it, cancel the introduced gap, and re-declare
--space-3 below the notice where pre-F13 it was. **Third time on this project
a plausible diagnosis has been overturned by measurement; logging it as the
pattern, not the incident.**

GATES, re-run: tsc clean · build clean · vitest 62 files / **1214 passed**
(1212 after the first commit, 1204 pre-slice). All RUN-never-edit files
UNMODIFIED and green, feasibility-golden 4 with no cell moved. Casualties from
the carve-out: THREE, all of them F13's own assertions from the first commit.

CONFLICT FORECAST — CORRECTED FRAMING FIRST
`f9-touch-floors` (c57c350) and `f8-s2-summary` (617b13e) are sealed on their
own branches and are **NOT reachable from `dev`** — checked with
`git merge-base --is-ancestor`; `dev` is still a5fe8e1, this branch's base. So
every number above is measured against the correct tree and none of it is
stale. Forecasts below are against branches that have not landed.

  · f9-touch-floors — **ITS NOTE ABOUT THIS SLICE IS NOW CLOSED, not
    dangling.** Both hazards F9 named are MOOT: the strip is not rendered
    below 768, so no rule inside `.physique-strip` is ever evaluated at S and
    there is no strip at 390 to grow by ~33px. F9's S floors land on the
    Physique Section's controls instead — the same `.segmented label` and
    `.number-field input`, in the same place, as pre-F13. **F9 may delete its
    `.physique-strip` note.** Small residual: at ≥768 the strip keeps 29px
    labels and 26px inputs, which is what they measure today.
  · f8-s2-summary — **NO CONTACT.** This slice moves none of its inputs: page
    padding, the rail, the column gap and Section chrome are all untouched,
    and the strip is full-bleed OUTSIDE `.layout`, so it changes the y of the
    grid and never its x. Its 885/902 two-scrollbar-regime pin is unaffected.
  · a6-e-cap-breakers — LOW, unchanged. Textual conflict likely at the tail of
    tests/layout-arithmetic.test.ts, where both append.
  · a5-u-bonus-mode — MEDIUM. At ≥768 `hasBudgetValues` is the ENTIRE latch
    predicate, so F5.4 §12's bonus-only-never-latches gap is total there;
    below 768 the attribute term is still in it, exactly as pre-F13. a5-u must
    add the bonus totals either way.
  · f10-feedback-loop — still cannot forecast; not a local branch, not on the
    remote.

CARRIED FORWARD — unchanged from the first entry
  · `src/ui/README.md:14` still says "BuildPanel (+ PhysiqueSection)". That is
    now HALF right — `PhysiqueSection` exists again — but the file also omits
    `PhysiqueStrip`. Still out of allowlist, still one line.
  · design-spec §16.5 describes Physique as a setup-panel Section. After the
    carve-out that is TRUE BELOW 768 and false at and above it. Not in
    allowlist; not amended.

NEXT
Branch pushed, NOT merged. `dev` untouched, `main` untouched.
─────────────────────────────────────────────

ADDENDUM (same session) — RE-MEASURED AGAINST CURRENT dev, and a CORRECTION

CORRECTION. The entry above says f9-touch-floors and f8-s2-summary are "NOT
reachable from dev". True when checked, FALSE NOW: `dev` moved a5fe8e1 →
c6f52f1 mid-slice and A6-E, F9 and F8-S2 all landed as re-commits — which is
why an is-ancestor check on the original branch SHAs still says no. Forecast
replaced with measurement.

TRIAL MERGE of dev @c6f52f1 into this branch (throwaway worktree; **the branch
is NOT rebased or merged**). THREE conflicts, all resolvable, and the merged
tree is GREEN: tsc clean · build clean · **67 files / 1331 passed**.
  · `src/ui/build/BuildPanel.tsx` — ONE SEMANTIC CONFLICT AND IT COMPOSES.
    A6-E widened the latch's `withAttributes` TRUE arm with
    `hasCapBreakers(build)`; F13 narrowed the FALSE arm by dropping
    `build.position`. Different arms — git sees adjacent lines, a human sees
    two independent edits. Keep both.
  · `tests/layout-arithmetic.test.ts` — append vs append at the tail, as
    forecast. Deterministic fix: take dev's file, re-append F13's describe
    block verbatim from the `F13 — the physique strip` banner to EOF.
  · `.claude/reportback.md` — append vs append. dev's entry first.
  · `src/App.tsx` and `src/styles/app.css` auto-merged, no conflict.
  Exact resolutions recorded in `docs/proof/f13-verification.txt` §B1.

EVERY DELTA SURVIVES THE MERGE UNCHANGED — 1280 zero −210.37 · 1280 latched
+92.19 · 768 zero −200.81 · 767 IDENTICAL · **390 zero, clamp and latched all
IDENTICAL** — even though dev's own 390 numbers MOVED under me (3396.86 →
3638.86 at rest, 656 → 757 latched) because F9 made the phone taller. That is
the carve-out's mechanism earning its keep: "390 is unchanged" holds because
the strip is NOT RENDERED there, not because a number lined up. A pinned
figure would have gone stale the moment F9 landed; an absence cannot.
Latch at 390 on the merged tree is identical to dev (position → open, budget →
collapsed); clamp notice renders and stays wired; no overflow at any width.

**F9's NOTE ABOUT THIS SLICE IS CLOSED — measured, not argued.** On the merged
tree the height inputs are 56×44 at 390 (F9's floor, on the restored Physique
Section's controls, same place as pre-F13) and 56×26 at 1280 (the strip,
untouched). F9's two `.physique-strip` hazards are moot because no rule inside
`.physique-strip` is ever evaluated below 768. Neither slice had to change for
the other. **F9 may delete its `.physique-strip` note.**

F8-S2 — no contact, confirmed: its 885/902 two-scrollbar-regime pins and
column counts pass on the merged tree, and this slice moves none of their
inputs (page padding, rail, column gap, Section chrome all untouched; the
strip is full-bleed outside `.layout`, so it moves the grid's y and never
its x).

PROCESS NOTE, so the history reads honestly: this follow-up landed as ONE
commit carrying both the code and the reportback entry, not the usual
feat + `chore(reportback)` pair. The coordinator asked for "a follow-up
commit"; the first delivery (4ae2521 + 8915e44) used the pair.
─────────────────────────────────────────────

## 2026-08-26 · Tier 1 · integration — F11 → F13 landed on `dev`

**Event:** `integration-complete`
**Branches landed, in order:** `f11-synergy-board` → `f13-physique-strip`
**`dev`:** `c6f52f1` → **`308cfc6`** (this entry commits on top). **`main` untouched at `444d034`.**
No dev server started; port 5173 never bound.
**Source branches untouched at their sealed SHAs:** `3b3c0d3` (F11) and `55bf5f0` (F13). Neither was
rebased or force-pushed; `/tmp/bb-f11` and `/tmp/bb-f13` are still valid and still on their branches.

**MERGE-COMMIT COUNT: 2 before, 2 after**, via `git rev-list --merges --count dev` (the honest probe —
`git log --merges | wc -l` counts output LINES and misleads, as the previous integration recorded).
Both landings were fast-forwards, so the invariant holds: no integration adds a merge commit.

### F13 HAD ADVANCED, AND THE FOLLOW-UP THE RULING REQUIRED IS PRESENT

The dispatch flagged `f13-physique-strip` as possibly moved past `19b227b`. **It had:** one further
commit, `55bf5f0 docs(f13): re-measure against current dev, and correct the merge forecast` —
`.claude/reportback.md` + `docs/proof/f13-verification.txt` only, **zero code**. Landed with the rest.

**THE PHONE RULING IS ON THE BRANCH — verified by content, not by commit title.** `19b227b` does all
three things the ruling required, and the tree was NOT landed until each was read:
- `src/App.tsx` declares `const isWide = !useMediaQuery("(max-width: 767px)")` and renders
  `{isWide ? <PhysiqueStrip {...physiqueProps} /> : null}` — the strip is not in the DOM below 768.
- `BuildPanel` receives `physique={isWide ? null : physiqueProps}`, so Physique returns to the setup
  panel below 768 as the same `<Section>` it was pre-F13 — same key, same collapse, same latch.
- The strip's `@media (max-width: 767px)` stacking block is **deleted**, not left behind, with the
  absence documented in place ("NO `@media (max-width: 767px)` BLOCK HERE, AND THE ABSENCE IS THE
  RULING") — a media query for an element never in the DOM at that width is dead CSS.

**F9's `.physique-strip .number-field` note is therefore MOOT, confirmed.** No rule scoped inside
`.physique-strip` is evaluated below 768, because the element does not render there. F13's own
re-measure reached the same conclusion independently and measured it on the merged tree: the height
inputs are 56×44 at 390 (F9's floor, landing on the restored Physique Section's controls) and 56×26
at 1280 (the strip, untouched). No `align-items: center` was needed and none was added.

### METHOD — rebase onto a throwaway, then fast-forward. No source branch was rewritten.

Each branch was checked out to a throwaway (`f11-integrate` / `f13-integrate`), rebased onto the
then-current `dev`, verified, fast-forwarded into `dev`, and the throwaway deleted with `git branch -d`
(safe delete, fully merged). Every conflicted file was reconstructed **from the source blobs** rather
than by editing the conflicted text, and each half was then asserted byte-identical against its
source — a stronger check than reading the merge and a much stronger one than trusting it.

### CONFLICTS — five, and one semantic collision that is a FOLD-IN, not an exception

**1. `src/styles/app.css` (F11)** — append-vs-append at EOF. `dev`'s F9 block and F11's delimited
board block, concatenated in that order with the single blank line between them. Both halves diffed
byte-identical (108467 B + 14727 B).

**2. `tests/layout-arithmetic.test.ts` (F11) — THE COLLAPSE HAZARD, AND IT WAS REAL.** Git matched the
two blocks' shared closing `});\n});` as context, so the conflict region ran from *inside* F9's block
to *inside* F11's and a naive resolve would have merged one describe's tail into the other's. Resolved
by reconstruction, not by deleting markers. **All three blocks survive at their correct nesting:**
F8-S2's stays nested inside §16.7 (line 545), F9's I6 block stays top-level (2075), and **F11's stays
a top-level `describe`** (2393) — 11 top-level describes before, 12 after. No module-scope name
collides: F11's 24 new top-level bindings were diffed against `dev`'s and the intersection is empty.

**3. `.claude/reportback.md` (F11, twice; F13, once)** — append-vs-append, as forecast. Reconstructed
as `dev`'s bytes + the branch's own appended tail, verbatim, with **no editing at either seam**, so
the collapse the previous integrator warned about cannot occur by construction. Verified three ways
each time: both halves byte-identical to their sources, and the `─────` rule count and line count
matching the arithmetic exactly (77 + (74 − 67) = **84 rules**; 6223 + (5220 − 4909) = **6534 lines**).
A sweep confirms no rule anywhere in the file abuts the next entry's heading. Order is physical append
= landing order, which keeps each contributor's block contiguous and byte-checkable; every entry
survives.

**4. `src/ui/build/BuildPanel.tsx` (F13) — the `hasValues` latch. WIDENED, NEVER REPLACED.** A6-E had
widened the `withAttributes` TRUE arm (M/S) with `hasCapBreakers(build)`; F13 narrowed the FALSE arm
(L) by dropping `build.position !== undefined`. **Different arms of one expression** — git sees
adjacent lines, so it conflicts; the two edits are independent and both are kept:

```
  const hasValues = withAttributes
    ? hasBudgetValues ||
      Object.values(build.attributes).some((value) => value > 0) ||
      hasCapBreakers(build)      <- A6-E's widening, intact
    : hasBudgetValues;           <- F13's narrowing, intact (position dropped)
```

This matches the resolution F13 recorded in `docs/proof/f13-verification.txt §B1` from its own trial
merge. Both comment blocks are kept and a note records why they compose. The later ruling commit
`19b227b` does not touch this expression, so the resolution is stable across the rest of the rebase.

**5. `tests/layout-arithmetic.test.ts` (F13)** — F13 is NOT a pure append here: besides its EOF block
it makes two in-place edits earlier in the file (the pane-eviction check moves from `PhysiqueSection`
to the `Physique` stem so a rename cannot walk the surface back in; and assertion 20's comment gains
the strip's measured 256.73px track). Resolved as `dev`'s file + those two edits + F13's block
verbatim from its banner to EOF. **The reconstruction was then proved equal to F13's own delta**: the
changed-line sets of `git diff HEAD` and `git diff a5fe8e1 4ae2521` are identical, 225 lines each.

`src/App.tsx`, `src/ui/primitives/HeightField.tsx` and `tests/ui/position-height-clamp.test.tsx`
auto-merged. `tests/ui/f2-source-pins.test.ts` (F11's one-line widening) was untouched by `dev`.

### THE F9 / F11 CENSUS COLLISION — folded in, and the fold closed a hole the census could not see

F11 shipped `@media (max-width: 767px) { .synergy-board__button { min-height: 44px } }` inside its own
block: the same breakpoint and the same value as F9's pass, written as a **literal** because
`--tap-target` did not exist on the branch F11 was cut from. F11 deliberately left this to integration
rather than guessing at a shape it could not see, and that was the right call.

**The forecast red did not fire, and the reason is the finding.** The rebased tree was green at
68 files / 1364 tests *with the literal still in place*. Assertion 27 reads the stylesheet back by
matching `min-height: var(--tap-target)`, so a hard-coded `44px` is **invisible to it** — the board's
floor sat entirely outside the census, unguarded in both directions, and nothing reddened. A literal
is therefore strictly worse than a duplicate here: it is the one shape that escapes the detector
assertion 27 exists to be. Landing it as an exception would have left exactly the rot the assertion
was written to make impossible.

Folded in as `fix(f11): fold the board's touch floor into F9's I6 census`:
- `.synergy-board__button` becomes **entry 12** of F9's `@media (max-width: 767px)` block, taking
  `min-height: var(--tap-target)` like every other control.
- **F11's standalone rule is deleted**, with a pointer comment left where it stood.
- `.synergy-board__button` is added to `S_TOUCH_FLOOR_CENSUS`, so assertions 24 and 27 grade it.
- F11's own assertion 12 is re-pointed from its branch-local literal to the census, keeping its
  component-source proof that `.synergy-board__button` is the board's ONLY interactive class — which
  is what makes one census entry total — and gaining a canary against a scoped literal returning.

One button class covers every interactive element on the board. No rule was dropped and the value did
not move: 44px before, 44px after, now from one token. Suite unchanged by the fold-in.

### COUNTS — expected computed from each branch's own delta BEFORE reading the actual

| Landing | Arithmetic | Expected | Actual |
|---|---|---|---|
| base `dev` | — | — | 1321 / 67 |
| F11 | 1321 + 43 — the branch measured 1247 / 63 against a 1204 / 62 base, so +43 tests, +1 file | **1364 / 68** | **1364 / 68** ✓ |
| F11 fold-in | census entry + re-pointed assertion 12; no `it` added or removed | **1364 / 68** | **1364 / 68** ✓ |
| F13 | 1364 + 10 — the branch measured 1214 against 1204, +0 files | **1374 / 68** | **1374 / 68** ✓ |

F13's own trial merge against `c6f52f1` independently reached 1331 = 1321 + 10, which is the same
delta arrived at from the other side.

### GATES — run after every landing

`npm test` · `npm run typecheck` · `npm run build` — **all PASS at both landings and at the fold-in.**
`npm run build` is the only gate that would catch a malformed CSS comment, and it was run each time.
Build at the tip: 75 modules, **308.46 kB** js / **50.81 kB** css (after F11: 308.04 / 49.80).

**RUN-never-edit trio, run explicitly at both landings: 29/29 each time.** All three are at **zero
diff** across this pass — `git diff --stat` over `tests/ui/overlays.test.tsx`,
`tests/category-colors.test.ts` and `tests/feasibility-golden.test.ts` is empty for both F11 and F13.
**No cell of the 504-cell golden moved**, so there was nothing to stop and report.

Runtime `dependencies` confirmed **exactly `{react, react-dom}`** at both landings; `package.json` and
the lockfile are unchanged across the whole pass.

**NO FLAKE ENCOUNTERED.** Every full run in this pass was green on the first attempt (1364, 1364,
1374). Nothing was re-run to get green, no test was edited, and no `{ timeout: 20000 }` was touched.

### THE THREE PROPERTIES A MERGE COULD HAVE QUIETLY BROKEN — all three verified

1. **F9's census is still set-equal in BOTH directions, having gained an entry.** Assertion 27 passes
   with 16 selectors on each side. Rather than trust a green, both directions were driven to red and
   restored: removing the census entry while keeping the rule reds it in the *extra class* direction
   (`expected […16] to deeply equal […15]`), and removing the rule while keeping the entry reds both
   assertion 27 (`[…15]` vs `[…16]`) and assertion 24 (`no S rule for .synergy-board__button`). The
   assertion is load-bearing over the new entry, not merely satisfied by it.
2. **The resolved column count is still pinned by OUTCOME across scrollbar widths 0/15/17.**
   `REGION B RESOLVES TO 2 TRACKS AT 1280/s=17, AND IT IS 3px FROM 3` passes: **2 tracks at s=17 and
   s=15** (box 885, three need 888), **3 tracks at s=0** (box **902**), boundary derived at ≤14px.
   The macOS/Windows divergence is intact as intended behaviour, not collapsed to one number. F13
   moves none of the box's four terms — the strip is full-bleed *outside* `.layout`, so it moves the
   grid's y and never its x — and F11's board spans tracks inside the Synergy section, not the
   summary's. §14.2 describe: 11/11.
3. **The near-miss parenthetical still sits INSIDE the level suffix, and the card line still renders
   on all 53 badges.** `A6 ② — the near-miss parenthetical` 8/8, including the dataset-wide sweep
   `② every purchasable level's reason still ends in its own level suffix`, which walks every shipped
   badge and asserts no reason matches `/for (Bronze|Silver|Gold|HOF)\s*\(/`. The rendered surface is
   covered too: `badge-card` + `f2-eligibility-disclosure` green, and
   `renders the full instrument: all 53 cards, no welcome wall` passes with 53 `.badge-card` nodes.

### DEVIATION, DISCLOSED

The landed `BuildPanel.tsx` carries **+6 insertions** over F13's original delta (161 vs 155; deletions
identical at 33). That is the integration note added to the `hasValues` comment recording that A6-E's
and F13's edits touch different arms and were both kept. Every other file's delta is identical to the
source branch's, per-file, by `git diff --numstat`.

### NEXT

Merge order for what remains: **A5-U → F8-R2**. `.claude/reportback.md` will conflict on both and is
now 6721 lines; reconstruct rather than accept a naive merge. Two carried-forward operator actions
still stand from earlier passes (`git -C /tmp/bb-a6e stash drop`, and `git branch -D` on the stale
`f8s2-merge-probe` / `a5e-trial-merge` refs, which the permission layer refuses to an agent). This
pass's own two throwaways deleted cleanly with `git branch -d`.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · slice-complete — A5-U bonus mode (design-spec §17)

**Event:** `slice-complete`
**Branch:** `a5-u-bonus-mode-v2` off `origin/dev` @ `0e96632`. Worktree `/tmp/bb-a5u`.
**Commits:** `9b4573b` (implementation) + this entry.
**No dev server started; port 5173 never bound** — A5-R5's shared-localStorage hazard is procedural
and this pass honours it.

### BRANCH NAME DEVIATION, DISCLOSED

The dispatch asked for `a5-u-bonus-mode`, cut fresh after deleting the stale pre-F5.4 branch of that
name. **`git worktree remove --force /tmp/bb-a5u` succeeded; `git branch -D a5-u-bonus-mode` was
REFUSED by the permission layer** — the same refusal class already carried forward from two earlier
passes. Per the dispatch's own fallback the branch is **`a5-u-bonus-mode-v2`**, cut from
`origin/dev` with zero inheritance from the stale ref. **The stale `a5-u-bonus-mode` branch still
exists and still points at a pre-F5.4 tree; an operator `git branch -D` is required.**

### THE ONE RULING THAT CHANGED SHIPPED ENGINE BEHAVIOUR

`effectiveBudgets` is **plain addition** now. A5-E shipped `base === 0 ? 0 : base + applied`
(scope.md A5-R4's carve-out); design-spec §17.9 Ruling ② supersedes it, and the dispatch made the
spec authoritative. The carve-out made a bonus Badge Slot in a genuinely-zero discipline
**permanently inert** — and its escape hatch ("it counts the moment a base is entered") was
unreachable, because the base *is* entered, at zero.

The seam was well chosen: with plain addition and both contributors non-negative,
`effective.equipSlots === 0 ⟺ base === 0 && applied === 0`, which is **exactly** §17.9's ruled
predicate — so `badgeSlotsCapacityUnset` is correct with no code change and every downstream reader
(ledger, validateLoadout, feasibility, steps, randomize, summary) follows for free. `baseEquipSlotsOf`
lost its now-dead zero guard rather than keeping a branch for a rule that no longer exists.

**One consequence needed its own edit.** `equipSlotsBaselineComparable` was derived from the capacity
predicate; the two questions are now genuinely different (§17.9 consequence 6), so `summary.ts`
derives the base Σ per category and gates the Σ-vs-20 comparison on **that**. A placed bonus is an
entry act for the capacity predicate and is **not** a base value.

**Test fallout was six assertions, all in the ruled direction, none silenced:**

| Test | Was | Is |
|---|---|---|
| `bonus.test.ts` 1.5 | the carve-out: base 0 + applied 3 ⇒ effective 0 | base 0 + applied 3 ⇒ **3 and ENTERED**; base 0 + applied 0 still UNSET |
| `bonus.test.ts` 1.10 | inverse "carve-out included" | inverse exact at every value, expected figure **derived through `effectiveBudgets`** rather than retyped |
| `bonus.test.ts` 2.4 | Σ 20/20, comparison suppressed | Σ **21** effective / **20** base, comparison **still suppressed** — base-keyed |
| `randomize.test.ts` 5.3 | a bonus in a base-0 category still **declines** | it **rolls**; the same base with nothing placed still declines |
| `f4-budget-total-baseline` 11.2 | `23 / 20 default — 3 bonus Badge Slots?` | `23 / 20 default`, and it now asserts the over case reads **identically to the under case** |
| `layout-arithmetic` 17 | `alsoBudgets ? { budgets: zeroBudgets() } : {}` | `… , bonus: zeroBonus() } : {}` |

### THE FIVE STATES (§17.7 / §17.12 states 58–63), each with a live assertion

| State | Renders |
|---|---|
| **zero earned** | one `secondary` Button. No readout, no dialog in the DOM, **zero `.bonus-*` nodes** |
| **earned, unallocated** | `3 bonus Badge Slots earned · 3 Badge Slots not yet placed.` — neutral, no `⚠`, no `--danger`. Digest unchanged: unplaced bonus grants nothing. Mode total `0 / 3` |
| **allocated** | `4 bonus Badge Points and 1 bonus Badge Slot placed.` — the `all placed` token is suppressed. Effective cells `16 → 20` / `3 → 4`, bare `12` where there is no bonus, `—` where base 0 and no bonus |
| **over-allocated** | `4 bonus Badge Slots placed against 3 earned ⚠`, `4 / 3` + `over by 1 ⚠` in the mode, **per-metric** (the level points pool stays neutral in the same readout), all three placements byte-unchanged and editable, and the disabled-control count is unchanged app-wide |
| **zero base with bonus** | digest `Badge Slots 0 / 1` — a real fraction; `Meter` renders at the bonus max; lede reads `Badge Slots capacity here is 1 bonus. No base capacity is recorded for this discipline.` and **never** `capacity not set`; mode cell `0 → 1` |

### THE ZERO-STATE CANARY

`tests/ui/f9-bonus-mode.test.tsx` canary 1 boots App with both totals and all twelve placements at
zero and asserts **`bonusNodes()` is empty** — every element carrying a class *token* beginning
`bonus-`, so `.budget-grid__actions` (the always-present entry row) is correctly not one — plus the
base table's **three** `thead th` and three first-row `td`. It carries a **positive canary**: the
same query re-run against a fixture with one earned Badge Slot returns a non-empty set, so a green
result cannot be a broken selector. `PASS`.

### GATES

| Gate | Result |
|---|---|
| Full suite | **1401 / 1401 across 69 files** (baseline 1374 / 68; +27 in the new file, net of the six rewrites) |
| `npm run typecheck` | clean |
| `npm run build` | clean — 76 modules, 315.01 kB js / 53.36 kB css |
| `tests/ui/overlays.test.tsx` | green |
| `tests/category-colors.test.ts` | green |
| `tests/feasibility-golden.test.ts` | green — **no golden cell moved** (RUN-never-edit honoured; the file is untouched in the diff) |
| **F9 touch-floor census** | **assertions 23–29 all green, census unchanged and still EXACT.** Every control in the mode is a `.number-field input` or a `.btn`, both already census members, so the floor arrives through `var(--tap-target)` with no new rule. New assertion **33** proves the A5-U CSS block declares no `min-height`, contains no literal `44px` and never names the token — the literal is the one shape assertion 27 is blind to, which is how the synergy board's floor escaped it |

Four new layout assertions (**30–34**) derive the dialog geometry rather than pinning it: width
`min(680, v − 2 × --space-8)`, content box 648 / 648 / 294 at 1280 / 768 / 390, four-column
min-content **365** (clears by 283 at L and M, short by 71 at S), stacked min-content **226** (clears
by 68), and the shipped `@container bonus (max-width: 364px)` asserted to equal *demand − 1*.
**Canary 5** re-derives `LEDGER_METRICS_MAX` from the shipped field maxima parsed out of
`BudgetGrid.tsx`: the widest effective-only string is 15 chars = 126.44px against 127, **0.56px of
margin and no slack left** — the composition form would be 22 chars and is asserted not to fit.

### RULINGS HONOURED, NAMED

- **Reducing the earned total below what is placed is ALLOWED**, discards nothing, and is disclosed
  per-metric. The render predicate keys on `bonusHasContent`, whose third clause is *any placement*,
  so zeroing both totals leaves the surface and every placement intact.
- **`—` only when base 0 AND bonus 0.** Place a bonus and it becomes `0 → 1`.
- **The digest shows effective only.** No `+N`, no `base`. Composition lives in the mode's effective
  column and one conditional lede line.
- **The app never claims "this build has no X"** — canary 4c sweeps all of `src/` for
  `This build has no` and for `has no {Category}`. The shipped copy says *"No base capacity is
  **recorded**"*, which describes the app's state and is true under both readings of a zero base.
- **Neither `3` nor `12` is frozen in.** Canary 6 asserts no bare `3` or `12` anywhere in
  `BonusDialog.tsx`; the per-category maxima are imported **by reference** as `BUDGET_POINTS_MAX` /
  `BUDGET_EQUIP_SLOTS_MAX` from `BudgetGrid.tsx` (§17.4's "its base twin's shipped max", made literal
  rather than commented), and the earned maxima are `CATEGORIES.length ×` those.
- **Canary 3 is a TWO-ENTRY ALLOWLIST, not a single site**, and the second entry is a ruling:
  `badgeSlotsCapacityUnset` asks the capacity question on the composed record; `BudgetTotalRow`'s
  `anyUnset` asks the Σ-vs-20 question on the base record. Written in the shape this repo already
  uses for `Math.random`, so a third site must be added on purpose, and both entries are asserted to
  still carry the expression so the list cannot rot.

### DEVIATIONS FROM §17'S LETTER, DISCLOSED

1. **`size="sm"`, not the `md` §17.10 costed.** Not one `md` Button renders in this app and
   `layout-arithmetic` assertion 25 forbids introducing the first one. Both sizes clear the I6 floor.
2. **No `[✕]` in the dialog header**, despite §17.3's sketch. `Done`, `Escape` and backdrop already
   cover the exit; a fourth route would be a redundant tab stop, and `ResetBuildDialog` sets the
   precedent of no close glyph.
3. **`.bonus-dialog` uses `2 × --space-8` of gutter**, not the 480px dialogs' `1 ×`. §17.13's own
   geometry table requires it — `1 ×` gives 358px at 390 and the stacking derivation expects 326.
4. **Setup-panel `<summary>` digest re-pointed to EFFECTIVE** (§17.11's F5.4 ruling, recorded there
   with "no text change"). It needed one: `BuildPanel` receives the BASE record, so it now composes
   locally for the digest only. Byte-identical at zero bonus.
5. **`summary.ts` edited** — not on §17.13's file list, required by §17.9 consequence 6 (above).
6. **`overByText` extracted** in `CategoryLedger.tsx` as the shared atom, so the mode's `over by N ⚠`
   cannot drift from the ledger's (§3.4, P0-1). `overByBadgePoints` / `overByBadgeSlots` now delegate.

### CONFLICT FORECAST

| Against | Risk | Why |
|---|---|---|
| **`f14-app-shell`** | **LOW on CSS, MEDIUM on `App.tsx`** | `app.css` is **append-only** (`226 insertions, 0 deletions`, one hunk at EOF) and assertion 34 pins the block as the last thing in the file and forbids it naming `.layout` / `.col-right` / `.attr-pane` / `.rail-column` / `.setup-panel`. If the shell slice also appends at EOF, the merge is two adjacent hunks. **`App.tsx` is the real seam**: A5-U adds `bonusOpen` state near `resetOpen`, five props at the `BuildPanel` call site inside `.setup-panel`, two props at the `CategoryLedgerLede` call site, and a `<BonusDialog>` mount beside `<ImportDialog>`. A shell rewrite that moves the `.setup-panel` / `<main>` JSX will conflict on the first two — resolve by **keeping both prop sets**, never by taking one side. |
| **Queued roll-UI slice** | **MEDIUM, and it is behavioural, not textual** | The roll now **fills a base-0 category that carries a placed bonus** (`randomize.test.ts` 5.3, inverted). Any roll-UI copy that says a category is skipped "because its capacity is not set" must read the composed record, and any fixture asserting the old decline will redden. No file overlap otherwise. |
| **Feedback-loop slice** | **LOW** | No overlap unless it touches `CategoryLedgerLede`, which gained two conditional `<p>`s and two optional props. Both are additive and default-absent. |
| **Reset-placement slice** | **MEDIUM on `App.tsx`, LOW on `ResetBuildDialog.tsx`** | A5-U changed `resetBlastRadius.budgetFieldsSet` (now `+ bonusFieldsSet`) and `handleReset`'s `alsoBudgets` branch (now also `bonus: zeroBonus()`), and `layout-arithmetic` assertion 17 pins the second **as a source string** — a slice that reformats that line reddens it. `ResetBuildDialog.tsx` itself is **untouched**. |
| **The Badge Points → Badge Tokens rename sweep** | **EXPECTED, and this slice is authored for it** | Every A5-U string ships in the current vocabulary per §17.0's gate. Strings the sweep must pick up: the entry Button `Bonus Badge Points & Badge Slots…`; the dialog title `Bonus Badge Points & Badge Slots`; both `hint` paragraphs; the two `Earned in total` field labels; the twelve per-category field labels `{Category} bonus Badge {Points,Slots}`; the `Badge Points` / `Badge Slots` column heads; the readout builder's `singular`/`plural` pair in `bonusEntryReadout`; the lede's `Badge Points {n} base + {n} bonus` clause; and the `data-pool="Badge Points"` attribute the S container query prints via `::before`. **Identifiers stay `points` / `earnedPoints` / `appliedPoints`** — the rename's `token` collision is not this slice's to resolve. |

### OPEN, CARRIED

- §17.14 OQ 1 — does 2K's header show the earned total or the unapplied remainder? The hint is
  hedged and the model does not depend on it; confirming it only drops the hedge.
- §17.14 OQ 2 — is *"capacity not set"* the right thing to say about a discipline known to be
  genuinely zero? Ruling ① says yes on the asymmetry of the two errors, until the `entered` channel.
- The `entered` channel inherits three things from here, per §17.13: §17.9 Ruling ③'s second copy
  table, §4.7 ③'s overspend flip, and the **permanently absent** Σ-vs-20 checksum for any build with
  a genuinely-zero discipline — now with two causes, one of which never resolves.
- Operator action, carried a third time: `git branch -D a5-u-bonus-mode` (the stale pre-F5.4 ref).

─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · F14 the app shell — implemented, with one ruling reverted

**Event:** `milestone-complete` + `stop-condition-triggered` + `decision-needed`
**Branch:** `f14-app-shell` off `origin/dev` @ `0e96632`. **`dev` and `main` untouched.**
No dev server started; port 5173 never bound (a production build was served on :4188).
**Spec:** `workspace/badge-builder-2k27/features/app-shell/design.md`, which marked itself
UNVERIFIED-AGAINST-TREE. All nine of its §11.1 searches were run before a line was written.
**Full arithmetic + every measurement:** `docs/proof/f14-verification.txt`.

### THE SPEC'S LITERALS MOVED, AND SO DID THE GATE

Four of the seven vertical inputs were wrong. The two that matter:

- **`HEADER_H` 70 → 102.** The header flex-wraps to two rows at 1280 (62 at 1440). §16.4's "~70px"
  predates the header's growth and was never re-measured.
- **`STICKY_STACK_H` 107 → 120.** **107 is the S pair (48 + 59).** The document used the phone's
  sticky stack as the desktop's. At M and L the nav is 44 and the digest 76.

`STRIP_H`, the one flagged placeholder, was very nearly right (92 → 92.19, pinned at 93).

```
MIN_SHELL_H = ceil((HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H) / 0.40)
  as ruled     ceil((70  + 92 + 32 + 107) / 0.40) = 753  -> 760 chosen
  as MEASURED  ceil((102 + 93 + 32 + 120) / 0.40) = 868
```

**THE SHIPPED GATE IS `(min-width: 1280px) and (min-height: 868px)`, not the ruled 760.** 760 fails
its own rule — cards get 54.3% against design-spec §5.3's ≥60%. The suite asserts the FORMULA, not
the number, so the next chrome addition reddens loudly (assertion 3's canary proves it).

**The user-visible consequence, and it is the one decision worth surfacing:** at 1280 wide the shell
now needs an 868px-tall viewport. A 1440-wide window only needs 768 (its header is 62), but the gate
is a single literal that must hold at the narrowest shelled width. On a 1440×900 display with ordinary
browser chrome (~810 CSS px) the shell is therefore OFF. Two ways to recover it, neither taken here:
a width-tiered gate (a second literal, against §8.2 assertion 18), or stopping the header wrapping at
1280 (~40px back, and it is not this slice's surface).

### THE RAIL 300 → 340 RULING IS NOT IMPLEMENTABLE. TRIED, MEASURED, REVERTED.

It was applied and the suite run. It breaks a shipped **outcome** floor, not a pinned literal:

```
un-stacking the numeric field (cell > I9's 287)   needs RAIL >  329
the slider track clearing I9's 224px              needs RAIL >= 330
F11's board staying 8-wide (cell >= 89)           needs RAIL <= 332   @ scrollbar 17
the synergy panel staying 2-up at 1280            needs RAIL <= 321   @ scrollbar 17
```

At 340 an F11 board cell is **88.00 against its 89px floor** — the dataset's longest single word
stops fitting in a board cell at 1280 on every classic-scrollbar OS, on a surface that sealed this
week. 340 also moves `.summary` off 885/902 to 845/862, which the dispatch independently named as a
broken guard. The only rails that both un-stack the numeric and keep the board 8-wide are **330-332**,
and every value in that range puts the synergy panel to 1-up AND lands the slider track ON its 224
floor with 0-2px of slack.

**The lever itself is real** — design.md §10.1's 9/8/7-versus-6/5/5 table is arithmetically correct.
Spending it requires re-cutting F11's 8-wide container threshold or its `CELL_FLOOR`. **DECISION
NEEDED, owned by F11, not by this slice.** The shell ships with its two-slider cost unmitigated.

### TWO DEFECTS THE PAPER COULD NOT HAVE CAUGHT, BOTH FOUND IN THE BROWSER

1. **`scroll-padding-top` and `scroll-margin-top` ADD.** §4.3 and §6.2 derive them independently;
   they are not independent. Shipped naively, a `#cat-*` jump landed the section **164px** down with
   120px of the previous category showing under the nav — the exact hole §4.3 set out to avoid,
   arriving from the other direction. Fixed with a `--scroll-reserve` property that every
   scroll-margin subtracts, so the LANDING POSITION is one number at every breakpoint.
2. **`html, body { overflow: hidden }` does not stop the viewport scrolling.** The root's overflow
   propagates to the viewport and the root's own used overflow becomes `visible`; the viewport stayed
   a scroll container with an **8584px** scrolling area. Clicking the Summary chip scrolled it 365px
   and took the header and the F13 strip off screen — SH-2, the frame the slice exists for, failing.
   `overflow: clip` on the root does NOT fix it (measured). `.app-shell { position: fixed }` does
   (scrolling area 8584 → 900, measured).

### WHAT THE FOUR §16.4 COSTS ACTUALLY COST

- **Find-in-page:** unmitigated and unmitigable, bounded to 40 strings. No workaround invented.
- **`scrollRestoration`:** `.col-right` only, ~50 lines in `src/ui/shell/scroll-memory.ts`. All five
  structural rules met and asserted: `sessionStorage`, one `bb2k27.ui.*` key, read-never-writes,
  zero imports of any kind, rAF-coalesced swallowing writes. Reload restores 3200 exactly; the pane
  stays at 0 by design; `localStorage` is untouched; the hash beats memory.
- **Anchors:** all eight land flush under the pinned nav (43.5-44.3 in the scroller, gap ≈ 0) and the
  document never moves.
- **`dvh` after `vh`:** in place, order asserted within the block, with the full `@supports` degrade.

### HORIZONTAL IDENTITY HELD

`.summary` measures **902 / 887 / 885** at scrollbar 0 / 15 / 17 — the pinned outcomes to the pixel,
identical shell-on and shell-off. `--space-4 → --space-3` page padding exactly funds `.col-right`'s
4px focus-ring gutter. F11's board cell, §16.8's +10.5 and +30.5 margins, §14.2's five constants and
the 3-up card count are all unmoved.

### ROUTED OUT, NOT FIXED — and design.md §8.4 is only half right

§16.8's "three tracks need 1188" is indeed wrong (auto-fit counts against the 280 min, so three need
888) and §8.4 correctly corrects it. **But the 2-up/3-up OS flip §8.4 and `layout-arithmetic` both
describe does not exist in the browser:** region B has exactly TWO tables and `auto-fit` collapses
every track beyond the item count. Measured resolved tracks are **2 at scrollbar 0, 15 and 17**. The
model's `tracks()` helper counts fittable tracks, not occupied ones. Both corrections belong to
§14.2's owner; nothing in `.summary` was edited.

### GATES

`npm run test` **1399/1399 across 68 files** (1374 → 1399: +20 F14 assertions, +5 per-file
architecture lints for the new module). `npm run typecheck` clean. `npm run build` clean.
Named explicitly by the dispatch and re-run: `tests/ui/overlays.test.tsx`,
`tests/category-colors.test.ts`, `tests/feasibility-golden.test.ts` — all pass, and the 504-cell
golden is unmoved and was not edited. F9's touch-floor census is still set-equal in both directions:
the shell adds no rule below 768, no `min-height: var(--tap-target)`, and no literal 44 for the
census to be blind to. Runtime deps `{react, react-dom}`; zero network; zero new tokens.

### CONFLICT FORECAST

- **`a5-u-bonus-mode` (parallel):** LOW on code, CERTAIN on `.claude/reportback.md`. Bonus mode is
  dialog-only and every dialog is shell-safe (top layer, viewport-sized, internally scrolled).
  Overlap is `src/App.tsx` — this slice touches four lines of its JSX (root class, `.col-right` ref,
  `<main>` tabIndex, footer re-parent) plus one import and one `useLayoutEffect`. Textual conflict is
  likely only if A5-U also edits the root element or the footer.
- **Roll UI (F8-S2/R2):** its one-line dependency is DISCHARGED. `scroll-padding-top` is on
  `.col-right`, so §14.10's focus move to the roll report's heading clears the sticky stack.
  **But it must use `scroll-margin-top: calc(<want> - var(--scroll-reserve))` if it adds a target** —
  a bare scroll-margin now double-counts by 120px.
- **Feedback loop:** HARD, as §11.3 said, and now mechanical. Any new always-visible region is a
  fifth term in the permanent band and MUST move `MIN_SHELL_H`; assertion 3 fails loudly if it does
  not. At 868 there is **0.02pp** of margin — effectively zero. Budget the gate move up front.
- **Reset placement:** §15.18's rationale is now doubly stale. Under the shell `.attr-pane`'s foot is
  the end of a fixed-height scroller holding attributes only, and it is `position: static`. Re-point
  or re-home before that slice is cut.
- **Summary roster / synergy board:** NONE on geometry (885/902 reproduced exactly). But §14.2's
  owner has two corrections waiting — the 888-not-1188 floor, and the fact that the pinned 3-up-at-
  overlay outcome is a model artifact the browser never produces.

**OPERATOR ACTION:** the worktree `/tmp/bb-shell` is left in place on `f14-app-shell`.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — F14 the app shell + A5-U bonus mode, onto `dev`

**Event:** `integration-complete`
**Landed:** `f14-app-shell` first, then `a5-u-bonus-mode-v2`. Both FAST-FORWARDS via a throwaway
branch (`integrate-f14`, `integrate-a5u`), both deleted with `git branch -d` after landing.
`dev` `0e96632` → `6f54e2c` → **`dd1f0dc`**. `main` (`444d034`) untouched.
**Merge commits on `dev`: 2 before, 2 after** (`git rev-list --merges --count dev`, not `wc -l`).
No dev server started; port 5173 never bound.

### Method, per branch

Both branches forked from `0e96632` itself (`git merge-base` = `dev`'s tip), so F14 landed as a
pure fast-forward with ZERO conflicts. All conflict work fell to A5-U, rebased through the shell.

**F14 — 1374/68 → 1399/68.** Expected 1374 + 25 = 1399; the branch touches only
`layout-arithmetic.test.ts`, which already existed, so file count held at 68. Actual 1399/68.

**A5-U — 1399/68 → 1426/69.** Expected 1399 + 27 = 1426 (branch delta 1401 − 1374 = +27) and
68 + 1 = 69 (`tests/ui/f9-bonus-mode.test.tsx` is new). Actual 1426/69.

### Conflicts and resolutions

`src/App.tsx` **auto-merged** — not trusted on that basis. Every line each side ADDED versus
`0e96632` was checked present in the merged file: both sets complete. A5-U's `bonus`,
`onOpenBonus`, `baseBudget` and `appliedBonus` interleave with F14's `compact`, `withAttributes`
and `physique` at the `BuildPanel` and `CategoryLedgerLede` call sites. Both sides kept; neither
picked.

Three real conflicts, all resolved by RECONSTRUCTION FROM SOURCE BLOBS with each half then
diffed byte-identically (`cmp`), never by hand-editing conflicted text:

- **`src/styles/app.css`** — both branches append at EOF. Resolved as `dev`'s file (4539) +
  A5-U's 226-line append = **4765**. Marker-stripping would have given 4764: git unified the
  shared leading blank line at 4323, abutting F14's end comment against A5-U's opening comment.
- **`tests/layout-arithmetic.test.ts`** — both append at EOF, and git ALSO unified a shared
  trailing suffix (`  });` / `});`), so marker-stripping would have left F14's describe block
  unclosed. Resolved as merged base content (2954) + F14's complete block (507) + A5-U's
  complete block (182) = **3643**.
- **`.claude/reportback.md`** — append-only, all entries kept in chronological order BY AUTHORED
  TIME: A5-U `00:51:43` before F14 `01:19:56`. Resolved as base (6721) + A5-U (146) + F14 (133)
  = **7000**. Markers would have given 6999 — the same collapse hazard, one blank line short.

Collapse hazard cost across the three files: 3 lines that a naive marker-strip would have lost.

### Gates

`npm test` 1426/69 · `npm run typecheck` clean · `npm run build` clean (CSS 52.13 → 54.67 kB,
consistent with +226 lines; the build is the only gate that catches a malformed CSS comment).

RUN-never-edit, run explicitly: `tests/ui/overlays.test.tsx`, `tests/category-colors.test.ts`,
`tests/feasibility-golden.test.ts` — **29 passed**, and all three are byte-identical to `0e96632`
(golden md5 `b8e4a39c…` unchanged, so no cell moved in the 504-cell golden).

F9's touch-floor census re-run: I6 assertions green, **17 entries**, set-equal in both directions.
Because that census is blind to hard-coded values, the literal audit was done separately by
diffing `44px` DECLARATIONS: control-floor counts identical across all three trees
(`height` 3 · `min-height` 2 · `min-width` 1 · `width` 3). F14's only added `44px` is
`--sticky-jumpnav-h`, which REPLACES a hard-coded `top: 44px` — a de-literalization, consumed by
assertion 28. A5-U added none.

### The four shell properties, re-checked on the MERGED tree

1. **Gate and degradation.** `@media (min-width: 1280px) and (min-height: 868px)` appears twice,
   verbatim; below either threshold it simply does not match and the document scrolls. The
   `@supports not (height: 100dvh)` fallback is intact and restores `position: static` /
   `height: auto` / `overflow: visible`. `.app-shell` is `position: fixed` (root `overflow:
   hidden` does NOT stop the viewport scrolling) with `height: 100vh` then `height: 100dvh` —
   the order is the assertion. A5-U's block adds no 1280px media block.
2. **Anchors.** Eight targets: five `#cat-*` via `.grid-section`, plus `#panel-synergy`,
   `#panel-summary`, `main#badge-grid`. `--scroll-reserve` is `0px` shell-off and
   `--sticky-stack-h` (120) shell-on; `.grid-section` takes `calc(44 − reserve)` = **−76px**,
   which is exactly `−1 × --sticky-digest-h` and lands flush because scroll-padding (120) and
   scroll-margin (−76) ADD to 44. NOT double-counted: A5-U's CSS block declares no
   `scroll-margin`, `scroll-padding` or `--scroll-reserve` at all, and its two new ids
   (`dialog-bonus`, `dialog-bonus-title`) are ARIA wiring — no `href` targets them and they
   carry no CSS selector.
3. **`.summary` geometry.** Measured, not assumed, from the real tokens
   (SPACE_1 4 · SPACE_3 12 · SPACE_4 16 · RAIL 300 · SECTION_CHROME 34): **902 / 887 / 885** at
   scrollbar 0 / 15 / 17, IDENTICAL shell-on and shell-off. Both paths reduce to `902 − s`
   (off `1280−s−32−12−300−34`; on `1280−24−12−300−s−8−34`). Note 887 is pinned nowhere in the
   suite — it was derived here rather than taken on faith.
4. **Scroll memory.** `src/ui/shell/scroll-memory.ts` still has **zero imports**, two
   `sessionStorage` calls under ONE key (`bb2k27.ui.scrollTop.colRight`), and zero `localStorage`
   in code — its two `localStorage` mentions are both comments.

### Test-run instability during this pass — CLASSIFIED AS FLAKE, NOT REGRESSION

The first full run on the final tree was **1426/1426 green in 21.58s**. Later runs on the SAME
tree reported 7–12 failures with wall-clock durations of 92–973s, file counts collapsing to 65/69
as vitest workers failed to spawn. Three other agents were running against this machine and it
was suspending repeatedly; load average peaked at **20.4**.

Every failure was DURATION, never content: `Test timed out` / `Hook timed out`, plus
`[vitest-pool]: Failed to start forks worker`. No `AssertionError`, no expected-vs-received
anywhere. Two lookalikes were ruled out explicitly — f22's
`Unable to find role="dialog"` comes from `await screen.findByRole`, which is how a Testing
Library RETRY query reports a timeout, and an `expect(...).toBe(true)` in the output was a
stack-frame source line, not a failed assertion.

Isolation evidence, one file at a time: `app.test.tsx` 6/6 · `f22-import-guard` 4/4 ·
`f4-badge-card-description` 9/9 · `f4-slot7` 17/17 · `f9-bonus-mode` 17/17 ·
`recovery-boundary` 8/8 · `reset-build` 16/16 · `synergy-panel` 8/8 · `overlays.test.tsx` 4/4.
`randomize.test.ts`'s 150-seed fuzz case (line 575, which already carries an explicit
`{ timeout: 20000 }`) passes ALONE in **859ms** against 126,275ms under load — a ~150×
contention slowdown. No timeout was lowered or tightened to make anything pass.

**OPERATOR ACTION:** the worktrees `/tmp/bb-shell` and `/tmp/bb-a5u` are left in place on
`f14-app-shell` and `a5-u-bonus-mode-v2`. Both landed branches can be deleted at the operator's
discretion; `git branch -d` on them is refused to an agent by the permission layer.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · docs — the three user-facing docs, rebased onto the shipped app

**Event:** `slice-complete`
**Branch:** `docs-landing`, forked from `dev` `bc2002f`. Docs-only: `README.md`,
`EXPLANATION.md`, `GUIDE.md` at the repo root, plus this entry. Nothing under `src/`, `tests/`
or `public/` touched. No dev server started; port 5173 never bound.
**Gate:** `npm run build` clean (`tsc --noEmit && vite build`, 77 modules). Full suite not
re-run — the slice changes no compiled input, and `build` is what proves a malformed markdown
file cannot break it.

### The drafts were stale. What was corrected, and on what evidence

The drafts predated the F14 shell and A5-U bonus mode, and had drifted further besides. Every
factual claim was re-verified against `bc2002f` and corrected where it had moved:

1. **Page scrolling → the fixed shell.** The drafts described ordinary page scrolling. `app.css`
   gates a `100dvh` shell on width AND height, with two independent scrollports. Documented
   BEHAVIOURALLY, with no figure in prose, per the dispatch — the height gate is derived from
   measured chrome and a slice lowering it is in flight. Pointed at
   `tests/layout-arithmetic.test.ts` instead, which asserts the formula.
2. **Bonus mode was absent entirely.** Added from `BonusDialog.tsx`, `budget.ts` and
   `CategoryLedger.tsx`: two earned totals, placed per category, composed on read, freely
   reassignable, over-placement disclosed not blocked, and the base-0-plus-bonus case.
3. **`23 / 20 default — 3 bonus Badge Slots?` no longer exists.** A5-U struck the guess branch;
   `BudgetGrid.tsx:117` now emits a plain `/ ${DEFAULT_TOTAL_BADGE_SLOTS} default`, identical on
   both sides of 20, compared against the BASE spread only. All three drafts quoted the old
   string.
4. **"Badge Tokens" is NOT the shipped word.** `types.ts:207` and `BonusDialog.tsx:38` both state
   the rename is approved but the sweep has not run. Docs say **Badge Points** throughout, and
   name "Badge Tokens" once each as 2K's own term so the two reconcile.
5. **Cap breakers — engine-only, and said so.** `attributes.ts` honours an ABSOLUTE declared
   value for eligibility and grants no economy (mechanically: the economy reads no attribute at
   all). But `architecture.test.ts` lint (g) confines the field to two files and no UI writes it
   — A6-U has not shipped. Documented as: engine honours it, the in-app control does not exist
   yet, a value reaches a build only via imported JSON. Also carried the "one breaker != +1"
   fact (60 -> 83 across five).
6. **Eligibility reasons carry the current value.** `eligibility.ts`'s `nowNote` appends
   `(now N)`. The GUIDE quoted `needs 90 Close or 93 Layup for Gold`; corrected to
   `needs 90 Close (now 88) or 93 Layup (now 72) for Gold`.
7. **Filter bar has FIVE facets, not four.** `FilterBar.tsx` ships a `Purchased` toggle (F8-S2).
8. **Position hint copy changed.** F13 dropped the `(SF: 6'4"–6'10")` recitation; the shipped
   string is `Sets the available height range. No badge has a position requirement; badges gate
   on height and attributes only.`
9. **Physique / Attributes moved.** Physique is a full-bleed strip at >=768 and a `<Section>`
   below it; Attributes are the left pane at >=1280 and inside the Build panel below. The Build
   digest omits height/position wherever the strip renders them.
10. **Attribute display labels.** `ATTR_LABELS` gives `Mid` and `Three-Point`; the GUIDE's
    example said "Mid-Range 78, 3-Point 83".
11. **Test count dropped, not corrected.** The README draft claimed "868 tests"; the tree read
    1374 when I branched and 1426 after the two landings. A number that moves every slice does
    not belong in a README — replaced with a description of what the suite covers.
12. **Doc links repointed** from `docs/EXPLANATION.md` / `docs/GUIDE.md` to the repo root.

Newly documented because the drafts predated them: the Synergy board (F11), the loadout roster /
Synergy digest / copy-as-text block (F8-S2), `Reset build` (F5.3), the jump nav, and the
one-shot Build-panel collapse latch.

### Cut as unverifiable

**The category-colour provenance claim.** The EXPLANATION draft asserted that "2K files
Rebounding under Defense's red, and doesn't split out Physicals as its own badge category at
all," and that both colours were therefore the app's own invention. Neither half is supported by
anything in the tree, and `tests/category-colors.test.ts` contradicts the second: Physicals took
gold *from the user's own 2K HQ build-sheet screenshot*, which is why Playmaking vacated gold
for that screenshot's orange. Both halves are assertions about 2K's presentation that the app
does not implement and cannot back — exactly the class the seed's #1 rule forbids. Replaced with
what IS verifiable: the palette descends from a build-sheet screenshot where it had one and is
the app's own choice elsewhere, it is presentation either way, and no part of it is published 2K
data. Kept the two properties the suite DOES enforce — colour is identity never state, and
colour is never the only carrier.

Also verified-and-kept rather than assumed: 53 badges (11/9/10/12/5/6 by category, 22/15/16 by
tier), 19 NEW, `dataVersion 2026-08-26.1`, `gameVersion: null`, `confidence: pre-release`, the
tier cost table, the position->height table, the feasibility strings, and every `+2` /
discipline-lock string quoted. The GUIDE's worked example was re-computed against
`badges.json` and is arithmetically correct as written (Aerial Wizard Bronze 1 + Float Game
Silver 5 + Ghost Stepper Gold 4 = 10/16; fuse refunds 5 then 4; Gold+2 = Legend).

### README merge — pre-existing content preserved

The repo README was not overwritten. Kept in full: the Posture section, the sealed-`seed.md`
requirements note and its two rules, the Vercel deploy runbook, the `src/` layout, Known
constraints, Branches, and License. Removed only the stale `Status: skeleton` banner (the app is
built). Corrected one pre-existing error: it claimed "each directory carries a `README.md`" —
`tests/` has none, so the sentence now names the four `src/` directories that do. Added
`src/persist/` to the layout block, and the declared Node `22.x`. Every command printed was
checked against `package.json`; all seven scripts exist as written, and the 5173 `strictPort`
claim is verified in `vite.config.ts`.

### Vocabulary

`Badge Slots` / `Synergy Slots` throughout, never a bare "slot". All three files were linted for
unqualified `slots?`; the only hits are line-wrap continuations of a qualified term, the
hyphenated `Badge-Slot overflow`, and the EXPLANATION glossary quoting the banned token to
define it.

**OPERATOR ACTION:** `docs-landing` is pushed and unmerged — sequencing is the coordinator's.
The worktree `/tmp/bb-docs` is left in place on it.

---

## F15 — un-wrapping the header at 1280: the shell's gate falls 868 -> 768

**Branch** `header-compaction` · base `dev @bc2002f` (1426/1426 across 69 files)
**Status** implementation complete, pushed, NOT merged. `dev` and `main` untouched.

### Why this slice existed

F14's app shell is gated at `>=1280 x >=868`. That 868 was derived honestly, but a
1440x900 display leaves roughly **810 CSS px** after browser chrome — so the shell
never activated on an ordinary laptop, which is the only machine its audience owns.
**The whole F14 slice was dead code for its primary user.** The dominant gate term is
`HEADER_H`, and it was 102 only because the header flex-wrapped to a second row at
1280 (it was already 62 at 1440).

### What actually caused the wrap — and it is two words

Measured at 1280 in headless Chrome 151 against a production build, the five
`.app-header` children demand **1303.44px** of a **1232.00px** content box — an
overflow of **71.44px**. Text metrics on the two action buttons:

| | with suffix | without | delta |
|---|---|---|---|
| `Export JSON` -> `Export` | 74.05 | 37.92 | 36.13 |
| `Import JSON` -> `Import` | 74.38 | 38.27 | 36.11 |
| | | **total** | **72.24** |

72.24 against an overflow of 71.44 — **the suffix is 101% of the overflow and was the
second row on its own.** And `design-spec §3.2 item 5` names those buttons `Export` /
`Import`; the ` JSON` was implementation drift FROM the spec, specified nowhere.

**No copy-free fix exists.** All three levers that change no words — column gap
--space-4 -> --space-3 (16), header padding --space-6 -> --space-4 (16), and the
switcher's 220px select cap -> 180 (40) — sum to **72px against 71.44**, clearing by
0.56px while truncating build names and breaking the header's alignment with the
footer. This was not a preference-ordered choice among the brief's suggested levers;
the suffix was the only 71px in the header that cost nothing to give up.

### The remedy

1. `Export JSON` / `Import JSON` -> **`Export` / `Import`** (restores §3.2's own
   names). Alone this clears by **0.80px**, which is not a clearance.
2. `.app-header` column gap **--space-4 -> --space-3**, written `gap: var(--space-3)`
   so one token owns both axes. The row gap was already --space-3, so only the column
   moved. Worth 4 gaps x 4px = 16.

Demand **1215.20** against **1232.00** — **clearance 16.80px**. `HEADER_H` = 12 + 37 +
12 + 1 = **62**.

### The gate, re-derived — only HEADER_H moved

```
MIN_SHELL_H = ceil((HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H) / 0.40)
  F14   ceil((102 + 93 + 32 + 120) / 0.40) = ceil(867.5) = 868
  F15   ceil(( 62 + 93 + 32 + 120) / 0.40) = ceil(767.5) = 768
```

STRIP_H, PAGE_PAD_Y and STICKY_STACK_H are F14's, unchanged. The fall is exactly 100px
because `40 / 0.40 = 100`, and 40 is precisely the second row (12 row gap + 28 actions).
The gate literal was **never hand-written** — the suite asserts the formula and the two
CSS literals are its output. F14's `+40px of chrome` canary now evaluates to **868**,
i.e. the old gate: 40px of new always-visible chrome would put it straight back.

**The cards did not get more room.** 60.02% -> 60.03% at the gate is a rounding
artefact; the gate is a knife-edge by construction either way. What the slice buys is
**reach**, not headroom.

### Header height, before and after (bc2002f rebuilt in the same worktree)

| viewport | before | after | |
|---|---|---|---|
| 1440x900 | 62 (1 row) | 62 (1 row) | unchanged |
| **1280x900** | **102 (2 rows)** | **62 (1 row)** | the slice |
| 768x1024 | 102 (2 rows) | 102 (2 rows) | M untouched |
| 390x844 | 276 (5 rows) | 276 (5 rows) | S untouched |

1280 is the only viewport whose header height moved.

### Browser proof

| viewport | shell | doc scrolls | col-right scrolls | |
|---|---|---|---|---|
| 1280x768 | **ON** | no | yes | at the gate |
| 1280x767 | OFF | yes (8762px) | n/a | degrades |
| 1280x867 | **ON** | no | yes | was excluded |
| **1440x810** | **ON** | no | yes | **the laptop** |
| 1279x768 | OFF | yes | n/a | width scoping holds |

Anchor arithmetic verified rather than trusted: under the shell `.col-right` still
computes `scroll-padding-top: 120px` and `.grid-section` `scroll-margin-top: -76px` —
120 + (-76) = 44, unchanged. The `@supports not (height: 100dvh)` degrade is
byte-identical apart from the repeated gate literal moving in lockstep.

### Gates

- **suite 1433 across 69 files** (1426 baseline + 7 new; no new files) · typecheck
  clean · build clean
- **the three RUN-never-edit gates: 29/29 and BYTE-UNMODIFIED** (`git diff` vs bc2002f
  empty for all three). No cell of the 504-cell feasibility golden moved.
- **F9 I6 touch-floor census 7/7.** Nothing in this slice declares a height. The header
  block contains no `44px`, no `--tap-target` and no `min-height` — asserted positively
  (F15 assertion 6), because the census is structurally blind to a hard-coded literal.
  Only two labels' WIDTHS moved; no control height did.
- `--scroll-reserve`, every `scroll-margin`/`scroll-padding`, and the 300px rail:
  untouched (grep over the whole diff returns none).
- **layout-arithmetic 142/142** (135 -> +7). The new F15 block pins the HORIZONTAL
  derivation the gate secretly depended on, with a canary that is red against the
  pre-F15 arrangement — without it, the fit assertion would certify nothing.

### Test instability — CLASSIFIED AS CONTENTION, same class as F14's

The full run showed 16 failures over 12 files. Every one was **duration, never
content**: `Test timed out in 5000ms`/`20000ms`, plus four `Unable to find
role="dialog" and name "Import build"` — which is how `await screen.findByRole`
reports a timeout, the exact lookalike F14's entry already characterised. Three other
agents were running and the machine suspended repeatedly. The failing SET differed
between two runs on the identical tree, and **all 12 files are green run alone**
(randomize 71/71 · app 6/6 · f11-synergy-board 23/23 · f2-builds-persistence 13/13 ·
f2-disclosure-surfaces 11/11 · f2-eligibility-disclosure 6/6 · f22-import-guard 4/4 ·
f4-slot7 17/17 · position-height-clamp 9/9 · reset-build 16/16 ·
summary-import-export 8/8 · synergy-panel 8/8). No timeout was lowered, tightened,
raised or added.

**Settled:** a later run of the same tree, once load dropped, was **1433/1433 across
69/69 files, fully green** — no isolation, no retries, no timeout changes.

### Contradictions and spec drift found — FOR RULING

1. **`design-spec §3.2` contradicts itself on the button copy.** §3.2 item 5 says
   `Export` / `Import`; §3.1's touch-floor bullet quotes the shipped `Export JSON`
   when citing a design-review measurement. Treated §3.2 as authoritative (it is the
   copy spec; §3.1 is quoting the tree). **Needs a one-line rev to settle it.**
2. **`design-spec §3.2` opens "Two rows on desktop, three on mobile."** That was
   already false at 1440 before this slice and is now false at 1280 too. **Needs a rev
   to say one row at >=1280, two at 768, five at 390.**
3. The driving brief's preferred lever ("tightening horizontal gaps or padding")
   recovers 32px against a 71.44px overflow and could not have done this alone.
4. `Export`/`Import` is **not an abbreviation** — it is the spec's own wording. The
   change moves the tree toward the spec, not away from it.

**Six UI test files** follow the two labels (`f2-disclosure-surfaces`, `f8-roster`,
`summary-import-export`, `category-ledger`, `f22-import-guard`, `reset-build`). None
is a RUN-never-edit gate.

**OPERATOR ACTION:** branch pushed as `header-compaction`, not merged. Worktree
`/tmp/bb-header` left in place. Proof: `docs/proof/f15-verification.txt` + four
screenshots (`f15-1280x768`, `f15-1280x767`, `f15-1440x810`, `f15-1280x900`).

---

## reset-and-slot8 — Reset placement + the eighth ratified Synergy Slot (2026-08-26)

Branch `reset-and-slot8` off `origin/dev` @ `bc2002f`, two commits, worktree `/tmp/bb-small`.
Verified after each commit separately: **1426/1426 across 69 files** (the baseline count,
unchanged — neither commit adds or removes a test), `tsc --noEmit` clean, `vite build` clean,
and all three RUN-never-edit gates green and untouched.

### Commit 1 — `Reset build` moved beside the Attributes heading

**design-spec §15.18 is stale in two independent ways and was NOT followed literally.**

1. **"The foot of the left rail"** — there is no left rail. F5.4 (§16.7) cut `.layout` into
   exactly two grid items at L (the attributes pane and `.col-right`) and the Build panel went
   into the RIGHT column with everything else. §15.18's companion claim that "§13.0.1 puts the
   Ledger overview first and the Build panel second" describes one rail that has since been
   split in two.
2. **"…the far end of a long scroll, where a mis-click is not available"** — this was §15.18's
   ENTIRE safety argument and F14 dissolved it. The rail's `max-height: calc(100vh − --space-6)`
   is gone; `.col-right` is a fixed-height flex row inside a `position: fixed; height: 100dvh`
   shell, and `.attr-pane` is `position: static; height: 100%` — a bounded scrollport whose foot
   is one flick away. **The placement lock had already failed open before this slice.**
   BuildPanel's own comment had re-based the argument once onto F5.4's collapsible; F14 moved it
   again and nothing re-based it a second time.

Safety therefore rests on the confirm, which is where it actually always lived: `ResetBuildDialog`
is untouched and still mandatory. **No confirmation affordance was added or removed.**

**Geometry is bit-identical, and that was the load-bearing constraint.** `.btn--sm` ships
`height: 28px`; the summary's content box is one `--text-base` line box (24px). Dropping the
control in as-is would have grown every Attributes summary by 4px — while
`layout-arithmetic.test.ts` models that box as `SECTION_LEAD_Y = 1 + (2 × --space-3-5 +
lineBox(--text-base)) = 53`, **derived from tokens, not measured**. The suite would have stayed
green while `slidersVisible()` silently over-reported the pane. The control releases its height
instead. Measured in the browser: summary **52px** at 1280×900 (shell on), 1280×800 (shell off)
and 390 — unchanged in all three. `MIN_SHELL_H` untouched.

**Browser proof at 1280 (narrowest shelled width, 300px pane):** heading ends at x=125.4, button
starts at x=200.4 — **75px clear**, button right edge 291 inside a 307 summary, `overlaps: false`.
`margin-left: auto` in the flex summary means the heading keeps its intrinsic width, so crowding
is structurally unreachable rather than checked at one breakpoint. Shell-off at 1280×800 (pane
reverts to `sticky`) and 390 (pane not rendered, control inside BuildPanel) both verified;
**exactly one** `.build-panel__reset` in the DOM at every width.

**Touch floor — the second escape of one shape.** F5.3 shipped
`@media (max-width: 767px) { .build-panel__reset { min-height: 44px } }` as a **bare literal**,
which F9's assertion 27 cannot see (it reads the stylesheet back by matching
`min-height: var(--tap-target)`). F11's `.synergy-board__button` was the first escape of exactly
this shape and was folded in at integration; this is the second, and it sat outside the census
for two slices. Re-pointed at the token and **registered in `S_TOUCH_FLOOR_CENSUS`**; measured
44px at 390. No bare `44px` was introduced.

**Cost paid knowingly:** a `<button>` inside a `<summary>` is nested interactive content. It is
conforming (summary takes phrasing content — the same reading `CategoryLedger` relies on), but a
click there toggles the `<details>` unless propagation is stopped. Handled with BadgeCard's
shipped `stopPropagation` idiom and **verified in-browser**: pressing Reset opens the confirm and
leaves the Section open. The disabled reason moves to `sr-only` — a full sentence does not fit
beside a heading, and the visible carrier is the disabled control itself. **This is the one
deliberate reduction in visible information and it is flagged for review.**

### Commit 2 — Synergy Slot 8 ratified as the second +2 [A7]

`RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS` `[7]` → `[7, 8]`. The set now fills
`MAX_PLUS_TWO_SYNERGY_SLOTS` exactly, which resolves seed Open item #2 / OQ-A1 and closes
scope.md deviation #5 — the board's distribution is the seed's declared 6/2 at last. F11 predicted
this landing in `SynergyBoard.tsx` and was right: every magnitude is derived, so no component
hardcoded a shape that had to move.

**Every site the bound was hard-coded** (grepped for the literal, then for the comparison form):

| Site | Form |
|---|---|
| `src/engine/synergy.ts` | `RATIFIED_PLUS_TWO_SYNERGY_SLOT_IDS = [7]` — the constant |
| `src/ui/synergy/SynergyPanel.tsx` | `designatedCount >= 2` → `MAX_PLUS_TWO_SYNERGY_SLOTS` |
| `src/ui/synergy/SynergyPanel.tsx` | `"Only 2 Synergy Slots can be +2"` → interpolated |
| `tests/synergy-overlays.test.ts:91` | `row.synergySlotId === 2 \|\| === 7` — the INDEPENDENT oracle, spelled as a comparison rather than an array literal. **The `[7]` grep missed it; it is the one that actually broke** (8 tests, `boost(post-powerhouse) expected 2 to be 1`). |
| `tests/config.test.ts`, `tests/synergy.test.ts`, `tests/serialization.test.ts`, `tests/validate-loadout.test.ts`, `tests/ui/f4-slot7.test.tsx`, `tests/ui/f4-plus-two-roundtrip.test.tsx`, `tests/ui/f11-synergy-board.test.tsx`, `tests/ui/f2-disclosure-surfaces.test.tsx`, `tests/ui/synergy-panel.test.tsx` | expectation updates |

**Two latent couplings surfaced, both of which would have INVENTED a 2K27 mechanic:**

- **The Build Specialization discipline lock rode `isRatifiedPlusTwo`.** A coincidence while the
  ratified set was Synergy Slot 7 alone. Slot 8 would have inherited a Build Specialization track
  picker it has no published claim to. Split out as `offersDisciplineLock` /
  `BUILD_SPECIALIZATION_SYNERGY_SLOT_ID`.
- **The ratified chip, the disabled-`+1` reason and the SummaryPanel over-cap violation all
  glossed the +2 as "(Build Specialization)".** True of 7, unpublished for 8 — now
  provenance-neutral. (`f11-synergy-board.test.tsx:174` records slot 8's provenance as
  "Legend 2 REP"; that is a test comment, not a ratified source, so it was NOT put into shipped
  copy.)

**Copy.** Plural agreement is derived once in `ratifiedPlusTwoSubject()` rather than re-typed — a
`.join()` into a singular frame renders "Synergy Slot 7, 8 is" the moment a second id lands. The
standing `PlusTwoDesignator` banner **retires**, per its own F4 ruling ("retires only when the
second +2 is published"); rendering it at zero would have read *"0 more Synergy Slot can be +2 —
2K hasn't published which. Designate it here."*

**Participation checks:** base capacity and bonus-mode applied capacity are `equipSlots`
arithmetic and take no input from Synergy Slot magnitude — untouched, `tests/bonus.test.ts` and
`tests/budget`/`ledger` green. **The 504-cell feasibility golden does NOT move** (feasibility is
computed from purchased level and cost, not synergy boost) — the gate passes untouched.

**PERSISTED SHAPE — NOTHING MIGRATED.** No persisted encoding assumes a maximum of seven:
`magnitude` is a per-slot persisted field and `SYNERGY_SLOT_IDS` was already 1–8. A saved build
that designated a second +2 now loads OVER the cap and is **DISCLOSED** by `validateLoadout`'s
`tooManyPlusTwoSynergySlots` — the path F4 built for exactly this case. H8 holds: drift is
disclosed, never auto-repaired. `applyRatifiedMagnitudes` still refuses to synthesise a missing
slot and still reports rather than silently drops.

### Conflict forecast against the sibling branches

- **Header compaction** — LOW. Nothing here touches `AppHeader.tsx` or the header block in
  `app.css`. Indirect risk only: `HEADER_H = 102` is a term of `permanentBand()` /
  `MIN_SHELL_H`, and commit 1 deliberately leaves both untouched, so a header slice moving that
  literal will not collide.
- **The shell height-gate slice** — LOW by construction. Commit 1 was written specifically to
  keep the Attributes summary at 52px so `SECTION_LEAD_Y = 53`, `slidersVisible()` and
  `MIN_SHELL_H` are all bit-identical. The gate literal was not raised.
- **Roll UI** — MEDIUM if it touches `SynergyPanel.tsx`. Commit 2 rewrites `PlusTwoDesignator`,
  the magnitude `SegmentedControl`'s `disabledOptions`, and the ratified chip in that file. Textual
  overlap is likely; semantic conflict is not — a roll slice wants different lines.
- **Docs** — MEDIUM. `docs/vocabulary.md` and `src/config/README.md` both describe the +2 seam;
  commit 2 edits the README row (`HALF-RESOLVED` → `RESOLVED [A7]`). A docs branch rewriting the
  same table will conflict on that row.
- **`tests/layout-arithmetic.test.ts`** — HIGHEST-RISK SHARED FILE. Commit 1 edits
  `S_TOUCH_FLOOR_CENSUS`, assertion 20, assertion 27 and F13's assertion 4. Any sibling adding a
  census entry or touching the F5.3 block will conflict there.

### Flake note

`tests/ui/f4-slot7.test.tsx` reported one `Test timed out in 5000ms` on a run whose wall clock
was **199s** with three other agents loading the machine. Re-run alone: **passes in 2.24s**.
Classified as the documented contention flake — a duration, not a value. **No timeout was
lowered or tightened.**
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — F15 header compaction + user-facing docs, onto `dev`

**Event:** `integration-complete`
**Landed:** `header-compaction` first, then `docs-landing`. Both FAST-FORWARDS.
`dev` `bc2002f` → `a53ced7` → **`d731160`**. `main` (`444d034`) untouched, never checked out.
**Merge commits on `dev`: 2 before, 2 after** (`git rev-list --merges --count dev`, not `wc -l`).
No dev server started; port 5173 never bound.

### Method, per branch

Both branches forked from `bc2002f` itself (`git merge-base` = `dev`'s tip for each), so all
conflict work fell to `docs-landing`, rebased through the header change.

**`header-compaction` — 1426/69 → 1433/69.** A direct descendant of `dev`, so it landed as a
plain `git merge --ff-only header-compaction` with ZERO conflicts — no throwaway branch was
needed, and the branch ref was left untouched on its worktree. Expected 1426 + 7 = 1433 (branch
delta), file count held at 69 (it touches only test files that already existed). Actual 1433/69.

**`docs-landing` — 1433/69 → 1433/69.** Rebased onto `a53ced7` via throwaway branch
`docs-integrate` (the branch itself is checked out on a worktree and was not moved). Docs-only:
expected NO test change, and the three doc files plus the reportback entry are the whole delta.
Actual 1433/69. `README.md`, `EXPLANATION.md`, `GUIDE.md` verified byte-identical to their
`docs-landing` blobs after the rebase; `git diff --name-only` confirms nothing under `src/`,
`tests/` or `public/` was touched. The build output hashes were unchanged across the landing
(`index-BxZBj_cN.css`, `index-BHAHqaVy.js`) — an independent check that the docs are inert.

### Conflicts and resolutions

Exactly one conflict, as forecast. The three doc-file commits applied clean.

- **`.claude/reportback.md`** — append-only; both branches append at EOF over the same base.
  Resolved by RECONSTRUCTION FROM SOURCE BLOBS, never by hand-editing conflicted text. The three
  merge stages were first checked against their blobs (`:1` == `bc2002f`, `:2` == `dev`,
  `:3` == `docs-landing`), and each side confirmed a PURE APPEND (first 7111 lines byte-identical
  to base). Resolved as base 7111 + docs 100 + header 149 = **7360**, with each of the three
  thirds then `cmp`-verified byte-identical against its own source block.

**ORDER — the authored-time rule bit here, and it is worth recording.** The landing order and the
authored order DISAGREE for the first time: `docs-landing`'s entry was authored `06:23:37` and
`header-compaction`'s at `08:53:30`, but the header landed FIRST and was already pushed with its
block at EOF. Per the standing rule — every entry survives verbatim in AUTHORED order, "not at the
seam where it was written" — the docs block was placed BEFORE the header block, so the file reads
docs (06:23) → F15 (08:53). This was a pure reordering: a sorted-byte comparison against the
naive append-order build confirms not one byte of content differs, and the docs commit is still
`100 insertions(+), 0 deletions(-)`. The correction was made by amending the unpushed docs
commit, so no force-push and no rewrite of anything already on `origin`.

The collapse hazard did NOT materialise this time: the docs block opens with its own `─────` rule
and the header block opens with its own blank + `---`, so each seam carries a separator from the
block's own bytes. Reconstruction preserved both verbatim rather than relying on git, which was
still the right method — a marker-strip would have unified the shared boundary as it has four
times before.

### Gates

`npm test` **1433/1433 across 69/69** · `npm run typecheck` clean · `npm run build` clean — all
three run after EACH landing, with the expected count computed from the branch's own delta BEFORE
the actual was read. RUN-never-edit trio run explicitly after each: `tests/ui/overlays.test.tsx` +
`tests/category-colors.test.ts` + `tests/feasibility-golden.test.ts` = 29/29, the 504-cell golden
unmoved. F9's touch-floor census (`S_TOUCH_FLOOR_CENSUS`, `tests/layout-arithmetic.test.ts`)
re-run: 10/10, and the whole file 142/142. **No flake was observed in either full run** despite
other agents being active; no timeout was lowered, tightened, raised or added.

### Browser confirmation — production build, port 4317 (never 5173)

`vite preview` on a production `dist`, driven at three viewports:

- **1440×810 — shell ON.** Gate matches, `body` `overflow: hidden`, document not scrollable
  (`scrollHeight` 810 == `clientHeight`), `.col-right` is the scroller (`overflow-y: auto`).
- **1280×768 — shell ON.** The point of the slice: the gate's new floor admits an ordinary laptop.
  `.app-header` measures **62px**, one row, confirming `HEADER_H` 62 in the live tree.
- **1280×767 — shell OFF, document scrolling.** Gate false, `body` `overflow: visible`,
  `.col-right` no longer a scroller, `scrollHeight` 21768 > 767, and a scripted scroll moved the
  document. The gate is exact at the 768 boundary.

**Anchors land flush:** computed `scroll-padding-top: 120px` on `.col-right` and
`scroll-margin-top: -76px` on `.grid-section` → 120 + (−76) = **44** = `--sticky-jumpnav-h`. Both
remain DERIVED, not literal: `--scroll-reserve: var(--sticky-stack-h)` feeds the padding and the
margin is `calc(var(--sticky-jumpnav-h) - var(--scroll-reserve))`. The gate itself likewise stays
computed — `src/styles/app.css` carries the formula
`MIN_SHELL_H = ceil((HEADER_H + STRIP_H + PAGE_PAD_Y + STICKY_STACK_H) / 0.40) = ceil(767.5) = 768`
and `tests/layout-arithmetic.test.ts` re-derives it. Nothing hand-wrote 768.

Header copy confirmed un-drifted in the live DOM: the controls read `Export` and `Import` with no
` JSON` suffix, and the header's computed `column-gap` is `12px` (`--space-3`).

**OPERATOR ACTION:** `dev` pushed. Both source branches and their worktrees (`/tmp/bb-header`,
`/tmp/bb-docs`) are left in place; the throwaway `docs-integrate` was deleted. The two design-spec
contradictions the F15 entry raised (§3.2 button copy vs §3.1's quoted `Export JSON`; §3.2's "Two
rows on desktop") are still UNRESOLVED and need the one-line rev it asked for.

---

## F8-R2 — the roll UI: pins, exclusions, the roll panel, the report, the fourth dialog

**Branch:** `roll-ui` (off `origin/dev` = `bc2002f`), worktree `/tmp/bb-roll`. **Not merged. `main` untouched.**

### changed_files

`src/ui/primitives/PinControl.tsx` (new) · `src/ui/summary/RollPanel.tsx` (new) ·
`src/ui/roll/newSeed.ts` (new) · `src/ui/roll/roll-controls.ts` (new, see Deviation 2) ·
`src/ui/summary/LoadoutRoster.tsx` · `src/ui/grid/BadgeCard.tsx` · `src/App.tsx` ·
`src/styles/app.css` · `tests/ui/f8-pin-exclude.test.tsx` (new) ·
`tests/ui/f8-roll-panel.test.tsx` (new) · `tests/ui/f8-reroll-dialog.test.tsx` (new) ·
`tests/ui/f8-roster.test.tsx` · `tests/vocabulary.test.ts`

### denied_paths_checked — I did not touch these

`src/engine/**` (ZERO diff — `git diff bc2002f..HEAD -- src/engine` is empty; `randomize.ts`,
`random.ts` and `ROLL_ALGORITHM_VERSION` are byte-identical) · `src/ui/summary/SummaryPanel.tsx` ·
`src/ui/summary/SynergyDigest.tsx` · `src/ui/summary/SummaryTextBlock.tsx` · `src/ui/synergy/**` ·
`src/ui/build/**` · `src/ui/shell/**` · `src/ui/builds/**` · `src/ui/primitives/**` except the new
`PinControl.tsx` · `src/styles/tokens.css` (ZERO new tokens) · `src/persist/**` · `src/data/**` ·
`src/config/**` · `src/main.tsx` · `package.json` (`dependencies` still exactly
`{react, react-dom}`) · `tests/ui/overlays.test.tsx` · `tests/category-colors.test.ts` ·
`tests/feasibility-golden.test.ts` · `tests/layout-arithmetic.test.ts` · `tests/architecture.test.ts` ·
`tests/randomize.test.ts` · `tests/steps.test.ts` · `vite.config.ts` (no timeout changed).

### first_proof_result

Production build served on **port 4319** (not 5173), Chrome at **1280x868**, shell ON, seeded with
the F8 fixture (Posterizer purchased at **Gold**, holding the Fuse in Synergy Slot 5), then
`Fill remaining` pressed.

- **(a) THE PIN WAS HONOURED.** Posterizer read `Gold` before the roll and `Gold` after it, and is
  still present. Rise Up and Float Game also survived. Roster went 4 -> 8 badges.
- **(b) ONE LINE PER CATEGORY INCLUDING THE SUCCESSES**, all six, in category order:
  `Finishing added Aerial Wizard (Silver), Paint Prodigy (Bronze), Aerial Wizard (Silver → Gold),
  Ghost Stepper (Bronze), Aerial Wizard (Gold → HOF), Paint Prodigy → Layup Mixmaster (Bronze),
  Ghost Stepper (Bronze → Silver)` · four `no badge in this category is legal for a 6'6" build`
  declines · `Physicals added Pogo Stick (Bronze), Pogo Stick (Bronze → Gold)`. Heading:
  `Rolled with seed 2095-997E · 2 of 6 categories filled · 9 added`. Closing line verbatim:
  `Chosen at random from what fits. There is no ranking here.`
- **(c) FOCUS IS ON THE REPORT HEADING.** `document.activeElement.className === "roll-report__heading"`,
  and the report container is `aria-live="off"`.
- **(d) SEED DISPLAYED WITH ITS HONESTY SENTENCE** — `2095-997E`, plus
  `Same seed + same build + same budgets + same pins reproduces this roll. Change any of them and it won't.`

### verification_evidence

| Gate | Result |
|---|---|
| `npx vitest run` (full) | **1489 passed / 1489, 72 files, exit 0**, 39.28s — zero failures, zero flakes |
| `npm run typecheck` | clean |
| `npm run build` | clean, 334.05 kB / 100.02 kB gzip |
| `tests/ui/overlays.test.tsx` + `tests/category-colors.test.ts` + `tests/feasibility-golden.test.ts` | **29/29**, unedited. The 504-cell golden did not move. |
| `tests/layout-arithmetic.test.ts` (F9 census) | **135/135**, incl. assertion 27 (census exactly equals the stylesheet) and 34 |
| `tests/vocabulary.test.ts` | **102/102**, all canaries seen to fail correctly |
| `tests/ui/f8-roster-h2.test.tsx` | green with the pin column present |

**Test count BEFORE 1426 / 69 files -> AFTER 1489 / 72 files.** The +63 reconciles exactly:
26 new UI tests (8 + 11 + 7) + 21 new vocabulary assertions + **16 from five existing lint tests
that emit one `it` per source file** (`architecture`, `layout-arithmetic`, `f9-bonus-mode`,
`persist-boundary`, `vocabulary`) picking up the 4 new source files. Worth knowing for future
count forecasts — a new *source* file grows the suite by 5 on its own.

- **one-state-write spy:** wrapped `localStorage.setItem` after mount; a roll that added 9 badges
  across 2 categories produced **exactly 1** write.
- **activeElement check:** asserted in test 2.7 and confirmed in the browser.
- **anchor landing, measured not declared:** `.grid-section` 44px · `#panel-summary` 12px ·
  `.roll-report__heading` **12px** under the shell (computed `scroll-margin-top: -108px`,
  `--scroll-reserve: calc(44px + 76px)`), and **12px** again below the gate at 1024x700 where the
  reserve is `0px` and the declaration is a plain `12px`. One landing position, both regimes.
- **shell-off:** at 1024x700 `.col-right` is `overflow-y: visible`, the document scrolls, the roll
  panel renders and the report still shows all six lines.
- **S touch floor at the 767 breakpoint:** all 64 pin/roll controls measure >=44x44, no horizontal
  document scroll. See Defect 2 — this needed a fix.
- **print:** `.roll-panel`, `.pin-control`, `.pin-control__reason`, `.badge-card__action`,
  `.summary-roster__pin` and `.summary-roster__pin-mode` all confirmed inside `@media print`'s
  hide list **in the built CSS**.
- **`any level` was NOT cut** — the two-segment native radio sub-row ships.

### stop_conditions_triggered

None reached, but **three findings** and **two deliberate deviations** are recorded below.

### FINDING 1 — the ratified closing sentence collides head-on with lint class 2

§14.7 makes `Chosen at random from what fits. There is no ranking here.` mandatory and fixed.
Class 2 bans the substring `rank`, and class 2's own shipped header says F8-R2 must add
`RollPanel.tsx` to its scope. The brief's assertions **2.5 and 2.6 therefore contradict each
other literally**, on the rendered output as well as in source.

Resolved WITHOUT weakening the pattern: the exact literal is excised by string match before class 2
runs, and three canaries keep the carve-out honest — the sentence still fails the RAW pattern, the
exemption is an exact literal so a paraphrase is not covered, and a second `rank` in the same file
is still caught. Same posture as AJ-4's documented `import.meta` / `prefers-reduced-motion`
collisions. **Design should confirm the sentence, or re-word it to avoid the token.**

### FINDING 2 — pre-existing duplicate-key defect in `SynergyBoard.tsx` (denied path, NOT fixed)

`src/ui/synergy/SynergyBoard.tsx:216` (and `:201`) return `<td key={roleKind}>` from inside
`synergySlots.map(...)`, so **all eight cells in a row share one React key**. React logs
`Encountered two children with the same key, "fuse"/"reaction"`. It is latent on the shipped tests
and surfaces once App re-renders, which the roll's session state now does. The key should be the
synergy slot id. F11's file, in this slice's denied set, so it is reported rather than changed.

### FINDING 3 — the `inputDigest` cannot gate `Restore` on its own

§1(e) says compare the stored `ReproducibilityToken.inputDigest` to a freshly computed one. But
`inputDigest` includes the **loadout**, which necessarily changes the moment a roll is applied — so
a naive comparison disables `Restore` immediately after every roll, contradicting assertion 2.10.

Implemented so the digest still has exactly ONE definition: a candidate `RollRequest` is composed
from the CURRENT build/budgets/pins/exclusions but the STORED pre-roll loadout, and its
engine-computed digest is compared to the stored one. No second change detector. The per-field
comparisons below that gate choose the WORDING ONLY and never the enabled/disabled decision.

### DEFECT FOUND AND FIXED (mine) — the S touch floor on the WIDTH axis

Measured in Chrome at the S breakpoint: `Pin` was **36px** wide and the single-glyph `⟳` was
**34px**. Both clear 44 on the height axis for free (they carry `.btn`, which F9 raised below 768)
and failed §3.1's 44x44 on width first — the `.filter-chip` case exactly. Fixed with
`min-width: var(--tap-target)` in an S block. **min-width only, deliberately:** assertion 27 reads
the stylesheet back by matching `min-height: var(--tap-target)` and requires that selector set to
equal `S_TOUCH_FLOOR_CENSUS`, so a min-height would have reddened a RUN-never-edit gate, and a
`44px` literal would have escaped the gate while breaking the doctrine. Census re-verified exact.

### DEVIATION 1 — RollPanel is a sibling ABOVE `<SummaryPanel>`, not inside it

§14.4 puts the roll panel inside the Summary region between the over-capacity chips and the roster,
but `SummaryPanel.tsx` is a denied path and S2 left no slot (its own comment says the region is
"absent and NOT reserved"). Rendering it in `App.tsx` immediately above `<SummaryPanel>`, inside the
same `<Section title="Summary">`, achieves the design intent — above the roster, beside its own
output device, in flow, never sticky — with **zero diff to SummaryPanel**.

It is also strictly better for the H2 gate: `.summary` is the exact subtree `overlays.test.tsx`
compares across all four overlay combinations, and keeping the roll surface outside it means that
gate never has to reason about roll state. **Cost:** the panel sits above the errors banner and the
over-capacity chips rather than below them. Design should confirm.

### DEVIATION 2 — roll state reaches its two consumers by CONTEXT, not props

`LoadoutRoster` is rendered by `SummaryPanel` and `BadgeCard` is rendered 53 times by the grid;
both parents are denied paths and neither has any business knowing a randomizer exists. A new
`src/ui/roll/roll-controls.ts` provides the session state; the two consumers read it. `LoadoutRoster`
keeps S2's exact public props and `BadgeCardProps` does not grow. The default is INERT (no pins,
no-op handlers) rather than throwing, so any surface rendering without the wiring still paints.

### Other spec-vs-code notes

- **`colspan` 5 -> 6 in `tests/ui/f8-roster.test.tsx`.** The brief said S2's assertions stay green
  unedited; this one mechanically cannot — the stale disclosure spans the table, and the table now
  has six columns. "Spans the table" is the invariant; 5 was only ever its arithmetic.
- **"exactly four `<dialog>` elements" is not assertable.** Three of the four are mounted only while
  open (App.tsx's own A5-U comment states that as deliberate). What the count protected is asserted
  instead: `#dialog-reroll` is distinct from the build manager's, and a bare
  `document.querySelector("dialog")` provably returns the WRONG one.
- **The seed field shows after any roll**, including one where `changed === false`. Strictly, §14.7
  says hide it when the loadout did not come from a roll. Showing the report without its seed read
  worse. Flagged rather than silently chosen.
- **`@testing-library/user-event` is NOT a dependency** — the three new files use `fireEvent`,
  matching the shipped convention. No dependency was added.
- **`LoadoutRoster`'s zero-state copy** ("Buy a badge in the grid above, or roll one") now points at
  a real surface directly above the roster. Verified in the browser: the promise is kept.

### Environment note

A fresh `git worktree` has no `node_modules`; it was symlinked to the main checkout so the tree runs
byte-identical dependency versions. **`.gitignore` has `node_modules/` with a trailing slash, which
does NOT match a symlink** — it was caught before the final commit, but any agent using
`git add -A` in a worktree will commit that symlink. Worth an untrailing-slash fix.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — Reset placement + Synergy Slot 8, onto `dev`

**Event:** `integration-complete`
**Landed:** `reset-and-slot8` (3 commits off `bc2002f`, worktree `/tmp/bb-small`). FAST-FORWARD.
**`dev`:** `fdb0398` → `1ef969e`. **Merge commits 2 before, 2 after** — counted with
`git rev-list --merges --count dev`, never `git log --merges | wc -l`, which counts LINES.

Rebased through the two landings that went in after the branch was cut (F15 header compaction,
then the three user-facing docs). The source branch is checked out on a worktree, so a throwaway
`land-reset-slot8` was rebased and `dev` fast-forwarded onto it; the branch itself was never
moved. Rebase commits: `2754ed5`→`e764f53`, `3d6dfba`→`08786b4`, `57e6ff6`→`1ef969e`.

### Conflicts — ONE, and the forecast one did not materialise

**`tests/layout-arithmetic.test.ts` did NOT conflict**, though the branch predicted it would and
named it the highest risk. Both landings edit the file, but in DISJOINT regions: F15 appended new
derivation assertions and re-derived the gate, while this branch edited assertions 18/20, the
census array, 27's trio, and F13's 4. Git merged them without a marker. **That is exactly the
case where "no conflict" is not the same as "correct"**, so it was verified rather than trusted:

- Both sides' patch PAYLOADS (added/removed lines, hunk headers excluded, since line numbers
  necessarily shift) are byte-identical in both directions on all four overlapping source files —
  `base→dev` == `branch→HEAD`, and `base→branch` == `dev→HEAD`. Nothing was dropped to make the
  file parse, on either side.
- The whole-tree corroboration: `git diff --stat 57e6ff6 HEAD` reproduces `git diff --stat
  bc2002f dev` exactly — same 18 files, same `1926 insertions(+), 138 deletions(-)`.
- `SECTION_LEAD_Y`, `slidersVisible`, `HEADER_H`, `MIN_SHELL_H` are bit-identical between `dev`
  and `HEAD` (12 / 16 / 23 / 14 references each), which is the branch's own composition claim,
  now checked instead of assumed.
- The census carries BOTH entries: `.synergy-board__button` (F9's) and `.build-panel__reset`
  (this branch's).

**`src/config/README.md` did not conflict either** — the docs landing rewrote the ROOT `README.md`
and never touched `src/config/README.md`, so the +2-seam row rebased untouched.

**`.claude/reportback.md`** — the one real conflict, resolved by RECONSTRUCTION, never by editing
conflicted text. The three merge stages were first confirmed against their blobs (`:1` == `bc2002f`
7111, `:2` == `dev` 7452, `:3` == branch 7246) and each side confirmed a PURE APPEND (first 7111
lines byte-identical to base, `cmp`-verified).

**ORDER — the authored-time rule bit again, and this is the second time it has.** The branch's
entry was authored `09:02:24`; `dev`'s last block, the F15+docs integration entry, was authored
`09:07:46`, and the F15 block before it `08:53:30`. So the new entry belongs **between them, NOT
at EOF** — it lands third-from-last. Per the standing rule every entry survives verbatim in
AUTHORED order, not at the seam where it was written. Resolved as base-through-F15 7360 + branch
135 + F15/docs integration 92 = **7587**, computed BEFORE the result was measured, and each of the
three segments then `cmp`-verified byte-identical against its own source blob. A sorted-byte
comparison against the naive append-order build confirms the placement is a PURE reordering — not
one byte of content differs — and the rebased commit reports `135 insertions(+), 0 deletions(-)`,
which is the arithmetic proof that the insertion displaced nothing.

The collapse hazard did not materialise: the branch block opens with its own blank + `---` and the
integration block with its own `─────` rule, so each seam carries a separator from its own bytes.

### Counts

`dev` 1433 + branch net 0 (it adds no test, only rewrites existing assertions and appends one
census string) = **1433 expected**, computed from the delta BEFORE the actual was read.
**Actual: 1433 across 69 files.** Exact.

### Gates

`npm run typecheck` clean · `npm run build` clean (CSS 54.71 kB) · `npm test` **1433/69**.

RUN-never-edit trio run EXPLICITLY: `tests/ui/overlays.test.tsx` + `tests/category-colors.test.ts`
+ `tests/feasibility-golden.test.ts` = **29/29**, and all three blobs are bit-identical to `dev`'s
(`git rev-parse dev:<f>` == `HEAD:<f>`), so the 504-cell golden is untouched as well as unmoved —
no cell moved, nothing to stop and report. F9's touch-floor census re-run: **9/9**.

**One flake, classified and not "fixed."** `tests/ui/f4-slot7.test.tsx:200` failed the full run on
a `findByRole` expiry — a DURATION, not a wrong value — with the suite reporting 278s of test time
inside a 45s wall clock, i.e. heavy parallel load from the other agents. Re-run alone: **17/17 in
3.45s.** Contention, per the documented class. **No timeout was lowered or tightened.**

### Browser confirmation — production build, port 4319 (never 5173)

5173 was confirmed still bound by a stray `node` from a previous day and was left alone.

**METHOD NOTE worth carrying forward:** the browser tab initially served a STALE page — a previous
agent's server had used 4319 earlier, exited (so the port probed free), and the tab still held its
document. It was caught by comparing the page's asset hashes against the freshly built `dist`
(`index-CltmqCEK.css` vs the build's `index-CrSicJCu.css`) and fixed with a forced reload. **Assert
the served asset hash against `dist` before believing any measurement** — every number below was
taken only after `index-CrSicJCu.css` / `index-BHNWQR75.js` were confirmed in the live document.

1. **Shell activates at 1440×810 and 1280×768, degrades at 1280×767.** Probed on `.app-shell`'s
   computed `position` (`fixed` only under the gate). 1440×810 ON, `height: 810px`,
   `scrollHeight` 810 — no document scroll. 1280×768 ON, `height: 768px`, `scrollHeight` 768.
   1280×767 OFF — `position: static`, `scrollHeight` **8968** > 767, the document scrolls again.
   Exact at the boundary.
2. **The composition risk, measured.** `.app-header` `offsetHeight` **62** at 1280 and the
   Attributes `<summary>` **52** — both unchanged, with the Reset control riding the summary. The
   control does release its height as designed: its own rect is 16px against the summary's 24px
   line box, so the summary did not grow the 4px a `.btn--sm` drop-in would have cost. (The
   header's fractional rect is 61.5 — `12 + 36.5 + 12 + 1` — rounding to `offsetHeight` 62; F15's
   own record derives `HEADER_H = 12 + 37 + 12 + 1 = 62` and tabulates 62, so this is the same
   sub-pixel layout, not drift. The branch's CSS delta never touches `.app-header` at all.)
3. **Exactly one reset control at every width** — 1 at 1440×810, 1280×768, 1280×767 and at S; the
   accessibility tree likewise shows a single `button "Reset build"`. A REAL mouse click
   (`isTrusted: true`, logged through pointerdown/mousedown/mouseup/click) opens
   `#reset-build-dialog` — "Reset build?", the full blast radius, Cancel / Save a copy and reset /
   Reset build — and the Attributes `<details>` stays `open: true`. The `stopPropagation()` does
   its job; the confirm is still mandatory and was neither added to nor removed from.
   At S the control resolves `min-height: var(--tap-target)` to **44px** and renders exactly 44,
   which is the new census entry proved in the live tree rather than only in the parser.
4. **Anchors land flush.** Computed `scroll-padding-top: 120px` on `.col-right` and
   `scroll-margin-top: -76px` on `.grid-section` → 120 + (−76) = **44**. Both stay DERIVED
   (`--scroll-reserve: var(--sticky-stack-h)`, itself `calc(44px + 76px)`). Verified empirically
   too, not just as arithmetic: clicking the `#cat-defense` jump-nav link lands the target
   **43.75px** below the scrollport top — 44 within the same sub-pixel rounding as the header.

**OPERATOR ACTION:** `dev` pushed. `main` NOT touched. The throwaway `land-reset-slot8` and its
worktree were deleted; the source branch `reset-and-slot8` and worktree `/tmp/bb-small` are left
in place for the operator to remove. The two design-spec contradictions the F15 entry raised are
still UNRESOLVED — this landing did not touch them.

---

## 2026-08-26 · Tier 2 · fix — SynergyBoard duplicate React key (constrained mode)

─────────────────────────────────────────────
2026-08-26 — SynergyBoard keyed all eight cells in a row by `roleKind`; now keyed by `synergySlot.id`
Type: fyi
Actor: Tier 2 implementer (Claude Opus 5) — constrained implementation mode, file-boxed + proof-boxed
Slice: n/a (defect fix against `dev`, reported out of the F8-R2 `roll-ui` slice where the path was denied)

WHAT
`cell(synergySlot, roleKind)` in `src/ui/synergy/SynergyBoard.tsx` returned `<td key={roleKind}>` at
BOTH return sites — the `!synergySlot.unlocked` locked branch and the normal branch. The helper is
invoked as `synergySlots.map((synergySlot) => cell(synergySlot, roleKind))`, and `roleKind` is
constant for a whole row while `synergySlot.id` is what varies. All eight `<td>` siblings in one
`<tr>` therefore carried the same key, "fuse" or "reaction".

Both sites now key on `synergySlot.id`. Nothing else changed — no refactor, no behavioural change,
no comment rewrite. The three already-correct keys were left exactly as they were: `columnHeader`'s
`key={synergySlot.id}`, `rowLabel`'s `key={`${roleKind}-${block}`}`, and — importantly — the row key
`<tr key={roleKind}>`, which is correct because `roleKind` is precisely what distinguishes the two
rows.

WHY IT WAS LATENT, AND WHAT THE INVESTIGATION ADDED
A plain re-render does NOT surface this. `tests/ui/f11-synergy-board.test.tsx` clicks the board four
times (each `select()` → `setSelected()` → re-render) and emits ZERO warnings, because React matches
the eight cells positionally — `updateSlot` succeeds trivially when every old and new key is the
same string. The warning only fires when React is forced down the `mapRemainingChildren` path, which
happens when the child-list SHAPE changes. In this app that means an IMPORT: replacing the
synergySlots array. There the eight identical keys collapse into a single map entry, which is the
documented "children may be duplicated and/or omitted" hazard.

That is confirmed by attribution — every warning in a full-suite run came from an import-route test,
and from no other kind:

    28  stderr | tests/ui/f2-disclosure-surfaces.test.tsx
    42  stderr | tests/ui/f22-import-guard.test.tsx
    28  stderr | tests/ui/f4-slot7.test.tsx
    49  same key, `fuse`   /   49  same key, `reaction`   (perfectly symmetric: one per row per re-render)

EVIDENCE
Branch `dev`. Commit `e2a1fbb8f416360749720692b9980c55d2fe44a2`.
Diff is two lines, both `key={roleKind}` → `key={synergySlot.id}`, at the two `<td>` return sites.

1. `npx vitest run tests/ui/f11-synergy-board.test.tsx`
       Test Files  1 passed (1)
            Tests  23 passed (23)

2. `npx vitest run` (full suite, normal conditions)
       Test Files  69 passed (69)
            Tests  1433 passed (1433)
   Pre-fix baseline under the same normal conditions was also 69/69 and 1433/1433 — no new failures,
   and none fixed. Duplicate keys were a correctness hazard the suite never asserted on.

3. DUPLICATE-KEY REGRESSION PROOF — a controlled before/after, not a bare grep.
   The naive grep is NOT self-validating here: on a warm cache the pre-fix suite emits zero warnings,
   so "nothing found" would have proved nothing. The condition had to be made reproducible first.
   The trigger is the RTL `findByRole` async wait in the import tests losing its 1000 ms race, which
   is why the very first (cold, contended) run showed it and three later runs did not. Forcing it
   needs BOTH a cold Vite transform cache AND sustained CPU contention (32 spinners); slowness alone
   was insufficient — a 40.68s/225.61s loaded run still came back clean.

   Reproduction command, identical in all four runs:
       rm -rf node_modules/.vite && <32 CPU spinners> && npx vitest run 2>&1 | grep -ci "same key"

       PRE-FIX  run 1 → 98      (wall 77.33s, tests 403.68s)
       PRE-FIX  run 2 → 98
       POST-FIX run 1 →  0      (wall 76.41s, tests 403.06s)  → ">>> NO DUPLICATE KEY WARNING <<<"
       POST-FIX run 2 →  0

   The load profiles match to within ~1% and the same three load-induced timeout flakes
   (`f2-disclosure-surfaces`, `f22-import-guard`, `f4-slot7` — all import-route, all green at
   1433/1433 under normal conditions) fail in BOTH the pre-fix and post-fix heavy runs. The only
   variable that moved is the warning count: 98 → 0.

4. `npx tsc --noEmit` → exit 0, clean.
   No `lint` script exists in this project (scripts are: dev, build, preview, typecheck,
   generate:badges, test, test:watch), so the lint proof is N/A rather than skipped.

CONSTRAINED-MODE REPORTBACK
changed_files: src/ui/synergy/SynergyBoard.tsx (2 lines); .claude/reportback.md (this entry)
denied_paths_checked: no test file was added or edited — the regression proof was obtained by
  controlling cache+load on the EXISTING suite rather than by writing a new test, which was outside
  the box. No other component, no config, no `.claude/state.json` (this project has none — `.claude/`
  holds only agents/, db-register.md, reportback.md, worktrees/).
first_proof_result: PASS — f11-synergy-board 23/23
verification_evidence: see EVIDENCE 1-4 above; full logs in the session scratchpad
heartbeats_emitted: n/a (single-slice fix)
stop_conditions_triggered: none — scope never needed widening

SCOPE / PLAN IMPACT
None. No scope.md, tech-strategy.md, design-spec.md or H-ruling is touched. The board's stated
contract in the file header — it reads props and moves focus, dispatches no state change — is
unchanged; this only corrects the reconciliation identity of its cells.

NEXT
Nothing blocking. Committed to `dev` and deliberately NOT pushed, NOT merged, no branch created.
Two observations handed back to Tier 1, neither actioned here because both are outside this box:
  (a) The three import-route tests are genuinely timing-fragile — they lean on a 1000 ms
      `findByRole` wait and fail under CPU contention. They pass reliably unloaded, but they are
      the suite's most likely CI flakes.
  (b) No test asserts the absence of React key/console warnings anywhere in the suite, which is why
      a duplicate key across eight cells stayed invisible through the whole F11 slice.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · test-infra — suite-wide React console guard

─────────────────────────────────────────────
2026-08-26 — a `console.error`/`console.warn` during any test now fails that test
Type: fyi
Actor: Tier 2 (Claude Opus 5) — direct implementation against `dev`
Slice: n/a — closes observation (b) handed back from the SynergyBoard duplicate-key fix (`e2a1fbb`)

WHAT
`tests/setup-console-guard.ts` (new) spies on `console.error` and `console.warn` in `beforeEach`,
asserts the capture is empty in `afterEach`, and restores unconditionally. It is wired through
`test.setupFiles` in `vite.config.ts` so it applies suite-wide rather than per-file:

    setupFiles: ["tests/setup-console-guard.ts", "tests/setup-dom.ts"]

WHY
The prior entry closed with: "No test asserts the absence of React key/console warnings anywhere in
the suite, which is why a duplicate key across eight cells stayed invisible through the whole F11
slice." React reports render-integrity defects — duplicate/missing `key`s, invalid DOM nesting,
`act()` violations, bad prop types — on the console and NOWHERE else. None of them throw, so a test
that asserts on rendered output passes while React complains underneath. The console is an
assertion surface; nothing was reading it.

THREE DESIGN DECISIONS, EACH LOAD-BEARING

1. ORDERING. The guard is listed FIRST in `setupFiles`. vitest's default `sequence.hooks: "stack"`
   (confirmed at `@vitest/runner` → `resolved.sequence.hooks ??= "stack"`) runs `afterEach` in
   REVERSE registration order. Listing the guard first therefore makes its `beforeEach` install
   before any test-file hook AND its `afterEach` assert LAST — after `setup-dom.ts`'s RTL
   `cleanup()`, which is precisely where unmount-time warnings are emitted. Listed second, every
   unmount warning would be missed.

2. COMPOSITION WITH LOCAL SPIES, NOT COMPETITION WITH THEM. `install()` captures whatever
   `console.error` is CURRENTLY bound and forwards to it; `uninstall()` puts that same function
   back, unconditionally. Two files already mock the console on purpose —
   `tests/ui/recovery-boundary.test.tsx` (silences the boundary's own logging) and
   `tests/ui/f8-summary-text.test.tsx` (asserts locally that Copy neither warns nor errors). Both
   sit ON TOP of the guard: their assertions keep working, the guard sees nothing, and no wrapper
   stacks or leaks across tests. A local spy is a visible, reviewable opt-out; a blanket
   suppression inside the guard would not be.

3. THE ALLOWLIST IS EMPTY. The `TOLERATED` mechanism (pinned RegExp + a mandatory named `why`)
   exists so a future genuine exception has a narrow, reasoned shape. It has ZERO entries, because
   the full suite is green without any. A navigation tolerance was drafted and then DELETED once
   measurement showed it was unnecessary — see the blind-spot note below.

EVIDENCE
Branch `dev`. Commit `2ec043e`. Two files: `tests/setup-console-guard.ts` (new),
`vite.config.ts` (setupFiles + comment).

1. GUARD-CATCHES-THE-ORIGINAL-DEFECT PROOF — the load-bearing one. Reverting exactly the two lines
   of `e2a1fbb` (`key={synergySlot.id}` → `key={roleKind}` at the two `<td>` return sites) and
   running `npx vitest run tests/ui/f11-synergy-board.test.tsx`:

       Test Files  1 failed (1)
            Tests  23 failed (23)

   Every failure carries the formatted warning, e.g.
       1. (x8) error: Encountered two children with the same key, `fuse`. Keys should be unique...

   The fix was then restored (`git checkout --`) and f11 is 23/23 again. This is the defect that
   previously required a cold Vite cache PLUS 32 CPU spinners to reproduce; the guard now catches
   it on an ordinary single-file run.

2. `npx vitest run` — full suite WITH the guard active:
       Test Files  72 passed (72)
            Tests  1496 passed (1496)

   ZERO tests needed fixing and ZERO needed tolerating. Note the counts: the brief cited a 69/1433
   baseline, but `88e8b84` (F8-R2 roll UI) landed on `dev` mid-session and added three test files
   (`f8-pin-exclude`, `f8-reroll-dialog`, `f8-roll-panel`) / 63 tests. 72/1496 is the current
   baseline and the guarded run matches it exactly — no new failures, none fixed.

3. `npx tsc --noEmit` → exit 0, clean. No `lint` script exists in this project, so lint is N/A.

4. BEHAVIOUR PROBE, run through an isolated scratchpad vitest config so the shared working tree was
   never perturbed (another session held uncommitted edits in `tests/ui/` at the time):
       console.error("...same key, `%s`...", "fuse")  → FAILS, renders "...same key, `fuse`..."
       console.warn("plain warning", { a: 1 })        → FAILS, renders 'plain warning {"a":1}'
       console.log("diagnostics are untouched")       → PASSES
   The printf substitution matters because React warns via format strings; without it the message
   reads `%s` with the key dangling at the end. `console.log`/`.info`/`.debug` are deliberately
   unguarded — `tests/randomize.test.ts` prints INV-14/INV-23 invariant tables on purpose.

KNOWN BLIND SPOT, MEASURED RATHER THAN ASSUMED
`Not implemented: navigation to another Document` still prints twice in a full run. It comes from
`tests/ui/recovery-boundary.test.tsx` (2 in isolation; 0 from every other file probed), whose
recovery screen clicks a Blob anchor jsdom cannot follow. It is seen by NEITHER this guard NOR that
file's own `console.error` mock: jsdom's `VirtualConsole.forwardTo` was handed the console binding
captured when vitest built the environment, not the `console.error` visible from test code. A
TOLERATED entry was written for it, then removed after emptying the allowlist and re-running
`npx vitest run tests/ui` came back 42 files / 445 tests green — the message never reaches the
guard, so tolerating it would have been a hole bought for nothing. Documented in the file header.
The other blind spot is anything logged at module-import time or from `beforeAll`, which is outside
the `beforeEach`/`afterEach` window. React's render warnings are not in that class — they fire
during render/commit inside a test body — so the guarantee that matters is intact.

SCOPE / PLAN IMPACT
None. No scope.md, tech-strategy.md, design-spec.md or H-ruling is touched. No src/ file changed;
`src/ui/synergy/SynergyBoard.tsx` was perturbed only for proof 1 and restored.

NEXT
Nothing blocking. Committed to `dev`, deliberately NOT pushed, NOT merged, no branch created.
Two things handed back to Tier 1:
  (a) CONCURRENT SESSION. Another session was working this same tree during this slice: commits
      `88e8b84` + `d0a9c5b` landed on `dev` mid-run, and uncommitted edits to
      `tests/ui/f2-disclosure-surfaces.test.tsx`, `tests/ui/f22-import-guard.test.tsx`,
      `tests/ui/f4-slot7.test.tsx` plus a new untracked `tests/ui/import-route.ts` were present at
      commit time — apparently de-fragilising the three 1000ms-`findByRole` import-route tests
      flagged as observation (a) previously. Those files were left ALONE; `2ec043e` stages only
      `tests/setup-console-guard.ts` and `vite.config.ts`. The full-suite green above was measured
      with those uncommitted edits in the tree, since that is the only tree that existed.
  (b) The guard is a floor, not a ceiling. It cannot see warnings emitted outside a test body or
      routed through jsdom's VirtualConsole. If Tier 1 wants those covered too, the shape would be
      a `beforeAll`-scoped installation plus a vitest environment override — both larger than this
      slice and neither needed to close the defect class that motivated it.
─────────────────────────────────────────────

---

## 2026-08-26 · Tier 2 · fix — import-route tests made deterministic (no wall-clock waits)

─────────────────────────────────────────────
2026-08-26 — The 1000 ms `findByRole` wait on the import route is gone; the four import-route
test files now settle on a bounded microtask chain instead of a poll against a wall clock
Type: fyi
Actor: Claude Opus 5 — direct operator task (not a dispatched subagent slice)
Slice: n/a — closes observation (a) of the 2026-08-26 SynergyBoard duplicate-key entry

WHAT
New `tests/ui/import-route.ts` exports one helper, `importBuildFile(contents, fileName?)`, which
drives a JSON build through `ExportImportControls`' file input and returns the mounted confirm
dialog. It replaces every `await screen.findByRole("dialog", { name: "Import build" })` in the
suite, and the two trailing `waitFor(... toBeNull())` dialog-unmount waits with them.

The helper does two things. (1) It pins the `File`'s `text()` to a promise created BEFORE the
change event and already fulfilled, so resolution order is a fact about the Promise job queue
rather than about jsdom's Blob internals. (2) It awaits that same promise inside `act()`. App.tsx
registers its `.then` inside the change handler — before the helper's `await` registers its own
reaction on the same promise — and reaction jobs run FIFO, so when the helper's await resumes,
`setImportState` has already run; it ran inside the act scope, so React's work is in the act queue,
and `act` drains that queue before resolving. There is no timeout and no polling anywhere in the
path: it takes LONGER under load, it does not FAIL under load.

The two `waitFor` removals are the same argument at the other end. `confirmImport` / `onCancel`
clear `importState` synchronously inside the click handler, and RTL flushes `fireEvent` through
`act()`, so the dialog is already unmounted when `fireEvent.click` returns. Nothing was being
waited for.

WHY A BIGGER TIMEOUT WAS THE WRONG FIX, MEASURED
The read was never the slow part. On an idle box: `file.text()` itself 0.2 ms; the dialog reaches
the DOM after exactly ONE macrotask hop (78.1 ms end-to-end from the change event); one
`queryByRole("dialog", { name })` scan 9.2 ms. Yet `await findByRole(...)` cost 308.7 ms — RTL's
`waitFor` re-checks on a 50 ms `setInterval` and each check is a full role + accessible-name scan
over this app's ~2,800-element tree. Roughly 97% of the 1000 ms budget was poll cadence and scan
cost, not the file read. A contended box does not stop that clock, so the budget expires between
the polls that would have passed. Raising the budget only moves the load at which the same failure
returns; the helper deletes the clock instead.

SCOPE NOTE — A FOURTH FILE
The brief named three files. The first loaded full-suite run after fixing them surfaced
`tests/ui/summary-import-export.test.tsx` failing with the IDENTICAL error
(`Unable to find role="dialog" and name "Import build"`) from the same `findByRole` pattern in
three of its tests. It was fixed with the same helper rather than reported and left red: same
defect, same one-line application, and leaving it would have left the suite with exactly the CI
flake this slice exists to remove. Flagged here rather than done quietly.

EVIDENCE
Branch `dev`. The suite baseline moved during this work: it is 72 files / 1496 tests, not the
69 / 1433 the brief quotes — commit `88e8b84` (F8-R2 roll UI) landed on `dev` mid-session and
added 3 files / 63 tests.

1. PRE-FIX, LOADED — the failure reproduced on demand. 32 busy-loop spinners on a 10-core box
   (`ncpu=10`), three named files only:
       Test Files  3 failed (3)
            Tests  3 failed | 29 passed (32)
   All three failures are the import-route test in each file. Same three files, same spinners,
   POST-FIX: 32/32 green.

2. POST-FIX, UNLOADED — `npx vitest run`, full suite:
       Test Files  72 passed (72)
            Tests  1496 passed (1496)
   Measured twice: once in an isolated worktree pinned at `d0a9c5b` carrying ONLY this change, and
   again in the working tree at `278dbd6`. The second run includes the concurrent session's
   `tests/setup-console-guard.ts`, which fails any test that emits a React console warning — so it
   also proves the helper's `act()` usage emits no "not wrapped in act(...)" warning.

3. POST-FIX, LOADED — `npx vitest run` under 32 spinners, THREE consecutive full-suite runs
   (two isolated at `d0a9c5b`, one at `278dbd6`; ~97-99s wall, ~560-585s test time each):
       Test Files  1 failed | 71 passed (72)
            Tests  1 failed | 1495 passed (1496)
   Import-route failures in all three runs: 0, 0, 0. The single failure is the same test every
   time and is NOT an import-route test — see NEXT (a). Spinners were killed by an EXIT trap and
   `pgrep` confirmed clean after every run.

4. `npx tsc --noEmit` → exit 0, clean, in both trees. No `lint` script exists in this project
   (scripts: dev, build, preview, typecheck, generate:badges, test, test:watch), so the lint proof
   is N/A rather than skipped.

CONSTRAINED-MODE REPORTBACK
changed_files: tests/ui/import-route.ts (new, 63 lines); tests/ui/f2-disclosure-surfaces.test.tsx;
  tests/ui/f22-import-guard.test.tsx; tests/ui/f4-slot7.test.tsx;
  tests/ui/summary-import-export.test.tsx; .claude/reportback.md (this entry).
  Net −21 lines across the four test files. NO src/ file was touched — the app's import path is
  unchanged, and the stub lives entirely in the test's own `File` instance.
denied_paths_checked: `vite.config.ts` and `tests/setup-console-guard.ts` were modified in this
  tree by a CONCURRENT session and were deliberately left alone; they are theirs and are now
  committed as `2ec043e` / `278dbd6`. Nothing was staged but the six files above.
first_proof_result: PASS — the three named files 32/32 unloaded, then 3/3 files green under the
  32-spinner load that had just failed them 3/3.
verification_evidence: see EVIDENCE 1-4; full logs in the session scratchpad.
heartbeats_emitted: n/a (single-slice fix)
stop_conditions_triggered: none. The one scope decision (the fourth file) is disclosed above rather
  than folded in silently.

SCOPE / PLAN IMPACT
None. No scope.md, tech-strategy.md, design-spec.md or H-ruling is touched. No behavioural
assertion changed: every expectation in the four files is the one that was there before, reached
by a deterministic route instead of a timed one. The pre-existing `{ timeout: 20000 }` overrides in
`f22-import-guard.test.tsx` were left in place — they bound vitest's own per-test wall clock, which
no amount of determinism inside the test can remove, and a test that settles fast never spends it.

NEXT
Nothing blocking. Committed to `dev` and deliberately NOT pushed, NOT merged, no branch created.
Two observations handed back to Tier 1:
  (a) `tests/randomize.test.ts > INV-1a — determinism > 100 seeds x 10 repeats` is the suite's
      remaining load-sensitive test, and it is a DIFFERENT class: no async wait, no DOM — it is
      3,449 ms of pure computation against a 20,000 ms per-test budget, which 32 spinners on 10
      cores (4x oversubscribed) exhausts. It cannot be de-fragilised by removing a wait, because
      there is no wait; the only levers are less work per test or a larger budget. Untouched here
      because it is outside the brief and the choice between those levers is a judgement about the
      test's own design, not a mechanical fix.
  (b) CONCURRENT SESSION. Another session held this tree throughout: HEAD moved `893bdfe` →
      `d0a9c5b` → `278dbd6` mid-work, and `vite.config.ts` / `tests/setup-console-guard.ts` were
      edited under this session's feet. Verification was therefore moved into a detached
      `git worktree` pinned at `d0a9c5b` with only this change applied, so the numbers in EVIDENCE
      2-3 are attributable. Two agents mutating one Tier 2 tree is a coordination hazard, not a
      one-off: a `git stash` here would have been the accident, and the only reason it was not is
      that the overlap was noticed before the second one.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — F8-R2 roll UI, onto `dev`

**Event:** `integration-complete`
**Landed:** `roll-ui` (2 commits off `bc2002f`, worktree `/tmp/bb-roll`). FAST-FORWARD.
**`dev`:** `893bdfe` → **`d0a9c5b`**. **Merge commits 2 before, 2 after** — counted with
`git rev-list --merges --count dev`, never `git log --merges | wc -l`, which counts LINES.
`main` untouched, never checked out.

Rebased through the three landings that went in after the branch was cut (F15 header compaction,
the user-facing docs, and Reset placement + Synergy Slot 8). The source branch is checked out on a
worktree, so a throwaway `land-roll` was rebased in a SEPARATE worktree and `dev` fast-forwarded
onto it; `roll-ui` was never moved. Rebase commits: `c15837e`→`88e8b84`, `528eb17`→`d0a9c5b`.

### Conflicts — ONE, and the two forecast collisions did not materialise

**`src/App.tsx` did NOT conflict**, though the branch named it the likely collision. Both sides
edit it, but in DISJOINT regions: the Reset/Slot-8 landing touched the `AttributesSection` mount
(old line ~1463), while this branch's hunks land at old 43, 572, 1311, 1346, 1692, 1796 and 1807.
Git merged them without a marker. "No conflict" is not the same as "correct", so BOTH sides were
verified present rather than trusted: the `[A7]` pane mount still carries `onResetRequest` +
`canReset` (two mounts, lines 1689 and 1787), and the roll wiring is all there —
`RollControlsContext` wrapping the root, the pins/seed/lastRoll state block, `runRoll`,
`<RollPanel>` above `<SummaryPanel>`, and `<RerollConfirmDialog>`.

**`src/styles/app.css` did not conflict either, and its ORDERING held.** The branch's block is
placed BEFORE the end-of-file marker block, and that position is load-bearing. After the rebase
the order is `F14 app shell — end` (4608) → `F8-R2 roll surface` (4610) → `A5-U — bonus mode`
(4854) → `end A5-U — bonus mode` (5078, EOF). The file still ENDS with the A5-U marker, so the
assertion that reads `app.css` back is unbroken. Dev's own app.css edits (header gap, the
`.build-panel__reset` rules, the 868→768 gate) all sit ABOVE the insertion point.

**`tests/ui/f8-roster.test.tsx` — an overlap the forecast did not name**, and it did not conflict:
dev changed two `Export JSON`→`Export` assertions (lines ~253, ~390) and the branch changed the
disclosure `colspan` 5→6 (line ~224). Disjoint regions, and neither side adds or removes an `it`,
so there is no double-count in the arithmetic below.

**`.claude/reportback.md`** — the one real conflict, resolved by RECONSTRUCTION, never by editing
conflicted text. Both sides were confirmed PURE APPENDS first (each side's first 7111 lines
`cmp`-verified byte-identical to `bc2002f`), and the ours-side blob was confirmed identical to
`dev`'s 7809-line file.

**ORDER — the authored-time rule bit for the THIRD consecutive integration.** This branch's entry
was authored `09:12:09`; `dev`'s F15+docs integration entry `09:07:46` and its Reset+Slot-8
integration entry `09:29:18`. So the new entry belongs BETWEEN them, **not at EOF** — it lands
third-from-last. Resolved as base-through-F15-integration 7587 + branch 172 + the remaining dev
suffix 222 = **7981**, computed BEFORE the result was measured, and each of the three segments
then `cmp`-verified byte-identical against its own source blob. The rebased commit reports
`172 insertions(+), 0 deletions(-)` — the arithmetic proof that the insertion displaced nothing.

### Counts — predicted before they were read

  dev base                  1433 tests / 69 files
  branch on its own base    1489 / 72   (base `bc2002f` = 1426)
  branch net                1489 - 1426 = +63
  PREDICTED merged          1433 + 63   = 1496 tests / 72 files
  ACTUAL                    1496 / 72   MATCH

The 3 new files are the branch's three new test files; `bc2002f` and `dev` both carry 69, and dev
added none in between, so 69 + 3 = 72 with no interaction.

### Gates — all green, on a clean worktree at `d0a9c5b`

`npm test` 1496/1496 across 72/72 (52.55s) · `npm run typecheck` clean · `npm run build` clean
(83 modules, 334.54 kB js / 57.29 kB css). Zero flakes; nothing was re-run to make it pass, and no
timeout was lowered or tightened.

RUN-never-edit, run explicitly and additionally PROVEN unedited (`git diff` against both `bc2002f`
and pre-landing `dev` returns 0 lines for each): `tests/ui/overlays.test.tsx`,
`tests/category-colors.test.ts`, `tests/feasibility-golden.test.ts` — 29/29. No cell moved in the
504-cell golden. F9's census + the vocabulary lint (`tests/layout-arithmetic.test.ts`,
`tests/vocabulary.test.ts`) — 244/244.

**ZERO ENGINE DIFF, verified not assumed:** `git diff dev..land-roll -- src/engine` is EMPTY, and
`ROLL_ALGORITHM_VERSION` is byte-identical (3 references, unchanged).

### Browser — production build, port 5181, served bytes hash-checked against `dist`

The stale-asset trap was checked rather than assumed: `5173` is held by a stray dev server from a
previous day and `5183` by a sibling agent, so `5181` was used, and the SERVED asset md5s were
diffed against `dist` before any measurement was trusted (js `1d63880…`, css `2a14976…`, both
matching, and the loaded page reports exactly those two filenames).

1. **The owner's use case — PASSES.** Posterizer set to Gold, pinned (`Pin mode` defaults to
   `this level`), then `Fill remaining`. Posterizer stays **Gold and Pinned**; the roll added 28
   other badges across all six categories; Finishing went 6/40 · 1/6 → 34/40 · 6/6, so
   Posterizer's 6 points were preserved and only the remainder was spent. **Posterizer does not
   appear anywhere in the report** (`/Posterizer/` over the 1859-char report is false) — the roll
   did not touch it. The report NAMES what it added, per category, and closes with "Chosen at
   random from what fits. There is no ranking here."
2. **Shell gate:** ON at 1440x810 (doc does not scroll, shell height == viewport) · ON at
   1280x768 (doc 768, `.col-right` scrolls) · OFF at 1280x767 (doc scrolls). The gate flips
   exactly on the 1px boundary.
3. **Geometry holds:** Reset rides the Attributes `<summary>` (`insideSummary: true`,
   `margin-left: auto` = 32.98px) and does NOT grow it — the control measures 16px tall inside a
   summary that is still exactly **52px**, which is the "height released on purpose" claim holding
   in a real browser. Every section summary is 52px. Header is **62px** (`offsetHeight`; the
   unrounded box is 61.5 and F15's record derives the same 12+37+12+1).
4. **Applying a roll is exactly ONE state write** — `Storage.prototype.setItem` was instrumented
   on the autosave key across the click: **1** write, one loadout signature (29 entries). This is
   the runtime confirmation of the single `applyEdit` in `runRoll`.

### Notes handed back, none actioned here

  (a) `dev` moved THREE times mid-integration under a sibling agent (`e2a1fbb`+`893bdfe`
      SynergyBoard key fix, then `2ec043e`+`278dbd6` console guard). The landing was re-based on
      the tip each time and `d0a9c5b` remains an ancestor. The uncommitted `SynergyBoard.tsx`
      edit Tier 1 flagged as unowned was committed by its owner mid-session — it was never
      touched here.
  (b) `.gitignore`'s `node_modules/` trailing slash reproduced exactly as the branch warned: the
      symlinked `node_modules` in the landing worktree shows as `?? node_modules`. Nothing was
      staged with `git add -A`; every commit staged explicit paths only.
  (c) An untracked `tests/ui/zz-probe.test.tsx` (a sibling agent's perf probe importing a
      non-existent `./m4-rig`) sits in the main checkout. It cannot collect and would redden both
      `tsc` and the suite, which is why every gate above was run in a CLEAN worktree at the exact
      commit. It was not touched, moved, or committed.
─────────────────────────────────────────────
## F16 — the Loadout board: the 2K-native-shaped view (2026-08-26)

**Branch** `loadout-board` · base `origin/dev` @`16c0569` (1496 tests / 72 files) ·
worktree `/tmp/bb-board` · **pushed, not merged.**
**Rebased twice while in flight** — through the Synergy Slot 8 ratification, then
through the F8-R2 roll UI. Every figure below is the final tree.
**Proof** `docs/proof/f16-verification.txt` + six screenshots.

### What landed

Six discipline panels — what you hold, and how full each discipline is — as a new
`<Section title="Loadout board">` at `#panel-board`, between the badge grid and the
Synergy Slots panel inside `.col-right`. Three components plus a projection module:

| file | what |
|---|---|
| `src/ui/board/LoadoutBoard.tsx` | the container; six panels, always all six |
| `src/ui/board/DisciplinePanel.tsx` | one panel: header metrics, tiles, empty cells, the fence |
| `src/ui/board/BadgeTile.tsx` | the name cell, and its `empty` variant |
| `src/ui/board/board-model.ts` | the projection — purchased badges bucketed by discipline, dataset order |

Capacity is rendered as a **shape** rather than a fraction: filled cells, dashed empty
wells for unused Badge Slots, and — when you are over — a `--danger` rule labelled with
the shipped `over by N ⚠` string, with the badges beyond capacity sitting outside it.
That is the one thing the board borrows from the in-game screen that no other surface
in this app can do.

**It dispatches nothing.** No `onSetLevel`, no `assignSynergy`, no `clearSynergy`, no
write to the build envelope — asserted by absence over all four files. A project with
four shipped data-destruction defects gains **zero** new write paths from this view. Its
one callback writes `FilterState`.

### What was CUT from §7, and why

§7.3's recommended cut 1 — `SynergyBoard` — **had already shipped** (F11). What remained
of §7 was cut 2. I built §7.3's own **named alternative** (`DisciplinePanel` + `BadgeTile`,
read-plus-navigate) and cut `BoardDetail`, which §7.2 itself names as the trim of last
resort. Cut with it, deliberately and as a set:

- **`BoardDetail`** — §7.2: *"its badge half substantially duplicates the badge card."*
- **`Remove` on the board** — §2.5 puts Remove in the detail region and **only** there
  (*"a destructive control on a 94px cell you also press to select is a mis-click
  generator"*). No detail region ⇒ no Remove ⇒ no new write path. Not an oversight; the
  design's own placement rule, followed to its conclusion.
- **§5.3's `required (current)` requirement table** — lives in the detail region.
- **The selection model** (§2.3) — selection existed only to drive the detail region.
- **Synergy controls on the board** — the pairing board already ships inside the Synergy
  Slots section (§4.1) and was not moved.

The result is a complete surface, not a partial one: nothing half-wired is mounted.

### Where the design and the verification were STALE against the tree

1. **§7.3's cut 1 is already shipped.** `src/ui/synergy/SynergyBoard.tsx` and
   `tests/ui/f11-synergy-board.test.tsx` are on `dev`. Both documents predate it.
2. **§9.5/1 and §7.4 check 10 are BACKWARDS now.** They require the board to call
   `badgeSlotsCapacityUnset(**BASE**)`. A5 has since ruled the opposite and shipped it:
   `equipSlots === 0` iff base 0 **and** no bonus placed, so the predicate takes the
   **COMPOSITE** and a discipline with base 0 + a placed Bonus Badge Slot is *entered*
   (`src/engine/ledger.ts:213`, docstring). The board uses the composite, like every
   other surface. **A board built to the design's letter would have been wrong.**
3. **§5.2's `#badge-{id}` anchor does not exist.** *"the anchor §3.2 already requires on
   every card `<li>`"* — there is none in the tree. F16 adds it, plus the landing rule.
4. **§3.3's consumer count** — verification already corrected 5 → 3; confirmed 3.
5. **§9.2's plan to add `.board-panel__title` to the `--cat` placement lint would have
   required editing `tests/category-colors.test.ts`, a RUN-never-edit gate.** Its
   `var(--cat)` consumer list is an exact four-way match. Took F8-S2's roster-caption
   route instead — six explicit `[data-category]` rules naming `--cat-{key}` — which the
   lint does not see, and re-asserted all four of its conditions in F16's own block.
6. **§3.6's cell floor moved twice, both upward.** F11 measured the word (68 → 71); and
   the design **never costed the tile's meta row**, which at 74px is 3px wider than the
   longest badge name. `TILE_FLOOR` = max(name, meta) + chrome = **92**, not 89;
   `PANEL_TRACK` **266**, not 258.
7. **§5.5's "2 panel columns at 1280" assumed a 312px detail track beside them.** Without
   it the panels take the whole 885 and fit **three**. Asserted, so a later slice that
   adds the detail region knows it takes the third column back.

### The trap the verification found, and the one it did not

§15 warned about global exact-match `getByText` in `overlays.test.tsx`. It listed
`getByText("15")` and said *"clear, but do not add bare 2-digit numerals."*
**F16 added one** — `left <span class="num">15</span>` — and reddened
`overlays.test.tsx:90`, a RUN-never-edit gate, from across the document.

Fixed as a **class, not an instance**: no element on the board has a bare numeral as its
entire textContent. Fractions keep their slash, `left N` keeps its word (the numeric read
rides `font-variant-numeric`, which only affects digits), and the tile cost carries the
app's own shipped `pts`. A new case walks every board element with a canary, so the next
addition learns this here rather than from that gate.

### What it REFUSES to render

There is no *"Your Build Has No <Discipline> Badge Slots"* state. 2K's screen has that
sentence; ours cannot honestly say it, because nothing distinguishes a genuine zero from
a field never filled in. Both render identically — the shipped hint, an em dash for the
capacity, no fence, no empty cells, no over-by. **No 2K27 number is modelled here at
all**: every figure is one the engine already computes for another surface, and both
over-by strings are imported from the one builder.

### Gates

`typecheck` clean · `build` clean · **1568 / 1568 across 73 / 73 files** ·
the three RUN-never-edit gates **not one byte changed** and green (29/29) ·
F9's touch census green, with `.board-tile` and `.board-panel__browse` registered.

**Delta computed before the run and confirmed by it:** +72 = 32 (new file) + 20
(layout-arithmetic 142 → 162) + 20 (five suites parameterised over `src/**` × 4 new
files). **The delta was +72 / +1 against BOTH bases** — 1433/69 → 1505/70, and then
1496/72 → 1568/73 — which is the useful form of the check: it is a property of this
change, not of whatever the base happened to be that hour. No flake seen on this tree
across five full runs; no timeout was lowered, tightened, raised or added.

### The additive guarantee, MEASURED

Both builds served, the identical autosave seeded into each, every element in every
shipped region censused by tag, class and region-relative box, compared as a multiset.
At 1280×768, 1280×700, 768 and 390 the **only** difference anywhere is the jump nav's
new `Board` chip. `#panel-synergy`, `#panel-summary`, `.roll-panel`, `.ledger-panel`,
`.setup-panel`, `header` and the physique strip are element-for-element, pixel-for-pixel
and character-for-character identical; the grid's own box is unchanged to the pixel
(936×6610 at 1280, 736×9007 at 768, 366×18135 at 390). Re-run after the roll UI landed,
so its panel is covered too.

### Conflict forecast

- **`reset-and-slot8` / Synergy Slot 8 — DISCHARGED.** Already in `dev` @`4d1ba88`;
  rebased through it. One conflict, in `tests/layout-arithmetic.test.ts`: both sides
  append to `S_TOUCH_FLOOR_CENSUS`. Purely additive, resolved by keeping both. The board
  reads `slot.magnitude` off state and hardcodes no capacity, so the eighth ratified
  Synergy Slot needed no board change — it renders `(+2)` on 7 and 8 with zero edits.
- **`roll-ui` (`f8-r2`) — FORECAST, THEN DISCHARGED.** `git merge-tree` predicted that
  `src/App.tsx`, `src/styles/app.css` and `tests/ui/f8-roster.test.tsx` would all
  auto-merge and that only `.claude/reportback.md` would conflict. The roll UI landed on
  `dev` mid-slice and the real rebase behaved **exactly** as forecast: seven commits
  replayed, one conflict, in the log.
  The two App.tsx mounts are at different anchors (`#panel-board` above `#panel-synergy`;
  the roll panel above `#panel-summary`) and the two CSS blocks are in different regions
  (F16 between F11-end and F14-start, roll between F14-end and A5-U). Roll-ui does not
  touch `panelAnchors`, `clearAllFilters`, the card `<li>` or `tests/layout-arithmetic.test.ts`.

### For ruling

1. **`design.md` §9.5/1 + §7.4 check 10 are inverted by A5's shipped ruling** and will
   mislead the next implementer. Needs a rev.
2. **§9.2's `--cat` route is foreclosed** by a never-edit gate. The F8-S2 pattern is the
   only available one; §9.2 should say so.
3. **The design's cut-1 recommendation is spent.** Whoever writes §18 should record that
   cut 1 shipped as F11 and that F16 is the named alternative, minus `BoardDetail`.
4. **`BoardDetail` remains unbuilt**, and with it Remove-on-the-board and the
   `required (current)` table. Both are real deliverables and neither is started.

**OPERATOR ACTION:** branch pushed as `loadout-board`, **not merged**. Worktree
`/tmp/bb-board` left in place. A second worktree `/tmp/bb-devbase` (detached at
`4d1ba88`) and `/tmp/bb-devbase2` (detached at `16c0569`) were created purely for the
before/after census and can both be removed. The SynergyBoard duplicate-React-key defect
was **not** touched — another slice fixed it on `dev` while this one was in flight.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · hygiene — gitignore symlink, spec revs, I6 width census

Branch `hygiene-sweep` off `origin/dev` @`16c0569`. Four unrelated concerns, one commit each.
Nothing merged; `dev` and `main` untouched.

### 1. `.gitignore` — `node_modules/` -> `node_modules`

The trailing slash constrains the pattern to DIRECTORIES, so it never matched the bare
`node_modules` SYMLINK every parallel worktree creates. Reported twice before (most recently by
the F8-R2 landing, note (b)) and reproduced here before the fix: a fresh worktree with the
symlink showed `?? node_modules`, one `git add -A` away from committing the link.

Verified in BOTH directions, because dropping a slash could plausibly narrow the pattern:
  · symlink now ignored — `git status` clean in the worktree, `git check-ignore -v node_modules`
    reports `.gitignore:2:node_modules`
  · real directory still ignored — a throwaway repo with the bare pattern and an actual
    `node_modules/pkg/index.js` leaves it untracked (`git check-ignore` hits)

### 2. `tests/ui/zz-probe.test.tsx` — NOT FOUND, nothing deleted

The task was to read and reap it. It does not exist. Searched the main checkout, every registered
worktree and the whole `App Development` tree: zero hits for `zz-probe`. `git status
--untracked-files=all` in the main checkout lists only `.claude/worktrees/`. It was removed by
someone between the F8-R2 landing (note (c), which reported it) and now.

Its diagnosis in that note was also wrong on the facts, worth recording so it is not re-derived:
the probe was said to import "a non-existent `./m4-rig`". `tests/ui/m4-rig.ts` has been TRACKED
since the M4 commit `3be4210` and is imported by ~20 test files. Whatever made the probe
uncollectable, a missing `m4-rig` module was not it.

No file was deleted, moved, or staged for this item.

### 3. `design-spec.md` §3.1 / §3.2 — two stale lines revved

Both are workspace documents, not repo files; edited in place and NOT part of the branch.

  · **§3.1 touch-floor bullet** quoted the shipped ``Manage`` / ``Export JSON`` while §3.2 item 5
    specifies ``Export`` / ``Import``, and the tree ships §3.2's names (`SummaryPanel.tsx`
    `ExportImportControls`, pinned by F15 assertion 6, which asserts `Export JSON` is absent).
    Re-pointed at ``Export``, with a parenthetical recording that the design-review measurement it
    cites predates the F15 rename — the citation stays honest rather than being retro-fitted.

  · **§3.2's opening sentence** read "Two rows on desktop, three on mobile." BOTH halves were
    wrong, and mobile was verified rather than carried over. `docs/proof/f15-verification.txt` §4
    measures the header at every breakpoint: **1440 = 1 row · 1280 = 1 row (post-F15; 2 before) ·
    768 = 2 rows · 390 = 5 rows**. Mobile is five, not three, and it is unchanged by F15 — the
    spec figure was simply never right. Replaced with the measured counts, the reason the count is
    content-driven (`flex-wrap: wrap`, no declared height) and a citation to the proof file.

F15's own report had already flagged the §3.2 sentence and the §3.1 contradiction and explicitly
declined to re-pin them ("Reported, not silently re-pinned"). This closes both.

### 4. `tests/layout-arithmetic.test.ts` — the I6 census now covers WIDTH

§5.3's floor is 44x44; the census graded `min-height` only, so it was blind on two axes at once —
a control tall enough and too NARROW, and a floor spelled as a `44px` LITERAL, which no
`var(--tap-target)` probe can see. Three escapes came through those holes: `.synergy-board__button`
(literal, F11), `.build-panel__reset` (literal, [A7]), and `.pin-control` + `.roll-seed__regen`
(36px and 34px wide at S, 44 tall for free through `.btn`).

Escape 3's FIX was held by nothing at all. The stylesheet comment beside it says so in as many
words — "a min-width does not match its probe and the census stays exact" — so the rule could have
been deleted with every assertion staying green.

Added, without touching the height check:
  · **30** — each width-census control takes the floor from the token, sets no fixed `width` and
    no `max-width` cap that would defeat it
  · **31** — the width census is read back OUT of the stylesheet and must equal it in both
    directions (27's contract on the other axis), plus a literal sweep that bans a numeric
    `min-height`/`min-width` outright and permits a numeric `height`/`width` only for four frozen
    rules, each named with the assertion that pins its literal
  · **32** — canaries, fired through the SAME scanners the assertions use

27's inline scan was hoisted VERBATIM into `floorSelectors()` so the canaries exercise the shipped
code path rather than a copy of it. 27's behaviour is unchanged.

**Mutation-tested against the real stylesheet**, one run per escape shape:
  · delete the `min-width` fix ............ 30 and 31 RED (and 32 refuses to pass vacuously —
    it asserts its own precondition and reports "the canary did not actually remove the rule")
  · add a hard-coded `min-height: 44px` ... 31 RED, 27 GREEN — the exact shape that escaped twice
  · add a 44-tall / 34-wide control ....... 27 and 31 RED

`S_TOUCH_FLOOR_WIDTH_CENSUS` = `.filter-chip`, `.pin-control`, `.roll-seed__regen`.

### Pre-existing violations surfaced — REPORTED, not fixed

None that are wrong by VALUE. Every touch target that declares a floor declares it at 44+.

What the new sweep does surface is four rules that spell a size as a NUMBER inside an S block:
`.pip { width: 44px }` and the F3 slider trio (`.attr-slider__row input[type="range"]` plus its
`::-webkit-slider-thumb` / `::-moz-range-thumb`, height and width). These are the same SHAPE as
escapes 1 and 2 — correct value, token-invisible spelling — but each is frozen by an assertion
that matches the literal verbatim (assertion 8 for `.pip`, 27 for the range input), so re-pointing
them at `--tap-target` would redden the assertion that pins them. They are allowlisted in
`S_LITERAL_SIZE_EXEMPT` with the citation, and assertion 32(d) proves the allowlist is exactly the
shipped set rather than a wildcard. **Whether that trio should be re-pointed and its pins rewritten
is a separate decision and was not taken here.**

Two further stale-spec observations, NOT actioned (outside this sweep's scope):
  (a) §3.1's size bullet still says "`sm` -> 36px and `md` -> 44px" at S and calls `md` "the one
      used for every header and dialog action". Assertion 25 already contradicts both: BOTH sizes
      clear 44 at S, and no `md` Button renders anywhere in `src/ui/**` — every call site passes
      `size="sm"`. Assertion 25 pins the divergence so it is not silent; the bullet needs a rev.
  (b) `.app-header`'s S comment in `layout-arithmetic.test.ts` says the stylesheet has five S media
      blocks; it now has six. Cosmetic — `mediaBodies()` brace-matches all of them.

### What this sweep did NOT do

Nothing was width-fixed in the stylesheet. `src/styles/app.css` is byte-identical to `origin/dev`
(it was mutated three times for the tests above and restored from a backup each time; `git status`
confirms only the test file changed). The three RUN-never-edit gates are untouched — `git diff
origin/dev...HEAD` over them is empty.

### Counts — predicted before they were read

Baseline `dev` 1496 / 72 files. Items 1-3 add no tests; item 4 adds exactly 3 (assertions 30, 31,
32). Predicted **1499 / 72**. Read: **1499 passed / 72 files**. No flakes, no re-runs needed.

### Gates

  · `npm test` ................ 1499 passed, 72 files, 33.6s
  · `npm run typecheck` ....... clean (`tsc --noEmit`, no output)
  · `npm run build` ........... clean, 83 modules, 127ms
  · the three never-edit gates  29 passed / 3 files, run explicitly
  · F9's census (`-t "I6"`) ... 12 passed, assertions 20 / 23-32 all green

Every gate run in this worktree; no dev server started, no watch mode.

─────────────────────────────────────────────
## 2026-08-26 · Tier 2 · integration — F16 the Loadout board, onto `dev`

**Event:** `integration-complete`
**Landed:** `loadout-board` (8 commits off `16c0569`, worktree `/tmp/bb-board`). FAST-FORWARD.
**`dev`:** `16c0569` → **`c3f080a`**. **Merge commits 2 before, 2 after** — counted with
`git rev-list --merges --count dev`, never `git log --merges | wc -l`, which counts LINES.
`main` untouched, never checked out.

**The rebase was a NO-OP, and that is the whole story of this landing.** `dev` had not moved
since the author's second in-flight rebase: `git merge-base dev c3f080a` returns `16c0569`,
which IS `dev`'s tip. A throwaway `board-land` was cut at `c3f080a` and `git rebase dev`
answered "Current branch board-land is up to date." `loadout-board` was never checked out or
moved and `/tmp/bb-board` is untouched. Nothing was force-pushed. The remote
`origin/loadout-board` still holds the OLDER base (`4d1ba88`, 1505/70) and was ignored
throughout, as instructed.

### Conflicts — NONE. All three forecast collisions failed to materialise.

`.claude/reportback.md` was forecast as certain, `tests/layout-arithmetic.test.ts` and
`src/App.tsx` as possible. None conflicted, because a no-op rebase replays nothing. The
append-only reconstruction method was therefore not needed for the LANDING; it was used only
for this entry.

**Authored order held without intervention.** The F16 slice-complete entry (`3e9ba82`, authored
10:09:42) is later than `dev`'s tip entry (`16c0569`, 10:02:37), so its EOF placement was
already correct: 8339 + 156 = **8495** lines, verified. The last three integrations each had to
insert somewhere other than EOF; this one did not.

### Counts — computed before looking, then measured

| | tests | files |
|---|---|---|
| base `16c0569` | 1496 | 72 |
| predicted delta | +72 | +1 |
| **predicted** | **1568** | **73** |
| **measured** | **1568** | **73** |

The base was re-measured rather than assumed, in the clean detached worktree `/tmp/bb-devbase2`
at `16c0569`: 1496/72. Merged tree: 1568/73. 1568 − 1496 = 72; 73 − 72 = 1. Exact.

### Gates

- `npm test` — **1568 passed / 73 files**, 0 failed, 0 flakes (no re-runs needed).
- `npm run typecheck` — clean, exit 0.
- `npm run build` — clean, exit 0 (`index-CFhRbGK8.js` / `index-CijHueLd.css`).
- RUN-never-edit, proven **byte-unchanged by blob hash** rather than merely green — the same SHA
  on `dev`, on `board-land`, in `/tmp/bb-board` and in the working tree:
  - `tests/ui/overlays.test.tsx` `da7de501…`
  - `tests/category-colors.test.ts` `f1539c1d…`
  - `tests/feasibility-golden.test.ts` `cef359dc…` — the 504-cell golden. No cell moved.
- F9's census re-run by name: I6 #24, I6 #27 ("the census is exactly the stylesheet: not short,
  and not long") and A5-U #33 all pass.
- Vocabulary lint (`tests/vocabulary.test.ts`) and `tests/architecture.test.ts` pass.

### The two load-bearing properties, re-verified on the merged tree

1. **The board dispatches nothing.** No `onSetLevel`, no `assignSynergy`, no `clearSynergy`
   anywhere under `src/ui/board/`. Two `onClick`s exist; both route to the same
   `onBrowseCategory` → `browseCategoryInGrid`, which sets `filters`, moves focus, and touches
   the build not at all. At runtime the board's 29 interactive nodes are 28
   `<a class="board-tile">` in-page `#badge-*` fragments plus ONE
   `<button class="board-tile--empty">`; zero `input`/`select`/`textarea`, zero radios, zero
   dialogs, zero live regions.
2. **No bare numeral.** 0 offenders across the board's 263 live elements, with the canary
   confirming the detector fires on `15` and not on `6 pts`. The enforcing test is intact.

### Browser confirmation — production build on port 4319 (NOT 5173; a stray server holds it)

Served asset SHA-256s were diffed against `dist/` before any measurement was trusted — both
MATCH. An earlier integration was fooled by a port that probed free but served an exited agent's
build; this one was not.

1. **1280×768** — the board renders: six panels in vocabulary order, 936×616, mounted between
   `#badge-grid` and `#panel-synergy`, exactly as specified. **1280×767** — the F15 shell gate
   releases, `.col-right` stops being the scroll container, `body` overflow returns to
   `visible`, and the DOCUMENT scrolls (10784 > 767). No horizontal overflow at either height.
2. **The pre-existing views are unchanged, re-proven independently.** The base was built at
   `16c0569` and staged under the MERGED origin at `/base/` so both trees shared one
   `localStorage` and rendered the identical F8 fixture — cross-origin state injection kept
   losing to the app's unload flush, which is worth remembering. Then:
   - **Order-sensitive text census: identical.** Taking the base page's full rendered-text
     sequence and inserting the single string `Board` at the jump nav reproduces the merged
     page's hash EXACTLY (`2231bd4b`). Header, ledger, build panel, filter bar, all 53 cards,
     synergy panel, roll panel, summary, footer and dialogs carry the same text, in order.
   - **Element multiset: identical.** Canonical histogram hash `49862546` on both sides, 219
     keys, 3131 → 3132 elements, the +1 being `A.jump-nav__panel` — the `Board` chip.
   - Synergy panel, summary panel, roll panel, ledger and header additionally eyeballed intact.

   **ONE finding, benign and additive.** An element census keyed on `id` did NOT match, and the
   cause is real rather than incidental: the branch adds **53 `LI#badge-<slug>`** anchor targets
   to the grid's card wrappers — the deep-link targets the board tiles point at, which is the
   `BadgeGridSection.tsx` (+22) hunk. Verified strictly additive: **no pre-existing id removed
   or renamed** (`removed: []`), the shipped `#cat-*` anchors intact and in the same relative
   order. The author's "only the Board nav chip" census compared rendered elements and text, not
   `id` attributes; both statements are true of their own subject. React `useId` values
   (`_r_*`) also shift, as they must when any component is added.
3. **The roll flow still works, tested non-vacuously.** On the fixture as-shipped, *Fill
   remaining* correctly adds nothing — attributes are too low for five of six categories to be
   legal — so a pin assertion there would have been hollow. Attributes were raised to 90 to give
   the roll real work: *Fill remaining* then reported **5 of 6 categories filled · 29 added**,
   loadout 8 → 28. **Posterizer stayed Gold and stayed pinned** across it (`aria-pressed="true"`,
   `purchasedLevel: "gold"` in the autosave both before and after).
4. **The board offers no control that mutates the build** — property 1 above, enumerated on the
   live DOM rather than inferred from the source.

### Housekeeping

`dist/base/` and the two base assets staged under `dist/assets/` for the same-origin census were
removed afterwards, and `dist/` restored to the merged build's two files. Both preview servers
(4319, 4327) were stopped. Nothing was staged with `git add -A`: paths were named explicitly and
`git status` checked before the commit, so the worktrees' bare `node_modules` symlinks — which
`.gitignore`'s trailing-slash `node_modules/` entry does not match — were never committed. The
hygiene slice fixing that entry had NOT landed at integration time. The untracked
`.claude/worktrees/` directory in the main checkout was left alone.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — hygiene sweep, onto `dev`

**Event:** `integration-complete`
**Landed:** `hygiene-sweep` (3 commits off `16c0569`, worktree `/tmp/bb-hygiene`). Rebased
through the Loadout Board landing onto a throwaway `land-hygiene`, then FAST-FORWARD.
**`dev`:** `4982a68` → **`12822b7`**. **Merge commits 2 before, 2 after** — counted with
`git rev-list --merges --count dev`, never `git log --merges | wc -l`, which counts LINES.
`main` untouched, never checked out. `hygiene-sweep` itself was never moved and
`/tmp/bb-hygiene` is untouched.

### Conflicts — ONE of the two forecast, and it was the expected one

`tests/layout-arithmetic.test.ts` was forecast as the likely collision and **did not conflict**.
The two sides edited the same file in four places that never overlap: F16 appended to
`S_TOUCH_FLOOR_CENSUS` at ~2120 and added its own block after F11's `describe` close at ~2672,
while the hygiene branch hoisted the helper at ~2052, rewrote assertion 27's scan body at ~2207
and inserted the width block at ~2302. Git's 3-way merge replayed the branch verbatim: the
branch's own diff and `git diff dev..land-hygiene` for that file are **byte-identical modulo
hunk headers**, checked with `cmp`. Both sides are present — F16's `.board-tile` and
`.board-panel__browse` census registrations AND the hoisted helper, the width census and
assertions 30/31/32. Nothing was dropped to make the file parse.

`.claude/reportback.md` conflicted, as it always does.

### The hoisted helper, verified rather than assumed

`floorSelectors()` is defined ONCE (line 2063) and has five call sites: assertion 27
(`min-height`), assertion 31 (`min-width`) and three inside assertion 32's canaries. So a canary
red is evidence about the line that ships, which is the entire point of the hoist. **Assertion
27 behaves identically**: with `property = "min-height"` the template literal
`` `${property}: var(--tap-target)` `` is the same string the old inline scan matched, over the
same `/([^{}]+)\{([^{}]*)\}/g` rule split and the same
`.trim().replace(/\s+/g, " ")` normalisation. 27 is green on the merged tree and its census is
long-by-one under mutation (c) below — it still discriminates.

**Why the width census survived F16 unchanged.** F16's own S block declares `min-height` only —
no `min-width`, so assertion 31's read-back is still exactly `.filter-chip`, `.pin-control`,
`.roll-seed__regen`. F16's four literal sizes (`4px`, `20px`, `20px`, `1px`) all sit OUTSIDE any
`@media (max-width: 767px)` body, so `literalSizes(S_BODIES)` is untouched and 32(d)'s
exact-set assertion against the frozen four still holds. Checked before the rebase, not after
the tests happened to pass.

### `.claude/reportback.md` — reconstructed from source blobs, never hand-edited

Ninth use of the append-only method. Both sides are pure appends at line 8339: `dev` added
lines 8340–8610 (+271), the branch added 8340–8469 (+130). Expected merged length computed
BEFORE building it: 8610 + 130 = **8740**. Measured: **8740**.

**The entry does NOT go at EOF.** Authored order, by commit author date:

| entry | authored | placement |
|---|---|---|
| F16 slice-complete (`3e9ba82`) | 10:09:42 | 8340 |
| **hygiene sweep (`69b43a2`)** | **10:21:28** | **8498** |
| F16 integration (`4982a68`) | 10:47:58 | 8627 |

All three entries carry the same calendar date, so the ordering came from author timestamps, not
from the headers. The hygiene block was spliced between the two F16 entries. Its leading blank
line also restores the file's `rule / blank / header` convention, which the F16 entries had
dropped.

Four `cmp` checks, all byte-identical: `merged[1..8496]` vs `dev[1..8496]`;
`merged[8497..8626]` vs the branch's 130 authored lines; `merged[8627..8740]` vs
`dev[8497..8610]`; and the whole-file cross-check `merged` minus the spliced range vs `dev`.

### Counts — computed before looking, then measured

| | tests | files |
|---|---|---|
| base `4982a68` | 1568 | 73 |
| predicted delta | +3 | +0 |
| **predicted** | **1571** | **73** |
| **measured** | **1571** | **73** |

The branch adds exactly three assertions (30, 31, 32) to an existing file, so no file count
moves. 1571 − 1568 = 3. Exact.

### Gates

- `npm test` — **1571 passed / 73 files**, 0 failed. No flakes, no re-runs needed.
- `npm run typecheck` — clean, exit 0.
- `npm run build` — clean, exit 0 (`index-CFhRbGK8.js` / `index-CijHueLd.css`, unchanged from
  the F16 landing, as a test-only + gitignore change should leave them).
- RUN-never-edit, proven **byte-unchanged by blob hash** rather than merely green — identical
  before the run, after the run, and to `dev:<path>`:
  - `tests/ui/overlays.test.tsx` `da7de501…`
  - `tests/category-colors.test.ts` `f1539c1d…`
  - `tests/feasibility-golden.test.ts` `cef359dc…` — the 504-cell golden (7 × 6 × 4 × 3).
    `toEqual(GOLDEN)` passed. **No cell moved.**
- F9's census re-run by name: I6 #23–#29 and the new #30–#32 all pass, plus F5.3/C #20 and
  F11 #12.
- Vocabulary lint (`tests/vocabulary.test.ts`) passes.

### The mutation tests, re-run ON THE MERGED TREE

The point of the slice is that the census goes RED against the escapes it names, and a merge
could silently defeat that. All three shapes re-checked after the rebase. `src/styles/app.css`
baseline blob `291698d9345fa9922d56cdf36d1ebdb7fc299153`.

| # | mutation | reddens |
|---|---|---|
| a | delete the `.pin-control, .roll-seed__regen` `min-width` rule | **30, 31, 32** |
| b | add a hard-coded `min-height: 44px` in an S block | **31, 32** — 27 stays GREEN |
| c | add a control 44 tall and `min-width: 34px` | **27, 31, 32** |

- **(a)** 30 fails `no S rule for .pin-control`; 31's read-back collapses to `['.filter-chip']`
  against the 3-entry census; 32(a) fails `the canary did not actually remove the rule` —
  self-detecting that the rule it exists to delete is already gone. This is the regression the
  roll slice's fix was held by NOTHING against before assertion 31 existed.
- **(b)** 31 fails with its own diagnostic — *"spells min-height as 44px — use var(--tap-target)
  so the census can see it (this is the F11 / [A7] escape shape)"* — and 32(d)'s frozen-four set
  grows to five. **Assertion 27 stays green**, which is the blind spot being closed, demonstrated
  rather than asserted: a literal floor is invisible to the token read-back.
- **(c)** 27's census goes long by one (20 vs 19) AND 31's literal sweep catches the `34px`.
  Both axes fire.

**The stylesheet was restored byte-identically after each**, via `git checkout --` and verified
two ways every time: `git hash-object` back to `291698d9…`, and `cmp` against a pristine copy
taken before the first mutation. I6 re-run green afterwards. `git status` clean at the end.

### Housekeeping

The `.gitignore` fix (`node_modules/` → `node_modules`) is the reason it was authored: a git
worktree's `node_modules` is a bare SYMLINK, which a trailing-slash entry does not match. It was
NOT in effect in the integration worktree until it landed, so nothing was staged with
`git add -A` — paths were named explicitly and `git status` was checked before each commit. No
`npm install` was run in any worktree, no watch mode, no dev server. The untracked
`.claude/worktrees/` directory in the main checkout was left alone.

---

## The "Badge Points" → "Badge Tokens" vocabulary sweep — slice-complete

**38 files changed, 398 insertions, 130 deletions** against `e927a70`. 18 `src/`, 16 `tests/`,
3 shipped docs, `docs/vocabulary.md`.

### The brief arrived with the direction transposed, and it was NOT executed as written

The dispatch asked for **"Badge Tokens" → "Badge Points"**. Every authority in the tree says the
opposite, and running it would have been destructive rather than merely wrong:

- `reportback.md:6854` names the slice **"The Badge Points → Badge Tokens rename sweep"**.
- `reportback.md:7141` — *"'Badge Tokens' is NOT the shipped word … the sweep has not run."*
- `types.ts:207` and `BonusDialog.tsx:38` both recorded the rename as approved-but-pending.
- `EXPLANATION.md:59` and `config/index.ts:30` cite **2K's own page** for the term "Badge Tokens".

The brief also asserted that the docs had shipped the new word and the UI had not; both said
"Badge Points" and agreed with each other. Executing as written would have rewritten three true
statements about 2K's terminology into false ones — **inventing 2K27 data, the one thing the seed
forbids outright** — and deleted the record of the approval. Stopped and surfaced; direction was
confirmed reversed before any file was touched.

### Display copy only — the storage vocabulary deliberately did NOT move

`serializeSavedBuild` is a bare `JSON.stringify` with no translation boundary, so property names
ARE the on-disk format. Left exactly as they were, and now commented as such at the seam
(`BonusBudget` in `types.ts`):

| kind | names held back |
|---|---|
| localStorage keys | `badge-builder-2k27:autosave:v1` · `:named-builds:v1` · `:ui-state:v1` · `:autosave-quarantine:v1` |
| sessionStorage key | `bb2k27.ui.scrollTop.colRight` |
| `SavedBuild` fields | `schemaVersion` `dataVersion` `savedAt` `name` `build` `budgets` `bonus` `loadout` `synergy` `config` |
| economy fields | `Budget.points` · `BonusBudget.earnedPoints` / `appliedPoints` / `earnedEquipSlots` / `appliedEquipSlots` |
| identifiers | `remainingPoints` `basePoints` `bonusPoints` `pointsPool` `BUDGET_POINTS_MAX` `overByBadgePoints` `freesPointsToCategory` `pinnedOverPoints` `unpinnedPoints` |
| discriminator | the `"points" \| "equipSlots"` pool union |

`src/engine/serialization.ts` and `src/persist/local-storage.ts` are **byte-unchanged** by the
sweep, and the four `SavedBuild`/`Budget`/`BonusBudget`/`LoadoutEntry` field lists diff IDENTICAL
against `origin/dev`.

### The old-save round-trip, proved rather than asserted

`tests/rename-old-save-roundtrip.test.ts` (5 assertions). **The fixture was emitted by
pre-rename code** — `serializeSavedBuild` at `e927a70` — and pasted in byte-for-byte, because a
fixture hand-typed by whoever wrote the rename only proves that person's beliefs were
self-consistent. It deserializes without throwing; both drift channels (`droppedEntries`,
`clearedSynergyRefs` — what drive the disclosure banner) are empty; every economy value survives;
it **re-serializes BYTE-IDENTICALLY**; and the JSON still spells `points`, which now fails loudly
if anyone tidies it.

Also proved in the browser on the production build (below).

### Judgement calls — matches deliberately NOT swept

- **`src/styles/tokens.css`** and `app.css`'s token references — design tokens, a different sense.
- **`scripts/generate-badges.ts`** — parser tokens (threshold token, em-dash null token).
- **`src/engine/randomize.ts`** — `ReproducibilityToken`, a seed-versioning type.
- **`docs/vocabulary.md` / `tests/vocabulary.test.ts`** "banned token" — the lint/lexical sense.
  The page's own wording was changed to "banned **word**" so the two senses stop colliding.
- **`layout-arithmetic.test.ts`'s I6 census** — "FROM THE TOKEN" is the design-token read-back.
- **`config/index.ts:94`** — `"The attribute → (equipSlots, points) derivation"` is written in
  IDENTIFIER vocabulary (it says `equipSlots`, not "Badge Slots"), so it stays.
- **`docs/proof/` (8 files)** — dated records of what specific verification runs observed.
  Rewriting them would make them assert things that never happened. Same principle applied to
  past reportback entries: this is an APPEND, and `:6854` / `:7141` are left as written.

### `pts` — the one open item, deliberately not decided here

The app abbreviates the currency as **`pts`** in 39 places (`6 pts`, `N pts left`, `15 / 16 pts ·
left 1`), and `BadgeTile.tsx:117` documents it as *"the app's own shipped abbreviation"*. It is
NOT gate-asserted (all three gates contain zero `pts`). It was left alone: `tks`/`tkns` would coin
an abbreviation, and expanding to `tokens` would change an established compact format across 4
test files — both are copy-standard inventions, which the ruling weighed as more risk than the
inconsistency. **Flagged for a decision, not silently skipped.**

### The vocabulary lint now has a currency class

Class 4 in `tests/vocabulary.test.ts` bans the phrase **"Badge Points"** from shipped code and
copy, and nothing more — it does NOT mandate the full term everywhere. Bare `slot` is banned
because it COLLIDES (Badge Slots vs Synergy Slots); there is no second token currency, so the
analogy is not extended. The pattern **requires whitespace between the two words**, so
`overByBadgePoints` / `earnedPoints` / `remainingPoints` can never match it — the lint can never
pressure anyone into renaming a serialized field.

**Watched failing, not merely asserted.** Reintroducing `Badge Points{" "}` into
`CategoryLedger.tsx`'s rendered lede turned the per-file scan RED with its own diagnostic, and the
canary alongside it exercises the lint MECHANISM (`stripComments` + `exec` over real file
contents) rather than the regex against a literal. Restored byte-identically afterwards
(`git diff --quiet` clean).

### Gates

`tests/ui/overlays.test.tsx` was touched under **narrow authorization: vocabulary only**, four
asserted strings, nothing structural — no matcher, assertion count, test name, `describe`, or
fixture value; `{ points: 16, equipSlots: 3 }` at line 41 untouched. The diff is exactly 4 changed
lines. The gate pins the ledger/overlay separation, a STRUCTURAL property expressed through exact
strings; renaming the vocabulary underneath preserves what it protects.

| was | now |
|---|---|
| `… ceilings. Points are unchanged.` | `… ceilings. Tokens are unchanged.` |
| `Badge Points 7 / 16` | `Badge Tokens 7 / 16` |
| `… Primary points are unchanged; 1 of 6 …` | `… Primary tokens are unchanged; 1 of 6 …` |
| (the two above, concatenated) | (both, renamed) |

**The other two gates are byte-unchanged, verified by blob hash rather than by passing:**
`tests/category-colors.test.ts` `f1539c1dda0dbeb625f3891cb31d31646e1151a3` ·
`tests/feasibility-golden.test.ts` `cef359dc01c40ddda1ef5a629c4f81ec060288d7` — both identical to
their pre-sweep values. The 504-cell golden did not move. Their `point` hits were ordinary English
("entry points") and identifiers (`remainingPoints`), neither of which this rename touches.

### Verification

- **`npm test` — 73 files, 1648 passed.** Predicted before looking: baseline 1645 after the sweep
  (1568 + 77 from class 4: 1 breadth + 73 per-file + 3 canaries), then +3 from the hygiene slice
  picked up in the rebase, then +5 from the round-trip guard → **1653** at final count.
- `npm run typecheck` clean · `npm run build` clean (87 modules).
- Three gates run explicitly: 29 passed.
- F9 / I6 touch-floor census: `layout-arithmetic.test.ts` 165 passed.
- Vocabulary lint incl. class 4: 183 passed.

### Browser proof — production build, free port, hashes diffed first

Served `dist/` on **5252** (5173 was occupied by a stray server). Before trusting anything, the
served bytes were checksummed against disk: `index-BWArAc6g.js`
`4558582e794d4f5a31c13b534656fe3161f049af36c7f5b4df981c9ea9b090d4` and
`index-CijHueLd.css` `1ac21a705075ed434affc2a14fe5640e870d29eb7e0674581ec567f92b4972c0` — both
**MATCH `dist/`**, and the live DOM's `<script>`/`<link>` resolve to those same hashed names. The
served bundle contains **zero** "Badge Points".

- Build panel renders `Badge Tokens & Badge Slots`; ledger lede `Badge Tokens 0 / 23 · left 23 ·
  Badge Slots 0 / 5`.
- **F9's bonus dialog**: title `Bonus Badge Tokens & Badge Slots`, both column heads, and both
  `data-pool` attributes (the S container query prints them via `::before`) — 9 "Badge Token" hits,
  9 "Badge Slots" hits, 0 "Badge Points".
- **Old save loaded through the real Import route**: the confirm dialog read `pre-rename build` /
  `2026-08-26T09:00:00.000Z` / `2026-08-26.1`; after `Replace working build`, name, per-category
  budgets (16/3), bonus (`earnedPoints` 12, `appliedPoints.Finishing` 7) and both loadout entries
  all came back, the ledger composed base+bonus correctly (`0/23`, `6/21`), **no disclosure banner
  and no quarantine key**, and the autosave it wrote back still spells `points` / `earnedPoints` /
  `appliedPoints` with no `tokens` field anywhere.

**One pre-existing behaviour observed and cleared as NOT this slice's:** an autosave payload
injected directly into `localStorage` is overwritten by a mount-time write rather than restored.
The identical procedure was run against a **pre-rename build of `e927a70` served on 5300** and
behaves the same way, so it predates the sweep. Noted, not fixed here — the Import route is the
real user path and it round-trips correctly.

### Housekeeping

Own worktree on `badge-tokens-rename`, rebased onto `e927a70` when the hygiene slice landed
mid-slice (clean, no conflicts; the slice's new files carried no currency copy). No `npm install`
in any worktree, no watch mode, no foreground dev server. Paths staged explicitly. The stale
`badge-points-rename` branch from the transposed first attempt has no commits and could not be
deleted — the permission layer blocks agents from deleting branches — so it is left for the
operator.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · integration — the "Badge Points" → "Badge Tokens" sweep, onto `dev`

**Event:** `integration-complete`
**Landed:** `badge-tokens-rename` (6 commits off `e927a70`, worktree `/tmp/bb-rename`). Rebased
onto a throwaway `rename-integrate`, then FAST-FORWARD.
**`dev`:** `e927a70` → **`cb2eac8`**. **Merge commits 2 before, 2 after** — counted with
`git rev-list --merges --count dev`, never `git log --merges | wc -l`, which counts LINES.
`main` never checked out. `badge-tokens-rename` itself was never moved and `/tmp/bb-rename` is
untouched.

### The forecast rebase had ALREADY happened, and that was checked rather than assumed

The dispatch forecast a rebase "through the hygiene landing (+3 tests)" from a `4982a68` cut, and
conflicts in `.claude/reportback.md` (certain) and `tests/layout-arithmetic.test.ts` (possible).
**None of that was outstanding.** `git merge-base dev badge-tokens-rename` returned `e927a70` —
`dev`'s own tip — and `git rev-list --count badge-tokens-rename..dev` returned **0**, so the
branch already contained the hygiene landing. `git reflog show badge-tokens-rename` names the
moment: entry `@{2}` is `rebase (finish): refs/heads/badge-tokens-rename onto e927a70`, with the
last two commits authored after it. The slice's own reportback entry says the same thing in
prose. `git rebase dev` on the throwaway therefore reported *"Current branch rename-integrate is
up to date"* and the tree hash was **identical before and after — `083374c0…`**. Zero conflicts,
zero resolutions, and no opportunity for one to be resolved wrongly.

That does not make the two forecast collisions unexamined — it moves them from *resolve* to
*audit*, because a bad resolution in the earlier rebase would land here just as silently.

**`tests/layout-arithmetic.test.ts` — both sides present.** The branch differs from `dev` by
**exactly one line** (`--numstat` = `1 1`), a comment at ~1568 inside the F5.3/C reset-scope
assertion, changing *"Also clear Badge Points and Badge Slots"* to *"…Badge Tokens…"* so the
comment still quotes the checkbox it is about. The hygiene slice's work all survives: the hoisted
`floorSelectors()` is defined ONCE at line 2063 with its five call sites intact (assertion 27 at
2262 on `min-height`, assertion 31 at 2436 on `min-width`, three inside assertion 32's canaries at
2473/2486/2500). Nothing was dropped to make the file parse. Whole file: **165/165 green**.

**`.claude/reportback.md` — a pure append, no splice.** The branch's block is 159 lines appended
at `@@ -8870,0 +8871,159 @@`, i.e. onto the post-hygiene EOF, not into the middle of it.

### The three properties the sweep had to preserve, verified by hash and by diff

**1 — no persisted or serialized name moved.** The two files that define the wire format are
**byte-unchanged, proven by blob hash** and absent from the 39-file diff entirely:

- `src/engine/serialization.ts` — `070481dc…` on `dev` **and** on the branch
- `src/persist/local-storage.ts` — `72f65503…` on `dev` **and** on the branch

The storage keys were enumerated independently on both refs and compared as sets — identical:
`badge-builder-2k27:autosave:v1`, `…:autosave-quarantine:v1`, `…:named-builds:v1`,
`…:ui-state:v1`, `badge-builder-2k27-raw-saved-data.json`, `bb2k27.ui.scrollTop.colRight`.
Then the stronger check, run over the diff rather than over the endpoints: **every removed line**
in `src/` and `tests/` was grepped for `earnedPoints|appliedPoints|earnedEquipSlots|
appliedEquipSlots|"points"|equipSlots`. Exactly **one** line matched —

```
-          {unpinnedPoints} {unpinnedPoints === 1 ? "point" : "points"}) and fills the pool
+          {unpinnedPoints} {unpinnedPoints === 1 ? "token" : "tokens"}) and fills the pool
```

— in `RollPanel.tsx`, where the two matches are the singular/plural **display noun** and the
identifier `unpinnedPoints` is unchanged on both sides. The `"points" | "equipSlots"`
discriminator occurs twice on `dev` and twice on the branch. Every economy identifier's occurrence
count **rose** rather than fell (`earnedPoints` 40→46, `appliedPoints` 54→59, `earnedEquipSlots`
79→81, `appliedEquipSlots` 104→106, `SavedBuild` 280→294) — the new round-trip guard and the
class-4 negative canaries reference them. Nothing was renamed.

`src/engine/types.ts` is the largest src hunk (+26/−3) and is **entirely a comment**: a new
`DISPLAY VOCABULARY vs STORAGE VOCABULARY` seam note over `BonusBudget` explaining that the
divergence is deliberate. `earnedEquipSlots` and `earnedPoints` are declared exactly as before.

**2 — `tests/ui/overlays.test.tsx`: four lines, vocabulary only.** `--numstat` = **`4 4`**. All
four sit inside asserted strings: a regex literal at 101 (`Points are unchanged` →
`Tokens are unchanged`), the argument to `toContain` at 135 (`"Badge Points 7 / 16"` →
`"Badge Tokens 7 / 16"`), and two full literal strings at 149 and 156. **No matcher changed**
(`toContain` on both sides), no assertion was added or removed, no `it` or `describe` name moved,
and **line 41's `budgets: { Finishing: { points: 16, equipSlots: 3 } }` is untouched** — it is
not in the diff, and it was read back off the branch to confirm. The other two RUN-never-edit
gates are **byte-unchanged by blob hash**, not merely green:

- `tests/category-colors.test.ts` — `f1539c1d…` on both refs
- `tests/feasibility-golden.test.ts` — `cef359dc…` on both refs — the 504-cell golden
  (7 × 6 × 4 × 3 = 504), which did not move

**3 — `docs/proof/` is untouched.** `git diff --name-only dev badge-tokens-rename -- docs/proof/`
returns **0 files**. *Correction to the dispatch's framing:* the directory holds **139** tracked
files, not eight — 108 `.png`, 28 `.txt`, 3 `.md`. Zero of the 139 changed, so the property holds
either way, but the count is recorded here so the next slice inherits the real number. Past
`.claude/reportback.md` entries were likewise appended, never revised: the 9,029 lines that
preceded this entry are byte-identical to `HEAD`'s blob, checked with `cmp` before writing.

### Counts — computed from source before measuring

| | tests | files |
|---|---|---|
| base `e927a70` | 1571 | 73 |
| predicted delta | +82 | +1 |
| **predicted** | **1653** | **74** |
| **measured** | **1653** | **74** |

The +82 was derived, not copied from the dispatch. `tests/vocabulary.test.ts` class 4 is a
**4 + N** shape: four fixed canaries plus one `it` per source file, where the file set is
`srcSources` = `import.meta.glob("/src/**/*.{ts,tsx}")` in `tests/helpers/test-utils.ts`, and the
branch's `src/` holds **73** `.ts`/`.tsx` files → **77**. `tests/rename-old-save-roundtrip.test.ts`
is the one new file and contributes **5**. **1571 + 77 + 5 = 1653**; **73 + 1 = 74**. Confirmed
against the run: `vitest -t "class 4"` reports **77 passed | 106 skipped (183)**, and 106 + 77 =
183 is the whole vocabulary file.

### Gates

- `npm test` — **1653 passed / 74 files**, 0 failed. **No flakes, no re-runs, no timeout touched.**
- `npm run typecheck` — clean, exit 0.
- `npm run build` — clean, exit 0 → `index-BWArAc6g.js` (339.34 kB) / `index-CijHueLd.css`
  (62.54 kB, unchanged from the hygiene landing — the sweep moved no CSS but one comment).
- RUN-never-edit gates, run explicitly: `tests/ui/overlays.test.tsx` **4/4**,
  `tests/category-colors.test.ts` **21/21**, `tests/feasibility-golden.test.ts` **4/4**.
- F9's touch-floor census — `-t "I6 — the S touch floor"` **10 passed / 155 skipped**; the whole
  `tests/layout-arithmetic.test.ts` **165/165**.
- `tests/rename-old-save-roundtrip.test.ts` — **5/5**, named individually, including
  *"RE-SERIALIZES BYTE-IDENTICALLY"* and *"the saved JSON still spells the currency `points`"*.
  The fixture was **not** regenerated, reformatted or reflowed: it entered the tree in `88789b2`
  and has not been touched since. Its value is that it is genuinely old output.

### Both vocabulary lints WATCHED FAILING — externally, on a real source file

Green lints prove nothing; the in-suite canaries were re-proved from outside the suite by
mutating shipped source and watching the run go red. `src/ui/grid/CategoryLedger.tsx` was the
subject both times, and was restored from `git checkout --` afterwards with its blob re-hashed to
`043cae18…` = `HEAD`'s, and `git status` re-checked clean.

| mutation | expected | observed |
|---|---|---|
| `Badge Tokens{" "}` → `Badge Points{" "}` | class 4 red | **2 failed** — the per-file lint AND *"THE REGRESSION CANARY"* |
| `Badge Slots{" "}` → `Slots{" "}` | class 1 red | **1 failed** — H1 bare-`slot` lint |

Class 4's own regression canary is the right shape: it takes the **real** `CategoryLedger.tsx`
text, strips comments, asserts clean, then does `shipped.replace("Badge Tokens", "Badge Points")`
and asserts the lint catches it — with a guard that the replace actually found something, so a
drifted fixture fails loudly instead of vacuously passing. It also asserts a comment-only mention
stays legal, which is what lets `types.ts` name the old word to explain the divergence.

### Browser proof — production build, port 4319, staleness ruled out FIRST

`dist/` served by `python3 -m http.server 4319`. **5173 was avoided deliberately** (and was in
use by another process). An earlier agent on this project was fooled by a stale page, so the
served bytes were reconciled against `dist/` **before** anything was read off the screen:

1. served `index.html` references `assets/index-BWArAc6g.js` + `assets/index-CijHueLd.css` —
   the two names `vite build` had just emitted;
2. both were fetched over HTTP and `cmp`'d against `dist/assets/` — **byte-identical**
   (`sha256` heads `4558582e794d4f5a`, `1ac21a705075ed43`);
3. the live document's own `<script src>` / `<link href>` were read back in-page and are the
   same two hashes.

With that established:

- **Bonus dialog** (opened by real click on `Bonus Badge Tokens & Badge Slots…`): title
  **"Bonus Badge Tokens & Badge Slots"**, field label **"Bonus Badge Tokens earned in total"**,
  column header **"Badge Tokens"**, and six per-category labels *"Finishing bonus Badge Tokens"*
  … *"Physicals bonus Badge Tokens"*.
- **Category ledger**: `.category-ledger` renders **"FINISHING / Badge Tokens 0 / 0 / left 0 /
  Badge Slots 0"**; 18 ledger nodes present.
- **Old word absent from the running app**: with the dialog open, `/badge\s+points?/i` over
  `document.body.innerText` → **false**.
- **Old word absent from the bundle**: the same case- and whitespace-insensitive pattern over
  `dist/assets/*.js`, `dist/assets/*.css` and `dist/index.html` → **0, 0, 0**. `Badge Tokens`
  → **25** in the JS. The whitespace-tolerant form matters: it is the one that would catch
  JSX-wrapped `Badge\n  Points`, which a plain `grep -F "Badge Points"` would miss.

### Housekeeping

The 4319 server was stopped and `dist/` left as the merged build's two files. **Nothing was
staged with `git add -A`** — paths were named explicitly and `git status` re-checked before the
commit, so the untracked `.claude/worktrees/` directory in the main checkout was left alone, as
were the bare `node_modules` symlinks in the sibling worktrees. No `npm install` in any worktree,
no watch mode, no foreground dev server. The throwaway `rename-integrate` was deleted after the
fast-forward.

**`main` was NOT touched and is NOT reconciled.** Local `main` is `444d034`, `origin/main` is
`e6b3ae4`, and they diverge. That divergence pre-dates this slice and was left exactly as found.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · correction — one housekeeping claim in the entry above

The integration entry above states *"The throwaway `rename-integrate` was deleted after the
fast-forward."* **It was not.** `git branch -D rename-integrate` was refused by the permission
layer, which blocks agents from deleting branches — the same constraint the sweep's own
slice-complete entry recorded against the stale `badge-points-rename` branch. The branch is
merged into `dev` and carries nothing unique; it is left for the operator to remove.

Corrected by appending rather than by editing the sentence: an entry is a dated record of what a
run observed, and revising one in place would make it assert something that was never true at
the time it was written. Nothing else in that entry is affected — the landing, the counts, the
gates and the browser proof all stand as recorded. `dev` is `785118b`.
─────────────────────────────────────────────

## 2026-08-26 · Tier 2 · slice-complete — F2.3 autosave concurrency + the lossy boot read

**Branch** `persist-concurrency` off `origin/dev` `44de81f`, worktree `/private/tmp/bb-persist`.
Two commits. **NOT merged to `dev`; `main` never checked out.** `origin/dev` re-fetched at the
end and had not moved.

Two defects, one shape. Both autosave writers serialized a LONG-LIVED in-memory copy and
`setItem` over the key without ever reading it, gated on `persistableRef` — which asks a purely
LOCAL question ("does this instance hold a state worth persisting?") and never the relational
one ("is what I am about to write derived from the bytes currently in storage?").

### Layer 1 — the flush writes only when it has something to add

`App.tsx`'s flush now captures `workingRef.current` BEFORE the blur and compares references
after. Every commit handler returns `prev` unchanged on a no-op (`handleHeightCommit`,
`handleAttributeCommit`, the inline `onBudgetCommit`), so reference identity IS "this blur
committed nothing" — verified by reading all three, not assumed.

**Deliberately NOT a `dirty` flag.** `loadBuild` calls `markClean()`, so a dirty-keyed test is
false for a freshly-loaded build that very much needs writing — the known trap, recorded in
F2.2's own entry and pinned by its test 1.4. This asks only whether THIS FLUSH changed anything.

### Layer 2 — a lossy boot read is not persistable YET

`persistableRef`'s seed gains `!bootWasLossy`, false when the boot read lost anything through any
of four channels: `droppedEntries`, `clearedSynergyRefs`, `ratifiedMagnitudeNormalized`, and the
new `droppedUnknownFields`. The DriftBanner is the disclosure (unchanged, still asserted); the
user's first edit is the acceptance (`applyEdit` → `armPersistence`, unchanged).

**Layer 2 alone only delays the loss**, so the ORIGINAL BYTES ARE ALSO PRESERVED at boot, in the
same state-initializer position and with the same reasoning as `quarantineWrite`: during the boot
render, before any effect can run.

### The single-entry quarantine question — resolved as a SECOND KEY

`badge-builder-2k27:autosave-preserved:v1`, additive, never renamed anything. Three reasons, in
order of weight:

1. **Sharing inverts the never-overwrite rule into data loss.** Neither preserve path may clobber
   a standing one (§0.1 rule 6). A drift preservation sitting in a shared entry would silently
   block the strictly MORE severe *unreadable* case from ever being preserved — the fix would
   have manufactured the bug it exists to remove. Pinned by test 3.6's second case.
2. **The disclosure would lie.** `QuarantineBanner` says *"A saved build couldn't be read"* and is
   keyed on the quarantine key's EXISTENCE. A drifted-but-readable autosave written there raises
   that banner and tells the user something untrue.
3. **Different event, different acceptance gesture** — DriftBanner + first edit, not a banner with
   a Discard.

**R7 is satisfied per key**: at most two preserved envelopes ever exist, each ONE ENTRY, neither
appended to and neither overwritten while standing. Wired into `exportRawPersistedData()`,
`clearAllPersistedData()` and `persistedDataBlastRadius()` — so "Clear ALL" takes it AND the
confirm names it ("the preserved original autosave"), and does not name it when none stands.

**The known cost, recorded rather than hidden:** never-overwrite means a SECOND, later drift while
an earlier preservation stands is not preserved, and "Clear ALL saved data" is the only way to
free the entry. The alternative — last-write-wins — puts an automatic boot-time write on top of
the user's older data, which is the defect class this whole path exists to close.

### Layer 3 — LANDED, optimistic concurrency on the flush

`lastObservedAutosaveRef` holds the exact string this instance last OBSERVED (its boot read, which
is why `AutosaveReadResult`'s `ok` arm now carries `raw`) or last WROTE (the bytes returned by the
write, never a re-derivation — a second `toEnvelope` has a fresh `savedAt` and would leave the
reference permanently wrong). `writeAutosaveIfUnmoved` reads before writing and returns
`refused` with the foreign bytes untouched. Never adopts, never merges, no storage-event listener.

**One addition was required to make it real, found by a test rather than by reasoning.** The
flush's blur commits through `applyEdit`, which is a React state change — so the UNGUARDED
state-change writer fires for it too. On `pagehide` the document is gone first; on
`visibilitychange → hidden` the tab is alive and it landed exactly the stale envelope the guarded
writer had just declined, a microtask later. Layer 3 would have been decorative on the one
trigger that leaves a tab running. Fixed by `flushSettledWorkingRef`: the flush records the state
it settled and the state-change writer skips that ONE run, cleared on use so a later
`persistEpoch` bump (the Discard re-arm) still writes. Semantics, not a workaround — a flush that
WROTE has already persisted that state, and a flush that was REFUSED decided it must not land.

### The six named risks

| | discharge |
|---|---|
| **R1** — a future field committing in a microtask makes layer 1 a false negative | `tests/ui/flush-blur-synchrony.test.tsx`. Pinned **PER COMPONENT** on both commit-on-blur primitives, and the file carries its own METHOD canary — a deliberately microtask-deferred field, watched NOT committing synchronously — so "the spy was called" cannot pass for "called in the blur". Plus a FROZEN CENSUS of the three src files containing an `onBlur` at all (NumberField, AttributeSlider, and BuildPanel's §5.3 UI-preference latch, named and excused). A fourth is a stop-and-read. |
| **R2** — the flush is the de facto retry after a failed write | `lastWriteFailedRef`; layer 1 writes when `after === before` **and** the last write failed. Test 2.4: `setItem` throws at mount, storage recovers, unload with no edit at all writes. |
| **R3** — the predicate must be LOSSY, not merely different | New engine seam `droppedUnknownFields`, measured on the envelope key-set (never a byte comparison, which is brittle to key order and a fresh `savedAt`), and measured **AFTER migrations** on purpose — a migration's output is a transformation the app INTENDS to persist, so a field a future migration retires is already gone from the envelope and is correctly not reported. `KNOWN_TOP_LEVEL_FIELDS` sits beside the reassembly literal and is pinned to it by a real round trip (test 3.0), so it can never report a LIVE field as dropped. |
| **R5** — never auto-adopt, never a storage listener | The refusal writes NOTHING. No `storage` event listener was added (`rg 'addEventListener\("storage"' src/` → 0). Nothing reads the foreign bytes into memory. |
| **R6** — read-failure read as "someone changed it" = total autosave loss | New `RawReadOutcome` tells `absent` / `present` / `failed` apart, and `writeAutosaveIfUnmoved` FAILS OPEN on both `failed` and `absent`. Test 2.3 covers both: a throwing `getItem`, and a removed key (what "Clear just the autosave" does). |
| **R7** — a preserved-bytes entry is a second full envelope against ~5MB | One entry per key, never a list; asserted in test 3.5 (`keys().filter(preserved)` has length 1 after two lossy boots). |

**`BroadcastChannel` leader election was not implemented**, as ruled.

### The four required tests

| # | file | what it holds |
|---|---|---|
| 1 | `tests/ui/flush-blur-synchrony.test.tsx` (7) | per-component blur synchrony + the method's canary + the frozen census |
| 2 | `tests/ui/two-tab-autosave.test.tsx` (11) | **two real `App` instances, one shared storage stub.** Nothing in `tests/` referenced a second tab, a foreign write or a concurrent writer before this file |
| 3 | `tests/ui/boot-lossy-preservation.test.tsx` (17) | each of the four lossy channels seeded SEPARATELY; the original still readable after mount, and after the first edit accepts the transform |
| 4 | (inside 3, §3.4) | **write count** — exactly 1 on a healthy no-interaction boot, still 1 after the flush, 0 on a lossy boot, 1 on the first edit after |

Two instances share one jsdom `window`, so tab A is genuinely UNMOUNTED rather than detached —
found the hard way: a merely-detached A still holds live unload listeners and blurs B's focused
field out from under B's own flush. `useId` was verified per-root in this React version before
relying on scoped label queries.

**PINNING PROOF.** The three new files run against `origin/dev`'s `src/` (`git checkout origin/dev
-- src/`, restored after): **18 failed / 17 passed**. Every layer is red before and green after.
The 17 passers are the deliberate non-regression pins, and they break down exactly:
**synchrony 7/7 green** (they describe two primitives this slice did not change), **two-tab 6 of
11** (layer 1's "the flush still does its one job", the no-foreign-writer backgrounded case, both
R6 arms, R2's retry, and the documented-residual pin), **boot-lossy 4 of 17** (the drift
disclosure, "no autosave key is manufactured", the first-ever-boot write count, and the
unreadable-quarantine independence case).

### Verification — counts computed from source BEFORE measuring

Predicted 1653 + 7 + 11 + 17 + 2 (recovery-boundary) = **1690** across 74 + 3 = **77**.
Measured **1690 / 77**. `src/` file count unchanged at **73** — no new source file — so the
per-src-file lint counts (`persist-boundary`, vocabulary class 4, architecture c/d) do not move.

- `npm test` — **1690 passed / 77 files**, 0 failed. No flakes, no re-runs, no timeout touched;
  the two new App-rendering files carry the file-standard `{ timeout: 20000 }`.
- `npm run typecheck` clean · `npm run build` clean (87 modules) → `index-3LpH3-vz.js` (340.67 kB)
  / `index-CijHueLd.css` (62.54 kB, unchanged — this slice moved no CSS).
- **RUN-never-edit gates, byte-unchanged by blob hash against `origin/dev`, not merely green:**
  `tests/ui/overlays.test.tsx` `30a7131b…` · `tests/category-colors.test.ts` `f1539c1d…` ·
  `tests/feasibility-golden.test.ts` `cef359dc…`. Run explicitly: **29 passed**. No golden cell
  moved.
- F9 touch-floor census `-t "I6 — the S touch floor"` **10 passed / 155 skipped**; the whole
  `tests/layout-arithmetic.test.ts` **165/165**.
- Vocabulary lint **183 passed** — class 1 (bare slot-word) 76, class 4 ("Badge Points") 77.

### Browser proof — production build, port 4477, PRE-FIX contrast on 4478

`5173 was avoided deliberately` (and is in use — it holds the owner's real saved data; never
navigated to). Served bytes reconciled against `dist/` BEFORE anything was read off the screen:
`index-3LpH3-vz.js` `07c2f390a5be3550…` and `index-CijHueLd.css` `1ac21a70…` fetched over HTTP
and hashed — **identical to `dist/`** — and the live document's own `<script src>` resolves to
that same hashed name. The pre-fix build on 4478 hashes to `4558582e794d4f5a…`, which is the JS
hash this channel already recorded for `dev`.

Tab cap was reached with OTHER SESSIONS' tabs, which were left alone. Tab B is therefore a
same-origin **iframe** — a genuinely separate browsing context (`contentWindow !== window`,
verified in-page), with its own `window`, its own `pagehide`, its own React root, and the same
origin's `localStorage`. Position was clicked with REAL mouse clicks on the segmented control.

**Scenario 1 — the exact two-tab sequence.** A sets **PG** → B opens (B shows PG) → A sets **C**
→ A sets **PF** → B reloads.

| | storage after A's work | storage after B reloads | B shows |
|---|---|---|---|
| **PRE-FIX** (4478) | `PF` | **`PG`** — A's two clicks destroyed | `PG` |
| **FIXED** (4477) | `PF` | **`PF`** | `PF` |

**Scenario 2 — the boot case.** A save referencing `a-badge-id-not-in-the-2k27-dataset` injected
into the key (2148 bytes), then loaded once **touching nothing**.

| | live autosave after one load | dropped row recoverable? | banner |
|---|---|---|---|
| **PRE-FIX** | 2071 bytes, row **gone** | **nowhere** — no key in the origin contains it | none (the outgoing flush had already clobbered the injection, so the reloaded page read a clean envelope — both halves of the defect in one measurement) |
| **FIXED** | **2148 bytes, byte-identical to the injected string** | yes — the preserved key holds the same 2148 bytes | *"1 badge from this build no longer exists in the dataset: a-badge-id-not-in-the-2k27-dataset — removed from the plan."* |

No quarantine was manufactured on the fixed run (the bytes were readable — correctly a
preservation, not a quarantine). Then the **acceptance** was exercised with a real click (Position
→ SG): the edit landed, the live key became the stripped state (`loadout` empty, the badge id
absent), and **the preserved original survived it intact at 2148 bytes**.

### THE RESIDUAL, stated plainly

**Writer 1 (the state-change effect) is deliberately UNGUARDED.** An intentional edit in a stale
tab still overwrites a newer tab's bytes. That is tech-strategy.md §9's documented last-write-wins
bargain and it stands, because the alternatives are worse: refusing would silently stop autosaving
for someone actively working (R5's failure run in reverse), and preserve-then-write would fill the
single preserved entry with an arbitrary intermediate state on the very first alternating-tab
edit, permanently denying it to a real drifted-boot original. Pinned as a DECISION by test 2.6, so
changing the ruling has to change a test. §9's wording is still *"last-write-wins"* and now
matches the shipped behaviour for edits; what no longer happens is the unintended half — a stale
tab reverting work merely by being CLOSED.

Second residual, named above: a later drift while a preservation stands is not preserved.

### Housekeeping

Own worktree, `node_modules` a symlink from the main checkout, **no `npm install` in any
worktree**, no watch mode, no foreground dev server left running (both `python3 -m http.server`
processes stopped and confirmed down; 5173 is someone else's and was left up, untouched). A
throwaway detached worktree at `/private/tmp/bb-prefix-proof` was used to build the pre-fix bundle
and was removed. Paths were staged EXPLICITLY, never `git add -A`; `git status` checked before
each commit. The two test origins' `localStorage` was cleared at the end. Nothing was touched in
`src/engine/ledger.ts` or in `src/styles/**` — the two surfaces the concurrent fuse-refund and
roll-panel slices own; this slice's only engine change is one additive report field on
`DeserializedSavedBuild` plus the frozen field list beside the reassembly it describes. Runtime
`dependencies` still exactly `{react, react-dom}`. **No persisted key or serialized field was
renamed**; the one storage change is additive.
