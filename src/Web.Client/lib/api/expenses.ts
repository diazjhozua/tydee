import { apiClient } from "@/lib/api/client";
import { Expense, ExpenseRequest } from "@/lib/types/expense";

export async function listExpenses(params: {
  accountId?: string;
  page?: number;
  pageSize?: number;
}): Promise<Expense[]> {
  const res = await apiClient.get<Expense[]>("/api/v1/expenses", { params });
  return res.data;
}

export async function createExpense(request: ExpenseRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/expenses", request);
  return res.data.id;
}

export async function updateExpense(expenseId: string, request: ExpenseRequest): Promise<void> {
  await apiClient.put(`/api/v1/expenses/${expenseId}`, request);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiClient.delete(`/api/v1/expenses/${expenseId}`);
}
