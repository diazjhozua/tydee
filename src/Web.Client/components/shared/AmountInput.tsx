"use client";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  currencySymbol: string;
  autoFocus?: boolean;
};

export function AmountInput({ id, value, onChange, currencySymbol, autoFocus }: Props) {
  return (
    <div className="flex items-baseline justify-center gap-1 py-2">
      <span className="text-xl font-semibold text-muted-foreground">{currencySymbol}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="money w-40 border-none bg-transparent text-center text-5xl font-bold outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Amount"
      />
    </div>
  );
}
