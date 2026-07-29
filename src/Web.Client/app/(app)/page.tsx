"use client";

import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { AccountIcon } from "@/components/shared/AccountIcon";
import { ActivityIcon } from "@/components/shared/ActivityIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useDeleteIncome } from "@/lib/hooks/useIncomes";
import { useMe } from "@/lib/hooks/useMe";
import { ApiError } from "@/lib/types/api";
import { ActivityItem } from "@/lib/types/dashboard";
import { Expense } from "@/lib/types/expense";
import { formatMoney } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { data: dashboard, isLoading, isFetching } = useDashboard();
  const { data: me } = useMe();
  const { data: expenses } = useExpenses({ pageSize: 50 });
  const deleteIncome = useDeleteIncome();

  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deletingIncome, setDeletingIncome] = useState<ActivityItem | undefined>();

  const currency = me?.currency ?? "PHP";

  useEffect(() => {
    // Wait for a fresh fetch so a stale cached dashboard (e.g. right after
    // finishing setup) doesn't bounce the user back to the wizard.
    if (!isFetching && dashboard && dashboard.accountBalances.length === 0) {
      router.replace("/setup");
    }
  }, [dashboard, isFetching, router]);

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const spent = dashboard.totalSpentThisMonth;
  const spendingPower = dashboard.accountBalances
    .filter((a) => a.type === "Spending")
    .reduce((sum, a) => sum + a.balance, 0);
  const monthBudget = spendingPower + spent;
  const spentRatio = monthBudget > 0 ? Math.min(spent / monthBudget, 1) : 0;

  function onActivityClick(item: ActivityItem) {
    if (item.kind === "expense") {
      const expense = expenses?.find((e) => e.id === item.id);
      if (expense) {
        setEditingExpense(expense);
      }
    } else {
      setDeletingIncome(item);
    }
  }

  function confirmDeleteIncome() {
    if (!deletingIncome) {
      return;
    }
    deleteIncome.mutate(deletingIncome.id, {
      onSuccess: () => {
        toast.success("Income deleted");
        setDeletingIncome(undefined);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.displayMessage : "Something went wrong.");
        setDeletingIncome(undefined);
      },
    });
  }

  return (
    <div className="space-y-7">
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 size-52 rounded-full bg-white/5" />

        <p className="text-sm font-medium text-white/80">Spent this month</p>
        <Money value={spent} currency={currency} size="xl" className="mt-1 text-white" />

        {monthBudget > 0 && (
          <div className="mt-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${spentRatio * 100}%` }}
              />
            </div>
            <p className="money mt-2 text-xs font-medium text-white/80">
              of {formatMoney(monthBudget, currency)} spendable
            </p>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <SectionLabel>Accounts</SectionLabel>
        {dashboard.accountBalances.map((account) => {
          const isSpending = account.type === "Spending";
          const accountTotal = isSpending ? account.balance + spent : 0;

          return (
            <Card key={account.accountId} className="rounded-2xl border-border/60 py-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <AccountIcon type={account.type === "Spending" ? "Spending" : "Saving"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.type} · {account.allocationPercent}%
                  </p>
                  {isSpending && accountTotal > 0 && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max((account.balance / accountTotal) * 100, 0)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Money value={account.balance} currency={currency} size="md" />
                  {isSpending && (
                    <p className="text-[11px] font-medium text-muted-foreground">left</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <SectionLabel>Recent</SectionLabel>

        {dashboard.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium">Nothing here yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add your first income with the button below.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            {dashboard.recentActivity.map((item, index) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => onActivityClick(item)}
                className={
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]" +
                  (index > 0 ? " border-t border-border/50" : "")
                }
              >
                <ActivityIcon kind={item.kind === "income" ? "income" : "expense"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                </div>
                <span
                  className={
                    item.kind === "income"
                      ? "money text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                      : "money text-sm font-semibold"
                  }
                >
                  {item.kind === "income" ? "+" : "−"}
                  {formatMoney(item.amount, currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <ExpenseDialog
        open={editingExpense !== undefined}
        onOpenChange={(open) => !open && setEditingExpense(undefined)}
        expense={editingExpense}
      />

      <Dialog
        open={deletingIncome !== undefined}
        onOpenChange={(open) => !open && setDeletingIncome(undefined)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete this income?</DialogTitle>
            <DialogDescription>
              {deletingIncome &&
                `${deletingIncome.description} (+${formatMoney(deletingIncome.amount, currency)}) and its allocations will be removed. Account balances will go down accordingly.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingIncome(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteIncome}
              disabled={deleteIncome.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
