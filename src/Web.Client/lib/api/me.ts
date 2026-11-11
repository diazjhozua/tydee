import { apiClient } from "@/lib/api/client";
import { DefaultPage, Me } from "@/lib/types/me";

export async function getMe(): Promise<Me> {
  const res = await apiClient.get<Me>("/api/v1/me");
  return res.data;
}

export async function updateCurrency(currency: string): Promise<void> {
  await apiClient.put("/api/v1/me/currency", { currency });
}

export async function updateDefaultPage(defaultPage: DefaultPage): Promise<void> {
  await apiClient.put("/api/v1/me/default-page", { defaultPage });
}
