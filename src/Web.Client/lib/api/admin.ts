import { apiClient } from "@/lib/api/client";
import { AdminStats, AdminUser } from "@/lib/types/admin";

export async function listUsers(params: {
  page?: number;
  pageSize?: number;
}): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>("/api/v1/admin/users", { params });
  return res.data;
}

export async function updateUser(
  userId: string,
  changes: { isEmailVerified?: boolean; isLocked?: boolean },
): Promise<void> {
  await apiClient.patch(`/api/v1/admin/users/${userId}`, changes);
}

export async function getStats(): Promise<AdminStats> {
  const res = await apiClient.get<AdminStats>("/api/v1/admin/stats");
  return res.data;
}