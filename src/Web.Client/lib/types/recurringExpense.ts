export type RecurringExpense = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  amount: number;
  category: string | null;
  note: string | null;
  isArchived: boolean;
};

export type RecurringExpenseRequest = {
  name: string;
  accountId: string;
  amount: number;
  category: string | null;
  note: string | null;
};