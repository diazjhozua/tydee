"use client";

import { ArrowLeftRight, Plus, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { IncomeDialog } from "@/components/incomes/IncomeDialog";
import { TransferSheet } from "@/components/transfers/TransferSheet";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const showFabs = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            Tydee
          </Link>
          <Button
            render={<Link href="/settings" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Settings"
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5 pb-32">{children}</main>

      {showFabs && (
        <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-6 z-10">
          <div className="mx-auto flex max-w-md items-center justify-end gap-3 px-5">
            <button
              type="button"
              aria-label="Transfer"
              onClick={() => setTransferOpen(true)}
              className="pointer-events-auto flex h-11 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 text-sm font-semibold shadow-lg backdrop-blur-md transition-transform active:scale-95"
            >
              <ArrowLeftRight className="size-4 text-violet-500" />
              Transfer
            </button>
            <button
              type="button"
              onClick={() => setIncomeOpen(true)}
              className="pointer-events-auto flex h-11 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 text-sm font-semibold shadow-lg backdrop-blur-md transition-transform active:scale-95"
            >
              <TrendingUp className="size-4 text-primary" />
              Income
            </button>
            <button
              type="button"
              aria-label="Add expense"
              onClick={() => setExpenseOpen(true)}
              className="hero-gradient pointer-events-auto flex size-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <IncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <TransferSheet open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
