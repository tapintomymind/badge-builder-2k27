/**
 * Anti-transcription control for the F4 DISPLAY payload — SHIP GATE.
 * Sibling to tests/spot-check.test.ts, which owns the THRESHOLD payload.
 *
 * This control samples 53 of 53. Every description in `badges.json` is
 * asserted against a literal here, keyed BY BADGE NAME.
 *
 * TRANSCRIPTION INDEPENDENCE IS THE WHOLE CONTROL. The literals below were
 * transcribed BY HAND, IN A SEPARATE PASS, from
 * `workspace/badge-builder-2k27/research/2k-official-myplayer-builder-2026-08-26.md`
 * §1 — the capture doc. COPY-PASTING THEM FROM
 * `src/data/badges.enrichment.source.txt` OR FROM `src/data/badges.json`
 * DEFEATS THE CONTROL ENTIRELY and is a reportable scope-deviation EVEN
 * THOUGH EVERY TEST GOES GREEN. (This is the M1 idiom: `spot-check.test.ts`'s
 * header says the same thing about regenerating its literals from
 * `badges.source.txt`.) The control works because an independent typo would
 * have to be made IDENTICALLY TWICE.
 *
 * THE RESIDUAL, STATED HONESTLY, BECAUSE IT DOES NOT GO AWAY: no control in
 * this repo can detect a description that was MIS-PAIRED IN THE CAPTURE DOC
 * ITSELF. The capture doc is the authority; every gate below it can only
 * check faithfulness to that authority, never the authority's own
 * correctness. That check is the user's eyeball at the acceptance session.
 * It is the difference between a control and a comfort.
 *
 * The MECHANICAL half of this class — a systematic join error (row shift,
 * index-based pairing, sort-order dependency) — is covered without any
 * transcription at all by the shuffle-invariance test in
 * tests/generate-badges.test.ts, and that one is immune to discipline.
 *
 * TRIPWIRE CLASS: a failure means the DATA disagrees with what we
 * transcribed. ASK THE USER — never "fix" the data.
 */

import { describe, expect, it } from "vitest";
import datasetText from "../src/data/badges.json?raw";
import type { RawBadgeDataset } from "../src/engine/types";

const TRIPWIRE =
  "TRIPWIRE: the DATA disagrees with the hand transcription. ASK THE USER — " +
  'never "fix" the data.';

const dataset = JSON.parse(datasetText) as RawBadgeDataset;

/** Hand-transcribed from the capture doc §1 — NOT generated, NOT copied from
 * badges.enrichment.source.txt. See the file header. */
