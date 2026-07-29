"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/lib/hooks/useAccounts";
import {
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "@/lib/hooks/useExpenses";
import { useMe } from "@/lib/hooks/useMe";
import { ApiError } from "@/lib/types/api";
import { Expense } from "@/lib/types/expense";
import { cn } from "@/lib/utils";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

const LAST_ACCOUNT_KEY = "tydee.lastExpenseAccount";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
};

export function ExpenseDialog({ open, onOpenChange, expense }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(today());

  const isEdit = expense !== undefined;
  const activeAccounts = accounts ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }
    if (expense) {
      setAmount(String(expense.amount));
      setNote(expense.note ?? "");
      setAccountId(expense.accountId);
      setDate(expense.date);
    } else {
      setAmount("");
      setNote("");
      setDate(today());
      const last = localStorage.getItem(LAST_ACCOUNT_KEY);
      setAccountId(
        last && activeAccounts.some((a) => a.id === last)
          ? last
          : (activeAccounts[0]?.id ?? ""),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, accounts]);

  const parsedAmount = Number(amount);
  const canSave = parsedAmount > 0 && accountId !== "";

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    const request = {
      accountId,
      amount: parsedAmount,
      note: note.trim() === "" ? null : note.trim(),
      date,
    };

    if (isEdit) {
      updateExpense.mutate(
        { expenseId: expense.id, request },
        {
          onSuccess: () => {
            toast.success("Expense updated");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      createExpense.mutate(request, {
        onSuccess: () => {
          const account = activeAccounts.find((a) => a.id === accountId);
          const newBalance = account ? account.balance - parsedAmount : null;
          toast.success(
            account && newBalance !== null && me
              ? `${account.name}: ${formatMoney(newBalance, me.currency)} left`
              : "Expense saved",
          );
          onOpenChange(false);
        },
        onError: handleError,
      });
    }
  }

  function remove() {
    if (!isEdit) {
      return;
    }
    deleteExpense.mutate(expense.id, {
      onSuccess: () => {
        toast.success("Expense deleted");
        onOpenChange(false);
      },
      onError: handleError,
    });
  }

  const pending = createExpense.isPending || updateExpense.isPending || deleteExpense.isPending;

  return (
    <EntrySheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit expense" : "Add expense"}
    >
      <div className="space-y-5">
        <AmountInput
          value={amount}
          onChange={setAmount}
          currencySymbol={currencySymbol(me?.currency ?? "PHP")}
          autoFocus={!isEdit}
        />

        <div className="space-y-2">
          <Label>Deduct from</Label>
          <div className="flex flex-wrap gap-2">
            {activeAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setAccountId(account.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  account.id === accountId
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {account.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-note">Note (optional)</Label>
          <Input
            id="expense-note"
            placeholder="e.g. lunch"
            className="h-11 rounded-xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            className="h-11 rounded-xl"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-1">
          {isEdit && (
            <Button
              variant="destructive"
              className="h-12 rounded-xl px-5"
              onClick={remove}
              disabled={pending}
            >
              Delete
            </Button>
          )}
          <Button
            className="h-12 flex-1 rounded-xl text-base font-semibold"
            onClick={save}
            disabled={!canSave || pending}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </EntrySheet>
  );
}
