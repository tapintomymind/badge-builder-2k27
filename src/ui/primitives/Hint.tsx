/**
 * Hint (design-spec §3.1) — inline muted text under a control, wired via
 * aria-describedby. This project has NO hover tooltip component: tooltips
 * are unreachable on touch and mobile is a hard requirement. Everything a
 * tooltip would say is rendered inline.
 */

import type { ReactNode } from "react";

export interface HintProps {
  children: ReactNode;
  id?: string;
}

export function Hint({ children, id }: HintProps) {
  return (
    <p className="hint" id={id}>
      {children}
    </p>
  );
}
