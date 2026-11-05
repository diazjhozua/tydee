import type { HttpClient } from "./http";
import type { RecurringExpenseResponse } from "./types";

export type CreateRecurringExpensePayload = {
  name: string;
  accountId: string;
  amount: number;
  category: string | null;
  note: string | null;
};

export function createRecurringApi(http: HttpClient) {
  return {
    list: (includeArchived = false) =>
      http.get<RecurringExpenseResponse[]>(
        `/api/v1/recurring-expenses?includeArchived=${includeArchived ? "true" : "false"}`,
      ),
    create: (payload: CreateRecurringExpensePayload) =>
      http.post<{ id: string }>("/api/v1/recurring-expenses", payload),
    update: (recurringExpenseId: string, payload: CreateRecurringExpensePayload) =>
      http.put<void>(`/api/v1/recurring-expenses/${recurringExpenseId}`, payload),
    archive: (recurringExpenseId: string) =>
      http.delete<void>(`/api/v1/recurring-expenses/${recurringExpenseId}`),
  };
}

export type RecurringApi = ReturnType<typeof createRecurringApi>;
