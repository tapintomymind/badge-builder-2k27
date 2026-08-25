/**
 * AttributeSlider (design-spec §3.1, F3) — 2K-builder-style stat slider for
 * the 20 attributes: a native <input type="range"> PLUS a mandatory,
 * always-visible paired numeric field. A slider alone is hostile to precise
 * entry, and this app's whole job is precision — the two controls are two
 * views of one value; either may write it. NO slider package: runtime
 * dependencies stay exactly {react, react-dom} (tech-strategy §5 tripwire).
 *
 * Two commit tiers, and the split is native (§3.1):
 *  - PREVIEW — `input` (every drag tick): thumb, fill, the numeric echo.
 *    Component-local ONLY. Never writes build state, so eligibility never
 *    recomputes per drag frame and nothing preview-tier can be persisted.
 *  - COMMIT — native `change` (pointer release / keyboard step): calls
 *    onCommit. Held-key auto-repeat coalesces with a trailing 120ms
 *    (--dur-fast) debounce so holding an arrow produces ONE recompute;
 *    pointer release always commits immediately (no debounce on the gesture
 *    the user just finished). Blur flushes any pending commit synchronously
 *    (the App's tail-edit flush relies on this, like every other field).
 *
 * Keyboard: plain arrows step 1 and Home/End/PageUp/PageDown are native —
 * nothing hand-rolled. Shift+Arrow steps 10 (the one addition, matching
 * NumberField's rule — one mental model for both).
 *
 * A11y: ONE visible label names the range; the numeric input carries
 * aria-label "{Attr}, exact value" so the pair is navigable in a screen
 * reader. aria-valuetext is the plain number. The §5.3 auto-collapse latch
 * must NOT fire on release — release is a commit, not a blur; focus stays on
 * the thumb (BuildPanel implements that guard).
 */

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { NumberField } from "./NumberField";

const ATTR_MIN = 0;
const ATTR_MAX = 99;
/** --dur-fast: the held-key commit-coalescing debounce (§3.1). */
const COMMIT_DEBOUNCE_MS = 120;

export interface AttributeSliderProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}

function clamp(value: number): number {
  return Math.min(ATTR_MAX, Math.max(ATTR_MIN, value));
}

export function AttributeSlider({ label, value, onCommit }: AttributeSliderProps) {
  const rangeId = useId();
  /** PREVIEW tier: the uncommitted drag value. null = showing `value`. */
  const [preview, setPreview] = useState<number | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  /** Last input modality — a native `change` coming from a pointer gesture
   * commits immediately; one from a key press coalesces (held-key rule). */
  const modalityRef = useRef<"pointer" | "key">("pointer");
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommitRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const shown = preview ?? value;
  const isPending = preview !== null && preview !== value;

  /** After a commit round-trips (value catches up), drop the preview so a
   * later EXTERNAL value change (build load) is never masked by stale state. */
  useEffect(() => {
    if (preview !== null && preview === value) setPreview(null);
  }, [preview, value]);

  useEffect(() => {
    const element = rangeRef.current;
    if (element === null) return;

    const commitNow = (next: number) => {
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      pendingCommitRef.current = null;
      onCommitRef.current(next);
    };

    const handleNativeChange = () => {
      const next = clamp(Number.parseInt(element.value, 10) || 0);
      if (modalityRef.current === "pointer") {
        commitNow(next);
        return;
      }
      // Keyboard: trailing debounce — holding an arrow is ONE recompute.
      pendingCommitRef.current = next;
      if (commitTimerRef.current !== null) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        if (pendingCommitRef.current !== null) commitNow(pendingCommitRef.current);
      }, COMMIT_DEBOUNCE_MS);
    };

    element.addEventListener("change", handleNativeChange);
    return () => {
      element.removeEventListener("change", handleNativeChange);
      // Unmount mid-debounce: flush rather than lose a committed-intent step.
      if (commitTimerRef.current !== null) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      if (pendingCommitRef.current !== null) {
        const pending = pendingCommitRef.current;
        pendingCommitRef.current = null;
        onCommitRef.current(pending);
      }
    };
  }, []);

  function flushPending() {
    const pending = pendingCommitRef.current ?? preview;
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    pendingCommitRef.current = null;
    if (pending !== null && pending !== value) onCommitRef.current(pending);
  }

  /** The fill percentage drives the track gradient (design-spec §3.1). */
  const fillStyle = {
    "--val": String((shown / ATTR_MAX) * 100),
  } as CSSProperties;

  return (
    <div className="attr-slider">
      <label className="attr-slider__label" htmlFor={rangeId}>
        {label}
      </label>
      <div className="attr-slider__row">
        <input
          ref={rangeRef}
          id={rangeId}
          type="range"
          min={ATTR_MIN}
          max={ATTR_MAX}
          step={1}
          value={shown}
          aria-valuetext={String(shown)}
          style={fillStyle}
          onChange={(event) => {
            // PREVIEW tier — React's onChange fires per `input` event.
            setPreview(clamp(Number.parseInt(event.currentTarget.value, 10) || 0));
          }}
          onPointerDown={() => {
            modalityRef.current = "pointer";
          }}
          onKeyDown={(event) => {
            modalityRef.current = "key";
            if (!event.shiftKey) return;
            const direction =
              event.key === "ArrowUp" || event.key === "ArrowRight"
                ? 10
                : event.key === "ArrowDown" || event.key === "ArrowLeft"
                  ? -10
                  : null;
            if (direction === null) return;
            event.preventDefault();
            const next = clamp((preview ?? value) + direction);
            setPreview(next);
            // Same commit path as a native keyboard step: coalesced.
            pendingCommitRef.current = next;
            if (commitTimerRef.current !== null) clearTimeout(commitTimerRef.current);
            commitTimerRef.current = setTimeout(() => {
              commitTimerRef.current = null;
              const pending = pendingCommitRef.current;
              pendingCommitRef.current = null;
              if (pending !== null) onCommitRef.current(pending);
            }, COMMIT_DEBOUNCE_MS);
          }}
          onBlur={() => {
            // A blur is a commit boundary (tail-edit flush blurs the active
            // element expecting exactly this).
            flushPending();
          }}
        />
        <span className={isPending ? "attr-slider__num attr-slider__num--pending" : "attr-slider__num"}>
          <NumberField
            label={`${label}, exact value`}
            hideLabel
            value={shown}
            min={ATTR_MIN}
            max={ATTR_MAX}
            onCommit={(next) => {
              if (commitTimerRef.current !== null) {
                clearTimeout(commitTimerRef.current);
                commitTimerRef.current = null;
              }
              pendingCommitRef.current = null;
              setPreview(null);
              onCommit(next);
            }}
          />
        </span>
      </div>
    </div>
  );
}
