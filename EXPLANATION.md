# How Badge Builder Works

Part 1 states only what the game itself defines, and only the parts this app actually models.
Part 2 states how the shipped app models them. Where 2K has not published something, both parts say
so rather than filling the gap.

**A word on "slots."** This doc, and the app, uses two different terms on purpose and never a bare
"slot":

- **Badge Slots** — the per-category capacity for equipped badges (e.g., "Finishing — Badge Slots
  2/3").
- **Synergy Slots** — the 8 global fuse/reaction pairings.

They are never interchangeable, in code or on screen — `Synergy Slot N` appears everywhere in the
shipped UI copy, never bare "slot." `tests/vocabulary.test.ts` lints the codebase for violations.

---

## Part 1 — The rules, as the game defines them

### Tiers, levels, and costs

Every badge belongs to exactly one tier: **A, B, or C**. Levels run **Bronze → Silver → Gold → HOF →
Legend**, and **Legend is boost-only — it can never be purchased directly**, only reached via a
Synergy Slot fuse.

Costs are **total-to-own at that level, not cumulative**. Upgrading a badge pays only the difference
between your current level's cost and the target level's cost; downgrading returns that difference
to the category's point pool.

| Tier | Bronze | Silver | Gold | HOF |
|------|--------|--------|------|-----|
| A    | 3      | 5      | 6    | 7   |
| B    | 2      | 4      | 5    | 6   |
| C    | 1      | 3      | 4    | 5   |

(The 53-badge dataset splits 22 A-tier, 15 B-tier, 16 C-tier.)

### Per-category pools and Badge Slots

Points, spending, and refunds are all tracked **per category** — each of the six categories
(Finishing, Shooting, Playmaking, Defense, Rebounding, Physicals) has its own separate pool. A badge
occupies a Badge Slot at any level it's equipped, including Legend.

2K's own page confirms one fact about the starting spread: every build starts with **20 Badge Slots
total**, split across the six categories. It does not say how those 20 split across categories for a
given build, and it doesn't publish the badge-point amounts either.

**The attribute → (Badge Slots, points) derivation is unpublished.** See Part 2 for how the app
treats that gap: it asks you, rather than guessing.

### Bonus Badge Slots and Badge Points

Beyond the starting 20, a build earns **bonus Badge Slots and bonus Badge Points** through Build
Specialization, Seasons and Crew rewards. Three properties are 2K's, not this app's invention: the
bonus is **versatile** (it can go into any discipline), it is **reassignable at any time** (apply it
to Finishing, change your mind, move it to Defense), and **nothing about it locks**.

2K's own page calls the point currency **"Badge Tokens."** This app has said **"Badge Points"** since
its first milestone and still does, so the two words describe the same resource; where you read
"Badge Points" here, that is the number 2K's screen labels differently.

**No published cap on either total exists, and the app models none.** A constant would be invented
2K27 data.

### Cap breakers

A cap breaker raises an attribute above the ceiling the build slider allows. Two consequences matter
here, and the app relies on both:

- A cap-broken attribute **counts for badge eligibility** — raising it can unlock a level you could
  not otherwise reach.
- It grants **no extra Badge Slots and no extra Badge Points.** Cap breakers buy badge potential,
  never economy.

**The cap breaker → boost mapping is not published, and a single cap breaker does not reliably add
+1.** One observed case took a Three-Point of 60 to 83 across five breakers, which is neither +1
each nor an even split. The app therefore does not compute the boost at all — see Part 2.

### Height and attribute gating

Every badge is gated by a height range and per-level attribute thresholds. No badge carries a
position requirement — that's true of every one of the 53. (Position isn't quite "gates nothing"
though — see the next section.)

A badge's highest **purchasable** level is the highest level where your build's height falls inside
the badge's range **and** its attribute logic passes at that level:

- A badge with a **single** attribute requirement passes a level if that one threshold is met.
- A badge with an **or** requirement (two attribute lines) passes a level if **at least one** line's
  threshold — when that line has one at that level — is met.
- A badge with an **and** requirement passes a level only if **both** lines have a threshold at that
  level **and** both are met.

A height failure blocks the badge entirely, at every level. Synergy boosts apply *on top of* this
attribute-gated cap — a fuse can push a badge above the level your attributes alone qualify it for.

### Position and height

2K's own MyPlayer builder lets position narrow your height choices, and this tool matches it:
selecting a position sets which heights you can pick from.

