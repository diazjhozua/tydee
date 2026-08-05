"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetAccountBalance } from "@/lib/hooks/useAccounts";
import { useMe } from "@/lib/hooks/useMe";
import { Account } from "@/lib/types/account";
import { ApiError } from "@/lib/types/api";
import { currencySymbol } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
};

export function SetBalanceSheet({ open, onOpenChange, account }: Props) {
  const { data: me } = useMe();
  const setBalance = useSetAccountBalance();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());

  useEffect(() => {
    if (!open || !account) {
      return;
    }
    setAmount(String(account.balance));
    setDate(today());
  }, [open, account]);

  const parsedAmount = Number(amount);
  const unchanged = account !== undefined && parsedAmount === account.balance;
  const canSave = account !== undefined && amount !== "" && parsedAmount >= 0 && !unchanged;

  function save() {
    if (!account) {
      return;
    }
    setBalance.mutate(
      { accountId: account.id, request: { newBalance: parsedAmount, date } },
      {
        onSuccess: () => {
          toast.success(`${account.name} balance updated`);
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
      },
    );
  }

  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={account ? `Set ${account.name} balance` : "Set balance"}
    >
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(me?.currency ?? "PHP")}
          autoFocus
        />

        <div className="space-y-2">
          <Label htmlFor="adjustment-date">Date</Label>
          <Input
            id="adjustment-date"
            type="date"
            className="h-11 rounded-xl"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Tydee records the difference as an adjustment, so your history stays accurate and
          you can undo it anytime.
        </p>

        <Button
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={save}
          disabled={!canSave || setBalance.isPending}
        >
          {setBalance.isPending ? "Saving..." : unchanged ? "Balance unchanged" : "Save"}
        </Button>
      </div>
    </EntrySheet>
  );
}
