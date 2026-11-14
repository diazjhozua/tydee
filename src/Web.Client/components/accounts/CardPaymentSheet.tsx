"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_TYPE_BEHAVIOR } from "@/lib/accounts/accountTypeBehavior";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCreateCardPayment } from "@/lib/hooks/useCardPayments";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

// Names what is still missing so a disabled Save never looks like a dead end.
function missingFieldHint(parsedAmount: number, fromId: string, date: string): string | null {
  const needsAmount = !(parsedAmount > 0);
  const needsSource = fromId === "";

  if (needsAmount && needsSource) {
    return "Enter an amount and choose an account to pay from.";
  }
  if (needsAmount) {
    return "Enter an amount to pay.";
  }
  if (needsSource) {
    return "Choose an account to pay from.";
  }
  return date === "" ? "Choose a date." : null;
}

export type PaymentCard = {
  id: string;
  name: string;
  // Money owed on the card; zero or negative when there is nothing to pay.
  owed: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: PaymentCard;
};

export function CardPaymentSheet({ open, onOpenChange, card }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const createPayment = useCreateCardPayment();
  const isOnline = useOnlineStatus();
  const dateId = useId();
  const saveHintId = useId();

  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [date, setDate] = useState(today());
  const [prevOpen, setPrevOpen] = useState(false);

  const sources = (accounts ?? []).filter((a) => !ACCOUNT_TYPE_BEHAVIOR[a.type].isCard);
  const currency = me?.currency ?? "PHP";
  const parsedAmount = Number(amount);
  const canSave = card !== undefined && parsedAmount > 0 && fromId !== "" && date !== "";
  // A mutation paused by the offline queue is not in flight; keep Save usable.
  const saving = createPayment.isPending && !createPayment.isPaused;
  const saveHint = canSave ? null : missingFieldHint(parsedAmount, fromId, date);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setFromId("");
      setDate(today());
    }
  }

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    if (!card || !canSave) {
      return;
    }

    const request = {
      fromAccountId: fromId,
      cardAccountId: card.id,
      amount: parsedAmount,
      date,
    };

    if (!isOnline) {
      createPayment.mutate(request);
      toast.info("Queued — will sync when you're back online");
      onOpenChange(false);
      return;
    }

    createPayment.mutate(request, {
      onSuccess: () => {
        toast.success(`Paid ${formatMoney(parsedAmount, currency)} to ${card.name}`);
        onOpenChange(false);
      },
      onError: handleError,
    });
  }

  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={card ? `Pay ${card.name}` : "Log card payment"}
    >
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(currency)}
          autoFocus
        />

        {card !== undefined && card.owed > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setAmount(String(Math.max(card.owed, 0)))}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pay full balance
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Pay from</Label>
          {accounts !== undefined && sources.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Add a spending or saving account to pay from.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sources.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  aria-pressed={account.id === fromId}
                  onClick={() => setFromId(account.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    account.id === fromId
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {account.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={dateId}>Date</Label>
          <Input
            id={dateId}
            type="date"
            className="h-11 rounded-xl"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Button
            className="h-12 w-full rounded-xl text-base font-semibold"
            onClick={save}
            disabled={!canSave || saving}
            aria-describedby={saveHint ? saveHintId : undefined}
          >
            {saving ? "Saving..." : "Save payment"}
          </Button>
          {saveHint && (
            <p id={saveHintId} className="text-center text-xs text-muted-foreground">
              {saveHint}
            </p>
          )}
        </div>
      </div>
    </EntrySheet>
  );
}
