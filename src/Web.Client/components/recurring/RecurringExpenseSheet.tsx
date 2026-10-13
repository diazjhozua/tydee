"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { EntrySheet } from "@/components/shared/EntrySheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import {
  useArchiveRecurringExpense,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
} from "@/lib/hooks/useRecurringExpenses";
import { ApiError } from "@/lib/types/api";
import { RecurringExpense } from "@/lib/types/recurringExpense";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils/currency";

const PRESET_CATEGORIES = ["Bills", "Groceries", "Food", "Transport", "House", "Fun", "Other"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringExpense?: RecurringExpense;
};

export function RecurringExpenseSheet({ open, onOpenChange, recurringExpense }: Props) {
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const createRecurringExpense = useCreateRecurringExpense();
  const updateRecurringExpense = useUpdateRecurringExpense();
  const archiveRecurringExpense = useArchiveRecurringExpense();
  const isOnline = useOnlineStatus();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState(false);
  const [note, setNote] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  const isEdit = recurringExpense !== undefined;
  const activeAccounts = accounts ?? [];

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCustomCategory(false);
      setConfirmArchive(false);
      if (recurringExpense) {
        setName(recurringExpense.name);
        setAmount(String(recurringExpense.amount));
        setAccountId(recurringExpense.accountId);
        setCategory(recurringExpense.category ?? "");
        setNote(recurringExpense.note ?? "");
      } else {
        setName("");
        setAmount("");
        setCategory("");
        setNote("");
        setAccountId(activeAccounts[0]?.id ?? "");
      }
    }
  }

  const parsedAmount = Number(amount);
  const trimmedName = name.trim();
  const canSave = trimmedName !== "" && parsedAmount > 0 && accountId !== "";

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function save() {
    const request = {
      name: trimmedName,
      accountId,
      amount: parsedAmount,
      category: category.trim() === "" ? null : category.trim(),
      note: note.trim() === "" ? null : note.trim(),
    };

    if (isEdit) {
      updateRecurringExpense.mutate(
        { recurringExpenseId: recurringExpense.id, request },
        {
          onSuccess: () => {
            toast.success("Saved expense updated");
            onOpenChange(false);
          },
          onError: handleError,
        },
      );
    } else {
      createRecurringExpense.mutate(request, {
        onSuccess: () => {
          toast.success("Saved expense created");
          onOpenChange(false);
        },
        onError: handleError,
      });
    }
  }

  function archive() {
    if (!isEdit) {
      return;
    }

    archiveRecurringExpense.mutate(
      { recurringExpenseId: recurringExpense.id },
      {
        onSuccess: () => {
          toast.success("Saved expense archived");
          setConfirmArchive(false);
          onOpenChange(false);
        },
        onError: handleError,
      },
    );
  }

  const pending =
    createRecurringExpense.isPending ||
    updateRecurringExpense.isPending ||
    archiveRecurringExpense.isPending;

  const categoryOptions = [...PRESET_CATEGORIES];
  if (category && !categoryOptions.some((c) => c.toLowerCase() === category.toLowerCase())) {
    categoryOptions.push(category);
  }

  return (
    <>
      <EntrySheet
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? "Edit saved expense" : "New saved expense"}
      >
        <div className="space-y-5">
          <AmountInput
            value={amount}
            onChange={setAmount}
            currencySymbol={currencySymbol(me?.currency ?? "PHP")}
            autoFocus={!isEdit}
          />

          <div className="space-y-2">
            <Label htmlFor="recurring-name">Name</Label>
            <Input
              id="recurring-name"
              placeholder="e.g. Rent"
              className="h-11 rounded-xl"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <Label>Category (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(category === option ? "" : option)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    category === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
              {customCategory ? (
                <Input
                  autoFocus
                  maxLength={50}
                  placeholder="Custom category"
                  className="h-8 w-40 rounded-full text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setCustomCategory(true);
                  }}
                  className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  + New
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-note">Note (optional)</Label>
            <Input
              id="recurring-note"
              placeholder="e.g. monthly"
              className="h-11 rounded-xl"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            {isEdit && (
              <Button
                variant="destructive"
                className="h-12 rounded-xl px-5"
                onClick={() => setConfirmArchive(true)}
                disabled={pending || !isOnline}
              >
                Archive
              </Button>
            )}
            <Button
              className="h-12 flex-1 rounded-xl text-base font-semibold"
              onClick={save}
              disabled={!canSave || pending || !isOnline}
            >
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </EntrySheet>

      <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Archive this saved expense?</DialogTitle>
            <DialogDescription>
              {recurringExpense &&
                `${recurringExpense.name} won't appear when logging expenses anymore. Past expenses are kept.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={archive}
              disabled={archiveRecurringExpense.isPending || !isOnline}
            >
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}