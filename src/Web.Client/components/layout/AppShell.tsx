"use client";

import { Plus, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { IncomeDialog } from "@/components/incomes/IncomeDialog";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  const showFabs = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            Tydee
          </Link>
          <Button
            render={<Link href="/settings" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Settings"
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-28">{children}</main>

      {showFabs && (
        <div className="fixed bottom-6 inset-x-0 z-10 pointer-events-none">
          <div className="max-w-md mx-auto flex items-end justify-end gap-3 px-5">
            <Button
              variant="outline"
              className="pointer-events-auto shadow-md bg-background"
              onClick={() => setIncomeOpen(true)}
            >
              <TrendingUp className="size-4" />
              Income
            </Button>
            <Button
              size="icon"
              className="pointer-events-auto size-14 rounded-full shadow-lg"
              aria-label="Add expense"
              onClick={() => setExpenseOpen(true)}
            >
              <Plus className="size-7" />
            </Button>
          </div>
        </div>
      )}

      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <IncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
    </div>
  );
}