| Position | Range | Inches |
|---|---|---|
| Any *(default)* | 5'9"–7'4" | 69–88 |
| PG | 5'9"–6'7" | 69–79 |
| SG | 6'0"–6'8" | 72–80 |
| SF | 6'4"–6'10" | 76–82 |
| PF | 6'5"–7'0" | 77–84 |
| C | 6'7"–7'4" | 79–88 |

These numbers are user-supplied — observed directly in the 2K27 builder and confirmed on
2026-08-26 (including the PG minimum, which needed a second look before it was locked in) — not
transcribed from the sealed badge listing. They carry their own separate provenance for exactly that
reason, disclosed alongside the badge dataset's.

**The precise truth, stated carefully because the imprecise version is misleading:** *"Position
gates no badges"* is still true — no badge's requirements ever check position. *"Changing position
never changes which badges you can get"* is **false** — because a position switch can move your
height outside the range you're currently at, and height genuinely does gate. So position affects
what you qualify for **indirectly, through height**, never directly. If a position switch would push
your height outside its new range, the height snaps to the nearest bound and the app tells you so —
never silently, never blocking the switch itself.

### The 8 Synergy Slots

Fuse and Reaction are roles that your regular purchased badges get assigned to via Synergy Slots —
not separate badge types. There are 8 Synergy Slots; each one pairs one Fuse badge with one
Reaction badge, both chosen from badges you've purchased.

| Synergy Slot | Unlocked by | Permanence |
|---|---|---|
| 1–4 | Seasonal rewards | Temporary — resets at season end |
| 5 | Crew Level 28 | Permanent |
| 6 | Crew Level 39 | Permanent |
| 7 | Build Specialization Goal 10 | Permanent |
| 8 | Legend 2 REP | Permanent |

Each Synergy Slot carries a boost magnitude of **+1 or +2**, and **exactly two** of the eight carry
+2. 2K's own page confirms Synergy Slot 7 — the Build Specialization reward — is one of them; **which
other one carries the second +2 is still unpublished**, and the app never guesses it.

**Discipline lock.** The page also confirms Synergy Slot 7 holds only badges from a single
discipline — whichever Build Specialization track you actually completed in-game. Every other
Synergy Slot works across disciplines.

- **Fuse:** a badge assigned as a Synergy Slot's Fuse plays at its purchased level **plus the
  Synergy Slot's magnitude**, at no extra badge-point cost. A Gold badge fused +1 plays at HOF;
  fused +2, at Legend. Effective level always caps at Legend.
- **Reaction:** the Synergy Slot's reaction badge is paired to its fuse badge. When the fuse badge
  triggers enough times in a game, the reaction badge activates and gains the same magnitude boost.
  This is conditional and in-game — the app shows both the badge's base level and its "when
  activated" level.
- **Refund:** assigning a badge as a Synergy Slot's Fuse frees the points spent on it back to its
  category pool, for re-spending — for as long as that Fuse assignment stands, at any purchased
  level and either magnitude. This is 2K's own stated mechanic, not a "reach Legend" rule — see
  Part 2 for exactly how that changes the numbers on screen.

One badge can hold **at most one** synergy role across all 8 Synergy Slots, and both a Synergy
Slot's fuse and reaction targets must be badges you've already purchased.

---

## Part 2 — How the app models it

### It runs entirely on your machine

No backend, no accounts, no network call of any kind. The app makes no `fetch`, opens no
`WebSocket`, loads no web font (the type stack is the system one), and sends no telemetry — even the
render-error handler logs to the console rather than anywhere else. `tests/architecture.test.ts`
fails the build if `fetch`, `XMLHttpRequest` or `WebSocket` appears anywhere in the source, so this
is a property the suite enforces rather than a promise the README makes. Runtime dependencies are
exactly `react` and `react-dom`.

Everything you save lives in your own browser's `localStorage`, and export/import is a plain file
download and file picker — no upload, no sync, no server.

### Engine and UI stay separated

Every rule — costs, eligibility, synergy, refunds, budget composition — lives in `src/engine/`:
plain TypeScript, no DOM, no React, unit-tested in isolation. `src/ui/` renders what the engine
computes and contains no rules of its own. A dependency-direction test asserts nothing under
`src/engine/` imports from `src/ui/` or from React.

### `badges.json` is the single source of truth

