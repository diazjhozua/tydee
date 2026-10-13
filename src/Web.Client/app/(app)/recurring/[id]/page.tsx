"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useMe } from "@/lib/hooks/useMe";
import { useRecurringExpenses } from "@/lib/hooks/useRecurringExpenses";
import { formatDate } from "@/lib/utils/date";

export default function RecurringExpenseHistoryPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: recurringExpenses } = useRecurringExpenses(true);
  const { data: expenses, isPending } = useExpenses({ recurringExpenseId: id, pageSize: 100 });
  const { data: me } = useMe();

  const currency = me?.currency ?? "PHP";
  const template = recurringExpenses?.find((item) => item.id === id);
  const items = expenses ?? [];
  const total = items.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-5">
      <Button
        render={<Link href="/recurring" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="-ml-2 rounded-full text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Saved expenses
      </Button>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{template?.name ?? "Saved expense"}</h1>
        <p className="text-sm text-muted-foreground">Expenses logged from this template.</p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {items.length} {items.length === 1 ? "expense" : "expenses"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Total logged</p>
          </div>
          <Money value={total} currency={currency} size="lg" hideable />
        </CardContent>
      </Card>

      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isPending && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No expenses logged from this template yet.</p>
      )}

      <div className="space-y-1">
        {items.map((expense, index) => (
          <div key={expense.id}>
            {index > 0 && <Separator className="my-1 opacity-50" />}
            <div className="flex items-center gap-3 py-2">
              <CategoryIcon category={expense.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{expense.accountName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(expense.date)}
                  {expense.note ? ` · ${expense.note}` : ""}
                </p>
              </div>
              <Money value={expense.amount} currency={currency} size="sm" hideable />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
