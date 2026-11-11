"use client";

import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/AmountInput";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/lib/hooks/useAccounts";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseCategories,
  useUpdateExpense,
} from "@/lib/hooks/useExpenses";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useRecurringExpenses } from "@/lib/hooks/useRecurringExpenses";
import { ApiError } from "@/lib/types/api";
import { Expense } from "@/lib/types/expense";
import { cn } from "@/lib/utils";
import { currencySymbol, formatMoney } from "@/lib/utils/currency";
import { today } from "@/lib/utils/date";

const LAST_ACCOUNT_KEY = "tydee.lastExpenseAccount";

const PRESET_CATEGORIES = ["Bills", "Groceries", "Food", "Transport", "House", "Fun", "Other"];

const COLLAPSED_TEMPLATE_COUNT = 4;

const emptySubscribe = () => () => {};
const readLastAccount = () => localStorage.getItem(LAST_ACCOUNT_KEY) ?? "";

export type ExpenseFormAction = "created" | "updated" | "deleted";

type Props = {
  expense?: Expense;
  /** Keep the form mounted and clear it after a successful create. */
  resetAfterSave?: boolean;
  submitLabel?: string;
  autoFocus?: boolean;
  onSaved?: (action: ExpenseFormAction) => void;
  onRequestClose?: () => void;
};

