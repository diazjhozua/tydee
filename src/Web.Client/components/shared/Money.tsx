"use client";

import { useSyncExternalStore } from "react";
import { useBalanceVisibilityStore } from "@/lib/stores/balanceVisibilityStore";
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

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

type Props = {
  value: number;
  currency: string;
  size?: Size;
  className?: string;
  /** Mask the amount with `••••` when the user has hidden balances. */
  hideable?: boolean;
};

export function Money({ value, currency, size = "md", className, hideable = false }: Props) {
  // False during SSR/hydration, true after - keeps the masked markup from
  // mismatching the server-rendered value before the persisted store reads.
  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const hideBalances = useBalanceVisibilityStore((state) => state.hideBalances);

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  });
  const parts = formatter.formatToParts(value);

  if (hideable && mounted && hideBalances) {
    const symbol = parts.find((part) => part.type === "currency")?.value ?? "";
    return (
      <span className={cn("money inline-flex items-baseline", className)}>
        <span className={cn(SUB_CLASSES[size], "opacity-70")}>{symbol}</span>
        <span className={INT_CLASSES[size]}>••••</span>
      </span>
    );
  }

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