const EXPECTED: readonly { name: string; isNew: boolean; description: string }[] = [
  // --- Shooting (9), 5 NEW ---
  { name: "Post Fade Phenom", isNew: false, description: "Post fades and hop shots more accurate" },
  { name: "Deadeye", isNew: false, description: "Reduces contest penalty on jump shots" },
  { name: "Limitless Range", isNew: false, description: "Extends effective three-point range" },
  { name: "Mini Marksman", isNew: false, description: "Helps shorter shooters over tall defenders" },
  { name: "Set and Fire", isNew: true, description: "Stand-still (feet-set) three-pointers boosted" },
  { name: "Arc Cadence", isNew: true, description: "Moving/pull-up three-pointers improved" },
  { name: "Static Middy", isNew: true, description: "Stand-still mid-range accuracy boosted" },
  { name: "Smooth Operator", isNew: true, description: "Moving/pull-up mid-range improved" },
  { name: "Quick Trigger", isNew: true, description: "No-dip jump shots more successful" },

  // --- Finishing (11), 2 NEW ---
  { name: "Aerial Wizard", isNew: false, description: "Alley-oop and putback finishing" },
  { name: "Float Game", isNew: false, description: "Floater finishing" },
  { name: "Layup Mixmaster", isNew: false, description: "Acrobatic/fancy layup conversions" },
  { name: "Paint Prodigy", isNew: false, description: "Quick, effective paint scoring" },
  { name: "Physical Finisher", isNew: false, description: "Contact layup conversions" },
  { name: "Posterizer", isNew: false, description: "Dunking on defenders" },
  { name: "Rise Up", isNew: false, description: "Standing dunks in the paint" },
  { name: "Hook Specialist", isNew: false, description: "Post hook accuracy" },
  { name: "Post Powerhouse", isNew: false, description: "Backdowns and drop steps stronger" },
  { name: "Post Spin Catalyst", isNew: true, description: "Post spins, reduced strip chance" },
  { name: "Ghost Stepper", isNew: true, description: "Step-through layups more effective" },

  // --- Playmaking (10), 1 NEW ---
  { name: "Bail Out", isNew: false, description: "Pass accuracy out of shots/double teams" },
  { name: "Break Starter", isNew: false, description: "Deep outlet passes after rebounds" },
  { name: "Dimer", isNew: false, description: "Boosts teammate shot % off assists" },
  { name: "Versatile Visionary", isNew: false, description: "Threads tight passes and alley-oops" },
  { name: "Ankle Assassin", isNew: false, description: "Breakdowns/crossovers more effective" },
  { name: "Handles for Days", isNew: false, description: "Less energy drain from dribble chains" },
  { name: "Lightning Launch", isNew: false, description: "Faster perimeter attack launches" },
  { name: "Strong Handle", isNew: false, description: "Resists dribble interference from contact" },
  { name: "Unpluckable", isNew: false, description: "Resists steal attempts" },
  { name: "Pace", isNew: true, description: "Faster sprint speed with ball" },

  // --- Defense (12), 3 NEW ---
  { name: "Off-Ball Pest", isNew: false, description: "Harder to screen/pass around off-ball" },
  { name: "High-Flying Denier", isNew: false, description: "Chase-down block speed and leap" },
  { name: "Paint Patroller", isNew: false, description: "Rim blocks and interior contests" },
  { name: "Post Lockdown", isNew: false, description: "Post defense, more strip chance" },
  { name: "Wall Up", isNew: true, description: "Hands-up paint contests more effective" },
  { name: "Pick Dodger", isNew: false, description: "Navigates through/around screens" },
  { name: "Challenger", isNew: false, description: "Well-timed perimeter contests" },
  { name: "Immovable Enforcer", isNew: false, description: "Defensive strength vs drivers/finishers" },
  { name: "Ankle Braces", isNew: true, description: "Less susceptible to ankle-breakers" },
  { name: "Seatbelt", isNew: true, description: "Body-up defense, disrupts drives" },
  { name: "Glove", isNew: false, description: "Steals from handlers and layups" },
  { name: "Interceptor", isNew: false, description: "Pass tips and interceptions" },

  // --- Rebounding (5), 5 NEW (the entire category) ---
  { name: "Crasher", isNew: true, description: "Offensive rebound tracking/grabbing" },
  { name: "Possession Closer", isNew: true, description: "Defensive rebound grabbing" },
  { name: "Sync Snatcher", isNew: true, description: "Timing-based vertical/rebound boost" },
  { name: "Boxout Boss", isNew: true, description: "Better boxouts (as the boxer)" },
  { name: "Breaker", isNew: true, description: "Breaks opponent boxouts" },

  // --- Physicals (6), 3 NEW ---
  { name: "Slippery Off-Ball", isNew: false, description: "Navigates traffic off screens" },
  { name: "Pogo Stick", isNew: false, description: "Quick consecutive jumps" },
  { name: "Work Horse", isNew: true, description: "Loose-ball speed and hustle" },
  { name: "Flash", isNew: true, description: "Faster off-ball movement in transition" },
  { name: "Bruiser", isNew: true, description: "Drains opponent energy via contact" },
  { name: "Brick Wall", isNew: false, description: "Screen effectiveness and impact" },
];

describe("F4 group 4.1 — 53-badge description control against hand-transcribed capture-doc literals", () => {
  for (const expected of EXPECTED) {
    it(`${expected.name}: description + isNew match the hand transcription`, () => {
      const actual = dataset.badges.find((badge) => badge.name === expected.name);
      expect(actual, `${TRIPWIRE} (badge "${expected.name}" missing from badges.json)`).toBeDefined();
      expect(actual?.description, `${TRIPWIRE} (badge "${expected.name}")`).toBe(
        expected.description,
      );
      expect(actual?.isNew, `${TRIPWIRE} (badge "${expected.name}")`).toBe(expected.isNew);
    });
  }

  it("covers the WHOLE roster — no badge in badges.json is outside the sample", () => {
    const sampled = new Set(EXPECTED.map((row) => row.name));
    const missing = dataset.badges.map((badge) => badge.name).filter((name) => !sampled.has(name));
    expect(missing, `${TRIPWIRE} (unsampled badges would pass every gate in this repo)`).toEqual(
      [],
    );
  });
});

describe("F4 group 4.2 — coverage meta-assertions (spot-check.test.ts's idiom)", () => {
  // Trivially true at the full-53 form, and pinned anyway: this is what keeps
  // the FALLBACK form honest if the sample is ever narrowed. A lint that
  // cannot fail on its own canary is worse than no lint.
  const categoryOf = new Map(dataset.badges.map((badge) => [badge.name, badge.category]));

  it("the sample spans all 6 categories", () => {
    const categories = new Set(EXPECTED.map((row) => categoryOf.get(row.name)));
    expect(categories.size).toBe(6);
  });

  it("the sample spans both isNew values", () => {
    expect(new Set(EXPECTED.map((row) => row.isNew))).toEqual(new Set([false, true]));
  });

  it("the sample is 53 of 53 — the coverage claim in the header is honest", () => {
    expect(EXPECTED.length).toBe(53);
    expect(dataset.badges.length).toBe(53);
  });
});