Every badge's tier, category, height range, and per-level attribute thresholds live in one
generated file, currently stamped `dataVersion: "2026-08-26.1"`. It's produced from a checked-in
plain-text listing (`badges.source.txt`) via `npm run generate:badges` — never hand-edited — so a
data refresh, when 2K patches something, is a one-file diff rather than a search through components
for a hard-coded number. The provenance line names two sources: the original transcription
(official 2K material + NBA2KLab) and 2K's own MyPlayer-builder feature page, added when the badge
descriptions and the ratified mechanics below were adopted from it. `gameVersion` is `null` and
`confidence` reads `pre-release`, because the patch this reflects genuinely isn't known yet.

The position→height table lives in its **own** small file with its **own** version line, not folded
into `badges.json`'s — a position-table correction should never force a badge-dataset version bump,
or vice versa.

### Descriptions and NEW flags

Every badge card carries 2K's own one-line description of what it does — paraphrased from the
official page rather than quoted verbatim (a copyright posture, not a laziness one) — plus a flag on
the 19 badges that are new to this cycle. The description sits on the card as a short preview;
clicking it reveals the whole thing in place. Both are pure display enrichment: descriptions gate
nothing, `NEW` gates nothing, and neither touches a single rule in the engine.

### Three different "levels" for one badge

It's worth being precise about which "level" is being shown where:

1. **Eligible / purchasable level** — the highest level your height and attributes qualify you to
   buy, independent of what you've actually bought. This is computed level-by-level, never by
   scanning up and stopping at the first failure — because costs are total-to-own rather than
   cumulative, it's legitimate to hold Gold on a badge whose Silver you don't qualify for.
2. **Purchased level** — what you've actually spent points on right now: none, Bronze, Silver, Gold,
   or HOF.
3. **Effective level** — what the badge actually plays at: purchased level plus any live Synergy
   Slot boost, capped at Legend. Every card renders this number, never the purchased level directly
   — the status line under each badge always reads "Now Gold" or "Now Silver · Fused to Gold," never
   just the raw purchase.

The grid layers two more distinctions on top, both purely visual and both non-blocking:

- An upgrade level you're eligible for can still be shown as **unaffordable** — dashed, with its
  point cost and a warning glyph — when its cost exceeds what's left in that category's pool. That's
  a spending comparison, not an eligibility rule, and like every other overspend condition in this
  tool it's a warning, never a block; the pip stays clickable.
- A level you've already **purchased** can become **stale** — if a later change to your build (an
  attribute dropped via a slider, a height change from a position switch) pushes that badge's
  requirements back above what you currently qualify for. A stale purchase is never auto-removed —
  the badge stays bought, its points stay spent, its Badge Slot stays occupied — the pip is flagged
  and the card reads "Purchased at `<level>` — no longer meets requirements," with the specific
  failing reason, which names the threshold and your current value: `needs 90 Close (now 88) or 93
  Layup (now 72) for Gold`. You decide whether to downgrade it yourself; the tool never does it for
  you (see "Never silently changed," below).

### Where your per-category budget comes from

The attribute → (Badge Slots, points) derivation is unpublished, so the app **asks you for it**:
twelve manual per-category fields, under a banner that says exactly why they're manual. That is the
`manual` arm of a config seam; the `derived` arm exists and deliberately throws, so nothing can quietly
start guessing.

Since the official page does confirm the *starting total*, the Badge Slots total row carries a
soft annotation against it — plain `/ 20 default`, identical on both sides of 20, with no `?` and no
guess at what a difference means. It compares the **base** spread only: bonus Badge Slots are a
separate layer and do not raise the number being compared, per the ruling that the bonus isn't part
of the original 20. The annotation disappears entirely while any category is still at its unset
(0) default — a half-finished data-entry pass isn't a discrepancy yet. It never blocks, never
reddens, never gates: it's a checksum on what you typed, not an authority.

### The bonus layer

Bonus Badge Slots and Badge Points are modelled as a **separate layer**, never merged into those
twelve base fields. You record two build-level totals — what you've *earned* — and then place them
per category. Effective capacity is composed on read (base + placed bonus) in one engine function
and stored nowhere, so the base numbers you typed off your MyPlayer builder stay exactly as you
typed them.

Four consequences follow, and each is deliberate:

- **Nothing locks, and nothing is capped.** Both earned totals are yours to grow, and every
  placement is freely reversible. No cap is modelled because none is published.
- **Placing more than you've earned is allowed** and disclosed per metric, not blocked — the same
  soft-warning posture as points overspend. So is reducing an earned total below what you've already
  placed; every placement stays exactly where you put it.
- **Bonus you've earned but not placed is reported, never reddened.** "Earned it, haven't decided
  yet" is a legitimate resting state, and a warning on a legal state is noise.
