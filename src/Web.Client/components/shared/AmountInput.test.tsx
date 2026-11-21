import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmountInput, fitAmount, TRAILING_PX } from "./AmountInput";

// jsdom has no layout engine. Stub the three measurements the component reads:
// the wrapper width (clientWidth), the currency symbol and the probe (offsetWidth).
const CHAR_PX = 10; // probe width per character at BASE_FONT_PX
const SYMBOL_PX = 12;
let wrapWidth = 335;

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  /** Simulate the browser reporting a resize of the observed element. */
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

beforeEach(() => {
  wrapWidth = 335;
  FakeResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  Object.defineProperty(Element.prototype, "clientWidth", {
    configurable: true,
    get() {
      return wrapWidth;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.getAttribute("aria-hidden") === "true") {
        return (this.textContent ?? "").length * CHAR_PX;
      }
      return SYMBOL_PX;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalClientWidth) {
    Object.defineProperty(Element.prototype, "clientWidth", originalClientWidth);
  }
  if (originalOffsetWidth) {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
  }
});

describe("fitAmount", () => {
  it("keeps the original size when there is no value to measure", () => {
    expect(fitAmount(0, 300)).toEqual({ widthPx: 160, fontPx: 48 });
  });

  it("keeps the original size for a short value", () => {
    expect(fitAmount(100, 300)).toEqual({ widthPx: 160, fontPx: 48 });
  });

  it("widens the field, with room for a typed decimal point, before it shrinks the font", () => {
    expect(fitAmount(200, 300)).toEqual({ widthPx: 200 + TRAILING_PX, fontPx: 48 });
  });

  it("uses the full room and scales the font once the text is too wide", () => {
    const fit = fitAmount(400, 300);
    expect(fit.widthPx).toBe(300);
    expect(fit.fontPx).toBeCloseTo(48 * (300 / (400 + TRAILING_PX)), 5);
  });

  it("never makes the field wider than a narrow room", () => {
    expect(fitAmount(10, 100)).toEqual({ widthPx: 100, fontPx: 48 });
  });

  it("falls back to the original size when there is no room (not laid out)", () => {
    expect(fitAmount(400, 0)).toEqual({ widthPx: 160, fontPx: 48 });
  });
});

describe("AmountInput", () => {
  const renderInput = (value: string) => {
    const onChange = vi.fn();
    const utils = render(
      <AmountInput value={value} onChange={onChange} currencySymbol="₱" />,
    );
    return { ...utils, onChange };
  };

  it("exposes one spinbutton named Amount with the decimal keyboard", () => {
    renderInput("");
    const field = screen.getByRole("spinbutton", { name: "Amount" });
    expect(field).toHaveAttribute("type", "number");
    expect(field).toHaveAttribute("inputmode", "decimal");
    expect(field).toHaveAttribute("min", "0");
    expect(field).toHaveAttribute("step", "0.01");
    expect(screen.getAllByLabelText(/amount/i)).toHaveLength(1);
  });

  it("forwards id, the ref, and autoFocus to the field", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(
      <AmountInput
        id="amount-field"
        inputRef={ref}
        autoFocus
        value=""
        onChange={vi.fn()}
        currencySymbol="₱"
      />,
    );
    const field = screen.getByRole("spinbutton", { name: "Amount" });
    expect(field).toHaveAttribute("id", "amount-field");
    expect(ref.current).toBe(field);
    expect(field).toHaveFocus();
  });

  it("reports typed text as the raw string", () => {
    const { onChange } = renderInput("");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "12.5" },
    });
    expect(onChange).toHaveBeenCalledWith("12.5");
  });

  it("renders the currency symbol and hides the measuring probe from assistive tech", () => {
    const { container } = renderInput("1234");
    expect(screen.getByText("₱")).toBeInTheDocument();
    const probe = container.querySelector('[aria-hidden="true"]');
    expect(probe).toHaveTextContent("1234");
  });

  it("uses the original size when the field is empty", () => {
    renderInput("");
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveStyle({
      width: "160px",
      fontSize: "48px",
    });
  });

  it("widens for a 16-character value, keeping the font size", () => {
    renderInput("1234567890123456");
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveStyle({
      width: `${160 + TRAILING_PX}px`,
      fontSize: "48px",
    });
  });

  it("keeps the last fit while the browser holds text it cannot read as a number", () => {
    const { rerender } = renderInput("1".repeat(40));
    const field = screen.getByRole("spinbutton", { name: "Amount" });
    const shrunkFont = parseFloat(field.style.fontSize);
    expect(shrunkFont).toBeLessThan(48);

    // "12e" is not a valid number: the browser reports badInput and an empty value.
    Object.defineProperty(field, "validity", { configurable: true, value: { badInput: true } });
    fireEvent.change(field, { target: { value: "" } });
    expect(parseFloat(field.style.fontSize)).toBe(shrunkFont);

    // A valid entry re-fits from the new value.
    Object.defineProperty(field, "validity", { configurable: true, value: { badInput: false } });
    fireEvent.change(field, { target: { value: "5" } });
    rerender(<AmountInput value="5" onChange={vi.fn()} currencySymbol="₱" />);
    expect(field).toHaveStyle({ width: "160px", fontSize: "48px" });
  });

  it("shrinks the font for a 40-character value so it stays in the wrapper", () => {
    renderInput("1".repeat(40));
    const field = screen.getByRole("spinbutton", { name: "Amount" });
    const room = wrapWidth - SYMBOL_PX - 4;
    expect(parseFloat(field.style.width)).toBe(room);
    expect(parseFloat(field.style.fontSize)).toBeCloseTo(48 * (room / (400 + TRAILING_PX)), 3);
  });

  it("re-fits when the wrapper resizes", () => {
    renderInput("1".repeat(40));
    wrapWidth = 200;
    act(() => {
      FakeResizeObserver.instances[0]?.trigger();
    });

    const field = screen.getByRole("spinbutton", { name: "Amount" });
    const room = 200 - SYMBOL_PX - 4;
    expect(parseFloat(field.style.width)).toBe(room);
    expect(parseFloat(field.style.fontSize)).toBeCloseTo(48 * (room / (400 + TRAILING_PX)), 3);
  });

  it("returns to the original size when the value is cleared", () => {
    const { rerender } = renderInput("1".repeat(40));
    rerender(<AmountInput value="" onChange={vi.fn()} currencySymbol="₱" />);
    expect(screen.getByRole("spinbutton", { name: "Amount" })).toHaveStyle({
      width: "160px",
      fontSize: "48px",
    });
  });
});
