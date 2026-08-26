/**
 * Cap Breakers — the ONE composition point [scope.md §0.1 A6, A6-R2 ·
 * features/cap-breakers/engine-data-design.md §2].
 *
 * A cap breaker is a per-attribute value the user DECLARES above the value
 * they entered, and it counts for badge ELIGIBILITY ONLY. It grants no Badge
 * Points, no Badge Slots, no tokens — and that is mechanically true rather
 * than policed: the entire economy (cost.ts, ledger.ts, synergy.ts,
 * synergy-ledger.ts, validate-loadout.ts, budget.ts) reads no attribute at
 * all, so it cannot see a cap breaker whatever a future edit does.
 *
 * THE STORED VALUE IS ABSOLUTE, NEVER A DELTA. The user reads 83 off the 2K
 * builder and types 83. A delta would make them compute 83 − 60 = 23, and
 * would tempt a future reader to carry that 23 across a base edit — i.e. to
 * assert that a base of 65 also earns +23. THAT ASSERTION IS UNPUBLISHED 2K
 * DATA. An absolute cannot express it.
 *
 * THE cap-breaker → boost MAPPING IS NEVER COMPUTED HERE, at any level of
 * indirection: 5 breakers took the user's Three-Point 60 → 83, which is
 * neither +1 each nor evenly divided [user 2026-08-26]. No constant, no
 * table, no interpolation, no per-attribute formula. Ship gate, A6-R9 1.6.
 *
 * THIS FILE AND `types.ts`'s DECLARATION ARE THE ONLY PLACES UNDER `src/`
 * THAT MAY NAME `capBrokenAttributes` IN TYPED CODE — mechanised by
 * tests/architecture.test.ts lint (g). The containment is not style:
 * `AttributeGrid` renders the ENTERED value and its slider commits back what
 * it renders, so an effective value reaching that component would rewrite the
 * user's entered 60 as 83 on the next nudge — silently, with no error and no
 * undo [A6-R6's hazard box, engine-data-design §3.4].
 */

import type { Build } from "./types";
import type { Attr } from "./vocabulary";
import { ATTRS } from "./vocabulary";

/**
 * The value badge eligibility evaluates against: the higher of the entered
 * value and the declared cap-broken one.
 *
 * `Math.max` IS A RULING, NOT DEFENSIVE NOISE [A6-R2]. The app's own UI
 * produces `declared < entered`: declare 83 against an entered 60, then drag
 * the slider to 90. Nothing is corrupt — the declaration is simply stale, and
 * a cap breaker can never LOWER an attribute. The engine takes the higher of
 * the two and the stale declaration goes inert, WITHOUT the app rewriting the
 * user's stored number (H8 — disclose, never repair).
 *
 * `?.` rather than a truthiness test: the wire legally carries `null` here
 * [A6-R5's table] and `build` reaches the typed world through a blind cast,
 * so `null` is a RUNTIME value of a field the type calls optional.
 */
export function effectiveAttribute(build: Build, attr: Attr): number {
  const declared = build.capBrokenAttributes?.[attr];
  const entered = build.attributes[attr];
  return declared === undefined || declared === null
    ? entered
    : Math.max(entered, declared);
}

/**
 * Is there a cap breaker worth guarding in this build? The content predicates
 * (`workingHasContent`, `playerHasContent`, BuildPanel's dirty check) call
 * THIS rather than enumerating the field, so the containment lint holds and
 * the predicates widen by themselves — the same shape A5 used for
 * `bonusHasContent`.
 *
 * `> 0` mirrors the sibling attribute predicates: 0 means "not entered"
 * throughout this app, and a declared 0 is inert under `Math.max` anyway.
 */
export function hasCapBreakers(build: Build): boolean {
  const declared = build.capBrokenAttributes;
  return ATTRS.some((attr) => (declared?.[attr] ?? 0) > 0);
}
