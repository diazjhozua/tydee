import { todayIso } from "../support/time";

export type IncomeSpec = {
  amount: number;
  source: string;
  date: string;
  /** Account name to amount. */
  split: Record<string, number>;
};

export function incomeSpec(
  amount: number,
  split: Record<string, number>,
  overrides: Partial<Pick<IncomeSpec, "source" | "date">> = {},
): IncomeSpec {
  return {
    amount,
    source: "Salary",
    date: todayIso(),
    split,
    ...overrides,
  };
}
