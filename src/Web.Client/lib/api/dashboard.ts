import { apiClient } from "@/lib/api/client";
import { Dashboard } from "@/lib/types/dashboard";

export async function getDashboard(year: number, month: number): Promise<Dashboard> {
  const res = await apiClient.get<Dashboard>("/api/v1/dashboard", {
    params: { year, month },
  });
  return res.data;
}
