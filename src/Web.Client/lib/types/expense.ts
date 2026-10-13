export type Expense = {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  note: string | null;
  category: string | null;
  date: string;
  recurringExpenseId: string | null;
};

export type ExpenseRequest = {
  accountId: string;
  amount: number;
  note: string | null;
  category: string | null;
  date: string;
  recurringExpenseId?: string | null;
};
