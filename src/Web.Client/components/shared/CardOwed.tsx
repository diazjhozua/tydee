import { Money } from "@/components/shared/Money";
import { cardOwedStatus } from "@/lib/accounts/accountTypeBehavior";

// Owed is the negated stored balance. Zero shows "Paid"; a credit shows its amount.
// Shared by the dashboard accounts section and the accounts page so both read the same.
export function CardOwed({
  owed,
  currency,
  size,
}: {
  owed: number;
  currency: string;
  size: "sm" | "md";
}) {
  const standing = cardOwedStatus(owed);

  if (standing === "paid") {
    return <span className="block text-sm font-semibold text-primary">Paid</span>;
  }

  return (
    <span className="block min-w-0 overflow-hidden">
      <Money
        value={Math.abs(owed)}
        currency={currency}
        size={size}
        hideable
        className="max-w-full"
      />
      <span className="block text-[11px] font-medium text-muted-foreground">
        {standing === "owed" ? "owed" : "In credit"}
      </span>
    </span>
  );
}
