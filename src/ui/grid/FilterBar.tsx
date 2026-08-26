/**
 * FilterBar (design-spec §3.4) — tier, affordable-at-≥-level-X, category,
 * legal-for-my-build. The affordability filter is ELEVATED as the SECOND
 * control (impl-brief M4 #7, design-spec §3.6 item 3), not buried in an
 * overflow: it is the seed's own "what combos fit" affordance doing the job.
 *
 * Active-filter count + `Clear all` are ALWAYS rendered (shows `0 filters`
 * at rest — full chrome at zero state), and the result count is a
 * visually-present role="status" line.
 *
 * The bar contains ZERO filter arithmetic: the actual predicates are applied
 * by the App against engine outputs (validateBadge / whatIf /
 * remainingPoints); this component only edits the FilterState value.
 */

import type { Category, PurchasableLevel, Tier } from "../../engine/vocabulary";
import { CATEGORIES, LEVEL_LABELS, PURCHASABLE_LEVELS, TIERS } from "../../engine/vocabulary";
import { Toggle } from "../primitives/Toggle";
import { Select } from "../primitives/Select";

export interface FilterState {
  /** Empty = no tier filter (all tiers shown). */
  tiers: Tier[];
  /** Checked categories. All six checked = no category filter. */
  categories: Category[];
  legalOnly: boolean;
  affordableAtLeast: PurchasableLevel | null;
  /**
   * F8-S2 (§14.9 item 3) — "show me just my loadout, as cards". The shipped
   * four facets cannot express it, so the only purchased-only view in the app
   * was scrolling 53 cards looking for ~11.
   *
   * THE ROSTER'S COMPANION, NOT ITS SUBSTITUTE: a card is ~298px wide and a
   * roster row is one line. The roster is what you read beside a console;
   * this is what you click when you want to CHANGE something.
   */
  purchasedOnly: boolean;
}

export function defaultFilterState(): FilterState {
  return {
    tiers: [],
    categories: [...CATEGORIES],
    legalOnly: false,
    affordableAtLeast: null,
    purchasedOnly: false,
  };
}

/** Active FACETS (tier / affordable / category / legal / purchased), 0–5. */
export function activeFilterCount(filters: FilterState): number {
  return (
    (filters.tiers.length > 0 ? 1 : 0) +
    (filters.affordableAtLeast !== null ? 1 : 0) +
    (filters.categories.length < CATEGORIES.length ? 1 : 0) +
    (filters.legalOnly ? 1 : 0) +
    (filters.purchasedOnly ? 1 : 0)
  );
}

export interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  shownCount: number;
  totalCount: number;
}

export function FilterBar({ filters, onChange, shownCount, totalCount }: FilterBarProps) {
  const count = activeFilterCount(filters);
  const categorySummary =
    filters.categories.length === CATEGORIES.length
      ? `Category · ${CATEGORIES.length}`
      : `Category · ${filters.categories.length} of ${CATEGORIES.length}`;

  return (
    // role="search" (the spec's fallback): this React version does not yet
    // recognize the native <search> element.
    <div className="filter-bar" role="search" aria-label="Badge filters">
      <div className="filter-bar__controls">
        {/* 1 — tier chips (multi-select toggle buttons). */}
        <div className="filter-bar__tiers" role="group" aria-label="Tier">
          {TIERS.map((tier) => {
            const pressed = filters.tiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                className="chip chip--tier filter-chip"
                aria-pressed={pressed}
                onClick={() => {
                  onChange({
                    ...filters,
                    tiers: pressed
                      ? filters.tiers.filter((candidate) => candidate !== tier)
                      : [...filters.tiers, tier],
                  });
                }}
              >
                {tier}
              </button>
            );
          })}
        </div>

        {/* 2 — the ELEVATED affordability filter (the "what combos fit" view). */}
        <Select
          label="Affordable at ≥"
          value={filters.affordableAtLeast ?? ""}
          onChange={(value) => {
            onChange({
              ...filters,
              affordableAtLeast: value === "" ? null : (value as PurchasableLevel),
            });
          }}
          options={[
            { value: "", label: "Any level" },
            ...PURCHASABLE_LEVELS.map((level) => ({
              value: level,
              label: LEVEL_LABELS[level],
            })),
          ]}
        />

        {/* 3 — category disclosure with six checkboxes. */}
        <details className="filter-bar__categories">
          <summary>{categorySummary}</summary>
          <div className="filter-bar__category-list">
            {CATEGORIES.map((category) => {
              const checked = filters.categories.includes(category);
              return (
                <label key={category} className="filter-bar__category-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onChange({
                        ...filters,
                        categories: checked
                          ? filters.categories.filter((candidate) => candidate !== category)
                          : [...filters.categories, category],
                      });
                    }}
                  />
                  {category}
                </label>
              );
            })}
          </div>
        </details>

        {/* 4 — legal for my build. */}
        <Toggle
          label="Legal for my build"
          checked={filters.legalOnly}
          onChange={(legalOnly) => {
            onChange({ ...filters, legalOnly });
          }}
        />

        {/* 5 — F8-S2: purchased only. STILL ZERO FILTER ARITHMETIC HERE —
            the predicate lives in App.tsx's badgeVisible, against the
            loadout the engine holds. */}
        <Toggle
          label="Purchased"
          checked={filters.purchasedOnly}
          onChange={(purchasedOnly) => {
            onChange({ ...filters, purchasedOnly });
          }}
        />

        <span className="filter-bar__count">
          <span className="num">{count}</span> filter{count === 1 ? "" : "s"}
          {" · "}
          <button
            type="button"
            className="filter-bar__clear"
            onClick={() => {
              onChange(defaultFilterState());
            }}
          >
            Clear all
          </button>
        </span>
      </div>
      <p className="filter-bar__results" role="status">
        {shownCount} of {totalCount} badges shown
      </p>
    </div>
  );
}
