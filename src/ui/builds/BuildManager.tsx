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
  onSelect: (id: string) => void;
  onOpenManager: () => void;
}

export function BuildSwitcher({
  builds,
  currentName,
  currentSourceId,
  onSelect,
  onOpenManager,
}: BuildSwitcherProps) {
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
        <option value="">{currentSourceId === null ? `${currentName} (unsaved)` : currentName}</option>
        {builds
          .filter((build) => build.id !== currentSourceId)
          .map((build) => (
            <option key={build.id} value={build.id}>
              {build.name}
            </option>
          ))}
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
      <ul className="build-manager__list">
        {builds.length === 0 ? (
          <li>
            <span className="hint">No saved builds yet — save the working build below.</span>
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
