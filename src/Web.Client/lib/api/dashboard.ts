import { apiClient } from "@/lib/api/client";
import { Dashboard } from "@/lib/types/dashboard";

export async function getDashboard(): Promise<Dashboard> {
  const res = await apiClient.get<Dashboard>("/api/v1/dashboard");
  return res.data;
}
