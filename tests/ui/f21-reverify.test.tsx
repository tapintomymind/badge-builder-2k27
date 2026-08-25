// @vitest-environment jsdom
/**
 * F2.1 reverify follow-ups — pinning tests for the fix-wave code-lane's three
 * verified findings.
 *
 * 1 (HIGH) — a PRE-F2 autosave holding a STRANDED synergy reference (badge
 *     purchased → fused → removed; the pre-F2 remove path never cleared the
 *     role) must NEVER be destroyed by the upgrade. PRE-FIX: the F1
 *     deserializer classified it MalformedSavedBuildError, readAutosave
 *     swallowed the throw into null, the app booted FRESH, and the mount
 *     autosave overwrote the user's plan — silent, total, unrecoverable loss.
 *     The re-ruling heals it: role cleared into clearedSynergyRefs, plan
 *     intact, heal DISCLOSED on the drift/strip surface.
 * 2 (MEDIUM) — the strip/heal disclosure must fire on the named-build LOAD
 *     route too (PRE-FIX: boot + import only — a load-route strip was
 *     silent), and a load must CLEAR stale disclosure from a prior route
 *     (PRE-FIX: a boot-time banner kept describing a build it no longer
 *     described).
 * 3 (LOW) — driftFromDroppedEntries + droppedFromDataset are wired as the
 *     real path: Re-check eligibility includes deserializer-dropped entries,
 *     rendered with the STRONGER "removed from the dataset" wording (PRE-FIX
 *     both exports had zero production consumers and a post-strip re-check
 *     claimed "Every purchased badge still qualifies…").
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { shippedDataset } from "../../src/engine/dataset";
import {
  readAutosaveWithReport,
  saveNamedBuild,
  writeAutosave,
} from "../../src/persist/local-storage";
import { DriftBanner } from "../../src/ui/shell/DriftBanner";
import { makeRig } from "./m4-rig";
import { installMemoryLocalStorage } from "./storage-stub";

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The pre-F2 app state, byte-for-byte: Float Game purchased (Gold), Aerial
 * Wizard was purchased, fused on Synergy Slot 5, then REMOVED — pre-F2
 * removal never cleared the role, so the autosave holds a stranded fuse
 * reference to a badge that exists in the dataset but not in the loadout. */
function seedPreF2StrandedAutosave(): void {
  const rig = makeRig({
    attributes: { close: 90 },
    budgets: { Finishing: { points: 16, equipSlots: 3 } },
    loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
    synergyPatches: { 5: { unlocked: true, fuseBadgeId: "aerial-wizard" } },
  });
  expect(writeAutosave(rig).ok).toBe(true);
}

function switcher(): HTMLSelectElement {
  return screen.getByLabelText("Saved builds") as HTMLSelectElement;
}

describe("1 (HIGH) — a pre-F2 autosave with a stranded synergy ref boots clean, healed, disclosed", () => {
  it("boots the plan intact: nothing destroyed, role cleared, heal disclosed", () => {
    seedPreF2StrandedAutosave();
    // PRE-FIX: readAutosaveWithReport returned null (MalformedSavedBuildError
    // swallowed), the app booted fresh, and the mount autosave immediately
    // OVERWROTE the stored plan — bypassing the "NEVER auto-clears" doctrine
    // through the overwrite side channel.
    render(<App />);
    // The user's purchase survives.
    expect(screen.getByText("Now Gold")).toBeTruthy();
    // The stranded role was cleared — no engine-forbidden state, no
    // invalid-state banner, no fuse chip on the unpurchased card.
    expect(screen.queryByText(/Invalid loadout state/)).toBeNull();
    expect(screen.queryByText(/⚡ Fuse · SS5/)).toBeNull();
    // The heal is DISCLOSED on the drift/strip surface, never silent.
    expect(
      screen.getByText(
        "1 synergy assignment referenced a badge not in this build's loadout: " +
          "Synergy Slot 5 Fuse → Aerial Wizard — cleared.",
      ),
    ).toBeTruthy();
    // The autosave on disk still carries the full plan (post-heal write).
    const report = readAutosaveWithReport();
    expect(report).not.toBeNull();
    expect(report!.saved.loadout).toEqual([{ badgeId: "float-game", purchasedLevel: "gold" }]);
  });
});

