/**
 * Section (design-spec §3.1) — native <details>/<summary> accordion.
 * Open/closed state persists to localStorage under a UI-state key SEPARATE
 * from the build envelope (via src/persist/ — this component never touches
 * window.localStorage itself), so a layout preference can never corrupt a
 * saved build. Default-open at zero state, on every breakpoint.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { readUiSectionOpen, writeUiSectionOpen } from "../../persist/local-storage";

export interface SectionProps {
  title: ReactNode;
  children: ReactNode;
  /** Persistence key for the open/closed preference. Omit for ephemeral. */
  storageKey?: string;
  defaultOpen?: boolean;
  /** Live digest rendered in the summary (mobile Build panel, §5.3). */
  digest?: ReactNode;
  headingLevel?: "h2" | "h3";
}

export function Section({
  title,
  children,
  storageKey,
  defaultOpen = true,
  digest,
  headingLevel: Heading = "h2",
}: SectionProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (storageKey !== undefined) {
      const stored = readUiSectionOpen(storageKey);
      if (stored !== null) return stored;
    }
    return defaultOpen;
  });

  return (
    <details
      className="section"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        setOpen(next);
        if (storageKey !== undefined) writeUiSectionOpen(storageKey, next);
      }}
    >
      <summary>
        <Heading style={{ fontSize: "inherit" }}>{title}</Heading>
        {digest !== undefined ? <span className="section__digest">{digest}</span> : null}
      </summary>
      <div className="section__body">{children}</div>
    </details>
  );
}
