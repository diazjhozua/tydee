"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Money } from "@/components/shared/Money";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useMe } from "@/lib/hooks/useMe";
import { Expense } from "@/lib/types/expense";
import { formatDate, today } from "@/lib/utils/date";

export default function LogExpensePage() {
  const router = useRouter();
  const {
    data: accounts,
    isPending: accountsPending,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useAccounts();
  const { data: me } = useMe();
  const todayIso = today();
  const {
    data: expenses,
    isPending,
    isError,
    refetch,
  } = useExpenses({ date: todayIso, pageSize: 100 });
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const currency = me?.currency ?? "PHP";
  const total = (expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    if (!accountsPending && accounts?.length === 0) {
      router.replace("/setup");
    }
  }, [accounts, accountsPending, router]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Log expense</h1>
        <p className="text-sm text-muted-foreground">Today, {formatDate(todayIso)}</p>
      </header>

      {accountsError && (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load your envelopes.</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => refetchAccounts()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent>
          <ExpenseForm resetAfterSave submitLabel="Log expense" autoFocus={false} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Today</SectionLabel>
          {total > 0 && <Money value={total} currency={currency} size="sm" />}
        </div>

        {isPending && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="rounded-2xl border-border/60">
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load today&apos;s expenses.</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {!isPending && !isError && expenses?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium">Nothing logged today yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your first expense will show up here.
            </p>
          </div>
        )}

        {!isPending && !isError && (expenses?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {expenses?.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => setEditingExpense(expense)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <CategoryIcon category={expense.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {expense.note ?? expense.category ?? "Expense"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{expense.accountName}</p>
                  {expense.category && (
                    <p className="truncate text-xs text-muted-foreground">{expense.category}</p>
                  )}
                </div>
                <span className="flex shrink-0 items-baseline gap-0.5 text-sm font-semibold">
                  <span className="text-muted-foreground">−</span>
                  <Money value={expense.amount} currency={currency} size="sm" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <ExpenseDialog
        open={editingExpense !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpense(undefined);
          }
        }}
        expense={editingExpense}
      />
    </div>
  );
}
