"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatMoney } from "@/lib/utils/currency";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
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
            <Label>Deduct from</Label>
            <div className="flex flex-wrap gap-2">
              {activeAccounts.map((account) => (
                <Badge
                  key={account.id}
                  variant={account.id === accountId ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => setAccountId(account.id)}
                >
                  {account.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-note">Note (optional)</Label>
            <Input
              id="expense-note"
              placeholder="e.g. lunch"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {isEdit && (
              <Button variant="destructive" onClick={remove} disabled={pending}>
                Delete
              </Button>
            )}
            <Button className="flex-1" onClick={save} disabled={!canSave || pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
