"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCreateIncome } from "@/lib/hooks/useIncomes";
import { useMe } from "@/lib/hooks/useMe";
import { ApiError } from "@/lib/types/api";
import { formatMoney } from "@/lib/utils/currency";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add income</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income-amount">Amount</Label>
            <Input
              id="income-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-source">Source</Label>
            <Input
              id="income-source"
              placeholder="e.g. Salary"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-date">Date</Label>
            <Input
              id="income-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allocation</Label>
              <span className="text-xs text-muted-foreground">tap amounts to adjust</span>
            </div>

            {activeAccounts.map((account) => (
              <div key={account.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm truncate">
                  {account.name}
                  <span className="text-muted-foreground ml-1">
                    {account.allocationPercent}%
                  </span>
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="w-32"
                  value={allocations[account.id] ?? ""}
                  onChange={(e) => setAllocation(account.id, e.target.value)}
                />
              </div>
            ))}

            <div className="flex justify-between text-sm pt-1">
              <span className="text-muted-foreground">Remaining</span>
              <span className={remaining === 0 ? "text-primary font-medium" : "text-destructive font-medium"}>
                {formatMoney(remaining, currency)}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={save}
            disabled={!canSave || createIncome.isPending}
          >
            {createIncome.isPending ? "Saving..." : "Confirm & allocate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
