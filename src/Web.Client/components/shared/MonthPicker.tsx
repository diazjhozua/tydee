"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type YearMonth = { year: number; month: number };

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function isCurrentMonth(value: YearMonth): boolean {
  const now = currentYearMonth();
  return value.year === now.year && value.month === now.month;
}

export function monthLabel(value: YearMonth): string {
  return new Date(value.year, value.month - 1, 1).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
}

function shift(value: YearMonth, delta: number): YearMonth {
  const date = new Date(value.year, value.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

type Props = {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
};

export function MonthPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card px-1 py-0.5 shadow-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label="Previous month"
        onClick={() => onChange(shift(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-28 text-center text-sm font-semibold">{monthLabel(value)}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label="Next month"
        disabled={isCurrentMonth(value)}
        onClick={() => onChange(shift(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
