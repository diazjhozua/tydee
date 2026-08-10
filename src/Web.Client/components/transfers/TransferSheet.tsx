"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useMe } from "@/lib/hooks/useMe";
import { useCreateTransfer } from "@/lib/hooks/useTransfers";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransferSheet({ open, onOpenChange }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const createTransfer = useCreateTransfer();

  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [date, setDate] = useState(today());
  const [prevOpen, setPrevOpen] = useState(false);

  const activeAccounts = accounts ?? [];
  const currency = me?.currency ?? "PHP";
  const parsedAmount = Number(amount);
  const canSave = parsedAmount > 0 && fromId !== "" && toId !== "" && fromId !== toId;

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setFromId("");
      setToId("");
      setDate(today());
    }
  }

  function chipRow(selected: string, onSelect: (id: string) => void, disabledId: string) {
    return (
      <div className="flex flex-wrap gap-2">
        {activeAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            disabled={account.id === disabledId}
            onClick={() => onSelect(account.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              account.id === selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
              account.id === disabledId && "opacity-40",
            )}
          >
            {account.name}
          </button>
        ))}
      </div>
    );
  }

  function save() {
    const from = activeAccounts.find((a) => a.id === fromId);
    const to = activeAccounts.find((a) => a.id === toId);

    createTransfer.mutate(
      { fromAccountId: fromId, toAccountId: toId, amount: parsedAmount, date },
      {
        onSuccess: () => {
          toast.success(
            from && to
              ? `Moved ${formatMoney(parsedAmount, currency)} from ${from.name} to ${to.name}`
              : "Transfer saved",
          );
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
      },
    );
  }

  return (
    <EntrySheet open={open} onOpenChange={onOpenChange} title="Move money">
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(currency)}
          autoFocus
        />

        <div className="space-y-2">
          <Label>From</Label>
          {chipRow(fromId, setFromId, toId)}
        </div>

        <div className="space-y-2">
          <Label>To</Label>
          {chipRow(toId, setToId, fromId)}
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-date">Date</Label>
          <Input
            id="transfer-date"
            type="date"
            className="h-11 rounded-xl"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Button
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={save}
          disabled={!canSave || createTransfer.isPending}
        >
          {createTransfer.isPending ? "Moving..." : "Move money"}
        </Button>
      </div>
    </EntrySheet>
  );
}
