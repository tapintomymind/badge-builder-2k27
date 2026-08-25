import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import {
  clearAllPersistedData,
  clearAutosave,
  exportRawPersistedData,
  persistedDataBlastRadius,
} from "./persist/local-storage";
import "./styles/tokens.css";
import "./styles/app.css";

/**
 * Render-failure backstop (engine-robustness F1): if anything below throws
 * during render, show a minimal recovery screen instead of a white screen.
 *
 * The boundary NEVER clears storage itself — both actions are explicit user
 * clicks, and "Export raw saved data" exists precisely so clearing is never
 * the only way out. Storage access goes through src/persist/ (the single
 * localStorage owner; the persistence-boundary lint pins that).
 */
interface RecoveryBoundaryState {
  error: Error | null;
}

export class RecoveryBoundary extends Component<{ children: ReactNode }, RecoveryBoundaryState> {
  override state: RecoveryBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RecoveryBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Diagnostics only — no telemetry, no network (architecture tripwire c).
    console.error("Badge Builder render failed:", error, info.componentStack);
  }

  private exportRawData = (): void => {
    if (typeof URL.createObjectURL !== "function") return; // jsdom guard
    const blob = new Blob([exportRawPersistedData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "badge-builder-2k27-raw-saved-data.json";
    anchor.click();
    // F2.2 F-G: a SYNCHRONOUS revoke races the browser's read of the object
    // URL, and a lost race yields an empty download with no error surface —
    // on THIS screen that export is the user's only copy, and it sits right
    // next to the button that clears everything. 60s of a leaked URL is the
    // cheaper side of that trade by a wide margin.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  };

  private reload = (): void => {
    try {
      window.location.reload();
    } catch {
      // jsdom: navigation is unimplemented; the cleared storage is the point.
    }
  };

  /** F2.2 F-B: the surgical action. `clearAutosave()` already existed and had
   * ZERO callers, so the only exit from an unreadable autosave was the
   * nuclear one — which also destroys every named build. This is the action
   * a user on this screen almost always wants. */
  private clearJustAutosave = (): void => {
    clearAutosave();
    this.reload();
  };

  /** F2.2 F-B: the nuclear action now STATES its blast radius and ASKS.
   * Pre-fix the copy said "clear it" while the function removed the
   * autosave, every named build and the UI prefs on ONE unconfirmed click —
   * while deleting a SINGLE build required an in-row confirm. The asymmetry
   * was backwards. Same window.confirm idiom the switcher guard uses; no
   * dialog component. */
  private clearSavedData = (): void => {
    const radius = persistedDataBlastRadius();
    const parts = [radius.hasAutosave ? "the autosave" : null];
    parts.push(
      `${radius.namedBuildCount} named build${radius.namedBuildCount === 1 ? "" : "s"}`,
    );
    if (radius.hasQuarantine) parts.push("the preserved unreadable autosave");
    const proceed = window.confirm(
      `Delete ALL saved data? This removes ${parts.filter((part) => part !== null).join(", ")}. ` +
        "This cannot be undone.",
    );
    if (!proceed) return;
    clearAllPersistedData();
    this.reload();
  };

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <main
        role="alert"
        style={{
          maxWidth: "36rem",
          margin: "10vh auto",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
          Badge Builder hit a rendering error
        </h1>
        <p>
          Something in the saved state could not be rendered. Your saved data has NOT been
          modified or deleted.
        </p>
        <p style={{ opacity: 0.8, fontSize: "0.875rem" }}>
          {this.state.error.name}: {this.state.error.message}
        </p>
        <p>
          You can export the raw saved data exactly as stored (for backup or a bug report),
          and separately choose to clear it and start fresh. Nothing is cleared unless you
          click a clear action yourself — exporting first is recommended, but it is not
          required: a user whose export is broken must still be able to get out.
        </p>
        {/* Export FIRST, in the DOM and in the copy. Then the surgical clear,
          * then the nuclear one — narrowest blast radius first. */}
        <div
          style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}
        >
          <button type="button" onClick={this.exportRawData}>
            Export raw saved data
          </button>
          <button type="button" onClick={this.clearJustAutosave}>
            Clear just the unreadable autosave
          </button>
          <button type="button" onClick={this.clearSavedData}>
            Clear ALL saved data — the autosave, every named build, and layout preferences
          </button>
        </div>
      </main>
    );
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <RecoveryBoundary>
      <App />
    </RecoveryBoundary>
  </StrictMode>,
);
