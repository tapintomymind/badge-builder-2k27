/**
 * The copy-as-text builder (design-spec §14.5, adjudication AJ-2).
 *
 * WHY PROSE LIVES IN `src/engine/`. A string that encodes tier costs,
 * effective levels, refund consequences and unset-capacity semantics IS A
 * RULE, and rules do not live in components [seed: Working agreements #1].
 * The objection — "user-facing prose in the engine is the mirror image of a
 * step enumerator in a component" — is defanged by the signature: this builder
 * consumes a `BuildSummary`, i.e. facts ALREADY COMPUTED by
 * `src/engine/summary.ts`. It re-derives no rule. It is a formatter
 * co-located with its data source, not a second definition of anything. There
 * is in-tree precedent: `eligibility.ts` authors "needs 83 Three-Point for
 * Gold", and `CategoryLedger`'s over-by builders are deliberately shared
 * across surfaces (P0-1: one builder, N consumers, zero drift). The payoff is
 * that the panel and the text can be asserted EQUAL in a test rather than
 * hoped equal.
 *
 * EVERY HONESTY MARKER IN THE UI SURVIVES INTO THE TEXT: `unverified`,
 * `no longer qualifies`, `capacity not set`, the `N of 6 categories` footnote,
 * the dataset version. A summary you can paste is a summary that outlives its
 * disclaimers otherwise.
 *
 * EFFECTIVE LEVELS USE THE NEUTRAL OVERLAY, identically to the panel (§14.6).
 * The text block NEVER serialises a preview.
 *
 * `rollSeed` is a plain `string`, deliberately NOT `ReproducibilityToken` —
 * that type belongs to the roll engine, and this module has ZERO import edge
 * to it. The caller passes the seed through.
 *
 * ---------------------------------------------------------------------------
 * TWO PLACES §14.5's ILLUSTRATIVE BLOCK IS INTERNALLY INCONSISTENT, resolved
 * here in favour of the binding rules and reported rather than papered over:
 *
 *  1. The block shows BOTH `(1 of 6 categories has no capacity set)` AND a
 *     `- Badge Slots: 15 of the 20 …` line. AJ-5 and §4.7 say the Σ line is
 *     SUPPRESSED ENTIRELY while any capacity is unset. The rule wins: the Σ
 *     line is omitted exactly when `badgeSlotsBaselineText` returns null.
 *  2. Its numbers do not reconcile against any real state (a single cost-1
 *     Dimer under `4 pts spent`; Posterizer rendered `-> HOF` in the roster and
 *     `-> Legend` in the Synergy block). The FORMAT is reproduced line-shape
 *     for line-shape; the illustration's arithmetic is not, because this
 *     builder's numbers come from the ledger.
 * ---------------------------------------------------------------------------
 */

import type { BuildSummary, CategorySummary, RosterRow, SynergySummaryRow } from "./summary";
import { badgeSlotsBaselineText } from "./summary";
import type { Level } from "./vocabulary";
import { LEVEL_LABELS, formatHeightInches, levelIndex } from "./vocabulary";

export interface SummaryTextOptions {
  /** A plain string. Absent ⇒ the footer line is absent. */
  rollSeed?: string;
  /** The saved build's name. Not derivable from the summary — it is a
   *  persistence concern the caller holds. Absent ⇒ no ` · name` suffix. */
  buildName?: string;
}

/** `Rebounding or Physicals` / `Finishing, Defense or Physicals`. */
function joinWithOr(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  const head = items.slice(0, -1);
  return `${head.join(", ")} or ${items[items.length - 1] as string}`;
}

function levelWord(level: Level): string {
  return LEVEL_LABELS[level];
}

/** `15 / 16 pts · left 1` · `12 / 10 pts · over by 2` · `4 pts spent`. */
function pointsSegment(summary: CategorySummary): string {
  const { spent, remainingPoints } = summary.readout;
  const pool = summary.readout.spent + remainingPoints - summary.readout.refunded;
  // The pool is the ledger's own identity: pool = spent - refunded + remaining.
  if (pool <= 0) return `${spent} pts spent`;
  return remainingPoints < 0
    ? `${spent} / ${pool} pts · over by ${-remainingPoints}`
    : `${spent} / ${pool} pts · left ${remainingPoints}`;
}

/** `3 / 3 Badge Slots` · `4 / 3 Badge Slots · over by 1` · `capacity not set`. */
function badgeSlotsSegment(summary: CategorySummary): string {
  if (summary.badgeSlotsCapacityUnset) return "capacity not set";
  const base = `${summary.readout.equipSlotsUsed} / ${summary.equipSlotCapacity} Badge Slots`;
  return summary.equipSlotsOverBy > 0 ? `${base} · over by ${summary.equipSlotsOverBy}` : base;
}