export function ExpenseForm({
  expense,
  resetAfterSave = false,
  submitLabel = "Save",
  autoFocus,
  onSaved,
  onRequestClose,
}: Props) {
  const formId = useId();
  const noteId = `${formId}-note`;
  const dateId = `${formId}-date`;
  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  const { data: recurringExpenses } = useRecurringExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const isOnline = useOnlineStatus();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [accountId, setAccountId] = useState(expense?.accountId ?? "");
  const [date, setDate] = useState(expense?.date ?? today());
  const [category, setCategory] = useState(expense?.category ?? "");
  const [customCategory, setCustomCategory] = useState(false);
  const [recurringExpenseId, setRecurringExpenseId] = useState("");
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const isEdit = expense !== undefined;
  const activeAccounts = accounts ?? [];
  const { data: usedCategories } = useExpenseCategories(true);

  // Editing an expense whose envelope was archived must keep that envelope;
  // only a create falls back to the last-used or first active account.
  const accountOptions =
    expense && !activeAccounts.some((a) => a.id === expense.accountId)
      ? [{ id: expense.accountId, name: expense.accountName }, ...activeAccounts]
      : activeAccounts;

  const lastAccountId = useSyncExternalStore(emptySubscribe, readLastAccount, () => "");
  const selectedAccountId =
    accountId !== ""
      ? accountId
      : activeAccounts.some((a) => a.id === lastAccountId)
        ? lastAccountId
        : (activeAccounts[0]?.id ?? "");

  const templates = (recurringExpenses ?? []).filter((t) =>
    activeAccounts.some((a) => a.id === t.accountId),
  );

  const collapsed = !showAllTemplates && templates.length > COLLAPSED_TEMPLATE_COUNT;
  const visibleTemplates = collapsed
    ? templates.slice(0, COLLAPSED_TEMPLATE_COUNT - 1)
    : templates;

  const parsedAmount = Number(amount);
  const canSave = parsedAmount > 0 && selectedAccountId !== "" && date !== "";

  function handleError(err: unknown) {
    toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
  }

  function resetForNextEntry() {
    setAmount("");
    setNote("");
    setCategory("");
    setCustomCategory(false);
    setRecurringExpenseId("");
    setShowAllTemplates(false);
    setDate(today());
    amountRef.current?.focus();
  }

  function finish(action: ExpenseFormAction) {
    if (resetAfterSave && action === "created") {
      resetForNextEntry();
    }
    onSaved?.(action);
  }

  function save() {
    const request = {
      accountId: selectedAccountId,
      amount: parsedAmount,
      note: note.trim() === "" ? null : note.trim(),
      category: category.trim() === "" ? null : category.trim(),
      date,
    };

    if (isEdit) {
      if (!isOnline) {
        updateExpense.mutate({ expenseId: expense.id, request });
        toast.info("Queued — will sync when you're back online");
        finish("updated");
        return;
      }

      updateExpense.mutate(
        { expenseId: expense.id, request },
        {
          onSuccess: () => {
            toast.success("Expense updated");
            finish("updated");
          },
          onError: handleError,
        },
      );
    } else {
      localStorage.setItem(LAST_ACCOUNT_KEY, selectedAccountId);

      const createRequest = {
        ...request,
        recurringExpenseId: recurringExpenseId === "" ? null : recurringExpenseId,
      };

      if (!isOnline) {
        createExpense.mutate(createRequest);
        toast.info("Queued — will sync when you're back online");
        finish("created");
        return;
      }

      createExpense.mutate(createRequest, {
        onSuccess: () => {
          const account = activeAccounts.find((a) => a.id === selectedAccountId);
          const newBalance = account ? account.balance - parsedAmount : null;
          toast.success(
            account && newBalance !== null && me
              ? `${account.name}: ${formatMoney(newBalance, me.currency)} left`
              : "Expense saved",
          );
          finish("created");
        },
        onError: handleError,
      });
    }
  }

  function remove() {
    if (!isEdit) {
      return;
    }

    if (!isOnline) {
      deleteExpense.mutate({ expenseId: expense.id, date: expense.date });
      toast.info("Queued — will sync when you're back online");
      finish("deleted");
      return;
    }

    deleteExpense.mutate(
      { expenseId: expense.id, date: expense.date },
      {
        onSuccess: () => {
          toast.success("Expense deleted");
          finish("deleted");
        },
        onError: handleError,
      },
    );
  }

  function applyTemplate(template: (typeof templates)[number]) {
    if (recurringExpenseId === template.id) {
      setRecurringExpenseId("");
      return;
    }
    setRecurringExpenseId(template.id);
    setAmount(String(template.amount));
    setAccountId(template.accountId);
    setCategory(template.category ?? "");
    setNote(template.note ?? "");
  }

  // A mutation paused by the offline queue is not in flight; the form must
  // stay usable for the next entry.
  const pending =
    (createExpense.isPending && !createExpense.isPaused) ||
    (updateExpense.isPending && !updateExpense.isPaused) ||
    (deleteExpense.isPending && !deleteExpense.isPaused);

  const categoryOptions = [...PRESET_CATEGORIES];
  for (const used of [...(usedCategories ?? []), category]) {
    if (used && !categoryOptions.some((c) => c.toLowerCase() === used.toLowerCase())) {
      categoryOptions.push(used);
    }
  }

  return (
    <div className="space-y-5">
      {!isEdit && templates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Saved expenses</Label>
            <Link
              href="/recurring"
              onClick={() => onRequestClose?.()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className={cn(showAllTemplates && "max-h-64 overflow-y-auto overscroll-contain")}>
            <div className="grid grid-cols-2 gap-2">
              {visibleTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={recurringExpenseId === template.id}
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                    recurringExpenseId === template.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border/60 bg-muted/40 hover:bg-muted",
                  )}
                >
                  <CategoryIcon category={template.category} className="size-8" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{template.name}</div>
                    <Money
                      value={template.amount}
                      currency={me?.currency ?? "PHP"}
                      size="sm"
                      hideable
                    />
                  </div>
                </button>
              ))}
              {collapsed && (
                <button
                  type="button"
                  onClick={() => setShowAllTemplates(true)}
                  className="flex items-center justify-center rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {`+${templates.length - (COLLAPSED_TEMPLATE_COUNT - 1)} more`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AmountInput
        value={amount}
        onChange={setAmount}
        currencySymbol={currencySymbol(me?.currency ?? "PHP")}
        autoFocus={autoFocus ?? !isEdit}
        inputRef={amountRef}
      />

      <div className="space-y-2">
        <Label>Deduct from</Label>
        <div className="flex flex-wrap gap-2">
          {accountOptions.map((account) => (
            <button
              key={account.id}
              type="button"
              aria-pressed={account.id === selectedAccountId}
              onClick={() => setAccountId(account.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                account.id === selectedAccountId
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
              aria-pressed={category === option}
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
              aria-label="Custom category"
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
        <Label htmlFor={noteId}>Note (optional)</Label>
        <Input
          id={noteId}
          maxLength={500}
          placeholder="e.g. lunch"
          className="h-11 rounded-xl"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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
          {pending
            ? deleteExpense.isPending && !deleteExpense.isPaused
              ? "Deleting..."
              : "Saving..."
            : submitLabel}
        </Button>
      </div>
    </div>
  );
}
