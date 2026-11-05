import type { HttpClient } from "./http";
import type { AdminUserResponse, StatsResponse } from "./types";

export function createAdminApi(http: HttpClient) {
  return {
    stats: () => http.get<StatsResponse>("/api/v1/admin/stats"),
    users: (pageSize = 100) =>
      http.get<AdminUserResponse[]>(`/api/v1/admin/users?page=1&pageSize=${pageSize}`),
    updateUser: (
      userId: string,
      payload: { isEmailVerified?: boolean; isLocked?: boolean },
    ) => http.patch<void>(`/api/v1/admin/users/${userId}`, payload),
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
