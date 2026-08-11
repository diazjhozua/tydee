import { apiClient } from "@/lib/api/client";
import { Income, IncomeRequest } from "@/lib/types/income";

export async function getIncome(incomeId: string): Promise<Income> {
  const res = await apiClient.get<Income>(`/api/v1/incomes/${incomeId}`);
  return res.data;
}

export async function getLatestIncome(): Promise<Income> {
  const res = await apiClient.get<Income>("/api/v1/incomes/latest");
  return res.data;
}

export async function getIncomeSources(): Promise<string[]> {
  const res = await apiClient.get<string[]>("/api/v1/incomes/sources");
  return res.data;
}

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