function rosterLine(row: RosterRow): string {
  const boosted = levelIndex(row.committedEffectiveLevel) > levelIndex(row.purchasedLevel);
  // The role annotation explains the arrow, so it renders with the arrow. A
  // role that produces no committed boost (every Reaction) is disclosed in the
  // Synergy block instead — §14.5's own block is written this way.
  const arrow = boosted ? ` -> ${levelWord(row.committedEffectiveLevel)}` : "";
  const role =
    boosted && row.synergyRole !== null
      ? ` (${row.synergyRole.kind === "fuse" ? "Fuse" : "Reaction"}, Synergy Slot ${row.synergyRole.synergySlotId})`
      : "";
  const stale = row.stale
    ? `   !! no longer qualifies: ${row.staleReasons.join("; ")}`
    : "";
  return `- ${row.name} [${row.tier}] ${levelWord(row.purchasedLevel)}${arrow}${role} — ${row.cost}${stale}`;
}

function synergyLine(row: SynergySummaryRow): string {
  const head =
    `- Synergy Slot ${row.synergySlotId} · ` +
    `${row.permanence === "permanent" ? "Permanent" : "Temporary"} · +${row.magnitude}`;
  const parts: string[] = [];
  if (row.fuse !== null) {
    parts.push(`Fuse: ${row.fuse.name} -> ${levelWord(row.fuse.committedEffectiveLevel)}`);
  }
  if (row.reaction !== null) {
    parts.push(
      `Reaction: ${row.reaction.name} -> ${levelWord(row.reaction.activatesTo)} when activated`,
    );
  }
  const roles = parts.length === 0 ? "not assigned" : parts.join(" / ");
  const frees =
    row.freesPointsToCategory > 0 && row.fuse !== null
      ? ` — frees ${row.freesPointsToCategory} pts`
      : "";
  return `${head} — ${roles}${frees}`;
}

/**
 * §14.5's block. One format, no toggle: plain text with markdown-compatible
 * structure, so it pastes legibly into a plain-text field AND renders in a
 * markdown surface.
 */
export function formatSummaryText(
  summary: BuildSummary,
  options: SummaryTextOptions = {},
  synergy: readonly SynergySummaryRow[] = [],
): string {
  const lines: string[] = [];

  // ---- header -------------------------------------------------------------
  const name = options.buildName === undefined ? "" : ` · ${options.buildName}`;
  const position = summary.build.position === undefined ? "" : ` · ${summary.build.position}`;
  lines.push(`## Badge Builder — 2K27${name}`);
  lines.push(
    `${formatHeightInches(summary.build.heightInches)} (${summary.build.heightInches} in)` +
      `${position} · dataset ${summary.dataVersion}`,
  );
  lines.push(
    "Badge Tokens and Badge Slots are unverified — 2K has not published the derivation.",
  );

  // ---- one block per category with a purchase -----------------------------
  const populated = summary.categories.filter((category) => category.rows.length > 0);
  for (const category of populated) {
    lines.push("");
    lines.push(
      `### ${category.category} — ${pointsSegment(category)} · ${badgeSlotsSegment(category)}`,
    );
    for (const row of category.rows) lines.push(rosterLine(row));
  }

  // ---- the omitted-categories tail ----------------------------------------
  const empty = summary.categories
    .filter((category) => category.rows.length === 0)
    .map((category) => category.category);
  if (populated.length === 0) {
    lines.push("");
    lines.push("No badges purchased yet.");
  } else if (empty.length > 0) {
    lines.push("");
    lines.push(`Nothing purchased in ${joinWithOr(empty)}.`);
  }

  // ---- synergy ------------------------------------------------------------
  // Unlocked slots render (assigned or not); locked ones do not — a locked
  // slot has nothing to re-enter into the game — and the tail count carries
  // them (§14.4).
  const unlocked = synergy.filter((row) => row.unlocked);
  if (synergy.length > 0) {
    lines.push("");
    lines.push("### Synergy");
    for (const row of unlocked) lines.push(synergyLine(row));
    const fullyAssigned = synergy.filter(
      (row) => row.fuse !== null && row.reaction !== null,
    ).length;
    lines.push(
      `- ${unlocked.length} of ${synergy.length} Synergy Slots unlocked · ${fullyAssigned} fully assigned`,
    );
  }

  // ---- totals -------------------------------------------------------------
  lines.push("");
  lines.push("### Totals");
  const counts = summary.countsByLevel;
  lines.push(
    `- Badges: Bronze ${counts.bronze} · Silver ${counts.silver} · Gold ${counts.gold}` +
      ` · HOF ${counts.hof} · Legend ${counts.legend} (boost)`,
  );
  const footnote =
    summary.categoriesWithoutCapacity === 0
      ? ""
      : ` (${summary.categoriesWithoutCapacity} of ${summary.categories.length} categories ` +
        `${summary.categoriesWithoutCapacity === 1 ? "has" : "have"} no capacity set)`;
  lines.push(`- Spend: ${summary.totalSpent} / ${summary.totalPool}${footnote}`);
  const baseline = badgeSlotsBaselineText(summary);
  if (baseline !== null) lines.push(`- Badge Slots: ${baseline}`);

  // ---- the reproducibility footer -----------------------------------------
  if (options.rollSeed !== undefined) {
    lines.push("");
    lines.push(
      `Roll seed ${options.rollSeed} — reproduces only against this same build, budgets and pins.`,
    );
  }

  return `${lines.join("\n")}\n`;
}
