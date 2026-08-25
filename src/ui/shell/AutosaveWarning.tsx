/**
 * AutosaveWarning (design-spec §3.2, tech-strategy §9 finding #2) — the ONLY
 * role="alert" in the app. Shown when a localStorage write throws
 * (QuotaExceededError, Safari private browsing); a failed autosave must
 * never be silent. Dismissible for the session; re-appears only via a new
 * failure after the condition is next evaluated.
 */

import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";

export interface AutosaveWarningProps {
  /** Inline escape hatch (§3.2): a file download of the current build —
   * no network, no storage involved. */
  onExport: () => void;
  onDismiss: () => void;
}

export function AutosaveWarning({ onExport, onDismiss }: AutosaveWarningProps) {
  return (
    <Banner
      variant="danger"
      role="alert"
      onDismiss={onDismiss}
      actions={
        <Button variant="secondary" size="sm" onClick={onExport}>
          Export now
        </Button>
      }
    >
      Couldn&apos;t autosave — export your build to JSON.
    </Banner>
  );
}
