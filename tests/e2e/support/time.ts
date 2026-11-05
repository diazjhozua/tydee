import { randomUUID } from "node:crypto";

/** The browser runs with timezone UTC, so dates are derived in UTC too. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();

  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function previousYearMonth(): { year: number; month: number } {
  const current = currentYearMonth();

  return current.month === 1
    ? { year: current.year - 1, month: 12 }
    : { year: current.year, month: current.month - 1 };
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
}
