import type { HttpClient } from "./http";
import type { IncomeResponse } from "./types";

export type CreateIncomePayload = {
  amount: number;
  source: string;
  date: string;
  allocations: { accountId: string; amount: number }[];
};

export function createIncomesApi(http: HttpClient) {
  return {
    create: (payload: CreateIncomePayload) => http.post<{ id: string }>("/api/v1/incomes", payload),
    get: (incomeId: string) => http.get<IncomeResponse>(`/api/v1/incomes/${incomeId}`),
    latest: () => http.get<IncomeResponse | null>("/api/v1/incomes/latest"),
    sources: () => http.get<string[]>("/api/v1/incomes/sources"),
    update: (incomeId: string, payload: CreateIncomePayload) =>
      http.put<void>(`/api/v1/incomes/${incomeId}`, payload),
    delete: (incomeId: string) => http.delete<void>(`/api/v1/incomes/${incomeId}`),
  };
}

export type IncomesApi = ReturnType<typeof createIncomesApi>;
