"use client";

import { useLayoutEffect, useRef, useState } from "react";

const BASE_FONT_PX = 48; // text-5xl, set in px so the probe ignores the root font size
const MIN_WIDTH_PX = 160; // the field's original fixed width (w-40)
const GAP_PX = 4; // gap-1 between the currency symbol and the field
// Room after the last digit: the caret, plus a typed decimal point, which the
// browser drops from `value` (so the probe cannot measure it).
export const TRAILING_PX = 18;

export type AmountFit = { widthPx: number; fontPx: number };

export const INITIAL_FIT: AmountFit = { widthPx: MIN_WIDTH_PX, fontPx: BASE_FONT_PX };

/**
 * Pick the field width and font size for a value.
 *
 * `textWidthPx` is the value's width at BASE_FONT_PX. Widen the field first, never
 * past the room; once the text no longer fits, shrink the font. Text width scales
 * linearly with font size, so one step is exact and there is no floor: any length fits.
 */
export function fitAmount(textWidthPx: number, roomPx: number): AmountFit {
  if (roomPx <= 0 || textWidthPx <= 0) {
    return INITIAL_FIT;
  }
  const natural = textWidthPx + TRAILING_PX;
  if (natural <= roomPx) {
    return { widthPx: Math.min(roomPx, Math.max(MIN_WIDTH_PX, natural)), fontPx: BASE_FONT_PX };
  }
  return { widthPx: roomPx, fontPx: BASE_FONT_PX * (roomPx / natural) };
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  currencySymbol: string;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function AmountInput({
  id,
  value,
  onChange,
  currencySymbol,
  autoFocus,
  inputRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLSpanElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<AmountFit>(INITIAL_FIT);
  // The browser reports "" for text it cannot read as a number (e.g. "12e"), so the
  // probe would measure nothing. While that holds, keep the last fit instead.
  const [badInput, setBadInput] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const symbol = symbolRef.current;
    const probe = probeRef.current;
    if (!wrap || !symbol || !probe || badInput) {
      return;
    }

    let active = true;
    const measure = () => {
      if (!active) {
        return;
      }
      const room = wrap.clientWidth - symbol.offsetWidth - GAP_PX;
      const next = fitAmount(probe.offsetWidth, room);
      setFit((prev) =>
        prev.widthPx === next.widthPx && prev.fontPx === next.fontPx ? prev : next,
      );
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(wrap);
    void document.fonts?.ready.then(measure);

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [value, currencySymbol, badInput]);

  return (
    <div
      ref={wrapRef}
      className="relative flex max-w-full items-baseline justify-center gap-1 overflow-hidden py-2"
    >
      <span ref={symbolRef} className="shrink-0 text-xl font-semibold text-muted-foreground">
        {currencySymbol}
      </span>
      <input
        id={id}
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setBadInput(e.currentTarget.validity.badInput);
          onChange(e.target.value);
        }}
        style={{ width: fit.widthPx, fontSize: fit.fontPx }}
        className="money max-w-full border-none bg-transparent text-center font-bold leading-none outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Amount"
      />
      {/* Measures the value at BASE_FONT_PX. Same font classes as the field, never shown. */}
      <span
        ref={probeRef}
        aria-hidden="true"
        style={{ fontSize: BASE_FONT_PX }}
        className="money pointer-events-none invisible absolute top-0 left-0 w-max leading-none whitespace-pre font-bold"
      >
        {value}
      </span>
    </div>
  );
}