- **A category with no base capacity but a placed bonus is a real, live category.** A base of 0
  means "not entered yet," but placing a bonus there is an unambiguous act — it costs a trip into a
  dialog and a keystroke — so that category starts counting, and its ledger says where its capacity
  came from rather than pretending a base exists.

Where a category has both, its ledger lede spells the composition out (`Badge Points 12 base + 4
bonus`) — once, on arrival, rather than in the digest you read forty cards deep.

### Cap breakers: honoured, never computed

The engine reads a per-attribute **absolute** cap-broken value — the number you read off the 2K
builder, not a delta and not a count of breakers spent — and badge eligibility evaluates against
the higher of that and your slider value. The mapping from breakers to boost is **never computed at
any level of indirection**: no constant, no table, no interpolation. You track what your breakers
actually did; the app honours the number you declare.

Two structural guarantees back the "no economy" rule:

- **Cap breakers cannot grant Badge Slots or Badge Points, mechanically rather than by policy.** The
  whole economy — cost, ledger, synergy, validation, budget — reads no attribute at all, so it
  cannot see a cap breaker whatever a future edit does.
- **A cap breaker can never lower an attribute.** Declare 83 against an entered 60, then drag the
  slider to 90, and the declaration simply goes inert. Nothing rewrites your stored number.

Where an eligibility reason cites a cap-broken value it says so — `(now 83 cap-broken)` rather than a
bare `(now 83)` beside a slider you can see reading 60.

**Status, stated plainly: the engine honours cap breakers, but the control to declare one in the app
has not shipped yet.** Today a cap-broken value can only reach a build through an imported or
hand-edited JSON file, which the serializer accepts. The in-app editor is a pending slice.

### Committed ledger vs. overlay projections

The points and refund numbers you're actually planning against — the **ledger** — are computed from
what's genuinely committed: your purchased badges, plus any Synergy Slot that is currently unlocked
in-game. Two toggles let you preview a hypothetical state without ever moving that number, and a
strip banner tells you, in exact words, when you're looking at a preview:

- **"Reactions activated"** — *"Preview: reactions activated. Card levels show in-game ceilings.
  Points are unchanged."* A momentary in-game event isn't a persistent state, so flipping this never
  touches the ledger.
- **"Season-reset preview"** — *"Preview: season reset. Synergy Slots 1–4 disabled. Primary points
  are unchanged; N of 6 categories show a projection."* Categories affected get a second, clearly
  labelled row under a dashed rule: `⟳ After season reset · Badge Points 10 / 16 · left 6 ·
  refunded 0`, sitting beneath the untouched primary row. A number never changes what it means
  without changing its label.

**Refund trigger — resolved by the official page, still modeled as config.** 2K's own
MyPlayer-builder page confirms fusing a badge frees the points spent on it — an every-fuse rule, not
a reach-Legend one. That's the default (`onFuse`); the three Legend/HOF-based triggers this tool
shipped with originally (reach Legend by any means / by a permanent boost only / reach HOF or above)
are still there as selectable alternates, in case you want to model one of those instead.

**What actually changed on screen when this shipped.** Under the old default, only three (purchased
level, magnitude) pairs ever refunded — the ones that reach Legend: Gold+2, HOF+1, HOF+2. Under
`onFuse`, *every* fused badge refunds its full spent cost, at every purchased level and either
magnitude — a Bronze badge fused +1 now frees 3 points the moment you fuse it, which never happened
under the old rule. Reaction assignments still refund nothing; only the Fuse role frees points.

**The season-reset interaction still works the same way, just triggered differently.** A badge fused
in a Temporary Synergy Slot (1–4) loses its refund in the season-reset projection, because what
resets is the fuse role — and the exemption comes and goes with it, not with a level. A badge fused
in a Permanent Synergy Slot (5–8) keeps its refund in both the primary row and the projection.
Worked example: a Tier-A badge purchased Gold (6 points), fused in a Temporary Synergy Slot, alone
in a 16-point category — the primary ledger reads `spent 6 · refunded 6 · left 16`; the season-reset
projection reads `spent 6 · refunded 0 · left 10`, because that Synergy Slot (and the fuse role in
it) is gone in that projection. Fuse the identical badge in a Permanent Synergy Slot instead and
both rows read `refunded 6 · left 16` — nothing to project away.

