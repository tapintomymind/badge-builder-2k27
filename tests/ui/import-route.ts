/**
 * The import route's ONE deterministic driver.
 *
 * THE PROBLEM IT REPLACES. App.tsx's `importFile` does `file.text().then(…)`,
 * so the confirm dialog mounts one promise-resolution after the change event.
 * Three test files waited for it with `await screen.findByRole("dialog", …)`,
 * and that wait is WALL-CLOCK: RTL's `waitFor` re-checks on a 50 ms
 * `setInterval` against a 1000 ms budget, and each check is a full `getByRole`
 * scan (role + accessible name) over this app's ~2,800-element tree — 9-21 ms
 * a scan when the box is idle. A contended box does not stop the clock, so the
 * budget expires between the polls that would have passed. Measured failing
 * under 32 concurrent CPU spinners, and observed failing on an otherwise idle
 * machine during an ordinary parallel `vitest run` (72 files across 10 cores
 * is its own contention).
 *
 * A BIGGER TIMEOUT IS NOT THE FIX. It is still a wall clock; it only moves the
 * load at which the same failure comes back, and it hides the fragility in the
 * meantime. This helper removes the clock instead — there is no timeout in the
 * path below, and no polling.
 *
 * HOW IT IS DETERMINISTIC. The File's `text()` is pinned to an ALREADY-RESOLVED
 * promise created before the change event, so the resolution order is a fact
 * about the Promise job queue rather than about jsdom's Blob internals. The app
 * registers its `.then` inside the change handler, i.e. BEFORE the `await` here
 * registers its own reaction on the same promise; promise reaction jobs run in
 * FIFO order, so by the time this `await` resumes, `setImportState` has already
 * been called. It is called inside the `act()` scope, so React's work lands in
 * the act queue, and `act` drains that queue before resolving. The whole
 * sequence is a bounded chain of microtasks and act flushes: it takes LONGER
 * under load, it does not FAIL under load.
 *
 * The returned dialog is the assertion that the route actually ran — if the app
 * never read the file, `getByRole` throws here rather than in the caller.
 */

import { act, fireEvent, screen } from "@testing-library/react";

/**
 * Drives a JSON build through the file input in ExportImportControls and
 * returns the mounted confirm dialog. Awaiting it is a full settle: on return,
 * the dialog is committed and the caller may query it synchronously.
 */
export async function importBuildFile(
  contents: string,
  fileName = "import.json",
): Promise<HTMLElement> {
  // Created BEFORE the event: `text()` hands back a promise that is already
  // fulfilled, so the app's `.then` reaction is queued the moment it registers.
  const read = Promise.resolve(contents);
  const file = new File([contents], fileName, { type: "application/json" });
  Object.defineProperty(file, "text", { configurable: true, value: () => read });

  // The sr-only <input type="file"> inside the label reading "Import".
  const input = screen.getAllByLabelText("Import")[0] as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });

  await act(async () => {
    await read;
  });

  return screen.getByRole("dialog", { name: "Import build" });
}
