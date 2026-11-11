"use client";

import { Inbox, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AccountsSection } from "@/components/dashboard/AccountsSection";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { IncomeDialog } from "@/components/incomes/IncomeDialog";
import { ActivityIcon } from "@/components/shared/ActivityIcon";
import { Money } from "@/components/shared/Money";
import {
  MonthPicker,
  currentYearMonth,
  isCurrentMonth,
  monthLabel,
} from "@/components/shared/MonthPicker";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteAdjustment } from "@/lib/hooks/useAdjustments";
import { useDeleteTransfer } from "@/lib/hooks/useTransfers";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useMe } from "@/lib/hooks/useMe";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useDashboardViewStore } from "@/lib/stores/dashboardViewStore";
import { toast } from "sonner";
import { ActivityItem } from "@/lib/types/dashboard";
import { Expense } from "@/lib/types/expense";
import { formatMoney } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

const emptySubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

export default function HomePage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentYearMonth);
  const { data: dashboard, isLoading, isFetching } = useDashboard(month.year, month.month);
  const { data: me } = useMe();
  const { data: expenses } = useExpenses({ pageSize: 50 });
  const isOnline = useOnlineStatus();

  // undefined = no filter; null = the "Uncategorized" bucket is selected.
  const [categoryFilter, setCategoryFilter] = useState<string | null | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [editingIncomeId, setEditingIncomeId] = useState<string | undefined>();
  const [deletingAdjustment, setDeletingAdjustment] = useState<ActivityItem | undefined>();
  const [deletingTransfer, setDeletingTransfer] = useState<ActivityItem | undefined>();
  const deleteAdjustment = useDeleteAdjustment();
  const deleteTransfer = useDeleteTransfer();

  const mounted = useSyncExternalStore(emptySubscribe, isClient, isServer);
  const categoryView = useDashboardViewStore((state) => state.categoryView);
  const accountsView = useDashboardViewStore((state) => state.accountsView);
  const setCategoryView = useDashboardViewStore((state) => state.setCategoryView);
  const setAccountsView = useDashboardViewStore((state) => state.setAccountsView);

  // First paint is always the list; the persisted choice applies after hydration.
  const resolvedCategoryView = mounted ? categoryView : "list";
  const resolvedAccountsView = mounted ? accountsView : "list";

  const currency = me?.currency ?? "PHP";
  const viewingCurrentMonth = isCurrentMonth(month);

  useEffect(() => {
    // Wait for a fresh fetch so a stale cached dashboard (e.g. right after
    // finishing setup) doesn't bounce the user back to the wizard. Only the
    // current month says anything about whether accounts exist.
    if (viewingCurrentMonth && !isFetching && dashboard && dashboard.accountBalances.length === 0) {
      router.replace("/setup");
    }
  }, [dashboard, isFetching, viewingCurrentMonth, router]);

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

  const visibleActivity =
    categoryFilter === undefined
      ? dashboard.recentActivity
      : dashboard.recentActivity.filter(
          (item) => item.kind === "expense" && item.category === categoryFilter,
        );

  function onActivityClick(item: ActivityItem) {
    if (item.pendingSync) {
      return;
    }
    if (item.kind === "expense") {
      const expense = expenses?.find((e) => e.id === item.id);
      if (expense) {
        setEditingExpense(expense);
      }
    } else if (item.kind === "income") {
      setEditingIncomeId(item.id);
    } else if (item.kind === "adjustment") {
      setDeletingAdjustment(item);
    } else {
      setDeletingTransfer(item);
    }
  }

  function confirmDeleteTransfer() {
    if (!deletingTransfer) {
      return;
    }
    deleteTransfer.mutate(deletingTransfer.id, {
      onSuccess: () => {
        toast.success("Transfer removed");
        setDeletingTransfer(undefined);
      },
      onError: () => {
        toast.error("Something went wrong.");
        setDeletingTransfer(undefined);
      },
    });
  }

  function confirmDeleteAdjustment() {
    if (!deletingAdjustment) {
      return;
    }
    deleteAdjustment.mutate(deletingAdjustment.id, {
      onSuccess: () => {
        toast.success("Adjustment removed");
        setDeletingAdjustment(undefined);
      },
      onError: () => {
        toast.error("Something went wrong.");
        setDeletingAdjustment(undefined);
      },
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-center">
        <MonthPicker
          value={month}
          onChange={(value) => {
            setMonth(value);
            setCategoryFilter(undefined);
          }}
        />
      </div>

      <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 size-52 rounded-full bg-white/5" />

        <p className="text-sm font-medium text-white/80">
          {viewingCurrentMonth ? "Spent this month" : `Spent in ${monthLabel(month)}`}
        </p>
        <Money value={spent} currency={currency} size="xl" className="mt-1 text-white" />

        {viewingCurrentMonth && monthBudget > 0 && (
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

      {spent > 0 && (
        <CategoryBreakdown
          rows={dashboard.spentByCategory}
          totalSpent={spent}
          currency={currency}
          view={resolvedCategoryView}
          onViewChange={setCategoryView}
          categoryFilter={categoryFilter}
          onCategoryClick={(category) =>
            setCategoryFilter((prev) => (prev === category ? undefined : category))
          }
        />
      )}

      <AccountsSection
        accounts={dashboard.accountBalances}
        spent={spent}
        currency={currency}
        view={resolvedAccountsView}
        onViewChange={setAccountsView}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <SectionLabel>Recent</SectionLabel>
          {categoryFilter !== undefined && (
            <button
              type="button"
              onClick={() => setCategoryFilter(undefined)}
              className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent/70"
            >
              {categoryFilter ?? "Uncategorized"}
              <X className="size-3" />
            </button>
          )}
        </div>

        {categoryFilter !== undefined && visibleActivity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            No recent expenses in this category.
          </p>
        ) : dashboard.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium">
                {viewingCurrentMonth ? "Nothing here yet" : "No activity in this month"}
              </p>
              {viewingCurrentMonth && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add your first income with the button below.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            {visibleActivity.map((item, index) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => onActivityClick(item)}
                disabled={item.pendingSync}
                className={
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]" +
                  (index > 0 ? " border-t border-border/50" : "") +
                  (item.pendingSync ? " opacity-60" : "")
                }
              >
                <ActivityIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date)}
                    {item.category ? ` · ${item.category}` : ""}
                    {item.kind === "adjustment" ? " · Balance set" : ""}
                  </p>
                  {item.allocations.length > 0 && (
                    <p className="money mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.allocations
                        .map((a) => `${a.accountName} ${formatMoney(a.amount, currency)}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {item.pendingSync ? (
                  <span className="text-xs font-medium text-muted-foreground">Syncing…</span>
                ) : (
                  <span
                    className={
                      item.kind === "income"
                        ? "money text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                        : item.kind === "adjustment"
                          ? "money text-sm font-semibold text-sky-600 dark:text-sky-400"
                          : item.kind === "transfer"
                            ? "money text-sm font-semibold text-violet-600 dark:text-violet-400"
                            : "money text-sm font-semibold"
                    }
                  >
                    {item.kind === "transfer"
                      ? ""
                      : item.kind === "expense" || item.amount < 0
                        ? "−"
                        : "+"}
                    {formatMoney(Math.abs(item.amount), currency)}
                  </span>
                )}
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

      <IncomeDialog
        open={editingIncomeId !== undefined}
        onOpenChange={(open) => !open && setEditingIncomeId(undefined)}
        incomeId={editingIncomeId}
      />

      <Dialog
        open={deletingAdjustment !== undefined}
        onOpenChange={(open) => !open && setDeletingAdjustment(undefined)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove this adjustment?</DialogTitle>
            <DialogDescription>
              {deletingAdjustment &&
                `${deletingAdjustment.description} will go back to its balance before this adjustment.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingAdjustment(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAdjustment}
              disabled={deleteAdjustment.isPending || !isOnline}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingTransfer !== undefined}
        onOpenChange={(open) => !open && setDeletingTransfer(undefined)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove this transfer?</DialogTitle>
            <DialogDescription>
              {deletingTransfer &&
                `${deletingTransfer.description} will be undone and both balances will revert.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTransfer(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTransfer}
              disabled={deleteTransfer.isPending || !isOnline}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
