import { todayIso } from "../support/time";

export type ExpenseSpec = {
  accountName: string;
  amount: number;
  note: string | null;
  category: string | null;
  date: string;
  recurringExpenseId?: string | null;
};

export function expenseSpec(
  accountName: string,
  amount: number,
  overrides: Partial<Omit<ExpenseSpec, "accountName" | "amount">> = {},
): ExpenseSpec {
  return {
    accountName,
    amount,
    note: null,
    category: null,
    date: todayIso(),
    ...overrides,
  };
}
