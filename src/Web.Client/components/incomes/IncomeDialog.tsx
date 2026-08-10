"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAccounts } from "@/lib/hooks/useAccounts";
import {
  useCreateIncome,
  useDeleteIncome,
  useIncome,
  useIncomeSources,
  useUpdateIncome,
} from "@/lib/hooks/useIncomes";
import { useMe } from "@/lib/hooks/useMe";
import { ApiError } from "@/lib/types/api";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeId?: string;
};

export function IncomeDialog({ open, onOpenChange, incomeId }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const { data: income } = useIncome(open ? incomeId : undefined);
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today());
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  const isEdit = incomeId !== undefined;
  const activeAccounts = accounts ?? [];
  const { data: pastSources } = useIncomeSources(open && !isEdit);
  const parsedAmount = Number(amount);
  const currency = me?.currency ?? "PHP";

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setConfirmingDelete(false);
      if (!isEdit) {
        setAmount("");
        setSource("");
        setDate(today());
        setAllocations({});
        setTouched(false);
      }
    }
  }

  // Edit mode: prefill from the fetched income and stop the template
  // auto-fill from overwriting the stored split.
  const [prevIncome, setPrevIncome] = useState(income);
  if (income !== prevIncome) {
    setPrevIncome(income);
    if (open && isEdit && income) {
      setAmount(String(income.amount));
      setSource(income.source);
      setDate(income.date);
      setAllocations(
        Object.fromEntries(income.allocations.map((a) => [a.accountId, String(a.amount)])),
      );
      setTouched(true);
    }
  }

  // The template split is shown until the user edits a row manually.
  function templateSplit(): Record<string, string> {
    if (!(parsedAmount > 0)) {
      return {};
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

    return split;
  }

  const shownAllocations = touched || isEdit ? allocations : templateSplit();

  const allocated = activeAccounts.reduce(
    (sum, account) => sum + (Number(shownAllocations[account.id]) || 0),
    0,
  );
  const remaining = Math.round((parsedAmount - allocated) * 100) / 100;
  const canSave = parsedAmount > 0 && source.trim() !== "" && remaining === 0;
  const pending = createIncome.isPending || updateIncome.isPending || deleteIncome.isPending;

  function setAllocation(accountId: string, value: string) {
    setTouched(true);
    setAllocations({ ...shownAllocations, [accountId]: value });
  }

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    const request = {
      amount: parsedAmount,
      source: source.trim(),
      date,
      allocations: activeAccounts
        .map((account) => ({
          accountId: account.id,
          amount: Number(shownAllocations[account.id]) || 0,
        }))
        .filter((line) => line.amount > 0),
    };

    if (isEdit) {
      updateIncome.mutate(
        { incomeId: incomeId!, request },
        {
          onSuccess: () => {
            toast.success("Income updated");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      createIncome.mutate(request, {
        onSuccess: () => {
          toast.success("Income allocated");
          onOpenChange(false);
        },
        onError: handleError,
      });
    }
  }

  function removeIncome() {
    if (!isEdit) {
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteIncome.mutate(incomeId!, {
      onSuccess: () => {
        toast.success("Income deleted");
        onOpenChange(false);
      },
      onError: handleError,
    });
  }

  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit income" : "Add income"}
    >
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(currency)}
          autoFocus={!isEdit}
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

        {!isEdit && (pastSources ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(pastSources ?? []).map((past) => (
              <button
                key={past}
                type="button"
                onClick={() => setSource(past)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (source === past
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground")
                }
              >
                {past}
              </button>
            ))}
          </div>
        )}

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
                value={shownAllocations[account.id] ?? ""}
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

        <div className="flex gap-2">
          {isEdit && (
            <Button
              variant="destructive"
              className="h-12 rounded-xl px-5"
              onClick={removeIncome}
              disabled={pending}
            >
              {confirmingDelete ? "Really delete?" : "Delete"}
            </Button>
          )}
          <Button
            className="h-12 flex-1 rounded-xl text-base font-semibold"
            onClick={save}
            disabled={!canSave || pending}
          >
            {pending ? "Saving..." : isEdit ? "Save changes" : "Confirm & allocate"}
          </Button>
        </div>
      </div>
    </EntrySheet>
  );
}
