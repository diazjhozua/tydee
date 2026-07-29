import { apiClient } from "@/lib/api/client";
import { IncomeRequest } from "@/lib/types/income";

export async function createIncome(request: IncomeRequest): Promise<string> {
  const res = await apiClient.post<{ id: string }>("/api/v1/incomes", request);
  return res.data.id;
}

export async function updateIncome(incomeId: string, request: IncomeRequest): Promise<void> {
  await apiClient.put(`/api/v1/incomes/${incomeId}`, request);
}

export async function deleteIncome(incomeId: string): Promise<void> {
  await apiClient.delete(`/api/v1/incomes/${incomeId}`);
}
