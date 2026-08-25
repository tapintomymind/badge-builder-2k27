/**
 * Test-environment setup, wired via `test.setupFiles` in vite.config.ts and
 * run before EVERY test file.
 *
 * GUARDED TO BE INERT UNDER THE NODE ENVIRONMENT: the default environment is
 * "node" (engine tests stay fast and DOM-free); only files that opt in with a
 * `// @vitest-environment jsdom` docblock get a `document`, and only then does
 * this file register React Testing Library's cleanup. The convention for UI
 * tests (M3/M4): put them under tests/ui/** with that docblock.
 */

import { afterEach } from "vitest";

if (typeof document !== "undefined") {
  // React act() environment flag for RTL under a manual runner setup.
  (globalThis as Record<string, unknown>)["IS_REACT_ACT_ENVIRONMENT"] = true;
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });
}
