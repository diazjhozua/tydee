"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCreateIncome } from "@/lib/hooks/useIncomes";
import { useMe } from "@/lib/hooks/useMe";
import { ApiError } from "@/lib/types/api";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IncomeDialog({ open, onOpenChange }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const createIncome = useCreateIncome();

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today());
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const activeAccounts = accounts ?? [];
  const parsedAmount = Number(amount);
  const currency = me?.currency ?? "PHP";

  useEffect(() => {
    if (!open) {
      return;
    }
    setAmount("");
    setSource("");
    setDate(today());
    setAllocations({});
    setTouched(false);
  }, [open]);

  // Pre-fill the split from the template until the user edits a row manually.
  useEffect(() => {
    if (touched || activeAccounts.length === 0) {
      return;
    }

    if (!(parsedAmount > 0)) {
      setAllocations({});
      return;
    }

    const split: Record<string, string> = {};
    let assigned = 0;

    activeAccounts.forEach((account, index) => {
      let share: number;
      if (index === activeAccounts.length - 1) {
        share = Math.round((parsedAmount - assigned) * 100) / 100;
      } else {
        share = Math.round(parsedAmount * account.allocationPercent) / 100;
        assigned += share;
      }
      split[account.id] = share === 0 ? "" : String(share);
    });

    setAllocations(split);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAmount, accounts, touched, open]);

  const allocated = activeAccounts.reduce(
    (sum, account) => sum + (Number(allocations[account.id]) || 0),
    0,
  );
  const remaining = Math.round((parsedAmount - allocated) * 100) / 100;
  const canSave = parsedAmount > 0 && source.trim() !== "" && remaining === 0;

  function setAllocation(accountId: string, value: string) {
    setTouched(true);
    setAllocations((prev) => ({ ...prev, [accountId]: value }));
  }

  function save() {
    createIncome.mutate(
      {
        amount: parsedAmount,
        source: source.trim(),
        date,
        allocations: activeAccounts
          .map((account) => ({
            accountId: account.id,
            amount: Number(allocations[account.id]) || 0,
          }))
          .filter((line) => line.amount > 0),
      },
      {
        onSuccess: () => {
          toast.success("Income allocated");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong."),
      },
    );
  }

  return (
    <EntrySheet open={open} onOpenChange={onOpenChange} title="Add income">
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(currency)}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="income-source">Source</Label>
            <Input
              id="income-source"
              placeholder="e.g. Salary"
              className="h-11 rounded-xl"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="income-date">Date</Label>
            <Input
              id="income-date"
              type="date"
              className="h-11 rounded-xl"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Allocation</Label>
            <span className="text-xs text-muted-foreground">tap amounts to adjust</span>
          </div>

          {activeAccounts.map((account) => (
            <div key={account.id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm font-medium">
                {account.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {account.allocationPercent}%
                </span>
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="money h-10 w-32 rounded-xl text-right"
                value={allocations[account.id] ?? ""}
                onChange={(e) => setAllocation(account.id, e.target.value)}
              />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span
              className={
                remaining === 0
                  ? "money font-semibold text-primary"
                  : "money font-semibold text-destructive"
              }
            >
              {formatMoney(remaining, currency)}
            </span>
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={save}
          disabled={!canSave || createIncome.isPending}
        >
          {createIncome.isPending ? "Saving..." : "Confirm & allocate"}
        </Button>
      </div>
    </EntrySheet>
  );
}
