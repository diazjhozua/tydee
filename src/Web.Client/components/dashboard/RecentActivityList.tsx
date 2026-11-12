"use client";

import { ActivityIcon } from "@/components/shared/ActivityIcon";
import type { DashboardView } from "@/lib/stores/dashboardViewStore";
import type { ActivityItem } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

type Props = {
  items: ActivityItem[];
  currency: string;
  view: DashboardView;
  onItemClick: (item: ActivityItem) => void;
};

// Sign and colour for an activity amount. Transfers carry no sign; expenses
// and negative entries show a minus; everything else shows a plus.
export function activityAmount(item: ActivityItem, currency: string) {
  const sign =
    item.kind === "transfer" ? "" : item.kind === "expense" || item.amount < 0 ? "−" : "+";

  const tone =
    item.kind === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : item.kind === "adjustment"
        ? "text-sky-600 dark:text-sky-400"
        : item.kind === "transfer"
          ? "text-violet-600 dark:text-violet-400"
          : "";

  return {
    text: `${sign}${formatMoney(Math.abs(item.amount), currency)}`,
    className: cn("money text-sm font-semibold", tone),
  };
}

export function RecentActivityList({ items, currency, view, onItemClick }: Props) {
  if (view === "grid") {
    return (
      <ul data-view="grid" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const amount = activityAmount(item, currency);
          return (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                disabled={item.pendingSync}
                className="flex h-full w-full items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 active:scale-[0.99]"
              >
                <ActivityIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                  {item.category && (
                    <p className="truncate text-xs text-muted-foreground">{item.category}</p>
                  )}
                </div>
                {item.pendingSync ? (
                  <span className="text-xs font-medium text-muted-foreground">Syncing…</span>
                ) : (
                  <span className={amount.className}>{amount.text}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {items.map((item, index) => {
        const amount = activityAmount(item, currency);
        return (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            onClick={() => onItemClick(item)}
            disabled={item.pendingSync}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]",
              index > 0 && "border-t border-border/50",
              item.pendingSync && "opacity-60",
            )}
          >
            <ActivityIcon kind={item.kind} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.description}</p>
              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
              {item.kind === "adjustment" && (
                <p className="text-xs text-muted-foreground">Balance set</p>
              )}
              {item.allocations.length > 0 && (
                <ul className="money mt-0.5 space-y-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.allocations.map((a) => (
                    <li key={a.accountName}>
                      {a.accountName} {formatMoney(a.amount, currency)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {item.pendingSync ? (
              <span className="text-xs font-medium text-muted-foreground">Syncing…</span>
            ) : (
              <span className={amount.className}>{amount.text}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
