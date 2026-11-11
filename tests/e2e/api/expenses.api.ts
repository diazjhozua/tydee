import type { HttpClient } from "./http";
import type { ExpenseResponse } from "./types";

export type CreateExpensePayload = {
  accountId: string;
  amount: number;
  note: string | null;
  category: string | null;
  date: string;
  recurringExpenseId?: string | null;
};

export function createExpensesApi(http: HttpClient) {
  return {
    create: (payload: CreateExpensePayload) =>
      http.post<{ id: string }>("/api/v1/expenses", payload),
    list: (params: { pageSize?: number; recurringExpenseId?: string; date?: string } = {}) => {
      const query = new URLSearchParams();

      if (params.pageSize !== undefined) {
        query.set("pageSize", String(params.pageSize));
      }

      if (params.recurringExpenseId) {
        query.set("recurringExpenseId", params.recurringExpenseId);
      }

      if (params.date) {
        query.set("date", params.date);
      }

      const suffix = query.size > 0 ? `?${query.toString()}` : "";

      return http.get<ExpenseResponse[]>(`/api/v1/expenses${suffix}`);
    },
    categories: () => http.get<string[]>("/api/v1/expenses/categories"),
    update: (expenseId: string, payload: Omit<CreateExpensePayload, "recurringExpenseId">) =>
      http.put<void>(`/api/v1/expenses/${expenseId}`, payload),
    delete: (expenseId: string) => http.delete<void>(`/api/v1/expenses/${expenseId}`),
  };
}

export type ExpensesApi = ReturnType<typeof createExpensesApi>;
