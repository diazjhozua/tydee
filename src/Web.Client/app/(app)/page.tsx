"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { Badge } from "@/components/ui/badge";
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
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Spent this month</p>
        <p className="text-4xl font-bold tracking-tight">
          {formatMoney(dashboard.totalSpentThisMonth, currency)}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Accounts</h2>
        {dashboard.accountBalances.map((account) => (
          <Card key={account.accountId}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{account.name}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {account.type === "Spending" ? "Spending" : "Saving"} · {account.allocationPercent}%
                </Badge>
              </div>
              <p className="text-lg font-semibold">
                {formatMoney(account.balance, currency)}
                {account.type === "Spending" && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">left</span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
        {dashboard.recentActivity.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nothing yet. Add your first income with the button below.
          </p>
        )}
        <div className="divide-y rounded-lg border bg-card">
          {dashboard.recentActivity.map((item) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
              onClick={() => onActivityClick(item)}
            >
              <div>
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </div>
              <span
                className={
                  item.kind === "income"
                    ? "text-sm font-semibold text-primary"
                    : "text-sm font-semibold"
                }
              >
                {item.kind === "income" ? "+" : "-"}
                {formatMoney(item.amount, currency)}
              </span>
            </button>
          ))}
        </div>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this income?</DialogTitle>
            <DialogDescription>
              {deletingIncome &&
                `${deletingIncome.description} (+${formatMoney(deletingIncome.amount, currency)}) and its allocations will be removed. Account balances will go down accordingly.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
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
