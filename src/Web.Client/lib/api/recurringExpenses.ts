import { apiClient } from "@/lib/api/client";
import { RecurringExpense, RecurringExpenseRequest } from "@/lib/types/recurringExpense";

export async function listRecurringExpenses(includeArchived = false): Promise<RecurringExpense[]> {
  const res = await apiClient.get<RecurringExpense[]>("/api/v1/recurring-expenses", {
    params: { includeArchived },
  });
  return res.data;
}

export async function createRecurringExpense(request: RecurringExpenseRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/recurring-expenses", request);
  return res.data.id;
}

export async function updateRecurringExpense(
  recurringExpenseId: string,
  request: RecurringExpenseRequest,
): Promise<void> {
  await apiClient.put(`/api/v1/recurring-expenses/${recurringExpenseId}`, request);
}

export async function archiveRecurringExpense(recurringExpenseId: string): Promise<void> {
  await apiClient.delete(`/api/v1/recurring-expenses/${recurringExpenseId}`);
}