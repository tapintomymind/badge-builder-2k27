# User Guide — Badge Builder

Six task recipes. See [`EXPLANATION.md`](EXPLANATION.md) if you want the reasoning behind any of
this instead of just the steps.

Some steps below are illustrated with one example build, carried through the app (a 6'6"
Finishing-focused build: Close 88, Layup 72, Driving Dunk 65, Standing Dunk 40, Post Control 55,
Mid 78, Three-Point 83; Finishing budget 16 Badge Points / 3 Badge Slots). It's marked **Example**
each time — it's illustration, not a required action.

**One note on the layout before you start.** Where the controls sit depends on how big your window
is, and the guide says so wherever it matters:

- **Large windows** get a fixed shell: the page itself doesn't scroll, and the attribute rail on the
  left and the main column scroll independently. Position and height sit in a strip across the top.
- **Smaller windows** scroll normally, and the attributes fold back into the Build panel.
- **Phone-width** puts Physique back inside the Build panel too.

Nothing is ever hidden by the difference — only rearranged. The exact thresholds are derived from
the measured chrome rather than chosen, so this guide describes the behaviour rather than quoting
numbers that move.

---

## 1. Enter your build

1. Find the **Physique** controls — a strip across the top of the page on anything wider than a
   phone, or a collapsible **Physique** section inside the Build panel at phone width. Position
   comes first: pick **Any** (the default, full 5'9"–7'4" range), or **PG / SG / SF / PF / C** to
   narrow the height range you can choose from, exactly like 2K's own builder. The hint underneath
   reads *"Sets the available height range. No badge has a position requirement; badges gate on
   height and attributes only."* — no badge ever requires a position, but the range a position sets
   does gate badges, through height.
2. Set your height in feet/inches, within whatever range your position allows — the field shows a
   short range reminder right underneath it (`SF: 6'4"–6'10"` with a position picked, or
   `5'9"–7'4", the range this dataset covers` on Any). If you switch position and your current
   height falls outside the new range, the app clamps it to the nearest bound and tells you so,
   right under the height field: *"⚠ Height adjusted 6'2" → 6'4" to fit SF's range (6'4"–6'10")."*
   If that clamp also strands badges you'd already bought, the same notice adds a count: *"2
   purchased badges no longer qualify."* Nothing here is silent or blocking — the switch always goes
   through, you're just told what moved.
3. Set the full 0–99 attribute spread across six grouped sliders — Finishing, Shooting, Playmaking,
   Defense, Rebounding, Physicals. In a large window these live in the left-hand rail, permanently
   on screen and scrolling on their own; in a smaller one they're an **Attributes** section inside
   the Build panel. Each group carries its own color across its sliders, legend and section title.
   Every attribute name is spelled out in full ("Standing Dunk," "Speed With Ball," "Interior
   Defense" — not "St Dunk," "SWB," "Int Def"), and each is a 2K-style slider with a numeric field
   next to it — drag the slider or type the exact number, either one writes the same value.
   - **Dragging previews; letting go commits.** While your thumb is on the slider, the number
     updates live but nothing else in the app does — the grid, ledgers, and eligibility are all
     still reading your last *committed* value. The instant you release (or take a keyboard step),
     that becomes the real value and everything recomputes at once.
   - Keyboard: arrow keys step by 1, **Shift+arrow steps by 10** — same as the numeric field.
   - If dragging an attribute down pushes a badge you've already bought below what it now qualifies
     for, that badge doesn't get un-bought — on release (never mid-drag), it flips into a flagged
     state: the card reads *"Purchased at `<level>` — no longer meets requirements,"* with the
     specific reason. Your points stay spent and its Badge Slot stays occupied until you decide what
     to do about it — see "Read the badge grid," step 3.
4. Open **Badge Points & Badge Slots** and, for each of the six categories, enter your Badge Slots
   count and Badge Points by hand — read them off your in-game builder. A banner across the top of
   this section says why: *"Not published by 2K yet — enter these from your MyPlayer builder. Values
   are unverified."* A **Total** row at the bottom sums both columns, so you can sanity-check the
   grand total against what the game shows you. Once all six Badge Slots counts are filled in, that
   total also gets a soft note against 2K's published starting baseline — a plain `/ 20 default`,
   the same on both sides of 20. It never blocks, never turns red, and disappears entirely while any
   category is still at 0 — a half-finished data-entry pass isn't a discrepancy yet.
5. Below the twelve fields sits **Reset build**, which clears the whole working build after a
   confirm. It's disabled with a reason when there's nothing to clear.
6. When the Build panel is collapsed, its header carries a live one-line digest of what's hidden —
   `28 pts · 5 Badge Slots`, plus your height and position at phone width, where Physique is inside
   the panel. The panel also collapses itself once, automatically, the first time you've entered
   real values; after that your own open/closed choice sticks.

**Example.** Height 6'6" (position Any), the seven attributes above, Finishing budget 16 Badge
Points / 3 Badge Slots.

## 2. Record bonus Badge Slots and Badge Points

Bonus Badge Slots and Badge Points are the ones you earn beyond the starting 20 — Build
Specialization, Seasons, Crew. They're tracked as a **separate layer** from the twelve base fields,
because the bonus can go in any discipline and can be moved at any time.

1. Click **Bonus Badge Points & Badge Slots…** at the foot of the Badge Points & Badge Slots
   section. It opens a dialog.
2. At the top, enter **what you've earned in total** — one figure for Badge Points, one for Badge
   Slots. Enter the total *including anything you've already placed*; as the dialog notes, 2K's own
   header may show a smaller figure, because that one is counting what you have left to place.
3. Then place them: a six-row table with a **bonus** and an **effective** column for each pool. Type
   a bonus into a category and its effective cell shows the composition (`12 → 16`), so you can see
   what the category actually has. The `Total` row does the same for the whole build.
4. A `placed / earned` fraction sits beside the earned fields, with any unplaced remainder called
   out (`· 3 Badge Slots not placed`). Unplaced bonus is a perfectly normal resting state — you
   earned it, you haven't decided — so it's reported, never reddened.
5. **Nothing here locks and nothing is capped.** You can move any placement at any time, place more
   than you've earned (it's disclosed, per pool, not blocked), or lower an earned total below what
   you've already placed — every placement stays exactly where you put it.
6. There is **no Cancel and no Save**: every keystroke has already applied and autosaved. `Done`,
   `Escape` and clicking the backdrop all just close the dialog.

Back in the grid, a category that has bonus applied says where its capacity came from in its ledger
lede — `Badge Points 12 base + 4 bonus`. A category with no base capacity but a placed bonus is a
real, live category and says so rather than pretending a base exists.

## 3. Read the badge grid

1. Badges are grouped by category, one card per badge, each carrying 2K's own one-line description
   (a short preview by default — click it to see the whole thing) and, on 19 of the 53 badges, a
   NEW flag. Card columns reflow to the space available: one per row on a phone, two at tablet
   width, three at typical desktop width, four on very wide screens. Nothing is ever hidden, only
   reflowed. The Synergy and Summary panels live below the grid, full-width — scroll the main column
   past the badges to reach them, or use the jump-nav chips pinned above the grid.
2. Tap or click a card's body to cycle its purchased level: **none → Bronze → Silver → Gold → HOF**.
   Purchasing stops at HOF on purpose — there's no way to buy Legend. Legend only ever comes from a
   Synergy Slot fuse (step 5). You can also click a specific level's pip directly.
3. Every pip already shows what it costs — nothing is hidden behind a hover. Locked pips keep their
   level's metal identity (bronze / silver / gold / HOF) even when unearned — you're seeing it
   unlit, not greyed into anonymity. A pip you own shows a checkmark; an eligible pip you don't own
   yet shows its point cost (e.g. `+3`); a pip you can't currently afford shows that same cost
   dashed, with a warning glyph (`+3⚠`) — it stays fully clickable, the warning is informational,
   not a lock. A pip whose level you don't qualify for at all shows a lock icon and no cost. Your
   **currently purchased** pip has one more state worth knowing: if a later build change costs it
   its eligibility, it doesn't disappear — it turns flat and dull with a warning glyph in place of
   the checkmark, and the card below it explains exactly why.
4. A locked pip's specific reason appears for the *next* level above what you've already bought, as
   a line under the card, and it names both the threshold and your current value. **Example:** with
   Close 88 / Layup 72, Float Game shows `needs 90 Close (now 88) or 93 Layup (now 72) for Gold` —
   it caps at Silver, because 88 clears Silver's Close threshold (this badge is an OR requirement)
   but neither attribute clears Gold's.
5. A card that's greyed out entirely is height-blocked — your height falls outside that badge's
   range, and the card reads `Blocked — ` followed by the reason. No attribute value fixes it.
6. If a card's status line reads something other than "Now `<level>`" — e.g. "Now Silver · Fused to
   Gold" — that's a Synergy Slot boosting it (step 5). The grid always shows the *effective* level,
   boost included, not just what you've spent points on.

## 4. Plan a loadout

1. Watch each category's status bar: `Badge Points spent / pool`, then either `left N` or, in red
   with a warning glyph, `over by N ⚠`; a meter bar underneath; `Badge Slots used / capacity` on its
   own row, same red-warning treatment if you've gone over; and, when there's anything left to buy,
   a feasibility line.
2. That feasibility line is a plain count, not a recommendation. It reads one of: `N pts left →
   nothing else fits at these prices.`, or `N pts · M Badge Slots left → K upgrades still
   affordable`, or, if your Badge Slots are full but you still have points, `N pts · 0 Badge Slots
   left → K upgrades to badges you already own; new badges would go over Badge Slots.` It never
   tells you *which* badge to buy — only how many options are still open.
3. Overspending is allowed, on both points and Badge Slots. The tool never blocks a purchase past
   your budget — it turns the number red so you notice. Your budget numbers are themselves manual
   estimates (step 1), so a hard block on a guess would be actively unhelpful.
4. Use the filter bar above the grid — five facets, in order: tier chips (**A** / **B** / **C**); an
   **Affordable at ≥** dropdown (the second control, deliberately not buried — pick a level and only
   badges you could reach it on stay visible); a **Category** disclosure (`Category · 6` when all are
   shown); a **Legal for my build** toggle that hides anything height-blocked or fully out of reach;
   and a **Purchased** toggle that shows just the badges you own, as cards. A count (`N filters ·
   Clear all`) and a result line (`M of 53 badges shown`) sit at the end of the bar, always visible,
   even at zero active filters.

**Example.** Bought Aerial Wizard (Bronze), Float Game (Silver), and Ghost Stepper (Gold): Finishing
reads `Badge Points 10 / 16`, `left 6`, `Badge Slots 3 / 3`.

## 5. Assign Synergy Slots

1. Open the **Synergy Slots** panel (below the badge grid). It opens on a **board** — a 2×8 grid,
   Fuse above Reaction, columns 1 to 8 in order, with a divider between 4 and 5 separating Temporary
   from Permanent. The board is read-and-navigate only: no control lives in a cell. Each column
   header names the Synergy Slot and its current magnitude (`Synergy Slot 7 (+2)`), locked ones show
   `🔒 Locked`, and clicking a column jumps you to that Synergy Slot's own row below, where the real
   controls are. Under the season-reset preview the whole Temporary band is labelled *"⟳ Temporary
   Synergy Slots disabled by season-reset preview."*
2. Below the board, the eight rows. Synergy Slots 1–4 are **Temporary** (seasonal, reset at season
   end); Synergy Slots 5–8 are **Permanent** (Crew Level 28, Crew Level 39, Build Specialization
   Goal 10, and Legend 2 REP, respectively).
3. Synergy Slot 7 — the Build Specialization one — starts at **+2 by default and can't be switched
   back to +1**; its Boost control shows +1 disabled with the reason spelled out: *"Synergy Slot 7
   is +2 — Build Specialization, confirmed 2026-08-26."* Every other Synergy Slot's row has a
   **Boost** control (**+1** / **+2**) — flip it to designate that Synergy Slot, capped at **one**
   further +2 pick (Synergy Slot 7 already counts as one of the two). Try to add a second and the
   option disables itself with the reason spelled out: *"Only 2 Synergy Slots can be +2. Clear
   another first."* The banner at the top of the panel tracks the remaining budget directly: *"1
   more Synergy Slot can be +2 — 2K hasn't published which. Designate it here."*, with a live *"+2
   designated: `<N>` of 1"* counter.
4. Synergy Slot 7 also asks which **discipline** it's locked to — a dropdown labelled "Build
   Specialization discipline," starting at "Not set." Pick whichever Build Specialization track you
   actually completed in-game (Finishing, Shooting, Playmaking, Defense, Rebounding, or Physicals).
   Once it's set, a `Locked to <category>` chip appears on the row, and Synergy Slot 7's Fuse and
   Reaction pickers only offer badges from that one category — a mismatched purchased badge shows up
   disabled in the list, labelled *"`<badge>` — `<discipline>` badges only in this Synergy Slot,"*
   rather than simply not appearing. Every other Synergy Slot still works across all six categories.
5. Toggle a Synergy Slot's **Unlocked** switch once you actually have it in-game. A locked row shows
   only *"Locked — unlock to assign badges,"* with no pickers.
6. Pick a **⚡ Fuse** badge and a **↺ Reaction** badge for the row, both from a dropdown grouped by
   category and listing only badges you've already purchased (`name — level`) — the description on
   each card is worth a glance here if you're deciding between two candidates. A badge already
   holding a role elsewhere shows disabled, with the reason in its own label — e.g. *"already Fuse in
   Synergy Slot 2."*
7. **Assigning a badge as a Synergy Slot's Fuse frees the points you spent on it, back to its
   category pool — immediately, at whatever level and magnitude it's at.** This is 2K's own
   confirmed mechanic, not a "wait until it hits Legend" rule: a Bronze badge fused at +1 refunds the
   moment you fuse it. Un-fuse it (clear the Synergy Slot, or let another badge replace it) and the
   refund goes with it. Reaction assignments never refund anything — only the Fuse role does.
8. The Fuse badge's card immediately shows its boosted level: a role chip reading compactly on
   screen (e.g. `⚡ Fuse · SS1 +1`), plus a status line like "Now Silver · Fused to Gold."
9. The Reaction badge's card shows a status line with two numbers: its base (purchased) level, and
   an "activates to X" phrase — the level it reaches once its paired Fuse badge has triggered enough
   times in a game. Flip the header's **Reactions activated** toggle to preview every Reaction badge
   at its activated level at once. A strip appears while it's on: *"Preview: reactions activated.
   Card levels show in-game ceilings. Points are unchanged."* — this only changes what's displayed;
   it never touches your points ledger.
10. Flip the header's **Season-reset preview** toggle to see what happens if your Temporary Synergy
    Slots (1–4) reset today. A strip appears: *"Preview: season reset. Synergy Slots 1–4 disabled.
    Primary points are unchanged; N of 6 categories show a projection."* Any affected Synergy Slot
    row dims with `⟳ Disabled by season-reset preview` (its controls stay operable — the preview
    never changes what's actually assigned). Any category whose Fuse badge sits in a Temporary
    Synergy Slot gets a second, labelled row under its primary one — its refund disappears in the
    projection along with the fuse role that earned it: `⟳ After season reset · Badge Points 10 / 16
    · left 6 · refunded 0`. The primary row above it never moves. A badge fused in a Permanent
    Synergy Slot (5–8) shows no projection at all.

**Example, continuing from step 4.** Unlocked Synergy Slot 1, assigned Float Game (Silver) as Fuse —
the card read "Now Silver · Fused to Gold," and the ledger updated immediately: `Badge Points
10 / 16`, `left 11`, `refunded 5` — Float Game's own Silver cost, freed the moment it was fused,
nowhere near Legend. Then designated Synergy Slot 1 as +2 and re-assigned its Fuse to Ghost Stepper
(Gold) instead — Float Game's fuse role (and its refund) ended the instant it was replaced, and
Ghost Stepper's took over: the card gained a **LEGEND** chip, and the ledger read `Badge Points
10 / 16`, `left 10`, `refunded 4` (Ghost Stepper's own Gold cost). Turning on Season-reset preview
left that primary row untouched and added `⟳ After season reset · Badge Points 10 / 16 · left 6 ·
refunded 0` underneath — Synergy Slot 1 is Temporary, so the projection shows Ghost Stepper's fuse
role, and the refund that comes with it, disappearing along with the Synergy Slot.

## 6. Read the plan back, and manage your builds

### Reading it back

Open the **Summary** panel below the Synergy Slots. It gives you three things you can reconcile
against a game screen line by line:

- The **loadout roster** — every badge you bought, grouped by category, with purchased level,
  effective level and cost, and a per-category footer. Categories you bought nothing in are named in
  one tail line rather than rendered as six empty groups. (The grid's **Purchased** filter is the
  companion view: the roster is what you read, the filtered grid is what you click.)
- The **Synergy** digest — your Synergy Slots and their assignments, with `— frees N pts` where a
  fuse actually refunded.
- A **plain-text block** with the whole plan in it. **Copy as text** copies it where the browser
  allows; where it can't — notably over a LAN address on your phone, which browsers don't treat as
  a secure context — it opens the text below and selects it so a long-press copy works. Either way
  the text is on screen, so there's no failure state to handle.

### Managing your builds

1. The tool autosaves to your browser's local storage as you work — there's nothing to click.
2. The header's build switcher shows your current build's name, plain, when it's clean and tied to
   a save; it reads `<name> — unsaved changes` the moment it isn't — including right after a page
   reload, even for a build you'd just loaded or saved with nothing changed. That's a real gap, not
   a bug in the label: the app doesn't yet remember which saved build a reload came from, so it
   treats every reload as unsaved work until proven otherwise. Your data is fine either way (autosave
   still has it); it's the label that's stale. Other saved builds in the dropdown read
   `<name> — saved`.
3. Click **Manage** to open the build manager. Each saved build shows its name, when it was saved,
   and the dataset version it was planned against (with a small warning dot if that version doesn't
   match the app's current dataset). Per build, you get:
   - **Load** — replace your working build with this one. If your current build has unsaved changes,
     you're asked to confirm first.
   - **Rename** — inline; **Save** or **Cancel**. Renaming only ever changes the name — it can't
     touch your loadout or synergy assignments.
   - **Duplicate** — copies it under `<name> copy` (or `<name> copy 2`, and so on, if that name's
     already taken). This is how you branch a variation without touching the original; there's no
     separate compare view.
   - **Delete** — click once to relabel the button to **Confirm delete**, click again to actually
     delete. No second dialog.

   Type a name at the bottom and click **Save as new** to save your current working build. If a
   saved build exists but can't be read, it isn't silently dropped from this list or the switcher —
   both say so: *"N saved builds couldn't be read — preserved, not deleted."*
4. **Export JSON** downloads your current build as `<name>-<dataVersion>.json` — a plain file
   download, no network involved. **Import JSON** opens a file picker; before replacing anything, a
   confirm dialog shows the imported build's name, save date, and dataset version — with drift
   wording if that version doesn't match your current dataset — and asks you to **Replace working
   build** or **Cancel**. A file that won't parse shows *"Couldn't read that file: `<reason>`"* and
   the dialog stays open so you can try another.
5. If you open a saved (or autosaved) build and its dataset version doesn't match the app's current
   one, a banner reads: *"Planned against dataset `<old>`; current is `<new>`. Requirements may have
   changed — re-check eligibility."* Click **Re-check eligibility** to see exactly which purchased
   badges no longer qualify at the level you planned — it either lists them by name or confirms
   every purchased badge still does. Nothing about your saved plan auto-migrates. Two narrower
   disclosures can appear on the same banner, with or without a version mismatch: if a badge left
   the dataset entirely, *"N badges from this build no longer exist in the dataset: `<names>` —
   removed from the plan"*; if a Fuse or Reaction assignment pointed at a badge no longer in your
   loadout, *"N synergy assignments referenced badges not in this build's loadout: Synergy Slot 5
   Fuse → `<name>` — cleared."* Both are healed or stripped automatically and always disclosed —
   never silently gone. If you load an older build that predates Synergy Slot 7's ratified +2, the
   Synergy panel itself tells you it upgraded that Synergy Slot's magnitude on load.
6. If the app hits a genuine invariant it can't express — most likely from an imported or hand-edited
   file — the Summary panel shows a red **"Invalid loadout state"** banner naming exactly which rule
   broke and on which badge (e.g. a badge holding two synergy roles, or a Synergy Slot 7 assignment
   that violates its discipline lock). Nothing crashes and nothing is silently dropped; you're told
   precisely what to fix.
7. If autosave ever fails to **write** (browser storage full, private-browsing restrictions), a red
   banner — one of the few alerts in this app a screen reader always announces — reads *"Couldn't
   autosave — export your build to JSON."* with an **Export now** button right on the banner.
8. If your autosave can't be **read** at all (a genuinely corrupted value, not a drift), it's
   quarantined byte-for-byte rather than silently overwritten with a fresh empty build. A banner
   reads *"A saved build couldn't be read — it's been preserved, not deleted,"* with **Export raw
   saved data** and **Discard** buttons. This banner stays up until you act on it — it isn't
   dismissible, because dismissing it would hide the only pointer to your preserved data.
9. If the app fails to render at all, a plain recovery screen appears instead of a blank page:
   *"Badge Builder hit a rendering error."* It offers **Export raw saved data** first, then **Clear
   just the unreadable autosave** (the narrow fix, and usually the right one), and last **Clear ALL
   saved data — the autosave, every named build, and layout preferences** — which asks you to
   confirm and names exactly what it will remove before it does anything. Nothing is ever cleared
   without a click that named the outcome first.
10. Two things worth knowing about autosave, unrelated to the label gap in step 2: it's tied to the
    exact address you're running the app on (host + port) — if that ever changes, your saved builds
    won't follow it. And with two browser tabs open on the same build, the last one to save wins;
    the other tab's unsaved changes get overwritten.

## What the app doesn't do

Stated plainly, because a planning tool's credibility rests on not implying more than it knows:

- **It never invents 2K27 data.** Anything 2K hasn't published stays unknown rather than guessed —
  most visibly the attribute → (Badge Slots, Badge Points) derivation, which is why step 1 asks you
  to type those twelve numbers in.
- **It doesn't model the cap-breaker → boost mapping.** The engine honours a cap-broken attribute
  value for eligibility, but the in-app control to declare one hasn't shipped yet — today a
  cap-broken value can only arrive via an imported JSON file. Cap breakers never grant Badge Slots
  or Badge Points.
- **It doesn't know which second Synergy Slot carries +2.** Synergy Slot 7 is confirmed; the other
  is yours to designate.
- **There's no compare view.** Duplicate a build instead.
- **There's no account and no sync.** Saved builds live in one browser on one device.
