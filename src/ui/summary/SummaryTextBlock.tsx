/**
 * SummaryTextBlock (design-spec §14.5) — copy-as-text, and the finding that
 * shaped it.
 *
 * `navigator.clipboard` REQUIRES A SECURE CONTEXT. OQ-A4 shipped
 * `server: { host: true }` precisely so the user could open this app from
 * their phone on the LAN, beside the console — at `http://<lan-ip>:5173`,
 * which is NOT a secure context. `localhost` is; a LAN IP is not.
 *
 *   So on the single device this feature exists to serve, the clipboard API
 *   is `undefined`.
 *
 * That is not a fallback for an exotic browser. It is the PRIMARY PATH.
 * Hence: a read-only <textarea> inside a <details>, always present, always
 * populated. Select-all + long-press-copy is native on iOS and Android and
 * needs no API at all. `Copy as text` is the ENHANCEMENT — where the API
 * exists it copies and relabels; where it does not it opens the disclosure
 * and selects the text.
 *
 * NO ERROR STATE, NO TOAST, NO FAILURE BANNER. There is no failure mode: the
 * text is on screen either way. A rejected `writeText` is swallowed for the
 * same reason — surfacing it would invent a failure the user can already see
 * the answer to.
 *
 * THE STRING IS NOT BUILT HERE. `formatSummaryText()` is an engine builder
 * (src/engine/summary-text.ts) because a string encoding tier costs,
 * effective levels, refund consequences and unset-capacity semantics IS A
 * RULE, and rules do not live in components [seed: Working agreements #1].
 * This component receives the finished string. Inlining a builder here would
 * also destroy the one property §14.5 exists for: that the panel and the text
 * can be asserted EQUAL in a test rather than hoped equal.
 */

import { useRef, useState } from "react";

/** Matches --dur-base (180ms). The label reverts on its own; there is no
 *  state to clear and nothing observes the timer. */
const COPIED_LABEL_MS = 180;

export interface SummaryTextBlockProps {
  /** `formatSummaryText()`'s output. Never assembled in this file. */
  text: string;
}

export function SummaryTextBlock({ text }: SummaryTextBlockProps) {
  const [copied, setCopied] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Sized to the content, then capped by `max-height: 40vh` + scroll in CSS.
  const rows = Math.min(text.split("\n").length + 1, 24);

  const onCopy = () => {
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard !== undefined && typeof clipboard.writeText === "function") {
      // No `.then` UI: the button relabels optimistically because there is
      // nothing useful to say on rejection that the visible text does not
      // already say.
      void clipboard.writeText(text).catch(() => undefined);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, COPIED_LABEL_MS);
      return;
    }
    // The LAN path. Open the disclosure and select the contents so the user's
    // own long-press / ⌘C does the work the API cannot.
    if (detailsRef.current !== null) detailsRef.current.open = true;
    textRef.current?.focus();
    textRef.current?.select();
  };

  return (
    <div className="summary__copy">
      {/* A native <button> rather than the Button primitive: the primitive
          reserves `aria-describedby` for its disabled-reason contract, and
          this description must be announced while the control is ENABLED.
          Same classes, same appearance — the pattern ExportImportControls'
          <label className="btn …"> already uses. */}
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        aria-describedby="summary-copy-hint"
        onClick={onCopy}
      >
        {copied ? "Copied" : "Copy as text"}
      </button>
      <span id="summary-copy-hint" className="sr-only">
        Copies to the clipboard where the browser allows it; otherwise opens the text below,
        selected and ready to copy.
      </span>
      <details className="summary__copy-details" ref={detailsRef}>
        <summary>Plain text</summary>
        <textarea
          ref={textRef}
          className="summary__copy-text num"
          readOnly
          spellCheck="false"
          aria-label="Build summary as plain text"
          rows={rows}
          value={text}
        />
      </details>
    </div>
  );
}
