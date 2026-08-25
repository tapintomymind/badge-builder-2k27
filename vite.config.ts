import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Single source of truth for both the dev/build config and the test config.
// `defineConfig` is imported from `vitest/config` so the `test` block is typed
// without a second config file that would shadow this one.
export default defineConfig({
  plugins: [react()],

  server: {
    // Pinned deliberately. localStorage is keyed to origin INCLUDING port, so a
    // silent roll to 5174 would orphan every saved build and read as data loss.
    // strictPort makes a collision fail loudly instead.
    port: 5173,
    strictPort: true,
    host: true,
  },

  test: {
    // Default node environment. UI work adds a DOM environment when it needs one
    // via a per-file `// @vitest-environment jsdom` docblock (tests/ui/** convention).
    environment: "node",
    // Without this, vitest stubs EVERY *.css import (including `?raw`) to an
    // empty string — which silently un-pins the stylesheet lints in
    // tests/ui/f2-source-pins.test.ts (a lint asserting against '' passes
    // no matter what the stylesheet says). Scoped to src/styles/ so only the
    // app's own stylesheets flow through Vite's pipeline. No runtime surface.
    css: { include: [/\/src\/styles\//] },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    // Guarded DOM setup — inert under the node environment (see tests/setup-dom.ts).
    setupFiles: ["tests/setup-dom.ts"],
  },
});