describe("2 (MEDIUM) — named-build LOAD route: disclosure fires, stale disclosure clears", () => {
  it("loading a named build with a vanished badge id discloses the strip (pre-fix: silent)", () => {
    const rig = makeRig({
      name: "Drifty",
      attributes: { close: 90 },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "vanished-badge", purchasedLevel: "hof" },
      ],
    });
    expect(saveNamedBuild("b-test-drifty", rig).ok).toBe(true);
    render(<App />); // fresh working state → the switcher guard stays quiet
    expect(screen.queryByText(/no longer exist/)).toBeNull();

    fireEvent.change(switcher(), { target: { value: "b-test-drifty" } });
    expect(
      screen.getByText(
        "1 badge from this build no longer exists in the dataset: vanished-badge — removed from the plan.",
      ),
    ).toBeTruthy();
    // The surviving purchase is live.
    expect(screen.getByText("Now Gold")).toBeTruthy();
  });

  it("loading a stranded-ref named build discloses the heal on the load route too", () => {
    const rig = makeRig({
      name: "Stranded",
      attributes: { close: 90 },
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
      synergyPatches: { 5: { unlocked: true, fuseBadgeId: "aerial-wizard" } },
    });
    expect(saveNamedBuild("b-test-stranded", rig).ok).toBe(true);
    render(<App />);
    fireEvent.change(switcher(), { target: { value: "b-test-stranded" } });
    expect(
      screen.getByText(
        "1 synergy assignment referenced a badge not in this build's loadout: " +
          "Synergy Slot 5 Fuse → Aerial Wizard — cleared.",
      ),
    ).toBeTruthy();
  });

  it("loading a CLEAN named build clears a stale boot-time disclosure (pre-fix: the banner lied on)", () => {
    // Boot from a drifted autosave → the strip banner is up…
    const drifted = makeRig({
      attributes: { close: 90 },
      loadout: [
        { badgeId: "float-game", purchasedLevel: "gold" },
        { badgeId: "vanished-badge", purchasedLevel: "hof" },
      ],
    });
    expect(writeAutosave(drifted).ok).toBe(true);
    const clean = makeRig({
      name: "Clean",
      attributes: { close: 90 },
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
    });
    expect(saveNamedBuild("b-test-clean", clean).ok).toBe(true);

    render(<App />);
    expect(screen.getByText(/no longer exists in the dataset/)).toBeTruthy();

    // …then the user loads a clean saved build (boot-restored autosave has
    // content → guarded; accept the replace).
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.change(switcher(), { target: { value: "b-test-clean" } });

    // PRE-FIX: droppedEntries state was never reset on the load route, so
    // the banner kept asserting drops about a build it did not describe.
    expect(screen.queryByText(/no longer exists in the dataset/)).toBeNull();
  });
});

describe("3 (LOW) — Re-check eligibility includes deserializer-dropped entries as 'removed from the dataset'", () => {
  it("a dropped entry renders in the re-check list with the stronger wording", () => {
    const saved = makeRig({
      name: "Old plan",
      dataVersion: "2020-01-01.1",
      attributes: { close: 90 },
      loadout: [{ badgeId: "float-game", purchasedLevel: "gold" }],
    });
    render(
      <DriftBanner
        saved={saved}
        currentDataset={shippedDataset}
        droppedEntries={[{ badgeId: "vanished-badge", purchasedLevel: "hof" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-check eligibility" }));
    // PRE-FIX: recheckEligibility saw only the already-stripped loadout, so
    // the list claimed "Every purchased badge still qualifies…" directly
    // under a line saying a badge had been removed — and rendered the
    // dropped id nowhere. driftFromDroppedEntries + droppedFromDataset now
    // carry it with the wording the eligibility doc always promised.
    expect(screen.getByText(/vanished-badge \(planned HOF, removed from the dataset\)/)).toBeTruthy();
    expect(screen.queryByText(/Every purchased badge still qualifies/)).toBeNull();
    expect(screen.getByText(/1 badge no longer qualif/)).toBeTruthy();
  });

  it("a re-checked drift entry for a badge still IN the dataset keeps the recomputed wording", () => {
    const saved = makeRig({
      name: "Old plan",
      dataVersion: "2020-01-01.1",
      attributes: { close: 90 },
      // Close 90 caps Float Game at Gold — HOF no longer qualifies.
      loadout: [{ badgeId: "float-game", purchasedLevel: "hof" }],
    });
    render(<DriftBanner saved={saved} currentDataset={shippedDataset} droppedEntries={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Re-check eligibility" }));
    expect(screen.getByText(/Float Game \(planned HOF, now Gold\)/)).toBeTruthy();
  });
});
