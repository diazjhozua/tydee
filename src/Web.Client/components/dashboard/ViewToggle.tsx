"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import type { DashboardView } from "@/lib/stores/dashboardViewStore";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: DashboardView;
  onChange: (view: DashboardView) => void;
};

const OPTIONS = [
  { value: "list", Icon: ListIcon },
  { value: "grid", Icon: LayoutGrid },
] as const;

export function ViewToggle({ label, value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label={`${label} layout`}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-muted/50 p-0.5"
    >
      {OPTIONS.map(({ value: option, Icon }) => (
        <button
          key={option}
          type="button"
          aria-label={`${label}: ${option} view`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            value === option
              ? "bg-card text-foreground shadow-sm dark:bg-muted"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
