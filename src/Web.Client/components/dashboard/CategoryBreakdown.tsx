"use client";

import { CategoryIcon, categoryBarColorClass } from "@/components/shared/CategoryIcon";
import { Money } from "@/components/shared/Money";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import type { DashboardView } from "@/lib/stores/dashboardViewStore";
import type { CategorySpend } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

type Props = {
  rows: CategorySpend[];
  totalSpent: number;
  currency: string;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  categoryFilter: string | null | undefined;
  onCategoryClick: (category: string | null) => void;
};

export function CategoryBreakdown({
  rows,
  totalSpent,
  currency,
  view,
  onViewChange,
  categoryFilter,
  onCategoryClick,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Where it went</SectionLabel>
        <ViewToggle label="Where it went" value={view} onChange={onViewChange} />
      </div>

      {view === "grid" ? (
        <div data-view="grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map((row) => {
            const percent = totalSpent > 0 ? Math.round((row.amount / totalSpent) * 100) : 0;
            const isSelected = categoryFilter === row.category;
            const isDimmed = categoryFilter !== undefined && !isSelected;

            return (
              <button
                key={row.category ?? "__none"}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryClick(row.category)}
                className={cn(
                  "flex min-w-0 flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isSelected && "bg-accent/60",
                  isDimmed && "opacity-45",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <CategoryIcon category={row.category} />
                  <span className="text-xs text-muted-foreground">{percent}%</span>
                </div>
                <span
                  className={cn(
                    "w-full truncate text-sm font-medium",
                    !row.category && "text-muted-foreground",
                  )}
                >
                  {row.category ?? "Uncategorized"}
                </span>
                <div className="min-w-0 overflow-hidden">
                  <Money value={row.amount} currency={currency} size="sm" className="max-w-full" />
                </div>
                <div className="mt-auto h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", categoryBarColorClass(row.category))}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div data-view="list" className="space-y-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          {rows.map((row) => {
            const percent = totalSpent > 0 ? Math.round((row.amount / totalSpent) * 100) : 0;
            const isSelected = categoryFilter === row.category;
            const isDimmed = categoryFilter !== undefined && !isSelected;

            return (
              <button
                key={row.category ?? "__none"}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryClick(row.category)}
                className={
                  "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" +
                  (isSelected ? " bg-accent/60" : "") +
                  (isDimmed ? " opacity-45" : "")
                }
              >
                <CategoryIcon category={row.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={
                        row.category
                          ? "truncate text-sm font-medium"
                          : "truncate text-sm text-muted-foreground"
                      }
                    >
                      {row.category ?? "Uncategorized"}
                    </span>
                    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <Money value={row.amount} currency={currency} size="sm" />
                      <span className="text-xs text-muted-foreground">{percent}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${categoryBarColorClass(row.category)}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