**+2 Synergy Slot designation** has a real control, and it's now partly settled. Synergy Slot 7 is
fixed at +2 — that's ratified data, not a preference, so its own "Boost" control shows +1 disabled
with the reason *"Synergy Slot 7 is +2 — Build Specialization, confirmed 2026-08-26."* Every other
Synergy Slot's "Boost" control (+1 / +2) still lets you mark it, capped at **one** further +2 pick
(Synergy Slot 7 already counts as one of the two) — try to add a second and it's disabled with the
reason spelled out: *"Only 2 Synergy Slots can be +2. Clear another first."* The standing banner
at the top of the Synergy panel tracks the remaining budget directly: *"1 more Synergy Slot can be
+2 — 2K hasn't published which. Designate it here."* with a live *"+2 designated: `<N>` of 1"*
counter. If you load a build saved before this shipped, the app tells you it upgraded Synergy Slot
7's magnitude on your behalf, in the Synergy panel itself, rather than silently changing a number you
didn't touch.

### Overflow is a warning, not a block — except for synergy invariants

Points overspend and Badge-Slot overflow are both **soft**: the status bar turns red (`over by N
⚠`) with a hatched meter, but nothing is disabled. That's deliberate — your per-category Badge Slots
count is a number you're typing from memory (2K hasn't published the derivation), and hard-blocking
a plan on a guessed input would be actively unhelpful in a *planning* tool.

Synergy assignment is different and stays **hard**: you can't assign a badge you haven't purchased,
give a badge two roles at once, use a locked Synergy Slot, or put a badge in Synergy Slot 7 whose
category doesn't match its discipline lock. Those aren't planning uncertainties — they're states
that can't legitimately exist, so the app doesn't offer the invalid option in the first place (a
picker option that would violate one shows as disabled, with the reason in its own label — e.g.
*"Float Game — Silver — already Fuse in Synergy Slot 2"*, or *"Float Game — Silver — Finishing
badges only in this Synergy Slot"*) rather than warning about it after the fact.

### What the feasibility readout is, and isn't

Each category's status bar includes a line like *"6 pts left → nothing else fits at these
prices."* or *"6 pts · 2 Badge Slots left → 3 upgrades still affordable"*. This is a **count**, built
only from comparisons already available elsewhere on the grid — which levels pass your eligibility,
and what each one would cost against what's left in the pool. It deliberately contains no tier-cost
arithmetic of its own and no ranking language: it never tells you which badge to buy, only how many
options are still open. The tool shows you what fits; you decide what's worth it.

### Never silently changed: drift, dropped badges, and healed synergy references

Three different things can make a saved build not quite match reality anymore, and the app treats
all three the same way: **disclose it, never fix it for you.**

- **Dataset drift.** If the dataset version a build was planned against differs from the one
  currently loaded, a banner names both versions and offers **Re-check eligibility** — which
  recomputes against the current dataset and lists exactly which purchased badges no longer qualify
  (or confirms none changed). It never diffs against the old dataset — that snapshot isn't kept —
  and it never re-validates your plan away on its own.
- **A badge that left the dataset entirely.** If a data update removes a badge outright, any loadout
  entry pointing at it is stripped at load time, and the same banner discloses it by name: *"N
  badges from this build no longer exist in the dataset: `<names>` — removed from the plan."* This
  can appear even without a dataset-version mismatch — a hand-edited or older import can carry an
  unknown id on its own.
- **A stranded Synergy Slot reference.** If a Fuse or Reaction assignment points at a badge that
  isn't actually in the loadout, that assignment is healed — cleared, not rejected — and disclosed:
  *"N synergy assignments referenced badges not in this build's loadout: Synergy Slot 5 Fuse →
  `<name>` — cleared."* The build still loads; nothing is thrown away silently.

A fourth surface catches states that genuinely can't be expressed rather than drift: if an imported
or hand-edited build somehow violates a hard invariant (a badge holding two synergy roles, more than
two Synergy Slots at +2, a Synergy Slot 7 assignment that breaks its own discipline lock), the
Summary panel shows a red **"Invalid loadout state"** banner naming exactly which rule broke and on
which badge. Nothing crashes; nothing silently drops the invalid piece — you're shown precisely what
to fix.

### If the app can't read something at all

Two more layers exist for the cases above: **if your autosave itself can't be read** (not a drift, a
genuinely unreadable value), it's quarantined byte-for-byte rather than overwritten with a fresh
empty build — a banner reads *"A saved build couldn't be read — it's been preserved, not deleted,"*
with buttons to **Export raw saved data** or **Discard** the quarantine. And **if the app fails to
render at all**, a plain recovery screen takes over instead of a blank page: *"Badge Builder hit a
rendering error,"* with the same export option, a **"Clear just the unreadable autosave"** option,
and a last-resort **"Clear ALL saved data"** option that states exactly what it will remove before
you confirm it. Nothing is ever cleared without an explicit click naming what will happen.

