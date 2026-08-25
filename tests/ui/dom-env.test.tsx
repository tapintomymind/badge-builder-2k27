// @vitest-environment jsdom
/**
 * DOM-environment probe (M1 test-environment groundwork).
 *
 * M3 and M4 deny package.json and *.config.*, so M1 is the only slice that
 * can wire jsdom + RTL — and this throwaway test PROVES the path works now:
 * it must go green in the SAME `npm test` run as the node-env engine tests.
 * The convention it establishes: UI tests live under tests/ui/** and carry
 * the `// @vitest-environment jsdom` docblock above.
 *
 * It imports nothing from src/ui/ (which must stay empty until M3).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("DOM environment groundwork (jsdom docblock + RTL + setup-dom cleanup)", () => {
  it("renders a trivial element with RTL and finds it in the document", () => {
    render(<p>dom environment works</p>);
    const element = screen.getByText("dom environment works");
    expect(document.body.contains(element)).toBe(true);
  });

  it("runs alongside node-env tests in the same run (document exists here only)", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});
