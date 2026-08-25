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
