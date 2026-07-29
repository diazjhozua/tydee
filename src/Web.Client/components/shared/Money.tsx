import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const INT_CLASSES: Record<Size, string> = {
  sm: "text-sm font-semibold",
  md: "text-lg font-semibold",
  lg: "text-2xl font-bold",
  xl: "text-[2.6rem] leading-none font-bold",
};

const SUB_CLASSES: Record<Size, string> = {
  sm: "text-xs font-medium",
  md: "text-xs font-medium",
  lg: "text-sm font-semibold",
  xl: "text-xl font-semibold",
};

type Props = {
  value: number;
  currency: string;
  size?: Size;
  className?: string;
};

export function Money({ value, currency, size = "md", className }: Props) {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(value);

  return (
    <span className={cn("money inline-flex items-baseline", className)}>
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.type === "fraction" || part.type === "decimal" || part.type === "currency"
              ? cn(SUB_CLASSES[size], "opacity-70")
              : INT_CLASSES[size]
          }
        >
          {part.value}
        </span>
      ))}
    </span>
  );
}
