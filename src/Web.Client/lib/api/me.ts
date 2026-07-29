import { apiClient } from "@/lib/api/client";
import { Me } from "@/lib/types/me";

export async function getMe(): Promise<Me> {
  const res = await apiClient.get<Me>("/api/v1/me");
  return res.data;
}

export async function updateCurrency(currency: string): Promise<void> {
  await apiClient.put("/api/v1/me/currency", { currency });
}
