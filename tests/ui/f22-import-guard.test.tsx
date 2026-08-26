// @vitest-environment jsdom
/**
 * F2.2 F-E — the import's unsaved-work guard.
 *
 * PRE-FIX `confirmImport` replaced the working state with no guard at all,
 * and then set `dirty`, so the autosave effect overwrote the only copy on
 * the very next render — while `loadBuild` guarded the IDENTICAL transition
 * with a confirm. The fix copies `loadBuild`'s predicate VERBATIM
 * (`dirtyRef.current || (sourceId === null && workingHasContent(current))`);
 * two divergent guards on one transition is how one of them rots.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { serializeSavedBuild } from "../../src/engine/serialization";
import { writeAutosave } from "../../src/persist/local-storage";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";
import type { InstalledStorage } from "./storage-stub";

const AUTOSAVE_KEY = "badge-builder-2k27:autosave:v1";

let installed: InstalledStorage;

beforeEach(() => {
  installed = installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function importFile(contents: string) {
  const input = screen.getAllByLabelText("Import")[0] as HTMLInputElement;
  const file = new File([contents], "import.json", { type: "application/json" });
  fireEvent.change(input, { target: { files: [file] } });
}

function commitNumber(input: Element, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

const INCOMING = serializeSavedBuild(
  makeRig({ name: "Imported rig", attributes: { close: 55 } }),
);

describe("7.1 — importing over a DIRTY working build prompts, and declining changes nothing", () => {
  it("keeps the working build and the autosave untouched", { timeout: 20000 }, async () => {
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");
    const autosaveBefore = installed.store.get(AUTOSAVE_KEY) as string;

    importFile(INCOMING);
    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("Unsaved changes will be lost");
    // The working build is still the user's.
    expect((screen.getByLabelText("Close") as HTMLInputElement).value).toBe("90");
    expect(installed.store.get(AUTOSAVE_KEY)).toBe(autosaveBefore);
    // The dialog stays open — declining a guard is not a cancel.
    expect(screen.getByRole("dialog", { name: "Import build" })).toBeTruthy();
  });

  it("accepting the confirm replaces the working build", { timeout: 20000 }, async () => {
    render(<App />);
    commitNumber(screen.getByLabelText("Close"), "90");

    importFile(INCOMING);
    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Import build" })).toBeNull();
    });
    expect((screen.getByLabelText("Close") as HTMLInputElement).value).toBe("55");
    expect(JSON.parse(installed.store.get(AUTOSAVE_KEY) as string).name).toBe("Imported rig");
  });
});

describe("7.2 — a boot-restored, sourceId-less build WITH CONTENT prompts too", () => {
  it("matches loadBuild's exact predicate: no edit this session, but content and no sourceId", { timeout: 20000 }, async () => {
    // Boot from an autosave: sourceId is null (the envelope carries none),
    // dirty is false, and there is content. loadBuild guards this; so must
    // the import.
    expect(
      writeAutosave(
        makeRig({
          name: "Boot restored",
          attributes: { close: 90 },
          loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
        }),
      ).ok,
    ).toBe(true);
    render(<App />);

    importFile(INCOMING);
    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Close") as HTMLInputElement).value).toBe("90");
  });

  it("an EMPTY working build is not guarded — there is nothing to lose", { timeout: 20000 }, async () => {
    render(<App />);
    importFile(INCOMING);
    const dialog = await screen.findByRole("dialog", { name: "Import build" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace working build" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Import build" })).toBeNull();
    });
    expect((screen.getByLabelText("Close") as HTMLInputElement).value).toBe("55");
  });
});