### Named builds: load, rename, duplicate, delete

There's no side-by-side compare view in this tool, and none is planned. If you want to try a
variation of a build without losing the original, **Duplicate** is the mechanism — it copies a saved
build under a new name (auto-suffixed if the name's taken, e.g. `<name> copy 2`) that you can then
diverge from freely. **Rename** only changes the name — it patches the stored record directly rather
than reading, rebuilding, and rewriting the whole thing, so it can't accidentally touch your loadout
even on an otherwise-quirky stored entry. Load and Import both check for unsaved work first and ask
before replacing it. Delete asks you to confirm in the same row rather than opening a second dialog.
If a saved build is present but unreadable, it isn't silently dropped from the list — the switcher
and the build manager both say so: *"N saved builds couldn't be read — preserved, not deleted."*

### Reading the plan back out

Two surfaces exist because a tally can't be reconciled against a game screen line by line, and
reconciliation is the whole acceptance bar for this tool:

- The **loadout roster** in the Summary panel names every badge you actually bought, grouped by
  category, with purchased level, effective level and cost — plus a tail line naming the categories
  you bought nothing in. The badge grid's **Purchased** filter is its companion: the roster is what
  you read beside a console, the filtered grid is what you click when you want to change something.
- The **Synergy digest** lists your Synergy Slots and their assignments in the same artifact, since
  they're half of what you re-enter into the game.
- A **plain-text block** renders the whole plan as text you can copy. `Copy as text` uses the
  clipboard API where the browser allows it; where it doesn't — notably over a LAN address on your
  phone, which is not a secure context and therefore has no clipboard API at all — it opens the text
  and selects it so a long-press copy works. There is no failure state, because the text is on
  screen either way.

### The layout, and why a large window matters

At large window sizes the app becomes a **fixed shell**: the page itself doesn't scroll, and
scrolling happens inside two independent regions instead — the attribute rail on the left, and the
main column holding the grid, the Synergy panel and the Summary. The header, the Physique strip and
the sticky category stack stay put while you scroll either one, so the build controls never leave the
screen.

The shell needs the window to be both **wide enough and tall enough**, and the height requirement is
**derived, not chosen**: with no page scroll, the header, strip, page padding and sticky stack become
a permanent tax on the space the badge cards get, so the shell only engages where the cards still
clear their minimum share of the viewport. The exact figures are computed from the measured chrome
and asserted in `tests/layout-arithmetic.test.ts`, which means they move when the chrome does — so
this doc deliberately doesn't quote them.

**Below either threshold it degrades gracefully to ordinary document scrolling**, with the pane's
contents folded back into the main column and the previously-shipped sticky layout taking over. A
browser without `dvh` support falls back the same way. Nothing is hidden in either mode — only
rearranged.

Two smaller consequences worth knowing: the main column remembers its scroll position across a
reload (in `sessionStorage`, separate from your saved builds, and a jump-nav link always beats the
remembered position), and browser find-in-page only searches the region you're in, since the two
scroll regions are genuinely separate.

### Category colors

Each of the six categories carries its own color, consistently, across its attribute sliders, its
legend, its section title in the grid, and its entry in the jump-navigation chips — Finishing blue,
Shooting green, Playmaking orange, Defense red, Rebounding magenta, Physicals brass. The palette
descends from a 2K build-sheet screenshot for the hues that had one and is this app's own choice for
the rest; it is a presentation decision either way, and no part of it is published 2K data.

Two properties are enforced by tests rather than left to care. The category color is **identity,
never state** — it never appears anywhere overspend, warnings or boosts are shown, so a red Defense
heading can't be misread as "over budget." And **color is never the only carrier**: every surface
that takes a category color also renders the category name as text, which is also what covers the
red/green collision for a deuteranope.

---

## More

- [`GUIDE.md`](GUIDE.md) — step-by-step usage, task by task.
- [`README.md`](README.md) — what the app is, how to run it, and how the data is sourced.
- [`docs/vocabulary.md`](docs/vocabulary.md) — the one-page Badge Slots vs. Synergy Slots glossary
  the codebase enforces.
- [`docs/proof/`](docs/proof/) — screenshots and verification records, regenerated with each shipped
  slice.
