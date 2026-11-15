"use client";

import { useState } from "react";
import { CardStatementSummary } from "@/components/accounts/CardStatementSummary";
import { currentYearMonth, monthLabel } from "@/components/shared/MonthPicker";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardStatement } from "@/lib/hooks/useCardPayments";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: { id: string; name: string };
};

export function CardStatementSheet({ open, onOpenChange, card }: Props) {
  const { data: me } = useMe();
  const isOnline = useOnlineStatus();
  // The statement covers the current calendar month, matching the card row's
  // owed balance and the server's "paid this month" figure. It is read again
  // each time the sheet opens so a month boundary never leaves it stale.
  const [period, setPeriod] = useState(currentYearMonth);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPeriod(currentYearMonth());
    }
  }

  const statement = useCardStatement(card?.id ?? "", period.year, period.month, open);

  return (
    <EntrySheet open={open} onOpenChange={onOpenChange} title={card?.name ?? "Statement"}>
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">{monthLabel(period)} statement</p>

        {statement.isPending && !isOnline && (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Statement needs a connection
          </p>
        )}

        {statement.isPending && isOnline && <Skeleton className="h-40 w-full rounded-2xl" />}

        {statement.isError && (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t load this statement.
          </p>
        )}

        {statement.data && (
          <CardStatementSummary statement={statement.data} currency={me?.currency ?? "PHP"} />
        )}
      </div>
    </EntrySheet>
  );
}
