/**
 * BuildSwitcher + BuildManagerDialog (design-spec §3.6).
 *
 * Named builds: load / rename / duplicate / delete / save-as-new. `Duplicate`
 * IS the seed's variations mechanism — there is no compare view and none is
 * wanted. Native <dialog> gives the focus trap, Escape, and focus restore;
 * the build manager requires an explicit Close (no backdrop dismiss).
 * `Delete` confirms in-row (the button relabels), never a nested dialog.
 * Each row shows savedAt and the build's stamped dataVersion, with a warning
 * dot when it differs from the current dataset (H8).
 */

import { useEffect, useRef, useState } from "react";
import type { NamedBuildSummary } from "../../persist/local-storage";
import { Button } from "../primitives/Button";

export interface BuildSwitcherProps {
  builds: NamedBuildSummary[];
  /** The working build's name (shown when it is not a saved build). */
  currentName: string;
  /** The named build the working state came from, if any. */
  currentSourceId: string | null;
  /** Has the working state been edited since it was loaded/saved? Drives the
   * ghost-pair disambiguation: "… — unsaved changes" vs "… — saved". */
  currentDirty?: boolean;
  /** F2.2 disclosure: saved builds that are still stored but could not be
   * read. They are skipped, never deleted — but skipping them SILENTLY made
   * them vanish from this switcher with no error and no banner. */
  unreadableCount?: number;
  onSelect: (id: string) => void;
  onOpenManager: () => void;
}

/** The shared copy for the unreadable-entry disclosure — one string, so the
 * switcher and the manager dialog can never drift apart. */
export function unreadableBuildsLine(count: number): string {
  return (
    `${count} saved build${count === 1 ? "" : "s"} couldn't be read — ` +
    `preserved, not deleted.`
  );
}

/**
 * THE STORAGE-SCOPE DISCLOSURE. One string, rendered in two places (this
 * dialog and the Summary section), for exactly the reason
 * `unreadableBuildsLine` above is one string: two surfaces stating the same
 * fact in two wordings is how the fact quietly stops being true in one of
 * them.
 *
 * WHY IT EXISTS. Nothing in the running app said either of these out loud.
 * They were in README.md — which the person who loses their build has, by
 * construction, not read. Both are consequences of the architecture, not
 * defects in it: there is no account and no sync BY DESIGN, so the only
 * honest move is to say so where the work is, before it is needed rather
 * than after.
 *
 * IT IS NOT A BANNER AND MUST NOT BECOME ONE. Both render sites cost ZERO
 * always-visible height — `.build-manager` is a modal, and the Summary site
 * is inside `.col-right`, which is the shell's scrollport at the L gate and
 * the document scroller below it. A permanent band would have forced F14's
 * height gate UP and undone the work that made the shell activate on an
 * ordinary laptop. See the note above <RollPanel> in App.tsx, which rules the
 * same way for the same reason.
 *
 * EVERY CLAUSE IS A PROPERTY THE APP ACTUALLY HAS — no aspirational copy:
 *  - `src/persist/local-storage.ts` is the sole localStorage owner, and
 *    localStorage is scoped to origin AND to the browser profile. So a second
 *    browser, a second device and a private window each genuinely hold their
 *    own separate set, and a browsing-data clear genuinely destroys this one.
 *  - `exportNow` (App.tsx) serialises the WORKING build. ONE build, not the
 *    whole store — which is why this says so rather than implying a backup.
 */
export const STORAGE_SCOPE_LINE =
  "Saved builds live in this browser only — another browser, another device, " +
  "or a private window each keep their own, and clearing your browsing data " +
  "deletes them. Export saves the build you're working on to a file you keep.";

