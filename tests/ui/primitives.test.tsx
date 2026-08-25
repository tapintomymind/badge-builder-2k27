// @vitest-environment jsdom
/**
 * Primitive smoke tests (design-spec §3.1): the ten M3 primitives exist and
 * render with their core semantics — native elements, visible labels,
 * disabled-with-reason, meter overflow as shape.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "../../src/ui/primitives/Banner";
import { Button } from "../../src/ui/primitives/Button";
import { Chip } from "../../src/ui/primitives/Chip";
import { HeightField } from "../../src/ui/primitives/HeightField";
import { Hint } from "../../src/ui/primitives/Hint";
import { Meter } from "../../src/ui/primitives/Meter";
import { NumberField } from "../../src/ui/primitives/NumberField";
import { Section } from "../../src/ui/primitives/Section";
import { SegmentedControl } from "../../src/ui/primitives/SegmentedControl";
import { Toggle } from "../../src/ui/primitives/Toggle";

describe("Button", () => {
  it("is a native button; disabled carries a reason via aria-describedby", () => {
    render(<Button disabledReason="Only after saving">Load</Button>);
    const button = screen.getByRole("button", { name: "Load" });
    expect(button.tagName).toBe("BUTTON");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    const describedBy = button.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Only after saving",
    );
  });
});

describe("Toggle", () => {
  it("is a checkbox with role=switch named by its label text", () => {
    const onChange = vi.fn();
    render(<Toggle label="Reactions activated" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: "Reactions activated" });
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("NumberField", () => {
  it("clamps on blur, not on keystroke", () => {
    const onCommit = vi.fn();
    render(<NumberField label="Close" value={0} min={0} max={99} onCommit={onCommit} />);
    const input = screen.getByLabelText("Close");
    fireEvent.change(input, { target: { value: "845" } });
    expect(onCommit).not.toHaveBeenCalled(); // mid-keystroke: no clamp
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(99);
  });

  it("steps by 10 with Shift+Arrow", () => {
    const onCommit = vi.fn();
    render(<NumberField label="Mid" value={50} min={0} max={99} onCommit={onCommit} />);
    fireEvent.keyDown(screen.getByLabelText("Mid"), { key: "ArrowUp", shiftKey: true });
    expect(onCommit).toHaveBeenCalledWith(60);
  });
});

describe("HeightField", () => {
  it("shows the inches echo and clamps to the dataset range on blur", () => {
    const onCommit = vi.fn();
    render(
      <HeightField heightInches={78} minInches={69} maxInches={88} onCommit={onCommit} />,
    );
    expect(screen.getByText("= 78 in")).toBeTruthy();
    const feet = screen.getByLabelText("ft");
    fireEvent.change(feet, { target: { value: "7" } });
    fireEvent.blur(feet);
    // 7'6" = 90 in → clamped to 88 (the dataset's own max, not a guess)
    expect(onCommit).toHaveBeenCalledWith(88);
  });
});

describe("SegmentedControl", () => {
  it("is real radios in a fieldset — arrow-key semantics come native", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        legend="Position"
        options={["PG", "SG", "SF"] as const}
        value={null}
        onChange={onChange}
      />,
    );
    const radio = screen.getByRole("radio", { name: "SF" });
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith("SF");
  });
});

describe("Chip", () => {
  it("renders as text, not a control", () => {
    render(<Chip variant="tier">A</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
  });
});

describe("Section", () => {
  it("is a native details/summary, default open", () => {
    render(
      <Section title="Physique">
        <p>body content</p>
      </Section>,
    );
    expect(screen.getByText("body content")).toBeTruthy();
    const details = document.querySelector("details");
    expect(details?.open).toBe(true);
  });
});

describe("Banner", () => {
  it("uses role=status by default and renders a dismiss when dismissible", () => {
    const onDismiss = vi.fn();
    render(
      <Banner variant="warning" onDismiss={onDismiss}>
        Values are unverified.
      </Banner>,
    );
    expect(screen.getByRole("status").textContent).toContain("Values are unverified.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("Hint", () => {
  it("renders inline text (this project has no hover tooltip)", () => {
    render(<Hint id="h1">Cosmetic. Position gates no badges.</Hint>);
    expect(document.getElementById("h1")?.textContent).toBe(
      "Cosmetic. Position gates no badges.",
    );
  });
});

describe("Meter", () => {
  it("exposes role=meter with values", () => {
    render(<Meter label="Finishing Badge Points" value={10} max={16} />);
    const meter = screen.getByRole("meter", { name: "Finishing Badge Points" });
    expect(meter.getAttribute("aria-valuenow")).toBe("10");
    expect(meter.getAttribute("aria-valuemax")).toBe("16");
  });

  it("overflow renders the hatched over-bar segment (shape, not only color)", () => {
    render(<Meter label="Finishing Badge Points" value={18} max={16} />);
    const meter = screen.getByRole("meter");
    expect(meter.className).toContain("meter--over");
    expect(meter.querySelector(".meter__overflow")).not.toBeNull();
    expect(meter.getAttribute("aria-valuetext")).toContain("over by 2");
  });
});
