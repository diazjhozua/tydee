export type RecurringSpec = {
  name: string;
  accountName: string;
  amount: number;
  category: string | null;
  note: string | null;
};

export function recurringSpec(
  name: string,
  accountName: string,
  amount: number,
  overrides: Partial<Pick<RecurringSpec, "category" | "note">> = {},
): RecurringSpec {
  return { name, accountName, amount, category: null, note: null, ...overrides };
}