export function BuildSwitcher({
  builds,
  currentName,
  currentSourceId,
  currentDirty = false,
  unreadableCount = 0,
  onSelect,
  onOpenManager,
}: BuildSwitcherProps) {
  // The reload ghost pair (design-review P1-6): a boot-restored autosave has
  // no sourceId, so a same-named saved build sits right next to it. The two
  // labels must not be near-identical — the working entry says what it is
  // ("unsaved changes"), the stored entries say what they are ("saved").
  const workingLabel =
    currentSourceId === null || currentDirty ? `${currentName} — unsaved changes` : currentName;
  return (
    <div className="build-switcher">
      <label className="sr-only" htmlFor="build-switcher-select">
        Saved builds
      </label>
      <select
        id="build-switcher-select"
        className="build-switcher__select"
        value={currentSourceId ?? ""}
        onChange={(event) => {
          if (event.currentTarget.value !== "") onSelect(event.currentTarget.value);
        }}
      >
        <option value="">{workingLabel}</option>
        {builds
          .filter((build) => build.id !== currentSourceId)
          .map((build) => (
            <option key={build.id} value={build.id}>
              {build.name} — saved
            </option>
          ))}
        {unreadableCount > 0 ? (
          // Disabled: it is a disclosure, not a destination. Rendered inside
          // the existing <select> so it needs no layout of its own.
          <option value="" disabled>
            {unreadableBuildsLine(unreadableCount)}
          </option>
        ) : null}
      </select>
      <Button variant="secondary" size="sm" onClick={onOpenManager}>
        Manage
      </Button>
    </div>
  );
}

export interface BuildManagerDialogProps {
  open: boolean;
  builds: NamedBuildSummary[];
  currentDataVersion: string;
  onClose: () => void;
  onLoad: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveAsNew: (name: string) => void;
  /** F2.2 disclosure — see BuildSwitcherProps.unreadableCount. */
  unreadableCount?: number;
}

export function BuildManagerDialog({
  open,
  builds,
  currentDataVersion,
  onClose,
  onLoad,
  onRename,
  onDuplicate,
  onDelete,
  onSaveAsNew,
  unreadableCount = 0,
}: BuildManagerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      // showModal gives the focus trap; jsdom builds without it fall back to
      // the open attribute so component tests can still assert visibility.
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="build-manager"
      aria-label="Manage builds"
      onClose={onClose}
    >
      <div className="build-manager__header">
        <h2>Builds</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {/* ABOVE the list, deliberately. This is the surface where a user
        * decides what to keep, and the two facts that decide it — where the
        * builds live, and what deletes them — have to arrive before the row
        * of Delete buttons, not after. */}
      <p className="hint build-manager__note">{STORAGE_SCOPE_LINE}</p>
      <ul className="build-manager__list">
        {builds.length === 0 && unreadableCount === 0 ? (
          <li>
            <span className="hint">No saved builds yet — save the working build below.</span>
          </li>
        ) : null}
        {unreadableCount > 0 ? (
          <li>
            <span className="hint">{unreadableBuildsLine(unreadableCount)}</span>
          </li>
        ) : null}
        {builds.map((build) => (
          <li key={build.id}>
            <div className="build-manager__row-main">
              {renamingId === build.id ? (
                <span style={{ display: "flex", gap: "var(--space-2)" }}>
                  <label className="sr-only" htmlFor={`rename-${build.id}`}>
                    New name
                  </label>
                  <input
                    id={`rename-${build.id}`}
                    className="build-manager__name-input"
                    value={renameDraft}
                    onChange={(event) => {
                      setRenameDraft(event.currentTarget.value);
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (renameDraft.trim() !== "") onRename(build.id, renameDraft.trim());
                      setRenamingId(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenamingId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </span>
              ) : (
                <span className="build-manager__row-name">{build.name}</span>
              )}
              <span className="build-manager__row-meta num">
                {build.savedAt} · dataset {build.dataVersion}
                {build.dataVersion !== currentDataVersion ? (
                  <span
                    className="drift-dot"
                    role="img"
                    aria-label={`Planned against dataset ${build.dataVersion}; current is ${currentDataVersion}`}
                  />
                ) : null}
              </span>
            </div>
            <div className="build-manager__row-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onLoad(build.id);
                }}
              >
                Load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRenamingId(build.id);
                  setRenameDraft(build.name);
                }}
              >
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDuplicate(build.id);
                }}
              >
                Duplicate
              </Button>
              {confirmDeleteId === build.id ? (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(build.id);
                    setConfirmDeleteId(null);
                  }}
                >
                  Confirm delete
                </Button>
              ) : (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmDeleteId(build.id);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="build-manager__footer">
        <label className="sr-only" htmlFor="save-as-new-name">
          Name for the new build
        </label>
        <input
          id="save-as-new-name"
          className="build-manager__name-input"
          placeholder="Name this build"
          value={newName}
          onChange={(event) => {
            setNewName(event.currentTarget.value);
          }}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (newName.trim() !== "") {
              onSaveAsNew(newName.trim());
              setNewName("");
            }
          }}
        >
          Save as new
        </Button>
      </div>
    </dialog>
  );
}
