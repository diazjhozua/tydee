"use client";

import { History, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RecurringExpenseSheet } from "@/components/recurring/RecurringExpenseSheet";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMe } from "@/lib/hooks/useMe";
import { useRecurringExpenses } from "@/lib/hooks/useRecurringExpenses";
import { RecurringExpense } from "@/lib/types/recurringExpense";

export default function RecurringExpensesPage() {
  const { data: recurringExpenses, isPending } = useRecurringExpenses();
  const { data: me } = useMe();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | undefined>();

  const currency = me?.currency ?? "PHP";
  const templates = recurringExpenses ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Saved expenses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Reusable templates to log recurring bills in one tap.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full font-semibold"
          onClick={() => {
            setEditing(undefined);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isPending && templates.length === 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No saved expenses yet. Add one to log recurring bills faster.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(template);
                  setSheetOpen(true);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <CategoryIcon category={template.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{template.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{template.accountName}</p>
                </div>
                <Money value={template.amount} currency={currency} size="sm" hideable />
              </button>
              <Button
                render={<Link href={`/recurring/${template.id}`} />}
                nativeButton={false}
                size="sm"
                variant="outline"
                className="shrink-0 rounded-full border-border/60"
              >
                <History className="size-3.5" /> History
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecurringExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        recurringExpense={editing}
      />
    </div>
  );
}