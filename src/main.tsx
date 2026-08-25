import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { clearAllPersistedData, exportRawPersistedData } from "./persist/local-storage";
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
    URL.revokeObjectURL(url);
  };

  private clearSavedData = (): void => {
    clearAllPersistedData();
    try {
      window.location.reload();
    } catch {
      // jsdom: navigation is unimplemented; the cleared storage is the point.
    }
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
          click the clear action yourself.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button type="button" onClick={this.exportRawData}>
            Export raw saved data
          </button>
          <button type="button" onClick={this.clearSavedData}>
            Clear saved data
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
