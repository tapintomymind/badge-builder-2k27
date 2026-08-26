/**
 * QuarantineBanner (F2.2 slice B) — the disclosure for an autosave the
 * deserializer refused at boot.
 *
 * PRE-FIX that autosave was swallowed to `null`, the app booted fresh, and
 * the mount-time autosave write overwrote the unreadable-but-recoverable
 * bytes before anything could offer them back. The bytes are now quarantined
 * verbatim; this banner is how the user learns that and gets them out.
 *
 * It describes a STANDING CONDITION, not an event, so it is not dismissible
 * while the quarantine exists — dismissing it would hide the only pointer to
 * the preserved data.
 *
 * `Export raw saved data` sits FIRST, deliberately, mirroring the recovery
 * screen in src/main.tsx whose own comment says the export "exists precisely
 * so clearing is never the only way out". `Discard` is the only path in this
 * slice that deletes anything, and it takes an explicit click.
 *
 * Composes the shipped Banner + Button primitives. ZERO new CSS.
 */

import { Banner } from "../primitives/Banner";
import { Button } from "../primitives/Button";

export interface QuarantineBannerProps {
  /** F1's raw-export surface, which now includes the quarantine key. */
  onExportRaw: () => void;
  /** Removes the quarantined bytes, hides this banner, and re-arms autosave. */
  onDiscard: () => void;
}

export function QuarantineBanner({ onExportRaw, onDiscard }: QuarantineBannerProps) {
  return (
    <Banner
      variant="warning"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onExportRaw}>
            Export raw saved data
          </Button>
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
        </>
      }
    >
      A saved build couldn&apos;t be read — it&apos;s been preserved, not deleted.
    </Banner>
  );
}
